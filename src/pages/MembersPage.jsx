import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_CATEGORIES } from '../data/initialData';
import { Users, Star, UserPlus, Search, UserX, Pencil, Trash2 } from 'lucide-react';

const ALL_ROLES = Object.values(ROLE_CATEGORIES);

const ROLE_COLORS = {
  [ROLE_CATEGORIES.VOCALIST]: 'bg-purple-100 text-purple-700',
  [ROLE_CATEGORIES.KEYBOARD]: 'bg-blue-100 text-blue-700',
  [ROLE_CATEGORIES.GUITAR]: 'bg-green-100 text-green-700',
  [ROLE_CATEGORIES.BASS]: 'bg-orange-100 text-orange-700',
  [ROLE_CATEGORIES.DRUMS]: 'bg-red-100 text-red-700',
  [ROLE_CATEGORIES.SOUND]: 'bg-gray-100 text-gray-700',
};

function MemberForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', nickname: '', roles: [], isTeamA: false,
  });

  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }));
  };

  return (
    <div className="card border border-primary-200 bg-primary-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" />
        </div>
        <div>
          <label className="label">Nickname</label>
          <input className="input" value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="e.g. Juan" />
        </div>
      </div>

      <div>
        <span className="label">Roles (select all that apply)</span>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map(role => (
            <button key={role} type="button"
              onClick={() => toggleRole(role)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.roles.includes(role)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
              }`}>
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isTeamA-form" checked={form.isTeamA}
          onChange={e => setForm(f => ({ ...f, isTeamA: e.target.checked }))}
          className="w-4 h-4" />
        <label htmlFor="isTeamA-form" className="text-sm text-gray-700">Team A member (senior leader)</label>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => {
          if (!form.name.trim()) return alert('Name is required.');
          onSave(form);
        }}>Save</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { members, isAdmin, addMember, updateMember, deleteMember } = useApp();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.nickname || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || m.roles.includes(filterRole);
    return matchSearch && matchRole;
  });

  const teamA = filtered.filter(m => m.isTeamA);
  const others = filtered.filter(m => !m.isTeamA);

  const handleDelete = (id, name) => {
    if (window.confirm(`Remove ${name} from the team? This cannot be undone.`)) {
      deleteMember(id);
    }
  };

  function MemberCard({ m }) {
    if (editId === m.id) {
      return (
        <MemberForm
          initial={m}
          onSave={(data) => { updateMember(m.id, data); setEditId(null); }}
          onCancel={() => setEditId(null)}
        />
      );
    }
    return (
      <div className="card flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{m.name}</span>
            {m.nickname && m.nickname !== m.name && (
              <span className="text-xs text-gray-500">({m.nickname})</span>
            )}
            {m.isTeamA && (
              <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Team A</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {m.roles.map(role => (
              <span key={role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                {role}
              </span>
            ))}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => setEditId(m.id)}
              className="text-primary-600 hover:text-primary-800 p-1" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleDelete(m.id, m.name)}
              className="text-red-400 hover:text-red-600 p-1" title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={22} className="text-primary-600" /> Team Members
        </h2>
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <UserPlus size={15} /> Add Member
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdmin && showAdd && (
        <div className="mb-4">
          <MemberForm
            onSave={(data) => { addMember(data); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="input pl-8 w-full" placeholder="Search by name..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-xs" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} member{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Team A */}
      {teamA.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Star size={14} className="text-primary-400" /> Team A — Senior Leaders
          </h3>
          <div className="space-y-2">
            {teamA.map(m => <MemberCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* Other Members */}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Music Team Members</h3>
          <div className="space-y-2">
            {others.map(m => <MemberCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <UserX size={48} className="mx-auto mb-3 opacity-40" />
          <p>No members found.</p>
        </div>
      )}
    </div>
  );
}
