# CHAT E2E tests (Playwright)

End-to-end tests for the CHAT DHIS2 app covering the four P0 flows:
**access control**, **assessment submission**, **draft save & continue**, and the
**assessment import wizard**.

## Requirements

- A running **DHIS2 2.41+** instance (the app has no standalone backend).
- The CHAT app installed on that instance (or the `d2-app-scripts start` dev
  server running and `APP_PATH=/`).
- Two DHIS2 users:
  - **Admin** — has the `F_CHAT_ADD_SETTINGS` authority.
  - **Data-capture** — does **not** have `F_CHAT_ADD_SETTINGS`.
- Node 20+, pnpm 10+.

## Setup

```bash
# from repo root
pnpm install
pnpm --filter chat-app exec playwright install chromium

# configure the instance + credentials
cp apps/chat-app/e2e/.env.example apps/chat-app/e2e/.env
$EDITOR apps/chat-app/e2e/.env
```

## Run

```bash
pnpm --filter chat-app e2e            # headless
pnpm --filter chat-app e2e:headed     # headed
pnpm --filter chat-app e2e:ui         # Playwright UI mode
pnpm --filter chat-app exec playwright show-report e2e/.report
```

## How it works

- **`global-setup.ts`** validates env vars, logs both roles into DHIS2, persists
  their sessions to `e2e/.auth/{admin,capture}.json` (`storageState`), verifies
  authorities via `me?fields=authorities`, then seeds a tracker program + an
  assessment registration (idempotent) unless `E2E_SKIP_SEED=1`.
- **Projects.** `admin` and `capture` run as separate Playwright projects, each
  with its own `storageState` and browser context, so the `useHasAuthority`
  cache (`staleTime: Infinity`) never leaks across roles.
- **Spec naming** selects the role:
  - `*.admin.spec.ts` → admin project only
  - `*.capture.spec.ts` → capture project only
  - `*.shared.spec.ts` → both projects
- **Mocking.** Destructive/polluting writes (metadata import, submit-failure
  path, dataStore write failures) are driven with `page.route(...)` so happy and
  failure branches are deterministic and do not pollute the instance.
- **Teardown** removes suite-created data unless `E2E_SKIP_TEARDOWN=1`.

## Notes / gotchas

- The app uses **hash routing** (`#/chat/...`). Use the `gotoHash` helper and
  assert on the URL hash, never fixed sleeps.
- A **`SetChapUrl` mount gate** shows a full-viewport loader until the CHAP route
  init resolves. `waitPastChapGate` handles this (and can intercept
  `**/api/routes/chat/run/**`).
- Draft dataStore writes use `?encrypt=true`; assert drafts via the UI + the
  presence of the localStorage key, not decrypted store contents.
- Google Earth Engine climate execution is **out of scope** (no stub-friendly
  seam) — see the root `e2e-test-plan.md`.
