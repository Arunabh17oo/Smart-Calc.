import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createHistoryEntry } from '../api/historyApi.js';
import { evaluateExpression, formatResult, isUndefinedMathError } from '../utils/calculatorEngine.js';
import { normalizeVoiceExpression } from '../utils/voiceNormalize.js';

function dedupe(list) {
  const out = [];
  const seen = new Set();

  for (const item of list) {
    const value = String(item || '').trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

export function VoicePage() {
  const [params] = useSearchParams();
  const [expression, setExpression] = useState(params.get('expression') || '');
  const [result, setResult] = useState('');
  const [normalizedPreview, setNormalizedPreview] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speechLang, setSpeechLang] = useState('en-US');
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');

  const recognitionRef = useRef(null);
  const lastProcessedRef = useRef('');
  const ttsEnabledRef = useRef(ttsEnabled);
  const speechLangRef = useRef(speechLang);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const isSecure = useMemo(
    () => window.isSecureContext || window.location.hostname === 'localhost',
    []
  );

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    speechLangRef.current = speechLang;
  }, [speechLang]);

  async function evaluateCandidates(candidates, fallbackExpression = '') {
    const uniqueCandidates = dedupe(candidates);

    for (const candidate of uniqueCandidates) {
      const normalized = normalizeVoiceExpression(candidate);

      if (!normalized) {
        continue;
      }

      try {
        const value = evaluateExpression(normalized);
        const formatted = formatResult(value);

        setExpression(candidate);
        setNormalizedPreview(normalized);
        setResult(formatted);
        setError('');
        setSaveWarning('');

        if (ttsEnabledRef.current && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(formatted);
          utterance.lang = speechLangRef.current;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }

        try {
          await createHistoryEntry({
            expression: candidate,
            result: formatted,
            source: 'VOICE'
          });
        } catch (_historyError) {
          setSaveWarning('Recognized, but could not save to history (API not reachable).');
        }

        return true;
      } catch (calcErr) {
        if (isUndefinedMathError(calcErr)) {
          setExpression(candidate);
          setNormalizedPreview(normalized);
          setResult('Undefined');
          setError('');
          setSaveWarning('');

          if (ttsEnabledRef.current && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Undefined');
            utterance.lang = speechLangRef.current;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }

          try {
            await createHistoryEntry({
              expression: candidate,
              result: 'Undefined',
              source: 'VOICE'
            });
          } catch (_historyError) {
            setSaveWarning('Recognized, but could not save to history (API not reachable).');
          }

          return true;
        }
        // Try next candidate/alternative.
      }
    }

    const fallbackNormalized = normalizeVoiceExpression(fallbackExpression);
    setNormalizedPreview(fallbackNormalized);
    setResult('Error');
    setError('Could not parse speech into a valid expression. Edit text and press Evaluate Text.');
    return false;
  }

  useEffect(() => {
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onresult = async (event) => {
      const finalChunks = [];
      let interim = '';

      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i]?.[0]?.transcript?.trim() || '';
        if (!chunk) continue;

        if (event.results[i].isFinal) {
          finalChunks.push(chunk);
        } else {
          interim = chunk;
        }
      }

      const fullText = [...finalChunks, interim].join(' ').trim();
      if (fullText) {
        setExpression(fullText);
      }

      const last = event.results[event.results.length - 1];
      if (!last?.isFinal) {
        return;
      }

      const alternatives = dedupe(Array.from(last).map((item) => item?.transcript || ''));
      const signature = alternatives.join('|') || fullText;

      if (signature && signature === lastProcessedRef.current) {
        return;
      }

      lastProcessedRef.current = signature;
      await evaluateCandidates(alternatives.length ? alternatives : [fullText], fullText);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const code = event?.error;

      if (code === 'not-allowed') {
        setError('Microphone permission denied. Allow mic access and try again.');
      } else if (code === 'no-speech') {
        setError('No speech detected. Try speaking louder/clearer.');
      } else if (code === 'audio-capture') {
        setError('No microphone found. Check your mic device and browser permissions.');
      } else if (code === 'network') {
        setError('Speech service network error. Check internet and retry.');
      } else {
        setError('Speech recognition failed. Use Chrome on localhost and try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // SpeechRecognition constructor identity is stable in the browser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognition]);

  function startListening() {
    if (!isSecure) {
      setError('Voice requires a secure context (https or localhost).');
      return;
    }

    if (!recognitionRef.current) {
      setError('Speech API is not supported in this browser. Use Chrome on desktop/mobile.');
      return;
    }

    setError('');
    setSaveWarning('');
    setIsListening(true);
    setResult('');
    setNormalizedPreview('');
    lastProcessedRef.current = '';

    recognitionRef.current.lang = speechLangRef.current;

    try {
      recognitionRef.current.start();
    } catch (_err) {
      setIsListening(false);
      setError('Mic is already active in another tab/app. Stop it and retry.');
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  async function evaluateTypedExpression() {
    const typed = expression.trim();
    if (!typed) {
      setError('Enter or speak an expression first.');
      return;
    }

    setError('');
    setSaveWarning('');
    await evaluateCandidates([typed], typed);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Voice Calculator</h2>
        <Link className="ghost-btn" to="/history?source=VOICE">
          Voice History
        </Link>
      </div>

      <p className="hint-text">Say: "12 plus 5" or "two plus two"</p>

      <div className="display-block">
        <p className="expression-line">{expression || 'Start speaking...'}</p>
        <p className="result-line">{result || '—'}</p>
        {normalizedPreview ? <p className="hint-text">Parsed as: {normalizedPreview}</p> : null}
      </div>

      <label htmlFor="voice-text" className="upload-label">
        Recognized Text (editable)
      </label>
      <input
        id="voice-text"
        className="text-input"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        placeholder="Speak or type expression here"
      />

      {error ? <p className="error-text">{error}</p> : null}
      {saveWarning ? <p className="hint-text">{saveWarning}</p> : null}

      <div className="button-row">
        <label htmlFor="voice-lang">Speech Language</label>
        <select
          id="voice-lang"
          className="text-input"
          value={speechLang}
          onChange={(e) => setSpeechLang(e.target.value)}
          disabled={isListening}
        >
          <option value="en-US">English (US)</option>
          <option value="en-IN">English (India)</option>
        </select>
      </div>

      <div className="button-row">
        <button type="button" className="action-btn" onClick={isListening ? stopListening : startListening}>
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        <button type="button" className="ghost-btn" onClick={evaluateTypedExpression}>
          Evaluate Text
        </button>
        <button type="button" className="ghost-btn" onClick={() => setTtsEnabled((prev) => !prev)}>
          TTS: {ttsEnabled ? 'On' : 'Off'}
        </button>
      </div>
    </section>
  );
}
