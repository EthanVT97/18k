const chatService = require('./chat.service');
const agentService = require('./agent.service');
const chatbotService = require('./chatbot.service');
const userService = require('./user.service');

class SocketService {
    constructor(io) {
        this.io = io;
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Authentication
            socket.on('authenticate', async (data) => {
                try {
                    const auth = await userService.authenticate(data.email, data.password);
                    socket.user = auth.user;
                    socket.join(`user:${auth.user.id}`);
                    
                    if (auth.user.role === 'agent') {
                        socket.join('agents');
                    }
                    
                    socket.emit('authenticated', { user: auth.user });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Start new chat
            socket.on('start_chat', async (data) => {
                try {
                    const sessionId = await chatService.createChatSession(socket.user.id, data.metadata);
                    socket.join(`chat:${sessionId}`);
                    
                    // Try chatbot first
                    const botResponse = await chatbotService.getResponse(data.message);
                    socket.emit('message', {
                        sessionId,
                        message: botResponse.response,
                        sender: 'bot'
                    });

                    // If chatbot can't handle it, find available agent
                    if (botResponse.category === 'default') {
                        const availableAgents = await agentService.getAvailableAgents();
                        if (availableAgents.length > 0) {
                            const agentId = availableAgents[0];
                            await chatService.assignAgent(sessionId, agentId);
                            this.io.to(`user:${agentId}`).emit('chat_assigned', {
                                sessionId,
                                user: socket.user
                            });
                        } else {
                            socket.emit('message', {
                                sessionId,
                                message: 'All our agents are currently busy. Please wait.',
                                sender: 'system'
                            });
                        }
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Send message
            socket.on('message', async (data) => {
                try {
                    const messageId = await chatService.storeMessage(data.sessionId, {
                        sender: socket.user.id,
                        content: data.message
                    });

                    this.io.to(`chat:${data.sessionId}`).emit('message', {
                        id: messageId,
                        sessionId: data.sessionId,
                        message: data.message,
                        sender: socket.user.id,
                        timestamp: new Date()
                    });

                    // If message is from user, get chatbot response
                    if (socket.user.role === 'user') {
                        const botResponse = await chatbotService.getResponse(data.message);
                        if (botResponse.category !== 'default') {
                            const botMessageId = await chatService.storeMessage(data.sessionId, {
                                sender: 'bot',
                                content: botResponse.response
                            });

                            socket.emit('message', {
                                id: botMessageId,
                                sessionId: data.sessionId,
                                message: botResponse.response,
                                sender: 'bot',
                                timestamp: new Date()
                            });
                        }
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Typing indicator
            socket.on('typing', (data) => {
                socket.to(`chat:${data.sessionId}`).emit('typing', {
                    sessionId: data.sessionId,
                    user: socket.user.id,
                    isTyping: data.isTyping
                });
            });

            // End chat
            socket.on('end_chat', async (data) => {
                try {
                    const session = await chatService.endChatSession(data.sessionId);
                    
                    if (session.agentId) {
                        await agentService.removeChat(session.agentId, data.sessionId);
                    }

                    this.io.to(`chat:${data.sessionId}`).emit('chat_ended', {
                        sessionId: data.sessionId,
                        endedBy: socket.user.id
                    });

                    // Leave the chat room
                    const room = this.io.sockets.adapter.rooms.get(`chat:${data.sessionId}`);
                    if (room) {
                        room.forEach((socketId) => {
                            this.io.sockets.sockets.get(socketId).leave(`chat:${data.sessionId}`);
                        });
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Agent status change
            socket.on('agent_status', async (data) => {
                try {
                    if (socket.user.role !== 'agent') {
                        throw new Error('Only agents can update their status');
                    }

                    await agentService.setAgentStatus(socket.user.id, data.status);
                    this.io.to('agents').emit('agent_status_changed', {
                        agentId: socket.user.id,
                        status: data.status
                    });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Disconnect
            socket.on('disconnect', async () => {
                console.log(`Client disconnected: ${socket.id}`);
                
                if (socket.user && socket.user.role === 'agent') {
                    await agentService.setAgentStatus(socket.user.id, 'offline');
                    this.io.to('agents').emit('agent_status_changed', {
                        agentId: socket.user.id,
                        status: 'offline'
                    });
                }
            });
        });
    }
}

module.exports = SocketService;
