# Southern Iron Fitness

Editable Next.js website source prepared for Visual Studio Code and hosted Supabase.

## Open and run it

1. Extract the ZIP file.
2. Open the extracted `southern-iron-fitness-vscode` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Make sure Node.js 22.13 or newer is installed.
5. Run `npm install`.
6. Run `npm run dev`.
7. Open the local address shown in the terminal.

## Supabase without Docker

This project is set up for a hosted Supabase project, so you do not need Docker or `supabase start`.

1. Sign into Supabase in your browser.
2. Open or create the Southern Iron Fitness project.
3. Go to the project **Connect** panel for Next.js.
4. Copy `.env.example` to `.env.local`.
5. Paste your project values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use `lib/supabase/client.ts` for browser components and `lib/supabase/server.ts` for server components, server actions, and route handlers.

## Where to edit

- Page content and layout: `app/page.tsx`
- Colors, spacing, and responsive styling: `app/globals.css`
- Browser title and page metadata: `app/layout.tsx`
- Supabase clients: `lib/supabase/`
- Images and other public files: `public/`

The download intentionally excludes installed dependencies, temporary build files, source-control history, and the hosted Sites project identity. Running `npm install` recreates the dependencies on your computer.
