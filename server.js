// server.js

const express = require("express");           // Import Express
const http = require("http");                 // Import Node.js HTTP module
const { Server } = require("socket.io");      // Import Socket.IO server class

const app = express();                        // Create Express app
const server = http.createServer(app);        // Create HTTP server using Express app

// Initialize Socket.IO server with CORS enabled for frontend
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500",         // Frontend origin
    methods: ["GET", "POST"]                 // Allowed methods
  }
});

// Listen for new client connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for 'join-room' event from frontend
  socket.on("join-room", (roomName) => {
    socket.join(roomName); // Add user to a room
    console.log(`User ${socket.id} joined room ${roomName}`);

    // Notify other users in the same room
    socket.to(roomName).emit("user-joined", socket.id);
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server on port 3000
server.listen(3000, () => {
  console.log("Server running on port 3000");
});