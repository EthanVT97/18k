// Chatbot Management JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    const templateModal = document.getElementById('templateModal');
    const templateForm = document.getElementById('templateForm');
    const templateSearch = document.getElementById('templateSearch');
    const templatesList = document.getElementById('templatesList');
    const addResponseBtns = document.querySelectorAll('.add-response');

    // Chatbot behavior elements
    const enableTypingIndicator = document.getElementById('enableTypingIndicator');
    const typingDelay = document.getElementById('typingDelay');
    const enableAutoResponse = document.getElementById('enableAutoResponse');
    const responseDelay = document.getElementById('responseDelay');
    const enableSmartRouting = document.getElementById('enableSmartRouting');

    // Event Listeners
    addTemplateBtn.addEventListener('click', () => openTemplateModal());
    templateForm.addEventListener('submit', handleTemplateSubmit);
    templateSearch.addEventListener('input', filterTemplates);
    addResponseBtns.forEach(btn => {
        btn.addEventListener('click', () => addResponse(btn.dataset.category));
    });

    // Load initial data
    loadTemplates();
    loadResponses();
    loadBehaviorSettings();

    // Functions
    async function loadTemplates() {
        try {
            const response = await fetch('/api/chatbot/templates');
            const templates = await response.json();
            renderTemplates(templates);
        } catch (error) {
            console.error('Error loading templates:', error);
            showNotification('Error loading templates', 'error');
        }
    }

    async function loadResponses() {
        try {
            const response = await fetch('/api/chatbot/responses');
            const responses = await response.json();
            
            // Render responses by category
            renderResponses('greeting', responses.greetings);
            renderResponses('common', responses.common);
            renderResponses('support', responses.support);
        } catch (error) {
            console.error('Error loading responses:', error);
            showNotification('Error loading responses', 'error');
        }
    }

    async function loadBehaviorSettings() {
        try {
            const response = await fetch('/api/chatbot/settings');
            const settings = await response.json();
            
            // Apply settings to form
            enableTypingIndicator.checked = settings.enableTypingIndicator;
            typingDelay.value = settings.typingDelay;
            enableAutoResponse.checked = settings.enableAutoResponse;
            responseDelay.value = settings.responseDelay;
            enableSmartRouting.checked = settings.enableSmartRouting;
            
            // Add event listeners for settings changes
            [enableTypingIndicator, typingDelay, enableAutoResponse, 
             responseDelay, enableSmartRouting].forEach(element => {
                element.addEventListener('change', saveBehaviorSettings);
            });
        } catch (error) {
            console.error('Error loading behavior settings:', error);
            showNotification('Error loading settings', 'error');
        }
    }

    function renderTemplates(templates) {
        templatesList.innerHTML = '';
        templates.forEach(template => {
            const templateElement = document.createElement('div');
            templateElement.className = 'template-item';
            templateElement.innerHTML = `
                <div class="template-header">
                    <h4>${template.name}</h4>
                    <span class="badge ${template.category}">${template.category}</span>
                </div>
                <div class="template-content">
                    <p>${template.content}</p>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small btn-secondary" onclick="editTemplate('${template.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteTemplate('${template.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            templatesList.appendChild(templateElement);
        });
    }

    function renderResponses(category, responses) {
        const container = document.getElementById(`${category}Responses`);
        container.innerHTML = '';
        
        responses.forEach(response => {
            const responseElement = document.createElement('div');
            responseElement.className = 'response-item';
            responseElement.innerHTML = `
                <p>${response.content}</p>
                <div class="response-actions">
                    <button class="btn btn-small btn-secondary" onclick="editResponse('${response.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteResponse('${response.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(responseElement);
        });
    }

    function openTemplateModal(templateId = null) {
        const modalTitle = document.getElementById('templateModalTitle');
        modalTitle.textContent = templateId ? 'Edit Template' : 'Add Response Template';
        
        if (templateId) {
            loadTemplateData(templateId);
        } else {
            templateForm.reset();
        }
        
        templateModal.classList.add('active');
    }

    async function loadTemplateData(templateId) {
        try {
            const response = await fetch(`/api/chatbot/templates/${templateId}`);
            const template = await response.json();
            
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateCategory').value = template.category;
            document.getElementById('templateContent').value = template.content;
        } catch (error) {
            console.error('Error loading template:', error);
            showNotification('Error loading template', 'error');
        }
    }

    async function handleTemplateSubmit(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('templateName').value,
            category: document.getElementById('templateCategory').value,
            content: document.getElementById('templateContent').value
        };

        try {
            const response = await fetch('/api/chatbot/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                closeTemplateModal();
                loadTemplates();
                showNotification('Template saved successfully', 'success');
            } else {
                throw new Error('Failed to save template');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            showNotification('Error saving template', 'error');
        }
    }

    async function saveBehaviorSettings() {
        const settings = {
            enableTypingIndicator: enableTypingIndicator.checked,
            typingDelay: parseInt(typingDelay.value),
            enableAutoResponse: enableAutoResponse.checked,
            responseDelay: parseInt(responseDelay.value),
            enableSmartRouting: enableSmartRouting.checked
        };

        try {
            const response = await fetch('/api/chatbot/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                showNotification('Settings saved successfully', 'success');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Error saving settings', 'error');
        }
    }

    function filterTemplates() {
        const searchTerm = templateSearch.value.toLowerCase();
        const templates = templatesList.getElementsByClassName('template-item');
        
        Array.from(templates).forEach(template => {
            const name = template.querySelector('h4').textContent.toLowerCase();
            const content = template.querySelector('p').textContent.toLowerCase();
            
            template.style.display = name.includes(searchTerm) || 
                                   content.includes(searchTerm) ? '' : 'none';
        });
    }

    function closeTemplateModal() {
        templateModal.classList.remove('active');
        templateForm.reset();
    }

    // Helper Functions
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Make functions available globally
    window.editTemplate = openTemplateModal;
    window.deleteTemplate = async (templateId) => {
        if (confirm('Are you sure you want to delete this template?')) {
            try {
                const response = await fetch(`/api/chatbot/templates/${templateId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    loadTemplates();
                    showNotification('Template deleted successfully', 'success');
                } else {
                    throw new Error('Failed to delete template');
                }
            } catch (error) {
                console.error('Error deleting template:', error);
                showNotification('Error deleting template', 'error');
            }
        }
    };
    window.closeTemplateModal = closeTemplateModal;
});
