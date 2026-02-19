import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Music2, CalendarDays, Users, LogOut, Lock } from 'lucide-react';

export default function Layout() {
  const { isAdmin, logout } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music2 size={24} className="text-primary-200" />
            <div>
              <h1 className="text-lg font-bold leading-tight">JBBC Music Team</h1>
              <p className="text-xs text-primary-200">Worship Schedule Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-white/20 text-white font-semibold px-2 py-1 rounded-full">
                  Admin
                </span>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1 text-xs text-primary-200 hover:text-white"
                >
                  <LogOut size={13} /> Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 text-xs text-primary-200 hover:text-white"
              >
                <Lock size={13} /> Admin Login
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-4 pb-2 flex gap-1">
          {[
            { to: '/', icon: <CalendarDays size={15} />, label: 'Schedule' },
            { to: '/members', icon: <Users size={15} />, label: 'Members' },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-primary-700'
                    : 'text-primary-100 hover:bg-primary-600'
                }`
              }
            >
              {icon}{label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        JBBC Music Team © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
