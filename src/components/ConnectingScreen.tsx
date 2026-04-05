import { motion } from 'framer-motion'

interface ConnectingScreenProps {
  roomId: string
  username: string
}

/**
 * ConnectingScreen — full-page animated overlay shown while socket is
 * establishing connection and joining the room.
 *
 * States driven by parent; this component is purely presentational.
 */
export default function ConnectingScreen({ roomId, username }: ConnectingScreenProps) {
  return (
    <motion.div
      key="connecting"
      className="flex flex-col items-center justify-center gap-8 text-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Pulsing ring stack */}
      <div className="relative flex items-center justify-center">
        {/* Outermost pulse */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 110,
            height: 110,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Middle pulse */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
        />

        {/* Core icon circle */}
        <div
          className="relative flex size-16 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            boxShadow: '0 0 32px rgba(124,58,237,0.5)',
          }}
        >
          {/* Spinning arc */}
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            className="absolute inset-0 size-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="3"
            />
            <path
              d="M32 4 A28 28 0 0 1 60 32"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </motion.svg>

          {/* Static WiFi-ish icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
          </svg>
        </div>
      </div>

      {/* Text block */}
      <div className="flex flex-col items-center gap-2">
        <motion.h2
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Joining room…
        </motion.h2>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5" aria-label="Connecting" role="status">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      {/* Room info pill */}
      <motion.div
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
      >
        <div className="text-left">
          <p className="text-xs text-slate-500">Connecting as</p>
          <p className="font-mono text-sm font-medium text-violet-300">{username}</p>
        </div>
        <div
          className="h-7 w-px bg-white/10"
          aria-hidden="true"
        />
        <div className="text-left">
          <p className="text-xs text-slate-500">Room</p>
          <p className="font-mono text-sm font-medium text-cyan-300">{roomId}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
