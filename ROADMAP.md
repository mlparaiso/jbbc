# Worship Scheduler — Product Roadmap

> **App:** JBBC Music Team Worship Scheduler
> **Stack:** React 18 + Vite + Firebase (Firestore/Auth/Storage) + Tailwind CSS + Netlify
> **Current Version:** 0.0.0 (active production)
> **Document Date:** March 2026

## ✅ Completed

- [x] Restored [`AdminLoginPage.jsx`](src/pages/AdminLoginPage.jsx) — worship leader portal at `/admin` route (March 2026)
- [x] 2026-03-26 — Added lineup conflict detection and lineup validation in [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx), including duplicate member assignment warnings, missing worship leader warnings, missing sound engineer warnings, and a non-blocking amber advisory panel above submit.
- [x] 2026-03-26 — Delivered canonical Song Library CRUD across [`src/context/AppContext.jsx`](src/context/AppContext.jsx), [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx), [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx), and [`firestore.rules`](firestore.rules), including the new `teams/{teamId}/songs` collection, real-time song state, add/update/delete actions, Song Library management UI, merged autocomplete, and key autofill from canonical songs.
- [x] 2026-03-26 — Audited and fixed navigation/system cleanup in [`src/pages/TeamSetupPage.jsx`](src/pages/TeamSetupPage.jsx) and [`src/components/Layout.jsx`](src/components/Layout.jsx), including sign-out redirect fixes, renaming the Songs nav item to Song Library, updating the nav icon, removing a dead nav conditional, deleting unused [`src/pages/AdminLoginPage.jsx`](src/pages/AdminLoginPage.jsx), and removing dead imports from [`src/pages/TeamSetupPage.jsx`](src/pages/TeamSetupPage.jsx).

---

## Table of Contents

1. [App Overview & Current Feature Inventory](#1-app-overview--current-feature-inventory)
2. [Gap Analysis — What Is Missing](#2-gap-analysis--what-is-missing)
3. [Roadmap Phases](#3-roadmap-phases)
   - [Phase 1 — Quick Wins (1–4 weeks)](#phase-1--quick-wins-14-weeks)
   - [Phase 2 — Core Enhancements (1–3 months)](#phase-2--core-enhancements-13-months)
   - [Phase 3 — Power Features (3–6 months)](#phase-3--power-features-36-months)
   - [Phase 4 — Platform Expansion (6–12 months)](#phase-4--platform-expansion-612-months)
4. [Feature Detail Cards](#4-feature-detail-cards)
5. [Technical Debt & Infrastructure](#5-technical-debt--infrastructure)
6. [Competitive Benchmarking](#6-competitive-benchmarking)
7. [Success Metrics](#7-success-metrics)

## 1. App Overview & Current Feature Inventory

Based on the current implementation in [`src/App.jsx`](src/App.jsx), [`src/context/AppContext.jsx`](src/context/AppContext.jsx), [`src/pages/SchedulePage.jsx`](src/pages/SchedulePage.jsx), [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx), [`src/pages/LineupDetailPage.jsx`](src/pages/LineupDetailPage.jsx), [`src/pages/MembersPage.jsx`](src/pages/MembersPage.jsx), [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx), and public pages like [`src/pages/PublicSchedulePage.jsx`](src/pages/PublicSchedulePage.jsx), the app already delivers a strong MVP for church worship-team scheduling.

### Current strengths

- Google sign-in and Firebase-backed team access
- Team creation and joining via invite code
- Multi-team history and switching
- Role-based access with `main_admin`, `co_admin`, and `member`
- Member directory with instrument-role tagging
- Monthly and yearly schedule views
- Detailed lineup creation and editing
- Song history and autocomplete from previous lineups
- Public schedule sharing and public lineup detail pages
- Team logo upload and public/private visibility toggle
- Email onboarding and join notifications via Netlify functions
- Print-friendly monthly schedule and lineup detail views
- Support for extra instruments beyond the default band setup

### What the app is best at today

The current product is strongest as a **simple, mobile-friendly worship lineup manager** for small to mid-sized church music teams that need:

- Sunday service planning
- Member assignment by role
- Song list tracking
- Public sharing of schedules
- Lightweight admin workflows without enterprise complexity

### Current product positioning

This app sits below enterprise tools like Planning Center in complexity, but it already has a strong niche advantage:

- easier onboarding
- simpler UI
- church-specific workflow
- public schedule sharing without requiring every member to learn a large system

---

## 2. Gap Analysis — What Is Missing

After reviewing the codebase and comparing it with common worship scheduling patterns used by church teams and larger scheduling platforms, the biggest missing capabilities are:

### A. Operational planning gaps

- No member availability / unavailability tracking
- No conflict detection when assigning members
- No rotation fairness or over-scheduling protection
- No rehearsal planning workflow beyond a single practice date
- No service-type templates for different event formats
- No recurring scheduling automation

### B. Team communication gaps

- No in-app notifications
- No assignment confirmation / decline flow
- No reminders for upcoming service or rehearsal
- No comments or discussion thread per lineup
- No announcement center for the team

### C. Music planning gaps

- No song key analytics or preferred-key memory per worship leader
- No song attachments like charts, lyrics, chord sheets, or MP3 demos
- No song usage rules such as “do not repeat within X weeks”
- No setlist planning intelligence
- No CCLI / licensing / metadata support

### D. Admin and reporting gaps

- No dashboard for upcoming issues
- No audit trail / activity log
- No export to CSV / PDF beyond print views
- No attendance or actual-service tracking
- No analytics on member participation, song frequency, or schedule completion

### E. Product/platform gaps

- No offline-first workflow despite PWA assets existing in [`public/pwa-192.png`](public/pwa-192.png) and [`public/pwa-512.png`](public/pwa-512.png)
- No calendar sync with Google Calendar / iCal
- No push notifications
- No dedicated member portal experience separate from admin workflows
- No onboarding wizard for first-time team setup beyond basic create/join


## 3. Roadmap Phases

This roadmap is prioritized for **highest user value with lowest implementation risk first**.

### Phase 1 — Quick Wins (1–4 weeks)

These are the best near-term improvements because they build directly on the current architecture in [`src/context/AppContext.jsx`](src/context/AppContext.jsx) and the existing page structure.

1. **Member availability / blackout dates**
   - Let members mark unavailable dates
   - Show warnings in lineup creation
   - High value, moderate effort

2. ✅ **Assignment conflict warnings**
   - Warn if the same person is assigned to multiple roles in the same service
   - Warn if unavailable members are assigned
   - Warn if no sound engineer or no worship leader is assigned

3. **Lineup templates**
   - Save reusable lineup structures
   - Example: Sunday AM, Youth Night, Prayer Meeting, Special Event

4. ✅ **Song library CRUD + attachments and links**
   - Add chord chart, lyric sheet, MP3 demo, and notes per song
   - Use Firebase Storage already present in [`src/firebase.js`](src/firebase.js) and team logo upload patterns from [`src/context/AppContext.jsx`](src/context/AppContext.jsx)

5. **Calendar export / ICS download**
   - Export monthly schedule or single lineup to calendar format
   - Very useful for members

6. **Dashboard / alerts panel**
   - Upcoming service missing WL
   - Missing practice date
   - Empty song list
   - Unconfirmed assignments (future feature-ready)

### Phase 2 — Core Enhancements (1–3 months)

1. **Member portal and self-service experience**
   - Start with a worship leader portal for registered users, separate from admin-heavy pages
   - Show only my assignments, my upcoming rehearsals, and my songs for registered worship leaders first
   - Expand later to roster members once they have their own account model

2. **Assignment confirmation workflow**
   - Members can accept / decline assignments
   - Admin sees pending confirmations

3. **Automated reminders**
   - Email reminders 3 days before service
   - Rehearsal reminders 1 day before practice
   - Reuse Netlify email function patterns from [`netlify/functions/send-join-emails.js`](netlify/functions/send-join-emails.js)

4. **Recurring scheduling and auto-fill rules**
   - Auto-generate Sundays for a month
   - Apply rotation rules
   - Copy previous month with smarter logic than current implementation in [`src/pages/SchedulePage.jsx`](src/pages/SchedulePage.jsx)

5. **Song library management**
   - Dedicated CRUD for songs instead of history-only view in [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx)
   - Store default key, tempo, tags, language, theme, and YouTube link

6. **Service types and custom roles**
   - The code hints at this need in [`src/pages/TeamSetupPage.jsx`](src/pages/TeamSetupPage.jsx) with unused settings state
   - Make service types configurable per team

### Phase 3 — Power Features (3–6 months)

1. **Scheduling intelligence / fairness engine**
   - Avoid overusing the same members
   - Balance worship leaders and instrumentalists
   - Suggest best-fit members based on role and recent usage

2. **Advanced song planning intelligence**
   - Detect recent repeats
   - Suggest songs by theme, scripture, or season
   - Recommend keys based on worship leader history

3. **Attendance and actual-service tracking**
   - Planned vs actual attendance
   - Useful for reliability and ministry reporting

4. **Activity log / audit trail**
   - Who changed lineup, songs, members, or roles
   - Important for multi-admin teams

5. **Comments and collaboration**
   - Per-lineup notes thread
   - Song-specific comments
   - Rehearsal notes

6. **Mobile-first PWA improvements**
   - Install prompt
   - Offline cache for upcoming lineups
   - Push notifications

### Phase 4 — Platform Expansion (6–12 months)

1. **Google Calendar / iCal sync**
2. **WhatsApp / Messenger reminder integration**
3. **Multi-campus or ministry support**
4. **Volunteer onboarding workflows**
5. **Analytics dashboard for church leadership**
6. **API / integrations layer**


## 4. Feature Detail Cards

### 4.1 Availability Management
**Why it matters:** This is one of the most important missing features for real-world worship scheduling.

**Recommended scope:**
- Add availability records per member per date
- Add recurring unavailability patterns
- Show availability badges in lineup form
- Filter assignable members by availability

**Suggested data model:**
- `teams/{teamId}/availability/{memberId_date}`
- fields: `memberId`, `date`, `status`, `note`, `createdAt`

**UI touchpoints:**
- New member availability page
- Warnings in [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx)
- Summary in lineup detail pages

### 4.2 Assignment Confirmation
**Why it matters:** Scheduling is not complete until people confirm.

**Recommended scope:**
- Each assigned member gets `pending`, `accepted`, or `declined`
- Admin sees confirmation status
- Members can respond from email link or in-app

### 4.3 Song Library 2.0
**Why it matters:** The current song history in [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx) is useful, but not enough for long-term music planning.

**Recommended fields:**
- title
- defaultKey
- alternateKeys
- tempo
- language
- themeTags
- scriptureTags
- youtubeUrl
- chartFileUrl
- lyricFileUrl
- lastUsedAt
- usageCount

### 4.4 Smart Scheduling Suggestions
**Why it matters:** This is where the app can become meaningfully better than a spreadsheet.

**Suggestion engine inputs:**
- member role match
- availability
- recent assignment count
- last served date
- Team A eligibility
- service type

### 4.5 Rehearsal Planning
**Why it matters:** Worship teams do not only plan services; they plan rehearsals.

**Recommended scope:**
- Multiple rehearsal entries per lineup
- rehearsal location
- rehearsal agenda
- attendance tracking
- rehearsal notes

### 4.6 Public Experience Improvements
**Why it matters:** Public pages are already a strength, so improving them can create a strong differentiator.

**Recommended scope:**
- Better mobile layout for public schedule
- Public team profile page
- Public upcoming events list
- Shareable lineup image generation using patterns from [`src/utils/generateLineupImage.js`](src/utils/generateLineupImage.js)

### 4.7 Admin Dashboard
**Why it matters:** Admins need a “what needs attention now?” view.

**Recommended widgets:**
- Upcoming services without worship leader
- Upcoming services without full band
- Members with no recent assignments
- Songs overused in the last 4–8 weeks
- Pending confirmations


## 5. Technical Debt & Infrastructure

### High-priority technical improvements

1. **Normalize lineup and song data more clearly**
   - Current lineups appear to store song snapshots, which is good for history
   - Add canonical song references for analytics and reuse

2. **Introduce stronger Firestore security review**
   - Re-check role enforcement in [`firestore.rules`](firestore.rules)
   - Add tests for admin/member access boundaries

3. **Add indexes and query planning review**
   - As filtering grows, [`firestore.indexes.json`](firestore.indexes.json) will need expansion

4. **Add automated tests**
   - Critical areas: auth flow, lineup creation, public access, role restrictions

5. **Refactor large page components**
   - [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx) and [`src/context/AppContext.jsx`](src/context/AppContext.jsx) are likely to grow quickly as features expand

6. **Storage strategy for song files**
   - Reuse the upload approach already used for team logos
   - Add file size/type validation and cleanup rules in [`storage.rules`](storage.rules)


## 6. Competitive Benchmarking

Compared with common church scheduling tools:

### Where this app already competes well
- Simpler onboarding than Planning Center
- Better lightweight public sharing than many generic volunteer schedulers
- Easier for small churches that do not need a full church-management suite

### Where competitors still win
- Availability and confirmations
- Communication workflows
- Reporting and analytics
- Deep music library management
- Automation and integrations

### Strategic opportunity
The best positioning is likely:

> **“A simpler worship scheduling tool for churches that want the essentials of Planning Center without the complexity.”**

That means the roadmap should prioritize:
- availability
- conflict prevention
- song library depth
- reminders
- member self-service


## 7. Success Metrics

Recommended product metrics to track as the roadmap progresses:

### Adoption metrics
- Number of active teams per month
- Number of lineups created per month
- Number of public schedule views
- Invite-to-join conversion rate

### Engagement metrics
- Average number of services scheduled ahead
- Percentage of lineups with complete assignments
- Song reuse frequency
- Member return rate

### Quality metrics
- Reduction in incomplete lineups
- Reduction in last-minute assignment changes
- Time to create a lineup
- Admin satisfaction / NPS-style feedback

---

## Final Recommendation

If only **three roadmap items** are pursued next, the highest-value sequence is:

1. **Availability + conflict warnings**
2. **Song library management**
3. **Assignment confirmations + reminders**

That sequence best matches the current architecture, closes the most painful real-world workflow gaps, and strengthens the app’s position as a practical church worship scheduling tool.
