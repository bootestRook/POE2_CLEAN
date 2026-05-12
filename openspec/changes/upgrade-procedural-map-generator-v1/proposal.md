## Why

现有程序化地图生成器已经能生成 MapEditor 预览 JSON，但它本质上是固定布局加 seed 抖动，尚未满足 V1 指令要求的“锁规格，不锁设计”。现在需要在保留现有地图格式、加载链路和客户端-only 边界的前提下，将它升级为可配置、可复现、可测试、支持多拓扑的完整 V1 生成器。

## What Changes

- 修改现有 `webapp/proceduralMapGeneration.ts`，从固定房间坐标生成升级为 seeded graph -> room layout -> corridor -> tile carve -> zone -> validation 的生成流程。
- 新增或拆分 focused map generation 模块，承载类型、配置、seeded random、拓扑生成、房间布局、通道生成、tile carving、zone 构建、校验和中文 debug 文案。
- 支持 3 种 topology preset：`hub_spoke`、`main_path_branches`、`loop_with_branches`，并允许调用方显式指定；未指定时由 seed 决定。
- 输出继续兼容 `poe.tilemap.editor` JSON 格式，尺寸固定为 `256 x 144`，`cellSize` 固定为 `96`，tile 类型只允许 `empty`、`ground`、`wall`。
- 保留 `map_001.json` 加载能力，只把它作为规格参考，不照抄布局、通道或拓扑。
- 将现有 smoke tests 升级为 V1 行为测试：seed 稳定性、格式合法性、房间数量范围、三种 topology、ground 连通、入口到 Boss 可达、spawn 合法、中文 debug。
- 更新旧 spec 中“仅 MapEditor 预览、暂不注册 playable template”的阶段性限制，使其与新的 V1 接入口径一致。
- 不新增后台、API、服务端 runtime、地图词缀、宝箱奖励、怪物波次或地图事件系统。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `procedural-map-generation-v1`：将既有 MapEditor 预览型程序化地图生成要求升级为完整 V1 程序化地图生成、校验、中文 debug、测试和可切换加载接入要求。

## Impact

- 主要影响 `webapp/proceduralMapGeneration.ts` 及可能新增的 `webapp/mapGeneration/` focused 模块。
- 可能影响 `scripts/generate-procedural-map-json.mjs`、`tests/test_procedural_map_generation_v1.py`、`map/procedural_map_v1.json` 和地图加载/选择相关的前端 wiring。
- `webapp/App.tsx` 如需变更，只允许做入口 wiring：导入 focused 生成器结果、传递 map template 或切换状态；不得承载生成逻辑、校验规则、debug 文案或数据转换。
- 前端验证必须通过项目根目录 `run.bat` 打开的 WebApp 实际视图完成，并在 `artifacts/screenshots/` 保存截图证据。
