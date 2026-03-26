# Worship Scheduler — Deep Gap Analysis

> Companion to [`ROADMAP.md`](ROADMAP.md)
> Focus: product, workflow, UX, data, architecture, and operational gaps
> Date: March 2026

---

## 1. Executive Summary

The app already solves the core problem of creating and sharing worship lineups, but it is still strongest as a **planning board** rather than a full **team operations system**.

The biggest gap is that the app helps admins **assign** people, but does not yet help teams **coordinate, confirm, execute, and learn** from those assignments.

In practical terms, the current product is good at:
- building schedules
- assigning members
- tracking songs historically
- sharing schedules publicly

But it is still weak at:
- availability management
- assignment confirmation
- reminders and communication
- rehearsal operations
- analytics and decision support
- scalable architecture for future growth

This document breaks those gaps down in detail.

---

## 2. Current-State Assessment

From [`src/context/AppContext.jsx`](src/context/AppContext.jsx), [`src/pages/SchedulePage.jsx`](src/pages/SchedulePage.jsx), [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx), [`src/pages/LineupDetailPage.jsx`](src/pages/LineupDetailPage.jsx), [`src/pages/MembersPage.jsx`](src/pages/MembersPage.jsx), and [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx), the app currently behaves like a lightweight admin-managed scheduling tool.

### What exists today
- auth and team membership
- role-based admin permissions
- member records with role tags
- lineup creation and editing
- song history and autocomplete
- public schedule pages
- email onboarding
- print views

### What does not exist yet
- member-side workflow depth
- operational safeguards
- planning intelligence
- reporting and observability
- strong modular architecture


## 3. Product Gaps

### 3.1 Planning vs execution gap
The app is strong before the service is scheduled, but weak after the schedule is published.

**Observed gap:**
- no confirmation flow
- no decline / replacement workflow
- no service-day status
- no attendance capture

**Impact:**
- admins still need chat apps and manual follow-up
- schedule accuracy drops as service day approaches
- the app is not yet the single source of truth

### 3.2 Admin-centric product gap
Most workflows are optimized for admins, not members.

**Observed gap:**
- members do not have a dedicated “my schedule” experience
- members cannot manage availability
- members cannot confirm assignments
- members cannot easily see only what is relevant to them

**Impact:**
- adoption may remain shallow for non-admin users
- the app risks becoming a tool only one or two leaders use

### 3.3 Service model gap
The current lineup model is Sunday-service oriented and only partially flexible.

**Observed gap:**
- no first-class service types
- no event templates
- no support for multiple services in one day
- no support for non-Sunday ministry events as a core concept

**Impact:**
- churches with youth nights, prayer meetings, conferences, and special services will outgrow the current model

### 3.4 Music ministry depth gap
The app tracks songs, but not the broader music-planning context.

**Observed gap:**
- no song metadata model beyond title, section, key/capo, and YouTube link
- no chart storage
- no arrangement notes
- no repeat control
- no theme/scripture matching

**Impact:**
- song planning remains memory-based
- repeated songs and inconsistent keys are more likely

---

## 4. Workflow Gaps

### 4.1 Availability workflow gap
This is the most important operational gap.

**Current state:** [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx) filters members by role, but not by availability.

**Missing workflow:**
1. member marks unavailable
2. admin sees warning during assignment
3. system suggests alternatives
4. final lineup avoids preventable conflicts

**Resulting pain:**
- avoidable rework
- last-minute replacements
- lower trust in the schedule

### 4.2 Rehearsal workflow gap
The app stores a single `practiceDate`, but rehearsal planning is richer than one date field.

**Missing workflow:**
- rehearsal schedule
- rehearsal attendance
- rehearsal notes
- rehearsal-specific reminders
- rehearsal readiness status

### 4.3 Exception-handling gap
The app handles the happy path well, but not exceptions.

**Missing cases:**
- assigned member declines
- worship leader changes midweek
- song list changes after rehearsal
- sound engineer becomes unavailable
- special event requires extra roles

**Impact:**
- admins must manage exceptions outside the app


## 5. UX and Information Architecture Gaps

### 5.1 Navigation model gap
The app navigation is simple, but the information architecture is still admin-first and page-based rather than task-based.

**Observed gap:**
- no dashboard landing page for urgent actions
- no “my assignments” shortcut
- no “needs attention” queue
- no distinction between planning, communication, and reporting areas

### 5.2 Form usability gap
The lineup form in [`src/pages/LineupFormPage.jsx`](src/pages/LineupFormPage.jsx) is capable, but it can become cognitively heavy as more features are added.

**Observed gap:**
- many sections on one page
- no progressive disclosure
- no inline validation summary
- no completion score
- no “recommended next action” guidance

### 5.3 Public/private experience gap
Public and private pages are visually similar, but their goals are different.

**Observed gap:**
- public pages are mostly read-only mirrors
- no public branding depth
- no privacy controls at field level
- no tailored public sharing assets

### 5.4 Empty-state maturity gap
The app has some empty states, but not enough guided onboarding states.

**Missing guidance:**
- what to do after creating a team
- what to do after adding first members
- what to do when a month has no lineups
- what to do when songs are missing

---

## 6. Data Model Gaps

### 6.1 Member model gap
The member model is enough for assignment, but not enough for team operations.

**Current fields observed:** name, nickname, email, roles, isTeamA, teamRole, uid

**Missing fields:**
- phone / contact preference
- active / inactive status
- availability preferences
- skill level / proficiency
- preferred keys or vocal range
- ministry notes

### 6.2 Lineup model gap
The lineup model is useful, but still too flat for future workflows.

**Current fields observed:** date, theme, bibleVerse, worshipLeaders, backUps, instruments, soundEngineer, practiceDate, nextWL, songs, notes


**Missing fields:**
- serviceType
- status (draft, published, locked, completed)
- assignment confirmations
- rehearsal objects
- attachments
- change history
- actual attendance

### 6.3 Song model gap
Songs are currently embedded in lineups and inferred historically in [`src/pages/SongsPage.jsx`](src/pages/SongsPage.jsx).

**Gap:**
- no canonical song entity
- no reusable metadata source
- no file attachment model
- no analytics-friendly structure

### 6.4 Team settings gap
There is a mismatch between intended settings and implemented settings.

**Evidence:** [`src/pages/TeamSetupPage.jsx`](src/pages/TeamSetupPage.jsx) references `hasTeamA`, `instrumentRoles`, `serviceTypes`, and `updateTeamSettings`, but [`src/context/AppContext.jsx`](src/context/AppContext.jsx) does not fully expose or manage them.

**Impact:**
- hidden product direction
- incomplete settings architecture
- risk of future inconsistency


## 7. Technical Architecture Gaps

### 7.1 AppContext overload
[`useApp()`](src/context/AppContext.jsx:470) currently centralizes too many responsibilities.

**Observed responsibilities in [`src/context/AppContext.jsx`](src/context/AppContext.jsx):**
- auth state
- user/team loading
- role derivation
- members CRUD
- lineups CRUD
- public data loading
- email-trigger side effects
- team logo upload

**Gap:**
- low separation of concerns
- harder testing
- higher regression risk
- future features will make this file harder to maintain

### 7.2 Shared UI abstraction gap
There is significant duplication between public and private pages.

**Examples:**
- [`src/pages/LineupDetailPage.jsx`](src/pages/LineupDetailPage.jsx) vs [`src/pages/PublicLineupDetailPage.jsx`](src/pages/PublicLineupDetailPage.jsx)
- [`src/pages/SchedulePage.jsx`](src/pages/SchedulePage.jsx) vs [`src/pages/PublicSchedulePage.jsx`](src/pages/PublicSchedulePage.jsx)

**Impact:**
- feature parity is harder to maintain
- bug fixes must be duplicated
- UI drift becomes likely

### 7.3 Validation and domain-rule gap
Business rules are mostly implicit in UI code.

**Missing:**
- centralized validation schemas
- reusable domain rules for assignment conflicts
- reusable scheduling utilities
- server-side validation for critical writes

### 7.4 Testing gap
No visible automated test suite exists in the workspace.

**Impact:**
- risky refactors
- slower feature delivery
- hidden regressions in scheduling logic

### 7.5 Background job gap
Reminder and notification features will require scheduled jobs, but the current architecture is mostly request-driven.

**Gap:**
- no scheduler strategy documented
- no queue / retry model
- no delivery tracking

---

## 8. Operational and Admin Gaps

### 8.1 Visibility gap for admins
Admins can manage data, but they do not yet have a control center.

**Missing admin visibility:**
- upcoming incomplete lineups
- members with no email match
- members serving too often
- songs repeated too recently
- pending confirmations

### 8.2 Auditability gap
There is no activity log.

**Impact:**
- hard to understand who changed what
- difficult to debug accidental edits
- weak accountability in multi-admin teams

### 8.3 Reporting gap
The app stores useful ministry data but does not turn it into insight.

**Missing reports:**
- member participation frequency
- worship leader rotation balance
- song usage trends
- schedule completion rate
- rehearsal attendance


## 9. Security, Reliability, and Scalability Gaps

### 9.1 Rules evolution gap
As features expand, [`firestore.rules`](firestore.rules) and [`storage.rules`](storage.rules) will need more granular access control.

**Gap:**
- current rules may be sufficient for today’s model, but future member self-service, attachments, comments, and confirmations will require more nuanced permissions

### 9.2 Data consistency gap
Some role and admin state is derived and backfilled dynamically in [`src/context/AppContext.jsx`](src/context/AppContext.jsx).

**Risk:**
- derived state can drift
- partial updates can create inconsistent team/admin/member relationships

### 9.3 Performance gap
Current public and private data loading patterns are simple, but may become expensive as data grows.

**Observed risk areas:**
- loading full member and lineup collections
- client-side filtering and sorting
- no pagination strategy
- no archival strategy for old lineups

### 9.4 Observability gap
There is no visible monitoring layer for production behavior.

**Missing:**
- error tracking
- performance monitoring
- email delivery monitoring
- audit logs for admin actions

---

## 10. Prioritized Gap Matrix

| Gap | Severity | User Impact | Build Complexity | Priority |
|---|---|---:|---:|---:|
| Availability management | Critical | Very High | Medium | P1 |
| Assignment confirmation | Critical | Very High | Medium | P1 |
| Reminder system | High | High | Medium | P1 |
| Conflict detection | High | High | Low-Medium | P1 |
| Member portal | High | High | Medium | P1 |
| Song library canonical model | High | Medium-High | Medium | P2 |
| Rehearsal workflow | High | Medium-High | Medium | P2 |
| Dashboard / alerts | Medium-High | High | Medium | P2 |
| Shared UI refactor | Medium | Medium | Medium | P2 |
| Activity log | Medium | Medium | Medium | P3 |
| Analytics / reporting | Medium | Medium | Medium-High | P3 |
| Calendar sync | Medium | Medium | Medium | P3 |
| Offline / PWA depth | Medium | Medium | Medium-High | P3 |

---

## 11. Recommended Next-Step Gap Closure Plan

### Milestone 1: Close the operational trust gap
- availability
- conflict warnings
- assignment status
- reminder emails

### Milestone 2: Close the member adoption gap
- member portal
- my assignments view
- self-service confirmations
- personal availability management

### Milestone 3: Close the planning intelligence gap
- canonical song library
- repeat detection
- scheduling fairness logic
- dashboard insights

### Milestone 4: Close the architecture gap
- split [`useApp()`](src/context/AppContext.jsx:470) responsibilities
- extract shared lineup/schedule components
- add validation and tests
- improve rules and observability

---

## 12. Final Gap Analysis Conclusion

The app does **not** have a market-fit problem. It has a **workflow depth problem**.

Its current foundation is already useful and differentiated. The main opportunity is to evolve from:

> “a tool for creating worship schedules”

into:

> “a system for running worship-team operations from planning to service day.”

The most important gaps to close first are the ones that increase trust in the schedule:

1. availability
2. confirmations
3. reminders
4. conflict detection
5. member self-service

Once those are solved, the app becomes much harder to replace with spreadsheets, chat threads, and manual follow-up.


---

## 13. Constraint Adjustment — Registered Worship Leaders vs Roster-Only Members

This analysis needs an important correction based on the actual product model:

> **Worship leaders are registered users.**
> They sign in via Google at `/admin` through [`AdminLoginPage`](src/pages/AdminLoginPage.jsx), can create their own team, and become that team’s admin.
> Other roster members such as instrumentalists, back-ups, and similar serving roles may still exist only as roster records without their own login/session.

That changes the feasibility of several roadmap and gap items.

### What this means

- Features for **registered worship leaders** to log in, manage their own team, and use self-service admin workflows are **already feasible now**.
- Features for **roster-only members** to log in, respond, or manage their own data are **not currently feasible** without expanding the membership/account model beyond worship leaders.
- Features that help the admin plan better using roster data are still **fully feasible now**.
- Some collaboration and confirmation features are now **partially feasible**, because registered worship leaders can participate directly while roster-only members still cannot.

### Examples of features that are blocked right now

- roster-member self-service availability for instrumentalists, back-ups, and other roster-only members
- roster-member portal / “my assignments” for non-registered members
- in-app assignment accept/decline by roster-only members
- roster-member notifications dashboard
- roster-member comments or collaboration as authenticated users

### Examples of features that are now partially or fully feasible

- worship leader self-service through `/admin`
- worship leader portal / “my assignments” experience for registered users
- assignment confirmation for registered worship leaders
- admin-managed availability tracking for roster-only members
- conflict detection in lineup building
- admin reminders sent externally
- lineup templates
- service types
- song library improvements
- dashboard / alerts for admins
- analytics and reporting
- rehearsal planning managed by admin

---

## 14. Reframed Gap Analysis — Feasible Now vs Blocked by Membership

### 14.1 Feasible now under the current registered-worship-leader model

#### A. Worship leader self-service and admin workflows
- worship leader sign-in and team creation through `/admin`
- worship leader self-service for their own team administration
- multi-admin team workflows among registered worship leaders
- conflict warnings
- over-scheduling warnings
- missing-role alerts
- recurring schedule generation
- lineup templates

#### B. Music planning depth
- canonical song library
- song metadata
- chart and file attachments
- repeat detection
- theme/scripture tagging

#### C. Admin operations
- dashboard
- audit log
- reporting
- rehearsal planning
- service status workflow

#### D. Public/share improvements
- better public schedule branding
- privacy toggles
- shareable exports
- calendar export

### 14.2 Partially feasible now

These can work now for registered worship leaders, but still require admin-driven, external-link, or future account expansion for roster-only members.

- reminder emails or SMS sent by admin workflow
- assignment confirmation for registered worship leaders in-app, with roster-only members handled through one-time secure links or admin follow-up
- RSVP-style response without full login for roster-only members
- attendance capture by admin after service
- worship leader portal / “my schedule” experience first, before equivalent roster-member self-service

### 14.3 Not feasible yet without expanding the roster-member membership model

- roster-member portal for instrumentalists, back-ups, and other non-registered members
- “my schedule” personalized dashboard for roster-only members
- self-managed availability for roster-only members
- in-app accept/decline for roster-only members
- member-specific push notifications for roster-only members
- roster-member comments and collaboration identity
- per-member preferences stored as user-owned settings for roster-only members

---

## 15. Corrected Priority Order for the Current Product Model

Given the registered-worship-leader model, the best next priorities are:

1. **Conflict detection and lineup validation**
2. **Worship leader self-service improvements through `/admin`**
3. **Admin-managed availability tracking for roster-only members**
4. **Dashboard / alerts for incomplete or risky lineups**
5. **Song library CRUD + metadata + attachments**
6. **Lineup templates and recurring schedule generation**
7. **Assignment confirmation for registered worship leaders, with optional secure RSVP links for roster-only members**
8. **Rehearsal planning enhancements**
9. **Audit log and reporting**
10. **Later: full roster-member accounts and broader member self-service**

### Why this order is better

Because it improves the product **while using the registered worship leader model that already exists**, without assuming every roster member already has an account.

It keeps the app aligned with what it really is today:

> a multi-user worship leader/admin platform with roster-based members

instead of assuming it is already:

> a full self-service platform for every serving member

---

## 16. Revised Conclusion

Under the current constraint, the biggest realistic gap is **not member self-service**.

The biggest realistic gap is:

> **admin decision support and operational safety**

That means the most valuable near-term work is:

- helping the admin avoid bad assignments
- helping the admin plan faster
- helping the admin manage songs and rehearsals better
- helping the admin see risks before service day

If the product later evolves into a true membership platform, then confirmation flows, member portals, and self-service availability become the next layer.
