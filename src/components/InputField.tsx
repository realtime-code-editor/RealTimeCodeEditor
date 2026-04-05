import { motion } from 'framer-motion'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: ReactNode
  error?: string
  id: string
}

/**
 * InputField — accessible, animated form input with floating label support,
 * left icon, and inline error messaging.
 */
export default function InputField({
  label,
  icon,
  error,
  id,
  className = '',
  ...props
}: InputFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex flex-col gap-1.5"
    >
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-400 tracking-wide"
      >
        {label}
      </label>

      <div className="relative group">
        {/* Left icon */}
        <div
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-violet-400"
          aria-hidden="true"
        >
          {icon}
        </div>

        <input
          id={id}
          className={`
            w-full rounded-xl border py-3 pl-10 pr-4 text-sm
            text-slate-100 placeholder:text-slate-600
            bg-white/5 backdrop-blur-sm
            transition-all duration-200 outline-none
            focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60
            ${error
              ? 'border-rose-500/60 ring-2 ring-rose-500/30'
              : 'border-white/10 hover:border-white/20'
            }
            ${className}
          `}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          {...props}
        />

        {/* Focus glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-focus-within:opacity-100"
          style={{
            boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3), 0 4px 20px rgba(139, 92, 246, 0.1)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          id={`${id}-error`}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-rose-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-3.5 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </motion.p>
      )}
    </motion.div>
  )
}
