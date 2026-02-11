import { useEffect, useMemo, useState } from 'react';
import { fetchTranslateLanguages, translateText } from '../api/translateApi.js';

const FALLBACK_LANGS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }
];

function TranslateFabIcon() {
  return (
    <span className="translate-fab-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm6.93 9h-3.16a15.17 15.17 0 0 0-1.17-5.23A8.02 8.02 0 0 1 18.93 11ZM12 4.07c.88 1.03 1.79 3.1 2.16 6.93H9.84c.37-3.83 1.28-5.9 2.16-6.93ZM4.07 13h3.16a15.17 15.17 0 0 0 1.17 5.23A8.02 8.02 0 0 1 4.07 13Zm3.16-2H4.07a8.02 8.02 0 0 1 4.33-5.23A15.17 15.17 0 0 0 7.23 11Zm4.77 8.93c-.88-1.03-1.79-3.1-2.16-6.93h4.32c-.37 3.83-1.28 5.9-2.16 6.93ZM13.6 18.23A15.17 15.17 0 0 0 14.77 13h3.16a8.02 8.02 0 0 1-4.33 5.23Z"
          fill="currentColor"
        />
        <path
          d="M6 8.75h2.02L9.3 12H8.2l-.32-.86h-1.7l-.3.86H4.8L6 8.75Zm.4 1.66h1.1l-.54-1.47-.56 1.47ZM11.5 9.42h-1.26v-.67h3.5v.67h-1.26V12H11.5V9.42Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function TranslatePopup({ hasFixedBottomNav = false, placement = 'floating', jumpTargetId = 'translation-operations' }) {
  const isHeaderPlacement = placement === 'header';
  const isInlinePlacement = placement === 'inline';
  const isJumpPlacement = placement === 'jump';
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState(FALLBACK_LANGS);
  const [from, setFrom] = useState('en');
  const [to, setTo] = useState('es');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTranslateLanguages().then((list) => {
      setLanguages(list);

      const codes = new Set(list.map((item) => item.code));
      if (!codes.has(from)) {
        setFrom(list[0]?.code || 'en');
      }
      if (!codes.has(to)) {
        setTo(list[1]?.code || list[0]?.code || 'es');
      }
    });
  }, []);

  const canTranslate = useMemo(() => {
    return Boolean(inputText.trim()) && Boolean(from) && Boolean(to) && !loading;
  }, [inputText, from, to, loading]);

  async function onTranslate() {
    if (!canTranslate) return;

    setLoading(true);
    setError('');

    try {
      const data = await translateText({
        text: inputText.trim(),
        from,
        to
      });
      setTranslatedText(data?.translatedText || '');
    } catch (err) {
      setError(err.message || 'Translation failed');
      setTranslatedText('');
    } finally {
      setLoading(false);
    }
  }

  function swapLanguages() {
    setFrom(to);
    setTo(from);
    setTranslatedText('');
    setError('');
  }

  function jumpToTranslateSection() {
    if (typeof document === 'undefined') return;
    const section = document.getElementById(jumpTargetId);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.add('translate-target-flash');
    window.setTimeout(() => {
      section.classList.remove('translate-target-flash');
    }, 520);
  }

  if (isJumpPlacement) {
    return (
      <aside className="translate-widget translate-widget-header translate-widget-jump" aria-label="Quick translation jump">
        <button type="button" className="translate-fab translate-jump-btn" aria-label="Go to translation section" onClick={jumpToTranslateSection}>
          <TranslateFabIcon />
          <span className="translate-fab-label">Translation</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`translate-widget ${isHeaderPlacement ? 'translate-widget-header' : ''} ${
        isInlinePlacement ? 'translate-widget-inline' : ''
      } ${
        hasFixedBottomNav && !isHeaderPlacement ? 'translate-widget-with-tabs' : ''
      }`}
      aria-label="Quick translation popup"
    >
      {!isInlinePlacement ? (
        <button
          type="button"
          className="translate-fab"
          aria-label={open ? 'Close translation panel' : 'Open translation panel'}
          onClick={() => setOpen((prev) => !prev)}
        >
          <TranslateFabIcon />
          <span className="translate-fab-label">Translation</span>
        </button>
      ) : null}

      {open || isInlinePlacement ? (
        <section
          className={`translate-panel ${isHeaderPlacement ? 'translate-panel-header' : ''} ${
            isInlinePlacement ? 'translate-panel-inline' : ''
          }`}
          role="dialog"
          aria-label="Language translation"
        >
          <div className="translate-panel-head">
            <h3>Translation</h3>
            {!isInlinePlacement ? (
              <button
                type="button"
                className="translate-close-btn"
                aria-label="Close translation panel"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="translate-lang-row">
            <select className="text-input translate-select" value={from} onChange={(e) => setFrom(e.target.value)}>
              {languages.map((item) => (
                <option key={`from-${item.code}`} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>

            <button type="button" className="ghost-btn translate-swap-btn" onClick={swapLanguages} aria-label="Swap languages">
              ⇄
            </button>

            <select className="text-input translate-select" value={to} onChange={(e) => setTo(e.target.value)}>
              {languages.map((item) => (
                <option key={`to-${item.code}`} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <label className="upload-label" htmlFor="translate-input">
            Enter text
          </label>
          <textarea
            id="translate-input"
            className="text-input translate-textarea"
            rows={4}
            placeholder="Type text to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div className="button-row translate-action-row">
            <button type="button" className="action-btn" onClick={onTranslate} disabled={!canTranslate}>
              {loading ? 'Translating...' : 'Get Translation'}
            </button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <label className="upload-label" htmlFor="translate-output">
            Result
          </label>
          <textarea
            id="translate-output"
            className="text-input translate-textarea translate-output"
            rows={4}
            readOnly
            placeholder="Translated text appears here..."
            value={translatedText}
          />
        </section>
      ) : null}
    </aside>
  );
}
