<?php
require_once __DIR__ . '/../config/database.php';

class UserService {
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

    // Create a new user
    public function createUser($userData) {
        $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
        $userData['created_at'] = date('Y-m-d H:i:s');

        $sql = "INSERT INTO users (username, email, password, role, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $userData['username'],
            $userData['email'],
            $userData['password'],
            $userData['role'] ?? 'user',
            $userData['status'] ?? 'active',
            $userData['created_at']
        ]);

        $userId = $this->db->lastInsertId();
        $userData['id'] = $userId;

        if ($this->useRedis) {
            try {
                $this->redis->hMSet("user:$userId", $userData);
                if ($userData['role'] === 'agent' && ($userData['status'] ?? 'offline') === 'online') {
                    $this->redis->sAdd('available_agents', $userId);
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $userId;
    }

    // Get user by ID
    public function getUser($userId) {
        if ($this->useRedis) {
            try {
                $user = $this->redis->hGetAll("user:$userId");
                if (!empty($user)) {
                    return $user;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $this->useRedis) {
            try {
                $this->redis->hMSet("user:$userId", $user);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $user;
    }

    // Get user by email
    public function getUserByEmail($email) {
        $sql = "SELECT * FROM users WHERE email = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $this->useRedis) {
            try {
                $this->redis->hMSet("user:{$user['id']}", $user);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return $user;
    }

    // Update user
    public function updateUser($userId, $userData) {
        if (isset($userData['password'])) {
            $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
        }

        $updates = [];
        $values = [];
        foreach ($userData as $key => $value) {
            if (in_array($key, ['username', 'email', 'password', 'role', 'status', 'preferences'])) {
                $updates[] = "$key = ?";
                $values[] = $value;
            }
        }
        $values[] = $userId;

        if (!empty($updates)) {
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($values);

            if ($this->useRedis) {
                try {
                    $user = $this->getUser($userId);
                    $this->redis->hMSet("user:$userId", $user);

                    // Update agent availability
                    if (isset($userData['status'])) {
                        if ($user['role'] === 'agent' && $userData['status'] === 'online') {
                            $this->redis->sAdd('available_agents', $userId);
                        } else {
                            $this->redis->sRem('available_agents', $userId);
                        }
                    }
                } catch (Exception $e) {
                    error_log("Redis operation failed: " . $e->getMessage());
                }
            }

            return true;
        }

        return false;
    }

    // Delete user
    public function deleteUser($userId) {
        $sql = "DELETE FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        if ($this->useRedis) {
            try {
                $this->redis->del("user:$userId");
                $this->redis->sRem('available_agents', $userId);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return true;
    }

    // Get users list
    public function getUsers($page = 1, $limit = 10, $role = null) {
        $offset = ($page - 1) * $limit;
        $where = $role ? "WHERE role = ?" : "";
        
        $sql = "SELECT * FROM users $where ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params = $role ? [$role, $limit, $offset] : [$limit, $offset];
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get total count
        $sql = "SELECT COUNT(*) FROM users $where";
        $params = $role ? [$role] : [];
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $total = $stmt->fetchColumn();

        return [
            'users' => $users,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }

    // Authenticate user
    public function authenticate($email, $password) {
        $user = $this->getUserByEmail($email);
        
        if (!$user) {
            throw new Exception('User not found');
        }

        if (!password_verify($password, $user['password'])) {
            throw new Exception('Invalid password');
        }

        // Generate JWT token
        $token = $this->generateToken($user);

        return [
            'user' => array_diff_key($user, ['password' => '']), // Exclude password
            'token' => $token
        ];
    }

    // Generate JWT token
    private function generateToken($user) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'exp' => time() + 3600 // 1 hour expiration
        ]);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', 
            $base64UrlHeader . "." . $base64UrlPayload, 
            getenv('JWT_SECRET') ?: 'your-256-bit-secret', 
            true
        );
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // Verify JWT token
    public function verifyToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));

        $expectedSignature = hash_hmac('sha256', 
            $parts[0] . "." . $parts[1], 
            getenv('JWT_SECRET') ?: 'your-256-bit-secret', 
            true
        );

        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Invalid token signature');
        }

        $payload = json_decode($payload, true);
        if ($payload['exp'] < time()) {
            throw new Exception('Token has expired');
        }

        return $payload;
    }

    // Get user preferences
    public function getUserPreferences($userId) {
        if ($this->useRedis) {
            try {
                $preferences = $this->redis->hGetAll("user:$userId:preferences");
                if (!empty($preferences)) {
                    return $preferences;
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        $sql = "SELECT preferences FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? json_decode($result['preferences'], true) : [];
    }

    // Update user preferences
    public function updateUserPreferences($userId, $preferences) {
        $sql = "UPDATE users SET preferences = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([json_encode($preferences), $userId]);

        if ($this->useRedis) {
            try {
                $this->redis->hMSet("user:$userId:preferences", $preferences);
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return true;
    }

    // Get user chat history
    public function getUserChatHistory($userId, $limit = 50, $offset = 0) {
        $sql = "SELECT cs.*, a.username as agent_username 
                FROM chat_sessions cs 
                LEFT JOIN users a ON cs.agent_id = a.id 
                WHERE cs.user_id = ? 
                ORDER BY cs.start_time DESC 
                LIMIT ? OFFSET ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get user activity
    public function getUserActivity($userId, $startDate, $endDate) {
        $sql = "SELECT 
                COUNT(*) as total_chats,
                AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as avg_rating,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_chats,
                AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_chat_duration
                FROM chat_sessions 
                WHERE user_id = ? 
                AND start_time BETWEEN ? AND ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $startDate, $endDate]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Change user role
    public function changeUserRole($userId, $newRole) {
        $sql = "UPDATE users SET role = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$newRole, $userId]);

        if ($this->useRedis) {
            try {
                $user = $this->getUser($userId);
                $this->redis->hMSet("user:$userId", $user);
                
                if ($newRole === 'agent') {
                    $this->redis->sAdd('available_agents', $userId);
                } else {
                    $this->redis->sRem('available_agents', $userId);
                }
            } catch (Exception $e) {
                error_log("Redis operation failed: " . $e->getMessage());
            }
        }

        return true;
    }

    // Reset password
    public function resetPassword($email) {
        // Generate reset token
        $resetToken = bin2hex(random_bytes(32));
        $hashedToken = password_hash($resetToken, PASSWORD_DEFAULT);
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $sql = "UPDATE users 
                SET reset_token = ?, reset_token_expires = ? 
                WHERE email = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$hashedToken, $expiry, $email]);

        return $resetToken;
    }

    // Verify reset token
    public function verifyResetToken($token, $email) {
        $sql = "SELECT * FROM users 
                WHERE email = ? 
                AND reset_token_expires > NOW()";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception("Invalid or expired reset token");
        }

        if (!password_verify($token, $user['reset_token'])) {
            throw new Exception("Invalid reset token");
        }

        return true;
    }
}
