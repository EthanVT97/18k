<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/ChatService.php';
require_once __DIR__ . '/AgentService.php';
require_once __DIR__ . '/ChatbotService.php';
require_once __DIR__ . '/UserService.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WebSocketService implements MessageComponentInterface {
    protected $clients;
    protected $userConnections;
    protected $chatService;
    protected $agentService;
    protected $chatbotService;
    protected $userService;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->userConnections = [];
        $this->chatService = new ChatService();
        $this->agentService = new AgentService();
        $this->chatbotService = new ChatbotService();
        $this->userService = new UserService();
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!isset($data['type'])) {
            return;
        }

        try {
            switch ($data['type']) {
                case 'authenticate':
                    $this->handleAuthentication($from, $data);
                    break;
                    
                case 'start_chat':
                    $this->handleStartChat($from, $data);
                    break;
                    
                case 'message':
                    $this->handleMessage($from, $data);
                    break;
                    
                case 'typing':
                    $this->handleTyping($from, $data);
                    break;
                    
                case 'end_chat':
                    $this->handleEndChat($from, $data);
                    break;
                    
                case 'agent_status':
                    $this->handleAgentStatus($from, $data);
                    break;
            }
        } catch (Exception $e) {
            $this->sendError($from, $e->getMessage());
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        
        // Handle agent disconnection
        if (isset($this->userConnections[$conn->resourceId])) {
            $user = $this->userConnections[$conn->resourceId];
            if ($user['role'] === 'agent') {
                $this->agentService->setAgentStatus($user['id'], 'offline');
                $this->broadcastToRole('agent', [
                    'type' => 'agent_status_changed',
                    'agentId' => $user['id'],
                    'status' => 'offline'
                ]);
            }
            unset($this->userConnections[$conn->resourceId]);
        }

        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function handleAuthentication($conn, $data) {
        try {
            $auth = $this->userService->authenticate($data['email'], $data['password']);
            $this->userConnections[$conn->resourceId] = $auth['user'];
            
            if ($auth['user']['role'] === 'agent') {
                $this->agentService->setAgentStatus($auth['user']['id'], 'available');
            }
            
            $this->send($conn, [
                'type' => 'authenticated',
                'user' => $auth['user']
            ]);
        } catch (Exception $e) {
            $this->sendError($conn, $e->getMessage());
        }
    }

    protected function handleStartChat($conn, $data) {
        $user = $this->userConnections[$conn->resourceId];
        $sessionId = $this->chatService->createChatSession($user['id'], $data['metadata'] ?? []);
        
        // Try chatbot first
        $botResponse = $this->chatbotService->getResponse($data['message']);
        $this->send($conn, [
            'type' => 'message',
            'sessionId' => $sessionId,
            'message' => $botResponse['response'],
            'sender' => 'bot'
        ]);

        // If chatbot can't handle it, find available agent
        if ($botResponse['category'] === 'default') {
            $availableAgents = $this->agentService->getAvailableAgents();
            if (!empty($availableAgents)) {
                $agentId = $availableAgents[0];
                $this->chatService->assignAgent($sessionId, $agentId);
                $this->broadcastToAgent($agentId, [
                    'type' => 'chat_assigned',
                    'sessionId' => $sessionId,
                    'user' => $user
                ]);
            } else {
                $this->send($conn, [
                    'type' => 'message',
                    'sessionId' => $sessionId,
                    'message' => 'All our agents are currently busy. Please wait.',
                    'sender' => 'system'
                ]);
            }
        }
    }

    protected function handleMessage($conn, $data) {
        $user = $this->userConnections[$conn->resourceId];
        $messageId = $this->chatService->storeMessage($data['sessionId'], [
            'sender' => $user['id'],
            'content' => $data['message']
        ]);

        $session = $this->chatService->getSessionDetails($data['sessionId']);
        $messageData = [
            'type' => 'message',
            'id' => $messageId,
            'sessionId' => $data['sessionId'],
            'message' => $data['message'],
            'sender' => $user['id'],
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // Send to all participants in the chat
        $this->broadcastToChat($data['sessionId'], $messageData);

        // If message is from user, get chatbot response
        if ($user['role'] === 'user' && !$session['agent_id']) {
            $botResponse = $this->chatbotService->getResponse($data['message']);
            if ($botResponse['category'] !== 'default') {
                $botMessageId = $this->chatService->storeMessage($data['sessionId'], [
                    'sender' => 'bot',
                    'content' => $botResponse['response']
                ]);

                $this->send($conn, [
                    'type' => 'message',
                    'id' => $botMessageId,
                    'sessionId' => $data['sessionId'],
                    'message' => $botResponse['response'],
                    'sender' => 'bot',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    protected function handleTyping($conn, $data) {
        $user = $this->userConnections[$conn->resourceId];
        $this->broadcastToChat($data['sessionId'], [
            'type' => 'typing',
            'sessionId' => $data['sessionId'],
            'user' => $user['id'],
            'isTyping' => $data['isTyping']
        ], [$conn->resourceId]);
    }

    protected function handleEndChat($conn, $data) {
        $user = $this->userConnections[$conn->resourceId];
        $session = $this->chatService->endChatSession($data['sessionId']);
        
        if ($session['agent_id']) {
            $this->agentService->removeChat($session['agent_id'], $data['sessionId']);
        }

        $this->broadcastToChat($data['sessionId'], [
            'type' => 'chat_ended',
            'sessionId' => $data['sessionId'],
            'endedBy' => $user['id']
        ]);
    }

    protected function handleAgentStatus($conn, $data) {
        $user = $this->userConnections[$conn->resourceId];
        if ($user['role'] !== 'agent') {
            throw new Exception('Only agents can update their status');
        }

        $this->agentService->setAgentStatus($user['id'], $data['status']);
        $this->broadcastToRole('agent', [
            'type' => 'agent_status_changed',
            'agentId' => $user['id'],
            'status' => $data['status']
        ]);
    }

    protected function send($conn, $data) {
        $conn->send(json_encode($data));
    }

    protected function sendError($conn, $message) {
        $this->send($conn, [
            'type' => 'error',
            'message' => $message
        ]);
    }

    protected function broadcastToChat($sessionId, $data, $excludeIds = []) {
        foreach ($this->clients as $client) {
            if (in_array($client->resourceId, $excludeIds)) {
                continue;
            }

            $user = $this->userConnections[$client->resourceId] ?? null;
            if (!$user) {
                continue;
            }

            $session = $this->chatService->getSessionDetails($sessionId);
            if ($user['id'] === $session['user_id'] || 
                $user['id'] === $session['agent_id'] || 
                $user['role'] === 'admin') {
                $this->send($client, $data);
            }
        }
    }

    protected function broadcastToAgent($agentId, $data) {
        foreach ($this->clients as $client) {
            $user = $this->userConnections[$client->resourceId] ?? null;
            if ($user && $user['id'] === $agentId) {
                $this->send($client, $data);
                break;
            }
        }
    }

    protected function broadcastToRole($role, $data) {
        foreach ($this->clients as $client) {
            $user = $this->userConnections[$client->resourceId] ?? null;
            if ($user && $user['role'] === $role) {
                $this->send($client, $data);
            }
        }
    }
}
