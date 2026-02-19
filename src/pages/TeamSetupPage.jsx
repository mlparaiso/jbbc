import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Music2, Plus, LogIn, Copy, Check, LogOut } from 'lucide-react';

export default function TeamSetupPage() {
  const { user, team, teamId, createTeam, joinTeam, leaveTeam, logout, authLoading, teamLoading } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) {
    navigate('/admin', { replace: true });
    return null;
  }

  // Already has a team → show team info / invite code
  if (teamId && team) {
    const copyCode = () => {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="max-w-sm mx-auto mt-12 space-y-6">
        <div className="card text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
            <Music2 size={28} className="text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your Team</p>
            <h2 className="text-xl font-bold text-gray-800">{team.name}</h2>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Invite Code — share this to add co-admins</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-mono font-bold text-primary-700 tracking-widest">{team.inviteCode}</span>
              <button onClick={copyCode} className="text-gray-400 hover:text-primary-600">
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => navigate('/')} className="btn-primary flex-1">
              Go to Schedule →
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => { await leaveTeam(); }}
              className="text-xs text-gray-400 hover:text-red-500 flex-1"
            >
              Switch / Leave Team
            </button>
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 flex-1 justify-center"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has no team yet → choose create or join
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setError('');
    setLoading(true);
    try {
      await createTeam(teamName.trim());
      navigate('/team-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      await joinTeam(inviteCode.trim());
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      {/* Welcome */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
        </div>
        <p className="text-sm text-gray-500">Welcome, <span className="font-semibold text-gray-700">{user.displayName}</span>!</p>
        <h2 className="text-xl font-bold text-gray-800 mt-1">Set up your team</h2>
        <p className="text-xs text-gray-400 mt-1">Create a new team or join an existing one with an invite code.</p>
      </div>

      {/* Mode buttons */}
      {!mode && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setMode('create')}
            className="btn-primary flex items-center justify-center gap-2">
            <Plus size={16} /> Create a new team
          </button>
          <button onClick={() => setMode('join')}
            className="btn-secondary flex items-center justify-center gap-2">
            <LogIn size={16} /> Join with invite code
          </button>
          <button onClick={async () => { await logout(); navigate('/'); }}
            className="text-xs text-gray-400 hover:text-red-500 text-center mt-2 flex items-center justify-center gap-1">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      )}

      {/* Create form */}
      {mode === 'create' && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Create a new team</h3>
          <div>
            <label className="label">Team / Church name *</label>
            <input type="text" className="input" placeholder="e.g. JBBC Music Team"
              value={teamName} onChange={e => setTeamName(e.target.value)} required autoFocus />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            <button type="button" onClick={() => { setMode(null); setError(''); }} className="btn-secondary">
              Back
            </button>
          </div>
        </form>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <form onSubmit={handleJoin} className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Join an existing team</h3>
          <div>
            <label className="label">Invite Code *</label>
            <input type="text" className="input font-mono tracking-widest uppercase"
              placeholder="e.g. JBBC-7X2K"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={9}
              required autoFocus />
            <p className="text-xs text-gray-400 mt-1">Ask your team leader for the invite code.</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Joining...' : 'Join Team'}
            </button>
            <button type="button" onClick={() => { setMode(null); setError(''); }} className="btn-secondary">
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
