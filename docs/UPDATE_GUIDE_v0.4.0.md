# Applying RoboForge Studio v0.4.0 — GitHub Desktop

This upgrade is meant for your **RoboForge** repository, not for ChromaNeural. No GitHub repository was changed on your behalf.

1. Make sure your local RoboForge working tree is clean. Commit or back up any unrelated edits first; note the current HEAD commit.
2. In GitHub Desktop, create a new feature branch, e.g. `feature/mcp-module9-v0.4.0`, from the current `main` before copying files.
3. Extract `RoboForge-Studio-v0.4.0-MCP-Update-Only.zip`. Copy the *contents of the `RoboForge/` folder* onto your local RoboForge checkout, retaining paths and hidden `.github` files. Do not copy this folder inside the existing repository as an extra nested folder.
4. Review the diff before commit, especially README and website changes if you made parallel local edits. The package was assembled from v0.3.2 source; GitHub might have advanced. Resolve conflicts rather than overwriting newer work blindly.
5. Run `npm --prefix backend test` and `npm run docs:check`. With npm access: `npm --prefix frontend install && npm --prefix frontend run build`.
6. On localhost: `ROBOFORGE_MCP_ENABLED=1 HOST=127.0.0.1 npm start`, then `npm run mcp:smoke` in another terminal. Disable it again unless preparing an authorized ChromaNeural connection.
7. GitHub Desktop commit summary suggestion: `Add optional RoboForge MCP Gateway for ChromaNeural module 9`.
8. Push and let GitHub Actions execute the full frontend build and Linux DEB candidate packaging. Check results before release. Do not claim the GitHub CI job passed unless you have its actual log.
9. Only then provide `docs/CHROMANEURAL_MODULE9_PROMPT.md` and `docs/MCP_GATEWAY_HANDOVER.md` to your separate ChromaNeural ChatGPT development window for independent acceptance.

## Design policy

Graphite-dark and silver-light themes with cyan accents are preserved. The existing ChromaNeural architecture, eight existing modules, Internet Identity, WorkQueue, storage, ChromaSpeechAI and publication rights are **not modified** by this update.

## Feature boundaries

- RoboForge has ten *registered* modules, of which Janus currently provides honest runtime status only; no image inference.
- The optional Refract Studio module previews CPL -> CPA using a separately installed trusted source checkout. The real compiler remains unverified on Linux in this package.
- The MCP Gateway exposes three manually approved, bounded tools. Future plugins do **not** automatically become MCP execution tools.
- No remote network bind, shell, file writes, robot actuation, forced download, auto-approval or automatic result publication.
