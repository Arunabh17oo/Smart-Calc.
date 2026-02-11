import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { InlineNavTabs, NavTabs } from './components/NavTabs.jsx';
import { TechNewsSection } from './components/TechNewsSection.jsx';
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

  return (
    <div className={`app-shell ${isHomeRoute ? 'app-shell-home' : ''}`}>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb bg-orb-a" aria-hidden="true" />
      <div className="bg-orb bg-orb-b" aria-hidden="true" />

      <header className="app-header">
        <div className="app-header-top">
          <h1>ArithMatrix</h1>
          <span className="brand-pill">AI Math Studio</span>
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

      {isHomeRoute ? <InlineNavTabs /> : null}
      {isHomeRoute ? <TechNewsSection /> : null}

      {!isHomeRoute ? <NavTabs /> : null}
    </div>
  );
}
