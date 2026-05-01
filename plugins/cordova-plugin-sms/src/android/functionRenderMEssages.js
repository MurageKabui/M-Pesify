// Add this at the beginning of your render function
if (app.store.ucv !== "viewMMsgsList") {
    app.replaceView('viewMMsgsList');
    // Use setTimeout to wait for view to render
    setTimeout(() => {
        loadMessages();
    }, 100);
    return;
}

loadMessages();

function loadMessages() {
    // Show loading state
    const container = document.getElementById('messagesList');
    if (!container) {
        app.toastMsg('Error: Could not load messages');
        return;
    }

    // Show loading indicator
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-pulse" style="font-size: 32px; color: #1a73e8;"></i>
            <p style="margin-top: 12px; color: #5f6368;">Loading messages...</p>
        </div>
    `;

    const savedSettings = app.getOption('mpesaSettings');
    let settings = {};
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
        } catch (e) {
            settings = {};
        }
    }

    const filter = {
        box: 'inbox',
        address: 'MPESA',
        indexFrom: 0,
        maxCount: 100
    };
    // LOG 1: Check what is actually being sent to the plugin
    app.showToast('Sending filter to Java:', JSON.stringify(filter));

    let timeoutReached = false;

    // Set timeout to prevent hanging
    const timeoutId = setTimeout(function () {
        timeoutReached = true;
        app.toastMsg('Timeout loading messages');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b6b;"></i>
                    <p style="margin-top: 12px; color: #d93025;">Timeout loading messages. Please check SMS permissions.</p>
                    <button onclick="app.retryLoadMessages()" style="margin-top: 20px; padding: 10px 20px; background: #1a73e8; color: white; border: none; border-radius: 8px;">
                        Retry
                    </button>
                </div>
            `;
        }
    }, 10000);

    SMS.listSMS(
        filter,
        function (messages) {
            app.showToast('Received from Java:', messages);

            clearTimeout(timeoutId);
            if (timeoutReached) return;

            if (!container) return;

            if (!messages || messages.length === 0) {
                app.toastMsg('No M-PESA messages found');
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #5f6368;"></i>
                        <p style="margin-top: 12px; color: #5f6368;">No M-PESA messages found</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';

            const sortedMessages = messages.sort(function (a, b) {
                return a.date - b.date;
            });

            const groupedMessages = {};

            sortedMessages.forEach(function (msg) {
                const dateKey = app.getDateKey(msg.date);
                if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
                groupedMessages[dateKey].push(msg);
            });

            Object.keys(groupedMessages).forEach(function (dateKey) {
                container.insertAdjacentHTML('beforeend', `
                    <div class="date-header">
                        <div class="date-chip">${escapeHtml(dateKey)}</div>
                    </div>
                `);

                groupedMessages[dateKey].forEach(function (msg) {
                    const timestamp = app.formatTimestamp(msg.date);
                    const simName = app.getSimName(msg.sim_id);
                    const urlData = app.extractUrlWithPreview(msg.body);
                    const messageBody = app.linkifyText(urlData.text);

                    const linkPreviewHTML = urlData.url ? `
                        <div class="link-preview" onclick="app.handleLink('${escapeHtml(urlData.url).replace(/'/g, "\\'")}')">
                            <div class="link-preview-image">
                                <img src="${escapeHtml(urlData.preview.image || '')}" alt="Preview" onerror="this.style.display='none'">
                            </div>
                            <div class="link-preview-content">
                                <div class="link-preview-title">${escapeHtml(urlData.preview.title || '')}</div>
                                <div class="link-preview-url">${escapeHtml(urlData.preview.domain || '')}</div>
                            </div>
                        </div>
                    ` : '';

                    const messageHTML = `
                        <div class="message-group">
                            <div class="message-item incoming">
                                <div class="bubble">
                                    ${messageBody}
                                    ${linkPreviewHTML}
                                </div>
                            </div>
                            <div class="timestamp">
                                ${timestamp}
                                <span class="sim-indicator">
                                    <span class="sim-icon"></span>
                                    ${escapeHtml(simName)}
                                </span>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', messageHTML);
                });
            });

            container.scrollTop = container.scrollHeight;

            // Success feedback
            app.toastMsg('Loaded ' + messages.length + ' messages');

            // Cleanup
            settings = null;
        },
        function (error) {
            clearTimeout(timeoutId);
            if (timeoutReached) return;

            const errorMessage = typeof error === 'string' ? error : (error && error.message) ? error.message : 'Unknown error';
            app.toastMsg('Failed: ' + errorMessage);

            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b6b;"></i>
                        <p style="margin-top: 12px; color: #d93025;">Failed to retrieve M-PESA messages:<br><small style="color: #5f6368; display: block; margin-top: 8px; word-break: break-all;">${escapeHtml(errorMessage)}</small></p>
                        <button onclick="app.retryLoadMessages()" style="margin-top: 20px; padding: 10px 20px; background: #1a73e8; color: white; border: none; border-radius: 8px;">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    );
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Add retry method to your app if not already there
if (!app.retryLoadMessages) {
    app.retryLoadMessages = function () {
        app.renderMPESAMessages();
    };
}