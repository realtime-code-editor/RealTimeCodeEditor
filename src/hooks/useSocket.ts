import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

// ── Types ────────────────────────────────────────────────────────────────────

export type SocketStatus =
  | 'idle'         // never connected
  | 'connecting'   // socket created, waiting for 'connect' + 'joined' events
  | 'connected'    // received 'joined' from server — safe to enter editor
  | 'disconnected' // socket was connected but lost connection
  | 'error'        // connection failed / server refused

export interface SocketState {
  status: SocketStatus
  socketId: string | null
  error: string | null
}

export interface UseSocketReturn extends SocketState {
  /** Lazily create the socket and join a room. No-op if already connecting/connected. */
  connect: (serverUrl: string, roomId: string, username: string) => void
  /** Gracefully disconnect and reset state. */
  disconnect: () => void
  /** The underlying socket instance (read-only). */
  socket: Socket | null
}

// ── Default server URL (configure via .env VITE_SOCKET_URL) ──────────────────
const DEFAULT_SERVER = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)

  const [state, setState] = useState<SocketState>({
    status: 'idle',
    socketId: null,
    error: null,
  })

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(
    (serverUrl: string = DEFAULT_SERVER, roomId: string, username: string) => {
      // Prevent double-connect: if a socket is already live, do nothing.
      if (socketRef.current?.connected) return

      // Tear down any stale/failed socket before creating a new one.
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }

      setState({ status: 'connecting', socketId: null, error: null })

      // ✅ autoConnect: false — we call socket.connect() manually below
      //    so we can attach listeners BEFORE the connection opens.
      const socket = io(serverUrl, {
        autoConnect: false,
        reconnection: false,   // we own the reconnect UX
        timeout: 8000,
        transports: ['websocket', 'polling'], // fallback to polling if WS blocked
        query: { username },
      })

      socketRef.current = socket

      // ── Event handlers (attached before connect()) ───────────────────────

      socket.on('connect', () => {
        // TCP/WS connection established → now tell the server which room to join.
        // We do NOT set status='connected' here; we wait for the 'joined' ack.
        socket.emit('join-room', { roomId, username })
      })

      // ✅ Navigate to editor ONLY after server confirms the room join.
      socket.on('joined', ({ socketId }: { socketId: string; roomId: string; username: string }) => {
        setState({
          status: 'connected',
          socketId: socketId ?? socket.id ?? null,
          error: null,
        })
        // Persist session so a page refresh doesn't lose context.
        try {
          localStorage.setItem('cs_username', username)
          localStorage.setItem('cs_roomId', roomId)
          localStorage.setItem('cs_socketId', socketId ?? socket.id ?? '')
        } catch {
          // localStorage may be unavailable in private/incognito — not fatal.
        }
      })

      socket.on('join-error', ({ message }: { message: string }) => {
        setState({ status: 'error', socketId: null, error: message })
        socket.disconnect()
      })

      // ✅ Disconnect does NOT redirect — only sets status.
      //    JoinRoom only bounces to form on 'error', not on 'disconnected'.
      socket.on('disconnect', (reason) => {
        const isIntentional = reason === 'io client disconnect'
        setState((prev) => ({
          ...prev,
          status: isIntentional ? 'idle' : 'disconnected',
          socketId: null,
          error: isIntentional ? null : `Connection lost: ${reason}`,
        }))
        // Clear persisted session on intentional leave.
        if (isIntentional) {
          try {
            localStorage.removeItem('cs_username')
            localStorage.removeItem('cs_roomId')
            localStorage.removeItem('cs_socketId')
          } catch { /* ignore */ }
        }
      })

      socket.on('connect_error', (err) => {
        setState({
          status: 'error',
          socketId: null,
          error: err.message || 'Failed to connect to server',
        })
        // Don't leave the socket dangling — clean up.
        socket.disconnect()
      })

      // ── Open the connection NOW ──────────────────────────────────────────
      socket.connect()
    },
    [] // no deps — we use refs, not state, so this is stable forever
  )

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setState({ status: 'idle', socketId: null, error: null })
  }, [])

  return { ...state, socket: socketRef.current, connect, disconnect }
}
