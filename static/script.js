document.addEventListener("DOMContentLoaded", () => {
    // Only execute if we are on the editor page
    const editorContainer = document.getElementById("editor-container");
    if (!editorContainer) return;

    // Get metadata injected by Flask
    const username = document.getElementById("current-username").value;
    const room = document.getElementById("current-room").value;
    const participantCountEl = document.getElementById("participant-count");

    const langSelector = document.getElementById("language-selector");
    const runBtn = document.getElementById("run-btn");
    const outputConsole = document.getElementById("output-console");
    const clearBtn = document.getElementById("clear-btn");
    const stdinInput = document.getElementById("stdin-input");
    const participantsList = document.getElementById("participants-list");
    const participantsToggle = document.getElementById("participants-toggle");
    const participantsSidebar = document.getElementById("participants-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const closeParticipantsBtn = document.getElementById("close-participants");
    const copyRoomBtn = document.getElementById("copy-room-btn");

    const chatToggle = document.getElementById("chat-toggle");
    const chatSidebar = document.getElementById("chat-sidebar");
    const closeChatBtn = document.getElementById("close-chat");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendChatBtn = document.getElementById("send-chat-btn");
    const chatBadge = document.getElementById("chat-badge");

    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');

    function updateParticipantsList(users) {
        if (!participantsList || !users) return;
        participantsList.innerHTML = '';

        const otherUsers = [...users].filter(u => u !== username).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const hasCurrentUser = [...users].includes(username);

        participantCountEl.textContent = users.length;

        if (hasCurrentUser) {
            const el = document.createElement('div');
            el.className = 'participant-item';
            el.innerHTML = `<span class="dot"></span> <span>${username} (me)</span>`;
            participantsList.appendChild(el);
        }

        otherUsers.forEach(u => {
            const el = document.createElement('div');
            el.className = 'participant-item';
            el.innerHTML = `<span class="dot"></span> <span>${u}</span>`;
            participantsList.appendChild(el);
        });
    }

    function toggleSidebar(sidebarId, open) {
        const sidebar = document.getElementById(sidebarId);
        if (!sidebar) return;
        const isOpen = typeof open === 'boolean' ? open : !sidebar.classList.contains('open');
        
        // Close all other sidebars first
        if (isOpen) {
            document.querySelectorAll('.sidebar-component').forEach(el => {
                if (el.id !== sidebarId) {
                    el.classList.remove('open');
                    el.setAttribute('aria-hidden', 'true');
                }
            });
        }
        
        sidebar.classList.toggle('open', isOpen);
        sidebarBackdrop.classList.toggle('visible', isOpen);
        sidebar.setAttribute('aria-hidden', !isOpen);
        
        // Auto-focus chat input if opening chat
        if (isOpen && sidebarId === 'chat-sidebar' && chatInput) {
            setTimeout(() => chatInput.focus(), 100);
            if (chatBadge) {
                chatBadge.classList.add('hidden');
            }
        }
    }

    if (participantsToggle) {
        participantsToggle.addEventListener('click', () => toggleSidebar('participants-sidebar', true));
    }

    if (closeParticipantsBtn) {
        closeParticipantsBtn.addEventListener('click', () => toggleSidebar('participants-sidebar', false));
    }

    if (chatToggle) {
        chatToggle.addEventListener('click', () => toggleSidebar('chat-sidebar', true));
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => toggleSidebar('chat-sidebar', false));
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-component').forEach(el => {
                el.classList.remove('open');
                el.setAttribute('aria-hidden', 'true');
            });
            sidebarBackdrop.classList.remove('visible');
        });
    }

    // Chat Functions
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function appendChatMessage(message) {
        if (!chatMessages) return;
        
        const isSelf = message.username === username;
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${isSelf ? 'self' : 'other'}`;
        
        const timeStr = formatTime(message.timestamp);
        
        // Simple HTML escaping for safety
        const safeText = message.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        msgEl.innerHTML = `
            <div class="message-meta">
                <span class="sender">${isSelf ? 'You' : message.username}</span>
                <span class="time">${timeStr}</span>
            </div>
            <div class="message-bubble">${safeText}</div>
        `;
        
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function sendChatMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;
        
        socket.emit('send_chat_message', {
            room: room,
            username: username,
            text: text
        });
        
        chatInput.value = '';
    }
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    if (copyRoomBtn) {
        copyRoomBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(room).then(() => {
                const originalSvg = copyRoomBtn.innerHTML;
                copyRoomBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    copyRoomBtn.innerHTML = originalSvg;
                }, 2000);
            });
        });
    }

    // Map backend language keys to Monaco language identifiers
    const languageMap = {
        'python': 'python',
        'javascript': 'javascript',
        'c': 'c',
        'c++': 'cpp',
        'java': 'java'
    };

    // ==========================================
    // 1. IMPORTANT LOGIC: Init socket with autoConnect: false
    // ==========================================
    const socket = io({ autoConnect: false });

    let editor;
    // Flag to prevent echoing updates back to the server
    let isUpdatingFromServer = false;

    // ==========================================
    // 2. Setup Monaco Editor via CDN
    // ==========================================
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {

        // Custom Theme to match our premium UI
        monaco.editor.defineTheme('syncCodeTheme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#11182700', // transparent to let glassmorphism show
                'editor.lineHighlightBackground': '#1e293b88',
                'editorLineNumber.foreground': '#64748b',
            }
        });

        monaco.editor.defineTheme('syncCodeThemeLight', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#ffffff00', // transparent
                'editor.lineHighlightBackground': '#f1f5f988',
                'editorLineNumber.foreground': '#64748b',
            }
        });

        editor = monaco.editor.create(editorContainer, {
            value: "",
            language: 'javascript',
            theme: 'vs-dark', // Fallback to vs-dark while loading our custom one
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            padding: { top: 20 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: true
        });

        // Function to update editor theme
        function updateEditorTheme() {
            if (document.body.classList.contains('light-mode')) {
                monaco.editor.setTheme('syncCodeThemeLight');
            } else {
                monaco.editor.setTheme('syncCodeTheme');
            }
        }

        // Make it global
        window.updateEditorTheme = updateEditorTheme;

        // Apply initial theme
        updateEditorTheme();

        // Attach theme toggle event listener
        if (themeToggle && themeLabel) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                const isLight = document.body.classList.contains('light-mode');
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
                themeLabel.textContent = isLight ? 'Light' : 'Dark';
                updateEditorTheme();
            });
        }

        // Once editor is ready, setup WebSockets
        setupWebSockets();

        // Listen to local typing events
        editor.onDidChangeModelContent((e) => {
            // Ignore the event if the write came from the server
            if (isUpdatingFromServer) return;

            const currentCode = editor.getValue();

            // Broadcast changes to the room
            socket.emit("code_change", {
                room: room,
                code: currentCode
            });
        });

        // ==========================================
        // UI Event Listeners for Execution
        // ==========================================
        langSelector.addEventListener("change", (e) => {
            const selectedLang = e.target.value;
            const monacoLang = languageMap[selectedLang] || selectedLang;
            monaco.editor.setModelLanguage(editor.getModel(), monacoLang);
        });

        clearBtn.addEventListener("click", () => {
            outputConsole.textContent = "Waiting for execution...";
            outputConsole.classList.remove("error-text");
        });

        runBtn.addEventListener("click", async () => {
            const code = editor.getValue();
            if (!code.trim()) {
                outputConsole.textContent = "Please write some code before running.";
                outputConsole.classList.add("error-text");
                return;
            }

            const language = langSelector.value;
            const stdin = stdinInput.value;

            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="icon">⌛</span> Running...';
            outputConsole.textContent = 'Executing remotely...';
            outputConsole.classList.remove("error-text");

            try {
                const urlParams = new URLSearchParams(window.location.search);
                const tabId = urlParams.get('tab') || sessionStorage.getItem('synccode_tab_id') || 'default';

                const response = await fetch(`/run?tab=${tabId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language, stdin })
                });

                const data = await response.json();

                if (data.isError) {
                    outputConsole.classList.add("error-text");
                } else {
                    outputConsole.classList.remove("error-text");
                }

                outputConsole.textContent = data.output || "Program finished with no output.";

                // Broadcast the output to all peers in the room
                socket.emit("run_output", {
                    room: room,
                    output: outputConsole.textContent,
                    isError: !!data.isError
                });

            } catch (err) {
                console.error(err);
                outputConsole.classList.add("error-text");
                outputConsole.textContent = "Execution request failed to reach the server.";
            } finally {
                runBtn.disabled = false;
                runBtn.innerHTML = '<span class="icon">▶</span> Run Code';
            }
        });
    });

    // ==========================================
    // 3. Socket.IO Logic
    // ==========================================
    function setupWebSockets() {
        // Connect ONLY after clicking join / passing validation
        socket.connect();

        socket.on("connect", () => {
            console.log("Connected. Emitting join_room request.");
            // Send join instruction
            socket.emit("join_room", { room: room, username: username });
        });

        // Handle successful join and receive existing code state
        socket.on("joined", (data) => {
            console.log("Joined successfully. Initializing code state.");

            isUpdatingFromServer = true;
            editor.setValue(data.code);
            isUpdatingFromServer = false;

            updateParticipantsList(data.users);
            
            // Render existing chat history
            if (data.chatHistory && chatMessages) {
                chatMessages.innerHTML = ''; // clear
                data.chatHistory.forEach(msg => appendChatMessage(msg));
            }
        });

        // Handle incoming live updates from other users
        socket.on("code_update", (data) => {
            if (!editor) return;

            isUpdatingFromServer = true;

            // Note: In a production tool (like real Google Docs), we would use Operational Transformation (OT)
            // or CRDTs. For this MVP, we override the whole value but preserve the local user's cursor.
            const position = editor.getPosition();

            editor.setValue(data.code);

            editor.setPosition(position);

            isUpdatingFromServer = false;
        });

        // Handle presence
        socket.on("presence_update", (data) => {
            updateParticipantsList(data.users);

            if (participantCountEl) {
                participantCountEl.style.color = 'var(--success)';
                setTimeout(() => {
                    participantCountEl.style.color = '';
                }, 300);
            }
        });

        // Handle execution output sync
        socket.on("output_update", (data) => {
            if (data.isError) {
                outputConsole.classList.add("error-text");
            } else {
                outputConsole.classList.remove("error-text");
            }
            outputConsole.textContent = data.output;

            // Optional: scroll to bottom
            outputConsole.scrollTop = outputConsole.scrollHeight;
        });

        socket.on("chat_message", (message) => {
            appendChatMessage(message);
            
            // Optional: Show visual indication on the chat toggle button if closed
            if (chatSidebar && !chatSidebar.classList.contains('open') && chatToggle) {
                chatToggle.style.color = 'var(--primary)';
                setTimeout(() => chatToggle.style.color = '', 1000);
                if (chatBadge) {
                    chatBadge.classList.remove('hidden');
                }
            }
        });

        socket.on("disconnect", () => {
            console.error("Disconnected from server.");
        });
    }
});
