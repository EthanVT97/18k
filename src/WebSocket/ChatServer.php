<?php

namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use SplObjectStorage;

class ChatServer implements MessageComponentInterface
{
    protected $clients;
    protected $users = [];

    public function __construct()
    {
        $this->clients = new SplObjectStorage;
        echo "Chat Server initialized!\n";
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        
        if (!$data) {
            return;
        }

        switch ($data['type'] ?? '') {
            case 'auth':
                $this->handleAuth($from, $data);
                break;
            case 'chat_message':
                $this->handleChatMessage($from, $data);
                break;
            case 'typing':
                $this->handleTyping($from, $data);
                break;
        }
    }

    protected function handleAuth($conn, $data)
    {
        $role = $data['role'] ?? 'customer';
        $this->users[$conn->resourceId] = [
            'role' => $role,
            'connection' => $conn
        ];
        
        $conn->send(json_encode([
            'type' => 'auth_success',
            'message' => 'Successfully authenticated'
        ]));
    }

    protected function handleChatMessage($from, $data)
    {
        $user = $this->users[$from->resourceId] ?? null;
        if (!$user) return;

        $messageData = [
            'type' => 'chat_message',
            'message' => [
                'content' => $data['content'] ?? '',
                'sender' => $user['role'],
                'timestamp' => time()
            ]
        ];

        // If it's a customer message, send to all agents
        if ($user['role'] === 'customer') {
            foreach ($this->users as $userData) {
                if ($userData['role'] === 'agent') {
                    $userData['connection']->send(json_encode($messageData));
                }
            }
        }
        // If it's an agent message, send to the specific customer
        else if ($user['role'] === 'agent' && isset($data['customerId'])) {
            foreach ($this->users as $userData) {
                if ($userData['role'] === 'customer' && $userData['connection']->resourceId == $data['customerId']) {
                    $userData['connection']->send(json_encode($messageData));
                    break;
                }
            }
        }
    }

    protected function handleTyping($from, $data)
    {
        $user = $this->users[$from->resourceId] ?? null;
        if (!$user) return;

        $typingData = [
            'type' => 'typing',
            'userId' => $from->resourceId,
            'isTyping' => $data['isTyping'] ?? false
        ];

        foreach ($this->clients as $client) {
            if ($from !== $client) {
                $client->send(json_encode($typingData));
            }
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        unset($this->users[$conn->resourceId]);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}
