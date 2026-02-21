import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, Users, LogOut, ListMusic, Settings, Heart, X, Moon, Sun, CalendarRange } from 'lucide-react';

const DONATE_METHODS = [
  { key: 'gcash',   label: 'GCash',   color: 'bg-green-500 hover:bg-green-600',  qr: '/gcash-qr.png' },
  { key: 'paymaya', label: 'PayMaya', color: 'bg-blue-500 hover:bg-blue-600',    qr: '/paymaya-qr.png' },
  { key: 'paypal',  label: 'PayPal',  color: 'bg-yellow-500 hover:bg-yellow-600', url: 'https://paypal.me/mlparaiso' },
];

function ScrollToTop({ scrollRef }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);
  return null;
}

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [dark]);
  return [dark, setDark];
}

export default function Layout() {
  const { user, team, logout, authLoading } = useApp();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [dark, setDark] = useDarkMode();

  // Donate state
  const [donateOpen, setDonateOpen] = useState(false);
  const [qrMethod, setQrMethod]     = useState(null);
  const donateRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!donateOpen) return;
    const handler = (e) => {
      if (donateRef.current && !donateRef.current.contains(e.target)) {
        setDonateOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [donateOpen]);

  const activeQr = DONATE_METHODS.find(m => m.key === qrMethod);

  // Current month schedule URL
  const now = new Date();
  const scheduleUrl = `/?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;

  const navItems = [
    { to: scheduleUrl, matchPath: '/', icon: <CalendarDays size={18} />, label: 'Schedule' },
    { to: '/members', matchPath: '/members', icon: <Users size={18} />, label: 'Members' },
    { to: '/songs', matchPath: '/songs', icon: <ListMusic size={18} />, label: 'Songs' },
    ...(user ? [{ to: '/team-setup', matchPath: '/team-setup', icon: <Settings size={18} />, label: 'Team' }] : []),
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden dark:bg-gray-900">
      <ScrollToTop scrollRef={scrollRef} />

      {/* QR modal */}
      {qrMethod && activeQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setQrMethod(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 max-w-xs w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 dark:text-gray-100">{activeQr.label} QR Code</p>
              <button onClick={() => setQrMethod(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            <img src={activeQr.qr} alt={`${activeQr.label} QR`} className="w-full rounded-lg border border-gray-100 dark:border-gray-700" />
            <p className="text-xs text-gray-400 mt-3">Screenshot this QR and scan with {activeQr.label} app</p>
          </div>
        </div>
      )}

      {/* Header — always visible, never scrolls */}
      <header className="bg-primary-700 dark:bg-gray-900 text-white shadow-md flex-shrink-0 border-b border-primary-800 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(scheduleUrl)} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary-500 dark:bg-gray-700 flex items-center justify-center">
              {team?.logoUrl
                ? <img src={team.logoUrl} alt="Team logo" className="w-full h-full object-cover" />
                : <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
              }
            </div>
            <div className="text-left min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">{team?.name || 'Music Team'}</h1>
              <p className="text-xs text-primary-200 dark:text-gray-400 hidden sm:block">Worship Schedule Manager</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* 🌙 Dark mode toggle */}
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center justify-center w-7 h-7 rounded-md text-primary-200 dark:text-yellow-300 hover:bg-primary-600 dark:hover:bg-gray-700 transition-colors"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* ❤️ Donate button */}
            <div className="relative" ref={donateRef}>
              <button
                onClick={() => setDonateOpen(o => !o)}
                title="Support our ministry"
                className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-100 px-2 py-1 rounded-md hover:bg-primary-600 dark:hover:bg-gray-700 transition-colors"
              >
                <Heart size={14} className="fill-rose-400" />
                <span className="hidden sm:inline">Donate</span>
              </button>

              {/* Dropdown */}
              {donateOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 w-56 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1 text-rose-500">
                    <Heart size={13} className="fill-rose-500" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Support Ministry</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    Donations go to{' '}
                    <a href="https://www.facebook.com/JalajalaBibleBaptistChurch" target="_blank" rel="noopener noreferrer"
                      className="text-primary-600 hover:underline font-medium">JBBC</a>. 🙏
                  </p>
                  <div className="flex flex-col gap-2">
                    {DONATE_METHODS.map(m => (
                      <button
                        key={m.key}
                        onClick={() => {
                          if (m.url) {
                            window.open(m.url, '_blank', 'noopener,noreferrer');
                            setDonateOpen(false);
                          } else {
                            setQrMethod(m.key);
                            setDonateOpen(false);
                          }
                        }}
                        className={`${m.color} text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors w-full`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

        {/* Top Nav — desktop only (hidden on mobile, replaced by bottom nav) */}
        <nav className="hidden sm:flex max-w-5xl mx-auto px-4 pb-2 gap-1 overflow-x-auto scrollbar-none">
          {navItems.map(({ to, matchPath, icon, label }) => (
            <NavLink key={matchPath} to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  isActive ? 'bg-white text-primary-700' : 'text-primary-100 hover:bg-primary-600 dark:hover:bg-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {navItems.find(n => n.matchPath === matchPath)?.icon}
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Scrollable content area only */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 content-scroll pb-16 sm:pb-0">
        <main className="max-w-5xl mx-auto w-full px-4 py-6 min-h-full">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-600 py-4 border-t border-gray-200 dark:border-gray-800">
          {team?.name || 'Music Team'} © {new Date().getFullYear()}
        </footer>
      </div>

      {/* Mobile Bottom Navigation — visible on small screens only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-stretch safe-area-pb">
        {navItems.map(({ to, matchPath, icon, label }) => (
          <NavLink
            key={matchPath}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}>
                  {icon}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
