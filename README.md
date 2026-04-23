SyncCode — Real-Time Collaborative Code Editor

SyncCode is a real-time collaborative code editor that allows multiple users to join a shared room and write, edit, and execute code together instantly. It combines a modern UI with live synchronization using WebSockets.

✨ Features
🔐 User Authentication
Signup & Login system
Secure password hashing
Session-based authentication
🧑‍💻 Real-Time Collaboration
Multiple users can join a room
Live code syncing using WebSockets (Socket.IO)
Presence indicator (online users)
🏠 Room System
Create a new room instantly
Join existing rooms using Room ID
Unique room-based collaboration
⚡ Code Execution
Run code directly from the editor
Supports:
Python
JavaScript
C
C++
Java
Standard input support
Output shared across all users in room
🎨 Modern UI/UX
Glassmorphism design
Dark/Light theme toggle
Responsive layout
Monaco Editor integration (VS Code-like experience)
📊 User Activity Tracking
Last login date displayed on dashboard



🛠️ Tech Stack
Frontend
HTML, CSS (Glass UI)
JavaScript
Monaco Editor (via CDN)
Backend
Python (Flask)
Flask-SocketIO (real-time communication)
SQLite (database)
Other Tools
WebSockets (Socket.IO)
Subprocess (for local code execution)
Tempfile (secure execution environment)



📁 Project Structure
SyncCode/
│
├── app.py                 # Main Flask application
├── users.db               # SQLite database
├── requirements.txt       # Python dependencies
├── README.md              # Project documentation
│
├── templates/
│   ├── index.html         # Login/Signup page
│   ├── dashboard.html     # Dashboard (create/join room)
│   └── editor.html        # Code editor page
│
├── static/
│   ├── style.css          # Styling
│   └── script.js          # Client-side logic (editor + sockets)
│
└── .env                   # Environment variables (optional)


⚙️ Installation & Setup
1. Clone the repository
git clone <https://github.com/realtime-code-editor/RealTimeCodeEditor.git>
cd SyncCode
2. Create virtual environment
python -m venv venv
3. Activate virtual environment

Windows:

venv\Scripts\activate

Mac/Linux:

source venv/bin/activate
4. Install dependencies
pip install -r requirements.txt
5. Run the application
python app.py
6. Open in browser
http://127.0.0.1:5000



🔄 How It Works
User logs in or signs up
Dashboard allows:
Creating a room
Joining a room via Room ID
Editor page:
Connects to WebSocket server
Syncs code in real-time
Shows active users
Code execution:
Sent to backend
Executed securely
Output broadcasted to all users



🧠 Key Concepts Used
WebSockets for real-time communication
Room-based event broadcasting
State management for collaborative editing
Local code execution using subprocess
Secure authentication with hashed passwords