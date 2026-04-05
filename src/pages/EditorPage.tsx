import { useState } from 'react'
import { motion } from 'framer-motion'
import Editor from '@monaco-editor/react'
import { UseSocketReturn } from '../hooks/useSocket'

interface EditorPageProps {
  username: string
  roomId: string
  socket: UseSocketReturn
  onLeave: () => void
}

export default function EditorPage({ username, roomId, socket, onLeave }: EditorPageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div 
      className="flex h-screen flex-col bg-navy-950 font-sans text-slate-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* Topbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-navy-800 bg-navy-900/80 px-6 backdrop-blur-md shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2 shadow-lg shadow-violet-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-white">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-wide text-slate-100">Code<span className="text-violet-400">Sync</span></h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-1.5 pl-3 transition-colors hover:border-white/20">
            <div className="flex flex-col justify-center hidden sm:flex">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Room</span>
              <span className="font-mono text-sm font-semibold text-cyan-300">{roomId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex size-8 items-center justify-center rounded-md bg-white/10 text-slate-300 transition-all hover:bg-violet-500 hover:text-white"
              title="Copy Room ID"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-emerald-300"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              )}
            </button>
          </div>
          
          <div className="h-8 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
          
          <div className="items-center gap-3 border border-white/5 p-1.5 pl-3 rounded-lg bg-navy-800/50 shadow-inner hidden md:flex">
             <div className="flex flex-col pr-2 text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">You</span>
                <span className="font-mono text-sm font-medium text-violet-300">{username}</span>
             </div>
             {/* Dummy users logic for UI representation */}
             <div className="flex -space-x-2 mr-1">
               <div className="flex size-7 items-center justify-center rounded-full border border-navy-900 bg-violet-600 font-semibold text-white text-[10px] z-20" title={username}>
                 {username.substring(0, 2).toUpperCase()}
               </div>
               <div className="flex size-7 items-center justify-center rounded-full border border-navy-900 bg-emerald-600 font-semibold text-white text-[10px] z-10 opacity-70" title="John Doe">
                 JD
               </div>
               <div className="flex size-7 items-center justify-center rounded-full border border-navy-900 bg-amber-500 font-semibold text-white text-[10px] z-0 opacity-70" title="Alice Smith">
                 AS
               </div>
             </div>
          </div>

          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500 hover:text-white max-sm:px-3 max-sm:py-1.5"
            title="Leave Room"
          >
            <span className="hidden sm:inline">Leave</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Editor Main */}
      <main className="flex-1 bg-[#1e1e1e] relative">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          defaultValue="// Welcome to CodeSync! Start typing...&#10;function hello() {&#10;  console.log('Real-time collaboration is coming soon!');&#10;}&#10;"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            lineHeight: 24,
            padding: { top: 24, bottom: 24 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnPaste: true,
            scrollBeyondLastLine: false,
          }}
          loading={
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="size-8 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
                <p className="text-sm font-medium text-slate-400 animate-pulse">Loading Editor...</p>
              </div>
            </div>
          }
        />
      </main>
    </motion.div>
  )
}
