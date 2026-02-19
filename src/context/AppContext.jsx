import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_MEMBERS, INITIAL_LINEUPS, DATA_VERSION } from '../data/initialData';

const AppContext = createContext(null);

const ADMIN_PIN = '1234'; // Change this to your desired PIN
const STORAGE_KEYS = {
  MEMBERS: 'jbbc_members',
  LINEUPS: 'jbbc_lineups',
  IS_ADMIN: 'jbbc_is_admin',
  VERSION: 'jbbc_data_version',
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Deduplicate lineups by id (in case old bug left duplicates in storage)
    if (key === 'jbbc_lineups' && Array.isArray(parsed)) {
      const seen = new Set();
      return parsed.filter(item => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }
    return parsed;
  } catch {
    return fallback;
  }
}

// If the stored version doesn't match DATA_VERSION, wipe and reload fresh data
function initStorage() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
  if (storedVersion !== DATA_VERSION) {
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.LINEUPS);
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
  }
}
initStorage();

export function AppProvider({ children }) {
  const [members, setMembers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS)
  );
  const [lineups, setLineups] = useState(() =>
    loadFromStorage(STORAGE_KEYS.LINEUPS, INITIAL_LINEUPS)
  );
  const [isAdmin, setIsAdmin] = useState(() =>
    loadFromStorage(STORAGE_KEYS.IS_ADMIN, false)
  );

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LINEUPS, JSON.stringify(lineups));
  }, [lineups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN, JSON.stringify(isAdmin));
  }, [isAdmin]);

  // Admin auth
  const login = (pin) => {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAdmin(false);

  // Member CRUD
  const addMember = (member) => {
    const newMember = { ...member, id: `mem-${Date.now()}` };
    setMembers((prev) => [...prev, newMember]);
  };

  const updateMember = (id, updates) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const deleteMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const getMemberById = (id) => members.find((m) => m.id === id);

  // Lineup CRUD
  const addLineup = (lineup) => {
    const newLineup = { ...lineup, id: `lineup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setLineups((prev) => [...prev, newLineup].sort((a, b) => a.date.localeCompare(b.date)));
    return newLineup;
  };

  // Add multiple lineups atomically in one state update (prevents duplicates from batching issues)
  const addLineups = (lineupList) => {
    const newLineups = lineupList.map((lineup, i) => ({
      ...lineup,
      id: `lineup-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setLineups((prev) => [...prev, ...newLineups].sort((a, b) => a.date.localeCompare(b.date)));
    return newLineups;
  };

  const updateLineup = (id, updates) => {
    setLineups((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, ...updates } : l))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  };

  const deleteLineup = (id) => {
    setLineups((prev) => prev.filter((l) => l.id !== id));
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
        members,
        lineups,
        isAdmin,
        login,
        logout,
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
