import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Basic' },
  { to: '/voice', label: 'Voice' },
  { to: '/camera', label: 'Camera' },
  { to: '/unit', label: 'Units' },
  { to: '/currency', label: 'Currency' },
  { to: '/ats', label: 'ATS' },
  { to: '/weather', label: 'Weather' },
  { to: '/assistant', label: 'Assistant' },
  { to: '/history', label: 'History' }
];

export function NavTabs() {
  return (
    <nav className="tabs" aria-label="Primary navigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab-link ${isActive ? 'tab-link-active' : ''}`}
          end={tab.to === '/'}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function InlineNavTabs() {
  return (
    <nav className="tabs tabs-inline" aria-label="Primary navigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab-link ${isActive ? 'tab-link-active' : ''}`}
          end={tab.to === '/'}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
