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
// Pinned to a specific release tag (matching Netlify's own documented
// example) rather than the default branch, so a future upstream change or
// an unreachable default-branch resolution at deploy time can't silently
// change this function's behavior or break the build.
import { HTMLRewriter } from 'https://ghuc.cc/worker-tools/html-rewriter@v0.1.0-pre.17/index.ts';

export default async (request, context) => {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // This whole block only mutates the <head> tags below — it must never be
  // able to break the underlying page. If title computation or HTMLRewriter
  // (a third-party import) throws for any reason, fall back to the original,
  // unmodified response, which is always safe to serve as-is (just without
  // the rewritten title). Note: this can only catch a *synchronous* failure —
  // HTMLRewriter.transform() returns immediately and does its actual parsing
  // lazily as the response body streams out, so a failure during that later,
  // async phase is not something a try/catch around this call can observe.
  // There's no code-level fix for that; it's an inherent limit of wrapping a
  // streaming third-party transform in a synchronous try/catch.
  try {
    const title = computeTitle(new URL(request.url));
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
  } catch {
    return response;
  }
};

// onError: 'bypass' tells Netlify to serve the normal (un-rewritten) response
// if this function throws for any reason not already caught above — e.g. if
// context.next() itself throws. This function is purely cosmetic middleware,
// so it should never be able to turn a working page into a 500.
export const config = {
  path: '/team/*',
  onError: 'bypass',
};
