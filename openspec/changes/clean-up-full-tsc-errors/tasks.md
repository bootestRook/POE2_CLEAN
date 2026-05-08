## 1. Baseline And Scope

- [x] 1.1 Run `npx tsc --noEmit --pretty false` from the repository root and capture the current diagnostic clusters without writing logs to the repository root.
- [x] 1.2 Confirm the cleanup stays on its own change branch/scope and does not mix into App module extraction tasks.
- [x] 1.3 Identify all files in the first diagnostic set and group them by owner area before editing.

## 2. Static Data And Preview Typing

- [x] 2.1 Fix readonly static seed data assignments so mutable App state receives explicit cloned or adapted values.
- [x] 2.2 Fix `SkillPreview` typing for source context, base damage, cooldown, damage components, trigger interval, gem identity, and level values without broad casts.
- [x] 2.3 Fix static gem and character panel data typing so generated/config data can be consumed safely by existing UI models.

## 3. Runtime View Model Typing

- [x] 3.1 Fix battle map nullability and map data shape errors without changing map runtime behavior.
- [x] 3.2 Fix battle VFX/view model adapter typing for damage zones, area novas, melee arcs, chain segments, secondary hit config, and floating text.
- [x] 3.3 Fix monster skill metadata typing for trigger and hit marker fields without changing monster attack behavior.
- [x] 3.4 Fix `battleGeometryRenderer.ts` skill-key narrowing errors without changing rendered projectile or hit visuals.

## 4. Helper Runtime Typing

- [x] 4.1 Fix `frontendEquipmentRuntime.ts` generic stat mutation typing without weakening generic safety.
- [x] 4.2 Fix `mapSpawnRuntime.ts` undefined pack and monster-type index errors without changing spawn selection behavior.
- [x] 4.3 Fix numeric aggregation, unknown payload, and optional array errors using focused guards or helper functions.

## 5. Disabled Skill Editor Surface

- [x] 5.1 Fix nullable disabled skill-editor-only state errors in `webapp/App.tsx` without launching or using the skill editor.
- [x] 5.2 Keep skill-editor fixes limited to type/null safety and avoid changing playable WebApp behavior.

## 6. Final Verification

- [x] 6.1 Run `npx tsc --noEmit --pretty false` and confirm it exits successfully.
- [x] 6.2 Run `npm test` and confirm it exits successfully.
- [x] 6.3 Run `npm run build` and confirm it exits successfully.
- [x] 6.4 Launch the playable WebApp through the project `run.bat` flow, capture a screenshot under `artifacts/screenshots/`, and describe the rendered result.
- [x] 6.5 Run repository hygiene checks or manually confirm no screenshots, logs, or generated evidence were written to the repository root.
