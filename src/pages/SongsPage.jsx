import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Music2, Search, Clock, Hash } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SongsPage() {
  const { lineups } = useApp();
  const [search, setSearch] = useState('');

  // Build song history from all lineups
  const songHistory = useMemo(() => {
    const map = {};
    for (const lineup of lineups) {
      for (const song of lineup.songs || []) {
        const key = song.title.trim().toLowerCase();
        if (!key) continue;
        if (!map[key]) {
          map[key] = {
            title: song.title.trim(),
            section: song.section,
            youtubeUrl: song.youtubeUrl || '',
            dates: [],
          };
        }
        map[key].dates.push(lineup.date);
        // Keep the most recent youtube URL
        if (song.youtubeUrl) map[key].youtubeUrl = song.youtubeUrl;
      }
    }
    // Sort each song's dates descending
    return Object.values(map)
      .map(s => ({ ...s, dates: s.dates.sort((a, b) => b.localeCompare(a)) }))
      .sort((a, b) => b.dates[0].localeCompare(a.dates[0])); // sort by most recently used
  }, [lineups]);

  const filtered = search.trim()
    ? songHistory.filter(s => s.title.toLowerCase().includes(search.trim().toLowerCase()))
    : songHistory;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Music2 size={20} className="text-primary-500" />
        <h2 className="text-lg font-bold text-gray-800">Song History</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
          {songHistory.length} songs
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-8"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Music2 size={40} className="mx-auto mb-2 opacity-30" />
          <p>No songs found.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((song, i) => (
          <div key={i} className="card py-3 px-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">{song.title}</span>
                <span className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded font-medium">
                  {song.section}
                </span>
                {song.youtubeUrl && (
                  <a
                    href={song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-500 hover:text-red-600 bg-red-50 px-1.5 py-0.5 rounded"
                  >
                    ▶ YT
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} /> Last: {formatDate(song.dates[0])}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Hash size={11} /> {song.dates.length}× played
                </span>
              </div>
              {song.dates.length > 1 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {song.dates.slice(0, 6).map((d, di) => (
                    <span key={di} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {formatDate(d)}
                    </span>
                  ))}
                  {song.dates.length > 6 && (
                    <span className="text-xs text-gray-400">+{song.dates.length - 6} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
