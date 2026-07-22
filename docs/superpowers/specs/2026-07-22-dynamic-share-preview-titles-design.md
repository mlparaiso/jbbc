# Dynamic Share-Preview Titles for Public Links

## Problem

Public share links (`/team/:teamId` and `/team/:teamId/lineup/:lineupId`) always show the same generic "Worship Schedule" title/description when pasted into Messenger, Facebook, etc., because `index.html`'s Open Graph tags are static and this is a client-rendered SPA — every route is served the identical HTML. Link-preview crawlers (Facebook/Messenger's `facebookexternalhit`, etc.) never execute JavaScript, so whatever title the app would set client-side (e.g. via `document.title`) is invisible to them. The preview never reflects which lineup or month is actually being shared.

## Goal

When a public lineup or monthly-schedule link is pasted into a chat app, the preview title should read:
- Lineup link: `Worship Schedule - July 26, 2026`
- Monthly schedule link: `Worship Schedule - July 2026`
- Anything that doesn't parse cleanly (malformed/missing date) falls back to the existing generic `Worship Schedule` title — never broken, never blank.

Only the title-family tags (`<title>`, `og:title`, `twitter:title`) change. `og:description`, `og:image`, `twitter:description`, `twitter:image` are untouched — out of scope, not requested.

## Non-goals

- No lookup of team name, worship leader, or theme — the date is derived entirely from the URL itself (the lineup ID already encodes its date as `lineup-YYYY-MM-DD`; the monthly link already carries `?year=&month=` from the existing "Share" button in `SchedulePage.jsx`). No Firestore/network call needed, which also means the preview title never depends on the team being public, on the lineup existing, or on any external service being up.
- Not attempting to suppress the raw URL text a user pastes into a chat's compose box — that's the chat client's own UI, not something page metadata controls.

## Approach: Netlify Edge Function rewriting the response HTML

A new Edge Function (Deno runtime, runs in Netlify's CDN layer) intercepts requests matching `/team/*`, calls `context.next()` to get the real response Netlify would have served (the current build's `index.html`, via the existing SPA-fallback rewrite in `netlify.toml`), and uses the Deno `HTMLRewriter` API to replace:
- `<title>` text content
- `<meta property="og:title">`'s `content` attribute
- `<meta name="twitter:title">`'s `content` attribute

...with the computed title, then returns the rewritten response. Because it rewrites whatever `context.next()` actually returns, it automatically stays correct after every future deploy (hashed JS/CSS filenames, any other head changes) — there's no separate template to keep in sync.

This runs for **every** request to `/team/*`, not just bots — real browsers get the same rewritten HTML, then the React app boots exactly as it does today (this only touches three `<head>` tags; it doesn't touch `<body>` or any script tags).

### Title derivation logic

```
parseLineupDate(path):
  match /\/team\/[^/]+\/lineup\/lineup-(\d{4})-(\d{2})-(\d{2})/ against the pathname
  if match: return a Date from the captured year/month/day
  else: return null

parseMonthFromQuery(url):
  read `year` and `month` search params
  if both present and numeric and month is 1-12: return {year, month}
  else: return null

computeTitle(url):
  lineupDate = parseLineupDate(url.pathname)
  if lineupDate: return `Worship Schedule - ${format lineupDate as "Month D, YYYY"}`

  monthYear = parseMonthFromQuery(url)
  if monthYear: return `Worship Schedule - ${format monthYear as "Month YYYY"}`

  return null  // no rewrite — leave the default title as-is
```

Date formatting: `Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })` for the lineup case (→ "July 26, 2026"), `Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })` for the month case (→ "July 2026") — matches the formatting already used elsewhere in the app (`formatDate`/`shortDate` helpers in the page components use the same `toLocaleDateString('en-PH', ...)` style; using `Intl.DateTimeFormat` directly here since Edge Functions run in Deno, not the app's React bundle, so there's no shared helper to import).

If `computeTitle` returns `null`, the Edge Function must not touch the response at all — pass the original HTML straight through unmodified, so the existing generic title/description keep working exactly as they do today for every other route (`/login`, `/schedule`, etc. are not even matched by the `/team/*` path pattern in the first place, so this only ever applies to public team/lineup URLs).

## Files

- Create: `netlify/edge-functions/og-title.js` — the rewrite logic described above.
- Modify: `netlify.toml` — register the edge function against the `/team/*` path pattern.

## Error handling

- Malformed lineup ID (doesn't match `lineup-YYYY-MM-DD`), invalid query params, or any parsing exception → treat as "no match", pass the original response through unchanged. Never let a parsing edge case produce a broken/blank preview.
- If `context.next()` itself fails or the origin response isn't HTML (shouldn't happen for these paths, but defensively) → also pass through unchanged rather than throwing.

## Testing

No test framework exists in this repo. Verification is: deploy to Netlify (or run `netlify dev` locally if available), fetch the relevant URLs with a plain HTTP client (e.g. `curl`) simulating what a crawler sees (no JS execution needed to check this — the point is the *raw HTML* now contains the right title), and confirm the `<title>`/`og:title`/`twitter:title` values are correct for: a valid lineup link, a valid month link, a lineup link with a non-date-shaped ID (fallback), and a bare `/team/:teamId` with no query params (fallback). Also load the URL in a real browser to confirm the app still boots normally (the rewrite didn't corrupt the HTML).
