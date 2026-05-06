# POE2

Client-only 2D top-down ARPG prototype.

## Project Layout

```text
POE2/
├─ webapp/        # React/Vite client app
├─ src/           # Client-side gameplay/runtime support modules and tools
├─ tests/         # Runtime, config, and WebApp boundary tests
├─ configs/       # Local static game configuration
├─ docs/          # Project documentation and workflows
├─ assets/        # Game and UI art assets
│  ├─ battle/     # Battle maps, units, and battle-scoped VFX
│  ├─ ui/         # Shared UI art
│  └─ raw/        # Source art files such as PSD/AI/Blend/large source images
├─ artifacts/     # Local verification output, ignored except placeholders
├─ scripts/       # Build and asset-processing scripts
├─ tools/         # Local validation and development utilities
└─ openspec/      # Change proposals and specs
```

Generated build outputs such as `dist/`, `dist-webapp/`, and `dist-map-editor/` are local artifacts and should not be committed.
