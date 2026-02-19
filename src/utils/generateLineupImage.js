/**
 * Draws the lineup data onto a Canvas and returns a Blob.
 * Uses Canvas 2D API directly — no html2canvas, no DOM cloning.
 */

const W = 688;        // canvas width (px)
const PAD = 24;       // outer padding
const CARD_X = PAD;   // card left
const CARD_W = W - PAD * 2;  // card width
const FONT = 'system-ui, -apple-system, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWrappedText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineH;
}

export async function generateLineupImage({ lineup, getMemberById, songGroups, url, formatDate, shortDate, INSTRUMENT_CONFIG }) {
  // ---- first pass: measure height ----
  const scale = 2;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = W * scale;
  tempCanvas.height = 100 * scale;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.scale(scale, scale);

  function measureHeight() {
    let y = PAD + PAD; // outer pad + card top pad

    // Date
    y += 26; // title
    if (lineup.theme) y += 18;
    if (lineup.practiceDate) y += 32;
    y += 16; // margin after header

    // divider
    y += 16;

    // WL section label
    y += 20;
    y += lineup.worshipLeaders.length * 22;
    if (lineup.backUps?.length) {
      y += 18 + Math.ceil(lineup.backUps.length / 4) * 24;
    }
    y += 16;

    // divider
    y += 16;

    // Instruments label
    y += 20;
    const instrCount = INSTRUMENT_CONFIG.length + 1; // +1 SE
    const cols = 4;
    const rows = Math.ceil(instrCount / cols);
    y += rows * 48 + (rows - 1) * 8;
    y += 16;

    // Songs
    if (songGroups.length) {
      y += 16; // divider
      y += 16; // label
      y += 20;
      for (const g of songGroups) {
        y += 18; // section label
        y += g.songs.length * 20;
      }
      y += 8;
    }

    // Next WL
    if (lineup.nextWL) {
      y += 16; // divider
      y += 16;
      y += 22;
    }

    // URL footer
    y += 16 + 18; // divider + footer
    y += PAD; // card bottom pad
    return y + PAD; // outer bottom pad
  }

  const totalH = measureHeight();

  // ---- real canvas ----
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, W, totalH);

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Card background
  roundRect(ctx, CARD_X, PAD, CARD_W, totalH - PAD * 2, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Left accent bar
  ctx.fillStyle = '#818cf8';
  ctx.fillRect(CARD_X, PAD, 4, totalH - PAD * 2);

  const innerX = CARD_X + 4 + 20; // after accent bar + inner pad
  const innerW = CARD_W - 4 - 40;
  let y = PAD + 24;

  // ── Date ──
  ctx.font = `800 18px ${FONT}`;
  ctx.fillStyle = '#111827';
  ctx.fillText(formatDate(lineup.date), innerX, y);
  if (lineup.isTeamA) {
    const label = 'Team A';
    ctx.font = `600 11px ${FONT}`;
    const lw = ctx.measureText(label).width;
    const lx = innerX + ctx.measureText(formatDate(lineup.date)).width + 10;
    ctx.fillStyle = '#f3f4f6';
    roundRect(ctx, lx - 6, y - 12, lw + 12, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillText(label, lx, y);
  }
  y += 22;

  if (lineup.theme) {
    ctx.font = `500 12px ${FONT}`;
    ctx.fillStyle = '#6366f1';
    ctx.fillText('📖 ' + lineup.theme, innerX, y);
    y += 18;
  }

  if (lineup.practiceDate) {
    const pText = '📅 Practice: ' + shortDate(lineup.practiceDate) + ', after the Service';
    ctx.font = `600 11px ${FONT}`;
    const pw = ctx.measureText(pText).width + 24;
    ctx.fillStyle = '#f0fdfa';
    roundRect(ctx, innerX, y, pw, 22, 6);
    ctx.fill();
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#0f766e';
    ctx.fillText(pText, innerX + 12, y + 14);
    y += 30;
  }

  y += 10;

  // divider
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, y);
  ctx.lineTo(innerX + innerW, y);
  ctx.stroke();
  y += 16;

  // ── Worship Leaders ──
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = '#6b7280';
  ctx.fillText('🎤 WORSHIP LEADER' + (lineup.worshipLeaders.length > 1 ? 'S' : ''), innerX, y);
  y += 18;

  for (const wl of lineup.worshipLeaders) {
    const m = getMemberById(wl.memberId);
    const showRole = wl.role && wl.role !== 'Worship Leader';
    let rx = innerX;
    if (showRole) {
      ctx.font = `600 11px ${FONT}`;
      const rw = ctx.measureText(wl.role).width + 12;
      ctx.fillStyle = '#e0e7ff';
      roundRect(ctx, rx, y - 12, rw, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#4338ca';
      ctx.fillText(wl.role, rx + 6, y);
      rx += rw + 6;
    }
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = '#1f2937';
    ctx.fillText(m?.name || '—', rx, y);
    y += 22;
  }

  if (lineup.backUps?.length) {
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText('🎵 BACK UPS', innerX, y);
    y += 16;
    let bx = innerX;
    for (const bid of lineup.backUps) {
      const m = getMemberById(bid);
      const name = m?.name || '—';
      ctx.font = `500 11px ${FONT}`;
      const bw = ctx.measureText(name).width + 16;
      if (bx + bw > innerX + innerW) { bx = innerX; y += 24; }
      ctx.fillStyle = '#f3f4f6';
      roundRect(ctx, bx, y - 12, bw, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.fillText(name, bx + 8, y);
      bx += bw + 6;
    }
    y += 20;
  }

  y += 8;

  // divider
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, y);
  ctx.lineTo(innerX + innerW, y);
  ctx.stroke();
  y += 16;

  // ── Instruments ──
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = '#6b7280';
  ctx.fillText('INSTRUMENTS', innerX, y);
  y += 16;

  const allInstrs = [
    ...INSTRUMENT_CONFIG.map(({ key, label }) => ({
      label,
      name: (lineup.instruments[key] || []).map(iid => getMemberById(iid)?.name).filter(Boolean).join(' / ') || '—',
      bg: '#f9fafb',
    })),
    {
      label: 'Sound Engineer',
      name: getMemberById(lineup.soundEngineer)?.name || '—',
      bg: '#eff6ff',
    },
  ];

  const cols = 4;
  const cellW = Math.floor(innerW / cols);
  const cellH = 42;
  const cellGap = 8;

  for (let i = 0; i < allInstrs.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = innerX + col * (cellW + cellGap / cols);
    const cy = y + row * (cellH + 6);

    ctx.fillStyle = allInstrs[i].bg;
    roundRect(ctx, cx, cy, cellW - 4, cellH, 8);
    ctx.fill();

    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(allInstrs[i].label, cx + 8, cy + 14);

    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = '#1f2937';
    ctx.fillText(allInstrs[i].name, cx + 8, cy + 30);
  }

  const instrRows = Math.ceil(allInstrs.length / cols);
  y += instrRows * (cellH + 6) + 8;

  // ── Songs ──
  if (songGroups.length) {
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, y);
    ctx.lineTo(innerX + innerW, y);
    ctx.stroke();
    y += 16;

    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText('📖 SONGS', innerX, y);
    y += 18;

    for (const g of songGroups) {
      ctx.font = `700 10px ${FONT}`;
      ctx.fillStyle = '#6366f1';
      ctx.fillText(g.section.toUpperCase(), innerX, y);
      y += 16;
      for (const s of g.songs) {
        ctx.font = `400 13px ${FONT}`;
        ctx.fillStyle = '#1f2937';
        ctx.fillText(s.title, innerX + 8, y);
        y += 20;
      }
      y += 4;
    }
  }

  // ── Next WL ──
  if (lineup.nextWL) {
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, y);
    ctx.lineTo(innerX + innerW, y);
    ctx.stroke();
    y += 16;

    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText('NEXT WL: ', innerX, y);
    const nwLabelW = ctx.measureText('NEXT WL: ').width;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#4f46e5';
    ctx.fillText(lineup.nextWL, innerX + nwLabelW, y);
    y += 20;
  }

  // ── URL footer ──
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, y + 8);
  ctx.lineTo(innerX + innerW, y + 8);
  ctx.stroke();
  y += 20;

  ctx.font = `400 11px ${FONT}`;
  ctx.fillStyle = '#6366f1';
  ctx.fillText('🔗 ' + url, innerX, y);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}
