import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, getDoc, getDocs, addDoc, deleteField,
  arrayUnion, arrayRemove, writeBatch,
} from 'firebase/firestore';
import { auth, googleProvider, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DEFAULT_WORSHIP_LEADER_ROLES, DEFAULT_INSTRUMENT_SLOTS } from '../data/defaultAppConfig';

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
  const [teamInviteCode, setTeamInviteCode] = useState(null); // only populated for admins — see effect below
  const [appConfig, setAppConfig] = useState(null); // { worshipLeaderRoles, instrumentSlots } — null until config/appConfig loads (or doesn't exist)

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
          const idToken = await u.getIdToken();
          fetch('/api/send-signup-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ toName: u.displayName || '' }),
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

        // Backfill teams history for existing users who don't have it yet.
        // inviteCode no longer lives on the public team doc (see private/secrets),
        // so it's reconstructed from this user's own already-validated `joinCode`
        // field — guaranteed correct for their current team by the write-time
        // Firestore rule check on every join/create/switch.
        if (currentTeamId && (!data.teams || data.teams.length === 0)) {
          try {
            const teamSnap = await getDoc(doc(db, 'teams', currentTeamId));
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              const backfilledTeams = [
                { teamId: currentTeamId, name: teamData.name, inviteCode: data.joinCode || null }
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
  // Also syncs uid onto the member doc and into the team's protected secrets
  // doc's adminUids so Firestore rules work correctly. Secrets are readable
  // only by the team's own creator/admins — for a plain member, the getDoc
  // below is *expected* to be denied (caught and ignored); their role still
  // resolves correctly from the members-collection lookup regardless.
  useEffect(() => {
    if (!user || !teamId || !team) { setMyRole(null); return; }
    let cancelled = false;

    (async () => {
      let secrets = null;
      try {
        const secretsSnap = await getDoc(doc(db, 'teams', teamId, 'private', 'secrets'));
        if (secretsSnap.exists()) secrets = secretsSnap.data();
      } catch {
        // Not creator/admin yet — fine, see comment above.
      }
      if (cancelled) return;

      const currentAdminUids = secrets?.adminUids || [];
      const secretsRef = doc(db, 'teams', teamId, 'private', 'secrets');

      // Team creator is always main_admin — also ensure their uid is in adminUids
      const isCreatorByUid = secrets?.createdBy === user.uid;
      const isCreatorByEmail = secrets?.createdByEmail &&
        secrets.createdByEmail.toLowerCase() === user.email?.toLowerCase();

      if (isCreatorByUid || isCreatorByEmail) {
        setMyRole('main_admin');
        const patch = {};
        if (!currentAdminUids.includes(user.uid)) patch.adminUids = arrayUnion(user.uid);
        if (!isCreatorByUid) patch.createdBy = user.uid; // fix legacy email-only createdBy
        if (Object.keys(patch).length > 0) updateDoc(secretsRef, patch).catch(() => {});
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

        // Sync adminUids on the secrets doc — only possible once already
        // readable (i.e. once already admin/creator); otherwise a no-op,
        // same as before this uid was ever added.
        if (secrets) {
          if (role === 'co_admin' || role === 'main_admin') {
            if (!currentAdminUids.includes(user.uid)) {
              updateDoc(secretsRef, { adminUids: arrayUnion(user.uid) }).catch(() => {});
            }
          } else if (currentAdminUids.includes(user.uid)) {
            updateDoc(secretsRef, { adminUids: arrayRemove(user.uid) }).catch(() => {});
          }
        }
      } else {
        // Fallback: if user is in adminUids, treat as co_admin
        setMyRole(currentAdminUids.includes(user.uid) ? 'co_admin' : 'member');
      }
    })();

    return () => { cancelled = true; };
  }, [user, teamId, team, members]);

  // --- Load invite code for display (admins only — see firestore.rules) ---
  useEffect(() => {
    const canSee = myRole === 'main_admin' || myRole === 'co_admin';
    if (!teamId || !canSee) { setTeamInviteCode(null); return; }
    const unsub = onSnapshot(
      doc(db, 'teams', teamId, 'private', 'secrets'),
      (snap) => setTeamInviteCode(snap.exists() ? snap.data().inviteCode : null),
      () => setTeamInviteCode(null),
    );
    return unsub;
  }, [teamId, myRole]);

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

  // --- Load global app config (worship leader roles & instrument slots) ---
  // Not team-scoped — a single shared document for the whole app. Loaded
  // regardless of auth state (Firestore rules allow public read) so both the
  // authenticated app and unauthenticated public lineup pages can use it.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'appConfig'), (snap) => {
      setAppConfig(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, []);

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

  // Roles/instrument-slot config with hardcoded fallbacks — so nothing breaks
  // before config/appConfig exists or before an admin customizes a field.
  const worshipLeaderRoles = appConfig?.worshipLeaderRoles || DEFAULT_WORSHIP_LEADER_ROLES;
  const instrumentSlots = appConfig?.instrumentSlots || DEFAULT_INSTRUMENT_SLOTS;

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

  // ==================== APP CONFIG (global, not team-scoped) ====================
  const updateAppConfig = async (patch) => {
    await setDoc(doc(db, 'config', 'appConfig'), patch, { merge: true });
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
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      );

      // Load members
      const membersSnap = await getDocs(collection(db, 'teams', tId, 'members'));
      setPublicMembers(
        membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
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

  // Find a public team by invite code — resolved via the inviteCodes lookup
  // collection (get-only, unenumerable), since inviteCode no longer lives on
  // the public team doc.
  const findPublicTeamByCode = async (code) => {
    const codeSnap = await getDoc(doc(db, 'inviteCodes', code.trim().toUpperCase()));
    if (!codeSnap.exists()) return null;
    const teamSnap = await getDoc(doc(db, 'teams', codeSnap.data().teamId));
    if (!teamSnap.exists()) return null;
    const data = { id: teamSnap.id, ...teamSnap.data() };
    if (data.isPublic === false) return null;
    return data;
  };

  const createTeam = async (teamName) => {
    if (!user) throw new Error('Not logged in');
    const inviteCode = generateInviteCode();
    // Public doc: only ever non-sensitive fields — invite code/admin list
    // live in the protected private/secrets subdocument (see firestore.rules).
    const teamRef = await addDoc(collection(db, 'teams'), {
      name: teamName,
      isPublic: true,
      contactEmail: user.email,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'teams', teamRef.id, 'private', 'secrets'), {
      inviteCode,
      adminUids: [user.uid],
      createdBy: user.uid,
      createdByEmail: user.email,
    });
    await setDoc(doc(db, 'inviteCodes', inviteCode), { teamId: teamRef.id });

    // Build updated teams history (avoid duplicates)
    const existingTeams = userTeams.filter(t => t.teamId !== teamRef.id);
    const updatedTeams = [
      ...existingTeams,
      { teamId: teamRef.id, name: teamName, inviteCode },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: teamRef.id,
      // Proves knowledge of the real invite code — required by firestore.rules
      // for any write that sets teamId (see /users/{uid} rule).
      joinCode: inviteCode,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
      teams: updatedTeams,
    });

    // Send welcome email (fire-and-forget — don't block team creation)
    try {
      const scheduleUrl = `${window.location.origin}/team/${teamRef.id}`;
      const idToken = await user.getIdToken();
      await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
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
    const codeSnap = await getDoc(doc(db, 'inviteCodes', code));
    if (!codeSnap.exists()) throw new Error('Invalid invite code. Please check and try again.');
    const targetTeamId = codeSnap.data().teamId;
    const teamSnap = await getDoc(doc(db, 'teams', targetTeamId));
    if (!teamSnap.exists()) throw new Error('Invalid invite code. Please check and try again.');
    const teamData = teamSnap.data();

    // Build updated teams history (avoid duplicates)
    const existingTeams = userTeams.filter(t => t.teamId !== targetTeamId);
    const updatedTeams = [
      ...existingTeams,
      { teamId: targetTeamId, name: teamData.name, inviteCode: code },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: targetTeamId,
      joinCode: code,
      email: user.email,
      displayName: user.displayName,
      role: 'admin',
      teams: updatedTeams,
    });

    // Send join emails: welcome to joiner + notification to admin (fire-and-forget).
    // teamName/adminEmail are looked up server-side from the team's own public
    // record — the function only needs teamId, not client-asserted team data.
    try {
      const scheduleUrl = `${window.location.origin}/team/${targetTeamId}`;
      const idToken = await user.getIdToken();
      fetch('/api/send-join-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ teamId: targetTeamId, scheduleUrl }),
      }).catch(e => console.warn('Join emails failed:', e));
    } catch (e) {
      console.warn('Join emails failed:', e);
    }

    return targetTeamId;
  };

  const switchToTeam = async (targetTeamId) => {
    if (!user) return;
    // The invite code for a team already in this user's own history comes
    // from that history entry itself (their own doc, always readable to
    // them) — not from the team doc, which no longer carries it.
    const existingEntry = userTeams.find(t => t.teamId === targetTeamId);
    if (!existingEntry) throw new Error('Team not found.');
    const teamSnap = await getDoc(doc(db, 'teams', targetTeamId));
    if (!teamSnap.exists()) throw new Error('Team not found.');
    const teamData = teamSnap.data();
    const existingTeams = userTeams.filter(t => t.teamId !== targetTeamId);
    const updatedTeams = [
      ...existingTeams,
      { teamId: targetTeamId, name: teamData.name, inviteCode: existingEntry.inviteCode },
    ];
    await setDoc(doc(db, 'users', user.uid), {
      teamId: targetTeamId,
      joinCode: existingEntry.inviteCode,
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
    // This write uses merge:true, which never removes a field that's simply absent
    // from `updates` — so a legacy-shaped lineup's stale `instruments`/`soundEngineer`
    // fields would otherwise survive every edit forever. Every lineup save now goes
    // exclusively through `instrumentAssignments` (see normalizeLineupInstruments),
    // so explicitly clear the old fields with Firestore's deleteField() sentinel on
    // every update, regardless of what the caller passed in.
    await setDoc(doc(db, 'teams', teamId, 'lineups', id), {
      ...updates,
      id,
      instruments: deleteField(),
      soundEngineer: deleteField(),
    }, { merge: true });
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

    // Sync adminUids on the protected secrets doc so Firestore rules stay
    // accurate. arrayUnion/arrayRemove are atomic server-side operations —
    // unlike a read-then-write of the local array, two concurrent role
    // changes can't clobber each other's update.
    const targetMember = members.find(m => m.id === memberId);
    if (targetMember?.uid) {
      const secretsRef = doc(db, 'teams', teamId, 'private', 'secrets');
      if (newRole === 'main_admin' || newRole === 'co_admin') {
        await updateDoc(secretsRef, { adminUids: arrayUnion(targetMember.uid) });
      } else {
        await updateDoc(secretsRef, { adminUids: arrayRemove(targetMember.uid) });
      }
    }
  };

  /**
   * Transfer Main Admin to another member (only current main_admin can do this).
   * Demotes current user to 'member', promotes target to 'main_admin', and updates
   * the secrets doc's createdBy — all in one atomic batch so a failure partway
   * through can't leave the team with two main_admins or a dangling createdBy.
   */
  const transferMainAdmin = async (newMainAdminMemberId) => {
    if (!teamId || myRole !== 'main_admin') throw new Error('Permission denied');
    const targetMember = members.find(m => m.id === newMainAdminMemberId);
    if (!targetMember) throw new Error('Member not found');
    const myMember = members.find(m => m.email && m.email.toLowerCase() === user.email.toLowerCase());

    const batch = writeBatch(db);
    batch.update(doc(db, 'teams', teamId, 'members', newMainAdminMemberId), { teamRole: 'main_admin' });
    if (targetMember.uid) {
      batch.update(doc(db, 'teams', teamId, 'private', 'secrets'), { createdBy: targetMember.uid });
    }
    if (myMember) {
      batch.update(doc(db, 'teams', teamId, 'members', myMember.id), { teamRole: 'member' });
    }
    await batch.commit();
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
        teamInviteCode,
        userTeams,
        isPublic,
        hasTeamA,
        worshipLeaderRoles,
        instrumentSlots,
        updateAppConfig,
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
