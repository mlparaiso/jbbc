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
      <div className="max-w-sm mx-auto mt-12">
        <div className="card text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <ShieldCheck size={28} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Logged in as Admin</h2>
            <p className="text-sm text-gray-500 mt-1">You have full access to create and edit lineups.</p>
          </div>
          <div className="flex gap-3 justify-center pt-1">
            <button onClick={() => navigate('/')} className="btn-primary flex items-center gap-1.5">
              <CalendarDays size={15} /> Go to Schedule
            </button>
            <button onClick={logout} className="btn-secondary flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50">
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="card space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <Lock size={26} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Admin Login</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your PIN to access admin features.</p>
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
            <div className="flex items-center justify-center gap-1.5 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-1.5">
            <Lock size={15} /> Login
          </button>
        </form>
      </div>
    </div>
  );
}
