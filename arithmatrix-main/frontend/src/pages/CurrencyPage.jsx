import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { convertCurrency, fetchCurrencies } from '../api/currencyApi.js';
import { createHistoryEntry } from '../api/historyApi.js';

export function CurrencyPage() {
  const [params] = useSearchParams();
  const [currencies, setCurrencies] = useState(['USD', 'EUR', 'INR']);
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrencies().then(setCurrencies);
  }, []);

  useEffect(() => {
    const expression = params.get('expression');
    if (!expression) return;

    const match = expression.match(/^\s*([\d.]+)\s+([A-Za-z]{3})\s+to\s+([A-Za-z]{3})\s*$/i);
    if (!match) return;

    setAmount(match[1]);
    setFrom(match[2].toUpperCase());
    setTo(match[3].toUpperCase());
  }, [params]);

  const convertedText = useMemo(() => {
    if (!result) return '';
    return `${Number(amount).toFixed(2)} ${from} = ${result} ${to}`;
  }, [amount, from, result, to]);

  async function onConvert() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await convertCurrency({ amount: numericAmount, from, to });
      const formatted = Number(data.converted).toFixed(2);
      setResult(formatted);

      await createHistoryEntry({
        expression: `${numericAmount.toFixed(2)} ${from} to ${to}`,
        result: formatted,
        source: 'CURRENCY'
      });
    } catch (err) {
      setError(err.message || 'Conversion failed');
      setResult('');
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Currency Converter</h2>
        <Link className="ghost-btn" to="/history?source=CURRENCY">
          Currency History
        </Link>
      </div>

      <div className="form-grid">
        <label>
          Amount
          <input
            className="text-input"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </label>

        <label>
          From
          <select className="text-input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <label>
          To
          <select className="text-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="button-row">
        <button type="button" className="ghost-btn" onClick={swap}>
          Swap
        </button>
        <button type="button" className="action-btn" onClick={onConvert} disabled={loading}>
          {loading ? 'Converting...' : 'Convert'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {convertedText ? <p className="result-line">{convertedText}</p> : null}
    </section>
  );
}
