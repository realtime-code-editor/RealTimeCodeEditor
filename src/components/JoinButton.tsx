import { motion } from 'framer-motion'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type NativeButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
>

interface JoinButtonProps extends NativeButtonProps {
  children: ReactNode
  isLoading?: boolean
}


/**
 * JoinButton — gradient CTA button with hover scale, tap press, and shimmer
 * sweep animation on hover. Shows a spinner when isLoading is true.
 */
export default function JoinButton({
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: JoinButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <motion.button
      type="submit"
      whileHover={isDisabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`
        group relative w-full overflow-hidden rounded-xl py-3.5 px-6
        text-sm font-semibold text-white tracking-wide
        transition-all duration-300 outline-none
        focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900
        disabled:cursor-not-allowed disabled:opacity-60
        ${className}
      `}
      style={{
        background: isDisabled
          ? 'linear-gradient(135deg, #6d28d9, #4338ca)'
          : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4f46e5 100%)',
        boxShadow: isDisabled ? 'none' : '0 4px 24px rgba(124, 58, 237, 0.4)',
      }}
      {...props}
    >
      {/* Shimmer sweep on hover */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden="true"
      />

      {/* Radial glow overlay */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Joining...
          </>
        ) : (
          <>
            {children}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </span>
    </motion.button>
  )
}
