document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize Telegram WebApp SDK
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        
        // Sync User Info if available
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            document.getElementById('user-name').textContent = fullName || 'Пользователь';
            document.getElementById('welcome-user-name').textContent = user.first_name || 'Друг';
            document.getElementById('user-avatar').textContent = (user.first_name || 'U')[0].toUpperCase();
        }
    }

    // UI Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const welcomeView = document.getElementById('welcome-view');
    const messagesList = document.getElementById('messages-list');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // State
    let systemPrompt = "Ты — умный и вежливый ИИ-ассистент CRAX AI. Отвечай чётко и по делу.";

    // Sidebar Toggle
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    toggleSidebarBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Auto-resize Textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
        sendBtn.disabled = userInput.value.trim() === '';
    });

    // Suggestion Cards Click
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            userInput.value = prompt;
            userInput.dispatchEvent(new Event('input'));
            sendMessage();
        });
    });

    // Send Message Handler
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Hide Welcome View
        welcomeView.style.display = 'none';

        // Add User Message
        appendMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Add Placeholder Assistant Loading Message
        const loadingId = appendLoadingMessage();
        scrollToBottom();

        try {
            // Call Python Backend API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    system_prompt: systemPrompt
                })
            });

            const data = await response.json();
            removeMessage(loadingId);

            if (data.reply) {
                appendMessage('assistant', data.reply);
            } else {
                appendMessage('assistant', '⚠️ Ошибка получения ответа от сервера.');
            }
        } catch (error) {
            console.error('API Error:', error);
            removeMessage(loadingId);
            appendMessage('assistant', '⚠️ Ошибка соединения с бэкендом.');
        }

        scrollToBottom();
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Append Message to UI
    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message-item ${role}`;
        
        const avatarIcon = role === 'assistant' ? 'sparkles' : 'user';
        const formattedText = formatMarkdown(text);

        msgDiv.innerHTML = `
            <div class="message-avatar">
                <i data-lucide="${avatarIcon}"></i>
            </div>
            <div class="message-content">${formattedText}</div>
        `;

        messagesList.appendChild(msgDiv);
        if (window.lucide) lucide.createIcons();
        scrollToBottom();
    }

    function appendLoadingMessage() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-item assistant';
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="message-avatar"><i data-lucide="sparkles"></i></div>
            <div class="message-content"><i>Печатает...</i></div>
        `;
        messagesList.appendChild(msgDiv);
        if (window.lucide) lucide.createIcons();
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Basic Markdown Formatter (Bold, Code blocks, line breaks)
    function formatMarkdown(text) {
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Code blocks ```code```
        escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        // Inline code `code`
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold **text**
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Line breaks
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Clear Chat
    clearChatBtn.addEventListener('click', () => {
        messagesList.innerHTML = '';
        welcomeView.style.display = 'flex';
    });

    newChatBtn.addEventListener('click', () => {
        messagesList.innerHTML = '';
        welcomeView.style.display = 'flex';
        closeSidebar();
    });

    // Settings Modal Handlers
    openSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    saveSettingsBtn.addEventListener('click', () => {
        const val = document.getElementById('system-prompt-input').value.trim();
        if (val) systemPrompt = val;
        settingsModal.classList.remove('active');
    });
});
