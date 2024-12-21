<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/services/WebSocketService.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Create WebSocket server
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WebSocketService()
        )
    ),
    8080
);

echo "WebSocket server started on port 8080\n";
$server->run();
