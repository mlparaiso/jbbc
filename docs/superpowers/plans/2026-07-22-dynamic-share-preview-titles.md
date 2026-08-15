# Dynamic Share-Preview Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Historical record, not living documentation:** this plan predates several follow-up fixes to
> `netlify/edge-functions/og-title.js` and `netlify/edge-functions/lib/title.js` (the `try/catch` +
> `onError: 'bypass'` fail-safe from commit `a28964c`, a pinned `HTMLRewriter` import version, an
> anchored lineup-path regex, and a shared year-bound check on both parsing paths — see an app-wide
> code review dated 2026-08-15). The embedded code blocks below were updated once (commit `fef22d9`)
> but have drifted again since. **Treat the actual source files as ground truth**, not this doc.

**Goal:** Make public lineup and monthly-schedule share links show a specific, date-based title (`Worship Schedule - July 26, 2026`) in chat-app link previews, instead of the generic "Worship Schedule" title, by deriving the date entirely from the URL and rewriting the response HTML at the CDN edge.

**Architecture:** A Netlify Edge Function registered on `/team/*` calls `context.next()` to get the real `index.html` response, computes a title from the request URL (no database lookups — the date is already encoded in the lineup ID or the `?year=&month=` query params), and uses the Deno-global `HTMLRewriter` to replace `<title>`, `<meta property="og:title">`, and `<meta name="twitter:title">` before returning the response. The URL-parsing/title-formatting logic lives in its own plain-JS module so it can be unit-verified with plain Node, independent of the Deno-only edge runtime.

**Tech Stack:** Netlify Edge Functions (Deno runtime), vanilla JS (ESM), no new dependencies.

## Global Constraints

- No test framework exists in this repo. Do not add one.
- Only `<title>`, `og:title`, and `twitter:title` change. Do not touch `og:description`, `og:image`, `twitter:description`, `twitter:image`, or `og:url` — out of scope per the design spec.
- If the title can't be confidently derived (malformed lineup ID, missing/invalid `year`/`month` query params, or any parsing exception), the response must pass through **completely unmodified** — never show a blank, broken, or partially-rewritten title.
- No Firestore or other network calls from the edge function — the whole point of deriving the title from the URL is that it never depends on an external service being reachable or the data still existing.
- Follow this repo's own existing convention for Netlify functions: declare the URL path via an inline `export const config = { path: '...' }` in the function file itself (see `netlify/functions/send-welcome-email.js:161-163` for the existing pattern) — do **not** add a `[[edge_functions]]` block to `netlify.toml`. This is a deliberate simplification from the original design spec (which mentioned modifying `netlify.toml`) once the existing repo convention was found — the inline `config` export is Netlify's documented mechanism for both function types and matches everything else already in this codebase.
- This only runs for requests to `/team/*` (public lineup and monthly-schedule links). It must never affect `/login`, `/schedule`, `/dashboard`, or any other authenticated route.

---

### Task 1: Pure title-computation logic

**Files:**
- Create: `netlify/edge-functions/lib/title.js`

**Interfaces:**
- Produces (consumed by Task 2): `computeTitle(url: URL) => string | null` — the single entry point Task 2's edge function calls. Also exports `parseLineupDate(pathname: string) => Date | null`, `parseMonthFromQuery(searchParams: URLSearchParams) => { year: number, month: number } | null`, `formatLineupTitle(date: Date) => string`, and `formatMonthTitle(year: number, month: number) => string` as named exports, each independently useful for the verification step below.

- [ ] **Step 1: Write the module**

Create `netlify/edge-functions/lib/title.js`:

```js
// Pure functions for computing a share-preview title purely from URL parts
// (no database lookups). Deliberately free of any Deno-specific APIs so
// this file can be verified with plain Node, independent of the Netlify
// Edge Function runtime that consumes it (see og-title.js).

const LINEUP_PATH_RE = /^\/team\/[^/]+\/lineup\/lineup-(\d{4})-(\d{2})-(\d{2})(?:\/|$)/;

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
  if (year < 2000 || year > 2100) return null;
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
```

- [ ] **Step 2: Verify with a throwaway node script**

Run:

```bash
node -e "
import('./netlify/edge-functions/lib/title.js').then(({ computeTitle }) => {
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-2026-07-26')));
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main?year=2026&month=7')));
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main')));
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-2026-99-99')));
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main?year=2026&month=13')));
  console.log(computeTitle(new URL('https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-not-a-date')));
});
"
```

Expected output (in order):
```
Worship Schedule - July 26, 2026
Worship Schedule - July 2026
null
null
null
null
```

The first two confirm the happy paths; the last four confirm every fallback case (no query params, invalid calendar date, out-of-range month, non-date-shaped lineup id) correctly returns `null` rather than throwing or producing a wrong title.

- [ ] **Step 3: Commit**

```bash
git add netlify/edge-functions/lib/title.js
git commit -m "feat: add pure title-computation logic for share-preview links"
```

---

### Task 2: Edge Function wiring

**Files:**
- Create: `netlify/edge-functions/og-title.js`

**Interfaces:**
- Consumes: `computeTitle` from `./lib/title.js` (Task 1).

- [ ] **Step 1: Write the edge function**

Create `netlify/edge-functions/og-title.js`:

```js
// Rewrites <title>/og:title/twitter:title for public team & lineup share
// links so chat-app link previews (Messenger, Facebook, etc.) show the
// specific date instead of the generic app-wide title. Crawlers never
// execute JavaScript, so this has to happen server-side, before the HTML
// reaches them — see docs/superpowers/specs/2026-07-22-dynamic-share-preview-titles-design.md
// for why.
//
// Runs for every request to /team/* (real browsers included, not just
// crawlers) — it only ever touches these three <head> tags, so the app
// boots exactly as before either way.
import { computeTitle } from './lib/title.js';
// HTMLRewriter is NOT a global in Netlify's Edge Functions runtime (unlike
// Cloudflare Workers) — it must be imported from a URL, per Netlify's own
// edge-functions-examples.netlify.app/example/htmlrewriter reference impl.
import { HTMLRewriter } from 'https://ghuc.cc/worker-tools/html-rewriter/index.ts';

export default async (request, context) => {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let title;
  try {
    title = computeTitle(new URL(request.url));
  } catch {
    return response;
  }
  if (!title) return response;

  return new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', title);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute('content', title);
      },
    })
    .transform(response);
};

export const config = {
  path: '/team/*',
};
```

- [ ] **Step 2: Sanity-check the file loads under Node (import-only, not a full runtime test)**

`HTMLRewriter` is a Deno/Netlify-Edge-only global — it doesn't exist under plain Node, so this file cannot be fully executed outside the Netlify Edge runtime. This step only confirms the import graph and syntax are valid, not the `HTMLRewriter` usage itself:

```bash
node --input-type=module -e "
try {
  await import('./netlify/edge-functions/og-title.js');
  console.log('module loaded (default export exists:', true, ')');
} catch (e) {
  console.log('IMPORT FAILED:', e.message);
}
"
```

Expected: `module loaded (default export exists: true )` — a real syntax error or a broken import path from `./lib/title.js` would surface here as `IMPORT FAILED`. (The function body itself referencing the undefined `HTMLRewriter` global is fine at import time — it only matters once the function actually runs, which only happens inside the Netlify Edge runtime.)

- [ ] **Step 3: Commit**

```bash
git add netlify/edge-functions/og-title.js
git commit -m "feat: add edge function rewriting share-preview titles for /team/* links"
```

- [ ] **Step 4: Push and verify against the real deployment**

There is no local emulator for Netlify Edge Functions in this environment (no Deno, no linked `netlify dev` session). Verify against the real site instead, since this repo already auto-deploys `main` to Netlify (confirmed by the live `worshipschedule.netlify.app` site the user has been testing against throughout this project):

```bash
git push origin main
```

Wait for the Netlify deploy to finish (check the Netlify dashboard, or ask the user to confirm), then verify with `curl` (this fetches raw HTML exactly as a link-preview crawler would, without executing any JavaScript, which is the actual thing being tested):

```bash
curl -s https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-2026-07-26 | grep -o '<title>[^<]*</title>'
curl -s https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-2026-07-26 | grep -o 'property="og:title" content="[^"]*"'
curl -s "https://worshipschedule.netlify.app/team/jbbc-main?year=2026&month=7" | grep -o '<title>[^<]*</title>'
curl -s https://worshipschedule.netlify.app/team/jbbc-main | grep -o '<title>[^<]*</title>'
```

Expected:
```
<title>Worship Schedule - July 26, 2026</title>
property="og:title" content="Worship Schedule - July 26, 2026"
<title>Worship Schedule - July 2026</title>
<title>Worship Schedule</title>
```

(Replace `jbbc-main` with a real `teamId` from the live app if that one doesn't exist — the team doesn't need to be a real/existing team for this to work, since the edge function never queries Firestore, but using a real one lets you cross-check against the actual site too.)

Also open `https://worshipschedule.netlify.app/team/jbbc-main/lineup/lineup-2026-07-26` in a real browser and confirm the app still loads and works normally — this confirms the HTML rewrite didn't corrupt anything the React app depends on.

- [ ] **Step 5: Re-check the share preview**

Paste the lineup link into Messenger (or use Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) to force a fresh crawl, since Facebook/Messenger cache previews aggressively and may keep showing the old generic title for a previously-shared URL until re-scraped) and confirm the preview card now shows `Worship Schedule - July 26, 2026`.
