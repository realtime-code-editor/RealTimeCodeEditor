// server/index.js — Socket.IO backend for CodeSync
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3001

// ── HTTP server ──────────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('CodeSync Socket.IO server is running.\n')
})

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// ── Connection handling ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const username = socket.handshake.query.username || 'Anonymous'
  console.log(`[connect]  socket=${socket.id}  user="${username}"`)

  // ── Join Room ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, username: uname }) => {
    if (!roomId) {
      socket.emit('join-error', { message: 'Room ID is required' })
      return
    }

    // Leave any rooms this socket was previously in (except its own private room)
    const previousRooms = [...socket.rooms].filter((r) => r !== socket.id)
    previousRooms.forEach((r) => socket.leave(r))

    // Join the requested room
    socket.join(roomId)
    console.log(`[join-room] socket=${socket.id}  user="${uname}"  room="${roomId}"`)

    // ✅ Emit back to the requesting client — frontend waits for this before navigating
    socket.emit('joined', {
      roomId,
      username: uname,
      socketId: socket.id,
    })

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      username: uname,
    })
  })

  // ── Code sync ──────────────────────────────────────────────────────────────
  socket.on('code-change', ({ roomId, code }) => {
    // Broadcast to everyone else in the room
    socket.to(roomId).emit('code-update', { code, from: socket.id })
  })

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id)
    rooms.forEach((roomId) => {
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        username,
      })
    })
  })

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] socket=${socket.id}  reason="${reason}"`)
  })
})

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 CodeSync backend running at http://localhost:${PORT}\n`)
})
