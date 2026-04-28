import { useMemo, useState } from 'react';
import { Music2, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SONG_KEYS = ['', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SONG_TAGS = ['Opening', 'Opening/Welcome', 'Welcome', 'Praise and Worship', "Lord's Table", 'Special Number', 'Other'];

const EMPTY_FORM = {
  title: '',
  defaultKey: '',
  tempo: '',
  language: '',
  tags: [],
  youtubeUrl: '',
  notes: '',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeTitle(title) {
  return title.trim().toLowerCase();
}

function SongForm({ form, setForm, onSave, onCancel, saving, isEdit }) {
  const toggleTag = (tag) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {isEdit ? 'Edit Song' : 'Add Song'}
        </h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Song title"
          />
        </div>

        <div>
          <label className="label">Default Key</label>
          <select
            className="input"
            value={form.defaultKey}
            onChange={(e) => setForm((current) => ({ ...current, defaultKey: e.target.value }))}
          >
            {SONG_KEYS.map((key) => (
              <option key={key} value={key}>{key || 'Unknown'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Tempo</label>
          <input
            type="text"
            className="input"
            value={form.tempo}
            onChange={(e) => setForm((current) => ({ ...current, tempo: e.target.value }))}
            placeholder="e.g. Slow, Medium, Fast, 72 BPM"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Language</label>
          <input
            type="text"
            className="input"
            value={form.language}
            onChange={(e) => setForm((current) => ({ ...current, language: e.target.value }))}
            placeholder="e.g. Filipino, English"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2">
            {SONG_TAGS.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={active
                    ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200'
                    : 'px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200'}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label">YouTube URL</label>
          <input
            type="url"
            className="input"
            value={form.youtubeUrl}
            onChange={(e) => setForm((current) => ({ ...current, youtubeUrl: e.target.value }))}
            placeholder="https://youtube.com/..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea
            rows="2"
            className="input"
            value={form.notes}
            onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
            placeholder="Optional admin notes"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>Cancel</button>
        <button type="button" onClick={onSave} className="btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function SongsPage() {
  const { songs, lineups, canManageLineups, addSong, updateSong, deleteSong } = useApp();
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const usageMap = useMemo(() => {
    const map = {};
    for (const lineup of lineups) {
      for (const song of lineup.songs || []) {
        const key = normalizeTitle(song.title || '');
        if (!key) continue;
        if (!map[key]) {
          map[key] = { count: 0, lastUsed: '' };
        }
        map[key].count += 1;
        if (!map[key].lastUsed || lineup.date > map[key].lastUsed) {
          map[key].lastUsed = lineup.date;
        }
      }
    }
    return map;
  }, [lineups]);

  const languages = useMemo(() => {
    return [...new Set(songs.map((song) => song.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const tags = useMemo(() => {
    return [...new Set(songs.flatMap((song) => song.tags || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = !search.trim() || song.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesLanguage = !languageFilter || song.language === languageFilter;
      const matchesTag = !tagFilter || (song.tags || []).includes(tagFilter);
      return matchesSearch && matchesLanguage && matchesTag;
    });
  }, [songs, search, languageFilter, tagFilter]);

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (song) => {
    setEditingId(song.id);
    setForm({
      title: song.title || '',
      defaultKey: song.defaultKey || '',
      tempo: song.tempo || '',
      language: song.language || '',
      tags: song.tags || [],
      youtubeUrl: song.youtubeUrl || '',
      notes: song.notes || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title.trim(),
      defaultKey: form.defaultKey,
      tempo: form.tempo.trim(),
      language: form.language.trim(),
      tags: form.tags,
      youtubeUrl: form.youtubeUrl.trim(),
      notes: form.notes.trim(),
    };

    if (!payload.title) return;

    setSaving(true);
    try {
      if (editingId) await updateSong(editingId, payload);
      else await addSong(payload);
      cancelForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (song) => {
    if (!window.confirm(`Delete \"${song.title}\" from the song library?`)) return;
    await deleteSong(song.id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Music2 size={20} className="text-primary-500" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Song Library</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
            {songs.length} songs
          </span>
        </div>
        {canManageLineups && (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={startAdd}>
            <Plus size={16} />
            Add Song
          </button>
        )}
      </div>

      {showForm && canManageLineups && (
        <SongForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={cancelForm}
          saving={saving}
          isEdit={!!editingId}
        />
      )}

      <div className="card p-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8"
          />
        </div>

        <select className="input" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
          <option value="">All languages</option>
          {languages.map((language) => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>

        <select className="input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {songs.length === 0 ? (
        <div className="card py-12 px-6 text-center text-gray-500">
          <Music2 size={40} className="mx-auto mb-3 text-primary-300" />
          <p className="font-medium text-gray-700 dark:text-gray-200">No songs in the library yet.</p>
          <p className="text-sm mt-1">Add your first song to start building a canonical library for faster lineup planning.</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="card py-10 px-6 text-center text-gray-500">
          <Music2 size={36} className="mx-auto mb-3 opacity-40" />
          <p>No songs match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSongs.map((song) => {
            const usage = usageMap[normalizeTitle(song.title)] || { count: 0, lastUsed: '' };
            return (
              <div key={song.id} className="card p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{song.title}</h3>
                    {song.defaultKey && <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">{song.defaultKey}</span>}
                    {song.tempo && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{song.tempo}</span>}
                    {song.language && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{song.language}</span>}
                    {song.tags?.map((tag) => (
                      <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                    {song.youtubeUrl && (
                      <a
                        href={song.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-500 hover:text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium"
                      >
                        ▶ YT
                      </a>
                    )}
                  </div>

                  {song.notes && (
                    <p className="text-sm text-gray-500 truncate">{song.notes}</p>
                  )}

                  <p className="text-xs text-gray-400">
                    {usage.count > 0 ? `${usage.count}× used · Last: ${formatDate(usage.lastUsed)}` : 'Not used yet'}
                  </p>
                </div>

                {canManageLineups && (
                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 flex-shrink-0">
                    <button type="button" className="btn-secondary inline-flex items-center justify-center gap-1 text-xs px-2.5 py-1.5" onClick={() => startEdit(song)}>
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs"
                      onClick={() => handleDelete(song)}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
