const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        enum: ['agent', 'customer', 'system']
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

const chatSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true
    },
    customerName: String,
    customerEmail: String,
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'closed'],
        default: 'pending'
    },
    language: {
        type: String,
        enum: ['en', 'my', 'th'],
        default: 'en'
    },
    messages: [messageSchema],
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    rating: {
        score: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String
    }
}, {
    timestamps: true
});

// Index for searching
chatSchema.index({ customerId: 1, status: 1 });
chatSchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Chat', chatSchema);
