# AVG Engine — Conventions & Pitfall Checklist

Reference detail for the `avg-game-maker` skill. Load this when coding a new `story<N>` or
debugging engine behavior.

## 1. Engine facts (verified against source)

- **Stack**: TypeScript + Vite. Run dev with managed Node 22: `npm.cmd run dev` (Vite, default
  http://localhost:3000). First run needs `npm.cmd install` to pull the Windows esbuild binary.
- **Auto-discovery**: `import.meta.glob('./story[0-9]*/story.ts')` — new stories MUST be a `story<N>`
  directory. **The glob is deliberately restricted to digit-suffixed dirs**: a plain `./story*/story.ts`
  also matches `story-template/`, whose `story.ts` exports a valid `StoryDef` (id `my-story`, title
  「我的故事」) — that made the scaffold show up as a playable "game" in the story picker.
  Current state (2026-09-04): story1 & story2 were deleted as immature; only **story3** remains ⇒
  next new story is **story4**. Copy `story-template/` → rename the dir to `story<N>`.
- **`set` instruction op**: only `'=' | '+=' | '-='`. **No `'add'`** — an `op:'add'` is silently
  treated as `'='`, so any `+=`-intended accumulation just overwrites. (Historical instance lived in
  the now-deleted story2 `script.ts` ~line 99.)
- **`manifest.ts`**: registers real asset paths. `loadAudio` **throws on 404** (it is NOT a safe
  skip) — a registered-but-missing file crashes game startup. Keep manifest and files in sync.
- **`placeholder.ts`**: a **hardcoded `MISSING_KEYS` set** overrides real files with gradient+
  text data-URL placeholders. Dropping a real PNG into `public/images/bg/` is NOT enough — you
  must also remove the key from `MISSING_KEYS` (and the `PLACEHOLDERS` map) or the gradient shows.
- **Endings**: `EndingDef` type + `unlock` instruction + `save-system.ts` localStorage (isolated
  per storyId) + `ui-manager.ts` album panel / detail modal. Documented in DEV_MANUAL.md §16.
- **Home BGM**: engine `showTitleScreen()` auto-plays `bgm_title`; `restoreFromSave` stops BGM.
- **Backgrounds are opaque txt2img**; sprites need white-bg render then RMBG (remove background)
  to transparent.

## 2. story<N> four-file template

Each new story directory needs exactly four files:

- `story.ts` — default-exports a `StoryDef`; its `getManifest` MUST reference **this directory's**
  `placeholder.ts` fill function (the scaffold `story-template/` names it `fillPlaceholders`;
  story3 names it `fillStory3Placeholders`). Copying the template without renaming the function
  consistently across `story.ts` and `placeholder.ts` breaks the build.
- `manifest.ts` — assets (bg/sprites/audio) with real paths; register the home BGM key.
- `script.ts` — the **JSON instruction array**. Split prose into `dialog`/`narration`/`scene`/
  `set`/`jump`/`unlock`/`effect` nodes; never put a whole chapter in one node.
- `placeholder.ts` — `createPlaceholder()` helper + `MISSING_KEYS`/`PLACEHOLDERS`; clear keys once
  real assets exist.

Instruction reference: `AI_GUIDE.md`, `DEV_MANUAL.md` §5 (directives), §16 (endings).

## 3. Consolidated pitfall checklist (read before coding)

1. **safe-delete intercepts deletions** in this sandbox → set `optimizeDeps.disabled:true`
   (Vite pre-bundle tries to delete `.vite` and hangs) and `build.emptyOutDir:false`
   (`vite build` clearing `dist` is intercepted).
   **⚠️ DANGER — `git rm -r <subdir>` can cascade far beyond its arguments.** A 2026-09-04 run of
   `git rm -r src/game/story1 src/game/story2` wiped the **entire `src/` tree** from disk (not just
   the two dirs). The interceptor moves whole directories into the Recycle Bin.
   **Deletion protocol — ALWAYS do this:**
   - **Commit (or `git stash`) BEFORE deleting anything.** Uncommitted work in sibling files is
     NOT in `HEAD` and is otherwise unrecoverable from git.
   - Verify with `git status` after deleting; `D ` (staged) = intended, ` D` (worktree-only) =
     collateral damage.
   - **Recovery**: deleted dirs land in `E:\$Recycle.Bin\<SID>\` as `$Rxxxxxx` (content) +
     `$Ixxxxxx` (metadata). Find them by mtime (`ls -la | grep "Sep  4"`), then **copy** (not move)
     the contents back, skipping whatever you actually meant to delete. Recycle-Bin copies preserve
     uncommitted modifications; `git checkout` does NOT.
   - Never `git reset --hard` to "fix" this — it discards your uncommitted work.
2. **Story auto-discovery glob must be digit-suffixed**: `./story[0-9]*/story.ts`, NOT
   `./story*/story.ts`. The latter also matches `story-template/`, whose `story.ts` exports a valid
   `StoryDef` (「我的故事」), so the scaffold showed up as a playable game in the story picker.
   Symptom: an extra bogus entry in the story list. Verified fix by grepping the fresh build for
   「我的故事」 → must be 0 occurrences.
3. **CloudStudio URL port**: the preview port the user gives (e.g. 9000) often 404s at the gateway;
   the real ComfyUI port is usually **8188**. Always verify with `/system_stats` before acting.
4. **Cloud `/history/{pid}` single-id endpoint** frequently returns empty on this deployment —
   download via a **full `/history` prefix scan** (`download_by_prefix.py` pattern) instead.
5. **`placeholder.ts` MISSING_KEYS override** — clear keys after real PNGs land, or gradients persist.
6. **`loadAudio` 404 = throw** — never register an audio key without the file.
7. **Engine script = JSON instruction array** — split 5万字 of prose into many nodes; one node per
   beat.
8. **`comfy_pipeline.py --one` bug (fixed)**: use `elif "--bg" in args or one_name is not None:` so
   `--one <name>` alone only renders the single filtered background, not the full 30-task batch.
9. **Effects implemented**: `flash/shake/dim/zoom/petal/bokeh` drive the renderer (not stubs).
   `effect` instruction is wired; `advanceCharacterAnims` must be defined (a missing method crashes
   at the title screen).
10. **`dist/` accumulates stale builds** because `emptyOutDir:false`. When verifying a fix, always
    target the newest artifact (`ls -t dist/assets/*.js | head -1`) — grepping the whole `dist/`
    directory will match old bundles and give a false positive.

## 4. Asset pipeline quick start

- Prompts live in `<project>/story-wip/素材/09_缺失背景补全提示词.md` (pattern reference).
- Regenerate backgrounds: `python comfy_pipeline.py --url http://127.0.0.1:8188 --one <bg_name>`
  (bridge must be running). `build_bg_wf` supports optional `steps`/`cfg`/`neg` per job.
- For anti-"big color block" results: steps 8→16, add `intricate / individual petals / bark
  texture / structured clouds` to pos, and `flat color, solid color blocks, posterized, banding`
  to neg. For empty scenes (sprite overlay), add strong no-human negatives.
