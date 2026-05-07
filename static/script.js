document.addEventListener("DOMContentLoaded", () => {
    // Only execute if we are on the editor page
    const editorContainer = document.getElementById("editor-container");
    if (!editorContainer) return;

    // Get metadata injected by Flask
    const username = document.getElementById("current-username").value;
    const room = document.getElementById("current-room").value;
    const projectIdInput = document.getElementById("current-project-id");
    const projectId = projectIdInput ? projectIdInput.value : null;
    const initialCodeInput = document.getElementById("initial-code");
    const initialCode = initialCodeInput ? initialCodeInput.value : "";
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

        const participantCountEl = document.getElementById("sidebar-participant-count");
        if (participantCountEl) {
            participantCountEl.textContent = users.length;
        }

        if (hasCurrentUser) {
            const el = document.createElement('div');
            el.className = 'participant-item';
            const initial = username[0].toUpperCase();
            el.innerHTML = `<span class="dot">${initial}</span> <span>${username} <em style="opacity:0.55;font-size:0.8em;">(you)</em></span>`;
            participantsList.appendChild(el);
        }

        otherUsers.forEach(u => {
            const el = document.createElement('div');
            el.className = 'participant-item';
            const initial = u[0].toUpperCase();
            el.innerHTML = `<span class="dot">${initial}</span> <span>${u}</span>`;
            participantsList.appendChild(el);
        });
    }

    function toggleSidebar(open) {
        const rightPane = document.getElementById('right-pane');
        const resizeHorizontal = document.getElementById('resize-horizontal');
        if (!rightPane || !resizeHorizontal) return;
        
        const isOpen = typeof open === 'boolean' ? open : rightPane.style.display === 'none';
        
        rightPane.style.display = isOpen ? 'flex' : 'none';
        resizeHorizontal.style.display = isOpen ? 'flex' : 'none';
        
        // Let flexbox settle before layout recalc
        if (editor) setTimeout(() => editor.layout(), 10);
        
        // Auto-focus chat input if opening
        if (isOpen && chatInput) {
            setTimeout(() => chatInput.focus(), 100);
            if (chatBadge) {
                chatBadge.classList.add('hidden');
            }
        }
    }

    if (participantsToggle) {
        participantsToggle.addEventListener('click', () => toggleSidebar());
    }

    if (closeParticipantsBtn) {
        closeParticipantsBtn.addEventListener('click', () => toggleSidebar(false));
    }

    if (chatToggle) {
        chatToggle.addEventListener('click', () => toggleSidebar());
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => toggleSidebar(false));
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

    // File Upload Logic
    const fileUpload = document.getElementById("file-upload");
    if (fileUpload) {
        fileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 10 * 1024 * 1024) {
                alert("File is too large. Maximum size is 10MB.");
                fileUpload.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('room', room);
            formData.append('username', username);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error('Upload failed');
            } catch (err) {
                console.error(err);
                alert("File upload failed.");
            }
            fileUpload.value = ''; // Reset input
        });
    }

    // Resizable Layout Logic - Horizontal & Vertical
    const resizeHorizontal = document.getElementById('resize-horizontal');
    const rightPane = document.getElementById('right-pane');
    const mainWorkspace = document.querySelector('.main-workspace');
    
    if (resizeHorizontal && rightPane && mainWorkspace) {
        let isDraggingH = false;

        resizeHorizontal.addEventListener('mousedown', (e) => {
            isDraggingH = true;
            resizeHorizontal.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingH) return;
            const containerRect = mainWorkspace.getBoundingClientRect();
            // Calculate right pane width
            let newWidth = containerRect.right - e.clientX;
            // Constrain
            if (newWidth < 250) newWidth = 250;
            if (newWidth > containerRect.width - 300) newWidth = containerRect.width - 300;
            
            rightPane.style.width = `${newWidth}px`;
            if (editor) editor.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingH) {
                isDraggingH = false;
                resizeHorizontal.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (editor) editor.layout();
            }
        });
    }

    const resizeVertical = document.getElementById('resize-vertical');
    const outputWrapper = document.getElementById('output-wrapper');
    const leftColumn = document.getElementById('left-column');

    if (resizeVertical && outputWrapper && leftColumn) {
        let isDraggingV = false;

        resizeVertical.addEventListener('mousedown', (e) => {
            isDraggingV = true;
            resizeVertical.classList.add('dragging');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingV) return;
            const containerRect = leftColumn.getBoundingClientRect();
            // Calculate output pane height (bottom up)
            let newHeight = containerRect.bottom - e.clientY;
            // Constrain
            if (newHeight < 120) newHeight = 120; // Output min height
            if (newHeight > containerRect.height - 200) newHeight = containerRect.height - 200; // Editor min height
            
            outputWrapper.style.height = `${newHeight}px`;
            outputWrapper.style.flex = 'none'; // Ensure height applies over flex
            if (editor) editor.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingV) {
                isDraggingV = false;
                resizeVertical.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (editor) editor.layout();
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
            value: initialCode,
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
                const isLight = document.body.classList.contains('light-mode');
                const newMode = isLight ? 'dark' : 'light';
                localStorage.setItem('theme', newMode);
                // applyTheme is defined in the inline script block in editor.html
                if (typeof applyTheme === 'function') applyTheme(newMode);
                updateEditorTheme();
            });
        }

        // Once editor is ready, setup WebSockets
        setupWebSockets();

        // ==========================================
        // Multi-File State
        // ==========================================
        let projectFiles = {}; 
        let currentFileId = null;
        const fileExplorerList = document.getElementById('explorer-list');
        const editorTabBar = document.getElementById('editor-tab-bar');

        async function fetchProjectFiles() {
            if (!projectId) return;
            const tabParam = new URLSearchParams(window.location.search).get('tab') || 'default';
            try {
                const res = await fetch(`/files/project/${projectId}?tab=${tabParam}`);
                const files = await res.json();
                
                const oldFiles = { ...projectFiles };
                projectFiles = {};
                files.forEach(f => {
                    projectFiles[f.id] = {
                        id: f.id,
                        filename: f.filename,
                        language: f.language,
                        code: oldFiles[f.id]?.code || '',
                        unsavedChanges: oldFiles[f.id]?.unsavedChanges || false
                    };
                });
                renderFileExplorer();
                
                if (files.length > 0 && !currentFileId) {
                    await switchFile(files[0].id);
                }
            } catch (e) {
                console.error("Failed to fetch project files", e);
            }
        }

        async function switchFile(fileId) {
            if (currentFileId === fileId) return;
            const tabParam = new URLSearchParams(window.location.search).get('tab') || 'default';
            
            try {
                const res = await fetch(`/files/${fileId}?tab=${tabParam}`);
                const data = await res.json();
                
                if (!projectFiles[fileId]) projectFiles[fileId] = data;
                
                if (!projectFiles[fileId].unsavedChanges) {
                    projectFiles[fileId].code = data.code;
                }
                
                currentFileId = fileId;
                
                isUpdatingFromServer = true;
                monaco.editor.setModelLanguage(editor.getModel(), languageMap[data.language] || data.language);
                editor.setValue(projectFiles[fileId].code || "");
                isUpdatingFromServer = false;
                
                renderFileExplorer();
                renderTabs();
                updateSaveIndicator();
                
                if (langSelector) langSelector.value = data.language;
            } catch (e) {
                console.error("Failed to load file", e);
            }
        }

        function renderFileExplorer() {
            if (!fileExplorerList) return;
            fileExplorerList.innerHTML = '';
            
            const files = Object.values(projectFiles).sort((a, b) => a.filename.localeCompare(b.filename));
            
            if (files.length === 0) {
                fileExplorerList.innerHTML = `
                    <div class="explorer-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>No files in project</span>
                    </div>
                `;
                return;
            }
            
            files.forEach(f => {
                const div = document.createElement('div');
                div.className = `explorer-item ${f.id === currentFileId ? 'active' : ''}`;
                
                // Subtle language-based coloring for the icon
                let iconColor = "currentColor";
                if (f.id === currentFileId) iconColor = "var(--primary)";
                
                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>${f.filename}</span>
                    </div>
                    ${f.unsavedChanges ? '<span class="unsaved-dot" style="width:6px;height:6px;background:var(--accent);border-radius:50%;box-shadow: 0 0 8px var(--accent);"></span>' : ''}
                `;
                div.addEventListener('click', () => switchFile(f.id));
                fileExplorerList.appendChild(div);
            });
        }

        function renderTabs() {
            if (!editorTabBar) return;
            editorTabBar.innerHTML = '';
            if (currentFileId && projectFiles[currentFileId]) {
                const f = projectFiles[currentFileId];
                editorTabBar.innerHTML = `
                    <span class="editor-tab active">${f.filename} ${f.unsavedChanges ? '●' : ''}</span>
                    <span class="editor-tab-spacer"></span>
                `;
            } else {
                editorTabBar.innerHTML = `<span class="editor-tab-spacer"></span>`;
            }
        }

        function updateSaveIndicator() {
            const saveLabel = document.getElementById('save-label');
            if (!saveLabel) return;
            if (currentFileId && projectFiles[currentFileId]?.unsavedChanges) {
                saveLabel.textContent = 'Unsaved changes';
                saveLabel.style.color = 'var(--warning)';
            } else {
                saveLabel.textContent = 'Saved';
                saveLabel.style.color = '';
            }
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!currentFileId) return;
                const tabParam = new URLSearchParams(window.location.search).get('tab') || 'default';
                const saveLabel = document.getElementById('save-label');
                saveLabel.textContent = 'Saving...';
                saveLabel.style.color = '';
                
                try {
                    const response = await fetch(`/files/save?tab=${tabParam}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_id: currentFileId, code: editor.getValue() })
                    });
                    if (response.ok) {
                        projectFiles[currentFileId].unsavedChanges = false;
                        updateSaveIndicator();
                        renderFileExplorer();
                        renderTabs();
                    } else {
                        saveLabel.textContent = 'Save Failed';
                        saveLabel.style.color = 'var(--danger)';
                    }
                } catch (e) {
                    console.error(e);
                    saveLabel.textContent = 'Save Failed';
                    saveLabel.style.color = 'var(--danger)';
                }
            });
        }

        const newFileBtn = document.getElementById("new-file-btn");
        if (newFileBtn) {
            newFileBtn.addEventListener("click", async () => {
                const filename = prompt("Enter new filename (e.g. utils.py):");
                if (!filename) return;
                
                let lang = "python";
                if (filename.endsWith(".js")) lang = "javascript";
                else if (filename.endsWith(".c")) lang = "c";
                else if (filename.endsWith(".cpp")) lang = "c++";
                else if (filename.endsWith(".java")) lang = "java";
                else if (filename.endsWith(".html")) lang = "html";
                else if (filename.endsWith(".css")) lang = "css";
                
                const tabParam = new URLSearchParams(window.location.search).get('tab') || 'default';
                
                try {
                    const res = await fetch(`/files/create?tab=${tabParam}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ project_id: projectId, filename, language: lang })
                    });
                    const data = await res.json();
                    if (data.success) {
                        await fetchProjectFiles();
                        switchFile(data.id);
                    }
                } catch (e) {
                    console.error(e);
                }
            });
        }

        // ==========================================
        // File History
        // ==========================================
        const historyBtn = document.getElementById('history-btn');
        const historyModal = document.getElementById('history-modal');
        const closeHistoryModal = document.getElementById('close-history-modal');
        const historyList = document.getElementById('history-list');

        if (historyBtn && historyModal) {
            historyBtn.addEventListener('click', async () => {
                if (!currentFileId) return;
                historyModal.classList.remove('hidden');
                historyList.innerHTML = '<div class="loading-text">Loading history...</div>';
                
                const tabParam = new URLSearchParams(window.location.search).get('tab') || 'default';
                try {
                    const res = await fetch(`/files/history/${currentFileId}?tab=${tabParam}`);
                    const versions = await res.json();
                    
                    historyList.innerHTML = '';
                    if (versions.length === 0) {
                        historyList.innerHTML = '<div class="loading-text" style="padding: 10px;">No history found.</div>';
                        return;
                    }
                    
                    versions.forEach(v => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.style.padding = '12px';
                        div.style.borderBottom = '1px solid var(--border-color)';
                        div.style.cursor = 'pointer';
                        
                        div.innerHTML = `
                            <div style="font-weight: 600; color: var(--text-main);">Version ${v.id}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${v.saved_at}</div>
                        `;
                        div.addEventListener('mouseenter', () => div.style.background = 'rgba(255, 255, 255, 0.05)');
                        div.addEventListener('mouseleave', () => div.style.background = 'transparent');
                        if (document.body.classList.contains('light-mode')) {
                            div.addEventListener('mouseenter', () => div.style.background = 'rgba(0, 0, 0, 0.05)');
                        }
                        
                        div.addEventListener('click', async () => {
                            try {
                                const vRes = await fetch(`/files/version/${v.id}?tab=${tabParam}`);
                                const vData = await vRes.json();
                                
                                isUpdatingFromServer = true;
                                editor.setValue(vData.code);
                                isUpdatingFromServer = false;
                                
                                projectFiles[currentFileId].code = vData.code;
                                projectFiles[currentFileId].unsavedChanges = true;
                                updateSaveIndicator();
                                renderFileExplorer();
                                renderTabs();
                                
                                historyModal.classList.add('hidden');
                                
                                socket.emit("code_change", {
                                    room: room,
                                    file_id: currentFileId,
                                    code: vData.code
                                });
                            } catch (e) {
                                console.error('Failed to load version', e);
                            }
                        });
                        historyList.appendChild(div);
                    });
                } catch (e) {
                    console.error('Failed to fetch history', e);
                    historyList.innerHTML = '<div class="loading-text" style="color: var(--danger); padding: 10px;">Error loading history.</div>';
                }
            });
            
            closeHistoryModal.addEventListener('click', () => {
                historyModal.classList.add('hidden');
            });
        }

        if (projectId) {
            fetchProjectFiles();
        }

        // Listen to local typing events
        editor.onDidChangeModelContent((e) => {
            // Ignore the event if the write came from the server
            if (isUpdatingFromServer) return;

            const currentCode = editor.getValue();
            
            if (currentFileId && projectFiles[currentFileId]) {
                projectFiles[currentFileId].code = currentCode;
                projectFiles[currentFileId].unsavedChanges = true;
                updateSaveIndicator();
                renderFileExplorer();
                renderTabs();
            }

            // Broadcast changes to the room
            socket.emit("code_change", {
                room: room,
                file_id: currentFileId,
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

            // ONLY override if the server's code has content or if we don't have initial code
            // (In a real app, you might sync timestamps. For now, prefer the existing state in room if any)
            if (data.code && data.code.trim() !== '') {
                isUpdatingFromServer = true;
                editor.setValue(data.code);
                isUpdatingFromServer = false;
            } else if (initialCode && data.userCount === 1) {
                // If we're the first one here and we have an initial code, broadcast it to the empty room so it becomes the authoritative state
                socket.emit("code_change", { room: room, code: initialCode });
            }

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

            if (data.file_id) {
                if (!projectFiles[data.file_id]) {
                    projectFiles[data.file_id] = { code: data.code, unsavedChanges: false };
                } else {
                    projectFiles[data.file_id].code = data.code;
                }
                
                if (data.file_id === currentFileId) {
                    isUpdatingFromServer = true;
                    const position = editor.getPosition();
                    editor.setValue(data.code);
                    editor.setPosition(position);
                    isUpdatingFromServer = false;
                }
            } else {
                // Fallback
                isUpdatingFromServer = true;
                const position = editor.getPosition();
                editor.setValue(data.code);
                editor.setPosition(position);
                isUpdatingFromServer = false;
            }
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

        socket.on("file_message", (message) => {
            const isSelf = message.username === username;
            const msgEl = document.createElement('div');
            msgEl.className = `chat-message ${isSelf ? 'self' : 'other'}`;
            
            const timeStr = formatTime(message.timestamp);
            const safeFileName = message.filename.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            msgEl.innerHTML = `
                <div class="message-meta">
                    <span class="sender">${isSelf ? 'You' : message.username}</span>
                    <span class="time">${timeStr}</span>
                </div>
                <div class="message-bubble file-bubble">
                    <a href="${message.url}" target="_blank" download style="color: inherit; text-decoration: underline; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        ${safeFileName}
                    </a>
                </div>
            `;
            
            if (chatMessages) {
                chatMessages.appendChild(msgEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Notification dot if right pane is closed
            const rightPane = document.getElementById('right-pane');
            if (rightPane && rightPane.style.display === 'none' && chatToggle) {
                chatToggle.style.color = 'var(--primary)';
                setTimeout(() => chatToggle.style.color = '', 1000);
                if (chatBadge) chatBadge.classList.remove('hidden');
            }
        });

        socket.on("disconnect", () => {
            console.error("Disconnected from server.");
        });
    }
});
