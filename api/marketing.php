<?php
require_once '../config/config.php';
require_once '../config/Database.php';

header('Content-Type: application/json');

// Initialize database connection
$db = Database::getInstance();

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check authentication
function checkAuth() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    // Implement your authentication logic here
}

// Handle file uploads
function handleFileUpload($file) {
    $target_dir = UPLOAD_DIR;
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $file_name = uniqid() . '.' . $file_extension;
    $target_file = $target_dir . $file_name;

    if (!in_array($file_extension, ALLOWED_FILE_TYPES)) {
        throw new Exception('Invalid file type');
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File too large');
    }

    if (move_uploaded_file($file['tmp_name'], $target_file)) {
        return '/uploads/' . $file_name;
    }

    throw new Exception('Failed to upload file');
}

try {
    $route = $_GET['route'] ?? '';

    switch ($route) {
        case 'hero':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $db->query("SELECT * FROM marketing_content WHERE section = 'hero' LIMIT 1");
                echo json_encode($stmt->fetch());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                checkAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                
                if (isset($_FILES['image'])) {
                    $data['image_url'] = handleFileUpload($_FILES['image']);
                }

                $result = $db->update(
                    'marketing_content',
                    [
                        'title' => $data['heading'],
                        'content' => $data['subheading'],
                        'image_url' => $data['image_url'] ?? null
                    ],
                    "section = 'hero'"
                );
                echo json_encode(['success' => true]);
            }
            break;

        case 'announcements':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $db->query("SELECT * FROM announcements WHERE status = 'active' ORDER BY created_at DESC");
                echo json_encode($stmt->fetchAll());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                checkAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                $id = $db->insert('announcements', [
                    'title' => $data['title'],
                    'content' => $data['content'],
                    'type' => $data['type'],
                    'target_audience' => $data['target'],
                    'start_date' => $data['start_date'],
                    'end_date' => $data['end_date'] ?? null
                ]);
                echo json_encode(['id' => $id]);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                checkAuth();
                $id = $_GET['id'] ?? '';
                $db->update('announcements', ['status' => 'inactive'], "id = {$id}");
                echo json_encode(['success' => true]);
            }
            break;

        case 'features':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $db->query("SELECT * FROM features WHERE status = 'active' ORDER BY display_order");
                echo json_encode($stmt->fetchAll());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                checkAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                $id = $db->insert('features', [
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'icon' => $data['icon'],
                    'display_order' => $data['display_order'] ?? 0
                ]);
                echo json_encode(['id' => $id]);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                checkAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                $id = $_GET['id'] ?? '';
                $db->update('features', [
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'icon' => $data['icon'],
                    'display_order' => $data['display_order'] ?? 0
                ], "id = {$id}");
                echo json_encode(['success' => true]);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                checkAuth();
                $id = $_GET['id'] ?? '';
                $db->update('features', ['status' => 'inactive'], "id = {$id}");
                echo json_encode(['success' => true]);
            }
            break;

        case 'seo':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $page = $_GET['page'] ?? 'index';
                $stmt = $db->query("SELECT * FROM seo_settings WHERE page_name = ?", [$page]);
                echo json_encode($stmt->fetch());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                checkAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                $db->update('seo_settings', [
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'keywords' => $data['keywords']
                ], "page_name = '{$data['page_name']}'");
                echo json_encode(['success' => true]);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Route not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
