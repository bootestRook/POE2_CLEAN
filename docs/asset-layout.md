# Asset and Generated File Layout

This repository uses `assets/` as the only root-level game asset directory.
Do not recreate the legacy misspelled asset root.

## Runtime Assets

- `assets/battle/maps/<map_id>/`
  Baked battle map images, masks, and `map_meta.json`.
- `assets/battle/units/sheets/`
  Runtime unit animation sprite sheets imported by the web app.
- `assets/battle/units/manifests/`
  Runtime unit animation manifests. Manifests should point to sheet assets only.
- `assets/battle/vfx/<skill_id>/`
  Runtime skill VFX sprite sheets and VFX manifests.
- `assets/ui/`
  Shared UI art used across WebApp screens.
- `assets/raw/`
  Source art files such as PSD, AI, Blender, Aseprite, or large unprocessed source images.
- `webapp/assets/`
  Web-app-only UI images referenced directly by CSS or React code.

## Generated Outputs

- `dist/`
  Vite build output. Do not commit generated bundles.
- `dist-webapp/` and `dist-map-editor/`
  Packaged local build outputs. Do not commit generated bundles.
- `artifacts/logs/`
  Local run logs. Do not put logs in the repo root.
- `artifacts/screenshots/`
  Browser screenshots and visual verification captures.
- `artifacts/generated/`
  Task-specific generated evidence that should stay out of the repo root.
- `reports/`
  Human-readable analysis reports.
- `tmp/`
  Scratch files and throwaway generation intermediates.

## Hygiene Checks

Run this before committing asset or root-layout changes:

```powershell
npm run check:hygiene
```

The check rejects:

- The legacy misspelled root-level asset directory.
- Root-level `.log` or `.err.log` files.
- Unexpected new files in the repository root.
- Legacy asset-root references in project text files.
