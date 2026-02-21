import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Plus, BookOpen } from 'lucide-react';
import { useState } from 'react';

const VERSES = [
  { text: "Sing to the LORD a new song; sing to the LORD, all the earth.", ref: "Psalm 96:1" },
  { text: "Shout for joy to the LORD, all the earth. Worship the LORD with gladness; come before him with joyful songs.", ref: "Psalm 100:1-2" },
  { text: "Let everything that has breath praise the LORD. Praise the LORD.", ref: "Psalm 150:6" },
  { text: "Speak to one another with psalms, hymns, and songs from the Spirit. Sing and make music from your heart to the Lord.", ref: "Ephesians 5:19" },
  { text: "Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit.", ref: "Colossians 3:16" },
  { text: "I will praise you, LORD, with all my heart; before the 'gods' I will sing your praise.", ref: "Psalm 138:1" },
  { text: "Praise the LORD. How good it is to sing praises to our God, how pleasant and fitting to praise him!", ref: "Psalm 147:1" },
  { text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me. My heart leaps for joy, and with my song I praise him.", ref: "Psalm 28:7" },
  { text: "I will sing of the LORD's great love forever; with my mouth I will make your faithfulness known through all generations.", ref: "Psalm 89:1" },
  { text: "Come, let us sing for joy to the LORD; let us shout aloud to the Rock of our salvation.", ref: "Psalm 95:1" },
  { text: "Sing to him, sing praise to him; tell of all his wonderful acts.", ref: "Psalm 105:2" },
  { text: "I will praise God's name in song and glorify him with thanksgiving.", ref: "Psalm 69:30" },
  { text: "Sing to the LORD, praise his name; proclaim his salvation day after day.", ref: "Psalm 96:2" },
  { text: "Praise the LORD. Praise God in his sanctuary; praise him in his mighty heavens.", ref: "Psalm 150:1" },
  { text: "Praise him with the sounding of the trumpet, praise him with the harp and lyre.", ref: "Psalm 150:3" },
  { text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { text: "Be filled with the Spirit, speaking to one another with psalms, hymns, and songs from the Spirit.", ref: "Ephesians 5:18-19" },
  { text: "I will extol the LORD at all times; his praise will always be on my lips.", ref: "Psalm 34:1" },
  { text: "Give thanks to the LORD, for he is good; his love endures forever.", ref: "Psalm 107:1" },
  { text: "Great is the LORD and most worthy of praise; his greatness no one can fathom.", ref: "Psalm 145:3" },
  { text: "Praise the LORD, my soul; all my inmost being, praise his holy name.", ref: "Psalm 103:1" },
  { text: "The LORD is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
  { text: "Ascribe to the LORD the glory due his name; worship the LORD in the splendor of his holiness.", ref: "Psalm 29:2" },
  { text: "Make a joyful noise to the LORD, all the earth; break forth into joyous song and sing praises!", ref: "Psalm 98:4" },
  { text: "Sing praises to God, sing praises; sing praises to our King, sing praises.", ref: "Psalm 47:6" },
  { text: "I will sing to the LORD all my life; I will sing praise to my God as long as I live.", ref: "Psalm 104:33" },
  { text: "Whoever offers praise glorifies Me; and to him who orders his conduct aright I will show the salvation of God.", ref: "Psalm 50:23" },
  { text: "Through Jesus, therefore, let us continually offer to God a sacrifice of praise — the fruit of lips that openly profess his name.", ref: "Hebrews 13:15" },
  { text: "Is anyone happy? Let them sing songs of praise.", ref: "James 5:13" },
  { text: "And when they had sung a hymn, they went out to the Mount of Olives.", ref: "Matthew 26:30" },
  { text: "About midnight Paul and Silas were praying and singing hymns to God, and the other prisoners were listening to them.", ref: "Acts 16:25" },
  { text: "Clap your hands, all you nations; shout to God with cries of joy.", ref: "Psalm 47:1" },
  { text: "Glorify the LORD with me; let us exalt his name together.", ref: "Psalm 34:3" },
  { text: "I will proclaim your name to my brothers and sisters; in the assembly I will praise you.", ref: "Psalm 22:22" },
  { text: "How lovely is your dwelling place, LORD Almighty! My soul yearns, even faints, for the courts of the LORD.", ref: "Psalm 84:1-2" },
  { text: "Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.", ref: "Psalm 100:4" },
  { text: "You are my God, and I will praise you; you are my God, and I will exalt you.", ref: "Psalm 118:28" },
  { text: "Praise be to the LORD, for he has heard my cry for mercy.", ref: "Psalm 28:6" },
  { text: "I will give thanks to you, LORD, with all my heart; I will tell of all your wonderful deeds.", ref: "Psalm 9:1" },
  { text: "Not to us, LORD, not to us but to your name be the glory, because of your love and faithfulness.", ref: "Psalm 115:1" },
  { text: "The LORD is my strength and my song; he has given me victory.", ref: "Exodus 15:2" },
  { text: "They will celebrate your abundant goodness and joyfully sing of your righteousness.", ref: "Psalm 145:7" },
  { text: "My lips will shout for joy when I sing praise to you — I whom you have delivered.", ref: "Psalm 71:23" },
  { text: "Let the sea resound, and everything in it, the world, and all who live in it. Let the rivers clap their hands, let the mountains sing together for joy.", ref: "Psalm 98:7-8" },
  { text: "By day the LORD directs his love, at night his song is with me — a prayer to the God of my life.", ref: "Psalm 42:8" },
  { text: "Oh come, let us worship and bow down; let us kneel before the LORD, our Maker!", ref: "Psalm 95:6" },
  { text: "I will bow down toward your holy temple and will praise your name for your unfailing love and your faithfulness.", ref: "Psalm 138:2" },
  { text: "The LORD reigns, let the earth be glad; let the distant shores rejoice.", ref: "Psalm 97:1" },
  { text: "Praise him, sun and moon; praise him, all you shining stars.", ref: "Psalm 148:3" },
  { text: "And they were calling to one another: 'Holy, holy, holy is the LORD Almighty; the whole earth is full of his glory.'", ref: "Isaiah 6:3" },
  { text: "You are worthy, our Lord and God, to receive glory and honor and power, for you created all things.", ref: "Revelation 4:11" },
  { text: "Worthy is the Lamb, who was slain, to receive power and wealth and wisdom and strength and honor and glory and praise!", ref: "Revelation 5:12" },
  { text: "Let us rejoice and be glad and give him glory!", ref: "Revelation 19:7" },
  { text: "Sing for joy, you heavens, for the LORD has done this; shout aloud, you earth beneath.", ref: "Isaiah 44:23" },
  { text: "The LORD is King forever and ever; the nations will perish from his land.", ref: "Psalm 10:16" },
  { text: "Praise the LORD, all his heavenly hosts, you his servants who do his will.", ref: "Psalm 103:21" },
];

// Returns the verse for the current ISO week (rotates through all 56 verses)
function getWeeklyVerse() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return VERSES[week % VERSES.length];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MIN_YEAR = 2026;

export default function YearCalendarPage() {
  const { lineups, canManageLineups } = useApp();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const verse = getWeeklyVerse();

  // Build month -> { count, nextDate } map for this year
  const dataByMonth = {};
  lineups.forEach(l => {
    const d = new Date(l.date + 'T00:00:00');
    if (d.getFullYear() === year) {
      const m = d.getMonth() + 1;
      if (!dataByMonth[m]) dataByMonth[m] = { count: 0, dates: [] };
      dataByMonth[m].count++;
      dataByMonth[m].dates.push(l.date);
    }
  });

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  // Next upcoming date in current month (for current year only)
  const currentMonthData = dataByMonth[currentMonth];
  const nextDate = (year === currentYear && currentMonthData)
    ? currentMonthData.dates.sort().find(d => d >= todayStr)
    : null;

  const scheduledMonths = Object.keys(dataByMonth).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Scripture block */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white px-5 py-4 shadow-md">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="mt-0.5 flex-shrink-0 text-primary-200" />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-300 font-semibold mb-1">Verse of the Week</p>
            <p className="text-sm leading-relaxed text-white/90 italic">"{verse.text}"</p>
            <p className="text-xs text-primary-300 mt-2 font-semibold">— {verse.ref}</p>
          </div>
        </div>
      </div>

      {/* Year navigation + progress */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => Math.max(MIN_YEAR, y - 1))}
          disabled={year <= MIN_YEAR}
          className={`p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${year <= MIN_YEAR ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{year}</h2>
          <p className="text-xs text-gray-400">Worship Schedule</p>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${(scheduledMonths / 12) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400">{scheduledMonths}/12 months</span>
          </div>
        </div>
        <button
          onClick={() => setYear(y => y + 1)}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-3">
        {MONTHS.map((name, i) => {
          const m = i + 1;
          const monthData = dataByMonth[m];
          const count = monthData?.count || 0;
          const isCurrentMonth = year === currentYear && m === currentMonth;
          const hasSched = count > 0;

          // Next service label for current month
          const showNext = isCurrentMonth && nextDate;
          const nextLabel = showNext
            ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null;

          return (
            <button
              key={m}
              onClick={() => navigate(`/?year=${year}&month=${m}`)}
              className={`
                group relative rounded-xl px-2 py-4 sm:px-4 sm:py-5 text-center transition-all border
                hover:-translate-y-0.5 hover:shadow-md
                ${isCurrentMonth
                  ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white border-primary-400 shadow-md ring-2 ring-primary-300'
                  : hasSched
                    ? 'bg-white border-teal-200 hover:border-teal-400 text-gray-800'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-400'
                }
              `}
            >
              <p className={`text-xs sm:text-sm font-bold truncate ${isCurrentMonth ? 'text-white' : hasSched ? 'text-gray-800' : 'text-gray-400'}`}>
                {name}
              </p>

              {hasSched ? (
                <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full
                  ${isCurrentMonth ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                  {count} service{count !== 1 ? 's' : ''}
                </span>
              ) : (
                <div className="mt-1.5 flex flex-col items-center gap-1">
                  <p className="text-[10px] text-gray-300">No services yet</p>
                  {canManageLineups && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={10} /> Add
                    </span>
                  )}
                </div>
              )}

              {showNext && (
                <p className="text-[10px] text-white/70 mt-1">Next: {nextLabel}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary-600 inline-block"></span> Current month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-teal-200 inline-block"></span> Has schedule
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 inline-block"></span> No schedule
        </span>
      </div>
    </div>
  );
}
