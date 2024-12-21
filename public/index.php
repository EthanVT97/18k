<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_error.log');

// Create logs directory if it doesn't exist
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0777, true);
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../services/ChatService.php';
require_once __DIR__ . '/../services/AgentService.php';
require_once __DIR__ . '/../services/ChatbotService.php';
require_once __DIR__ . '/../services/UserService.php';
require_once __DIR__ . '/../services/AnalyticsService.php';

// Load environment variables
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    error_log("Failed to load .env file: " . $e->getMessage());
    die("Configuration error. Please check the logs.");
}

// Initialize database connection
try {
    $database = Database::getInstance()->getConnection();
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    die("Database connection error. Please check the logs.");
}

// Initialize services
try {
    $chatService = new ChatService();
    $agentService = new AgentService();
    $chatbotService = new ChatbotService();
    $userService = new UserService();
    $analyticsService = new AnalyticsService();
} catch (Exception $e) {
    error_log("Service initialization failed: " . $e->getMessage());
    die("Service initialization error. Please check the logs.");
}

// Get the request URI
$request = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Check if this is an API request
if (strpos($request, '/api/') === 0) {
    // Set headers for API responses
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // Handle preflight requests
    if ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    // Parse JSON body for POST requests
    $jsonBody = null;
    if ($method === 'POST') {
        $jsonBody = json_decode(file_get_contents('php://input'), true);
    }

    // API routing
    try {
        switch (true) {
            // Authentication routes
            case preg_match('/^\/api\/auth\/login$/', $request):
                if ($method === 'POST') {
                    $result = $userService->authenticate($jsonBody['email'], $jsonBody['password']);
                    echo json_encode($result);
                }
                break;

            case preg_match('/^\/api\/auth\/register$/', $request):
                if ($method === 'POST') {
                    $result = $userService->createUser($jsonBody);
                    echo json_encode(['id' => $result]);
                }
                break;

            // User routes
            case preg_match('/^\/api\/users$/', $request):
                if ($method === 'GET') {
                    $page = $_GET['page'] ?? 1;
                    $limit = $_GET['limit'] ?? 10;
                    $role = $_GET['role'] ?? null;
                    $result = $userService->getUsers($page, $limit, $role);
                    echo json_encode($result);
                }
                break;

            case preg_match('/^\/api\/users\/(\d+)$/', $request, $matches):
                $userId = $matches[1];
                if ($method === 'GET') {
                    $result = $userService->getUser($userId);
                    echo json_encode($result);
                } elseif ($method === 'PUT') {
                    $result = $userService->updateUser($userId, $jsonBody);
                    echo json_encode(['success' => true]);
                } elseif ($method === 'DELETE') {
                    $result = $userService->deleteUser($userId);
                    echo json_encode(['success' => true]);
                }
                break;

            // Chat routes
            case preg_match('/^\/api\/chats$/', $request):
                if ($method === 'GET') {
                    $userId = $_GET['user_id'] ?? null;
                    $result = $chatService->getUserChats($userId);
                    echo json_encode($result);
                } elseif ($method === 'POST') {
                    $result = $chatService->createChat($jsonBody);
                    echo json_encode($result);
                }
                break;

            case preg_match('/^\/api\/chats\/(\d+)$/', $request, $matches):
                $chatId = $matches[1];
                if ($method === 'GET') {
                    $result = $chatService->getChat($chatId);
                    echo json_encode($result);
                } elseif ($method === 'PUT') {
                    $result = $chatService->updateChat($chatId, $jsonBody);
                    echo json_encode(['success' => true]);
                }
                break;

            case preg_match('/^\/api\/chats\/(\d+)\/messages$/', $request, $matches):
                $chatId = $matches[1];
                if ($method === 'GET') {
                    $result = $chatService->getChatMessages($chatId);
                    echo json_encode($result);
                } elseif ($method === 'POST') {
                    $result = $chatService->addMessage($chatId, $jsonBody);
                    echo json_encode($result);
                }
                break;

            // Agent routes
            case preg_match('/^\/api\/agents\/available$/', $request):
                if ($method === 'GET') {
                    $result = $agentService->getAvailableAgents();
                    echo json_encode($result);
                }
                break;

            case preg_match('/^\/api\/agents\/(\d+)\/status$/', $request, $matches):
                $agentId = $matches[1];
                if ($method === 'PUT') {
                    $result = $agentService->updateAgentStatus($agentId, $jsonBody['status']);
                    echo json_encode(['success' => true]);
                }
                break;

            // Chatbot routes
            case preg_match('/^\/api\/chatbot\/message$/', $request):
                if ($method === 'POST') {
                    $result = $chatbotService->processMessage(
                        $jsonBody['session_id'],
                        $jsonBody['user_id'],
                        $jsonBody['message']
                    );
                    echo json_encode($result);
                }
                break;

            // Analytics routes
            case preg_match('/^\/api\/analytics\/satisfaction$/', $request):
                if ($method === 'GET') {
                    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
                    $endDate = $_GET['end_date'] ?? date('Y-m-d');
                    $result = $analyticsService->getSatisfactionTrends($startDate, $endDate);
                    echo json_encode($result);
                }
                break;

            case preg_match('/^\/api\/analytics\/performance$/', $request):
                if ($method === 'GET') {
                    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
                    $endDate = $_GET['end_date'] ?? date('Y-m-d');
                    $result = $analyticsService->getAgentPerformance($startDate, $endDate);
                    echo json_encode($result);
                }
                break;

            default:
                http_response_code(404);
                echo json_encode(['error' => 'API endpoint not found']);
                break;
        }
    } catch (Exception $e) {
        error_log("API error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    // Handle web requests
    switch ($request) {
        case '/':
        case '/index.php':
        case '/index.html':
            include __DIR__ . '/index.html';
            break;
            
        case '/admin':
        case '/admin/':
        case '/admin-dashboard.html':
            include __DIR__ . '/admin-dashboard.html';
            break;
            
        case '/agent':
        case '/agent/':
        case '/agent-dashboard.html':
            include __DIR__ . '/agent-dashboard.html';
            break;
            
        case '/agent/login':
        case '/agent-login.html':
            include __DIR__ . '/agent-login.html';
            break;
            
        case '/widget':
        case '/chat-widget.html':
            include __DIR__ . '/chat-widget.html';
            break;
            
        default:
            // Check if the requested file exists
            $file = __DIR__ . $request;
            if (file_exists($file) && !is_dir($file)) {
                // Set the correct content type
                $ext = pathinfo($file, PATHINFO_EXTENSION);
                $contentTypes = [
                    'css' => 'text/css',
                    'js' => 'application/javascript',
                    'png' => 'image/png',
                    'jpg' => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'gif' => 'image/gif',
                    'svg' => 'image/svg+xml',
                ];
                
                if (isset($contentTypes[$ext])) {
                    header('Content-Type: ' . $contentTypes[$ext]);
                }
                
                readfile($file);
            } else {
                http_response_code(404);
                include __DIR__ . '/404.html';
            }
            break;
    }
}
