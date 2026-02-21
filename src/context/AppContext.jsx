import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, getDoc, getDocs, query, where, addDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);           // Firebase auth user
  const [authLoading, setAuthLoading] = useState(true);

  const [teamId, setTeamId] = useState(null);       // current team doc ID
  const [team, setTeam] = useState(null);           // team metadata
  const [teamLoading, setTeamLoading] = useState(false);
  const [userTeams, setUserTeams] = useState([]);   // all teams user has ever joined

  const [members, setMembers] = useState([]);
  const [lineups, setLineups] = useState([]);

  // For public (guest) viewing — loaded without auth
  const [publicTeamId, setPublicTeamId] = useState(null);
  const [publicTeam, setPublicTeam] = useState(null);
  const [publicMembers, setPublicMembers] = useState([]);
  const [publicLineups, setPublicLineups] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(null);

  // --- Auth state listener ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setTeamId(null);
        setTeam(null);
        setMembers([]);
        setLineups([]);
      }
    });
    return unsub;
  }, []);

  // --- Load user's team when user is set ---
  useEffect(() => {
    if (!user) return;
    setTeamLoading(true);
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const currentTeamId = data.teamId || null;
        setTeamId(currentTeamId);

        // Backfill teams history for existing users who don't have it yet
        if (currentTeamId && (!data.teams || data.teams.length === 0)) {
          try {
            const teamSnap = await getDoc(doc(db, 'teams', currentTeamId));
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              const backfilledTeams = [
                { teamId: currentTeamId, name: teamData.name, inviteCode: teamData.inviteCode }
              ];
              await setDoc(userRef, { teams: backfilledTeams }, { merge: true });
              setUserTeams(backfilledTeams);
            } else {
              setUserTeams([]);
            }
          } catch (e) {
            setUserTeams(data.teams || []);
          }
        } else {
          setUserTeams(data.teams || []);
        }
      } else {
        setTeamId(null);
        setUserTeams([]);
      }
      setTeamLoading(false);
    });
    return unsub;
  }, [user]);

  // --- Load team metadata ---
  useEffect(() => {
    if (!teamId) { setTeam(null); return; }
    const unsub = onSnapshot(doc(db, 'teams', teamId), (snap) => {
      setTeam(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [teamId]);

  // --- Load members ---
  useEffect(() => {
    if (!teamId) { setMembers([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name)));
    });
    return unsub;
  }, [teamId]);

  // --- Load lineups ---
  useEffect(() => {
    if (!teamId) { setLineups([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'lineups'), (snap) => {
      setLineups(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.date.localeCompare(b.date)));
    });
    return unsub;
  }, [teamId]);

  // ==================== AUTH ====================
  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    // redirect to login — handled by AuthGuard reacting to user becoming null
  };

  const isAdmin = !!user && !!teamId; // logged in + has a team = can edit
  const isPublic = team?.isPublic !== false; // default true if not set

  // ==================== TEAM MANAGEMENT ====================
  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code.slice(0, 4) + '-' + code.slice(4);
  }

  const updateTeamVisibility = async (isPublicValue) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId), { isPublic: isPublicValue });
  };

  // Load a team's public data without being logged in
  const loadPublicTeam = async (tId) => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const teamSnap = await getDoc(doc(db, 'teams', tId));
      if (!teamSnap.exists()) {
        setPublicError('Team not found.');
        setPublicLoading(false);
        return false;
      }
      const data = { id: teamSnap.id, ...teamSnap.data() };
      if (data.isPublic === false) {
        setPublicError('private');
        setPublicLoading(false);
        return false;
      }
      setPublicTeam(data);
      setPublicTeamId(tId);

      // Load lineups
      const lineupsSnap = await getDocs(collection(db, 'teams', tId, 'lineups'));
      setPublicLineups(
        lineupsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      // Load members
      const membersSnap = await getDocs(collection(db, 'teams', tId, 'members'));
      setPublicMembers(
        membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setPublicLoading(false);
      return true;
    } catch (e) {
      setPublicError('Failed to load team data.');
      setPublicLoading(false);
      return false;
    }
  };

  // Search public teams by name
  const searchPublicTeams = async (searchTerm) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    const snap = await getDocs(collection(db, 'teams'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.isPublic !== false && t.name.toLowerCase().includes(term));
  };

  // Find a public team by invite code
  const findPublicTeamByCode = async (code) => {
    const q = query(collection(db, 'teams'), where('inviteCode', '==', code.trim().toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (data.isPublic === false) return null;
    return data;
  };

  const createTeam = async (teamName) => {
    if (!user) throw new Error('Not logged in');
    const inviteCode = generateInviteCode();
    const teamRef = await addDoc(collection(db, 'teams'), {
      name: teamName,
      createdBy: user.uid,
      createdByEmail: user.email,
      inviteCode,
      adminUids: [user.uid],
      isPublic: true,
      createdAt: new Date().toISOString(),
    });
    // Build updated teams history (avoid duplicates)
    const existingTeams = userTeams.filter(t => t.teamId !== teamRef.id);
    const updatedTeams = [
      ...existingTeams,
      { teamId: teamRef.id, name: teamName, inviteCode },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: teamRef.id,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
      teams: updatedTeams,
    });

    // Send welcome email (fire-and-forget — don't block team creation)
    try {
      const scheduleUrl = `${window.location.origin}/team/${teamRef.id}`;
      await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: user.email,
          toName: user.displayName || '',
          teamName,
          inviteCode,
          scheduleUrl,
        }),
      });
    } catch (e) {
      // Email failure is non-fatal
      console.warn('Welcome email failed:', e);
    }

    return teamRef.id;
  };

  const joinTeam = async (inviteCode) => {
    if (!user) throw new Error('Not logged in');
    const code = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'teams'), where('inviteCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Invalid invite code. Please check and try again.');
    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data();
    // Build updated teams history (avoid duplicates)
    const existingTeams = userTeams.filter(t => t.teamId !== teamDoc.id);
    const updatedTeams = [
      ...existingTeams,
      { teamId: teamDoc.id, name: teamData.name, inviteCode: teamData.inviteCode },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: teamDoc.id,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
      teams: updatedTeams,
    });
    return teamDoc.id;
  };

  const switchToTeam = async (targetTeamId) => {
    if (!user) return;
    // Get fresh team data to ensure invite code is current
    const teamSnap = await getDoc(doc(db, 'teams', targetTeamId));
    if (!teamSnap.exists()) throw new Error('Team not found.');
    const teamData = teamSnap.data();
    const existingTeams = userTeams.filter(t => t.teamId !== targetTeamId);
    const updatedTeams = [
      ...existingTeams,
      { teamId: targetTeamId, name: teamData.name, inviteCode: teamData.inviteCode },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: targetTeamId,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
      teams: updatedTeams,
    });
  };

  const leaveTeam = async () => {
    if (!user) return;
    // Only clear active teamId — preserve teams history
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { teamId: null, email: user.email }, { merge: true });
    setTeamId(null);
  };

  // ==================== MEMBERS ====================
  const addMember = async (member) => {
    if (!teamId) return;
    const ref = doc(collection(db, 'teams', teamId, 'members'));
    await setDoc(ref, member);
    return ref.id;
  };

  const updateMember = async (id, updates) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId, 'members', id), updates);
  };

  const deleteMember = async (id) => {
    if (!teamId) return;
    await deleteDoc(doc(db, 'teams', teamId, 'members', id));
  };

  const getMemberById = (id) => members.find((m) => m.id === id);

  // ==================== LINEUPS ====================
  const addLineup = async (lineup) => {
    if (!teamId) return;
    const id = lineup.date ? `lineup-${lineup.date}` : `lineup-${Date.now()}`;
    await setDoc(doc(db, 'teams', teamId, 'lineups', id), { ...lineup, id });
    return id;
  };

  const addLineups = async (lineupList) => {
    if (!teamId) return;
    const promises = lineupList.map((lineup) => {
      const id = lineup.date ? `lineup-${lineup.date}` : `lineup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return setDoc(doc(db, 'teams', teamId, 'lineups', id), { ...lineup, id });
    });
    await Promise.all(promises);
  };

  const updateLineup = async (id, updates) => {
    if (!teamId) return;
    await setDoc(doc(db, 'teams', teamId, 'lineups', id), { ...updates, id }, { merge: true });
  };

  const deleteLineup = async (id) => {
    if (!teamId) return;
    await deleteDoc(doc(db, 'teams', teamId, 'lineups', id));
  };

  const getLineupById = (id) => lineups.find((l) => l.id === id);

  const getLineupsByMonth = (year, month) => {
    return lineups.filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  };

  return (
    <AppContext.Provider
      value={{
        // Auth
        user,
        authLoading,
        teamLoading,
        loginWithGoogle,
        logout,
        isAdmin,
        // Team
        team,
        teamId,
        userTeams,
        isPublic,
        createTeam,
        joinTeam,
        leaveTeam,
        switchToTeam,
        updateTeamVisibility,
        // Public (guest) access
        loadPublicTeam,
        searchPublicTeams,
        findPublicTeamByCode,
        publicTeam,
        publicTeamId,
        publicMembers,
        publicLineups,
        publicLoading,
        publicError,
        // Data
        members,
        lineups,
        addMember,
        updateMember,
        deleteMember,
        getMemberById,
        addLineup,
        addLineups,
        updateLineup,
        deleteLineup,
        getLineupById,
        getLineupsByMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
