# PermitPilot

PermitPilot helps residents and small-business owners see every permit, fee, and next step before they apply. Demo Harbor is a **fictional** town. The checklist comes from versioned rules, not a chatbot guessing the law.

## Run it (one command after Node is installed)

You only need **Node.js 22.12 or newer**. You do not need Python, Docker, or any API keys for the sample workspace.

1. Install Node from [https://nodejs.org](https://nodejs.org) (LTS).
2. Download or clone this repo, then in a terminal:

```bash
cd permitpilot
npm run setup
npm run dev
```

3. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

`npm run setup` installs packages. Sample projects work with no extra files.

To stop the app, press `Ctrl+C` in the terminal.

### If something fails

| Problem | Fix |
| --- | --- |
| `npm` is not found | Install Node 22.12+ from nodejs.org, then open a **new** terminal |
| Node is older than 22.12 | `node -v` should print `v22.12` or higher |
| Port 3000 is in use | Quit the other app using that port, or tell us and we can change it |
| Page is blank | Use `http://127.0.0.1:3000`, not a random IP |

## What we built it with

TypeScript, React, Next.js, and Tailwind CSS. Tests use Vitest. The app lives in `apps/web`.

## Optional accounts

The sample works with no extra files. If you want email sign-in, copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your own Supabase URL and anon key. Do not put a service-role key in the browser.

## Demo note

Harbor Kitchen, fees, and ordinance citations are demonstration data for Demo Harbor, NH. They are planning pointers, not official legal advice.
