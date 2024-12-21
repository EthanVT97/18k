<?php

use Redis;

class ChatService {
    private $db;
    /** @var Redis|null */
    private $redis;
    private $useRedis;
    private $agentService;

    public function __construct() {
        global $database;
        $this->db = $database;
        
        // Check if Redis extension is available
        $this->useRedis = extension_loaded('redis');
        
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

        $this->agentService = new AgentService();
    }

    // Create a new chat session
    public function createChat($data) {
        // Validate required fields
        if (!isset($data['user_id'])) {
            throw new Exception('User ID is required');
        }

        // Create the chat session
        $sql = "INSERT INTO chat_sessions (user_id, topic, status, started_at) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['user_id'],
            $data['topic'] ?? null,
            'waiting',
            date('Y-m-d H:i:s')
        ]);

        $chatId = $this->db->lastInsertId();

        // Try to assign an available agent
        $availableAgent = $this->agentService->getNextAvailableAgent();
        if ($availableAgent) {
            $this->assignAgent($chatId, $availableAgent['id']);
        }

        // Store in Redis for real-time access
        if ($this->useRedis) {
            try {
                $chatData = $this->getChat($chatId);
                $this->redis->hMSet("chat:$chatId", $chatData);
                $this->redis->sAdd('active_chats', $chatId);
                $this->redis->sAdd("user:{$data['user_id']}:chats", $chatId);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $this->getChat($chatId);
    }

    // Get chat details
    public function getChat($chatId) {
        if ($this->useRedis) {
            try {
                $chat = $this->redis->hGetAll("chat:$chatId");
                if (!empty($chat)) {
                    return $chat;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT cs.*, 
                u.username as user_username,
                a.username as agent_username
                FROM chat_sessions cs
                JOIN users u ON cs.user_id = u.id
                LEFT JOIN users a ON cs.agent_id = a.id
                WHERE cs.id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$chatId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Update chat session
    public function updateChat($chatId, $data) {
        $updates = [];
        $values = [];
        foreach ($data as $key => $value) {
            if (in_array($key, ['status', 'topic', 'rating', 'feedback'])) {
                $updates[] = "$key = ?";
                $values[] = $value;
            }
        }
        $values[] = $chatId;

        if (!empty($updates)) {
            $sql = "UPDATE chat_sessions SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($values);

            if ($this->useRedis) {
                try {
                    $chat = $this->getChat($chatId);
                    $this->redis->hMSet("chat:$chatId", $chat);
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }

            return true;
        }

        return false;
    }

    // Assign agent to chat
    public function assignAgent($chatId, $agentId) {
        $sql = "UPDATE chat_sessions 
                SET agent_id = ?, 
                    status = 'active', 
                    first_response_time = TIMESTAMPDIFF(SECOND, started_at, NOW())
                WHERE id = ? AND status = 'waiting'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$agentId, $chatId]);

        if ($stmt->rowCount() > 0) {
            if ($this->useRedis) {
                try {
                    $chat = $this->getChat($chatId);
                    $this->redis->hMSet("chat:$chatId", $chat);
                    $this->redis->sAdd("agent:$agentId:chats", $chatId);
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }
            return true;
        }

        return false;
    }

    // End chat session
    public function endChat($chatId) {
        $sql = "UPDATE chat_sessions 
                SET status = 'ended', 
                    ended_at = NOW(),
                    avg_response_time = (
                        SELECT AVG(TIMESTAMPDIFF(SECOND, m1.sent_at, m2.sent_at))
                        FROM messages m1
                        JOIN messages m2 ON m2.chat_session_id = m1.chat_session_id
                        WHERE m1.chat_session_id = ?
                        AND m1.sender_type = 'user'
                        AND m2.sender_type = 'agent'
                        AND m2.sent_at > m1.sent_at
                    )
                WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$chatId, $chatId]);

        if ($this->useRedis) {
            try {
                $chat = $this->getChat($chatId);
                $this->redis->hMSet("chat:$chatId", $chat);
                $this->redis->sRem('active_chats', $chatId);
                
                if ($chat['agent_id']) {
                    $this->redis->sRem("agent:{$chat['agent_id']}:chats", $chatId);
                }
                
                $this->redis->sRem("user:{$chat['user_id']}:chats", $chatId);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return true;
    }

    // Add message to chat
    public function addMessage($chatId, $data) {
        // Validate required fields
        if (!isset($data['sender_id']) || !isset($data['message_type']) || !isset($data['content'])) {
            throw new Exception('Sender ID, message type, and content are required');
        }

        $chat = $this->getChat($chatId);
        if (!$chat) {
            throw new Exception('Chat session not found');
        }

        // Determine sender type
        $senderType = $data['sender_id'] == $chat['user_id'] ? 'user' : 'agent';

        $sql = "INSERT INTO messages (chat_session_id, sender_id, sender_type, message_type, content, sent_at) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $chatId,
            $data['sender_id'],
            $senderType,
            $data['message_type'],
            $data['content'],
            date('Y-m-d H:i:s')
        ]);

        $messageId = $this->db->lastInsertId();
        $message = $this->getMessage($messageId);

        if ($this->useRedis) {
            try {
                // Add to message list
                $this->redis->rPush("chat:$chatId:messages", json_encode($message));
                
                // Update last message timestamp
                $this->redis->hSet("chat:$chatId", 'last_message_at', $message['sent_at']);
                
                // Publish message for real-time updates
                $this->redis->publish("chat:$chatId", json_encode([
                    'type' => 'new_message',
                    'data' => $message
                ]));
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $message;
    }

    // Get message by ID
    public function getMessage($messageId) {
        $sql = "SELECT m.*, 
                u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$messageId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get chat messages
    public function getChatMessages($chatId, $limit = 50, $before = null) {
        if ($this->useRedis) {
            try {
                $messages = $this->redis->lRange("chat:$chatId:messages", 0, $limit - 1);
                if (!empty($messages)) {
                    return array_map(function($msg) {
                        return json_decode($msg, true);
                    }, $messages);
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT m.*, 
                u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.chat_session_id = ?";
        $params = [$chatId];

        if ($before) {
            $sql .= " AND m.sent_at < ?";
            $params[] = $before;
        }

        $sql .= " ORDER BY m.sent_at DESC LIMIT ?";
        $params[] = $limit;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // Get user's active chats
    public function getUserActiveChats($userId) {
        if ($this->useRedis) {
            try {
                $chatIds = $this->redis->sMembers("user:$userId:chats");
                if (!empty($chatIds)) {
                    $chats = [];
                    foreach ($chatIds as $chatId) {
                        $chat = $this->redis->hGetAll("chat:$chatId");
                        if (!empty($chat)) {
                            $chats[] = $chat;
                        }
                    }
                    return $chats;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT cs.*, 
                u.username as user_username,
                a.username as agent_username
                FROM chat_sessions cs
                JOIN users u ON cs.user_id = u.id
                LEFT JOIN users a ON cs.agent_id = a.id
                WHERE cs.user_id = ? AND cs.status != 'ended'
                ORDER BY cs.started_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get all user chats
    public function getUserChats($userId, $page = 1, $limit = 10) {
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT cs.*, 
                u.username as user_username,
                a.username as agent_username
                FROM chat_sessions cs
                JOIN users u ON cs.user_id = u.id
                LEFT JOIN users a ON cs.agent_id = a.id
                WHERE cs.user_id = ?
                ORDER BY cs.started_at DESC
                LIMIT ? OFFSET ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        $chats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get total count
        $sql = "SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $total = $stmt->fetchColumn();

        return [
            'chats' => $chats,
            'total' => $total,
            'page' => $page,
            'pages' => ceil($total / $limit)
        ];
    }

    // Get chat statistics
    public function getChatStats($userId = null, $startDate = null, $endDate = null) {
        $where = [];
        $params = [];

        if ($userId) {
            $where[] = "user_id = ?";
            $params[] = $userId;
        }

        if ($startDate) {
            $where[] = "started_at >= ?";
            $params[] = $startDate;
        }

        if ($endDate) {
            $where[] = "started_at <= ?";
            $params[] = $endDate;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_chats,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats,
                COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_chats,
                AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
                AVG(CASE WHEN status = 'ended' THEN TIMESTAMPDIFF(MINUTE, started_at, ended_at) END) as avg_duration,
                AVG(first_response_time) as avg_first_response_time,
                AVG(avg_response_time) as avg_response_time
                FROM chat_sessions
                $whereClause";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
