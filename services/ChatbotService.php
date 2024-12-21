<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../services/AnalyticsService.php';

class ChatbotService {
    private $db;
    private $redis;
    private $useRedis;
    private $analyticsService;

    public function __construct() {
        global $database;
        $this->db = $database;
        $this->useRedis = class_exists('Redis');
        
        if ($this->useRedis) {
            try {
                $this->redis = new Redis();
                $this->redis->connect(
                    getenv('REDIS_HOST') ?: 'localhost',
                    getenv('REDIS_PORT') ?: 6379
                );
                if (getenv('REDIS_PASSWORD')) {
                    $this->redis->auth(getenv('REDIS_PASSWORD'));
                }
            } catch (Exception $e) {
                $this->useRedis = false;
                error_log("Redis connection failed: " . $e->getMessage());
            }
        }

        $this->analyticsService = new AnalyticsService();
    }

    // Process user message and get chatbot response
    public function processMessage($sessionId, $userId, $message) {
        // Log the interaction
        $interactionData = [
            'session_id' => $sessionId,
            'user_id' => $userId,
            'interaction_type' => 'message',
            'query' => $message
        ];

        $response = $this->getResponse($message);
        $interactionData['response'] = $response['response'];
        $interactionData['resolved_by_bot'] = $response['category'] !== 'transfer';
        $interactionData['transferred_to_agent'] = $response['category'] === 'transfer';

        // Store the interaction
        $sql = "INSERT INTO chatbot_interactions 
                (session_id, user_id, interaction_type, query, response, resolved_by_bot, transferred_to_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $sessionId,
            $userId,
            $interactionData['interaction_type'],
            $interactionData['query'],
            $interactionData['response'],
            $interactionData['resolved_by_bot'],
            $interactionData['transferred_to_agent']
        ]);

        // Track analytics event
        $this->analyticsService->trackEvent('chatbot_interaction', $userId, $interactionData);

        return $response;
    }

    // Get chatbot response for a message
    public function getResponse($message) {
        if ($this->useRedis) {
            try {
                $response = $this->redis->hGet('chatbot_responses', strtolower($message));
                if ($response) {
                    return json_decode($response, true);
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT response, category 
                FROM chatbot_responses 
                WHERE ? LIKE CONCAT('%', trigger_text, '%')
                ORDER BY CHAR_LENGTH(trigger_text) DESC 
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([strtolower($message)]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            $result = [
                'response' => "I'm not sure how to respond to that. Let me connect you with a human agent.",
                'category' => 'transfer'
            ];
        }

        if ($this->useRedis) {
            try {
                $this->redis->hSet('chatbot_responses', strtolower($message), json_encode($result));
                $this->redis->expire('chatbot_responses', 3600); // Cache for 1 hour
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $result;
    }

    // Train chatbot from successful conversations
    public function trainFromConversation($sessionId) {
        $sql = "SELECT m.message_text, m.message_type, cs.rating
                FROM messages m
                JOIN chat_sessions cs ON m.chat_session_id = cs.id
                WHERE cs.id = ? 
                AND cs.rating >= 4 
                AND m.message_type = 'text'
                ORDER BY m.sent_at";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$sessionId]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($messages) >= 2) {
            for ($i = 0; $i < count($messages) - 1; $i++) {
                $this->addResponse(
                    $messages[$i]['message_text'],
                    $messages[$i + 1]['message_text'],
                    'learned'
                );
            }
        }

        // Track analytics event
        $this->analyticsService->trackEvent('chatbot_training', null, [
            'session_id' => $sessionId,
            'messages_count' => count($messages)
        ]);
    }

    // Add a new chatbot response
    public function addResponse($trigger, $response, $category = 'manual') {
        $sql = "INSERT INTO chatbot_responses (trigger_text, response, category) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            strtolower($trigger),
            $response,
            $category
        ]);
        $responseId = $this->db->lastInsertId();

        if ($this->useRedis) {
            try {
                $this->redis->hSet('chatbot_responses', strtolower($trigger), json_encode([
                    'response' => $response,
                    'category' => $category
                ]));
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        // Track analytics event
        $this->analyticsService->trackEvent('chatbot_response_added', null, [
            'trigger' => $trigger,
            'category' => $category,
            'response_id' => $responseId
        ]);

        return $responseId;
    }

    // Remove a chatbot response
    public function removeResponse($responseId) {
        $sql = "SELECT trigger_text FROM chatbot_responses WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$responseId]);
        $trigger = $stmt->fetchColumn();

        if ($trigger) {
            $sql = "DELETE FROM chatbot_responses WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$responseId]);

            if ($this->useRedis) {
                try {
                    $this->redis->hDel('chatbot_responses', strtolower($trigger));
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }

            // Track analytics event
            $this->analyticsService->trackEvent('chatbot_response_removed', null, [
                'response_id' => $responseId,
                'trigger' => $trigger
            ]);

            return true;
        }

        return false;
    }

    // Get chatbot performance metrics
    public function getPerformanceMetrics($startDate, $endDate) {
        $sql = "SELECT 
                COUNT(*) as total_interactions,
                COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) as resolved_by_bot,
                COUNT(CASE WHEN transferred_to_agent = 1 THEN 1 END) as transferred_to_agent,
                (COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) * 100.0 / COUNT(*)) as resolution_rate
                FROM chatbot_interactions
                WHERE timestamp BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get most common user queries
    public function getCommonQueries($limit = 10) {
        $sql = "SELECT 
                query,
                COUNT(*) as frequency,
                AVG(CASE WHEN resolved_by_bot = 1 THEN 1 ELSE 0 END) as success_rate
                FROM chatbot_interactions
                GROUP BY query
                ORDER BY frequency DESC
                LIMIT ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get response categories distribution
    public function getCategoryDistribution() {
        $sql = "SELECT 
                category,
                COUNT(*) as count
                FROM chatbot_responses
                GROUP BY category";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
