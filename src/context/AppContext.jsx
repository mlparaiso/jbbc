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

  const [members, setMembers] = useState([]);
  const [lineups, setLineups] = useState([]);

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
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTeamId(data.teamId || null);
      } else {
        setTeamId(null);
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
  };

  const isAdmin = !!user && !!teamId; // logged in + has a team = can edit

  // ==================== TEAM MANAGEMENT ====================
  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code.slice(0, 4) + '-' + code.slice(4);
  }

  const createTeam = async (teamName) => {
    if (!user) throw new Error('Not logged in');
    const inviteCode = generateInviteCode();
    const teamRef = await addDoc(collection(db, 'teams'), {
      name: teamName,
      createdBy: user.uid,
      createdByEmail: user.email,
      inviteCode,
      adminUids: [user.uid],
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', user.uid), {
      teamId: teamRef.id,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
    });
    return teamRef.id;
  };

  const joinTeam = async (inviteCode) => {
    if (!user) throw new Error('Not logged in');
    const code = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'teams'), where('inviteCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Invalid invite code. Please check and try again.');
    const teamDoc = snap.docs[0];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: teamDoc.id,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
    });
    return teamDoc.id;
  };

  const leaveTeam = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { teamId: null, email: user.email });
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
        createTeam,
        joinTeam,
        leaveTeam,
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
