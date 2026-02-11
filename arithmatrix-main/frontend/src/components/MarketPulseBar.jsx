import { useEffect, useMemo, useState } from 'react';
import { fetchMarketOverview } from '../api/marketApi.js';

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function formatCurrency(value, currency, fractionDigits = 2) {
  if (!isFiniteNumber(value)) return '--';

  const numeric = Number(value);

  if (currency === 'USD') {
    if (fractionDigits === 2) return USD_FORMATTER.format(numeric);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(numeric);
  }

  if (currency === 'INR') {
    if (fractionDigits === 2) return INR_FORMATTER.format(numeric);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(numeric);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(numeric);
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) return '--';
  const numeric = Number(value);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(2)}%`;
}

function formatUpdatedTime(value) {
  if (!value) return 'Unknown';

  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_error) {
    return 'Unknown';
  }
}

function getStockGrowwUrl(stock) {
  return 'https://groww.in';
}

export function MarketPulseBar() {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [failedLogos, setFailedLogos] = useState({});
  const refreshMs = (market?.refreshHintSec || 30) * 1000;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchMarketOverview();
        if (!active) return;
        setMarket(data);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load live market prices');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    const intervalId = window.setInterval(load, refreshMs);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [refreshMs]);

  const stocks = market?.stocks || [];
  const warnings = market?.warnings || [];
  const enableStockLoop = stocks.length > 1;

  async function onManualRefresh() {
    setManualRefreshing(true);
    try {
      const data = await fetchMarketOverview();
      setMarket(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load live market prices');
    } finally {
      setLoading(false);
      setManualRefreshing(false);
    }
  }

  const cryptoPairs = useMemo(() => {
    const usdtUsd = market?.crypto?.usdt?.usd;
    const usdtInr = market?.crypto?.usdt?.inr;
    const btcUsd = market?.crypto?.btc?.usd;
    const btcUsdt = market?.crypto?.btc?.usdt;
    const btcInr = market?.crypto?.btc?.inr;

    return [
      {
        key: 'usdt-usd',
        icon: '🪙',
        label: 'USDT/USD',
        value: formatCurrency(usdtUsd, 'USD', 4)
      },
      {
        key: 'usdt-inr',
        icon: '₹',
        label: 'USDT/INR',
        value: formatCurrency(usdtInr, 'INR', 4)
      },
      {
        key: 'btc-usd',
        icon: '₿',
        label: 'BTC/USD',
        value: formatCurrency(btcUsd, 'USD', 2)
      },
      {
        key: 'btc-usdt',
        icon: '₮',
        label: 'BTC/USDT',
        value: isFiniteNumber(btcUsdt)
          ? `${new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(Number(btcUsdt))} USDT`
          : '--'
      },
      {
        key: 'btc-inr',
        icon: '₹',
        label: 'BTC/INR',
        value: formatCurrency(btcInr, 'INR', 2)
      }
    ];
  }, [market]);

  return (
    <section className="market-strip" aria-label="Live market prices">
      <div className="market-strip-head">
        <div>
          <p className="market-strip-kicker">Live Market Pulse</p>
          <h2>Top 10 Popular Stocks + Crypto Rates</h2>
        </div>
        <div className="market-strip-controls">
          <div className="market-strip-meta">
            <span className="market-live-dot" aria-hidden="true" />
            <span>Auto refresh {Math.round(refreshMs / 1000)}s</span>
            <span className="market-meta-sep" aria-hidden="true">
              |
            </span>
            <span>Updated {formatUpdatedTime(market?.updatedAt)}</span>
          </div>
          <button
            type="button"
            className="ghost-btn market-refresh-btn"
            onClick={onManualRefresh}
            disabled={manualRefreshing}
            aria-label="Refresh live stock and crypto prices"
          >
            {manualRefreshing ? 'Refreshing...' : 'Refresh Live'}
          </button>
        </div>
      </div>

      {error ? <p className="error-text market-inline-message">{error}</p> : null}
      {!error && warnings.length ? (
        <p className="hint-text market-inline-message">{warnings.join(' ')}</p>
      ) : null}

      {loading && !stocks.length ? <p className="hint-text">Loading live market data...</p> : null}

      <div className="market-stock-marquee" role="list">
        <div className={`market-stock-loop ${enableStockLoop ? 'market-stock-loop-animate' : ''}`}>
          <div className="market-stock-row">
            {stocks.map((stock) => {
              const hasLogoFailure = Boolean(failedLogos[stock.symbol]);
              const priceText = formatCurrency(stock.price, stock.currency || 'USD', 2);
              const changeClass =
                Number(stock.changePercent) > 0
                  ? 'market-stock-change-up'
                  : Number(stock.changePercent) < 0
                    ? 'market-stock-change-down'
                    : 'market-stock-change-flat';

              return (
                <a
                  className="market-stock-card market-stock-link"
                  role="listitem"
                  key={stock.symbol}
                  href={getStockGrowwUrl(stock)}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open Groww home page from ${stock.symbol}`}
                >
                  <div className="market-stock-brand">
                    <div className="market-stock-logo-wrap">
                      {!hasLogoFailure ? (
                        <img
                          className="market-stock-logo"
                          src={stock.logoUrl}
                          alt={`${stock.name} logo`}
                          loading="lazy"
                          onError={() =>
                            setFailedLogos((prev) => ({
                              ...prev,
                              [stock.symbol]: true
                            }))
                          }
                        />
                      ) : null}
                      <span
                        className={`market-stock-emoji ${hasLogoFailure ? 'market-stock-emoji-fallback' : ''}`}
                      >
                        {stock.emoji}
                      </span>
                    </div>
                    <div className="market-stock-ident">
                      <p className="market-stock-symbol">{stock.symbol}</p>
                      <p className="market-stock-name">{stock.name}</p>
                    </div>
                  </div>

                  <p className="market-stock-price">{priceText}</p>
                  <p className={`market-stock-change ${changeClass}`}>{formatPercent(stock.changePercent)}</p>
                  <p className="market-stock-cta">Open Groww Home ↗</p>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="market-crypto-grid" role="list">
        {cryptoPairs.map((pair) => (
          <article key={pair.key} className="market-crypto-card" role="listitem">
            <span className="market-crypto-icon" aria-hidden="true">
              {pair.icon}
            </span>
            <p className="market-crypto-label">{pair.label}</p>
            <p className="market-crypto-value">{pair.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
