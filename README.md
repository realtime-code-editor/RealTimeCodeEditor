# CodeSync: Real-Time Collaborative Code Editor

A real-time collaborative code editing environment built with React, Vite, Monaco Editor, and Socket.IO.

## Getting Started

To run the full application locally, you will need to start both the backend server and the frontend client in separate terminal windows.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm

### 1. Start the Backend Server

The Node.js/Socket.IO backend handles room management, active connections, and broadcasting code and cursor updates to users.

Open a terminal window and navigate to the `server` directory:

```sh
cd server
npm install
npm run dev
```

The server will start (typically on port 3000) and watch for changes.

### 2. Start the Frontend Client

The Vite React application provides the user interface powered by Monaco Editor.

Open a **new** terminal window at the root of the project:

```sh
npm install
npm run dev
```

The terminal will output a local URL (e.g., `http://localhost:5173`). Open this URL in your browser to access the application.

## Features

- **Real-Time Editing:** Edit code synchronously with other participants in the same room.
- **Robust Socket Connection:** Graceful connection fallback and state persistence.
- **Monaco Editor Integration:** Full syntax highlighting and editor functionality using `@monaco-editor/react`.
- **Modern UI:** Built using Framer Motion for animations and Tailwind CSS for styling.
