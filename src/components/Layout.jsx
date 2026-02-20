import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, Users, LogOut, ListMusic, Settings } from 'lucide-react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function Layout() {
  const { user, team, isAdmin, logout, authLoading } = useApp();
  const navigate = useNavigate();

  return (
    <>
      <ScrollToTop />
      {/* Header — sticky via fixed positioning with body padding offset */}
      <header className="bg-primary-700 text-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
            <div className="text-left">
              <h1 className="text-lg font-bold leading-tight">{team?.name || 'Music Team'}</h1>
              <p className="text-xs text-primary-200">Worship Schedule Manager</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {!authLoading && user && (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/team-setup')} title="Team Settings"
                  className="flex items-center gap-1 text-xs text-primary-200 hover:text-white">
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-white/30" referrerPolicy="no-referrer" />
                </button>
                <button onClick={async () => { await logout(); navigate('/login'); }} title="Sign out"
                  className="flex items-center gap-1 text-xs text-primary-200 hover:text-white">
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-4 pb-2 flex gap-1">
          {[
            { to: '/', icon: <CalendarDays size={15} />, label: 'Schedule' },
            { to: '/members', icon: <Users size={15} />, label: 'Members' },
            { to: '/songs', icon: <ListMusic size={15} />, label: 'Songs' },
            ...(user ? [{ to: '/team-setup', icon: <Settings size={15} />, label: 'Team' }] : []),
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-primary-700' : 'text-primary-100 hover:bg-primary-600'
                }`
              }
            >
              {icon}{label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Spacer to push content below fixed header (~py-3 + nav pb-2 + text heights ≈ 88px) */}
      <div className="h-[88px]" />

      {/* Main content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 min-h-[calc(100vh-88px-48px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        {team?.name || 'Music Team'} © {new Date().getFullYear()}
      </footer>
    </>
  );
}
