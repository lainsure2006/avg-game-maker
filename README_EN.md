> 🌐 中文版： [README.md](README.md)

# avg-game-maker

A **user-level Skill for WorkBuddy** that turns WorkBuddy into an "AVG (Adventure / Visual Novel) game production partner." Through a strict **8-step pipeline** and human collaboration, it helps you ship a playable AVG game.

The engine is a standalone TS + Vite project called `avg-engine` (game content is auto-discovered from `src/game/storyN/` directories). This skill is not tied to any specific story — the method is universal.

---

## Directory Structure

```
avg-game-maker/
├── SKILL.md                # Main entry point: 8-step pipeline, role division, asset plan, red lines
├── references/             # 14 in-depth docs (one per step + G1/G2 specials + overview)
│   ├── pipeline-overview.md
│   ├── step1-story-design.md … step8-finalize.md
│   ├── g1-character-consistency.md   # Sprite consistency (side-view / variations / matting / head scale)
│   ├── g2-item-art.md                # Item art pipeline (perspective mapping / layout / verification)
│   ├── engine-conventions.md         # Engine pitfalls and conventions
│   └── engine-asset-catalog.md
├── scripts/                # 21 general-purpose Python tools (see below; desensitized & generalized)
├── companion-skills/       # 7 image-generation companion skills (desensitized; local paths → placeholders)
│   ├── qwen-standee/SKILL.md         # 【★Recommended / currently most stable】AutoDL + Qwen-Image-2.1 realistic sprites / character sheets
│   ├── krea2-persona-sheet/SKILL.md  # Character reference art / character sheets (Krea2)
│   ├── krea2-scene-sheet/SKILL.md    # Multi-angle reference images of the same scene
│   ├── krea2-local-inpaint/SKILL.md  # Local repaint (inpaint) after Krea2 generation
│   ├── sprite-matte-local/SKILL.md   # Local rembg matting → engine transparent sprites
│   ├── zimage-turbo-anime/SKILL.md   # z-image-turbo anime-style generation experience
│   └── comfy-cloud-mcp/SKILL.md      # Local bridge to call cloud ComfyUI
├── workflows/              # Image-generation workflows (local JSON + submit scripts, not cloud-side)
│   ├── comfyui-api-A10.json          # z-image-turbo text-to-image (story3 anime girl)
│   ├── krea2_charsheet_real.json     # Krea2 real-person character sheet
│   ├── krea2_charsheet_anime.json    # Krea2 + anime LoRA character sheet
│   ├── Krea2_Turbo_文生图_成功配置.json  # Krea2 full working config
│   ├── krea2_wf.json                 # Krea2EditRebalance image editing flow
│   ├── comfy_krea2_sheet.py          # Cloud submit script (character sheet)
│   ├── comfy_krea2_scene.py          # Cloud submit script (scene)
│   └── assetref_kit/                 # Scene reference tooling (dep of krea2-scene-sheet)
├── cloud-setup.md          # Cloud/local ComfyUI preparation checklist (models / nodes / deployment)
└── avg-engine-example/     # Engine + 2 clean story snapshots (story3 + story5(jianmo) + public assets, ~527MB)
```

> **Desensitization note**: In `SKILL.md` / `references/` / `companion-skills/` / `workflows/*.py`, all author-local paths
> (`E:\myprogram\...`, `C:\Users\Administrator\...`) have been uniformly replaced with `<avg-engine>` / `<project>` / `<home>` placeholders.
> **Model files and the author's cloud instances are NOT distributed with this package** — the models needed for image generation are listed in `cloud-setup.md` and must be supplied by the user.

---

## Installation

This skill uses the standard WorkBuddy skill format (`SKILL.md` + resource directories). Two ways to install:

1. **Manual placement (recommended)**: After cloning this repo, rename the folder to `avg-game-maker` and place it at:
   - Windows: `C:/Users/<you>/.workbuddy/skills/avg-game-maker/`
   - macOS/Linux: `~/.workbuddy/skills/avg-game-maker/`
   Restart WorkBuddy to activate.
2. **WorkBuddy import**: If your version supports importing skills from local disk or a marketplace, load this directory through the corresponding entry point.

---

## Companion Skills (bundled, no extra install needed)

During the "image generation" phase, `avg-game-maker` points to the following standalone skills, which are already placed in `companion-skills/` (desensitized). **`qwen-standee` (Qwen-Image-2.1) is currently the most stable recommendation; the other options are independent — pick based on your own cloud compute, model availability, and art-style needs.**

| Skill | Purpose | Path in package |
|---|---|---|
| `qwen-standee` | **【★Recommended / most stable】** AutoDL + Qwen-Image-2.1 realistic sprites: 4-view character sheet → bust → RMBG transparent cutout, with ArcFace numeric acceptance | `companion-skills/qwen-standee/SKILL.md` |
| `krea2-persona-sheet` | Character reference art / character sheets / single-character sprites (Krea2 path) | `companion-skills/krea2-persona-sheet/SKILL.md` |
| `krea2-scene-sheet` | Multi-angle reference images of the same scene (avoids scene drift) | `companion-skills/krea2-scene-sheet/SKILL.md` |
| `krea2-local-inpaint` | Local repaint (inpaint) loop after Krea2 generation | `companion-skills/krea2-local-inpaint/SKILL.md` |
| `sprite-matte-local` | Local rembg matting → engine transparent sprites (fallback when cloud RMBG unavailable) | `companion-skills/sprite-matte-local/SKILL.md` |
| `zimage-turbo-anime` | Three hard-earned lessons for z-image-turbo anime-style generation | `companion-skills/zimage-turbo-anime/SKILL.md` |
| `comfy-cloud-mcp` | Call cloud ComfyUI for generation / model queries via a local bridge | `companion-skills/comfy-cloud-mcp/SKILL.md` |

> ⚠️ **Companion skills are NOT bound to the author's cloud**: they only describe methods + workflows. **Model files, the ComfyUI service, and cloud instance addresses must be prepared by the user** — see `cloud-setup.md` for details. Cloud instance addresses are requested from the user at runtime and are not hard-coded into the package.

> Image-generation approaches are **not forced** to use the Krea2/ComfyUI options above — `SKILL.md` (from line 27) explicitly requires "confirm which image-generation approach to use before starting," then adapt once chosen.

---

## Image Workflows & Cloud Preparation (`workflows/` + `cloud-setup.md`)

- **Workflow JSON lives locally, not in the cloud**: `workflows/*.json` are ComfyUI API-format workflows, POSTed directly to `127.0.0.1:8188` (works with either a cloud bridge or local ComfyUI).
- **Submit scripts**: `workflows/comfy_krea2_sheet.py` (character sheet), `comfy_krea2_scene.py` (scene) — see each one's `--help`.
- **What the cloud/local side needs to prepare**: model checklist (Krea2 trio + z-image trio + LoRAs), custom nodes, sampling params, local ComfyUI deployment steps — all written in **`cloud-setup.md`**. Those without the author's cloud can self-provision per that file and get it running.

---

## Engine Example (`avg-engine-example/`)

This package ships a **clean snapshot of the engine + 2 complete stories** (excluding `node_modules/dist/.git`, build-verification junk, and intermediate image/diagnostic artifacts, ~527MB), so you can play and study out of the box:

- Engine: TS + Vite AVG engine (`index.html` / `src/engine` / `src/ui` / `src/game`)
- Stories: `src/game/story3` (campus Japanese-style *Sakura Colored Unfinished*《樱色未央》, 4 endings) + `src/game/story5` (suspense *Silent Corridor*《缄默回廊》/jianmo, multiple endings) — `story4` (*Fogport Echoes*《雾港回声》) is excluded (see `.gitignore`)
- Assets: `public/` (132 images + 23 audio wavs)

Run it (inside `avg-engine-example/`):
```bash
npm install      # first run needs deps (not bundled, requires network)
npm run dev      # then open http://localhost:3000 to play
# or: npm run build && drop dist/ onto any static host
```

> The engine auto-discovers `src/game/storyN/` directories — no need to edit `index.ts`. To add a new story, follow the "four-piece set" paradigm in `references/step6-game-authoring.md` and create a new `storyN/`.

---

## Path Placeholder Conventions

Meaning of placeholders used in docs and scripts:

| Placeholder | Meaning |
|---|---|
| `<avg-engine>` | Root of your avg-engine repo (TS+Vite engine) |
| `<project>` | Root of your working files (story drafts / scriptization / asset scripts) |
| `<project>/story-wip/素材/` | Directory for image-generation / health-check / viewer Python scripts |
| `<game>` | Current game codename (e.g. original project *Fogport Echoes*' instance value `fogport`) |
| `<story>` | Current story directory name (the N in engine `storyN`) |

---

## `scripts/` Script Index (21 general-purpose tools)

| Script | Purpose | Phase |
|---|---|---|
| `gen_asset_viewer.py` | Generate self-contained "asset viewer/reviewer page" (background/CG/sprite/evidence/audio tabs, missing items auto-flagged red) | Step 6.5 standard deliverable |
| `comfy_pipeline.py` | ComfyUI text-to-image pipeline driver (batch background generation) | Step 5 generation |
| `gen_l0_onepass.py` | Character L0 four-grid card (first real character asset) | S0/L0 |
| `download_by_prefix.py` | Scan cloud `/history` by prefix and batch-download outputs | Cloud generation |
| `gen_items.py` | Item-art base image text-to-image | G2 items |
| `item_texts.py` | Single source of truth for item overlaid text (verbatim from script) | G2 items |
| `item_art.py` | Item layout (coordinates / font / aging / perspective mapping) | G2 items |
| `persp.py` | Homography transform (perspective mapping) engine | G2 items |
| `verify_items.py` | Objective verification of item ink overflow | G2 items |
| `measure_quad.py` | Measure paper corners / tilt | G2 items |
| `probe_item.py` | Measure base-image geometry (bright area / grid) | G2 items |
| `demo_flat.py` | Perspective / front-shot placement difference demo | G2 items |
| `check_matte.py` | Sprite alpha health check (corners / border / transparent ratio) | G1 sprites |
| `matte_local.py` | Matting main program (auto-detect cyan/green/gray/light backgrounds) | G1 sprites |
| `make_matte_compare.py` | Triptych comparison (original / transparent / on dark bg) | G1 sprites |
| `gen_bust_cyan.py` | Batch cyan-screen sprite generation | G1 sprites |
| `measure_sprite_frame.py` | Measure sprite head scale (top%/bottom%/width%, prevents resize drift) | G1 sprites |
| `audit_script_health.py` | Script health check (HIDE-NO-SHOW / SHOW-TWICE / missing entrance) | Step 6 health |
| `audit_sprite_usage.py` | Reconcile (id,pose) used in script ↔ placed sprite | Step 6 health |
| `synth_se.py` | Pure-stdlib sound-effect WAV synthesis (no numpy dependency) | Step 5 audio |
| `gen_se.py` | Sound-effect generation entry point | Step 5 audio |

> **Instance-nature disclaimer**: `scripts/` originates from the actual production of *Fogport Echoes*. The algorithms are general, but default paths / sample data point to the original project (generalized to `<avg-engine>`/`<game>`/`<project>` placeholders). **Replace placeholders with your actual paths / game name before running**, or use each script's CLI args (`python <script> --help`). Among them, `gen_asset_viewer.py`, `comfy_pipeline.py`, `gen_l0_onepass.py`, `download_by_prefix.py`, and `gen_bust_cyan.py` are parameterized and ready to use directly.

> Three original-project instance scripts (`reconcile_assets.py`, `gen_pose_wiring.py`, `gen_side.py`) are **NOT included** because they are deeply coupled to *Fogport Echoes*' project structure (hard-coded `E:\myprogram`, depends on private in-project modules). Their methodology is fully documented in `references/g1-character-consistency.md`, `g2-item-art.md`, and the `krea2-persona-sheet` skill — adapt to your own project structure.

---

## 8-Step Pipeline at a Glance

Write story → Review (27 items) → Scriptize → Break down script + consolidate assets → Asset reconciliation → Author (four-piece set) → Test together → Completion judgment & delivery.

The engine auto-discovers `storyN/` directories; each needs 4 files: `story.ts` (default export) / `manifest.ts` / `script.ts` / `placeholder.ts`.

---

## License

Per the original project's convention: this skill is for learning and personal creation only. Respect the respective licenses of image-generation models and third-party services.
