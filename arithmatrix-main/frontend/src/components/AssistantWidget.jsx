import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendAssistantMessage } from '../api/assistantApi.js';

const QUICK_PROMPTS = [
  'help',
  'calculate (25+5)*3',
  'convert 100 USD to INR',
  'weather in New York'
];

const FALLBACK_SUGGESTIONS = [
  'calculate 125 * 8',
  'convert 100 USD to INR',
  'weather in London',
  'help'
];

function createWelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hi. I am your ArithMatrix Assistant. I can help with math, currency conversion, weather, and app usage.',
    mode: 'greeting',
    suggestions: QUICK_PROMPTS,
    time: Date.now()
  };
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [createWelcomeMessage()];

  const normalized = raw
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item, index) => ({
      id: item.id || `msg-${index}-${Date.now()}`,
      role: item.role,
      content: String(item.content || ''),
      mode: item.mode || '',
      suggestions: Array.isArray(item.suggestions) ? item.suggestions.slice(0, 4) : [],
      time: Number(item.time) || Date.now()
    }))
    .filter((item) => item.content.trim().length > 0);

  return normalized.length ? normalized : [createWelcomeMessage()];
}

function loadStoredMessages(storageKey) {
  try {
    if (typeof window === 'undefined') return [createWelcomeMessage()];
    const value = window.localStorage.getItem(storageKey);
    if (!value) return [createWelcomeMessage()];

    return normalizeMessages(JSON.parse(value));
  } catch (_error) {
    return [createWelcomeMessage()];
  }
}

function toApiHistory(messages) {
  return messages
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .map((item) => ({ role: item.role, content: item.content }));
}

function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_error) {
    return '';
  }
}

function modeLabel(mode) {
  if (!mode) return '';
  if (mode === 'openai' || mode === 'huggingface') return 'AI';
  if (mode === 'currency') return 'Currency';
  if (mode === 'weather') return 'Weather';
  if (mode === 'math') return 'Math';
  if (mode === 'help') return 'Help';
  if (mode === 'fallback') return 'Guide';
  return mode.replace(/_/g, ' ');
}

export function AssistantWidget({ compact = false, showOpenLink = false, storageKey = 'assistant-chat' }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredMessages(storageKey));
  const [copiedId, setCopiedId] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const activeSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const item = messages[i];
      if (item.role === 'assistant' && Array.isArray(item.suggestions) && item.suggestions.length) {
        return item.suggestions.slice(0, 4);
      }
    }

    return QUICK_PROMPTS;
  }, [messages]);

  async function handleSend(text) {
    const message = String(text || input).trim();
    if (!message || loading) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message,
      mode: 'user',
      suggestions: [],
      time: Date.now()
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const data = await sendAssistantMessage({
        message,
        history: toApiHistory(nextMessages)
      });

      const assistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data?.reply || 'No response from assistant.',
        mode: data?.mode || 'assistant',
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 4) : FALLBACK_SUGGESTIONS,
        time: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `I hit an error: ${err.message || 'Assistant request failed.'}`,
          mode: 'error',
          suggestions: FALLBACK_SUGGESTIONS,
          time: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setMessages([createWelcomeMessage()]);
    setInput('');
    setCopiedId('');
  }

  async function copyMessage(id, content) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 1200);
      }
    } catch (_error) {
      // Ignore copy failures.
    }
  }

  return (
    <>
      <div className="panel-row panel-row-space">
        <h2>AI Assistant</h2>
        <div className="assistant-top-actions">
          <button type="button" className="ghost-btn" onClick={clearConversation} disabled={loading}>
            New Chat
          </button>
          {showOpenLink ? (
            <Link className="ghost-btn" to="/assistant">
              Open Full Assistant
            </Link>
          ) : null}
        </div>
      </div>

      <p className="hint-text">Ask naturally. I can solve math, check weather, convert currency, and guide app usage.</p>

      <div className="filter-row">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="pill-btn"
            onClick={() => handleSend(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={`assistant-chat-box ${compact ? 'assistant-chat-box-compact' : ''}`} aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`assistant-message ${message.role === 'user' ? 'assistant-message-user' : 'assistant-message-bot'}`}
          >
            <div className="assistant-message-head">
              <p className="assistant-role">{message.role === 'user' ? 'You' : 'Assistant'}</p>
              {message.role === 'assistant' && modeLabel(message.mode) ? (
                <span className="assistant-mode-pill">{modeLabel(message.mode)}</span>
              ) : null}
            </div>
            <p className="assistant-text">{message.content}</p>
            <div className="assistant-message-foot">
              <span className="assistant-time">{formatTime(message.time)}</span>
              {message.role === 'assistant' ? (
                <button
                  type="button"
                  className="assistant-copy-btn"
                  onClick={() => copyMessage(message.id, message.content)}
                >
                  {copiedId === message.id ? 'Copied' : 'Copy'}
                </button>
              ) : null}
            </div>
          </article>
        ))}

        {loading ? (
          <article className="assistant-message assistant-message-bot">
            <p className="assistant-role">Assistant</p>
            <p className="assistant-text assistant-typing">Thinking...</p>
          </article>
        ) : null}

        <div ref={chatEndRef} />
      </div>

      <div className="filter-row">
        {activeSuggestions.map((suggestion) => (
          <button
            key={`s-${suggestion}`}
            type="button"
            className="pill-btn assistant-suggestion-btn"
            onClick={() => handleSend(suggestion)}
            disabled={loading}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="assistant-input-row">
        <textarea
          className="text-input assistant-input"
          rows={compact ? 2 : 3}
          placeholder="Type your question... (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button type="button" className="action-btn" onClick={() => handleSend()} disabled={!canSend}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </>
  );
}
