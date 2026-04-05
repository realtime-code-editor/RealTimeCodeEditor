import { motion } from 'framer-motion'

/**
 * AnimatedBackground — full-screen canvas of animated gradient orbs and
 * a subtle grid pattern that create a living, breathing dark background.
 */
export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Base dark layer */}
      <div className="absolute inset-0 bg-[#0f172a]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Primary violet orb — top left */}
      <motion.div
        className="absolute -top-40 -left-40 size-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.15) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Cyan orb — bottom right */}
      <motion.div
        className="absolute -bottom-60 -right-40 size-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.1) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -25, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Rose accent orb — center right */}
      <motion.div
        className="absolute top-1/3 -right-20 size-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(244,63,94,0.18) 0%, rgba(244,63,94,0.06) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -40, 10, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />

      {/* Small violet spark — top right */}
      <motion.div
        className="absolute top-20 right-1/4 size-[200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -10, 0],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
