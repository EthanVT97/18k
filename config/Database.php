<?php
class Database {
    private $connection;
    private static $instance = null;

    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_NAME'],
                $_ENV['DB_USER'],
                $_ENV['DB_PASSWORD'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (PDOException $e) {
            error_log("Connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    public function insert($table, $data) {
        $fields = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO {$table} ({$fields}) VALUES ({$placeholders})";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_values($data));
            return $this->connection->lastInsertId();
        } catch (PDOException $e) {
            error_log("Insert failed: " . $e->getMessage());
            throw new Exception("Database insert failed");
        }
    }

    public function update($table, $data, $where) {
        $set = implode(' = ?, ', array_keys($data)) . ' = ?';
        $whereClause = implode(' = ? AND ', array_keys($where)) . ' = ?';
        $sql = "UPDATE {$table} SET {$set} WHERE {$whereClause}";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_merge(array_values($data), array_values($where)));
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Update failed: " . $e->getMessage());
            throw new Exception("Database update failed");
        }
    }

    public function delete($table, $where) {
        $whereClause = implode(' = ? AND ', array_keys($where)) . ' = ?';
        $sql = "DELETE FROM {$table} WHERE {$whereClause}";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_values($where));
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Delete failed: " . $e->getMessage());
            throw new Exception("Database delete failed");
        }
    }
}
