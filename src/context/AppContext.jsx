import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, getDoc, getDocs, query, where, addDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);           // Firebase auth user
  const [authLoading, setAuthLoading] = useState(true);

  const [teamId, setTeamId] = useState(null);       // current team doc ID
  const [team, setTeam] = useState(null);           // team metadata
  const [teamLoading, setTeamLoading] = useState(true); // true until we know if user has a team
  const [userTeams, setUserTeams] = useState([]);   // all teams user has ever joined

  const [members, setMembers] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [songs, setSongs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [myRole, setMyRole] = useState(null); // 'main_admin' | 'co_admin' | 'member' | null

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
        setSongs([]);
        setTemplates([]);
        setTeamLoading(false); // No user = no team to load
        return;
      }
      // Detect first-time sign-in: check Firestore for a 'welcomeSent' flag
      try {
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists() || !snap.data().welcomeSent) {
          // Mark sent immediately (before the fetch) to avoid duplicates on fast re-renders
          await setDoc(userRef, { welcomeSent: true }, { merge: true });
          fetch('/api/send-signup-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toEmail: u.email, toName: u.displayName || '' }),
          }).catch(e => console.warn('Signup welcome email failed:', e));
        }
      } catch (e) {
        console.warn('Could not check/send signup welcome email:', e);
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

  // --- Derive myRole from team members list (match by email) ---
  // Also syncs uid onto the member doc and into adminUids so Firestore rules work correctly.
  useEffect(() => {
    if (!user || !teamId || !team) { setMyRole(null); return; }

    const currentAdminUids = team.adminUids || [];

    // Team creator is always main_admin — also ensure their uid is in adminUids
    const isCreatorByUid = team.createdBy === user.uid;
    const isCreatorByEmail = team.createdByEmail &&
      team.createdByEmail.toLowerCase() === user.email?.toLowerCase();

    if (isCreatorByUid || isCreatorByEmail) {
      setMyRole('main_admin');

      // Build the update patch — always ensure uid is in adminUids
      const patch = {};
      if (!currentAdminUids.includes(user.uid)) {
        patch.adminUids = [...currentAdminUids, user.uid];
      }
      // If createdBy was stored as email (old teams), fix it to uid
      if (!isCreatorByUid) {
        patch.createdBy = user.uid;
      }
      if (Object.keys(patch).length > 0) {
        updateDoc(doc(db, 'teams', teamId), patch).catch(() => {});
      }
      return;
    }

    // Look up member by email and read their teamRole field
    const match = members.find(m => m.email && m.email.toLowerCase() === user.email.toLowerCase());
    if (match) {
      const role = match.teamRole || 'member';
      setMyRole(role);

      // Backfill: store uid on the member doc if missing
      if (!match.uid) {
        updateDoc(doc(db, 'teams', teamId, 'members', match.id), { uid: user.uid }).catch(() => {});
      }

      // Sync adminUids on the team doc so Firestore write rules work for co_admin / main_admin
      if (role === 'co_admin' || role === 'main_admin') {
        if (!currentAdminUids.includes(user.uid)) {
          updateDoc(doc(db, 'teams', teamId), {
            adminUids: [...currentAdminUids, user.uid],
          }).catch(() => {});
        }
      } else {
        // If demoted to member, remove from adminUids if present
        if (currentAdminUids.includes(user.uid)) {
          updateDoc(doc(db, 'teams', teamId), {
            adminUids: currentAdminUids.filter(uid => uid !== user.uid),
          }).catch(() => {});
        }
      }
    } else {
      // Fallback: if user is in adminUids, treat as co_admin
      if (currentAdminUids.includes(user.uid)) {
        setMyRole('co_admin');
      } else {
        setMyRole('member');
      }
    }
  }, [user, teamId, team, members]);

  // --- Load members ---
  useEffect(() => {
    if (!teamId) { setMembers([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });
    return unsub;
  }, [teamId]);

  // --- Load lineups ---
  useEffect(() => {
    if (!teamId) { setLineups([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'lineups'), (snap) => {
      setLineups(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    });
    return unsub;
  }, [teamId]);

  // --- Load songs ---
  useEffect(() => {
    if (!teamId) { setSongs([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'songs'), (snap) => {
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.title || '').localeCompare(b.title || '')));
    });
    return unsub;
  }, [teamId]);

  // --- Load templates ---
  useEffect(() => {
    if (!teamId) { setTemplates([]); return; }
    const unsub = onSnapshot(collection(db, 'teams', teamId, 'templates'), (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')));
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

  // Convenience role helpers
  const isMainAdmin = myRole === 'main_admin';
  const isCoAdmin = myRole === 'co_admin';
  const canManageLineups = myRole === 'main_admin' || myRole === 'co_admin';
  const canSeeInviteCode = myRole === 'main_admin' || myRole === 'co_admin';

  // Team feature flags derived from team doc
  const hasTeamA = team?.hasTeamA === true;

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

  // Generic team settings updater — merges any fields into the team doc
  const updateTeamSettings = async (patch) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId), patch);
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

    // Send join emails: welcome to joiner + notification to admin (fire-and-forget)
    try {
      const scheduleUrl = `${window.location.origin}/team/${teamDoc.id}`;
      fetch('/api/send-join-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinerEmail: user.email,
          joinerName: user.displayName || '',
          adminEmail: teamData.createdByEmail || null,
          adminName: '',
          teamName: teamData.name,
          scheduleUrl,
        }),
      }).catch(e => console.warn('Join emails failed:', e));
    } catch (e) {
      console.warn('Join emails failed:', e);
    }

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

  // ==================== SONGS ====================
  const addSong = async (song) => {
    if (!teamId) return;
    const ref = doc(collection(db, 'teams', teamId, 'songs'));
    const now = new Date().toISOString();
    await setDoc(ref, { ...song, id: ref.id, createdAt: now, updatedAt: now });
    return ref.id;
  };

  const updateSong = async (id, updates) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId, 'songs', id), { ...updates, updatedAt: new Date().toISOString() });
  };

  const deleteSong = async (id) => {
    if (!teamId) return;
    await deleteDoc(doc(db, 'teams', teamId, 'songs', id));
  };

  // ==================== TEMPLATES ====================
  const addTemplate = async (template) => {
    if (!teamId) return;
    const ref = doc(collection(db, 'teams', teamId, 'templates'));
    const now = new Date().toISOString();
    await setDoc(ref, { ...template, id: ref.id, createdAt: now, updatedAt: now });
    return ref.id;
  };

  const updateTemplate = async (id, updates) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId, 'templates', id), { ...updates, updatedAt: new Date().toISOString() });
  };

  const deleteTemplate = async (id) => {
    if (!teamId) return;
    await deleteDoc(doc(db, 'teams', teamId, 'templates', id));
  };

  const getLineupsByMonth = (year, month) => {
    return lineups.filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  };

  // ==================== ROLE MANAGEMENT ====================
  /**
   * Update a member's teamRole field.
   * Main Admin can set any role; Co-Admin can only set 'co_admin' or 'member'.
   */
  const updateMemberRole = async (memberId, newRole) => {
    if (!teamId) return;
    if (!canManageLineups) throw new Error('Permission denied');
    // Co-admins cannot assign main_admin
    if (myRole === 'co_admin' && newRole === 'main_admin') throw new Error('Permission denied');

    // Update the member's teamRole field
    await updateDoc(doc(db, 'teams', teamId, 'members', memberId), { teamRole: newRole });

    // Sync adminUids on the team document so Firestore rules stay accurate.
    // We need the member's uid to add/remove from adminUids.
    const targetMember = members.find(m => m.id === memberId);
    if (targetMember?.uid) {
      const currentAdminUids = team?.adminUids || [];
      let updatedAdminUids;
      if (newRole === 'main_admin' || newRole === 'co_admin') {
        // Add uid to adminUids if not already present
        updatedAdminUids = currentAdminUids.includes(targetMember.uid)
          ? currentAdminUids
          : [...currentAdminUids, targetMember.uid];
      } else {
        // Remove uid from adminUids (demoted to member or removed)
        updatedAdminUids = currentAdminUids.filter(uid => uid !== targetMember.uid);
      }
      await updateDoc(doc(db, 'teams', teamId), { adminUids: updatedAdminUids });
    }
  };

  /**
   * Transfer Main Admin to another member (only current main_admin can do this).
   * Demotes current user to 'member', promotes target to 'main_admin', and updates team.createdBy.
   */
  const transferMainAdmin = async (newMainAdminMemberId) => {
    if (!teamId || myRole !== 'main_admin') throw new Error('Permission denied');
    const targetMember = members.find(m => m.id === newMainAdminMemberId);
    if (!targetMember) throw new Error('Member not found');
    // Update team's createdBy to the new admin's uid (if they have one stored)
    // We store the new admin role on the member document; role is derived from email match
    await updateDoc(doc(db, 'teams', teamId, 'members', newMainAdminMemberId), { teamRole: 'main_admin' });
    // Also update team.createdBy if the target has a uid
    if (targetMember.uid) {
      await updateDoc(doc(db, 'teams', teamId), { createdBy: targetMember.uid });
    }
    // Demote current user's member record
    const myMember = members.find(m => m.email && m.email.toLowerCase() === user.email.toLowerCase());
    if (myMember) {
      await updateDoc(doc(db, 'teams', teamId, 'members', myMember.id), { teamRole: 'member' });
    }
  };

  // ==================== TEAM LOGO ====================
  const updateTeamLogo = async (blob) => {
    if (!teamId || !user) throw new Error('Not logged in or no team');
    const storageRef = ref(storage, `team-logos/${teamId}/logo.jpg`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'teams', teamId), { logoUrl: url });
    return url;
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
        // Roles
        myRole,
        isMainAdmin,
        isCoAdmin,
        canManageLineups,
        canSeeInviteCode,
        updateMemberRole,
        transferMainAdmin,
        // Team
        team,
        teamId,
        userTeams,
        isPublic,
        hasTeamA,
        createTeam,
        joinTeam,
        leaveTeam,
        switchToTeam,
        updateTeamVisibility,
        updateTeamSettings,
        updateTeamLogo,
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
        songs,
        templates,
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
        addSong,
        updateSong,
        deleteSong,
        addTemplate,
        updateTemplate,
        deleteTemplate,
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
