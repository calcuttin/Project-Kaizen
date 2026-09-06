import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Moon, Search, Settings, Sun } from 'lucide-react';
import { modules } from '@/app/registry';
import { usePalette, useUI } from '@/app/uiStore';
import { LensSwitch } from './ui';
import { CommandPalette } from './CommandPalette';
import { Toaster } from './Toast';
import { SyncBadge } from '@/core/sync/CloudSync';

export function Shell() {
  const { lens, setLens, theme, toggleTheme } = useUI();
  const setPalette = usePalette((s) => s.setOpen);
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark"><img src="/favicon.svg" alt="" width={22} height={22} /></span>
          <div><div className="brand-name">Kaizen</div><div className="brand-sub">continuous improvement</div></div>
        </div>
        <nav className="stack" style={{ gap: 2 }} aria-label="Primary">
          {modules.filter((m) => !m.hidden).map((m) => (
            <NavLink key={m.id} to={m.path} end={m.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <m.icon /><span>{m.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <SyncBadge />
          <button className="nav-item" onClick={() => setPalette(true)}><Search /><span>Search & add</span><span className="kbd">⌘K</span></button>
          <button className="nav-item" onClick={toggleTheme}>{theme === 'dark' ? <Sun /> : <Moon />}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings /><span>Settings</span></NavLink>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <LensSwitch value={lens} onChange={setLens} />
          <button className="btn ghost sm quick-add" aria-label="Quick add" onClick={() => setPalette(true)}><Search size={14} /><span className="quick-add-label">Quick add</span><span className="kbd">⌘K</span></button>
        </header>
        <Outlet />
        <nav className="tabbar" aria-label="Primary (mobile)">
          {modules.filter((m) => !m.hidden).map((m) => (
            <NavLink key={m.id} to={m.path} end={m.path === '/'} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              <m.icon /><span>{m.name}</span>
            </NavLink>
          ))}
          <NavLink to="/settings" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}><Settings /><span>More</span></NavLink>
        </nav>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  );
}
