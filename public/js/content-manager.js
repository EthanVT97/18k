// Content Management JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const saveContentBtn = document.getElementById('saveContent');
    const previewContentBtn = document.getElementById('previewContent');
    const revertContentBtn = document.getElementById('revertContent');
    const siteTitleInput = document.getElementById('siteTitle');
    const promoBannerText = document.getElementById('promoBannerText');
    const addQuickLinkBtn = document.getElementById('addQuickLink');
    const addFooterLinkBtn = document.getElementById('addFooterLink');
    const licenseText = document.getElementById('licenseText');
    const copyrightText = document.getElementById('copyrightText');

    // Load current content
    loadCurrentContent();

    // Event Listeners
    saveContentBtn.addEventListener('click', saveContent);
    previewContentBtn.addEventListener('click', previewContent);
    revertContentBtn.addEventListener('click', revertContent);
    addQuickLinkBtn.addEventListener('click', addQuickLink);
    addFooterLinkBtn.addEventListener('click', addFooterLink);

    // Load current content from index.html
    async function loadCurrentContent() {
        try {
            const response = await fetch('/api/content');
            const content = await response.json();
            
            // Populate form fields
            siteTitleInput.value = content.title;
            promoBannerText.value = content.promoBanner;
            licenseText.value = content.licenseText;
            copyrightText.value = content.copyrightText;

            // Load quick links
            content.quickLinks.forEach(link => {
                addQuickLink(link);
            });

            // Load footer links
            content.footerLinks.forEach(link => {
                addFooterLink(link);
            });
        } catch (error) {
            console.error('Error loading content:', error);
            showNotification('Error loading content', 'error');
        }
    }

    // Save content changes
    async function saveContent() {
        const content = {
            title: siteTitleInput.value,
            promoBanner: promoBannerText.value,
            quickLinks: getQuickLinks(),
            licenseText: licenseText.value,
            copyrightText: copyrightText.value,
            footerLinks: getFooterLinks()
        };

        try {
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(content)
            });

            if (response.ok) {
                showNotification('Content saved successfully', 'success');
            } else {
                throw new Error('Failed to save content');
            }
        } catch (error) {
            console.error('Error saving content:', error);
            showNotification('Error saving content', 'error');
        }
    }

    // Preview content changes
    function previewContent() {
        const previewWindow = window.open('', '_blank');
        const content = {
            title: siteTitleInput.value,
            promoBanner: promoBannerText.value,
            quickLinks: getQuickLinks(),
            licenseText: licenseText.value,
            copyrightText: copyrightText.value,
            footerLinks: getFooterLinks()
        };

        // Create preview HTML
        const previewHtml = generatePreviewHtml(content);
        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
    }

    // Revert content changes
    function revertContent() {
        if (confirm('Are you sure you want to revert all changes? This cannot be undone.')) {
            loadCurrentContent();
            showNotification('Content reverted to last saved version', 'info');
        }
    }

    // Add new quick link
    function addQuickLink(data = null) {
        const quickLinksEditor = document.querySelector('.quick-links-editor');
        const linkItem = document.createElement('div');
        linkItem.className = 'quick-link-item';
        
        linkItem.innerHTML = `
            <input type="text" placeholder="Link Text" class="link-text" value="${data ? data.text : ''}">
            <input type="text" placeholder="Query" class="link-query" value="${data ? data.query : ''}">
            <button class="btn btn-small btn-danger remove-link">Remove</button>
        `;

        quickLinksEditor.insertBefore(linkItem, addQuickLinkBtn);
        
        // Add remove event listener
        linkItem.querySelector('.remove-link').addEventListener('click', () => {
            linkItem.remove();
        });
    }

    // Add new footer link
    function addFooterLink(data = null) {
        const footerLinkEditor = document.querySelector('.footer-link-editor');
        
        if (!footerLinkEditor) {
            console.error('Footer link editor not found');
            return;
        }

        const linkItem = document.createElement('div');
        linkItem.className = 'footer-link-item';
        
        linkItem.innerHTML = `
            <input type="text" placeholder="Link Text" value="${data ? data.text : ''}">
            <input type="text" placeholder="URL" value="${data ? data.url : ''}">
            <button class="btn btn-small btn-danger remove-link">Remove</button>
        `;

        // Simply append the new link item to the editor
        footerLinkEditor.appendChild(linkItem);
        
        // Add remove event listener
        linkItem.querySelector('.remove-link').addEventListener('click', () => {
            linkItem.remove();
        });
    }

    // Helper functions
    function getQuickLinks() {
        const quickLinks = [];
        document.querySelectorAll('.quick-link-item').forEach(item => {
            quickLinks.push({
                text: item.querySelector('.link-text').value,
                query: item.querySelector('.link-query').value
            });
        });
        return quickLinks;
    }

    function getFooterLinks() {
        const footerLinks = [];
        document.querySelectorAll('.footer-link-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            footerLinks.push({
                text: inputs[0].value,
                url: inputs[1].value
            });
        });
        return footerLinks;
    }

    function generatePreviewHtml(content) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${content.title}</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body class="preview-mode">
                <div class="promo-banner">${content.promoBanner}</div>
                <div class="quick-links">
                    ${content.quickLinks.map(link => `
                        <button class="quick-link" data-query="${link.query}">${link.text}</button>
                    `).join('')}
                </div>
                <footer>
                    <div class="license-text">${content.licenseText}</div>
                    <div class="footer-links">
                        ${content.footerLinks.map(link => `
                            <a href="${link.url}">${link.text}</a>
                        `).join('')}
                    </div>
                    <div class="copyright">${content.copyrightText}</div>
                </footer>
            </body>
            </html>
        `;
    }

    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});
