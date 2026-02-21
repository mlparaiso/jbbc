import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Music2, Plus, LogIn, Copy, Check, LogOut, RefreshCw, AlertTriangle, Users, Globe, Lock } from 'lucide-react';
import TeamLogoUploader from '../components/TeamLogoUploader';

export default function TeamSetupPage() {
  const { user, team, teamId, userTeams, isPublic, myRole, isMainAdmin, canSeeInviteCode, createTeam, joinTeam, leaveTeam, switchToTeam, logout, updateTeamVisibility, updateTeamLogo, authLoading, teamLoading } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null); // teamId being switched to
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false); // show leave confirmation

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

    const handleLeaveClick = () => {
      setConfirmLeave(true);
    };

    const handleConfirmLeave = async () => {
      await leaveTeam();
      setConfirmLeave(false);
    };

    return (
      <div className="max-w-sm mx-auto mt-12 space-y-6">
        <div className="card text-center space-y-3">
          {/* Team Logo — click to upload */}
          <div className="flex flex-col items-center gap-1">
            <TeamLogoUploader currentLogoUrl={team.logoUrl} onUpload={updateTeamLogo}>
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                {team.logoUrl
                  ? <img src={team.logoUrl} alt="Team logo" className="w-full h-full object-cover" />
                  : <Music2 size={30} className="text-primary-600" />
                }
              </div>
            </TeamLogoUploader>
            <p className="text-[10px] text-gray-400">Click to change logo</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your Team</p>
            <h2 className="text-xl font-bold text-gray-800">{team.name}</h2>
          </div>
          {/* Invite code — only visible to Main Admin and Co-Admin */}
          {canSeeInviteCode ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                Invite Code — share with {isMainAdmin ? 'co-admins and members' : 'new members'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-mono font-bold text-primary-700 tracking-widest">{team.inviteCode}</span>
                <button onClick={copyCode} className="text-gray-400 hover:text-primary-600">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 text-center">
                Contact your team admin to invite new members.
              </p>
            </div>
          )}

          {/* Visibility toggle — only for admin/co-admin */}
          {canSeeInviteCode && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isPublic
                    ? <Globe size={15} className="text-green-500" />
                    : <Lock size={15} className="text-gray-400" />
                  }
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Schedule Visibility</p>
                    <p className="text-xs text-gray-400">{isPublic ? 'Anyone can view your schedule' : 'Only team members can view'}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateTeamVisibility(!isPublic)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    isPublic ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => navigate('/')} className="btn-primary flex-1">
              Go to Schedule →
            </button>
          </div>

          {/* Leave confirmation */}
          {!confirmLeave ? (
            <div className="flex gap-2">
              <button
                onClick={handleLeaveClick}
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
          ) : (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  Save your invite code before switching — you'll need it to rejoin if it's not in your team history.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white border border-amber-200 rounded p-2">
                <span className="font-mono font-bold text-primary-700 tracking-widest">{team.inviteCode}</span>
                <button onClick={copyCode} className="text-gray-400 hover:text-primary-600">
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmLeave}
                  className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded py-1.5 font-medium"
                >
                  Yes, switch team
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded py-1.5 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

  const handleSwitchTo = async (targetTeamId) => {
    setError('');
    setSwitchingTo(targetTeamId);
    try {
      await switchToTeam(targetTeamId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSwitchingTo(null);
    }
  };

  // Teams the user has been in (excluding current, which is null here)
  const previousTeams = userTeams.filter(t => t.teamId !== teamId);

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

      {/* My Teams — quick rejoin */}
      {!mode && previousTeams.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-500" />
            <h3 className="font-semibold text-gray-700 text-sm">My Teams</h3>
          </div>
          <div className="space-y-2">
            {previousTeams.map(t => (
              <div key={t.teamId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{t.inviteCode}</p>
                </div>
                <button
                  onClick={() => handleSwitchTo(t.teamId)}
                  disabled={switchingTo === t.teamId}
                  className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded px-2.5 py-1.5 font-medium disabled:opacity-60"
                >
                  <RefreshCw size={12} className={switchingTo === t.teamId ? 'animate-spin' : ''} />
                  {switchingTo === t.teamId ? 'Switching...' : 'Switch'}
                </button>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="border-t pt-2">
            <p className="text-xs text-gray-400 text-center">Or join / create a different team below</p>
          </div>
        </div>
      )}

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
