import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type HotkeyAction =
  | 'playPause'
  | 'speedUp'
  | 'speedDown'
  | 'scrollBack'
  | 'scrollForward'
  | 'restart'

type HotkeyMap = Record<HotkeyAction, string>

type Settings = {
  scrollSpeed: number
  fontSize: number
  lineHeight: number
  theme: 'dark' | 'light'
  mirror: boolean
  hotkeys: HotkeyMap
}

const DEFAULT_HOTKEYS: HotkeyMap = {
  playPause: ' ',
  speedUp: 'ArrowUp',
  speedDown: 'ArrowDown',
  scrollBack: 'ArrowLeft',
  scrollForward: 'ArrowRight',
  restart: 'r',
}

const DEFAULT_SETTINGS: Settings = {
  scrollSpeed: 60,
  fontSize: 36,
  lineHeight: 1.6,
  theme: 'dark',
  mirror: false,
  hotkeys: DEFAULT_HOTKEYS,
}

const STORAGE_KEY = 'promptflow-settings-v1'
const SCROLL_KEY = 'promptflow-scroll-v1'

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hotkeys: { ...DEFAULT_HOTKEYS, ...(parsed.hotkeys ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function formatTextForSpeech(raw: string): string {
  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .trim()

  if (!cleaned) return ''

  const sentenceRegex = /[^.!?]+[.!?]?/g
  const sentences = cleaned.match(sentenceRegex) ?? [cleaned]

  const lines: string[] = []
  const MAX_WORDS = 12

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    const words = trimmed.split(' ')
    let current: string[] = []

    for (const word of words) {
      current.push(word)
      if (current.length >= MAX_WORDS) {
        lines.push(current.join(' '))
        current = []
      }
    }

    if (current.length) {
      lines.push(current.join(' '))
    }

    lines.push('')
  }

  while (lines.length && !lines[lines.length - 1]) {
    lines.pop()
  }

  return lines.join('\n')
}

type PlayState = 'idle' | 'playing' | 'paused'

function App() {
  const [rawText, setRawText] = useState('')
  const [formattedText, setFormattedText] = useState('')
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [isEditingHotkeys, setIsEditingHotkeys] = useState<HotkeyAction | null>(
    null,
  )
  const [speedOverlay, setSpeedOverlay] = useState<number | null>(null)
  const [isSlowMode, setIsSlowMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFloatingControls, setShowFloatingControls] = useState(true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const isUserTypingRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const scrollSaveFrameRef = useRef<number | null>(null)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const applyFormat = useCallback(() => {
    const formatted = formatTextForSpeech(rawText)
    setFormattedText(formatted)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SCROLL_KEY)
    }
    setPlayState('idle')
  }, [rawText])

  const lines = useMemo(
    () => (formattedText ? formattedText.split('\n') : []),
    [formattedText],
  )

  useEffect(() => {
    if (playState !== 'playing') {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastTimestampRef.current = null
      return
    }

    const step = (timestamp: number) => {
      if (!containerRef.current) return
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }
      const deltaMs = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp

      const pixelsPerSecond = settings.scrollSpeed * (isSlowMode ? 0.4 : 1)
      const deltaPx = (pixelsPerSecond * deltaMs) / 1000

      containerRef.current.scrollTop += deltaPx

      const atBottom =
        Math.ceil(containerRef.current.scrollTop) >=
        containerRef.current.scrollHeight - containerRef.current.clientHeight - 1

      if (!atBottom) {
        animationFrameRef.current = requestAnimationFrame(step)
      } else {
        setPlayState('idle')
        animationFrameRef.current = null
        lastTimestampRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastTimestampRef.current = null
    }
  }, [playState, settings.scrollSpeed, isSlowMode])

  const togglePlayPause = useCallback(() => {
    setPlayState((prev) => {
      if (prev === 'playing') return 'paused'
      if (prev === 'paused' || prev === 'idle') {
        if (!formattedText) return prev
        return 'playing'
      }
      return prev
    })
  }, [formattedText])

  const adjustSpeed = useCallback((delta: number) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        scrollSpeed: Math.min(300, Math.max(10, prev.scrollSpeed + delta)),
      }
      setSpeedOverlay(next.scrollSpeed)
      return next
    })
  }, [])

  useEffect(() => {
    if (speedOverlay === null) return
    const id = window.setTimeout(() => setSpeedOverlay(null), 1000)
    return () => window.clearTimeout(id)
  }, [speedOverlay])

  const scrollByLines = useCallback((linesDelta: number) => {
    if (!containerRef.current) return
    const lineHeightPx = settings.fontSize * settings.lineHeight
    containerRef.current.scrollTop += linesDelta * lineHeightPx
  }, [settings.fontSize, settings.lineHeight])

  const restart = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SCROLL_KEY)
    }
    setPlayState('idle')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
        setShowFloatingControls(true)
        return
      }

      if (isUserTypingRef.current) return
      if (isEditingHotkeys) return

      const key = event.key
      const { hotkeys } = settings

      const action = (Object.keys(hotkeys) as HotkeyAction[]).find(
        (act) => hotkeys[act] === key,
      )

      if (!action) return

      event.preventDefault()

      switch (action) {
        case 'playPause':
          togglePlayPause()
          break
        case 'speedUp':
          adjustSpeed(10)
          break
        case 'speedDown':
          adjustSpeed(-10)
          break
        case 'scrollBack':
          scrollByLines(-3)
          break
        case 'scrollForward':
          scrollByLines(3)
          break
        case 'restart':
          restart()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settings, togglePlayPause, adjustSpeed, scrollByLines, restart, isEditingHotkeys])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleShiftDown = (event: KeyboardEvent) => {
      if (isUserTypingRef.current) return
      if (event.key === 'Shift') {
        setIsSlowMode(true)
      }
    }

    const handleShiftUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsSlowMode(false)
      }
    }

    window.addEventListener('keydown', handleShiftDown)
    window.addEventListener('keyup', handleShiftUp)
    return () => {
      window.removeEventListener('keydown', handleShiftDown)
      window.removeEventListener('keyup', handleShiftUp)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(SCROLL_KEY)
    if (!stored) return
    const value = Number(stored)
    if (!Number.isFinite(value)) return
    if (containerRef.current) {
      containerRef.current.scrollTop = value
    }
  }, [])

  const handleFocusInput = () => {
    isUserTypingRef.current = true
  }

  const handleBlurInput = () => {
    isUserTypingRef.current = false
  }

  const beginEditHotkey = (action: HotkeyAction) => {
    setIsEditingHotkeys(action)
  }

  useEffect(() => {
    if (!isEditingHotkeys) return

    const handleCapture = (event: KeyboardEvent) => {
      event.preventDefault()

      const newKey = event.key
      const conflict = (Object.keys(settings.hotkeys) as HotkeyAction[]).find(
        (act) => act !== isEditingHotkeys && settings.hotkeys[act] === newKey,
      )
      if (conflict) {
        return
      }

      setSettings((prev) => ({
        ...prev,
        hotkeys: {
          ...prev.hotkeys,
          [isEditingHotkeys]: newKey,
        },
      }))
      setIsEditingHotkeys(null)
    }

    window.addEventListener('keydown', handleCapture, { once: true })
    return () => window.removeEventListener('keydown', handleCapture)
  }, [isEditingHotkeys, settings.hotkeys])

  const resetHotkeys = () => {
    setSettings((prev) => ({
      ...prev,
      hotkeys: DEFAULT_HOTKEYS,
    }))
    setIsEditingHotkeys(null)
  }

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }))
  }

  const toggleMirror = () => {
    setSettings((prev) => ({
      ...prev,
      mirror: !prev.mirror,
    }))
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background:
                'radial-gradient(circle at 0 0, #4b5563 0, #020617 55%, #020617 100%)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>PromptFlow</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Intelligent teleprompter for spoken flow
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: '#9ca3af',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: playState === 'playing' ? '#4b5563' : '#374151',
              color: '#e5e7eb',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor:
                  playState === 'playing' ? '#22c55e' : '#6b7280',
                boxShadow: '0 0 0 0 rgba(0,0,0,0)',
              }}
            />
            {playState === 'playing'
              ? 'Playing'
              : playState === 'paused'
                ? 'Paused'
                : 'Ready'}
          </span>
          <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span>
          <span style={{ display: 'none' }}>
            Press{' '}
            <kbd
              style={{
                borderRadius: 4,
                border: '1px solid #404040',
                backgroundColor: '#020617',
                padding: '0 4px',
                fontSize: 10,
              }}
            >
              {settings.hotkeys.playPause === ' '
                ? 'Space'
                : settings.hotkeys.playPause}
            </kbd>{' '}
            to play/pause
          </span>
        </div>
      </header>

      <main className="app-main">
        {!isFullscreen && (
          <section className="script-panel">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Script
            </h2>
            <button
              type="button"
              onClick={applyFormat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                border: '1px solid #3b82f6',
                background:
                  'linear-gradient(to right, rgba(37,99,235,0.18), rgba(15,23,42,0.9))',
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 500,
                color: '#dbeafe',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: '#60a5fa',
                }}
              />
              Format for speech
            </button>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onFocus={handleFocusInput}
            onBlur={handleBlurInput}
            placeholder="Paste your script here. Then click “Format for speech” to break it into natural spoken lines."
            className="script-textarea"
          />

          <div
            style={{
              marginTop: 4,
              padding: 12,
              borderRadius: 12,
              border: '1px solid #171717',
              backgroundColor: 'rgba(3,7,18,0.9)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                }}
              >
                Display & speed
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #404040',
                    backgroundColor: '#020617',
                    padding: '2px 8px',
                    fontSize: 10,
                    color: '#e5e7eb',
                    cursor: 'pointer',
                  }}
                >
                  {settings.theme === 'dark' ? 'Dark' : 'Light'}
                </button>
                <button
                  type="button"
                  onClick={toggleMirror}
                  style={{
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: settings.mirror ? '#60a5fa' : '#404040',
                    backgroundColor: settings.mirror
                      ? 'rgba(37,99,235,0.12)'
                      : '#020617',
                    padding: '2px 8px',
                    fontSize: 10,
                    color: settings.mirror ? '#dbeafe' : '#e5e7eb',
                    cursor: 'pointer',
                  }}
                >
                  Mirror
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen((prev) => !prev)
                    setShowFloatingControls(true)
                  }}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #4b5563',
                    backgroundColor: '#020617',
                    padding: '2px 8px',
                    fontSize: 10,
                    color: '#e5e7eb',
                    cursor: 'pointer',
                  }}
                >
                  {isFullscreen ? 'Exit full screen' : 'Full screen'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#9ca3af',
                }}
              >
                <span>Scroll speed</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(settings.scrollSpeed)} px/s
                </span>
              </label>
              <input
                type="range"
                min={10}
                max={300}
                value={settings.scrollSpeed}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    scrollSpeed: Number(e.target.value),
                  }))
                }
                style={{ width: '100%' }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#9ca3af',
                  }}
                >
                  <span>Font size</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {settings.fontSize}px
                  </span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={64}
                  value={settings.fontSize}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      fontSize: Number(e.target.value),
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#9ca3af',
                  }}
                >
                  <span>Line spacing</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {settings.lineHeight.toFixed(1)}x
                  </span>
                </label>
                <input
                  type="range"
                  min={1.2}
                  max={2}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      lineHeight: Number(e.target.value),
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 11,
              }}
            >
              <button
                type="button"
                onClick={togglePlayPause}
                style={{
                  borderRadius: 999,
                  border: '1px solid #22c55e',
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  padding: '4px 10px',
                  color: '#bbf7d0',
                  cursor: 'pointer',
                }}
              >
                {playState === 'playing' ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => adjustSpeed(10)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #374151',
                  backgroundColor: '#020617',
                  padding: '4px 10px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Faster
              </button>
              <button
                type="button"
                onClick={() => adjustSpeed(-10)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #374151',
                  backgroundColor: '#020617',
                  padding: '4px 10px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Slower
              </button>
              <button
                type="button"
                onClick={() => scrollByLines(-3)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #374151',
                  backgroundColor: '#020617',
                  padding: '4px 10px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => scrollByLines(3)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #374151',
                  backgroundColor: '#020617',
                  padding: '4px 10px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Forward
              </button>
              <button
                type="button"
                onClick={restart}
                style={{
                  borderRadius: 999,
                  border: '1px solid #374151',
                  backgroundColor: '#020617',
                  padding: '4px 10px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Restart
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 4,
              padding: 12,
              borderRadius: 12,
              border: '1px solid #171717',
              backgroundColor: 'rgba(3,7,18,0.9)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                }}
              >
                Keyboard control
              </h3>
              <button
                type="button"
                onClick={resetHotkeys}
                style={{
                  borderRadius: 999,
                  border: '1px solid #404040',
                  backgroundColor: '#020617',
                  padding: '2px 8px',
                  fontSize: 10,
                  color: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Reset to default
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
                columnGap: 12,
                rowGap: 6,
                fontSize: 11,
                color: '#e5e7eb',
              }}
            >
              {(
                [
                  ['Play / Pause', 'playPause'],
                  ['Speed up', 'speedUp'],
                  ['Slow down', 'speedDown'],
                  ['Scroll back', 'scrollBack'],
                  ['Scroll forward', 'scrollForward'],
                  ['Restart', 'restart'],
                ] as [string, HotkeyAction][]
              ).map(([label, action]) => (
                <Fragment key={action}>
                  <div style={{ color: '#9ca3af' }}>{label}</div>
                  <button
                    type="button"
                    onClick={() => beginEditHotkey(action)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 4,
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: isEditingHotkeys === action ? '#22c55e' : '#404040',
                      backgroundColor:
                        isEditingHotkeys === action
                          ? 'rgba(34,197,94,0.12)'
                          : '#020617',
                      padding: '4px 8px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      {settings.hotkeys[action] === ' '
                        ? 'Space'
                        : settings.hotkeys[action]}
                    </span>
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>
                      {isEditingHotkeys === action ? 'Press key…' : 'Change'}
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
        )}

        <section className="teleprompter-shell">
          <div
            ref={containerRef}
            className="teleprompter-scroll"
            style={{
              transform: settings.mirror ? 'scaleX(-1)' : 'none',
            }}
            onScroll={() => {
              if (typeof window === 'undefined' || !containerRef.current) return
              if (scrollSaveFrameRef.current !== null) {
                cancelAnimationFrame(scrollSaveFrameRef.current)
              }
              const target = containerRef.current
              scrollSaveFrameRef.current = requestAnimationFrame(() => {
                window.localStorage.setItem(
                  SCROLL_KEY,
                  String(target.scrollTop),
                )
              })
            }}
          >
            <div
              className="teleprompter-lines"
              style={{
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
              }}
            >
              {lines.length === 0 ? (
                <div
                  style={{
                    marginTop: 64,
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#9ca3af',
                  }}
                >
                  Paste text on the left and click{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      borderRadius: 999,
                      border: '1px solid #404040',
                      backgroundColor: '#020617',
                      padding: '2px 8px',
                      fontSize: 11,
                      color: '#e5e7eb',
                    }}
                  >
                    Format for speech
                  </span>{' '}
                  to generate your teleprompter script.
                </div>
              ) : (
                <div>
                  {lines.map((line, idx) =>
                    line.trim() === '' ? (
                      <div key={idx} className="teleprompter-gap" />
                    ) : (
                      <p
                        key={idx}
                        className="teleprompter-line"
                      >
                        {line}
                      </p>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="teleprompter-mask-top" />
          <div className="teleprompter-mask-bottom" />

          {isFullscreen && showFloatingControls && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                width: 260,
                borderRadius: 16,
                border: '1px solid #111827',
                backgroundColor: 'rgba(3,7,18,0.96)',
                padding: 12,
                boxShadow: '0 22px 60px rgba(0,0,0,0.95)',
                fontSize: 11,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#9ca3af',
                  }}
                >
                  Teleprompter
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid #4b5563',
                      backgroundColor: '#020617',
                      padding: '2px 8px',
                      fontSize: 10,
                      color: '#e5e7eb',
                      cursor: 'pointer',
                    }}
                  >
                    Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFloatingControls(false)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid transparent',
                      backgroundColor: 'transparent',
                      padding: '2px 6px',
                      fontSize: 12,
                      color: '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <button
                  type="button"
                  onClick={togglePlayPause}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #22c55e',
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    padding: '4px 10px',
                    color: '#bbf7d0',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {playState === 'playing' ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={() => adjustSpeed(10)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #374151',
                    backgroundColor: '#020617',
                    padding: '4px 10px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Faster
                </button>
                <button
                  type="button"
                  onClick={() => adjustSpeed(-10)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #374151',
                    backgroundColor: '#020617',
                    padding: '4px 10px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Slower
                </button>
                <button
                  type="button"
                  onClick={() => scrollByLines(-3)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #374151',
                    backgroundColor: '#020617',
                    padding: '4px 10px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => scrollByLines(3)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #374151',
                    backgroundColor: '#020617',
                    padding: '4px 10px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Forward
                </button>
                <button
                  type="button"
                  onClick={restart}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #374151',
                    backgroundColor: '#020617',
                    padding: '4px 10px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Restart
                </button>
              </div>

              <div style={{ marginTop: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#9ca3af',
                    marginBottom: 4,
                  }}
                >
                  <span>Speed</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(settings.scrollSpeed)} px/s
                  </span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={300}
                  value={settings.scrollSpeed}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      scrollSpeed: Number(e.target.value),
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {isFullscreen && !showFloatingControls && (
            <button
              type="button"
              onClick={() => setShowFloatingControls(true)}
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                borderRadius: 999,
                border: '1px solid #4b5563',
                backgroundColor: 'rgba(3,7,18,0.9)',
                padding: '4px 10px',
                fontSize: 11,
                color: '#e5e7eb',
                cursor: 'pointer',
                boxShadow: '0 16px 40px rgba(0,0,0,0.9)',
              }}
            >
              Show controls
            </button>
          )}
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#9ca3af',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                border: '1px solid #404040',
                backgroundColor: 'rgba(1,3,10,0.95)',
                padding: '6px 12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
              }}
            >
              <span style={{ color: '#6b7280' }}>Controls</span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: '#52525b',
                }}
              />
              <span>
                <kbd
                  style={{
                    borderRadius: 4,
                    border: '1px solid #404040',
                    backgroundColor: '#020617',
                    padding: '0 4px',
                    fontSize: 10,
                  }}
                >
                  {settings.hotkeys.playPause === ' '
                    ? 'Space'
                    : settings.hotkeys.playPause}
                </kbd>{' '}
                play / pause
              </span>
              <span style={{ display: 'none' }}>
                <kbd
                  style={{
                    borderRadius: 4,
                    border: '1px solid #404040',
                    backgroundColor: '#020617',
                    padding: '0 4px',
                    fontSize: 10,
                  }}
                >
                  {settings.hotkeys.speedUp}
                </kbd>{' '}
                faster
              </span>
              <span style={{ display: 'none' }}>
                <kbd
                  style={{
                    borderRadius: 4,
                    border: '1px solid #404040',
                    backgroundColor: '#020617',
                    padding: '0 4px',
                    fontSize: 10,
                  }}
                >
                  {settings.hotkeys.speedDown}
                </kbd>{' '}
                slower
              </span>
            </div>
          </div>

          {speedOverlay !== null && (
            <div
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                right: 16,
                top: 16,
                borderRadius: 999,
                border: '1px solid rgba(45,212,191,0.6)',
                backgroundColor: 'rgba(0,0,0,0.75)',
                padding: '6px 12px',
                fontSize: 11,
                color: '#a7f3d0',
                boxShadow: '0 18px 45px rgba(0,0,0,0.9)',
              }}
            >
              Speed {Math.round(speedOverlay)} px/s
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
