# GitHub publication checklist

**Clean source ZIP layout:** Files are stored directly at the ZIP root (`README.md`, `.github/`, `backend/`, `frontend/`, `docs/`). There is **no nested `RoboForge/` directory**. Extract directly into a fresh local repository directory and publish its contents with GitHub Desktop or Git.

- [x] Include an MIT `LICENSE` file (Copyright (c) 2026 Janus5G) at repository root and reference it in the README. GitHub should detect it automatically after push.
- [ ] Decide the final repository name and configure links to it if needed.
- [ ] Verify `npm --prefix frontend install --no-audit --no-fund && npm --prefix frontend run build` on a networked development machine; commit a reviewed npm lockfile if reproducible `npm ci` is desired.
- [ ] Run `npm --prefix backend test` locally and check the GitHub Actions workflow after the first push.
- [ ] Launch the built app and capture **actual runtime screenshots** if you want to replace the clearly marked design previews.
- [ ] Check any third-party dependencies, license notices and distribution compliance before publishing binaries.
- [ ] Enable **Settings → Pages → Deploy from a branch → main /docs** if you want the public landing page (path: `docs/index.html`). Do not claim the Pages URL exists before enabling it.
- [ ] Configure vulnerability reporting and an issue/PR policy if accepting community contributions.
- [ ] Release `.deb` and ZIP binaries as separate GitHub **Release assets**, not committed binaries. A prior v0.3.1 `.deb` exists separately, but it is not bundled here and is not claimed to be a reproducible artifact of this repository ZIP.
- [ ] Validate each real external AI provider/PLC/device integration separately on approved equipment and infrastructure.

GitHub Actions runs backend regression tests and attempts frontend typechecking/bundling with downloaded npm dependencies. It is **not** a substitute for industrial device certification, tenant APIs, performance profiling or end-to-end runtime acceptance.
