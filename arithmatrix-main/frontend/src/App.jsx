import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { InlineNavTabs } from './components/NavTabs.jsx';
import { MarketPulseBar } from './components/MarketPulseBar.jsx';
import { TechNewsSection } from './components/TechNewsSection.jsx';
import { TranslatePopup } from './components/TranslatePopup.jsx';
import { AssistantPage } from './pages/AssistantPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AtsPage } from './pages/AtsPage.jsx';
import { BasicPage } from './pages/BasicPage.jsx';
import { CameraPage } from './pages/CameraPage.jsx';
import { CurrencyPage } from './pages/CurrencyPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { SubjectivePage } from './pages/SubjectivePage.jsx';
import { UnitPage } from './pages/UnitPage.jsx';
import { VoicePage } from './pages/VoicePage.jsx';
import { WeatherPage } from './pages/WeatherPage.jsx';

const AUTH_ACCOUNTS_STORAGE_KEY = 'arith-auth-accounts-v1';
const AUTH_SESSION_STORAGE_KEY = 'arith-auth-session-v1';
const AUTH_REMINDER_INTERVAL_MS = 4 * 60 * 1000;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function normalizeRole(value) {
  const candidate = String(value || '').trim().toLowerCase();
  if (candidate === 'teacher' || candidate === 'admin') return candidate;
  return 'student';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMobile(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function readLocalStorageJson(key, fallbackValue) {
  try {
    if (typeof window === 'undefined') return fallbackValue;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (_error) {
    return fallbackValue;
  }
}

function loadAuthAccounts() {
  const parsed = readLocalStorageJson(AUTH_ACCOUNTS_STORAGE_KEY, []);
  const normalized = (Array.isArray(parsed) ? parsed : [])
    .filter((item) => item && item.id)
    .map((item) => ({
      id: String(item.id),
      provider: String(item.provider || 'local'),
      providerUserId: String(item.providerUserId || ''),
      fullName: String(item.fullName || ''),
      email: normalizeEmail(item.email),
      mobile: normalizeMobile(item.mobile),
      password: String(item.password || ''),
      role: normalizeRole(item.role),
      createdAt: item.createdAt || new Date().toISOString()
    }));

  const hasAdmin = normalized.some((item) => item.role === 'admin');
  if (!hasAdmin) {
    normalized.unshift({
      id: 'sys-admin-1',
      provider: 'system',
      providerUserId: '',
      fullName: 'ArithMatrix Admin',
      email: 'admin@arithmatrix.com',
      mobile: '',
      password: 'Admin@123',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  return normalized;
}

function loadAuthSession() {
  const parsed = readLocalStorageJson(AUTH_SESSION_STORAGE_KEY, null);
  if (!parsed || typeof parsed !== 'object') return null;
  const accountId = String(parsed.accountId || '').trim();
  if (!accountId) return null;
  return {
    accountId,
    loginAt: parsed.loginAt || new Date().toISOString()
  };
}

function buildAccountDisplayName(account) {
  if (!account) return 'User';
  if (account.fullName) return account.fullName;
  if (account.email) return account.email;
  if (account.mobile) return account.mobile;
  return 'User';
}

function loadScriptOnce({ id, src }) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Script loading is unavailable outside browser.'));
  }

  const existing = document.getElementById(id);
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = atob(padded);

  try {
    const escaped = decoded
      .split('')
      .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(escaped);
  } catch (_error) {
    return decoded;
  }
}

function parseJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch (_error) {
    return null;
  }
}

export default function App() {
  const location = useLocation();
  const [contactEmail, setContactEmail] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' });
  const [authAccounts, setAuthAccounts] = useState(() => loadAuthAccounts());
  const [authSession, setAuthSession] = useState(() => loadAuthSession());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    loginIdentifier: '',
    loginPassword: '',
    signupName: '',
    signupEmail: '',
    signupMobile: '',
    signupPassword: '',
    signupConfirmPassword: ''
  });
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authPopupVisible, setAuthPopupVisible] = useState(false);
  const [authPopupClosing, setAuthPopupClosing] = useState(false);
  const authCloseTimerRef = useRef(null);
  const authReminderTimerRef = useRef(null);
  const isHomeRoute = location.pathname === '/';
  const currentYear = new Date().getFullYear();
  const contactEmailAddress = 'Arunabh17oo@gmail.com';
  const currentAccount = useMemo(() => {
    if (!authSession?.accountId) return null;
    return authAccounts.find((item) => item.id === authSession.accountId) || null;
  }, [authAccounts, authSession?.accountId]);
  const isAuthenticated = Boolean(currentAccount);
  const currentUserRole = normalizeRole(currentAccount?.role);
  const accountDisplayName = useMemo(() => buildAccountDisplayName(currentAccount), [currentAccount]);
  const userStorageNamespace = useMemo(
    () => (currentAccount?.id ? `user:${currentAccount.id}` : 'guest'),
    [currentAccount?.id]
  );
  const assistantStorageKey = `${userStorageNamespace}:assistant-chat`;
  const subjectiveStorageKey = `${userStorageNamespace}:subjective-teacher-tests`;
  const contactDraftStorageKey = `${userStorageNamespace}:contact-draft`;
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
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(AUTH_ACCOUNTS_STORAGE_KEY, JSON.stringify(authAccounts));
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [authAccounts]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!authSession?.accountId) {
        window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(authSession));
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [authSession]);

  useEffect(() => {
    if (!authSession?.accountId) return;
    const exists = authAccounts.some((item) => item.id === authSession.accountId);
    if (!exists) {
      setAuthSession(null);
    }
  }, [authAccounts, authSession]);

  useEffect(() => {
    if (isAuthenticated) {
      if (authReminderTimerRef.current) {
        window.clearTimeout(authReminderTimerRef.current);
        authReminderTimerRef.current = null;
      }
      setAuthPopupVisible(false);
      setAuthPopupClosing(false);
      return;
    }

    if (!authReminderTimerRef.current) {
      authReminderTimerRef.current = window.setTimeout(() => {
        authReminderTimerRef.current = null;
        openAuthPopup();
      }, AUTH_REMINDER_INTERVAL_MS);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (authCloseTimerRef.current) {
        window.clearTimeout(authCloseTimerRef.current);
        authCloseTimerRef.current = null;
      }
      if (authReminderTimerRef.current) {
        window.clearTimeout(authReminderTimerRef.current);
        authReminderTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(contactDraftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setContactEmail(String(parsed?.email || currentAccount?.email || ''));
        setContactQuery(String(parsed?.query || ''));
        return;
      }
    } catch (_error) {
      // Ignore read errors.
    }

    setContactEmail(currentAccount?.email || '');
    setContactQuery('');
  }, [contactDraftStorageKey, currentAccount?.email, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        contactDraftStorageKey,
        JSON.stringify({
          email: contactEmail,
          query: contactQuery
        })
      );
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [contactDraftStorageKey, contactEmail, contactQuery, isAuthenticated]);

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

  useEffect(() => {
    if (!authPopupVisible) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeAuthPopup();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authPopupVisible, authPopupClosing]);

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

  function updateAuthField(field, value) {
    setAuthForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (authError) setAuthError('');
    if (authNotice) setAuthNotice('');
  }

  function createSessionForAccount(account) {
    if (authCloseTimerRef.current) {
      window.clearTimeout(authCloseTimerRef.current);
      authCloseTimerRef.current = null;
    }
    if (authReminderTimerRef.current) {
      window.clearTimeout(authReminderTimerRef.current);
      authReminderTimerRef.current = null;
    }
    setAuthSession({
      accountId: account.id,
      loginAt: new Date().toISOString()
    });
    setAuthPopupVisible(false);
    setAuthPopupClosing(false);
    setAuthForm((prev) => ({
      ...prev,
      loginIdentifier: '',
      loginPassword: '',
      signupPassword: '',
      signupConfirmPassword: ''
    }));
  }

  function handleSignupSubmit(event) {
    event.preventDefault();

    const fullName = authForm.signupName.trim();
    const email = normalizeEmail(authForm.signupEmail);
    const mobile = normalizeMobile(authForm.signupMobile);
    const password = String(authForm.signupPassword || '');
    const confirmPassword = String(authForm.signupConfirmPassword || '');

    if (!email && !mobile) {
      setAuthError('Please enter email or mobile for signup.');
      return;
    }
    if (password.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Password and confirm password do not match.');
      return;
    }

    const hasDuplicate = authAccounts.some(
      (item) => (email && item.email === email) || (mobile && item.mobile === mobile)
    );
    if (hasDuplicate) {
      setAuthError('An account with this email/mobile already exists. Please login.');
      setAuthMode('login');
      return;
    }

    const account = {
      id: `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'local',
      providerUserId: '',
      fullName: fullName || 'ArithMatrix User',
      email,
      mobile,
      password,
      role: 'student',
      createdAt: new Date().toISOString()
    };

    setAuthAccounts((prev) => [...prev, account]);
    createSessionForAccount(account);
    setAuthNotice('Signup successful. Your data is now linked to this account.');
    setAuthError('');
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    const rawIdentifier = String(authForm.loginIdentifier || '').trim();
    const password = String(authForm.loginPassword || '');
    const isEmailId = rawIdentifier.includes('@');
    const email = isEmailId ? normalizeEmail(rawIdentifier) : '';
    const mobile = !isEmailId ? normalizeMobile(rawIdentifier) : '';

    if (!rawIdentifier || !password) {
      setAuthError('Please enter email/mobile and password.');
      return;
    }

    const account = authAccounts.find(
      (item) => (email && item.email === email) || (mobile && item.mobile === mobile)
    );
    if (!account || account.password !== password) {
      setAuthError('Invalid login credentials.');
      return;
    }

    createSessionForAccount(account);
    setAuthError('');
    setAuthNotice('Login successful.');
  }

  async function requestGoogleProfileWithCredential() {
    if (!window.google?.accounts?.id?.initialize || !window.google?.accounts?.id?.prompt) {
      throw new Error('Google Identity prompt is unavailable in this browser.');
    }

    const credentialResponse = await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Google sign-in timed out. Please try again.'));
      }, 20000);

      const finalizeReject = (message) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(new Error(message));
      };

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        callback: (response) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          if (!response?.credential) {
            reject(new Error('Google sign-in did not return credential.'));
            return;
          }
          resolve(response);
        }
      });

      window.google.accounts.id.prompt((notification) => {
        if (settled) return;
        if (notification?.isNotDisplayed?.()) {
          const reason = notification?.getNotDisplayedReason?.() || 'Prompt not displayed.';
          finalizeReject(`Google sign-in unavailable: ${reason}`);
          return;
        }
        if (notification?.isSkippedMoment?.()) {
          const reason = notification?.getSkippedReason?.() || 'Prompt skipped.';
          finalizeReject(`Google sign-in skipped: ${reason}`);
          return;
        }
        if (notification?.isDismissedMoment?.()) {
          const reason = notification?.getDismissedReason?.() || 'Prompt dismissed.';
          finalizeReject(`Google sign-in cancelled: ${reason}`);
        }
      });
    });

    const payload = parseJwtPayload(credentialResponse?.credential);
    if (!payload) {
      throw new Error('Unable to read Google account details from credential response.');
    }

    return {
      providerUserId: String(payload?.sub || ''),
      fullName: String(payload?.name || 'Google User'),
      email: normalizeEmail(payload?.email),
      mobile: ''
    };
  }

  async function requestGoogleProfile() {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google login is not configured. Add VITE_GOOGLE_CLIENT_ID in frontend/.env.');
    }

    await loadScriptOnce({ id: 'arith-google-gsi-sdk', src: GOOGLE_GSI_SCRIPT_SRC });
    try {
      return await requestGoogleProfileWithCredential();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed.';
      const normalized = message.toLowerCase();

      if (normalized.includes('origin') || normalized.includes('client') || normalized.includes('invalid')) {
        throw new Error(
          `Google OAuth config mismatch for ${window.location.origin}. Add this URL to Authorized JavaScript origins in your Google OAuth Web client and retry.`
        );
      }

      throw new Error(message);
    }
  }

  async function handleSocialAuth() {
    const provider = 'google';
    const providerName = 'Google';
    setAuthError('');
    setAuthNotice('');

    try {
      const socialProfile = await requestGoogleProfile();
      const normalizedEmail = normalizeEmail(socialProfile.email);

      let account = authAccounts.find(
        (item) =>
          item.provider === provider &&
          (
            (socialProfile.providerUserId && item.providerUserId === socialProfile.providerUserId) ||
            (normalizedEmail && item.email === normalizedEmail)
          )
      );

      if (!account) {
        account = {
          id: `acct-${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          provider,
          providerUserId: socialProfile.providerUserId,
          fullName: socialProfile.fullName || `${providerName} User`,
          email: normalizedEmail || `${provider}.user@arithmatrix.app`,
          mobile: '',
          password: '',
          role: 'student',
          createdAt: new Date().toISOString()
        };
        setAuthAccounts((prev) => [...prev, account]);
      } else {
        const mergedAccount = {
          ...account,
          providerUserId: account.providerUserId || socialProfile.providerUserId,
          fullName: account.fullName || socialProfile.fullName,
          email: account.email || normalizedEmail
        };
        account = mergedAccount;
        setAuthAccounts((prev) => prev.map((item) => (item.id === mergedAccount.id ? mergedAccount : item)));
      }

      createSessionForAccount(account);
      setAuthNotice(`${providerName} login successful.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google login failed.');
    }
  }

  function handleLogout() {
    setAuthSession(null);
    setAuthMode('login');
    setAuthError('');
    setAuthNotice('');
    if (authReminderTimerRef.current) {
      window.clearTimeout(authReminderTimerRef.current);
      authReminderTimerRef.current = null;
    }
    authReminderTimerRef.current = window.setTimeout(() => {
      authReminderTimerRef.current = null;
      openAuthPopup();
    }, AUTH_REMINDER_INTERVAL_MS);
  }

  function handleAdminRoleChange(accountId, role) {
    const safeRole = normalizeRole(role);
    setAuthAccounts((prev) =>
      prev.map((item) =>
        item.id === accountId
          ? {
              ...item,
              role: safeRole
            }
          : item
      )
    );
  }

  function handleAdminDeleteAccount(accountId) {
    const targetId = String(accountId || '');
    if (!targetId || targetId === 'sys-admin-1') return;

    const target = authAccounts.find((item) => item.id === targetId);
    if (!target) return;
    if (normalizeRole(target.role) === 'admin') return;

    setAuthAccounts((prev) => prev.filter((item) => item.id !== targetId));

    if (authSession?.accountId === targetId) {
      setAuthSession(null);
    }
  }

  function openAuthPopup() {
    if (authCloseTimerRef.current) {
      window.clearTimeout(authCloseTimerRef.current);
      authCloseTimerRef.current = null;
    }
    if (authReminderTimerRef.current) {
      window.clearTimeout(authReminderTimerRef.current);
      authReminderTimerRef.current = null;
    }
    setAuthMode('login');
    setAuthError('');
    setAuthNotice('');
    setAuthPopupClosing(false);
    setAuthPopupVisible(true);
  }

  function closeAuthPopup() {
    if (!authPopupVisible || authPopupClosing) return;
    setAuthPopupClosing(true);
    authCloseTimerRef.current = window.setTimeout(() => {
      setAuthPopupVisible(false);
      setAuthPopupClosing(false);
      authCloseTimerRef.current = null;

      if (!isAuthenticated) {
        if (authReminderTimerRef.current) {
          window.clearTimeout(authReminderTimerRef.current);
          authReminderTimerRef.current = null;
        }
        authReminderTimerRef.current = window.setTimeout(() => {
          authReminderTimerRef.current = null;
          openAuthPopup();
        }, AUTH_REMINDER_INTERVAL_MS);
      }
    }, 240);
  }

  const authModal =
    authPopupVisible && !isAuthenticated && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`auth-overlay ${authPopupClosing ? 'auth-overlay-closing' : 'auth-overlay-open'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={closeAuthPopup}
          >
            <section
              className={`auth-modal ${authPopupClosing ? 'auth-modal-closing' : 'auth-modal-open'}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="auth-modal-head">
                <div className="auth-modal-head-brand">
                  <img className="auth-modal-head-logo" src="/logo.png" alt="" aria-hidden="true" />
                  <p>ArithMatrix Account</p>
                </div>
                <button
                  type="button"
                  className="auth-close-btn"
                  aria-label="Close login modal"
                  onClick={closeAuthPopup}
                >
                  X
                </button>
              </div>

              <div className="auth-modal-content">
                <div className="auth-copy-grid">
                  <div className="auth-copy-block">
                    <h2 id="auth-modal-title">
                      {authMode === 'login'
                        ? 'ArithMatrix Login'
                        : 'Create your ArithMatrix account'}
                    </h2>
                    <p>
                      {authMode === 'login'
                        ? 'Fast, secure access with your email or phone. Your preferences stay synced on this device.'
                        : 'Create your profile in seconds and keep your tools, tests, and assistant history personalized.'}
                    </p>
                  </div>
                  <div className="auth-copy-visual" aria-hidden="true">
                    <span className="auth-copy-bubble auth-copy-bubble-a" />
                    <span className="auth-copy-bubble auth-copy-bubble-b" />
                    <span className="auth-copy-bubble auth-copy-bubble-c" />
                    <span className="auth-copy-bubble auth-copy-bubble-d" />
                    <span className="auth-copy-bubble auth-copy-bubble-e" />
                  </div>
                </div>

                <div className="auth-mode-toggle">
                  <button
                    type="button"
                    className={`pill-btn ${authMode === 'login' ? 'pill-btn-active' : ''}`}
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthNotice('');
                    }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${authMode === 'signup' ? 'pill-btn-active' : ''}`}
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                      setAuthNotice('');
                    }}
                  >
                    Signup
                  </button>
                </div>

                {authMode === 'login' ? (
                  <form className="auth-form" onSubmit={handleLoginSubmit}>
                    <label className="auth-field" htmlFor="auth-login-identifier">
                      <span>Email or Mobile</span>
                      <input
                        id="auth-login-identifier"
                        className="text-input"
                        value={authForm.loginIdentifier}
                        onChange={(event) => updateAuthField('loginIdentifier', event.target.value)}
                        placeholder="name@example.com or 9876543210"
                      />
                    </label>

                    <label className="auth-field" htmlFor="auth-login-password">
                      <span>Password</span>
                      <input
                        id="auth-login-password"
                        className="text-input"
                        type="password"
                        value={authForm.loginPassword}
                        onChange={(event) => updateAuthField('loginPassword', event.target.value)}
                        placeholder="Enter password"
                      />
                    </label>

                    <button type="submit" className="action-btn auth-submit-btn">
                      Continue
                    </button>
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleSignupSubmit}>
                    <label className="auth-field" htmlFor="auth-signup-name">
                      <span>Full Name</span>
                      <input
                        id="auth-signup-name"
                        className="text-input"
                        value={authForm.signupName}
                        onChange={(event) => updateAuthField('signupName', event.target.value)}
                        placeholder="Your name"
                      />
                    </label>

                    <div className="auth-field-grid">
                      <label className="auth-field" htmlFor="auth-signup-email">
                        <span>Email</span>
                        <input
                          id="auth-signup-email"
                          className="text-input"
                          type="email"
                          value={authForm.signupEmail}
                          onChange={(event) => updateAuthField('signupEmail', event.target.value)}
                          placeholder="you@example.com"
                        />
                      </label>

                      <label className="auth-field" htmlFor="auth-signup-mobile">
                        <span>Mobile</span>
                        <input
                          id="auth-signup-mobile"
                          className="text-input"
                          value={authForm.signupMobile}
                          onChange={(event) => updateAuthField('signupMobile', event.target.value)}
                          placeholder="9876543210"
                        />
                      </label>
                    </div>

                    <div className="auth-field-grid">
                      <label className="auth-field" htmlFor="auth-signup-password">
                        <span>Password</span>
                        <input
                          id="auth-signup-password"
                          className="text-input"
                          type="password"
                          value={authForm.signupPassword}
                          onChange={(event) => updateAuthField('signupPassword', event.target.value)}
                          placeholder="Create password"
                        />
                      </label>

                      <label className="auth-field" htmlFor="auth-signup-confirm-password">
                        <span>Confirm Password</span>
                        <input
                          id="auth-signup-confirm-password"
                          className="text-input"
                          type="password"
                          value={authForm.signupConfirmPassword}
                          onChange={(event) => updateAuthField('signupConfirmPassword', event.target.value)}
                          placeholder="Repeat password"
                        />
                      </label>
                    </div>

                    <button type="submit" className="action-btn auth-submit-btn">
                      Create Account
                    </button>
                  </form>
                )}

                <div className="auth-social-row">
                  <button
                    type="button"
                    className="ghost-btn auth-social-btn"
                    onClick={handleSocialAuth}
                  >
                    Continue with Google
                  </button>
                </div>
                {authError ? <p className="error-text">{authError}</p> : null}
                {authNotice ? <p className="hint-text">{authNotice}</p> : null}
              </div>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
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

          <div className="app-header-actions">
            {isAuthenticated ? (
              <>
                <span className="auth-user-pill" title={currentAccount?.email || currentAccount?.mobile || ''}>
                  {accountDisplayName}
                </span>
                <button type="button" className="ghost-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button type="button" className="ghost-btn" onClick={openAuthPopup}>
                Login
              </button>
            )}
            <TranslatePopup placement="jump" jumpTargetId="translation-operations" />
          </div>
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
          <div id="tool-workspace" className="route-stage" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<BasicPage assistantStorageKey={assistantStorageKey} />} />
              <Route
                path="/subjective"
                element={
                  <SubjectivePage
                    storageKey={subjectiveStorageKey}
                    userRole={currentUserRole}
                    defaultStudentName={currentAccount?.fullName || ''}
                    defaultStudentEmail={currentAccount?.email || ''}
                    defaultTeacherName={currentAccount?.fullName || ''}
                    defaultTeacherEmail={currentAccount?.email || ''}
                  />
                }
              />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/unit" element={<UnitPage />} />
              <Route path="/currency" element={<CurrencyPage />} />
              <Route path="/ats" element={<AtsPage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/assistant" element={<AssistantPage storageKey={assistantStorageKey} />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="/admin"
                element={
                  currentUserRole === 'admin' ? (
                    <AdminPage
                      currentAccount={currentAccount}
                      accounts={authAccounts}
                      onRoleChange={handleAdminRoleChange}
                      onDeleteAccount={handleAdminDeleteAccount}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        <InlineNavTabs showAdminTab={currentUserRole === 'admin'} />
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
      {authModal}
    </>
  );
}
