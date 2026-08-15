// Pure functions for computing a share-preview title purely from URL parts
// (no database lookups). Deliberately free of any Deno-specific APIs so
// this file can be verified with plain Node, independent of the Netlify
// Edge Function runtime that consumes it (see og-title.js).

const TITLE_PREFIX = 'Worship Schedule - ';

// Anchored at both ends (only an optional trailing slash is allowed after
// the date) so a nested sub-route ever added under a lineup path (e.g. a
// future print view) doesn't silently inherit this lineup's title instead
// of its own.
const LINEUP_PATH_RE = /^\/team\/[^/]+\/lineup\/lineup-(\d{4})-(\d{2})-(\d{2})\/?$/;

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Extracts the date from a lineup share-link path, e.g.
// "/team/jbbc-main/lineup/lineup-2026-07-26" -> Date(2026-07-26).
// Returns null if the path doesn't match, the numbers don't form a real
// calendar date (e.g. month 13, day 40), or the year is out of the same
// sanity range enforced for the ?year=&month= path below.
export function parseLineupDate(pathname) {
  const match = LINEUP_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

// Extracts a month from ?year=&month= query params, as used by the "Share"
// button on the monthly Schedule page — returned as a Date (day fixed at 1,
// UTC) so both title-computing paths share the same shape. Returns null if
// either param is missing, non-numeric, or month/year is out of range.
export function parseMonthFromQuery(searchParams) {
  const yearRaw = searchParams.get('year');
  const monthRaw = searchParams.get('month');
  if (!yearRaw || !monthRaw) return null;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function formatLineupTitle(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date);
  return TITLE_PREFIX + formatted;
}

export function formatMonthTitle(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
  return TITLE_PREFIX + formatted;
}

// Computes the share-preview title for a request URL, or null if nothing
// about this URL should override the page's default title (the caller
// must leave the response untouched in that case).
export function computeTitle(url) {
  const lineupDate = parseLineupDate(url.pathname);
  if (lineupDate) return formatLineupTitle(lineupDate);

  const monthDate = parseMonthFromQuery(url.searchParams);
  if (monthDate) return formatMonthTitle(monthDate);

  return null;
}
