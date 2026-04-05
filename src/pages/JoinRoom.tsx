import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard'
import InputField from '../components/InputField'
import JoinButton from '../components/JoinButton'
import AnimatedBackground from '../components/AnimatedBackground'
import ConnectingScreen from '../components/ConnectingScreen'
import EditorPage from './EditorPage'
import { useSocket } from '../hooks/useSocket'

// ── Types ────────────────────────────────────────────────────────────────────

/** The three pages driven by AnimatePresence */
type View = 'form' | 'connecting' | 'connected'

interface FormValues {
  username: string
  roomId: string
}

// ── Validation ────────────────────────────────────────────────────────────────

const validateUsername = (v: string) => {
  if (!v.trim()) return 'Username is required'
  if (v.trim().length < 2) return 'Username must be at least 2 characters'
  if (v.trim().length > 32) return 'Username must be under 32 characters'
  return ''
}

const validateRoomId = (v: string) => {
  if (!v.trim()) return 'Room ID is required'
  if (!/^[a-zA-Z0-9_-]{4,24}$/.test(v.trim()))
    return 'Room ID: 4–24 alphanumeric chars, hyphens, or underscores'
  return ''
}

// ── Server URL (configure via .env VITE_SOCKET_URL) ──────────────────────────
const SERVER_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * JoinRoom — orchestrates the full join flow:
 *   form  →  connecting (socket opens, emits join-room)  →  connected
 *
 * Socket is created lazily — ONLY when the user clicks "Join Room".
 */
export default function JoinRoom() {
  // Form state
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [errors, setErrors] = useState({ username: '', roomId: '' })

  // ── Restore session from localStorage so a page refresh keeps you in the editor
  const restoredUsername = (() => { try { return localStorage.getItem('cs_username') ?? '' } catch { return '' } })()
  const restoredRoomId   = (() => { try { return localStorage.getItem('cs_roomId')   ?? '' } catch { return '' } })()

  // View machine — start as 'connected' if we have a persisted session
  const [view, setView] = useState<View>(
    restoredUsername && restoredRoomId ? 'connected' : 'form'
  )

  // Locked-in values once we start connecting (so UI doesn't flicker)
  const sessionRef = useRef<FormValues>({
    username: restoredUsername,
    roomId:   restoredRoomId,
  })

  // Socket hook
  const socket = useSocket()

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const usernameErr = validateUsername(username)
      const roomIdErr = validateRoomId(roomId)

      if (usernameErr || roomIdErr) {
        setErrors({ username: usernameErr, roomId: roomIdErr })
        return
      }

      setErrors({ username: '', roomId: '' })

      // Lock in the trimmed values
      const trimmedUsername = username.trim()
      const trimmedRoomId = roomId.trim()
      sessionRef.current = { username: trimmedUsername, roomId: trimmedRoomId }

      // Switch to connecting view FIRST (optimistic UI)
      setView('connecting')

      // NOW initiate the socket — lazily, for the first time
      socket.connect(SERVER_URL, trimmedRoomId, trimmedUsername)
    },
    [username, roomId, socket]
  )

  // ── React to socket status changes ──────────────────────────────────────────

  useEffect(() => {
    if (socket.status === 'connected') {
      // Server confirmed room join — safe to enter the editor.
      setView('connected')
    }

    if (socket.status === 'error') {
      // Hard failure (no server / server rejected) — let user retry.
      setView('form')
    }

    // ✅ 'disconnected' and 'idle' do NOT bounce to form.
    // The user intentionally left via onLeave → that already calls setView('form').
    // An unexpected disconnect while in the editor just shows a stale view;
    // the user can click Leave to go back.
  }, [socket.status])

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const handleLeave = useCallback(() => {
    socket.disconnect()
    setView('form')
  }, [socket])

  // ── Field change handlers (clear per-field errors) ──────────────────────────

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    if (errors.username) setErrors(prev => ({ ...prev, username: '' }))
  }

  const handleRoomIdChange = (value: string) => {
    setRoomId(value)
    if (errors.roomId) setErrors(prev => ({ ...prev, roomId: '' }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const { username: lockedUsername, roomId: lockedRoomId } = sessionRef.current

  return (
    <AnimatePresence mode="wait">
      {view === 'connected' ? (
        <EditorPage
          key="editor"
          username={lockedUsername}
          roomId={lockedRoomId}
          socket={socket}
          onLeave={handleLeave}
        />
      ) : (
        <motion.div
          key="auth"
          className="relative flex min-h-screen items-center justify-center px-4 py-12"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <AnimatedBackground />

          <div className="relative z-10 w-full max-w-md">
            <AnimatePresence mode="wait">

              {/* ── FORM ──────────────────────────────────────────────────────── */}
              {view === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Brand header */}
              <motion.div
                className="mb-8 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div
                  className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-7 text-white"
                    aria-hidden="true"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Code<span className="text-violet-400">Sync</span>
                </h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Real-time collaborative code editing
                </p>
              </motion.div>

              {/* Glass card */}
              <GlassCard className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white">Join a Room</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Enter your details to start collaborating
                  </p>
                </div>

                {/* Connection error banner */}
                <AnimatePresence>
                  {(socket.status === 'error' || socket.status === 'disconnected') && socket.error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="mt-0.5 size-4 shrink-0 text-rose-400"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-xs leading-relaxed text-rose-300">
                          {socket.error}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  {/* Username */}
                  <InputField
                    id="username"
                    label="Username"
                    type="text"
                    placeholder="e.g. octocat"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    error={errors.username}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-4"
                        aria-hidden="true"
                      >
                        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                      </svg>
                    }
                  />

                  {/* Room ID */}
                  <InputField
                    id="room-id"
                    label="Room ID"
                    type="text"
                    placeholder="e.g. my-room-42"
                    autoComplete="off"
                    value={roomId}
                    onChange={e => handleRoomIdChange(e.target.value)}
                    error={errors.roomId}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-4"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                  />

                  <div className="my-1 border-t border-white/10" />

                  <JoinButton id="join-btn" isLoading={false}>
                    Join Room
                  </JoinButton>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  No account needed — just pick a username and jump in.
                </p>
              </GlassCard>

              {/* Feature badges */}
              <motion.div
                className="mt-6 flex flex-wrap items-center justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                {['Live Sync', 'Multi-lang', 'No signup'].map(badge => (
                  <span
                    key={badge}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm"
                  >
                    <span className="size-1.5 rounded-full bg-violet-400" />
                    {badge}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ── CONNECTING ────────────────────────────────────────────────── */}
          {view === 'connecting' && (
            <ConnectingScreen
              key="connecting"
              roomId={lockedRoomId}
              username={lockedUsername}
            />
          )}

            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
