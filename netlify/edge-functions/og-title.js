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

  // This whole block only mutates the <head> tags above — it must never be
  // able to break the underlying page. If HTMLRewriter (a third-party import)
  // throws for any reason, fall back to the original, unmodified response,
  // which is always safe to serve as-is (just without the rewritten title).
  try {
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
