const fs = require('fs').promises;
const path = require('path');
const db = require('./database');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
    try {
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .filter(statement => statement.trim())
            .map(statement => statement.trim() + ';');
        
        // Execute each statement
        for (const statement of statements) {
            await db.query(statement);
        }
        
        console.log('Schema created successfully');

        // Create default admin user if not exists
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        await db.query(`
            INSERT IGNORE INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        `, ['admin', 'admin@18kchat.com', hashedPassword, 'admin']);
        
        console.log('Default admin user created');

        // Create default system settings
        const defaultSettings = [
            ['chat_retention_days', '30', 'Number of days to retain chat history'],
            ['max_file_size', '5242880', 'Maximum file upload size in bytes'],
            ['allowed_file_types', '["image/jpeg","image/png","application/pdf"]', 'Allowed file upload types'],
            ['maintenance_mode', 'false', 'System maintenance mode'],
            ['chat_timeout', '300', 'Chat session timeout in seconds']
        ];

        for (const [key, value, description] of defaultSettings) {
            await db.query(`
                INSERT IGNORE INTO system_settings (setting_key, setting_value, description)
                VALUES (?, ?, ?)
            `, [key, value, description]);
        }

        console.log('Default system settings created');
        
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Database initialization completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;
