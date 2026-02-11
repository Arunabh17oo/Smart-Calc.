import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { InlineNavTabs } from './components/NavTabs.jsx';
import { MarketPulseBar } from './components/MarketPulseBar.jsx';
import { TechNewsSection } from './components/TechNewsSection.jsx';
import { TranslatePopup } from './components/TranslatePopup.jsx';
import { AssistantPage } from './pages/AssistantPage.jsx';
import { BasicPage } from './pages/BasicPage.jsx';
import { CameraPage } from './pages/CameraPage.jsx';
import { CurrencyPage } from './pages/CurrencyPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { VoicePage } from './pages/VoicePage.jsx';
import { WeatherPage } from './pages/WeatherPage.jsx';

export default function App() {
  const location = useLocation();
  const isHomeRoute = location.pathname === '/';
  const newsTopic =
    {
      '/': 'upcoming-tech',
      '/voice': 'voice',
      '/camera': 'camera',
      '/currency': 'currency',
      '/weather': 'weather',
      '/history': 'history',
      '/assistant': 'assistant'
    }[location.pathname] || 'upcoming-tech';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return undefined;

    let raf = 0;
    const onPointerMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;

      if (raf) cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--cursor-x', `${x}px`);
        document.documentElement.style.setProperty('--cursor-y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onPointerMove);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className={`app-shell ${isHomeRoute ? 'app-shell-home' : ''}`}>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb bg-orb-a" aria-hidden="true" />
      <div className="bg-orb bg-orb-b" aria-hidden="true" />

      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-brand">
            <h1>ArithMatrix</h1>
            <span className="brand-pill">AI Math Studio</span>
          </div>
          <TranslatePopup placement="jump" jumpTargetId="translation-operations" />
        </div>
        <p>Smart calculator with voice, camera OCR, currency, weather, AI assistant, and history.</p>
        <div className="hero-chip-row">
          <span className="hero-chip">Voice</span>
          <span className="hero-chip">Camera OCR</span>
          <span className="hero-chip">Weather</span>
          <span className="hero-chip">Assistant</span>
        </div>
      </header>

      <section className="status-strip" aria-label="App status">
        <div className="status-badge">
          <span className="status-dot" aria-hidden="true" />
          <span>System Online</span>
        </div>
        <div className="status-metrics">
          <span className="status-tag">Voice Ready</span>
          <span className="status-tag">OCR Ready</span>
          <span className="status-tag">Weather API</span>
          <span className="status-tag">Assistant Live</span>
        </div>
      </section>

      <MarketPulseBar />

      <div className="app-content-stack">
        <main className="app-main">
          <div className="route-stage" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<BasicPage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/currency" element={<CurrencyPage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        <InlineNavTabs />
        <section id="translation-operations" className="translate-operations-block" aria-label="Translation Operations">
          <TranslatePopup placement="inline" />
        </section>

        <section className="news-section-wrap" aria-label="Live News Section">
          <TechNewsSection topic={newsTopic} />
        </section>
      </div>

    </div>
  );
}
