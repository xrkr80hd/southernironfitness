# Work Planned

## 2026-08-22 - LICL Codex Hooks

- Task: Create workspace-local Codex hooks for session start, pre-implementation LICL enforcement, and pre-completion verification.
- Affected area: `.codex/` hook configuration and hook scripts; LICL workspace logs.
- Intended result: Codex starts with workspace context, blocks implementation when work is not planned, and requires completion verification/logging before claiming work is done.
- Dependencies: Existing `AGENTS.md` workspace rules, supported Codex project-local hook format, Node.js runtime.
- Status: Completed
## 2026-08-22 - P0 stabilization and public-trust repair

- Task: Repair dependency/build integrity, confirm the canonical deployment path, replace the public hero placeholder, and resolve broken Gallery/social links.
- Affected area: local dependency environment, Next/Vinext deployment configuration, app/page.tsx, app/globals.css, and approved public assets.
- Intended result: A buildable marketing site with no public mockup instructions or dead navigation, followed by responsive and accessibility QA on port 3000.
- Dependencies: Stable non-synced npm installation location or paused Google Drive sync, hosting decision, real social URLs, gallery decision, and approved hero image.
- Status: Partially Completed - build, deployment path, hero, and links repaired; responsive/accessibility QA remains planned

## 2026-08-22 - Push Southern Iron Fitness build to Git

- Task: Prepare the current Southern Iron Fitness build for Git, verify it builds, commit the publishable files, and push `main` to `origin`.
- Affected area: Git tracking, ignore rules for local artifacts, LICL logs, current page/build configuration files, and repository remote state.
- Intended result: `origin/main` contains the current build without local dependency backups, runtime logs, or machine-specific files.
- Dependencies: Working local dependencies, successful `npm test`/build, valid GitHub remote access for `https://github.com/xrkr80hd/southernironfitness.git`.
- Status: Completed

## 2026-08-22 - Strict lint and production build before Vercel Git deploy

- Task: Run a stricter source-quality check before pushing the current folder to GitHub for Vercel deployment.
- Affected area: ESLint, TypeScript, Next.js production build, generated artifact ignore rules, and Git release state.
- Intended result: `npm run lint -- --max-warnings=0`, `npx tsc --noEmit`, and `npm run build` pass before push.
- Dependencies: Existing GitHub remote and Vercel Git integration.
- Status: Completed locally; push triggers Vercel deployment

## 2026-08-23 - Repair Find Us map display

- Task: Fix the bottom Find Us section so the address is paired with a visible Google Maps embed and an open-in-Google-Maps path, and remove the Ask a question link under the address.
- Affected area: `app/page.tsx`, `app/globals.css`, location section markup/styling, local validation, and Git deployment trigger.
- Intended result: The location section shows Southern Iron Fitness, the address, a usable map, and a direct Google Maps link without the extra ask-question CTA under the address.
- Dependencies: Existing address and Google Maps URL; GitHub push triggers Vercel deployment.
- Status: Completed

## 2026-08-23 - Replace header logo with round SIF mark

- Task: Use `public/brand/sif_logo_round.png` as the top-corner header logo in place of the current compact SVG mark.
- Affected area: `app/page.tsx`, `app/globals.css`, `GRAPHICS_LOG.md`, header brand presentation, local validation, and Git deployment trigger.
- Intended result: The sticky header shows the round Southern Iron Fitness logo without distortion or the old clipped badge treatment.
- Dependencies: Existing round logo asset at `public/brand/sif_logo_round.png`.
- Status: Completed
