import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Basic' },
  { to: '/subjective', label: 'Subjective' },
  { to: '/voice', label: 'Voice' },
  { to: '/camera', label: 'Camera' },
  { to: '/unit', label: 'Units' },
  { to: '/currency', label: 'Currency' },
  { to: '/ats', label: 'ATS' },
  { to: '/weather', label: 'Weather' },
  { to: '/assistant', label: 'Assistant' },
  { to: '/history', label: 'History' },
  { to: '/admin', label: 'Admin' }
];

function buildTabs(showAdminTab) {
  if (showAdminTab) return TABS;
  return TABS.filter((tab) => tab.to !== '/admin');
}

function scrollToWorkspace() {
  if (typeof document === 'undefined') return;
  window.requestAnimationFrame(() => {
    const workspace = document.getElementById('tool-workspace');
    if (!workspace) return;
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export function NavTabs({ showAdminTab = false }) {
  const tabs = buildTabs(showAdminTab);
  const navStyle = { '--tab-count': String(tabs.length) };
  return (
    <nav className="tabs" style={navStyle} aria-label="Primary navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab-link ${isActive ? 'tab-link-active' : ''}`}
          end={tab.to === '/'}
          onClick={scrollToWorkspace}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function InlineNavTabs({ showAdminTab = false }) {
  const tabs = buildTabs(showAdminTab);
  const navStyle = { '--tab-count': String(tabs.length) };
  return (
    <nav className="tabs tabs-inline" style={navStyle} aria-label="Primary navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab-link ${isActive ? 'tab-link-active' : ''}`}
          end={tab.to === '/'}
          onClick={scrollToWorkspace}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
