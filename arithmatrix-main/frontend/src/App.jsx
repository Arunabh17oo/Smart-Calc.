import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { InlineNavTabs } from './components/NavTabs.jsx';
import { MarketPulseBar } from './components/MarketPulseBar.jsx';
import { TechNewsSection } from './components/TechNewsSection.jsx';
import { TranslatePopup } from './components/TranslatePopup.jsx';
import { AssistantPage } from './pages/AssistantPage.jsx';
import { AtsPage } from './pages/AtsPage.jsx';
import { BasicPage } from './pages/BasicPage.jsx';
import { CameraPage } from './pages/CameraPage.jsx';
import { CurrencyPage } from './pages/CurrencyPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { SubjectivePage } from './pages/SubjectivePage.jsx';
import { UnitPage } from './pages/UnitPage.jsx';
import { VoicePage } from './pages/VoicePage.jsx';
import { WeatherPage } from './pages/WeatherPage.jsx';

export default function App() {
  const location = useLocation();
  const [contactEmail, setContactEmail] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' });
  const isHomeRoute = location.pathname === '/';
  const currentYear = new Date().getFullYear();
  const contactEmailAddress = 'Arunabh17oo@gmail.com';
  const directContactMailUrl = `mailto:${contactEmailAddress}?subject=${encodeURIComponent('ArithMatrix Contact')}&body=${encodeURIComponent('Hello ArithMatrix Team,')}`;
  const newsTopic =
    {
      '/': 'upcoming-tech',
      '/subjective': 'education',
      '/voice': 'voice',
      '/camera': 'camera',
      '/unit': 'upcoming-tech',
      '/currency': 'currency',
      '/ats': 'assistant',
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

  function onContactSubmit(event) {
    event.preventDefault();

    const trimmedEmail = contactEmail.trim();
    const trimmedQuery = contactQuery.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setContactStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (trimmedQuery.length < 8) {
      setContactStatus({ type: 'error', message: 'Please write a short query (at least 8 characters).' });
      return;
    }

    const subject = encodeURIComponent('ArithMatrix Contact Query');
    const body = encodeURIComponent(`From: ${trimmedEmail}\n\nQuery:\n${trimmedQuery}`);
    const mailtoUrl = `mailto:${contactEmailAddress}?subject=${subject}&body=${body}`;

    if (typeof window !== 'undefined') {
      window.location.href = mailtoUrl;
    }

    setContactStatus({ type: 'success', message: 'Your query draft opened in your email app.' });
    setContactEmail('');
    setContactQuery('');
  }

  return (
    <div className={`app-shell ${isHomeRoute ? 'app-shell-home' : ''}`}>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb bg-orb-a" aria-hidden="true" />
      <div className="bg-orb bg-orb-b" aria-hidden="true" />

      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-brand">
            <img className="app-brand-logo" src="/logo.png" alt="ArithMatrix logo" />
            <h1>ArithMatrix</h1>
            <span className="brand-pill">AI Math Studio</span>
          </div>
          <TranslatePopup placement="jump" jumpTargetId="translation-operations" />
        </div>
        <p>
          Smart calculator with voice, camera OCR, unit conversion, currency, weather, ATS score
          checker, subjective tests, AI assistant, and history.
        </p>
        <div className="hero-chip-row">
          <span className="hero-chip">Subjective Tests</span>
          <span className="hero-chip">Voice</span>
          <span className="hero-chip">Camera OCR</span>
          <span className="hero-chip">Unit Converter</span>
          <span className="hero-chip">ATS Checker</span>
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
          <span className="status-tag">Test Engine</span>
          <span className="status-tag">Voice Ready</span>
          <span className="status-tag">OCR Ready</span>
          <span className="status-tag">Unit Engine</span>
          <span className="status-tag">ATS Engine</span>
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
              <Route path="/subjective" element={<SubjectivePage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/unit" element={<UnitPage />} />
              <Route path="/currency" element={<CurrencyPage />} />
              <Route path="/ats" element={<AtsPage />} />
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

        <footer className="app-footer" aria-label="Footer">
          <div className="footer-grid">
            <section className="footer-card">
              <h3>About</h3>
              <p>
                ArithMatrix is a smart math studio with calculator tools, conversion workflows, AI
                assistance, weather, currency, and history in one place.
              </p>
            </section>

            <section className="footer-card">
              <h3>Help</h3>
              <p>For any issue, mail on {contactEmailAddress}.</p>
              <a className="footer-link footer-mail-link" href={`mailto:${contactEmailAddress}`}>
                {contactEmailAddress}
              </a>
            </section>

            <section className="footer-card">
              <h3>Raise a Query</h3>
              <p>
                Have a bug report, feature request, or account question? Use the contact form to
                send your query directly by email.
              </p>
              <a className="ghost-btn footer-raise-btn" href={directContactMailUrl}>
                Contact
              </a>
            </section>

            <section className="footer-card footer-contact-card" id="contact-us-box">
              <h3>Contact Us</h3>
              <form className="footer-contact-form" onSubmit={onContactSubmit}>
                <label className="footer-label" htmlFor="contact-email-input">
                  Email
                </label>
                <input
                  id="contact-email-input"
                  className="text-input footer-input"
                  type="email"
                  placeholder="you@example.com"
                  value={contactEmail}
                  onChange={(event) => {
                    setContactEmail(event.target.value);
                    if (contactStatus.message) setContactStatus({ type: '', message: '' });
                  }}
                />

                <label className="footer-label" htmlFor="contact-query-input">
                  Query
                </label>
                <textarea
                  id="contact-query-input"
                  className="text-input footer-textarea"
                  placeholder="Write your question or issue"
                  value={contactQuery}
                  onChange={(event) => {
                    setContactQuery(event.target.value);
                    if (contactStatus.message) setContactStatus({ type: '', message: '' });
                  }}
                />

                <button type="submit" className="action-btn">
                  Send Query
                </button>
              </form>

              {contactStatus.message ? (
                <p className={`footer-status ${contactStatus.type === 'error' ? 'footer-status-error' : 'footer-status-success'}`}>
                  {contactStatus.message}
                </p>
              ) : null}
            </section>
          </div>

          <div className="footer-bottom">
            <p>Copyright {currentYear} ArithMatrix. All rights reserved.</p>
          </div>
        </footer>
      </div>

    </div>
  );
}
