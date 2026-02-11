import { Navigate, Route, Routes } from 'react-router-dom';
import { NavTabs } from './components/NavTabs.jsx';
import { AssistantPage } from './pages/AssistantPage.jsx';
import { BasicPage } from './pages/BasicPage.jsx';
import { CameraPage } from './pages/CameraPage.jsx';
import { CurrencyPage } from './pages/CurrencyPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { VoicePage } from './pages/VoicePage.jsx';
import { WeatherPage } from './pages/WeatherPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
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

      <main className="app-main">
        <Routes>
          <Route path="/" element={<BasicPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/currency" element={<CurrencyPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <NavTabs />
    </div>
  );
}
