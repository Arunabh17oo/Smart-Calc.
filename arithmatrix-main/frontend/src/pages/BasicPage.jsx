import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssistantWidget } from '../components/AssistantWidget.jsx';
import { createHistoryEntry } from '../api/historyApi.js';
import { evaluateExpression, formatResult } from '../utils/calculatorEngine.js';

const KEYS = [
  ['AC', '%', '⌫', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['00', '0', '.', '=']
];

export function BasicPage() {
  const [params] = useSearchParams();
  const initialExpression = params.get('expression') || '';
  const [expression, setExpression] = useState(initialExpression);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const displayResult = useMemo(() => result || '0', [result]);

  async function onKeyPress(key) {
    setError('');

    if (key === 'AC') {
      setExpression('');
      setResult('');
      return;
    }

    if (key === '⌫') {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (key === '=') {
      try {
        const value = evaluateExpression(expression);
        const nextResult = formatResult(value);
        setResult(nextResult);

        await createHistoryEntry({ expression, result: nextResult, source: 'BASIC' });
      } catch (_err) {
        setResult('Error');
        setError('Invalid expression');
      }
      return;
    }

    setExpression((prev) => prev + key);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Basic Calculator</h2>
        <Link className="ghost-btn" to="/history?source=BASIC">
          Basic History
        </Link>
      </div>

      <div className="display-block">
        <p className="expression-line">{expression || 'Enter expression'}</p>
        <p className="result-line">{displayResult}</p>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="key-grid">
        {KEYS.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className={`key-btn ${key === '=' ? 'key-btn-equals' : ''} ${['+', '-', '×', '÷'].includes(key) ? 'key-btn-op' : ''}`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="main-assistant-block">
        <AssistantWidget compact showOpenLink />
      </div>
    </section>
  );
}
