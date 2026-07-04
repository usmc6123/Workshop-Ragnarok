import React, { useState, useRef, useEffect } from 'react';

/**
 * Cooper & Roscoe — Shop Assistant chat widget.
 *
 * Drop this into your React app (e.g. render it once near the root, like
 * inside App.tsx, so it floats on every page). It talks to your backend
 * at POST /api/chat.
 *
 * SWAPPING IN REAL PHOTOS:
 * Replace <CooperAvatar /> and <RoscoeAvatar /> below with real <img> tags
 * pointing at your existing asset paths, e.g.:
 *   usmc6123/images/cooper-avatar.png
 *   usmc6123/images/roscoe-avatar.png
 * (same repo pattern you already use for loginpagebackground.jpg / cats-logo.png)
 * The illustrated SVGs here are just placeholders so this works out of the box.
 */

// ---------- Cat avatars (placeholder SVGs — swap for real photos anytime) ----------

const CooperAvatar = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
    <circle cx="20" cy="20" r="20" fill="#22232a" />
    <path d="M9 12 L15 4 L18 13 Z" fill="#22232a" />
    <path d="M31 12 L25 4 L22 13 Z" fill="#22232a" />
    <ellipse cx="20" cy="23" rx="11" ry="9" fill="#f4f1ea" />
    <circle cx="15.5" cy="21" r="2" fill="#22232a" />
    <circle cx="24.5" cy="21" r="2" fill="#22232a" />
    <path d="M18.5 25 Q20 27 21.5 25" stroke="#22232a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M20 24.3 L20 25.3" stroke="#22232a" strokeWidth="1.2" />
  </svg>
);

const RoscoeAvatar = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
    <circle cx="20" cy="20" r="20" fill="#9a9ca3" />
    <path d="M9 12 L15 4 L18 13 Z" fill="#9a9ca3" />
    <path d="M31 12 L25 4 L22 13 Z" fill="#9a9ca3" />
    <ellipse cx="20" cy="24" rx="12" ry="9.5" fill="#e9e7e2" />
    <circle cx="15.5" cy="22" r="2" fill="#4a4c52" />
    <circle cx="24.5" cy="22" r="2" fill="#4a4c52" />
    <path d="M18.3 26 Q20 28 21.7 26" stroke="#4a4c52" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M20 25.3 L20 26.3" stroke="#4a4c52" strokeWidth="1.2" />
  </svg>
);

const DuoBadge = ({ size = 56 }: { size?: number }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <div style={{ position: 'absolute', left: 0, top: size * 0.15 }}>
      <CooperAvatar size={size * 0.68} />
    </div>
    <div style={{ position: 'absolute', right: 0, top: 0 }}>
      <RoscoeAvatar size={size * 0.68} />
    </div>
  </div>
);

// ---------- Message content rendering ----------

// Parses ![alt](url) markdown-image syntax out of plain text and renders
// real <img> tags for those spots, keeping everything else as plain text.
// The backend's system prompt instructs the model to format manual image
// references this way (pointing at /api/image?src=...) specifically so
// this can render them inline instead of showing a raw path as text.
function renderMessageContent(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
    }
    const [, alt, url] = match;
    parts.push(
      <img
        key={key++}
        src={url}
        alt={alt || 'manual diagram'}
        style={{
          maxWidth: '100%', borderRadius: 6, marginTop: 6, marginBottom: 6,
          display: 'block', border: '1px solid #e5e3de',
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }
  return parts;
}

// ---------- Types ----------

interface Message {
  role: 'user' | 'assistant';
  content: string;
  avatar?: 'cooper' | 'roscoe';
}

// ---------- Widget ----------

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Meow — Cooper and Roscoe here. Ask us anything about customers, jobs, appointments, or the shop.",
      avatar: 'roscoe',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextAvatar = useRef<'cooper' | 'roscoe'>('cooper');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // alternate which cat "answers" each turn
    const avatar = nextAvatar.current;
    nextAvatar.current = avatar === 'cooper' ? 'roscoe' : 'cooper';

    try {
      const token = localStorage.getItem('workshop_token');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? "Hmm, couldn't fetch that.", avatar },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Connection hiccup — try that again in a sec.", avatar },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Cooper & Roscoe chat"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            width: 64, height: 64, borderRadius: '50%',
            background: '#1a1d24', border: '2px solid #d97b29',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          }}
        >
          <DuoBadge size={44} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            width: 360, maxWidth: 'calc(100vw - 32px)', height: 500, maxHeight: 'calc(100vh - 48px)',
            background: '#fff', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#1a1d24', color: '#f4f1ea',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '3px solid #d97b29',
            }}
          >
            <DuoBadge size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Cooper &amp; Roscoe</div>
              <div style={{ fontSize: 10.5, color: '#a9a49a' }}>Shop Assistant</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                background: 'transparent', border: 'none', color: '#a9a49a',
                fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: '#f7f6f3' }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 8, marginBottom: 12,
                  flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                {m.role === 'assistant' && (
                  <div style={{ flexShrink: 0 }}>
                    {m.avatar === 'cooper' ? <CooperAvatar size={28} /> : <RoscoeAvatar size={28} />}
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    background: m.role === 'user' ? '#d97b29' : '#fff',
                    color: m.role === 'user' ? '#fff' : '#23272f',
                    padding: '8px 11px',
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.45,
                    boxShadow: m.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <RoscoeAvatar size={28} />
                <div
                  style={{
                    background: '#fff', padding: '8px 11px', borderRadius: 10,
                    fontSize: 13, color: '#9a9a9a', boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  typing…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #e5e3de', background: '#fff' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about a job, customer, or the shop…"
              style={{
                flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px',
                fontSize: 13, outline: 'none', color: '#23272f',
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{
                background: '#1a1d24', color: '#fff', border: 'none', borderRadius: 8,
                padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
