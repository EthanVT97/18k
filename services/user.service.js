const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserService {
    // Create a new user
    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const query = `
            INSERT INTO users (
                username,
                email,
                password,
                role,
                status
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [
            userData.username,
            userData.email,
            hashedPassword,
            userData.role || 'user',
            'active'
        ]);

        return result.insertId;
    }

    // Authenticate user
    async authenticate(email, password) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(query, [email]);
        
        if (users.length === 0) {
            throw new Error('User not found');
        }

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            throw new Error('Invalid password');
        }

        if (user.status !== 'active') {
            throw new Error('Account is not active');
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id,
                role: user.role,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
    }

    // Get user by ID
    async getUserById(userId) {
        const query = 'SELECT id, username, email, role, status, created_at FROM users WHERE id = ?';
        const [users] = await db.query(query, [userId]);
        return users[0];
    }

    // Update user profile
    async updateUser(userId, userData) {
        const updates = [];
        const values = [];

        if (userData.username) {
            updates.push('username = ?');
            values.push(userData.username);
        }

        if (userData.email) {
            updates.push('email = ?');
            values.push(userData.email);
        }

        if (userData.password) {
            updates.push('password = ?');
            values.push(await bcrypt.hash(userData.password, 10));
        }

        if (userData.status) {
            updates.push('status = ?');
            values.push(userData.status);
        }

        if (updates.length === 0) {
            return false;
        }

        values.push(userId);
        const query = `
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = ?
        `;
        
        const [result] = await db.query(query, values);
        return result.affectedRows > 0;
    }

    // Delete user
    async deleteUser(userId) {
        const query = 'UPDATE users SET status = "inactive" WHERE id = ?';
        const [result] = await db.query(query, [userId]);
        return result.affectedRows > 0;
    }

    // Get all users with pagination
    async getUsers(page = 1, limit = 10, role = null) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT id, username, email, role, status, created_at
            FROM users
        `;
        const values = [];

        if (role) {
            query += ' WHERE role = ?';
            values.push(role);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        values.push(limit, offset);

        const [users] = await db.query(query, values);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        if (role) {
            countQuery += ' WHERE role = ?';
        }
        const [counts] = await db.query(countQuery, role ? [role] : []);

        return {
            users,
            total: counts[0].total,
            page,
            totalPages: Math.ceil(counts[0].total / limit)
        };
    }

    // Change user role
    async changeUserRole(userId, newRole) {
        const query = 'UPDATE users SET role = ? WHERE id = ?';
        const [result] = await db.query(query, [newRole, userId]);
        return result.affectedRows > 0;
    }

    // Get user activity
    async getUserActivity(userId) {
        const query = `
            SELECT 
                cs.id as session_id,
                cs.start_time,
                cs.end_time,
                cs.status,
                cs.rating,
                COUNT(cm.id) as message_count
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cs.id = cm.session_id
            WHERE cs.user_id = ?
            GROUP BY cs.id
            ORDER BY cs.start_time DESC
            LIMIT 10
        `;
        const [activity] = await db.query(query, [userId]);
        return activity;
    }

    // Reset password
    async resetPassword(email) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Store token in database
        const query = `
            UPDATE users
            SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR)
            WHERE email = ?
        `;
        await db.query(query, [hashedToken, email]);

        return resetToken;
    }

    // Verify reset token
    async verifyResetToken(token, email) {
        const query = `
            SELECT *
            FROM users
            WHERE email = ?
            AND reset_token_expires > NOW()
        `;
        const [users] = await db.query(query, [email]);
        
        if (users.length === 0) {
            throw new Error('Invalid or expired reset token');
        }

        const isValid = await bcrypt.compare(token, users[0].reset_token);
        if (!isValid) {
            throw new Error('Invalid reset token');
        }

        return true;
    }
}

module.exports = new UserService();
