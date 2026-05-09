# procedural-monster-spawn-v1 Specification

## Purpose
TBD - created by archiving change add-procedural-monster-spawn-v1. Update Purpose after archive.
## Requirements
### Requirement: 基于现有地图数据生成区域类型
系统 SHALL 在地图生成或地图运行时加载完成后，基于现有 tilemap、可行走网格、阻挡网格、玩家出生点、Boss 点和出口点生成刷怪用 `zone_type`，不得要求重做 tilemap 数据结构或地图编辑器保存格式。

#### Scenario: 入口区域被标记且不刷怪
- **WHEN** 地图包含玩家出生点
- **THEN** 系统 SHALL 将出生点附近区域标记为 `entrance`
- **AND** 系统 SHALL 默认不在 `entrance` 区域生成怪物包

#### Scenario: 必需区域类型可用
- **WHEN** 地图存在可行走区域和 Boss 点
- **THEN** 系统 SHALL 至少输出 `entrance`、`corridor`、`main_room`、`large_room`、`boss_room` 中可识别的区域类型
- **AND** 系统 SHALL 为 `dead_end` 与 `exit_area` 保留配置字段，不得用不可靠判断强行生成复杂规则

### Requirement: 生怪配置驱动
系统 SHALL 使用配置定义地图生怪 profile、怪物包和怪物稀有度规则，并 SHALL 复用现有怪物定义或现有前端怪物视觉类型。

#### Scenario: 配置包含地图生怪 profile
- **WHEN** 系统加载 V1 生怪配置
- **THEN** 配置 SHALL 包含 `map_spawn_profiles`
- **AND** 每个 profile SHALL 包含 `map_type`、`base_pack_budget`、`min_distance_from_player_spawn`、`min_distance_between_packs`、`max_active_packs` 和 `zone_rules`

#### Scenario: 配置包含怪物包
- **WHEN** 系统加载 V1 生怪配置
- **THEN** 配置 SHALL 包含 `monster_packs`
- **AND** 每个怪物包 SHALL 包含 `pack_id`、`tags`、`weight`、`budget_cost` 和 monster entries

#### Scenario: 配置包含稀有度规则
- **WHEN** 系统加载 V1 生怪配置
- **THEN** 配置 SHALL 包含 `monster_rarity_rules`
- **AND** 稀有度规则 SHALL 包含 `normal_weight`、`magic_weight`、`rare_weight`、`max_rare_per_map`、`max_magic_packs_per_map`、`magic_allowed_zone_types` 和 `rare_allowed_zone_types`

### Requirement: 刷怪点过滤规则
系统 SHALL 在实例化怪物前过滤不合法刷怪点，过滤判断 SHALL 使用现有地图可行走和阻挡信息。

#### Scenario: 玩家出生点附近不刷怪
- **WHEN** 候选刷怪点距离玩家出生点小于 `min_distance_from_player_spawn`
- **THEN** 系统 SHALL 拒绝该候选点
- **AND** 调试信息 SHALL 记录中文原因“距离玩家出生点过近”

#### Scenario: 阻挡格不刷怪
- **WHEN** 候选刷怪点位于阻挡格
- **THEN** 系统 SHALL 拒绝该候选点
- **AND** 调试信息 SHALL 记录中文原因“阻挡格”

#### Scenario: 不可行走区域不刷怪
- **WHEN** 候选刷怪点不在可行走区域
- **THEN** 系统 SHALL 拒绝该候选点
- **AND** 调试信息 SHALL 记录中文原因“不可行走”

#### Scenario: 怪物包距离不能过近
- **WHEN** 候选刷怪点与已接受怪物包中心距离小于 `min_distance_between_packs`
- **THEN** 系统 SHALL 拒绝该候选点
- **AND** 调试信息 SHALL 记录中文原因“怪物包距离过近”

### Requirement: 按区域生成怪物包
系统 SHALL 根据 `zone_type` 和 `zone_rules` 抽取怪物包，并 SHALL 以怪物包为单位生成怪物实例，而不是只生成单个怪物。

#### Scenario: 通道只生成小包怪
- **WHEN** 候选刷怪点的 `zone_type` 为 `corridor`
- **THEN** 系统 SHALL 只允许匹配小包规则的 `monster_pack`

#### Scenario: 大房间允许高密度怪物包
- **WHEN** 候选刷怪点的 `zone_type` 为 `large_room`
- **THEN** 系统 SHALL 允许匹配高密度规则的 `monster_pack`

#### Scenario: Boss 房固定生成 Boss
- **WHEN** 地图存在 `boss_room`
- **THEN** 系统 SHALL 在 `boss_room` 生成固定 Boss
- **AND** 系统 MAY 按配置生成少量随从

### Requirement: 生怪预算限制
系统 SHALL 使用 `base_pack_budget` 限制总怪物包预算，并 SHALL 防止无限生成。

#### Scenario: 总预算不超过配置
- **WHEN** 系统生成整张地图的怪物包
- **THEN** 已接受怪物包的 `budget_cost` 总和 SHALL 小于或等于 `base_pack_budget`

#### Scenario: 预算不足时记录过滤原因
- **WHEN** 候选怪物包会导致预算超过 `base_pack_budget`
- **THEN** 系统 SHALL 拒绝该怪物包
- **AND** 调试信息 SHALL 记录中文原因“预算不足”

### Requirement: V1 怪物稀有度升级
系统 SHALL 支持 `normal`、`magic`、`rare` 三种运行时稀有度，并 SHALL 使用简单倍率调整怪物生命和伤害。

#### Scenario: 魔法怪使用 V1 倍率
- **WHEN** 怪物实例被升级为 `magic`
- **THEN** 系统 SHALL 使用 `life_multiplier = 1.5`
- **AND** 系统 SHALL 使用 `damage_multiplier = 1.2`
- **AND** 调试或显示文本 SHALL 使用中文“魔法”

#### Scenario: 稀有怪使用 V1 倍率并受上限限制
- **WHEN** 怪物实例被升级为 `rare`
- **THEN** 系统 SHALL 使用 `life_multiplier = 2.5`
- **AND** 系统 SHALL 使用 `damage_multiplier = 1.5`
- **AND** 整张地图的稀有怪数量 SHALL 小于或等于 `max_rare_per_map`
- **AND** 调试或显示文本 SHALL 使用中文“稀有”

#### Scenario: 大房间可以出现魔法怪
- **WHEN** `large_room` 在 `magic_allowed_zone_types` 中
- **THEN** 系统 SHALL 允许 `large_room` 生成 `magic` 怪物或魔法怪物包

### Requirement: 保持现有掉落链路
系统 SHALL 保持怪物死亡后继续走现有掉落逻辑，不得修改掉落公式本身。

#### Scenario: 生成怪物死亡触发现有掉落
- **WHEN** 程序化生成的怪物被纳入现有战斗会话并被击杀
- **THEN** 系统 SHALL 通过现有怪物死亡流程生成掉落
- **AND** 系统 SHALL 继续使用现有掉落池和掉落权重

### Requirement: 中文调试输出
系统 SHALL 提供中文调试输出或轻量调试面板，用于审阅程序化生怪结果。

#### Scenario: 调试汇总包含核心统计
- **WHEN** 程序化生怪完成
- **THEN** 调试输出 SHALL 包含当前地图类型、总生怪预算、已生成怪物包数量、已生成普通怪数量、已生成魔法怪数量和已生成稀有怪数量

#### Scenario: 调试明细包含刷怪点结果
- **WHEN** 程序化生怪完成
- **THEN** 调试输出 SHALL 包含每个刷怪点的 `zone_type`
- **AND** 调试输出 SHALL 包含每个刷怪点生成的 `monster_pack_id`
- **AND** 调试输出 SHALL 包含被过滤掉的刷怪点中文原因

### Requirement: 兼容地图编辑器和现有运行时
系统 SHALL 保持地图编辑器的 tile 选择、放置、保存、加载和核心交互兼容，并 SHALL 保留现有 authored spawn fallback。

#### Scenario: 地图编辑器保存格式不变
- **WHEN** 用户在地图编辑器中保存地图
- **THEN** 系统 SHALL 保持现有 `tiles`、`spawn`、`colliders` 和 `spawnPlans` 保存格式兼容

#### Scenario: 程序化生怪无结果时回退
- **WHEN** 程序化生怪没有生成可用怪物
- **THEN** 系统 SHALL 保留现有手工怪点或 fallback 生怪路径

### Requirement: Spawn output includes monster taxonomy
The procedural spawn runtime SHALL emit monster rarity and monster type for every generated monster instance.

#### Scenario: Generated monster has taxonomy fields
- **WHEN** procedural spawn creates a monster instance
- **THEN** the instance SHALL include `spawn_rarity`
- **AND** the instance SHALL include `monster_type`

#### Scenario: Spawn debug includes new rarity counts
- **WHEN** procedural spawn completes
- **THEN** debug summary SHALL separately count `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss` monsters

#### Scenario: Spawn debug includes type counts
- **WHEN** procedural spawn completes
- **THEN** debug summary SHALL include counts for `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, and `support`

### Requirement: Spawn rarity and boss pool boundaries
The procedural spawn runtime SHALL allow base monsters to cross non-boss rarities and SHALL restrict nemesis rarities to boss definitions.

#### Scenario: Base monster can become rare
- **WHEN** rarity rules upgrade a base monster instance
- **THEN** that monster MAY receive `spawn_rarity = "magic"` or `spawn_rarity = "rare"`
- **AND** its base visual identity SHALL remain unchanged

#### Scenario: Legendary boss uses boss pool
- **WHEN** a `legendary_boss` is generated
- **THEN** the selected monster SHALL come from a boss monster pool

#### Scenario: Supreme boss uses boss pool
- **WHEN** a `supreme_boss` is generated
- **THEN** the selected monster SHALL come from a boss monster pool

#### Scenario: Boss room can choose legendary or supreme
- **WHEN** a boss room spawn rule is evaluated
- **THEN** the rule SHALL be able to select either `legendary_boss` or `supreme_boss` according to configuration

### Requirement: Spawn config supports type defaults
The spawn configuration SHALL support monster type defaults used by procedural instantiation.

#### Scenario: Type defaults are loaded
- **WHEN** V1 spawn config is loaded
- **THEN** it SHALL provide defaults for each supported `monster_type`

#### Scenario: Type defaults affect instantiated stats
- **WHEN** a monster instance is created
- **THEN** its life, damage, movement speed, attack range, attack cadence, and skill-shape defaults SHALL account for its `monster_type`
- **AND** per-monster and pack overrides SHALL still be able to override specific values

### Requirement: Procedural spawn runtime is frontend-owned for play
Playable map zone analysis, spawn filtering, monster pack selection, rarity selection, and monster instantiation SHALL execute in frontend code.

#### Scenario: Frontend generates playable spawns
- **WHEN** the player starts or enters a playable map
- **THEN** the frontend runtime SHALL derive zone types, filter spawn points, select monster packs, apply rarity rules, instantiate monsters, and expose Chinese debug output without backend spawn services

#### Scenario: Spawn effects are preserved
- **WHEN** the same map data, spawn profile, monster pack data, rarity rules, random seed, and player spawn are evaluated before and after migration
- **THEN** accepted spawn points, rejected spawn reasons, pack budget use, pack identities, monster counts, rarity upgrades, boss placement, and fallback behavior SHALL remain equivalent

### Requirement: Map runtime data is frontend-owned
Playable map dimensions, tile data, walkability, blockers, collision, spawn points, boss points, exits, authored spawn plans, and procedural spawn profiles SHALL be available to the frontend without backend runtime services.

#### Scenario: Frontend resolves map traversal and spawn constraints
- **WHEN** the playable WebApp evaluates movement, collision, zone types, or spawn legality
- **THEN** it SHALL use frontend-owned map data and SHALL NOT call backend map runtime APIs

#### Scenario: Existing map editor compatibility remains
- **WHEN** existing map/editor data is migrated or loaded for play
- **THEN** tile format, spawn format, collider format, authored spawn fallback, and visible map behavior SHALL remain compatible with existing authored content

### Requirement: Spawn generation consumes finalized map instance
Procedural monster spawning SHALL consume the finalized map instance created for the current playable map run, including transformed player spawn, zones, walkable grid, blocker grid, boss points, and exit points.

#### Scenario: Filter distance from transformed player spawn
- **WHEN** a map instance chooses a player spawn region and applies a supported rotation
- **THEN** procedural monster spawn filtering SHALL measure `min_distance_from_player_spawn` from the transformed player spawn
- **AND** monsters SHALL NOT be accepted in the transformed entrance area near that spawn

#### Scenario: Place packs inside transformed zones
- **WHEN** procedural spawning classifies or reads authored zones from a rotated map instance
- **THEN** monster pack centers SHALL be chosen from the transformed zone geometry
- **AND** pack members SHALL be placed on transformed walkable, unblocked cells

#### Scenario: Vary pack centers per run
- **WHEN** the same map template and monster pack config are used in separate normal runs
- **THEN** procedural spawning SHALL be able to choose different accepted pack centers from eligible transformed zones
- **AND** monsters in a chosen pack SHALL be able to occupy different valid points around the pack center

#### Scenario: Debug output identifies instance-aligned spawns
- **WHEN** procedural spawning completes for a map instance
- **THEN** debug output SHALL describe spawn points using the finalized map instance coordinates
- **AND** debug output SHALL include the selected `zone_type` and `monster_pack_id` for accepted points as before

