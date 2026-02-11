import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clearHistory, deleteHistoryEntry, fetchHistory } from '../api/historyApi.js';

const FILTERS = ['ALL', 'BASIC', 'VOICE', 'CAMERA', 'CURRENCY'];

function sourceToRoute(source) {
  if (source === 'VOICE') return '/voice';
  if (source === 'CAMERA') return '/camera';
  if (source === 'CURRENCY') return '/currency';
  return '/';
}

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSource = (searchParams.get('source') || 'ALL').toUpperCase();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadHistory() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchHistory(activeSource);
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource]);

  async function onDelete(id) {
    try {
      await deleteHistoryEntry(id);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to delete history entry');
    }
  }

  async function onClear() {
    try {
      await clearHistory(activeSource);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to clear history');
    }
  }

  const title = useMemo(() => {
    return activeSource === 'ALL' ? 'All History' : `${activeSource} History`;
  }, [activeSource]);

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>{title}</h2>
        <button type="button" className="ghost-btn" onClick={onClear}>
          Clear {activeSource === 'ALL' ? 'All' : activeSource}
        </button>
      </div>

      <div className="filter-row">
        {FILTERS.map((source) => (
          <button
            key={source}
            type="button"
            className={`pill-btn ${source === activeSource ? 'pill-btn-active' : ''}`}
            onClick={() => setSearchParams(source === 'ALL' ? {} : { source })}
          >
            {source}
          </button>
        ))}
      </div>

      {loading ? <p className="hint-text">Loading history...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !items.length ? <p className="hint-text">No history yet.</p> : null}

      <div className="history-list">
        {items.map((item) => (
          <article className="history-card" key={item._id}>
            <div>
              <p className="history-expression">{item.expression}</p>
              <p className="history-result">= {item.result}</p>
              <p className="history-meta">
                {item.source} | {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="history-actions">
              <Link
                className="ghost-btn"
                to={`${sourceToRoute(item.source)}?expression=${encodeURIComponent(item.expression)}`}
              >
                Reuse
              </Link>
              <button type="button" className="danger-btn" onClick={() => onDelete(item._id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
