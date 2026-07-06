import React, { useState, useEffect } from 'react';

const MESSAGES = [
  "Need a paw with something? I'm right here!",
  "Got a question? Cooper and Roscoe are on shift.",
  "Stuck on a repair order? Just meow at me.",
  "I've read every manual in here. Ask away.",
  "Two cats, zero judgment. What do you need?",
  "Purr-fect timing. What can I help with?",
  "Claw-some question incoming? I'm ready.",
  "Don't paws for too long, I don't bite.",
  "Feline stuck? Let's fix that.",
  "I've got nine lives and zero patience for bad brakes.",
  "Whisker me a question anytime.",
  "This shop runs on cat power. Ask away.",
  "Fur real, I'm here if you need me.",
  "No task too small, no yarn too tangled.",
  "Cat-ch me if you need a hand.",
  "I'm paw-sitive I can help with that.",
  "Meow's a great time to ask me something.",
  "Hiss-terically good at answering questions.",
  "Cooper's napping, but I'm on it. Ask away.",
  "Roscoe says hi. So do I. What's up?",
];

function pickRandomIndex(excludeIndex) {
  if (MESSAGES.length <= 1) return 0;
  let next = Math.floor(Math.random() * MESSAGES.length);
  while (next === excludeIndex) {
    next = Math.floor(Math.random() * MESSAGES.length);
  }
  return next;
}

export default function ChatWidgetTeaser({ onOpen, children, intervalMs = 45000, visibleMs = 5000 }) {
  const [visible, setVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(() => pickRandomIndex(-1));

  useEffect(() => {
    const initialTimer = setTimeout(() => setVisible(true), 3000);

    const cycle = setInterval(() => {
      setMessageIndex((prev) => pickRandomIndex(prev));
      setVisible(true);
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycle);
    };
  }, [intervalMs]);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), visibleMs);
    return () => clearTimeout(hideTimer);
  }, [visible, visibleMs]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 12px)',
          right: 0,
          maxWidth: 220,
          background: '#1a2320',
          border: '1px solid #d97b2e',
          borderRadius: '14px 14px 2px 14px',
          padding: '10px 14px',
          fontSize: 14,
          color: '#f2e8d5',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: visible ? 'auto' : 'none',
          cursor: 'pointer',
        }}
        onClick={onOpen}
      >
        {MESSAGES[messageIndex]}
      </div>

      <button
        onClick={onOpen}
        aria-label="Open chat with Cooper and Roscoe"
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          borderRadius: '50%',
          animation: 'chatWidgetPulse 2.4s infinite',
        }}
      >
        {children}
      </button>

      <style>{`
        @keyframes chatWidgetPulse {
          0% { box-shadow: 0 0 0 0 rgba(217,123,46,0.5); border-radius: 50%; }
          70% { box-shadow: 0 0 0 10px rgba(217,123,46,0); border-radius: 50%; }
          100% { box-shadow: 0 0 0 0 rgba(217,123,46,0); border-radius: 50%; }
        }
      `}</style>
    </div>
  );
}
