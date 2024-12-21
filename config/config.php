<?php
// Database configuration
define('DB_HOST', 'your_digitalocean_db_host');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_NAME', 'eighteenk_chat');

// Application configuration
define('APP_NAME', '18KChat');
define('APP_URL', 'https://your-domain.com');
define('APP_VERSION', '1.0.0');

// Session configuration
define('SESSION_LIFETIME', 86400); // 24 hours
define('SECURE_COOKIES', true);

// File upload configuration
define('UPLOAD_DIR', __DIR__ . '/../public/uploads/');
define('MAX_FILE_SIZE', 5242880); // 5MB
define('ALLOWED_FILE_TYPES', ['jpg', 'jpeg', 'png', 'gif']);

// API configuration
define('API_KEY', 'your_api_key');
define('API_TIMEOUT', 30);

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');
