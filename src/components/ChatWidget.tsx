import React, { useState, useRef, useEffect } from 'react';

/**
 * Cooper & Roscoe — Shop Assistant chat widget.
 *
 * Drop this into your React app (e.g. render it once near the root, like
 * inside App.tsx, so it floats on every page). It talks to your backend
 * at POST /api/chat.
 *
 * LOGO SETUP (required):
 * Save Roscoe's image as `public/roscoe-logo.png` — used on the toggle
 * button and header (the "main" chat icon).
 * Save Cooper's image as `public/cooper-logo.png` — used next to every
 * assistant message and the typing indicator.
 * Vite serves anything in `public/` directly at the site root, so no
 * import needed — MASCOT_LOGO_URL / MESSAGE_AVATAR_URL below already
 * point at those paths.
 *
 * CHAT BACKGROUND SETUP (required):
 * Save chat-background.png into `public/chat-background.png` the same way.
 * It renders faintly behind the messages (an 86% white wash on top keeps
 * text readable) — adjust the 0.86 opacity value below to taste.
 */

const MASCOT_LOGO_URL = '/roscoe-logo.png';
const MESSAGE_AVATAR_URL = '/cooper-logo.png';
const CHAT_BACKGROUND_URL = '/chat-background.png';

// ---------- Message content rendering ----------

// Parses ![alt](url) markdown-image syntax out of plain text and renders
// real <img> tags for those spots, keeping everything else as plain text.
// The backend's system prompt instructs the model to format manual image
// references this way (pointing at /api/image?src=...) specifically so
// this can render them inline instead of showing a raw path as text.
function renderMessageContent(content: string, onImageClick: (url: string) => void): React.ReactNode[] {
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
        onClick={() => onImageClick(url)}
        title="Click to enlarge"
        style={{
          maxWidth: '100%', borderRadius: 6, marginTop: 6, marginBottom: 6,
          display: 'block', border: '1px solid #e5e3de', cursor: 'zoom-in',
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

// ---------- Image lightbox (zoom + rotate) ----------

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(10,10,12,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, zIndex: 2001,
        }}
      >
        <button style={btnStyle} onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}>Zoom +</button>
        <button style={btnStyle} onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>Zoom -</button>
        <button style={btnStyle} onClick={() => setRotation((r) => (r + 90) % 360)}>Rotate</button>
        <button style={btnStyle} onClick={() => { setZoom(1); setRotation(0); }}>Reset</button>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 2001,
          background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer',
        }}
      >
        ×
      </button>

      <img
        src={url}
        alt="Enlarged manual diagram"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '85vw', maxHeight: '80vh',
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transition: 'transform 0.15s ease-out',
          borderRadius: 4, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      />
      <div style={{ color: '#a9a49a', fontSize: 12, marginTop: 14 }}>
        Click outside the image, or press Esc, to close
      </div>
    </div>
  );
}

// ---------- Types ----------

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ---------- Widget ----------

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Meow — Cooper and Roscoe here. Ask us anything about customers, jobs, appointments, the shop, or pull up a service manual for any vehicle.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        { role: 'assistant', content: data.reply ?? "Hmm, couldn't fetch that." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Connection hiccup — try that again in a sec." },
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
            position: 'fixed', bottom: 84, right: 24, zIndex: 1000,
            width: 84, height: 84, borderRadius: '50%',
            background: '#1a1d24', border: '2px solid #d97b29',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            padding: 4, overflow: 'hidden',
          }}
        >
          <img
            src={MASCOT_LOGO_URL}
            alt="Cooper & Roscoe"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 84, right: 24, zIndex: 1000,
            width: expanded ? 'min(720px, calc(100vw - 32px))' : 360,
            maxWidth: 'calc(100vw - 32px)',
            height: expanded ? 'min(85vh, 820px)' : 500,
            maxHeight: 'calc(100vh - 108px)',
            background: '#fff', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            transition: 'width 0.2s ease, height 0.2s ease',
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
            <img
              src={MASCOT_LOGO_URL}
              alt=""
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain', flexShrink: 0, background: '#1a1d24' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Cooper &amp; Roscoe</div>
              <div style={{ fontSize: 10.5, color: '#a9a49a' }}>Shop Assistant</div>
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Shrink chat' : 'Enlarge chat'}
              title={expanded ? 'Shrink chat' : 'Enlarge chat'}
              style={{
                background: 'transparent', border: 'none', color: '#a9a49a',
                fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: 4,
              }}
            >
              {expanded ? '⤡' : '⤢'}
            </button>
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
            style={{
              flex: 1, overflowY: 'auto', padding: '14px 12px',
              backgroundImage: `linear-gradient(rgba(247,246,243,0.86), rgba(247,246,243,0.86)), url(${CHAT_BACKGROUND_URL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
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
                  <img
                    src={MESSAGE_AVATAR_URL}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', background: '#1a1d24', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
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
                  {renderMessageContent(m.content, setLightboxUrl)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <img
                  src={MESSAGE_AVATAR_URL}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', background: '#1a1d24', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
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

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  );
}
