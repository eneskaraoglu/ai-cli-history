# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Electron desktop app with a flat layout. Core files live at the repo root:

- `main.js`: Electron main process, window lifecycle, filesystem access, and IPC handlers.
- `preload.js`: secure bridge that exposes renderer-safe APIs.
- `renderer.js`: client-side UI logic, filtering, search, and rendering.
- `index.html` and `styles.css`: static UI structure and styling.
- `README.md`: end-user setup and feature overview.

Build output goes to `dist/`. Do not commit `node_modules/`, `dist/`, `.claude/`, or local log files.

## Build, Test, and Development Commands
- `npm install`: install Electron and packaging dependencies.
- `npm start`: launch the app locally with Electron.
- `npm run build`: create a packaged app with `electron-builder`.
- `npm run build:win`: build the Windows installer into `dist/`.

Run commands from the repository root, for example: `npm start`.

## Coding Style & Naming Conventions
Follow the existing style in the codebase:

- Use 2-space indentation in JavaScript, HTML, and CSS.
- Prefer `const` and `let`; avoid `var`.
- Use `camelCase` for variables and functions like `loadCodexSessions`.
- Use clear DOM id/class names such as `conversationsList` and `tab-btn`.
- Keep renderer logic in `renderer.js`, privileged or filesystem logic in `main.js`, and only expose minimal APIs through `preload.js`.

There is no configured formatter or linter yet, so keep diffs small and match surrounding style exactly.

## Testing Guidelines
No automated test suite is configured at the moment. Before opening a PR:

- Run `npm start` and verify session loading, search, filters, and backup flows manually.
- If you change packaging behavior, run `npm run build` or `npm run build:win`.
- When adding tests later, place them in a `tests/` directory and name files `*.test.js`.

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit messages such as `Add README documentation` and `update for codex`. Prefer concise messages that describe the user-visible change.

PRs should include:

- A brief summary of the change and affected files.
- Linked issue or task, if applicable.
- Screenshots or short GIFs for UI updates.
- Manual verification notes listing the commands you ran.

## Security & Configuration Tips
This app reads local CLI history from user directories. Do not hardcode personal paths or commit real session data. Keep filesystem access in the main process and expose only the minimum IPC surface needed by the renderer.
