const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { setupSecurity } = require('./middleware/security');
const cors = require('cors');
const compression = require('compression');
const dnsConfig = require('./config/dns-config');
const db = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Domain configuration
const DOMAIN = dnsConfig.domain;
const ALLOWED_ORIGINS = [
    `https://${DOMAIN}`,
    `https://www.${DOMAIN}`,
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://0.0.0.0:8080'
];

// Update CORS configuration for development
const corsOptions = {
    origin: '*', // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Apply security middleware
setupSecurity(app);

// Enable CORS
app.use(cors(corsOptions));

// Enable compression
app.use(compression());

// Serve static files
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Add a specific route for agent-login.html
app.get('/agent-login.html', (req, res) => {
    console.log('Attempting to serve agent-login.html');
    res.sendFile(path.join(publicPath, 'agent-login.html'));
});

// Chat state
const customers = new Map();
const agents = new Map();
const chats = new Map();
const chatQueue = [];

// Enhanced Socket.IO connection handler with error handling
io.engine.on("connection_error", (err) => {
    console.error('Socket.IO connection error:', err);
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log('New connection established:', socket.id);

    // Error handling for socket events
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'An error occurred with the connection' });
    });

    // Implement heartbeat mechanism
    let heartbeat = setInterval(() => {
        socket.emit('ping');
    }, 25000);

    socket.on('pong', () => {
        // Client is still connected
        console.log(`Heartbeat received from ${socket.id}`);
    });

    socket.on('auth', (data) => {
        try {
            handleAuth(socket, data);
        } catch (error) {
            console.error('Auth error:', error);
            socket.emit('auth_error', { message: 'Authentication failed' });
        }
    });

    socket.on('chat_message', async (data) => {
        try {
            await handleChatMessage(socket, data);
        } catch (error) {
            console.error('Message error:', error);
            socket.emit('message_error', { message: 'Failed to send message' });
        }
    });

    socket.on('agent_status', (data) => handleAgentStatus(socket, data));
    socket.on('end_chat', (data) => handleEndChat(socket, data));
    
    socket.on('disconnect', () => {
        clearInterval(heartbeat);
        handleDisconnection(socket);
    });
});

// Authentication handler
function handleAuth(socket, data) {
    const id = uuidv4();
    socket.id = id;

    if (data.role === 'agent') {
        agents.set(id, {
            socket,
            status: 'online',
            activeChats: new Set()
        });
        console.log('Agent connected:', id);
        socket.emit('auth_success', { id });
    } else {
        customers.set(id, {
            socket,
            language: data.language || 'en'
        });
        console.log('Customer connected:', id);
        socket.emit('auth_success', { id });
        createNewChat(id);
    }
}

// Create new chat
function createNewChat(customerId) {
    const chatId = uuidv4();
    const chat = {
        id: chatId,
        customerId,
        agentId: null,
        messages: [],
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    
    chats.set(chatId, chat);
    chatQueue.push(chatId);
    
    const customer = customers.get(customerId);
    if (customer && customer.socket) {
        customer.socket.emit('chat_created', { chatId });
    }
    
    assignChatToAgent(chatId);
}

// Assign chat to available agent
function assignChatToAgent(chatId) {
    const chat = chats.get(chatId);
    if (!chat || chat.agentId) return;

    // Find available agent
    let availableAgent = null;
    for (const [agentId, agent] of agents) {
        if (agent.status === 'online' && agent.activeChats.size < 3) {
            availableAgent = agent;
            break;
        }
    }

    if (availableAgent) {
        chat.agentId = availableAgent.socket.id;
        chat.status = 'active';
        availableAgent.activeChats.add(chatId);

        // Notify customer and agent
        const customer = customers.get(chat.customerId);
        if (customer && customer.socket) {
            customer.socket.emit('chat_assigned', { chatId });
        }

        availableAgent.socket.emit('chat_assigned', {
            chatId,
            customerId: chat.customerId
        });

        // Remove from queue
        const queueIndex = chatQueue.indexOf(chatId);
        if (queueIndex > -1) {
            chatQueue.splice(queueIndex, 1);
        }
    }
}

// Improved chat message handling with typing indicators
async function handleChatMessage(socket, data) {
    const { chatId, message, isTyping } = data;
    const chat = chats.get(chatId);
    
    if (!chat) {
        throw new Error('Chat not found');
    }

    if (isTyping !== undefined) {
        // Handle typing indicator
        io.to(chatId).emit('typing_status', {
            chatId,
            userId: socket.id,
            isTyping
        });
        return;
    }

    const messageObj = {
        id: uuidv4(),
        sender: socket.id,
        content: message,
        timestamp: new Date().toISOString()
    };

    chat.messages.push(messageObj);
    io.to(chatId).emit('chat_message', messageObj);

    // Store message in database
    try {
        await storeMessage(messageObj, chatId);
    } catch (error) {
        console.error('Failed to store message:', error);
    }
}

// Handle agent status changes
function handleAgentStatus(socket, data) {
    const agent = agents.get(socket.id);
    if (!agent) return;

    agent.status = data.status;
    io.emit('agent_status_update', {
        agentId: socket.id,
        status: data.status
    });
}

// Handle chat ending
function handleEndChat(socket, data) {
    const chat = chats.get(data.chatId);
    if (!chat) return;

    chat.status = 'ended';
    
    // Notify participants
    const customer = customers.get(chat.customerId);
    const agent = agents.get(chat.agentId);

    if (customer && customer.socket) {
        customer.socket.emit('chat_ended', { chatId: data.chatId });
    }

    if (agent) {
        agent.activeChats.delete(data.chatId);
        if (agent.socket) {
            agent.socket.emit('chat_ended', { chatId: data.chatId });
        }
    }
}

// Handle disconnections
function handleDisconnection(socket) {
    // Check if customer
    if (customers.has(socket.id)) {
        const customer = customers.get(socket.id);
        customers.delete(socket.id);

        // End any active chats
        for (const [chatId, chat] of chats) {
            if (chat.customerId === socket.id) {
                handleEndChat(socket, { chatId });
            }
        }
    }

    // Check if agent
    if (agents.has(socket.id)) {
        const agent = agents.get(socket.id);
        agents.delete(socket.id);

        // Reassign active chats
        for (const chatId of agent.activeChats) {
            const chat = chats.get(chatId);
            if (chat) {
                chat.agentId = null;
                chat.status = 'pending';
                chatQueue.push(chatId);
                assignChatToAgent(chatId);
            }
        }
    }
}

// Content Management API endpoints
app.get('/api/content', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        const content = fs.readFileSync(indexPath, 'utf8');
        
        // Parse HTML content
        const parsedContent = parseIndexHtml(content);
        res.json(parsedContent);
    } catch (error) {
        console.error('Error reading content:', error);
        res.status(500).json({ error: 'Failed to read content' });
    }
});

app.post('/api/content', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        const content = req.body;
        
        // Update index.html with new content
        const updatedHtml = generateUpdatedHtml(content);
        fs.writeFileSync(indexPath, updatedHtml);
        
        // Create backup
        const backupPath = path.join(__dirname, 'backups', `index_${Date.now()}.html`);
        fs.writeFileSync(backupPath, updatedHtml);
        
        res.json({ message: 'Content updated successfully' });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Helper functions for content management
function parseIndexHtml(html) {
    // Extract content from index.html
    // This is a simple implementation - you might want to use a proper HTML parser
    return {
        title: extractContent(html, '<title>', '</title>'),
        promoBanner: extractContent(html, '<div class="promo-banner">', '</div>'),
        quickLinks: extractQuickLinks(html),
        licenseText: extractContent(html, '<div class="license-text">', '</div>'),
        copyrightText: extractContent(html, '<div class="copyright">', '</div>'),
        footerLinks: extractFooterLinks(html)
    };
}

function extractContent(html, startTag, endTag) {
    const startIndex = html.indexOf(startTag) + startTag.length;
    const endIndex = html.indexOf(endTag, startIndex);
    return html.substring(startIndex, endIndex).trim();
}

function extractQuickLinks(html) {
    const links = [];
    const regex = /<button class="quick-link" data-query="([^"]+)">([^<]+)<\/button>/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        links.push({
            query: match[1],
            text: match[2]
        });
    }
    
    return links;
}

function extractFooterLinks(html) {
    const links = [];
    const regex = /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        links.push({
            url: match[1],
            text: match[2]
        });
    }
    
    return links;
}

function generateUpdatedHtml(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/chat-widget.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body class="dark-theme">
    <div class="site-header">
        <div class="promo-banner">
            ${content.promoBanner}
        </div>
        <!-- Rest of the header content -->
    </div>

    <div class="quick-links">
        ${content.quickLinks.map(link => `
            <button class="quick-link" data-query="${link.query}">${link.text}</button>
        `).join('')}
    </div>

    <!-- Chat widget and main content remain unchanged -->
    ${getChatWidgetHtml()}

    <footer class="footer">
        <div class="footer-content">
            <div class="license-text">${content.licenseText}</div>
            <div class="footer-links">
                ${content.footerLinks.map(link => `
                    <a href="${link.url}">${link.text}</a>
                `).join('')}
            </div>
            <div class="copyright">${content.copyrightText}</div>
        </div>
    </footer>

    <script src="js/translations.js"></script>
    <script src="js/chat-widget.js"></script>
</body>
</html>`;
}

function getChatWidgetHtml() {
    return `
    <div id="chatWidget" class="chat-widget">
        <!-- Chat widget HTML structure -->
        <!-- This function should return the complete chat widget HTML -->
    </div>`;
}

// User Management API endpoints
app.get('/api/users', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const users = [
            {
                id: '1',
                username: 'admin',
                email: 'admin@18kchat.com',
                role: 'admin',
                status: 'active',
                lastLogin: new Date()
            },
            // Add more sample users
        ];
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/users/:id', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const user = {
            id: req.params.id,
            username: 'admin',
            email: 'admin@18kchat.com',
            role: 'admin',
            status: 'active'
        };
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.post('/api/users', (req, res) => {
    try {
        // In a real application, this would save to a database
        res.json({ message: 'User saved successfully' });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: 'Failed to save user' });
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        // In a real application, this would delete from a database
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Chatbot Management API endpoints
app.get('/api/chatbot/templates', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const templates = [
            {
                id: '1',
                name: 'Welcome Message',
                category: 'greeting',
                content: 'Welcome to 18KChat! How can I assist you today?'
            },
            // Add more sample templates
        ];
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

app.get('/api/chatbot/templates/:id', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const template = {
            id: req.params.id,
            name: 'Welcome Message',
            category: 'greeting',
            content: 'Welcome to 18KChat! How can I assist you today?'
        };
        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

app.post('/api/chatbot/templates', (req, res) => {
    try {
        // In a real application, this would save to a database
        res.json({ message: 'Template saved successfully' });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

app.delete('/api/chatbot/templates/:id', (req, res) => {
    try {
        // In a real application, this would delete from a database
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

app.get('/api/chatbot/responses', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const responses = {
            greetings: [
                {
                    id: '1',
                    content: 'Hello! Welcome to 18KChat support.'
                }
            ],
            common: [
                {
                    id: '2',
                    content: 'How can I help you today?'
                }
            ],
            support: [
                {
                    id: '3',
                    content: 'I understand your concern. Let me help you with that.'
                }
            ]
        };
        res.json(responses);
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

app.get('/api/chatbot/settings', (req, res) => {
    try {
        // In a real application, this would fetch from a database
        const settings = {
            enableTypingIndicator: true,
            typingDelay: 1000,
            enableAutoResponse: true,
            responseDelay: 1500,
            enableSmartRouting: true
        };
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.post('/api/chatbot/settings', (req, res) => {
    try {
        // In a real application, this would save to a database
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Admin routes
app.get('/api/admin/stats', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [totalUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
        const [activeUsers] = await connection.query('SELECT COUNT(*) as count FROM user_sessions WHERE logged_out_at IS NULL');
        const [totalMessages] = await connection.query('SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = CURDATE()');
        const [activeRooms] = await connection.query('SELECT COUNT(DISTINCT room_id) as count FROM chat_sessions WHERE ended_at IS NULL');
        
        connection.release();
        
        res.json({
            status: 'healthy',
            domain: DOMAIN,
            uptime: Date.now() - startTime,
            activeConnections,
            totalConnections,
            memoryUsage: process.memoryUsage(),
            dns: {
                a_record: dnsConfig.records.a_record,
                nameservers: dnsConfig.records.nameservers
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/recent-users', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(`
            SELECT 
                u.username,
                u.created_at as joined,
                EXISTS(
                    SELECT 1 FROM user_sessions us 
                    WHERE us.user_id = u.id 
                    AND us.logged_out_at IS NULL
                ) as online
            FROM users u
            ORDER BY u.created_at DESC
            LIMIT 10
        `);
        
        connection.release();
        
        res.json({ users });
    } catch (error) {
        console.error('Error fetching recent users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/active-rooms', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rooms] = await connection.query(`
            SELECT 
                cr.name,
                COUNT(DISTINCT cs.user_id) as users,
                COUNT(m.id) as messages
            FROM chat_rooms cr
            LEFT JOIN chat_sessions cs ON cs.room_id = cr.id AND cs.ended_at IS NULL
            LEFT JOIN messages m ON m.room_id = cr.id
            WHERE cs.id IS NOT NULL
            GROUP BY cr.id
            ORDER BY users DESC
            LIMIT 10
        `);
        
        connection.release();
        
        res.json({ rooms });
    } catch (error) {
        console.error('Error fetching active rooms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            code: err.code || 'INTERNAL_ERROR'
        }
    });
});

// Performance monitoring
const startTime = Date.now();
let totalConnections = 0;
let activeConnections = 0;

io.on('connection', (socket) => {
    totalConnections++;
    activeConnections++;
    
    // Monitor connection metrics
    console.log(`New connection - Active: ${activeConnections}, Total: ${totalConnections}`);
    
    socket.on('disconnect', () => {
        activeConnections--;
        console.log(`Connection closed - Active: ${activeConnections}`);
    });

    // Memory usage monitoring
    const used = process.memoryUsage();
    console.log(`Memory usage - RSS: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
});

// Initialize database connections
async function initializeDatabase() {
    try {
        await db.connectMongo();
        await db.connectRedis();
    } catch (error) {
        console.error('Failed to initialize database connections:', error);
        process.exit(1);
    }
}

// Initialize database before starting server
initializeDatabase().then(() => {
    // Start HTTP server
    const PORT = process.env.PORT || 8080;
    const HOST = '0.0.0.0'; // Listen on all network interfaces
    
    server.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
        console.log('Available on your network at:');
        console.log(`- Local: http://localhost:${PORT}`);
        console.log(`- Network: http://${dnsConfig.records.a_record.value}:${PORT}`);
    });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await db.healthCheck();
        const uptime = Date.now() - startTime;
        
        res.json({
            status: 'healthy',
            uptime,
            connections: {
                active: activeConnections,
                total: totalConnections
            },
            database: dbHealth,
            memory: process.memoryUsage()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Starting graceful shutdown...');
    
    // Close HTTP server
    server.close(() => {
        console.log('HTTP server closed.');
    });
    
    // Disconnect database connections
    try {
        await db.disconnect();
        console.log('Database connections closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// SSL/TLS configuration (for HTTPS)
if (process.env.NODE_ENV === 'production') {
    const https = require('https');
    const fs = require('fs');
    
    const sslOptions = {
        key: fs.readFileSync('/etc/ssl/private/18kchat.key'),
        cert: fs.readFileSync('/etc/ssl/certs/18kchat.crt'),
        ca: fs.readFileSync('/etc/ssl/certs/chain.crt')
    };
    
    const httpsServer = https.createServer(sslOptions, app);
    const httpsIo = new Server(httpsServer);
    
    // Redirect HTTP to HTTPS
    app.use((req, res, next) => {
        if (!req.secure) {
            return res.redirect(`https://${req.headers.host}${req.url}`);
        }
        next();
    });
    
    httpsServer.listen(443, () => {
        console.log(`HTTPS Server running on port 443`);
    });
}

// Security headers for domain
app.use((req, res, next) => {
    // HSTS (HTTP Strict Transport Security)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', `
        default-src 'self' ${ALLOWED_ORIGINS.join(' ')};
        img-src 'self' data: https:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
        connect-src 'self' wss://${DOMAIN} ${ALLOWED_ORIGINS.join(' ')};
    `.replace(/\s+/g, ' ').trim());
    
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    const uptime = Date.now() - startTime;
    res.json({
        status: 'healthy',
        domain: DOMAIN,
        uptime: uptime,
        activeConnections,
        totalConnections,
        memoryUsage: process.memoryUsage(),
        dns: {
            a_record: dnsConfig.records.a_record,
            nameservers: dnsConfig.records.nameservers
        }
    });
});
