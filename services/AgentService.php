<?php
require_once __DIR__ . '/../config/Database.php';

class AgentService {
    private $db;
    /** @var \Redis|null */
    private $redis;
    private $useRedis;

    public function __construct() {
        global $database;
        $this->db = $database;
        
        // Check if Redis extension is available
        $this->useRedis = extension_loaded('redis');
        
        if ($this->useRedis) {
            try {
                $this->redis = new \Redis();
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

    // Get all available agents
    public function getAvailableAgents() {
        if ($this->useRedis) {
            try {
                $agentIds = $this->redis->sMembers('available_agents');
                if (!empty($agentIds)) {
                    $agents = [];
                    foreach ($agentIds as $agentId) {
                        $agent = $this->redis->hGetAll("user:$agentId");
                        if (!empty($agent)) {
                            $agents[] = $agent;
                        }
                    }
                    return $agents;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT u.* 
                FROM users u
                WHERE u.role = 'agent' 
                AND u.status = 'online'
                AND u.id NOT IN (
                    SELECT cs.agent_id 
                    FROM chat_sessions cs 
                    WHERE cs.status = 'active' 
                    GROUP BY cs.agent_id 
                    HAVING COUNT(*) >= u.max_chats
                )
                ORDER BY (
                    SELECT COUNT(*) 
                    FROM chat_sessions cs 
                    WHERE cs.agent_id = u.id 
                    AND cs.status = 'active'
                ) ASC,
                u.auto_accept DESC,
                (
                    SELECT AVG(rating) 
                    FROM chat_sessions cs 
                    WHERE cs.agent_id = u.id 
                    AND rating IS NOT NULL
                ) DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($this->useRedis && !empty($agents)) {
            try {
                foreach ($agents as $agent) {
                    $this->redis->hMSet("user:{$agent['id']}", $agent);
                    $this->redis->sAdd('available_agents', $agent['id']);
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $agents;
    }

    // Get next available agent based on workload and performance
    public function getNextAvailableAgent() {
        $agents = $this->getAvailableAgents();
        return !empty($agents) ? $agents[0] : null;
    }

    // Get agent's current chats
    public function getAgentChats($agentId) {
        if ($this->useRedis) {
            try {
                $chatIds = $this->redis->sMembers("agent:$agentId:chats");
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
                u.username as user_username
                FROM chat_sessions cs
                JOIN users u ON cs.user_id = u.id
                WHERE cs.agent_id = ? 
                AND cs.status = 'active'
                ORDER BY cs.started_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$agentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Update agent status
    public function updateAgentStatus($agentId, $status) {
        $sql = "UPDATE users 
                SET status = ? 
                WHERE id = ? AND role = 'agent'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$status, $agentId]);

        if ($stmt->rowCount() > 0) {
            if ($this->useRedis) {
                try {
                    $agent = $this->getAgent($agentId);
                    $this->redis->hMSet("user:$agentId", $agent);
                    
                    if ($status === 'online') {
                        $this->redis->sAdd('available_agents', $agentId);
                    } else {
                        $this->redis->sRem('available_agents', $agentId);
                    }
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }
            return true;
        }

        return false;
    }

    // Get agent details
    public function getAgent($agentId) {
        if ($this->useRedis) {
            try {
                $agent = $this->redis->hGetAll("user:$agentId");
                if (!empty($agent)) {
                    return $agent;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT * FROM users WHERE id = ? AND role = 'agent'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$agentId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get agent statistics
    public function getAgentStats($agentId, $startDate = null, $endDate = null) {
        $where = ["agent_id = ?"];
        $params = [$agentId];

        if ($startDate) {
            $where[] = "started_at >= ?";
            $params[] = $startDate;
        }

        if ($endDate) {
            $where[] = "started_at <= ?";
            $params[] = $endDate;
        }

        $whereClause = implode(" AND ", $where);

        $sql = "SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_chats,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats,
                AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
                AVG(CASE WHEN status = 'ended' THEN TIMESTAMPDIFF(MINUTE, started_at, ended_at) END) as avg_duration,
                AVG(first_response_time) as avg_first_response_time,
                AVG(avg_response_time) as avg_response_time
                FROM chat_sessions 
                WHERE $whereClause";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Update agent preferences
    public function updateAgentPreferences($agentId, $preferences) {
        $updates = [];
        $values = [];
        
        if (isset($preferences['max_chats'])) {
            $updates[] = "max_chats = ?";
            $values[] = $preferences['max_chats'];
        }
        
        if (isset($preferences['auto_accept'])) {
            $updates[] = "auto_accept = ?";
            $values[] = $preferences['auto_accept'] ? 1 : 0;
        }
        
        if (empty($updates)) {
            return false;
        }

        $values[] = $agentId;
        
        $sql = "UPDATE users 
                SET " . implode(", ", $updates) . "
                WHERE id = ? AND role = 'agent'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        if ($stmt->rowCount() > 0) {
            if ($this->useRedis) {
                try {
                    $agent = $this->getAgent($agentId);
                    $this->redis->hMSet("user:$agentId", $agent);
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }
            return true;
        }

        return false;
    }

    // Get all agents
    public function getAgents($page = 1, $limit = 10) {
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT * FROM users 
                WHERE role = 'agent'
                ORDER BY status DESC, 
                (SELECT COUNT(*) FROM chat_sessions WHERE agent_id = users.id AND status = 'active') ASC,
                (SELECT AVG(rating) FROM chat_sessions WHERE agent_id = users.id AND rating IS NOT NULL) DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get total count
        $sql = "SELECT COUNT(*) FROM users WHERE role = 'agent'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $total = $stmt->fetchColumn();

        return [
            'agents' => $agents,
            'total' => $total,
            'page' => $page,
            'pages' => ceil($total / $limit)
        ];
    }
}
