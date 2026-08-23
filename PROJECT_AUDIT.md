# PROJECT AUDIT

Audit date: 2026-08-22
Project: Southern Iron Fitness website
Audit passes: Maitai Flash baseline and Sol independent rerun
Current verdict: 🟠 INCOMPLETE - P0 website blockers resolved; launch details and runtime QA remain

## Audit Basis

This rerun inspected the application source, routes, styling, responsive rules, assets, environment-variable presence, database/auth scaffolding, build tooling, tests, and live Gymdesk login/signup endpoints. Release validation was completed from a clean, non-synced local runtime because Google Drive corrupts dependency extraction in the workspace.

The appropriate product scope appears to be a focused marketing website that sends membership transactions to Gymdesk. A custom database, authentication system, admin area, payment API, or CRM is not considered missing unless the business chooses to move those responsibilities away from Gymdesk.

## Sol vs. Maitai Flash

| Area | Maitai Flash baseline | Sol rerun | Final ruling |
| --- | --- | --- | --- |
| Overall state | Refine; visually promising but not production-ready | Agrees on readiness, but `INCOMPLETE` is more accurate because public placeholders and broken links remain | 🟠 INCOMPLETE |
| Brand direction | Strong and worth preserving | Agrees; the industrial black/rust/gold direction is specific to the business | ✅ PASS |
| Build failure | Attributed to missing Next/runtime configuration | The source and lockfile pass ESLint, TypeScript, and a production Next build from a clean local runtime; Google Drive remains unsuitable for dependency installation | ✅ PASS with local-runtime constraint |
| Environment | Supabase values described as blank/unconfigured | Required Supabase keys are present in `.env.local`; values were not exposed | ✅ PASS for presence; 🔵 REVIEW for need |
| Navigation | Suggested `#gymdesk` was nonfunctional | `#gymdesk` is valid; the actual broken `#gallery` and placeholder social links were removed | ✅ PASS |
| Gymdesk | Called only a partial integration | External login and signup pages are live and appropriate for a marketing-site architecture | ✅ PASS with pricing review |
| Database/auth/admin | Treated as missing or potentially P0 | Not required by the discovered scope; existing helpers are unused template scaffolding | ⏸ DEFERRED / 🔵 REVIEW |
| Contact form | Treated as incomplete | A custom form is optional because mail and Gymdesk provide conversion paths | 🔵 REVIEW |
| Graphics | Correctly identified unfinished asset governance | Real facility assets are strong; coaching/community images require provenance and identity review | 🟡 REFINE |
| Responsive quality | Not runtime-verified | Agrees; CSS is responsive-aware and the build now passes, but viewport screenshots and interaction QA remain | 🟠 INCOMPLETE |

## P0 - Production Blockers

### [x] Local build and dependency integrity
- Status: ✅ PASS WITH CONSTRAINT
- Exists: A clean lockfile install and validation runtime at `%LOCALAPPDATA%\SouthernIronFitness\runtime`.
- Evidence: `npm run lint`, `npm exec tsc -- --noEmit`, `npm run build`, script syntax validation, and `git diff --check` pass against an exact source mirror. Next.js statically generates `/` and `/_not-found`.
- Constraint: Google Drive still produces extraction/write errors and rejects directory junctions, so dependencies must remain outside the synced workspace.
- Action: Keep dependency installation and local validation in a non-synced filesystem location.
- Dependencies: none for the Vercel release path.
- Priority: P0.

### [x] Production/deployment path
- Status: ✅ PASS
- Exists: Next.js production scripts, GitHub repository, and the Vercel project `xrkr80hds-projects/southernironfitness`.
- Evidence: Vercel is the confirmed canonical target; its deployment endpoint responds successfully, and the custom domain uses Vercel A/CNAME records through Spaceship DNS.
- Constraint: Vinext/Cloudflare and unused template scaffolding remain cleanup candidates, not release blockers.
- Action: Preserve the Next.js/Vercel deployment path; remove alternate starter infrastructure only as a separate reviewed task.
- Dependencies: none.
- Priority: P0.

### [x] Public placeholder hero
- Status: ✅ PASS
- Exists: The designed hero now uses the real facility image `/photos/fitness-foto.jpeg` with updated copy and alt text.
- Evidence: The placeholder instructions are absent from source and generated HTML; the production build includes the selected hero image.
- Action: Validate final crops during responsive screenshot QA.
- Dependencies: viewport QA.
- Priority: P0.

### [x] Broken or misleading public links
- Status: ✅ PASS
- Exists: Desktop/mobile navigation, footer links, email, map, and Gymdesk CTAs.
- Evidence: The nonexistent Gallery navigation and placeholder Instagram/Facebook links were removed; “Follow the build-out” now targets the existing `#training` section.
- Action: Add social links only when confirmed public URLs are available.
- Dependencies: none for release.
- Priority: P0.

## P1 - Business and User Experience

### [ ] Membership offer accuracy
- Status: 🔵 REVIEW
- Exists: The site lists Single, Couple, Family, Family Plus, day/guest passes, and service rates. Gymdesk signup and login both resolve successfully.
- Evidence: The public Gymdesk signup page currently exposes Day Pass, Special Rate Membership, and Standard Membership; the additional displayed plans were not visible in the public response.
- Concern: A pricing mismatch can create customer confusion and operational disputes.
- Action: Confirm every displayed price against Gymdesk and business policy, then make the website and signup catalog match.
- Dependencies: owner approval and Gymdesk configuration.
- Priority: P1.

### [ ] Launch-state and contact accuracy
- Status: 🔵 REVIEW
- Exists: Address, map, email CTA, and “Opening soon” messaging.
- Evidence: Gymdesk publishes phone `318-419-1108`, address, and `southernironfitness26@gmail.com`; the site uses `info@southernironfitness.com`, omits the phone, and repeatedly says opening soon.
- Concern: Contact channels and operational status may be stale or inconsistent.
- Action: Confirm opening status, official email, phone visibility, hours, and whether “founding member” language is still current.
- Dependencies: owner/business confirmation.
- Priority: P1.

### [ ] Homepage content completeness
- Status: 🟠 INCOMPLETE
- Exists: Hero, positioning, training features, membership, class placeholder, CTA, location, and footer.
- Evidence: Coaching copy says space is “reserved,” classes are only “Coming soon,” and no hours or concrete coaching/class details are provided.
- Concern: The site communicates atmosphere better than practical visit and service information.
- Action: Replace staging language with confirmed offerings; add hours and access information if the gym is open.
- Dependencies: business details.
- Priority: P1.

### [ ] Responsive and interaction QA
- Status: 🟠 INCOMPLETE
- Exists: Breakpoints at 1024px, 900px, and 560px; mobile navigation; stacked grids; flexible spacing.
- Evidence: Source review and the production build pass, but no current viewport screenshots or browser interaction tests have been captured.
- Concern: Mobile hero height, 61px heading fit, menu behavior, map sizing, CTA stacking, and image crops are unverified.
- Action: After P0 build repair, test 390x844, 844x390, 768x1024, 1366x768, and 1440x900 with screenshots and horizontal-overflow checks.
- Dependencies: local runtime on port 3000 and browser tooling.
- Priority: P1.

### [ ] Accessibility
- Status: 🟡 REFINE
- Exists: Semantic sections, heading structure, navigation labels, descriptive image alt text, and iframe title.
- Evidence: No visible `:focus-visible` treatment, skip link, reduced-motion handling, or automated accessibility test exists.
- Concern: Keyboard and motion-sensitive experiences are not production-verified.
- Action: Add visible focus treatment, a skip link, reduced-motion behavior, and run keyboard plus automated checks after build repair.
- Dependencies: working runtime.
- Priority: P1.

### [ ] Image authenticity and anchor consistency
- Status: 🔵 REVIEW
- Exists: Strong real facility, storefront, and interior signage photography; polished coaching and community compositions.
- Evidence: `training-soon.png` and `friends-workout.png` appear synthetic and have no documented source or approved people anchors. `GRAPHICS_LOG.md` was created after the assets and does not establish their provenance.
- Concern: Synthetic people can undermine local trust and conflict with strict employee/member identity rules.
- Action: Document provenance and approval. Replace with real members/staff or clearly approved campaign assets if identity cannot be verified.
- Dependencies: image provenance, releases, and owner approval.
- Priority: P1.

## P2 - Refinement and Maintainability

### [ ] Typography implementation
- Status: 🟡 REFINE
- Exists: Geist and Geist Mono are loaded in the layout.
- Evidence: `body` overrides them with Arial/Helvetica, leaving the loaded font variables unused.
- Concern: The result is less intentional and downloads fonts without using them.
- Action: Adopt an approved display/body pairing or remove unused font loading.
- Dependencies: design direction.
- Priority: P2.

### [ ] SEO and social sharing
- Status: 🟡 REFINE
- Exists: Title, description, favicon, language, and basic metadata.
- Evidence: No Open Graph image, social metadata, sitemap, robots configuration, canonical URL, or structured local-business data was discovered. Production metadata still includes `codex-preview: development`.
- Concern: Search and link-sharing presentation are incomplete.
- Action: Add launch metadata and local-business schema after domain and opening details are confirmed.
- Dependencies: production domain and approved share image.
- Priority: P2.

### [ ] Code and content maintenance
- Status: 🟡 REFINE
- Exists: The one-page implementation is understandable and small enough to maintain.
- Evidence: Pricing, links, and content are hardcoded in one page; unused gallery CSS and unused Supabase/auth/database scaffolding remain.
- Concern: Duplicate business facts can drift, as the current pricing/contact review demonstrates.
- Action: Centralize repeated business data and remove confirmed-unused template code without introducing a CMS prematurely.
- Dependencies: scope and deployment decision.
- Priority: P2.

### [ ] Test coverage
- Status: 🟠 INCOMPLETE
- Exists: One rendered-HTML test file.
- Evidence: `npm test` only runs `npm run build`; the rendered-HTML test is not wired into package scripts and targets `dist/server/index.js`, which belongs to the alternate Vinext path.
- Concern: No navigation, link, accessibility, responsive, or conversion behavior is covered.
- Action: Align tests with the chosen runtime and add a minimal browser smoke test for the homepage and external CTA destinations.
- Dependencies: canonical build path and repaired dependencies.
- Priority: P2.

## Deferred or Not Required by Current Scope

### [ ] Custom database
- Status: ⏸ DEFERRED
- Ruling: Not missing for a static marketing site using Gymdesk. `db/schema.ts` explicitly states that the schema is intentionally empty.

### [ ] Custom authentication and authorization
- Status: ⏸ DEFERRED
- Ruling: Not missing while member and manager access is delegated to Gymdesk.

### [ ] Admin/CMS
- Status: ⏸ DEFERRED
- Ruling: Hardcoded content is acceptable at this size. Add a CMS only when staff editing frequency justifies the operational cost.

### [ ] Custom contact form, CRM, uploads, notifications, and payment APIs
- Status: 🔵 REVIEW
- Ruling: These are optional enhancements, not audit failures, while email and Gymdesk satisfy the intended flow.

## Confirmed Passes

- [x] ✅ Brand direction is distinctive, coherent, and appropriate for Southern Iron Fitness.
- [x] ✅ Live Gymdesk login and signup endpoints resolve and expose real membership workflows.
- [x] ✅ The on-page `#gymdesk`, `#about`, `#training`, and `#contact` destinations exist.
- [x] ✅ Location map and external-map link use the published business address.
- [x] ✅ Real facility/storefront assets are relevant and strong enough to anchor the site.
- [x] ✅ Supabase environment variables are present in `.env.local`; no secret values were recorded in this audit.
- [x] ✅ The code uses semantic HTML and Next Image for core images.

## Priority Order

1. P1: reconcile pricing, launch status, contact details, hours, and service copy with Gymdesk/business reality.
2. P1: verify image provenance and replace unapproved synthetic people assets.
3. P1: run responsive, accessibility, and browser-flow QA on port 3000.
4. P2: finish SEO, typography, cleanup, and correctly wired smoke tests.

## Highest-Value Next Work Group

**P1 business-accuracy and runtime QA**

- Confirm pricing, opening status, contact details, hours, and current service copy.
- Verify people-image provenance and approvals.
- Start the validated Next.js application on port 3000.
- Capture desktop/mobile responsive, keyboard, accessibility, and conversion-flow validation.

Do not add a custom database, auth system, admin area, or contact backend during this work group unless the business explicitly changes the product scope.
