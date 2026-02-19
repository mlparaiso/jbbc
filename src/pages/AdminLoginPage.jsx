import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, LogOut, CalendarDays, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const { isAdmin, login, logout } = useApp();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(pin);
    if (ok) {
      navigate('/');
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  if (isAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center">
        <div className="card">
          <ShieldCheck size={44} className="mx-auto mb-3 text-green-500" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">You're logged in as Admin</h2>
          <p className="text-gray-500 text-sm mb-6">You have full access to create and edit lineups.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="btn-primary flex items-center gap-1.5">
              <CalendarDays size={15} /> Go to Schedule
            </button>
            <button onClick={logout} className="btn-danger flex items-center gap-1.5">
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card">
        <div className="text-center mb-6">
          <Lock size={40} className="mx-auto mb-2 text-primary-500" />
          <h2 className="text-xl font-bold text-gray-800">Admin Login</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your PIN to access admin features.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Admin PIN</label>
            <input
              type="password"
              className="input text-center text-2xl tracking-widest"
              placeholder="••••"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              maxLength={8}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center flex items-center justify-center gap-1">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-1.5">
            <Lock size={15} /> Login
          </button>
        </form>
      </div>
    </div>
  );
}
