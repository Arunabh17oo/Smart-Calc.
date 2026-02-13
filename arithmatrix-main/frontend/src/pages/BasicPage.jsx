import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssistantWidget } from '../components/AssistantWidget.jsx';
import { createHistoryEntry } from '../api/historyApi.js';
import { evaluateExpression, formatResult, isUndefinedMathError } from '../utils/calculatorEngine.js';

const BASIC_KEYS = [
  ['AC', '%', '⌫', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['00', '0', '.', '=']
];

const KEY_INSERT = {
  '÷': '/',
  '×': '*',
  '√': 'sqrt(',
  '∛': 'cbrt(',
  root: 'root(',
  sin: 'sin(',
  cos: 'cos(',
  tan: 'tan(',
  sinh: 'sinh(',
  cosh: 'cosh(',
  tanh: 'tanh(',
  'sin⁻¹': 'asin(',
  'cos⁻¹': 'acos(',
  'tan⁻¹': 'atan(',
  ln: 'ln(',
  log: 'log(',
  mod: 'mod(',
  gcd: 'gcd(',
  lcm: 'lcm(',
  nCr: 'ncr(',
  nPr: 'npr(',
  '|x|': 'abs(',
  '10ˣ': 'pow(10,',
  'eˣ': 'exp(',
  'x²': '^2',
  'x³': '^3',
  'xʸ': '^',
  π: 'pi',
  φ: 'phi'
};

export function BasicPage({ assistantStorageKey }) {
  const [params] = useSearchParams();
  const initialExpression = params.get('expression') || '';
  const [expression, setExpression] = useState(initialExpression);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [scientificMode, setScientificMode] = useState(false);
  const [inverseMode, setInverseMode] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const liveResult = useMemo(() => {
    if (!String(expression || '').trim()) return '';
    try {
      return formatResult(evaluateExpression(expression));
    } catch (err) {
      if (isUndefinedMathError(err)) return 'Undefined';
      return '';
    }
  }, [expression]);

  const displayResult = useMemo(() => liveResult || result || '0', [liveResult, result]);
  const scientificKeys = useMemo(
    () => {
      const rows = [
        ['AC', '(', ')', '⌫', '%', '÷'],
        [
          ...(inverseMode ? ['sin⁻¹', 'cos⁻¹', 'tan⁻¹'] : ['sin', 'cos', 'tan']),
          'ln',
          'log',
          '√'
        ]
      ];

      if (advancedMode) {
        rows.push(['nCr', 'nPr', 'gcd', 'lcm', 'mod', ',']);
        rows.push(['sinh', 'cosh', 'tanh', 'root', '∛', '|x|']);
        rows.push(['10ˣ', 'eˣ', 'x²', 'x³', 'xʸ', 'φ']);
      }

      rows.push(['7', '8', '9', '×', '^', '!']);
      rows.push(['4', '5', '6', '-', 'π', '.']);
      rows.push(['1', '2', '3', '+', '0', '=']);

      return rows;
    },
    [inverseMode, advancedMode]
  );
  const keys = scientificMode ? scientificKeys : BASIC_KEYS;

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
      } catch (err) {
        if (isUndefinedMathError(err)) {
          setResult('Undefined');
          setError('');
          try {
            await createHistoryEntry({ expression, result: 'Undefined', source: 'BASIC' });
          } catch (_historyErr) {
            // Ignore history save errors in calculator flow.
          }
        } else {
          setResult('Error');
          setError('Invalid expression');
        }
      }
      return;
    }

    const insertValue = KEY_INSERT[key] || key;
    setExpression((prev) => prev + insertValue);
  }

  function onExpressionChange(nextValue) {
    setError('');
    setExpression(nextValue);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Basic Calculator</h2>
        <Link className="ghost-btn" to="/history?source=BASIC">
          Calc History
        </Link>
      </div>

      <div className="button-row calc-mode-row">
        <button
          type="button"
          className={`pill-btn ${!scientificMode ? 'pill-btn-active' : ''}`}
          onClick={() => {
            setScientificMode(false);
            setInverseMode(false);
            setAdvancedMode(false);
          }}
        >
          Basic
        </button>
        <button
          type="button"
          className={`pill-btn ${scientificMode ? 'pill-btn-active' : ''}`}
          onClick={() => setScientificMode(true)}
        >
          Scientific
        </button>
        {scientificMode ? (
          <button
            type="button"
            className={`pill-btn ${inverseMode ? 'pill-btn-active' : ''}`}
            onClick={() => setInverseMode((prev) => !prev)}
          >
            {inverseMode ? 'Inverse On' : 'Inverse Off'}
          </button>
        ) : null}
        {scientificMode ? (
          <button
            type="button"
            className={`pill-btn ${advancedMode ? 'pill-btn-active' : ''}`}
            onClick={() => setAdvancedMode((prev) => !prev)}
          >
            {advancedMode ? 'Advanced On' : 'Advanced Off'}
          </button>
        ) : null}
      </div>

      {scientificMode ? (
        <p className="hint-text">
          Scientific mode: trig, inverse trig, logs, powers, factorial, and constants. Advanced
          mode adds nCr, nPr, gcd/lcm, mod, hyperbolic trig, roots, abs, and phi.
        </p>
      ) : null}

      <div className="display-block">
        <p className="expression-line">{expression || 'Enter expression'}</p>
        <p className="result-line">{displayResult}</p>
      </div>

      <label htmlFor="calc-expression-input" className="upload-label">
        Type Expression
      </label>
      <input
        id="calc-expression-input"
        className="text-input"
        value={expression}
        placeholder={
          scientificMode
            ? advancedMode
              ? 'Example: ncr(10,3)+gcd(18,24)'
              : 'Example: sin(60)+3^2'
            : 'Example: (25+5)*3'
        }
        onChange={(e) => onExpressionChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onKeyPress('=');
          }
        }}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <div className={`key-grid ${scientificMode ? 'key-grid-scientific' : ''}`}>
        {keys.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className={`key-btn ${key === '=' ? 'key-btn-equals' : ''} ${['+', '-', '×', '÷', '^', 'xʸ'].includes(key) ? 'key-btn-op' : ''} ${['sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'ln', 'log', '√', '∛', 'root', 'mod', 'gcd', 'lcm', 'nCr', 'nPr', '|x|', '10ˣ', 'eˣ'].includes(key) ? 'key-btn-fn' : ''}`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="main-assistant-block">
        <AssistantWidget compact showOpenLink storageKey={assistantStorageKey} />
      </div>
    </section>
  );
}
