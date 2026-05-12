## Context

当前仓库已经存在 `webapp/proceduralMapGeneration.ts`、`scripts/generate-procedural-map-json.mjs`、`map/procedural_map_v1.json` 和 `tests/test_procedural_map_generation_v1.py`。这条链路证明了客户端可以生成并验证 MapEditor JSON，但当前实现仍然偏向固定布局预览：房间位置基本固定，seed 主要提供 jitter，拓扑、房间数量、通道形态和 debug 输出都不足以覆盖 V1 指令。

本项目是 client-only 项目。程序化地图生成不得调用后端 API、服务端 runtime 或任何 server-generated gameplay behavior。`map_001.json` 只能作为规格参考，不能作为布局模板。地图仍然是 2D top-down，圆形区域或可视化不得被投影压扁。

## Goals / Non-Goals

**Goals:**

- 将现有生成器修改升级为完整 V1，而不是删除现有生成链路。
- 生成兼容 `poe.tilemap.editor` 的 JSON：`format`、`version`、`name`、`savedAt`、`tiles`、`cellSize`、`spawn`、`colliders`、`zones`、`width`、`height`。
- 固定地图规格为 `256 x 144`、`cellSize = 96`，tile 只允许 `empty`、`ground`、`wall`。
- 支持 seeded random，保证同一 seed + 同一配置输出完全一致。
- 支持 `hub_spoke`、`main_path_branches`、`loop_with_branches` 三种 topology preset。
- 生成入口、普通房间、大房间、死胡同、Boss 房和通道，并满足数量、连通性、spawn、wall/collider、debug 文案和测试要求。
- 保留现有 `map_001.json` 加载能力，并保留脚本生成 `map/procedural_map_v1.json` 的 MapEditor 审阅路径。

**Non-Goals:**

- 不新增后端、API、服务端运行时或服务端地图生成行为。
- 不重写 MapEditor、tile 渲染、角色移动、碰撞系统、战斗系统、技能系统、宝石系统、掉落系统。
- 不新增地图词缀、宝箱奖励逻辑、怪物波次逻辑或地图事件系统。
- 不使用 skill editor 作为验证面，不访问 `/skill-editor`、`?skill_editor=1`、`view=skill_editor`、端口 `8765` 或 `dist-skill-editor`。
- 不把程序化生成逻辑堆入 `webapp/App.tsx`。

## Decisions

### 1. 修改现有生成器，而不是删除重建

保留现有入口名称和脚本兼容性，降低对测试、生成脚本和 MapEditor 预览链路的破坏。实现上可以把 `webapp/proceduralMapGeneration.ts` 变成 facade，内部委托到 `webapp/mapGeneration/` 的 focused modules。

替代方案是删除旧文件并重新命名全部入口，但这会制造大量无关 diff，也会让既有测试和脚本失去连续性。

### 2. 新建 focused owner：`webapp/mapGeneration/`

建议模块边界：

```text
webapp/mapGeneration/
  mapGenerationTypes.ts
  mapGenerationConfig.ts
  seededRandom.ts
  topologyGenerator.ts
  roomLayoutGenerator.ts
  corridorGenerator.ts
  tileMapCarver.ts
  zoneBuilder.ts
  mapValidation.ts
  generatedMapDebug.ts
  generateProceduralEditorMap.ts
```

`webapp/proceduralMapGeneration.ts` 保留为兼容入口，导出旧测试/脚本仍需要的函数，同时新增或转发 `generateProceduralEditorMap`、`validateGeneratedMap` 等 V1 命名入口。

### 3. 生成流程使用 graph-first，而不是随机铺 tile

流程：

```text
seed/config
  -> topology preset
  -> room graph
  -> rectangle room layout
  -> corridor paths
  -> tile carve
  -> wall fill
  -> zones/spawn
  -> validation/debugText
  -> GeneratedMapResult
```

拓扑生成只负责图结构和房间类型约束。布局生成负责坐标、尺寸、间距、边界。通道生成负责连接房间 ground，不重新决定 gameplay 目标或战斗逻辑。tile carving 只将 graph/layout 结果转成 editor tiles。

### 4. 校验同时覆盖 graph 和 tile

Graph 校验用于 degree、入口到 Boss 可达、Boss 不直连入口、deadEnd 叶节点、largeRoom degree。Tile 校验用于格式、尺寸、tile 合法性、ground flood fill、spawn ground、zone center walkable、collider 语义。

`validateGeneratedMap(map)` 是对外校验入口；如果实现需要 graph 级校验，可在内部使用额外 helper，但测试应证明最终生成结果的 runtime-visible 行为。

### 5. Debug 文案和用户可见文本全部中文

`debugText` 由 `generatedMapDebug.ts` 统一生成，包含 seed、拓扑类型中文名、地图尺寸、房间统计、通道数量、连通性、入口到 Boss、Boss 连接数、死胡同规则、校验结果。错误信息、控制台可见失败原因和 UI/debug 文案使用中文。

### 6. App.tsx role

如果需要把程序化地图接入可切换 WebApp 地图入口，`webapp/App.tsx` 只允许做以下 wiring：

- 导入 focused module 暴露的生成器或 generated map template。
- 将程序化地图作为一个可选择 map template 传给既有 map loading/runtime adapter。
- 传递 seed/topology/debug 开关对应的已有或 focused owner state。

不允许在 `webapp/App.tsx` 中放 feature UI 结构、生成状态、生成规则、校验规则、debug 文案、数据转换或 topology 分支。

## Risks / Trade-offs

- 生成器一次性升级范围较大 -> 通过 focused modules 分层实现，并保留旧 facade 入口以减少调用侧 churn。
- 布局 retry 可能出现少量 seed 难以满足所有约束 -> 使用 bounded deterministic retry，并在失败时返回中文错误和 debugText；测试固定多个 seed 覆盖三种 preset。
- `dead_end` zoneType 可能与旧 editor/runtime 类型存在兼容差异 -> 先复用当前已支持的 `dead_end` 类型；如发现加载器不支持，则降级为 `main_room` + `tags: ["dead_end"]`，但 debug 仍显示“死胡同”。
- 新的可切换加载入口可能扩大 App wiring diff -> 优先在 map template/owner 模块承载选择和文案；App 只做导入和传参。
- 前端视觉验证成本高 -> 使用项目根目录 `run.bat` 启动实际 WebApp，截图保存到 `artifacts/screenshots/`，并说明截图中可见的程序化地图/调试信息。
