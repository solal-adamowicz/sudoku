# Sudoku web app — user experience, flows, and anonymous “memory”

This document describes how people move through the app today, how we can recognize them **without accounts**, and how to make the experience **smoother on mobile** — including tradeoffs and a concrete enhancement roadmap.

---

## 1. Current user flows

### 1.1 First visit (cold start)

1. User opens the site (GitHub Pages URL or local dev).
2. Prerendered shell loads; **`SudokuDemo`** sets `ready` only after **`onMount`** runs.
3. **`startGame()`** generates a puzzle in-browser; header shows **date**, **monthly points** (from storage if any), **timer** at `00:00`.
4. User sees the grid, toolbar (Undo / Erase / Notes), digit row, and footer difficulty + **New game**.

**Friction today:** brief non-interactive state (`pointer-events-none`, reduced opacity) until the first puzzle is ready. On slow devices, generation can add a small delay before interaction.

### 1.2 Core play loop

1. **Select cell** — tap a square; row/column/box peers highlight; selection ring on active cell.
2. **Enter digit** — tap `1–9` in the bottom row; in **Notes** mode, toggles pencil marks (with auto-pruning when clues rule digits out).
3. **Conflicts** — duplicate values in a unit tint cells red in real time.
4. **Erase** — clears value or all notes in the selected non-given cell (with undo support).
5. **Undo** — steps back through value/note snapshots (stack capped at 80).
6. **Pause** — stops timer and blocks cell selection / digit entry until resume.

### 1.3 End of game

1. When every cell is filled and **no conflicts**, **`solved`** becomes true.
2. A short **success message** appears; timer stops.
3. **Points** are added once per `gameId` to **monthly score** in **`localStorage`** (formula in architecture doc).

### 1.4 Starting over / changing difficulty

- **New game** or **difficulty pill** calls **`startGame()`** — new puzzle, timer reset, undo cleared, **no confirmation** (accidental tap loses progress).
- **No autosave** of the current grid — closing the tab mid-game loses state.

---

## 2. How we “remember” people without accounts

There is **no login**. Identity is **implicitly “this browser profile on this origin”**. Everything optional must be built on **client-side storage** or **URLs**.

### 2.1 What we do today

| Mechanism | Key / shape | What it stores |
|-----------|-------------|----------------|
| **`localStorage`** | `sudoku-month-score` (see `SudokuDemo.svelte`) | JSON: `{ ym: "YYYY-MM", points: number }` — **current calendar month** only; if month changes, loader treats missing mismatch as **0** until new wins. |

**Implications:**

- **Same device, same browser:** score persists across sessions.
- **New device / other browser / private window:** starts from zero — **not synced**.
- **Clear site data:** score and any future saves are gone.
- **Privacy:** no PII; no third-party cookies required. Fits static GitHub Pages.

### 2.2 Patterns to add (still no accounts)

| Approach | Best for | Caveats |
|----------|----------|---------|
| **`localStorage` JSON blob** | Small state: settings, last difficulty, WIP game, best times | ~5MB limit; synchronous API; blocked in some embedded browsers |
| **`IndexedDB`** | Larger history: many past games, aggregates, daily streak objects | More code; use a tiny wrapper (e.g. **idb**) if it grows |
| **`sessionStorage`** | “This tab only” scratch data | Cleared when tab closes |
| **URL state** | Shareable **daily puzzle** (`?seed=…`), deep links | Length limits; don’t put secrets in URL |
| **First-party optional backend** (future) | Cross-device leaderboards, accounts | Not static-only; out of scope unless you add hosting |

### 2.3 Recommended storage layout (evolution)

Use **one versioned root key** to avoid collisions and allow migrations:

```text
sudoku:v1:profile   → { preferredDifficulty, theme, haptics, … }
sudoku:v1:stats → { monthId, points, gamesWon, bestTimeByDifficulty, … }
sudoku:v1:current   → { gameId, difficulty, givens, values, notes, seconds, paused, updatedAt }
```

- **`monthId`** like `YYYY-MM` — align with how you reset monthly UI.
- **`updatedAt`** — discard stale autosave if schema or app version changes.
- On **`storage` event** (second tab): optionally merge or show “game updated in another tab”.

### 2.4 “Soft identity” and trust

Without accounts, **scores are honor-system** and **per-device**. If you ever need integrity (leaderboards), you’d need a server to validate puzzles or signed seeds — not required for a casual PWA.

---

## 3. Mobile UX — current fit and gaps

### 3.1 What already helps

- **Viewport** meta and **safe-area** padding on the main container.
- **Large tap targets** on cells and digit row; **horizontal digit row** matches common Sudoku apps.
- **Light theme** tuned for outdoor contrast; **peer highlighting** reduces eye strain when scanning.
- **`-webkit-tap-highlight-color: transparent`** in global CSS reduces flash on tap.
- **Static hosting** — fast first load when cached; works offline **after** first visit if you add a service worker (not present yet).

### 3.2 Gaps and friction

| Issue | Why it matters on mobile |
|-------|---------------------------|
| **No PWA manifest / service worker** | No “Add to Home Screen” polish; no offline shell; no icon/splash control. |
| **No haptic feedback** | Taps feel flat; **`navigator.vibrate`** (short pulse on place digit / error) is cheap to add where supported. |
| **No “game in progress” restore** | Mobile users switch apps constantly; **autosave** is high value. |
| **New game without confirm** | Easy to mis-tap and lose a long session; **confirm modal** for destructive actions. |
| **Timer + pause only** | Some users expect **auto-pause on hidden tab** (`document.visibilityState`) to save battery and fairness. |
| **Keyboard / assistive tech** | Digits are buttons-only; **no** number-key shortcuts for external keyboards (nice for tablets with keyboards). |
| **Scroll / overscroll** | Long sessions on small phones: ensure the layout doesn’t bounce the whole page when interacting near edges (`overscroll-behavior`, `touch-action` on grid if needed). |
| **Landscape** | Grid is square and capped width — usually fine; verify thumb reach to digit row in landscape. |

---

## 4. Smoother mobile — prioritized improvements

### Tier A — high impact, low complexity

1. **Autosave current game** to `localStorage` (or IndexedDB) on every move (debounced) + restore on load.
2. **Confirm “New game”** (and maybe difficulty change) if `values` differ from initial puzzle.
3. **Auto-pause** when `document.hidden` is true (optional user setting).
4. **`theme-color` / manifest** for installed icon + status bar alignment with your UI background (`#fafbfc`).

### Tier B — PWA

1. Add **`manifest.webmanifest`** (name, icons, `display: standalone`, `start_url` with correct **`base`** for GitHub project pages).
2. **Service worker** (via Vite PWA plugin or manual) — cache static assets; optional offline “play last downloaded” mode.

### Tier C — feel and speed

1. **Haptics** on digit place / conflict / solve (`vibrate` with feature detect).
2. **Reduce main-thread work** when generating puzzles (Web Worker) so the “ready” gate is shorter on mid-range phones.
3. **Optional**: long-press cell for quick “clear” or context menu — only if usability testing shows demand.

### Tier D — engagement without accounts

1. **Daily challenge** driven by **deterministic seed** (`date + difficulty`) so everyone gets the same puzzle; store completion in local stats.
2. **Streak counter** (local): consecutive calendar days with ≥1 win — purely `localStorage`.

---

## 5. How this ties to architecture

- Persistence and PWA are **orthogonal** to the Sudoku engine: keep **`src/lib/sudoku/**`** pure; add **`src/lib/persistence/**`** or **`src/lib/stats/**`** for storage helpers.
- For GitHub Pages **`base` path**, any **manifest `start_url`** and **service worker scope** must respect **`paths.base`** from SvelteKit so installed icons open the correct URL.

---

## 6. Summary

- **Today:** strong core loop and mobile-oriented layout; **monthly score** is the only persisted “memory,” and **no in-progress save**.
- **Without accounts:** treat **`localStorage` / IndexedDB + optional URL seeds** as the full toolkit; be explicit about **per-browser, per-device** limits.
- **Next wins:** autosave + confirm new game + PWA shell + auto-pause + haptics — in that order for most users on phones.

Keep this document updated when you ship persistence or PWA so product and engineering stay aligned.
