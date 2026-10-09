# Distribution Guide

How AngKorGit ships to users: signing, notarization, auto-updates, and package
managers. Steps marked **[owner]** need the project owner's accounts/keys and
cannot be automated by contributors.

## 1. Versioning & releases (works today)

1. Update the version in `apps/desktop/src-tauri/tauri.conf.json`,
   `apps/desktop/src-tauri/Cargo.toml`, and root/app `package.json`.
2. Move `[Unreleased]` items in `CHANGELOG.md` under the new version heading.
3. Commit, tag `vX.Y.Z`, push the tag → `.github/workflows/release.yml` builds
   macOS (universal), Windows, and Linux bundles via `tauri-action` and attaches
   them to a **draft** GitHub release. Review, paste the changelog section, publish.

## 2. Distribution WITHOUT paid signing (macOS and Linux; Windows is signed, see §2b)

AngKorGit ships **unsigned** — free and independent. Users get one extra step
on first launch; document it prominently (README covers this):

- **macOS**: the app isn't notarized, so Gatekeeper blocks the first open.
  Either right-click the app → **Open** → Open, or on newer macOS:
  **System Settings → Privacy & Security → "AngKorGit was blocked" → Open Anyway**.
  Terminal alternative: `xattr -cr /Applications/AngKorGit.app` (removes the
  quarantine flag). Tauri ad-hoc-signs the binary automatically, so it runs
  fine on Apple Silicon once past Gatekeeper.
- **Windows**: releases before the first SignPath-signed one show SmartScreen's
  "Windows protected your PC" → **More info → Run anyway**. Signed builds carry
  the SignPath Foundation signature (§2b); SmartScreen reputation still builds
  up per certificate over the first downloads.
- **Linux**: AppImage: `chmod +x AngKorGit_*.AppImage` and run; `.deb` installs
  normally.

**macOS Keychain prompts**: account tokens live in the Keychain, and macOS
cannot durably trust an unsigned binary — "Always Allow" does not stick, so
the first git operation that needs a token asks for permission **once per app
session** (keyring reads are cached in-process; `accounts.rs` `TOKEN_CACHE`).
Click **Allow** (not "Always Allow" — it has no effect). One prompt per launch
is expected behavior for unsigned builds; a paid Developer ID signature is the
only way to make authorization permanent.

**macOS folder-access prompts (Desktop/Documents/Downloads)**: consent is
keyed to the app's code signature, so the bundle must carry one. Releases up to
0.15.0 shipped with only the linker's throwaway signature on the arm64 slice and
no bundle signature at all (`codesign -d -r- AngKorGit.app` said "not signed at
all"), so tccd could not validate any stored grant (Security error -67062) and
asked again on every protected-folder access, discarding each Allow. Since
0.16.0 `bundle.macOS.signingIdentity` is `"-"`: the bundler ad-hoc signs the
frameworks and the whole .app (both slices, Info.plist bound, resources
sealed). The stored requirement is the build's cdhash, so one installed build
means one prompt per folder, and each update re-asks once. No grant can match
while the binary on disk differs from the running process (a dmg dragged over a
running app, or `pnpm install:mac` while the old instance is open, which is why
that script quits the app first), so relaunch after installing. Stale records:
`tccutil reset All dev.angkorgit.app`, then relaunch and Allow once. Users
must drag the app out of the dmg into /Applications — running it from inside
the dmg triggers app translocation, where grants can never persist. Possible
follow-up, untested: signing with a custom designated requirement
(`identifier "dev.angkorgit.app"`) would let the grant survive updates, but it
needs a re-sign step after the bundler runs and a live tccd test first.

Security honesty: unsigned ≠ unsafe. Releases are built by public GitHub
Actions from public source, updates are minisign-verified (§3), and users can
always build from source. If the project later earns sponsorship, Apple
notarization (~$99/yr) can be added — the workflow snippet lives in git
history — purely to remove the first-launch step.

## 2b. Windows code signing — SignPath Foundation (wired, test certificate first)

Issue #49: Defender's `Wacatac.C!ml` heuristic flagged the unsigned 0.20.0
`setup.exe`, and the updater runs that same installer, so a flagged update
removed the app. The fix is a real Authenticode signature. SignPath Foundation
signs open source projects for free on their HSM (publisher reads "SignPath
Foundation"); the application was approved on 2026-10-08 and the public policy
it required lives at https://angkorgit.app/code-signing/.

**What `release.yml` does now.** The Windows build job copies the NSIS
`setup.exe` and the `.msi` into a flat `windows-unsigned` workflow artifact. A
second job, `sign-windows`, waits for all three platform builds (so every
platform has already merged its entry into `latest.json`), submits that
artifact with `signpath/github-action-submit-signing-request` and waits for the
result. SignPath checks the artifact came from a workflow run of this
repository before signing. The job then verifies the Authenticode signatures
with `Get-AuthenticodeSignature`, re-signs the two files with the updater's
minisign key (`tauri signer sign` writes a `.sig` next to each file),
replaces the four release assets with `gh release upload --clobber`, and
rewrites the three Windows signatures in `latest.json` (the `windows-x86_64`
entry points at the `.msi`, so it gets the msi signature). The release stays a
draft throughout; publishing is still the owner's manual step, so an unsigned
installer is never downloadable.

Only the two installers are signed. The `angkorgit.exe` inside them stays
unsigned (SignPath signs the uploaded artifact after the build; signing the
inner binary would need the key at build time, which an HSM-held certificate
rules out). SmartScreen and Defender judge the file the user downloads and
runs, which is the installer, so this is the same shape other SignPath-signed
Tauri apps ship.

**SignPath ids** (not secrets, hardcoded in the workflow): organization
`44482a90-340e-4e18-9931-67153e09e272`, project `angkorgit`. Signing policies:
`test-signing` (self-signed test certificate, the default) and
`release-signing` (the production certificate, INVALID in the SignPath UI
until they import it). The policy is read from the repository variable
`SIGNPATH_SIGNING_POLICY_SLUG` and falls back to `test-signing`, so the switch
to production is one variable change, no commit. With `release-signing` the
verify step also requires `Status == Valid` and `CN=SignPath Foundation`; with
the test certificate it only checks that a signature is present, because a
self-signed signer can never be Valid on the runner.

**[owner] one-time setup in app.signpath.io** (do in this order):
1. Project `angkorgit` → Artifact configurations → add one, upload
   `.github/signpath/artifact-configuration.xml` (zip root, a `pe-file` for
   `AngKorGit_*_x64-setup.exe` and an `msi-file` for
   `AngKorGit_*_x64_en-US.msi`, both `authenticode-sign`). Done 2026-10-09 as
   "Windows installers", slug `Windows_installers`, which the workflow pins
   with `artifact-configuration-slug` (SignPath pre-made an "Initial version"
   single-exe configuration that would otherwise be the default).
2. Project `angkorgit` → link the predefined trusted build system
   **GitHub.com** and set the repository to `https://github.com/cheat2001/angkorgit`.
   Then install the SignPath GitHub App (https://github.com/apps/signpath) on
   the repository: the action fails with "Failed to retrieve GitHub App token"
   without it, because SignPath fetches the workflow artifact and the run's
   origin metadata through that app (first test run, 2026-10-09).
3. CI user "CI builds" → API token → **Regenerate token**, copy it once, and
   store it as the repository secret `SIGNPATH_API_TOKEN`
   (`gh secret set SIGNPATH_API_TOKEN`). The token SignPath generated on
   2026-10-08 was never shown to us, so regenerating is the only way to get one.
4. Push a throwaway tag (for example `v0.22.0-signtest`) to exercise the
   workflow against `test-signing`: approve the request in SignPath if the
   policy asks, check the run's "Check the Authenticode signatures" step,
   download the draft's `setup.exe` on Windows and confirm Properties →
   Digital Signatures lists the test signer, then delete the draft release and
   the tag. Reply to SignPath (oss-support@signpath.org) that the setup is
   done; they review it and import the production certificate.
5. Once `release-signing` turns VALID: `gh variable set
   SIGNPATH_SIGNING_POLICY_SLUG -b release-signing`. The next tagged release is
   production-signed; note it in the CHANGELOG and close #49 with that version.

**Per release.** `release-signing` requires a manual approval in the SignPath
UI (that is part of the policy we published). The `sign-windows` job waits up
to five hours for it; approve from the email SignPath sends or from the
signing request page. If the job times out, deny the stale request in SignPath
and re-run the failed job only: the unsigned artifact is kept for three days,
and a re-run submits a fresh request. The draft's Windows assets are the
unsigned ones until the job succeeds, so do not publish before it is green.

## 3. Auto-updates — ACTIVE ✅ (free, Apple-independent)

Updates are pull-based from GitHub releases and verified with the project's
**own minisign key** before installing — a tampered download will never run.

Already wired in the codebase:
- Keypair generated; **private key: `~/.tauri/angkorgit.key` on the owner's
  machine — BACK IT UP. If lost, existing installs can never update again.**
  Public key: embedded in `tauri.conf.json → plugins.updater.pubkey`.
- `tauri-plugin-updater` + `tauri-plugin-process` registered; capability
  `updater:default`, `process:default`; `bundle.createUpdaterArtifacts: true`.
- Frontend: silent check 5s after startup (`features/updater/check.ts`) →
  "Update available" toast with **Update now** (download, verify, relaunch);
  manual **Check for updates** in the Settings rail footer.
- `release.yml` passes `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` to tauri-action,
  which then also generates and uploads `latest.json`.

**[owner] one-time — done**: both GitHub secrets are configured (releases since
0.2.0 ship `.sig` files and `latest.json`):
- `TAURI_SIGNING_PRIVATE_KEY` — the contents of `~/.tauri/angkorgit.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — set to an **empty value** (required:
  without the env var Tauri tries an interactive prompt and headless builds fail).

## 4. Homebrew cask **[live — own tap]**

Published at `cheat2001/homebrew-tap` (`Casks/angkorgit.rb`). Install:

```sh
brew install --cask cheat2001/tap/angkorgit
```

One command only: the cask runs `xattr -cr` on the installed app as a `run`
step in a `postflight_steps` block, clearing the Gatekeeper quarantine
automatically (needed because the app is not notarized; recent Homebrew removed
`--no-quarantine`). Homebrew 7 deprecated the older `postflight do` block and
warns on every `brew upgrade` (homebrew-tap issue #1), so keep the steps form.
Own-tap casks may do this — homebrew/cask proper would reject it, so when the
cask eventually moves there, signing/notarization must replace the postflight.

**On every release** the cask must be bumped: update `version` and `sha256`
(`shasum -a 256` of the new universal dmg) in
`cheat2001/homebrew-tap/Casks/angkorgit.rb`. The cask sets `auto_updates true`
(the app self-updates), so tap users who installed once still get new versions
in-app; the bump matters for fresh installs. Add this to the release checklist.

Once the project has traction (75+ stars, 30+ forks) AND the app is
signed/notarized, submit to homebrew-cask proper for
`brew install --cask angkorgit`.

## 5. Website (live)

- Live at `https://angkorgit.app/` (Astro, static, GitHub Pages via
  `.github/workflows/website.yml`; custom domain + HTTPS enforced).
- Sections: hero with graph screenshot, features, gallery, performance, AI,
  install (per-OS download cards + terminal one-liners with copy buttons),
  open-source, final CTA.
- Docs are rendered on-site at `/docs/` directly from `docs/*.md` (see
  `apps/website/src/content.config.ts`) — edit a doc and the site updates on
  the next deploy; no duplication.
- SEO: meta/OG/JSON-LD, sitemap, Google Search Console verified
  (URL-prefix property), `robots.txt` → `sitemap-index.xml`.
- Launch/verification runbook: `docs/Launch-Checklist.md`.
