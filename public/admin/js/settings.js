// Settings Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize settings
    initializeSettings();

    // Add event listeners
    addEventListeners();

    // Load initial settings
    loadSettings();
});

function initializeSettings() {
    // Initialize any third-party components
    initializeTooltips();
}

function addEventListeners() {
    // Settings tab navigation
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            settingsTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all settings sections
            const sections = document.querySelectorAll('.settings-section');
            sections.forEach(s => s.classList.remove('active'));

            // Show selected section
            const targetSection = document.getElementById(`${tab.dataset.settings}-settings`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Save all button
    const saveAllBtn = document.querySelector('.save-all-btn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllSettings);
    }

    // Form change detection
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('change', () => {
            markFormAsChanged(form);
        });
    });

    // Payment method toggles
    const paymentToggles = document.querySelectorAll('.payment-method .switch input');
    paymentToggles.forEach(toggle => {
        toggle.addEventListener('change', handlePaymentMethodToggle);
    });

    // Integration toggles
    const integrationToggles = document.querySelectorAll('.integration-item .switch input');
    integrationToggles.forEach(toggle => {
        toggle.addEventListener('change', handleIntegrationToggle);
    });

    // Maintenance mode toggle
    const maintenanceToggle = document.querySelector('input[name="maintenanceMode"]');
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener('change', handleMaintenanceToggle);
    }
}

function loadSettings() {
    // Show loading state
    showLoading();

    // Simulated API call
    setTimeout(() => {
        // Load settings from API
        const settings = {
            general: {
                siteName: '7Dragon Casino',
                siteDescription: 'The best online casino experience',
                supportEmail: 'support@7dragon.com',
                contactPhone: '+1 234 567 8900',
                defaultLanguage: 'en',
                defaultCurrency: 'USD',
                timezone: 'UTC'
            },
            security: {
                twoFactorAuth: true,
                sessionTimeout: 30,
                maxLoginAttempts: 5,
                minPasswordLength: 8,
                requireSpecialChar: true,
                requireNumbers: true,
                passwordExpiry: 90,
                blockVPN: true
            },
            payments: {
                methods: [
                    {
                        name: 'Credit Card',
                        enabled: true,
                        fee: 2.5
                    },
                    // Add more payment methods...
                ],
                limits: {
                    minWithdrawal: 10,
                    maxWithdrawal: 10000,
                    dailyWithdrawalLimit: 50000
                },
                kyc: {
                    required: true,
                    threshold: 2000
                }
            },
            notifications: {
                email: {
                    newUser: true,
                    withdrawal: true,
                    largeDeposit: true,
                    largeDepositThreshold: 10000
                },
                system: {
                    errors: true,
                    security: true,
                    maintenance: true
                },
                recipients: {
                    primary: 'admin@7dragon.com',
                    secondary: ''
                }
            },
            integrations: {
                providers: [
                    {
                        name: 'Provider 1',
                        enabled: true,
                        apiKey: '****',
                        apiSecret: '****'
                    },
                    // Add more providers...
                ],
                analytics: {
                    googleAnalyticsId: '',
                    facebookPixelId: ''
                },
                chat: {
                    provider: 'intercom',
                    widgetId: ''
                }
            },
            maintenance: {
                enabled: false,
                message: 'We are currently performing scheduled maintenance. Please check back later.',
                allowedIPs: [],
                backup: {
                    enabled: true,
                    frequency: 'daily',
                    retention: 30
                },
                cleanup: {
                    enabled: true,
                    logRetention: 90,
                    tempFileRetention: 7
                }
            }
        };

        // Populate forms with settings
        populateSettings(settings);

        // Hide loading state
        hideLoading();
    }, 1000);
}

function populateSettings(settings) {
    // Populate General Settings
    populateGeneralSettings(settings.general);
    
    // Populate Security Settings
    populateSecuritySettings(settings.security);
    
    // Populate Payment Settings
    populatePaymentSettings(settings.payments);
    
    // Populate Notification Settings
    populateNotificationSettings(settings.notifications);
    
    // Populate Integration Settings
    populateIntegrationSettings(settings.integrations);
    
    // Populate Maintenance Settings
    populateMaintenanceSettings(settings.maintenance);
}

function populateGeneralSettings(settings) {
    const form = document.getElementById('generalSettingsForm');
    if (!form) return;

    for (const [key, value] of Object.entries(settings)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = value;
        }
    }
}

function populateSecuritySettings(settings) {
    const form = document.getElementById('securitySettingsForm');
    if (!form) return;

    for (const [key, value] of Object.entries(settings)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else {
                input.value = value;
            }
        }
    }
}

function populatePaymentSettings(settings) {
    // Populate payment methods
    const methodsContainer = document.querySelector('.payment-methods');
    if (methodsContainer && settings.methods) {
        settings.methods.forEach(method => {
            const toggle = methodsContainer.querySelector(`[data-method="${method.name}"] .switch input`);
            if (toggle) {
                toggle.checked = method.enabled;
            }
            const feeInput = methodsContainer.querySelector(`[data-method="${method.name}"] input[name="fee"]`);
            if (feeInput) {
                feeInput.value = method.fee;
            }
        });
    }

    // Populate limits
    const limitsForm = document.getElementById('paymentSettingsForm');
    if (limitsForm && settings.limits) {
        for (const [key, value] of Object.entries(settings.limits)) {
            const input = limitsForm.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }
    }
}

function populateNotificationSettings(settings) {
    const form = document.getElementById('notificationSettingsForm');
    if (!form) return;

    // Populate email notifications
    for (const [key, value] of Object.entries(settings.email)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else {
                input.value = value;
            }
        }
    }

    // Populate system notifications
    for (const [key, value] of Object.entries(settings.system)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.checked = value;
        }
    }

    // Populate recipients
    for (const [key, value] of Object.entries(settings.recipients)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = value;
        }
    }
}

function populateIntegrationSettings(settings) {
    // Populate providers
    const providersContainer = document.querySelector('.integration-list');
    if (providersContainer && settings.providers) {
        settings.providers.forEach(provider => {
            const toggle = providersContainer.querySelector(`[data-provider="${provider.name}"] .switch input`);
            if (toggle) {
                toggle.checked = provider.enabled;
            }
        });
    }

    // Populate analytics
    const form = document.getElementById('integrationSettingsForm');
    if (form && settings.analytics) {
        for (const [key, value] of Object.entries(settings.analytics)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }
    }
}

function populateMaintenanceSettings(settings) {
    const form = document.getElementById('maintenanceSettingsForm');
    if (!form) return;

    // Populate maintenance mode settings
    const maintenanceToggle = form.querySelector('input[name="maintenanceMode"]');
    if (maintenanceToggle) {
        maintenanceToggle.checked = settings.enabled;
    }

    const messageInput = form.querySelector('textarea[name="maintenanceMessage"]');
    if (messageInput) {
        messageInput.value = settings.message;
    }

    const allowedIPsInput = form.querySelector('textarea[name="maintenanceAllowedIPs"]');
    if (allowedIPsInput) {
        allowedIPsInput.value = settings.allowedIPs.join('\n');
    }

    // Populate backup settings
    const backupToggle = form.querySelector('input[name="autoBackup"]');
    if (backupToggle) {
        backupToggle.checked = settings.backup.enabled;
    }

    const backupFrequency = form.querySelector('select[name="backupFrequency"]');
    if (backupFrequency) {
        backupFrequency.value = settings.backup.frequency;
    }

    const backupRetention = form.querySelector('input[name="backupRetention"]');
    if (backupRetention) {
        backupRetention.value = settings.backup.retention;
    }
}

function saveAllSettings() {
    // Show loading state
    showLoading();

    // Collect all form data
    const forms = document.querySelectorAll('form');
    const settings = {};

    forms.forEach(form => {
        const formData = new FormData(form);
        const formId = form.id.replace('SettingsForm', '');
        settings[formId] = Object.fromEntries(formData.entries());
    });

    // Validate settings
    if (!validateSettings(settings)) {
        hideLoading();
        return;
    }

    // Save settings
    saveSettings(settings)
        .then(() => {
            showSuccess('Settings saved successfully');
            clearFormChangedState();
        })
        .catch(error => {
            showError('Failed to save settings: ' + error.message);
        })
        .finally(() => {
            hideLoading();
        });
}

function validateSettings(settings) {
    // Add validation logic
    return true;
}

function saveSettings(settings) {
    // Simulated API call
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('Saving settings:', settings);
            resolve();
        }, 1000);
    });
}

function handlePaymentMethodToggle(event) {
    const method = event.target.closest('.payment-method');
    const methodSettings = method.querySelector('.method-settings');
    if (methodSettings) {
        methodSettings.style.display = event.target.checked ? 'block' : 'none';
    }
}

function handleIntegrationToggle(event) {
    const integration = event.target.closest('.integration-item');
    const integrationSettings = integration.querySelector('.integration-settings');
    if (integrationSettings) {
        integrationSettings.style.display = event.target.checked ? 'block' : 'none';
    }
}

function handleMaintenanceToggle(event) {
    const maintenanceSettings = document.querySelectorAll('#maintenance-settings .form-group:not(:first-child)');
    maintenanceSettings.forEach(setting => {
        setting.style.display = event.target.checked ? 'block' : 'none';
    });
}

function markFormAsChanged(form) {
    form.classList.add('form-changed');
    // Show save indicator
    const saveBtn = document.querySelector('.save-all-btn');
    if (saveBtn) {
        saveBtn.classList.add('changes-pending');
    }
}

function clearFormChangedState() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.classList.remove('form-changed');
    });
    
    const saveBtn = document.querySelector('.save-all-btn');
    if (saveBtn) {
        saveBtn.classList.remove('changes-pending');
    }
}

// Utility Functions
function showLoading() {
    // Implement loading state
}

function hideLoading() {
    // Implement loading state removal
}

function showSuccess(message) {
    // Implement success message display
    alert(message);
}

function showError(message) {
    // Implement error message display
    alert(message);
}

// Initialize tooltips, if using a tooltip library
function initializeTooltips() {
    // Implement tooltip initialization
}
