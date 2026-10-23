# PermitPilot

PermitPilot helps residents and small-business owners see every permit, fee, and next step before they apply. Demo Harbor is a **fictional** town. The checklist comes from versioned rules, not a chatbot guessing the law.

## Run it (one command after Node is installed)

You only need **Node.js 20 or newer**. You do not need Python, Docker, or any API keys.

1. Install Node from [https://nodejs.org](https://nodejs.org) (LTS).
2. Download or clone this repo, then in a terminal:

```bash
cd permitpilot
npm run setup
npm run dev
```

3. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

`npm run setup` installs packages and creates `apps/web/.env.local` if it is missing. The sample projects work with that empty file.

To stop the app, press `Ctrl+C` in the terminal.

### If something fails

| Problem | Fix |
| --- | --- |
| `npm` is not found | Install Node 20+ from nodejs.org, then open a **new** terminal |
| Node is older than 20 | `node -v` should print `v20` or higher |
| Port 3000 is in use | Quit the other app using that port, or tell us and we can change it |
| Page is blank | Use `http://127.0.0.1:3000`, not a random IP |

## Optional extras

These are **not** required to click through Harbor Kitchen.

- **Supabase** — paste project URL and anon key into `apps/web/.env.local` if you want cloud sign-in.
- **Claude explanations** — paste `ANTHROPIC_API_KEY` and a workspace id that starts with `wrkspc_` if you want **Explain this citation** to use Claude. Without them, the button still shows a local summary.

Restart `npm run dev` after editing `.env.local`.

## What we built it with

TypeScript, React, Next.js, and Tailwind CSS. Tests use Vitest. The live product is the Next.js app in `apps/web`. The older Python folder in `apps/api` is not needed to run the demo.

## Demo note

Harbor Kitchen, fees, and ordinance citations are demonstration data for Demo Harbor, NH. They are planning pointers, not official legal advice.
