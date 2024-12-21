<?php
require_once __DIR__ . '/../config/database.php';

class AnalyticsService {
    private $db;
    private $redis;
    private $useRedis;

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
    }

    // Track an analytics event
    public function trackEvent($eventType, $userId = null, $data = null) {
        $sql = "INSERT INTO analytics_events (event_type, user_id, data) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $eventType,
            $userId,
            $data ? json_encode($data) : null
        ]);

        if ($this->useRedis) {
            try {
                // Increment event counter in Redis
                $this->redis->incr("analytics:event:$eventType");
                
                // Store in sorted set for time-based analysis
                $score = time();
                $value = json_encode([
                    'id' => $this->db->lastInsertId(),
                    'user_id' => $userId,
                    'data' => $data
                ]);
                $this->redis->zAdd("analytics:events:$eventType", $score, $value);
                
                // Expire after 24 hours
                $this->redis->expire("analytics:events:$eventType", 86400);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $this->db->lastInsertId();
    }

    // Get event count by type
    public function getEventCount($eventType, $startDate, $endDate) {
        if ($this->useRedis) {
            try {
                $count = $this->redis->get("analytics:event:$eventType");
                if ($count !== false) {
                    return (int)$count;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT COUNT(*) as count 
                FROM analytics_events 
                WHERE event_type = ? 
                AND timestamp BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventType, $startDate, $endDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'];
    }

    // Get event timeline
    public function getEventTimeline($eventType, $startDate, $endDate) {
        $sql = "SELECT DATE(timestamp) as date, COUNT(*) as count 
                FROM analytics_events 
                WHERE event_type = ? 
                AND timestamp BETWEEN ? AND ? 
                GROUP BY DATE(timestamp) 
                ORDER BY date";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventType, $startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get overall chat statistics
    public function getOverallStats($startDate, $endDate) {
        $sql = "SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_chats,
                COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_chats,
                AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
                AVG(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW()))) as avg_duration
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get hourly chat distribution
    public function getHourlyDistribution($startDate, $endDate) {
        $sql = "SELECT 
                HOUR(start_time) as hour,
                COUNT(*) as chat_count
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?
                GROUP BY HOUR(start_time)
                ORDER BY hour";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get agent performance metrics
    public function getAgentPerformance($startDate, $endDate) {
        $sql = "SELECT 
                u.username,
                COUNT(*) as total_chats,
                AVG(TIMESTAMPDIFF(MINUTE, cs.start_time, cs.end_time)) as avg_duration,
                AVG(cs.rating) as avg_rating,
                COUNT(CASE WHEN cs.rating >= 4 THEN 1 END) as positive_ratings,
                COUNT(CASE WHEN cs.rating < 4 THEN 1 END) as negative_ratings
                FROM chat_sessions cs
                JOIN users u ON cs.agent_id = u.id
                WHERE cs.start_time BETWEEN ? AND ?
                AND u.role = 'agent'
                GROUP BY u.id, u.username
                ORDER BY avg_rating DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get chatbot effectiveness metrics
    public function getChatbotMetrics($startDate, $endDate) {
        $sql = "SELECT 
                COUNT(*) as total_interactions,
                COUNT(CASE WHEN transferred_to_agent = 1 THEN 1 END) as agent_transfers,
                COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) as bot_resolutions,
                (COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) * 100.0 / COUNT(*)) as resolution_rate
                FROM chatbot_interactions
                WHERE timestamp BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get customer satisfaction trends
    public function getSatisfactionTrends($startDate, $endDate) {
        $sql = "SELECT 
                DATE(end_time) as date,
                AVG(rating) as avg_rating,
                COUNT(*) as total_ratings
                FROM chat_sessions
                WHERE end_time BETWEEN ? AND ?
                AND rating IS NOT NULL
                GROUP BY DATE(end_time)
                ORDER BY date";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get response time metrics
    public function getResponseTimeMetrics($startDate, $endDate) {
        $sql = "SELECT 
                AVG(first_response_time) as avg_first_response,
                AVG(avg_response_time) as avg_response_time,
                MIN(first_response_time) as min_first_response,
                MAX(first_response_time) as max_first_response
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?
                AND status = 'ended'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get chat volume trends
    public function getChatVolumeTrends($startDate, $endDate) {
        $sql = "SELECT 
                DATE(start_time) as date,
                COUNT(*) as chat_count,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_count
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?
                GROUP BY DATE(start_time)
                ORDER BY date";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get popular chat topics
    public function getPopularTopics($startDate, $endDate, $limit = 10) {
        $sql = "SELECT 
                topic,
                COUNT(*) as occurrence_count
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?
                AND topic IS NOT NULL
                GROUP BY topic
                ORDER BY occurrence_count DESC
                LIMIT ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get real-time metrics
    public function getRealTimeMetrics() {
        $onlineUsers = 0;
        $activeChats = 0;

        // Try to get real-time metrics from Redis if available
        if ($this->useRedis) {
            try {
                $onlineUsers = $this->redis->sCard('online_users') ?: 0;
                $activeChats = $this->redis->sCard('active_chats') ?: 0;
            } catch (Exception $e) {
                error_log("Redis metrics retrieval failed: " . $e->getMessage());
            }
        }

        // Fallback to database if Redis is not available or failed
        if (!$this->useRedis || ($onlineUsers === 0 && $activeChats === 0)) {
            // Get active users in the last 5 minutes
            $sql = "SELECT COUNT(DISTINCT user_id) as count 
                    FROM analytics_events 
                    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $onlineUsers = $result['count'];

            // Get active chats
            $sql = "SELECT COUNT(*) as count 
                    FROM chat_sessions 
                    WHERE status = 'active'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $activeChats = $result['count'];
        }

        return [
            'online_users' => $onlineUsers,
            'active_chats' => $activeChats,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }

    // Get chat tags analytics
    public function getChatTagsAnalytics($startDate, $endDate) {
        $sql = "SELECT 
                t.name as tag_name,
                COUNT(*) as usage_count,
                AVG(cs.rating) as avg_rating
                FROM chat_tags ct
                JOIN tags t ON ct.tag_id = t.id
                JOIN chat_sessions cs ON ct.session_id = cs.id
                WHERE cs.start_time BETWEEN ? AND ?
                GROUP BY t.id, t.name
                ORDER BY usage_count DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get conversion analytics
    public function getConversionAnalytics($startDate, $endDate) {
        $sql = "SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN converted = 1 THEN 1 END) as conversions,
                (COUNT(CASE WHEN converted = 1 THEN 1 END) * 100.0 / COUNT(*)) as conversion_rate,
                AVG(CASE WHEN converted = 1 THEN revenue END) as avg_revenue_per_conversion
                FROM chat_sessions
                WHERE start_time BETWEEN ? AND ?
                AND status = 'ended'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get user activity metrics
    public function getUserActivityMetrics($userId, $startDate, $endDate) {
        $sql = "SELECT 
                COUNT(DISTINCT ae.id) as total_events,
                COUNT(DISTINCT DATE(ae.timestamp)) as active_days,
                COUNT(DISTINCT cs.id) as total_chats,
                AVG(cs.rating) as avg_chat_rating
                FROM analytics_events ae
                LEFT JOIN chat_sessions cs ON ae.user_id = cs.user_id 
                AND cs.start_time BETWEEN ? AND ?
                WHERE ae.user_id = ?
                AND ae.timestamp BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate, $userId, $startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get most common event types
    public function getMostCommonEvents($startDate, $endDate, $limit = 10) {
        $sql = "SELECT 
                event_type,
                COUNT(*) as count
                FROM analytics_events
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY event_type
                ORDER BY count DESC
                LIMIT ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get user engagement metrics
    public function getUserEngagementMetrics($startDate, $endDate) {
        $sql = "SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) / COUNT(DISTINCT user_id) as events_per_user,
                COUNT(DISTINCT DATE(timestamp)) as active_days
                FROM analytics_events
                WHERE timestamp BETWEEN ? AND ?
                AND user_id IS NOT NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
