// Pure functions for computing a share-preview title purely from URL parts
// (no database lookups). Deliberately free of any Deno-specific APIs so
// this file can be verified with plain Node, independent of the Netlify
// Edge Function runtime that consumes it (see og-title.js).

const LINEUP_PATH_RE = /\/team\/[^/]+\/lineup\/lineup-(\d{4})-(\d{2})-(\d{2})(?:\/|$)/;

// Extracts the date from a lineup share-link path, e.g.
// "/team/jbbc-main/lineup/lineup-2026-07-26" -> Date(2026-07-26).
// Returns null if the path doesn't match, or the numbers don't form a
// real calendar date (e.g. month 13, day 40).
export function parseLineupDate(pathname) {
  const match = LINEUP_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

// Extracts { year, month } from ?year=&month= query params, as used by
// the "Share" button on the monthly Schedule page. Returns null if either
// param is missing, non-numeric, or month is out of the 1-12 range.
export function parseMonthFromQuery(searchParams) {
  const yearRaw = searchParams.get('year');
  const monthRaw = searchParams.get('month');
  if (!yearRaw || !monthRaw) return null;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatLineupTitle(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date);
  return `Worship Schedule - ${formatted}`;
}

export function formatMonthTitle(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
  return `Worship Schedule - ${formatted}`;
}

// Computes the share-preview title for a request URL, or null if nothing
// about this URL should override the page's default title (the caller
// must leave the response untouched in that case).
export function computeTitle(url) {
  const lineupDate = parseLineupDate(url.pathname);
  if (lineupDate) return formatLineupTitle(lineupDate);

  const monthYear = parseMonthFromQuery(url.searchParams);
  if (monthYear) return formatMonthTitle(monthYear.year, monthYear.month);

  return null;
}
