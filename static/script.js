document.addEventListener("DOMContentLoaded", () => {
    // Only execute if we are on the editor page
    const editorContainer = document.getElementById("editor-container");
    if (!editorContainer) return;

    // Get metadata injected by Flask
    const username = document.getElementById("current-username").value;
    const room = document.getElementById("current-room").value;
    const userCountEl = document.getElementById("user-count");

    const langSelector = document.getElementById("language-selector");
    const runBtn = document.getElementById("run-btn");
    const outputConsole = document.getElementById("output-console");
    const clearBtn = document.getElementById("clear-btn");
    const stdinInput = document.getElementById("stdin-input");

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
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        
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

        editor = monaco.editor.create(editorContainer, {
            value: "// Loading editor...\n",
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

        // Apply our true theme once it's loaded
        monaco.editor.setTheme('syncCodeTheme');

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
                const response = await fetch('/run', {
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
            
            userCountEl.innerText = data.userCount;
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
            userCountEl.innerText = data.userCount;
            
            // Trigger a quick pulse effect on the counter for visual feedback
            userCountEl.style.color = 'var(--success)';
            setTimeout(() => {
                userCountEl.style.color = '';
            }, 300);
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

        socket.on("disconnect", () => {
            console.error("Disconnected from server.");
        });
    }
});
