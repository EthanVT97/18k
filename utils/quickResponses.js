const quickResponses = {
    en: {
        greeting: [
            {
                text: "Hello! Welcome to 18KChat support. How can I assist you today?",
                tags: ['welcome', 'initial']
            },
            {
                text: "Good morning! How may I help you?",
                tags: ['morning', 'welcome']
            },
            {
                text: "Good afternoon! What can I do for you today?",
                tags: ['afternoon', 'welcome']
            },
            {
                text: "Good evening! How can I be of assistance?",
                tags: ['evening', 'welcome']
            }
        ],
        farewell: [
            {
                text: "Thank you for chatting with us. Have a great day!",
                tags: ['end', 'positive']
            },
            {
                text: "Is there anything else you need help with?",
                tags: ['follow-up']
            },
            {
                text: "Thank you for your patience. Don't hesitate to contact us again if you need further assistance.",
                tags: ['end', 'follow-up']
            }
        ],
        support: [
            {
                text: "I understand your concern. Let me help you with that.",
                tags: ['empathy', 'understanding']
            },
            {
                text: "I'm looking into this for you. Please allow me a moment.",
                tags: ['waiting', 'processing']
            },
            {
                text: "Could you please provide more details about the issue?",
                tags: ['clarification', 'details']
            },
            {
                text: "Let me check our system for you.",
                tags: ['checking', 'system']
            }
        ],
        apology: [
            {
                text: "I apologize for any inconvenience this has caused.",
                tags: ['sorry', 'general']
            },
            {
                text: "I'm sorry for keeping you waiting.",
                tags: ['sorry', 'waiting']
            },
            {
                text: "I understand this is frustrating. Let me help resolve this for you.",
                tags: ['empathy', 'frustration']
            }
        ],
        confirmation: [
            {
                text: "I've updated your information in our system.",
                tags: ['update', 'complete']
            },
            {
                text: "Your request has been processed successfully.",
                tags: ['success', 'complete']
            },
            {
                text: "I've made a note of this in your account.",
                tags: ['note', 'update']
            }
        ],
        transfer: [
            {
                text: "I'll need to transfer you to a specialist who can better assist you with this matter.",
                tags: ['transfer', 'specialist']
            },
            {
                text: "Please allow me to connect you with our technical support team.",
                tags: ['transfer', 'technical']
            }
        ],
        technical_support: [
            {
                text: "Could you please try clearing your browser cache and cookies?",
                tags: ['troubleshooting', 'browser']
            },
            {
                text: "Let me guide you through the steps to resolve this technical issue.",
                tags: ['guidance', 'technical']
            },
            {
                text: "Could you please provide your browser version and operating system?",
                tags: ['information', 'system']
            }
        ],
        payment: [
            {
                text: "Your payment has been successfully processed.",
                tags: ['confirmation', 'payment']
            },
            {
                text: "I understand you're having issues with the payment. Let me help you resolve this.",
                tags: ['issue', 'payment']
            },
            {
                text: "For your security, please do not share your payment details in the chat.",
                tags: ['security', 'payment']
            }
        ],
        account: [
            {
                text: "I'll help you update your account information.",
                tags: ['update', 'account']
            },
            {
                text: "For security reasons, please verify your account details.",
                tags: ['verification', 'account']
            },
            {
                text: "Your account has been successfully updated.",
                tags: ['confirmation', 'account']
            }
        ],
        complaint: [
            {
                text: "I understand your frustration, and I'm here to help resolve this issue.",
                tags: ['empathy', 'complaint']
            },
            {
                text: "I apologize for this experience. Let me escalate this to our senior team.",
                tags: ['escalation', 'complaint']
            },
            {
                text: "We take your feedback seriously and will use it to improve our services.",
                tags: ['feedback', 'improvement']
            }
        ],
        product: [
            {
                text: "I'll be happy to explain the features of this product.",
                tags: ['information', 'product']
            },
            {
                text: "Let me check the current availability of this item.",
                tags: ['availability', 'product']
            },
            {
                text: "Would you like me to recommend similar products?",
                tags: ['recommendation', 'product']
            }
        ],
        shipping: [
            {
                text: "Your order has been shipped and will arrive within [X] business days.",
                tags: ['status', 'shipping']
            },
            {
                text: "Here's your tracking number: [Tracking Number]",
                tags: ['tracking', 'shipping']
            },
            {
                text: "I'll help you track your shipment.",
                tags: ['assistance', 'shipping']
            }
        ],
        refund: [
            {
                text: "I'll process your refund request right away.",
                tags: ['process', 'refund']
            },
            {
                text: "Your refund has been approved and will be processed within 3-5 business days.",
                tags: ['confirmation', 'refund']
            },
            {
                text: "Let me explain our refund policy.",
                tags: ['policy', 'refund']
            }
        ],
        promotion: [
            {
                text: "Let me tell you about our current promotions and offers.",
                tags: ['information', 'promotion']
            },
            {
                text: "Would you like me to apply this discount to your order?",
                tags: ['discount', 'promotion']
            },
            {
                text: "This promotional offer is valid until [Date].",
                tags: ['validity', 'promotion']
            }
        ],
        feedback: [
            {
                text: "Thank you for your valuable feedback.",
                tags: ['appreciation', 'feedback']
            },
            {
                text: "Would you mind taking a brief survey about your experience?",
                tags: ['survey', 'feedback']
            },
            {
                text: "Your feedback helps us improve our service.",
                tags: ['improvement', 'feedback']
            }
        ],
        emergency: [
            {
                text: "I understand this is an urgent situation. I'll help you immediately.",
                tags: ['urgent', 'priority']
            },
            {
                text: "Let me escalate this to our emergency response team right away.",
                tags: ['escalation', 'urgent']
            },
            {
                text: "Please stay connected while I prioritize your case.",
                tags: ['priority', 'wait']
            }
        ],
        maintenance: [
            {
                text: "We're currently performing scheduled maintenance. Services will resume at [Time].",
                tags: ['system', 'maintenance']
            },
            {
                text: "The system will be back online shortly. Thank you for your patience.",
                tags: ['system', 'wait']
            },
            {
                text: "This is a temporary interruption for essential updates.",
                tags: ['update', 'maintenance']
            }
        ],
        security_alert: [
            {
                text: "We've detected unusual activity on your account. Please verify your identity.",
                tags: ['security', 'verification']
            },
            {
                text: "For your security, we've temporarily locked your account.",
                tags: ['security', 'lock']
            },
            {
                text: "Please change your password immediately for security purposes.",
                tags: ['security', 'password']
            }
        ],
        vip_support: [
            {
                text: "Welcome to our VIP support service. How may I assist you today?",
                tags: ['vip', 'greeting']
            },
            {
                text: "As a valued VIP customer, you'll receive priority assistance.",
                tags: ['vip', 'priority']
            },
            {
                text: "I'll personally ensure your matter is resolved promptly.",
                tags: ['vip', 'assurance']
            }
        ],
        feedback_request: [
            {
                text: "Your opinion matters to us. Would you share your experience?",
                tags: ['feedback', 'request']
            },
            {
                text: "How would you rate your interaction with our service today?",
                tags: ['rating', 'feedback']
            },
            {
                text: "Your feedback helps us serve you better.",
                tags: ['feedback', 'improvement']
            }
        ]
    },
    my: {
        greeting: [
            {
                text: "မင်္ဂလာပါ။ 18KChat အကူအညီပေးရေးမှ ကြိုဆိုပါတယ်။ ဘယ်လိုကူညီပေးရမလဲ?",
                tags: ['welcome', 'initial']
            },
            {
                text: "မင်္ဂလာနံနက်ခင်းပါ။ ဘယ်လိုကူညီပေးရမလဲ?",
                tags: ['morning', 'welcome']
            }
        ],
        farewell: [
            {
                text: "ဆက်သွယ်ပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။ နေ့ရက်လေးကောင်းပါစေ။",
                tags: ['end', 'positive']
            },
            {
                text: "နောက်ထပ် ကူညီပေးစရာရှိပါသလား?",
                tags: ['follow-up']
            }
        ],
        support: [
            {
                text: "သင့်ရဲ့ အခက်အခဲကို နားလည်ပါတယ်။ ကူညီပေးပါ့မယ်။",
                tags: ['empathy', 'understanding']
            },
            {
                text: "စစ်ဆေးပေးနေပါတယ်။ ခဏလေး စောင့်ပေးပါ။",
                tags: ['waiting', 'processing']
            }
        ],
        apology: [
            {
                text: "အဆင်မပြေမှုအတွက် တောင်းပန်ပါတယ်။",
                tags: ['sorry', 'general']
            },
            {
                text: "စောင့်ဆိုင်းရတဲ့အတွက် တောင်းပန်ပါတယ်။",
                tags: ['sorry', 'waiting']
            }
        ],
        technical_support: [
            {
                text: "ကျေးဇူးပြု၍ browser cache နှင့် cookies များကို ရှင်းလင်းပေးပါ။",
                tags: ['troubleshooting', 'browser']
            },
            {
                text: "နည်းပညာဆိုင်ရာ ပြဿနာကို ဖြေရှင်းရန် လမ်းညွှန်ပေးပါမည်။",
                tags: ['guidance', 'technical']
            }
        ],
        payment: [
            {
                text: "သင့်ငွေပေးချေမှု အောင်မြင်ပါသည်။",
                tags: ['confirmation', 'payment']
            },
            {
                text: "လုံခြုံရေးအတွက် ငွေပေးချေမှုအသေးစိတ်ကို chat တွင် မျှဝေခြင်းမပြုပါနှင့်။",
                tags: ['security', 'payment']
            }
        ],
        security_alert: [
            {
                text: "သင့်အကောင့်တွင် ပုံမှန်မဟုတ်သော လှုပ်ရှားမှုကို တွေ့ရှိရပါသည်။",
                tags: ['security', 'alert']
            },
            {
                text: "လုံခြုံရေးအတွက် သင့်အကောင့်ကို ယာယီပိတ်ထားပါသည်။",
                tags: ['security', 'lock']
            }
        ]
    },
    th: {
        greeting: [
            {
                text: "สวัสดีค่ะ/ครับ ยินดีต้อนรับสู่ 18KChat support จะให้ช่วยอะไรดีคะ/ครับ?",
                tags: ['welcome', 'initial']
            },
            {
                text: "อรุณสวัสดิ์ค่ะ/ครับ จะให้ช่วยอะไรดีคะ/ครับ?",
                tags: ['morning', 'welcome']
            }
        ],
        farewell: [
            {
                text: "ขอบคุณที่ใช้บริการค่ะ/ครับ ขอให้เป็นวันที่ดีนะคะ/ครับ",
                tags: ['end', 'positive']
            },
            {
                text: "มีอะไรให้ช่วยเพิ่มเติมไหมคะ/ครับ?",
                tags: ['follow-up']
            }
        ],
        support: [
            {
                text: "เข้าใจปัญหาของคุณค่ะ/ครับ ขอช่วยนะคะ/ครับ",
                tags: ['empathy', 'understanding']
            },
            {
                text: "กำลังตรวจสอบให้ค่ะ/ครับ รอสักครู่นะคะ/ครับ",
                tags: ['waiting', 'processing']
            }
        ],
        apology: [
            {
                text: "ขออภัยในความไม่สะดวกค่ะ/ครับ",
                tags: ['sorry', 'general']
            },
            {
                text: "ขออภัยที่ให้รอค่ะ/ครับ",
                tags: ['sorry', 'waiting']
            }
        ],
        technical_support: [
            {
                text: "กรุณาล้างแคชและคุกกี้ของเบราว์เซอร์",
                tags: ['troubleshooting', 'browser']
            },
            {
                text: "ขอแนะนำขั้นตอนการแก้ไขปัญหาทางเทคนิคนี้",
                tags: ['guidance', 'technical']
            }
        ],
        payment: [
            {
                text: "การชำระเงินของคุณเสร็จสมบูรณ์แล้ว",
                tags: ['confirmation', 'payment']
            },
            {
                text: "เพื่อความปลอดภัย กรุณาอย่าแชร์ข้อมูลการชำระเงินในแชท",
                tags: ['security', 'payment']
            }
        ],
        security_alert: [
            {
                text: "เราตรวจพบกิจกรรมที่ผิดปกติในบัญชีของคุณ",
                tags: ['security', 'alert']
            },
            {
                text: "เพื่อความปลอดภัย เราได้ระงับบัญชีของคุณชั่วคราว",
                tags: ['security', 'lock']
            }
        ]
    },
    ko: {
        greeting: [
            {
                text: "안녕하세요. 18KChat 고객지원입니다. 어떻게 도와드릴까요?",
                tags: ['welcome', 'initial']
            }
        ],
        technical_support: [
            {
                text: "브라우저 캐시와 쿠키를 삭제해 주시겠습니까?",
                tags: ['troubleshooting', 'browser']
            },
            {
                text: "기술적인 문제 해결을 위해 안내해 드리겠습니다.",
                tags: ['guidance', 'technical']
            }
        ],
        payment: [
            {
                text: "결제가 성공적으로 처리되었습니다.",
                tags: ['confirmation', 'payment']
            },
            {
                text: "보안을 위해 채팅에서 결제 정보를 공유하지 마십시오.",
                tags: ['security', 'payment']
            }
        ],
        security_alert: [
            {
                text: "계정에서 비정상적인 활동이 감지되었습니다.",
                tags: ['security', 'alert']
            },
            {
                text: "보안을 위해 계정이 일시적으로 잠겼습니다.",
                tags: ['security', 'lock']
            }
        ]
    },
    vi: {
        greeting: [
            {
                text: "Xin chào. Chào mừng đến với hỗ trợ 18KChat. Tôi có thể giúp gì cho bạn?",
                tags: ['welcome', 'initial']
            }
        ],
        technical_support: [
            {
                text: "Vui lòng xóa bộ nhớ cache và cookie của trình duyệt.",
                tags: ['troubleshooting', 'browser']
            },
            {
                text: "Tôi sẽ hướng dẫn bạn các bước để giải quyết vấn đề kỹ thuật này.",
                tags: ['guidance', 'technical']
            }
        ],
        payment: [
            {
                text: "Thanh toán của bạn đã được xử lý thành công.",
                tags: ['confirmation', 'payment']
            },
            {
                text: "Vì lý do bảo mật, vui lòng không chia sẻ thông tin thanh toán trong chat.",
                tags: ['security', 'payment']
            }
        ],
        security_alert: [
            {
                text: "Chúng tôi phát hiện hoạt động bất thường trên tài khoản của bạn.",
                tags: ['security', 'alert']
            },
            {
                text: "Vì lý do bảo mật, tài khoản của bạn đã tạm thời bị khóa.",
                tags: ['security', 'lock']
            }
        ]
    }
};

// Get responses by language and category
exports.getResponses = (language, category) => {
    return quickResponses[language]?.[category] || [];
};

// Get responses by tag
exports.getResponsesByTag = (language, tag) => {
    const languageResponses = quickResponses[language];
    if (!languageResponses) return [];

    const responses = [];
    Object.values(languageResponses).forEach(category => {
        category.forEach(response => {
            if (response.tags.includes(tag)) {
                responses.push(response);
            }
        });
    });
    return responses;
};

// Get all responses for a language
exports.getAllResponses = (language) => {
    return quickResponses[language] || {};
};

// Get suggested responses based on context
exports.getSuggestedResponses = (language, context) => {
    const suggestions = [];
    const languageResponses = quickResponses[language];
    if (!languageResponses) return suggestions;

    // Context-based suggestions
    if (context.isFirstMessage) {
        suggestions.push(...(languageResponses.greeting || []));
    }
    if (context.isEndingConversation) {
        suggestions.push(...(languageResponses.farewell || []));
    }
    if (context.needsApology) {
        suggestions.push(...(languageResponses.apology || []));
    }
    if (context.isWaiting) {
        suggestions.push(...languageResponses.support.filter(r => 
            r.tags.includes('waiting')
        ));
    }

    return suggestions;
};

module.exports = {
    quickResponses,
    getResponses: exports.getResponses,
    getResponsesByTag: exports.getResponsesByTag,
    getAllResponses: exports.getAllResponses,
    getSuggestedResponses: exports.getSuggestedResponses
};
