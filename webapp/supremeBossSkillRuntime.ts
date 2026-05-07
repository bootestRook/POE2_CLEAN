export type SupremeBossSkillPhase = {
  id: string;
  label: string;
  time_ms: number;
};

export type SupremeBossSkillDefinition = {
  id: string;
  display_name: string;
  boss_id: string;
  cooldown_ms: number;
  initial_cooldown_ms: number;
  cast_duration_ms: number;
  damage_scale: string;
  vfx_profile: string;
  debug_labels: string[];
  params: Record<string, unknown>;
  phases: SupremeBossSkillPhase[];
};

export type SupremeBossSkillConfig = {
  version: number;
  skills: SupremeBossSkillDefinition[];
};

export type SupremeBossRuntimeEvent = {
  event_id: string;
  type: string;
  timestamp_ms: number;
  source_entity: string;
  target_entity: string;
  position: { x: number; y: number };
  direction: { x: number; y: number };
  delay_ms: number;
  duration_ms: number;
  amount: number | null;
  damage_type: string;
  skill_instance_id: string;
  vfx_key: string;
  sfx_key: string;
  reason_key: string;
  payload: Record<string, unknown>;
};

export type SupremeBossBuildContext = {
  boss: {
    id: number;
    x: number;
    y: number;
    monsterId?: string;
    damageType?: string;
  };
  player: { x: number; y: number };
  arena: { width: number; height: number };
  castStartMs: number;
  sequence: number;
};

export type SupremeBossTimelineSummary = {
  skill_id: string;
  display_name: string;
  cast_duration_ms: number;
  projectile_count: number;
  damage_zone_count: number;
  warning_count: number;
  first_warning_ms: number;
  first_damage_ms: number;
  completed: boolean;
  residual_after_end: number;
  max_reflect_count: number;
  has_safe_route: boolean;
  invulnerable_window_ms: number;
};

const SUPREME_BOSS_DAMAGE_MULTIPLIERS: Record<string, number> = {
  low_per_bullet: 0.42,
  medium: 0.82,
  medium_high: 1.02,
  high: 1.22,
  very_high: 1.65,
  final_boss: 1.65
};

export function normalizeSupremeBossSkillConfig(raw: unknown): SupremeBossSkillConfig {
  const config = raw && typeof raw === "object" ? raw as Partial<SupremeBossSkillConfig> : {};
  return {
    version: Number(config.version ?? 1),
    skills: Array.isArray(config.skills) ? config.skills.map(normalizeSupremeBossSkill) : []
  };
}

export function validateSupremeBossSkillConfig(config: SupremeBossSkillConfig) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const bossIds = new Set<string>();
  if (config.version !== 1) errors.push("至高首领技能配置版本必须为 1");
  if (config.skills.length !== 6) errors.push("必须配置 6 个至高首领技能");
  for (const skill of config.skills) {
    if (!skill.id) errors.push("至高首领技能缺少 ID");
    if (ids.has(skill.id)) errors.push(`至高首领技能 ID 重复：${skill.id}`);
    ids.add(skill.id);
    if (!/^supreme_/.test(skill.id)) errors.push(`至高首领技能 ID 必须以 supreme_ 开头：${skill.id}`);
    if (!hasChineseText(skill.display_name)) errors.push(`技能名必须为中文：${skill.id}`);
    if (!/^mon_50000[1-6]$/.test(skill.boss_id)) errors.push(`技能必须绑定 6 个至高首领之一：${skill.id}`);
    if (bossIds.has(skill.boss_id)) errors.push(`至高首领重复绑定技能：${skill.boss_id}`);
    bossIds.add(skill.boss_id);
    if (!finitePositive(skill.cooldown_ms)) errors.push(`冷却必须为正数：${skill.id}`);
    if (!finitePositive(skill.initial_cooldown_ms)) errors.push(`初始冷却必须为正数：${skill.id}`);
    if (!finitePositive(skill.cast_duration_ms)) errors.push(`施法时长必须为正数：${skill.id}`);
    if (!Array.isArray(skill.phases) || skill.phases.length < 4) errors.push(`时间轴阶段不足：${skill.id}`);
    for (const phase of skill.phases) {
      if (!hasChineseText(phase.label)) errors.push(`阶段标签必须为中文：${skill.id}/${phase.id}`);
      if (!Number.isFinite(Number(phase.time_ms)) || Number(phase.time_ms) < 0 || Number(phase.time_ms) > skill.cast_duration_ms) {
        errors.push(`阶段时间超出技能时长：${skill.id}/${phase.id}`);
      }
    }
    for (const label of skill.debug_labels) {
      if (!hasChineseText(label)) errors.push(`debug 标签必须为中文：${skill.id}/${label}`);
    }
  }
  return errors;
}

export function supremeBossSkillForMonster(config: SupremeBossSkillConfig, monsterId: string | undefined) {
  if (!monsterId) return null;
  return config.skills.find((skill) => skill.boss_id === monsterId) ?? null;
}

export function simulateSupremeBossSkillTimeline(skill: SupremeBossSkillDefinition): SupremeBossTimelineSummary {
  const events = buildSupremeBossSkillEvents(skill, {
    boss: { id: 1, x: 640, y: 420, monsterId: skill.boss_id, damageType: "lightning" },
    player: { x: 700, y: 480 },
    arena: { width: 1280, height: 840 },
    castStartMs: 1000,
    sequence: 0
  });
  const projectileEvents = events.filter((event) => event.type === "projectile_spawn");
  const damageEvents = events.filter((event) => event.type === "damage_zone");
  const warningEvents = events.filter((event) => event.type === "damage_zone_prime" || event.reason_key.includes("warning"));
  const firstWarningMs = Math.min(...warningEvents.map((event) => event.delay_ms));
  const firstDamageMs = Math.min(...[
    ...projectileEvents.map((event) => event.delay_ms),
    ...damageEvents.map((event) => event.delay_ms)
  ]);
  return {
    skill_id: skill.id,
    display_name: skill.display_name,
    cast_duration_ms: skill.cast_duration_ms,
    projectile_count: projectileEvents.length,
    damage_zone_count: damageEvents.length,
    warning_count: warningEvents.length,
    first_warning_ms: Number.isFinite(firstWarningMs) ? firstWarningMs : 0,
    first_damage_ms: Number.isFinite(firstDamageMs) ? firstDamageMs : 0,
    completed: events.every((event) => event.delay_ms <= skill.cast_duration_ms),
    residual_after_end: events.filter((event) => event.delay_ms > skill.cast_duration_ms).length,
    max_reflect_count: Math.max(0, ...events.map((event) => Number(event.payload.reflect_count ?? 0))),
    has_safe_route: skill.id === "supreme_star_arbiter_sudoku_orbit" ? sudokuOrbitHasSafeRoute(skill) : true,
    invulnerable_window_ms: skill.id === "supreme_final_converger_all_returns_zero" ? skill.cast_duration_ms : 0
  };
}

export function buildSupremeBossSkillEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext): SupremeBossRuntimeEvent[] {
  switch (skill.id) {
    case "supreme_star_arbiter_sudoku_orbit":
      return buildSudokuOrbitEvents(skill, context);
    case "supreme_duality_judge_polarity_rings":
      return buildPolarityRingEvents(skill, context);
    case "supreme_insect_empress_thousand_needles":
      return buildThousandNeedleEvents(skill, context);
    case "supreme_thunder_machine_kaleidoscope":
      return buildThunderKaleidoscopeEvents(skill, context);
    case "supreme_void_crown_closing_flower":
      return buildClosingFlowerEvents(skill, context);
    case "supreme_final_converger_all_returns_zero":
      return buildAllReturnsZeroEvents(skill, context);
    default:
      return [];
  }
}

export function supremeBossDamageMultiplier(skill: SupremeBossSkillDefinition) {
  return SUPREME_BOSS_DAMAGE_MULTIPLIERS[skill.damage_scale] ?? 0.82;
}

export function supremeBossSkillIds(config: SupremeBossSkillConfig) {
  return config.skills.map((skill) => skill.id);
}

function normalizeSupremeBossSkill(value: unknown): SupremeBossSkillDefinition {
  const source = value && typeof value === "object" ? value as Partial<SupremeBossSkillDefinition> : {};
  return {
    id: String(source.id ?? ""),
    display_name: String(source.display_name ?? ""),
    boss_id: String(source.boss_id ?? ""),
    cooldown_ms: Math.max(1, Number(source.cooldown_ms ?? 1)),
    initial_cooldown_ms: Math.max(1, Number(source.initial_cooldown_ms ?? 1)),
    cast_duration_ms: Math.max(1, Number(source.cast_duration_ms ?? 1)),
    damage_scale: String(source.damage_scale ?? "medium"),
    vfx_profile: String(source.vfx_profile ?? "supreme_boss_skill"),
    debug_labels: Array.isArray(source.debug_labels) ? source.debug_labels.map(String) : [],
    params: source.params && typeof source.params === "object" && !Array.isArray(source.params) ? source.params as Record<string, unknown> : {},
    phases: Array.isArray(source.phases)
      ? source.phases.map((phase) => {
          const row = phase && typeof phase === "object" ? phase as Partial<SupremeBossSkillPhase> : {};
          return { id: String(row.id ?? ""), label: String(row.label ?? ""), time_ms: Math.max(0, Number(row.time_ms ?? 0)) };
        })
      : []
  };
}

function buildSudokuOrbitEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [];
  const params = skill.params;
  const rows = numberParam(params, "grid_rows", 9);
  const cols = numberParam(params, "grid_cols", 9);
  const boxSize = numberParam(params, "box_size", 3);
  const arena = arenaRect(context);
  const cellW = arena.width / cols;
  const cellH = arena.height / rows;
  const dangerRows = chooseDistinctIndices(skill, context.sequence, "row", rows, numberParam(params, "row_warning_count", 3));
  const dangerCols = chooseDistinctIndices(skill, context.sequence, "column", cols, numberParam(params, "column_warning_count", 3));
  const dangerBoxes = chooseDistinctIndices(skill, context.sequence, "box", 9, numberParam(params, "box_warning_count", 3));
  const safeBox = firstIndexNotIn(9, dangerBoxes, stableIndex(`${skill.id}:${context.sequence}:safe-box`, 9));

  events.push(labelEvent(skill, context, 0, "九宫星轨", context.boss, "cast_start"));
  events.push(rectEvent(skill, context, 200, context.boss, { x: 1, y: 0 }, arena.width, arena.height, 7600, "damage_zone_prime", "九宫网格", "supreme_star_grid", "lightning", { debug_label: "技能 ID supreme_star_arbiter_sudoku_orbit / 当前阶段 phase 九宫网格", grid_rows: rows, grid_cols: cols }));
  events.push(...dangerRows.map((row) => {
    const y = arena.y + (row + 0.5) * cellH;
    return rectEvent(skill, context, 800, { x: arena.x + arena.width / 2, y }, { x: 1, y: 0 }, arena.width, cellH * 0.88, 800, "damage_zone_prime", "危险行", "supreme_star_row_warning", "lightning", { debug_label: "九宫星轨：行裁决 / 危险行", warning_remaining_ms: 800 });
  }));
  for (const row of dangerRows) {
    const y = arena.y + (row + 0.5) * cellH;
    events.push(projectileEvent(skill, context, 1600, { x: arena.x, y }, { x: 1, y: 0 }, arena.width, numberParam(params, "row_projectile_speed", 520), numberParam(params, "projectile_radius", 8), "supreme_star_projectile", "lightning", "危险行"));
  }
  events.push(...dangerCols.map((col) => {
    const x = arena.x + (col + 0.5) * cellW;
    return rectEvent(skill, context, 2400, { x, y: arena.y + arena.height / 2 }, { x: 0, y: 1 }, arena.height, cellW * 0.88, 800, "damage_zone_prime", "危险列", "supreme_star_column_warning", "lightning", { debug_label: "九宫星轨：列裁决 / 危险列", warning_remaining_ms: 800 });
  }));
  for (const col of dangerCols) {
    const x = arena.x + (col + 0.5) * cellW;
    events.push(projectileEvent(skill, context, 3200, { x, y: arena.y }, { x: 0, y: 1 }, arena.height, numberParam(params, "column_projectile_speed", 520), numberParam(params, "projectile_radius", 8), "supreme_star_projectile", "lightning", "危险列"));
  }
  for (const box of dangerBoxes) {
    const boxCol = box % 3;
    const boxRow = Math.floor(box / 3);
    const center = { x: arena.x + (boxCol * boxSize + boxSize / 2) * cellW, y: arena.y + (boxRow * boxSize + boxSize / 2) * cellH };
    events.push(rectEvent(skill, context, 4000, center, { x: 1, y: 0 }, boxSize * cellW, boxSize * cellH, 1000, "damage_zone_prime", "九宫星轨：宫裁决", "supreme_star_box_warning", "lightning", { debug_label: "九宫星轨：宫裁决", warning_remaining_ms: 1000 }));
    events.push(circleEvent(skill, context, 5000, center, Math.min(cellW, cellH) * 0.92, 380, "damage_zone", "九宫星轨：宫裁决", "supreme_star_box_burst", "lightning", { damage_amount: 1, max_hits: 1 }));
  }
  const safeCenter = boxCenter(safeBox, arena, cellW, cellH, boxSize);
  events.push(rectEvent(skill, context, 5800, safeCenter, { x: 1, y: 0 }, boxSize * cellW, boxSize * cellH, 1000, "damage_zone_prime", "安全宫", "supreme_safe_zone", "cold", { debug_label: "安全宫", safe_box: safeBox, warning_remaining_ms: 1000 }));
  for (let box = 0; box < 9; box += 1) {
    if (box === safeBox) continue;
    const center = boxCenter(box, arena, cellW, cellH, boxSize);
    const direction = normalized({ x: context.boss.x - center.x, y: context.boss.y - center.y });
    events.push(projectileEvent(skill, context, 6800, center, direction, distance(center, context.boss), numberParam(params, "final_projectile_speed", 380), numberParam(params, "projectile_radius", 8), "supreme_star_converge", "lightning", "九宫星轨：终段收束", { safe_box: safeBox }));
  }
  events.push(labelEvent(skill, context, 6800, "九宫星轨：终段收束 / 安全宫", safeCenter, "debug"));
  return withEndGuard(skill, events);
}

function buildPolarityRingEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [labelEvent(skill, context, 0, "黑白极环", context.boss, "cast_start")];
  const p = skill.params;
  events.push(circleEvent(skill, context, 300, { x: context.boss.x - 72, y: context.boss.y }, 44, 900, "damage_zone_prime", "黑极追踪弹", "supreme_black_ring", "chaos", { debug_label: "黑极追踪弹 / 发射源" }));
  events.push(circleEvent(skill, context, 300, { x: context.boss.x + 72, y: context.boss.y }, 44, 900, "damage_zone_prime", "白极直线弹", "supreme_white_ring", "cold", { debug_label: "白极直线弹 / 发射源" }));
  ringProjectiles(events, skill, context, 800, numberParam(p, "white_projectile_count", 16), 0, numberParam(p, "white_projectile_speed", 620), numberParam(p, "projectile_radius_white", 7), "supreme_white_diamond", "cold", "白极直线弹");
  ringProjectiles(events, skill, context, 1400, numberParam(p, "black_projectile_count", 12), 8, numberParam(p, "black_projectile_speed", 320), numberParam(p, "projectile_radius_black", 9), "supreme_black_orb", "chaos", "黑极追踪弹", { homing_strength: numberParam(p, "black_homing_strength", 0.12), aim_policy: "target_current_position" });
  ringProjectiles(events, skill, context, 2200, numberParam(p, "white_projectile_count", 16), numberParam(p, "ring_rotation_per_wave_deg", 11.25), numberParam(p, "white_projectile_speed", 620), numberParam(p, "projectile_radius_white", 7), "supreme_white_diamond", "cold", "白极直线弹");
  ringProjectiles(events, skill, context, 2800, numberParam(p, "black_projectile_count", 12), -11.25, numberParam(p, "black_projectile_speed", 320), numberParam(p, "projectile_radius_black", 9), "supreme_black_orb", "chaos", "黑极追踪弹", { homing_strength: numberParam(p, "black_homing_strength", 0.12), aim_policy: "target_current_position" });
  sideProjectiles(events, skill, context, 3600, 10, "left", numberParam(p, "white_projectile_speed", 620), 7, "supreme_white_diamond", "cold", "双极交错");
  ringProjectiles(events, skill, context, 3600, 10, 18, numberParam(p, "black_projectile_speed", 320), 9, "supreme_black_orb", "chaos", "双极交错");
  events.push(labelEvent(skill, context, 5200, "重定位窗口", { x: context.player.x, y: context.player.y - 56 }, "debug"));
  ringProjectiles(events, skill, context, 5800, 12, 0, 560, 7, "supreme_white_diamond", "cold", "终段双环");
  ringProjectiles(events, skill, context, 5860, 10, 15, 330, 9, "supreme_black_orb", "chaos", "终段双环", { homing_strength: 0.08 });
  return withEndGuard(skill, events);
}

function buildThousandNeedleEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [labelEvent(skill, context, 0, "千针虫潮", context.boss, "cast_start")];
  const p = skill.params;
  events.push(circleEvent(skill, context, 300, context.boss, 92, 300, "damage_zone_prime", "虫翼展开", "supreme_insect_wing_warning", "chaos", { debug_label: "螺旋虫针 / 发射源", warning_remaining_ms: 300 }));
  const spiralCount = numberParam(p, "spiral_bullets_per_wave", 10);
  const interval = numberParam(p, "spiral_wave_interval_ms", 120);
  const step = numberParam(p, "spiral_angle_step_deg", 17);
  const needleTravel = 620 * Math.max(1, numberParam(p, "projectile_travel_multiplier", 1));
  for (let t = 600, wave = 0; t <= 4800; t += interval, wave += 1) {
    ringProjectiles(events, skill, context, t, spiralCount, wave * step, numberParam(p, "spiral_projectile_speed", 300), numberParam(p, "projectile_radius", 5), "supreme_insect_spiral_needle", "chaos", "螺旋虫针", { projectile_travel: needleTravel });
  }
  for (let t = 1000, wave = 0; t <= 5000; t += 450, wave += 1) {
    const base = normalized({ x: context.player.x - context.boss.x, y: context.player.y - context.boss.y });
    const spread = numberParam(p, "aimed_spread_deg", 18);
    const count = numberParam(p, "aimed_burst_count", 5);
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : -spread / 2 + spread * i / (count - 1);
      events.push(projectileEvent(skill, context, t + i * 42, context.boss, rotate(base, offset), needleTravel, numberParam(p, "aimed_projectile_speed", 560), 5, "supreme_insect_aimed_needle", "chaos", "瞄准虫针", { deterministic_wave: wave }));
    }
  }
  for (const [waveIndex, warnAt] of [1400, 2600, 3800, 5000].entries()) {
    const centers = eggCenters(skill, context, waveIndex, numberParam(p, "egg_zone_count_per_wave", 5));
    for (const center of centers) {
      events.push(circleEvent(skill, context, warnAt, center, 36, 800, "damage_zone_prime", "虫卵预警", "supreme_insect_egg_warning", "chaos", { debug_label: "虫卵预警", warning_remaining_ms: 800 }));
      events.push(circleEvent(skill, context, warnAt + numberParam(p, "egg_warning_time_ms", 800), center, 38, 220, "damage_zone", "虫卵爆裂", "supreme_insect_egg_burst", "chaos"));
      ringProjectiles(events, skill, context, warnAt + numberParam(p, "egg_warning_time_ms", 800), numberParam(p, "egg_burst_projectile_count", 8), waveIndex * 9, numberParam(p, "egg_burst_speed", 260), 5, "supreme_insect_egg_needle", "chaos", "虫卵爆裂", { spawn: center, projectile_travel: needleTravel });
    }
  }
  return withEndGuard(skill, events);
}

function buildThunderKaleidoscopeEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [labelEvent(skill, context, 0, "雷纹万花筒", context.boss, "cast_start")];
  const p = skill.params;
  const cannonCount = numberParam(p, "orbit_cannon_count", 6);
  const orbitRadius = numberParam(p, "orbit_radius", 180);
  const orbitSpeed1 = numberParam(p, "orbit_speed_deg_per_sec_phase1", 75);
  const orbitSpeed2 = numberParam(p, "orbit_speed_deg_per_sec_phase2", -90);
  events.push(circleEvent(skill, context, 400, context.boss, orbitRadius, 2400, "damage_zone_prime", "浮游炮轨道", "supreme_thunder_orbit_track", "lightning", { debug_label: "浮游炮轨道", emitter_count: cannonCount, warning_remaining_ms: 400 }));
  events.push(circleEvent(skill, context, 2400, context.boss, 88, 600, "damage_zone_prime", "浮游炮反向旋转", "supreme_thunder_reposition", "lightning", { debug_label: "阶段间重定位窗口", warning_remaining_ms: 600 }));
  for (let i = 0; i < cannonCount; i += 1) {
    const cannon = orbitCannonPosition(context.boss, orbitRadius, i, cannonCount, 0, orbitSpeed1);
    events.push(circleEvent(skill, context, 0, cannon, 18, skill.cast_duration_ms, "damage_zone_prime", "雷霆浮游炮", "supreme_thunder_orbit_cannon", "lightning", { debug_label: `浮游炮 ${i + 1}`, emitter_kind: "orbit_cannon", emitter_index: i + 1, emitter_count: cannonCount }));
  }

  const phase1Start = numberParam(p, "phase1_start_ms", 800);
  const phase1End = numberParam(p, "phase1_end_ms", 2400);
  const phase1Interval = numberParam(p, "phase1_wave_interval_ms", 220);
  const phase1Lifetime = numberParam(p, "phase1_projectile_lifetime_ms", 2600);
  const phase1Speed = numberParam(p, "phase1_projectile_speed", 560);
  const phase1Travel = phase1Speed * phase1Lifetime / 1000;
  const phase1Spread = numberParam(p, "phase1_spread_deg", 8);
  const phase1Step = numberParam(p, "phase1_global_angle_step_deg", 9);
  const phase1PerCannon = numberParam(p, "phase1_bullets_per_cannon", 3);
  for (let t = phase1Start, wave = 0; t <= phase1End; t += phase1Interval, wave += 1) {
    const elapsedSec = (t - 400) / 1000;
    for (let cannonIndex = 0; cannonIndex < cannonCount; cannonIndex += 1) {
      const cannon = orbitCannonPosition(context.boss, orbitRadius, cannonIndex, cannonCount, elapsedSec, orbitSpeed1);
      const baseAngle = cannonIndex * 360 / cannonCount + wave * phase1Step;
      for (let bulletIndex = 0; bulletIndex < phase1PerCannon; bulletIndex += 1) {
        const offset = phase1PerCannon === 1 ? 0 : -phase1Spread + phase1Spread * 2 * bulletIndex / (phase1PerCannon - 1);
        events.push(projectileEvent(skill, context, t, cannon, angleVector(baseAngle + offset), phase1Travel, phase1Speed, numberParam(p, "phase1_projectile_radius", 5), "supreme_thunder_kaleidoscope_needle", "lightning", "阶段一：雷针花轮", { phase: "阶段一：雷针花轮", emitter_index: cannonIndex + 1, projectile_shape: "needle" }));
      }
    }
  }

  const phase2Start = numberParam(p, "phase2_start_ms", 3000);
  const phase2End = numberParam(p, "phase2_end_ms", 4800);
  const phase2Interval = numberParam(p, "phase2_wave_interval_ms", 350);
  const phase2Lifetime = numberParam(p, "phase2_projectile_lifetime_ms", 3200);
  const phase2Speed = numberParam(p, "phase2_projectile_speed", 360);
  const phase2Travel = phase2Speed * phase2Lifetime / 1000;
  for (let t = phase2Start, wave = 0; t <= phase2End; t += phase2Interval, wave += 1) {
    const elapsedSec = (t - phase2Start) / 1000;
    for (let cannonIndex = 0; cannonIndex < cannonCount; cannonIndex += 1) {
      const cannon = orbitCannonPosition(context.boss, orbitRadius, cannonIndex, cannonCount, elapsedSec, orbitSpeed2);
      const base = normalized({ x: context.player.x - cannon.x, y: context.player.y - cannon.y });
      const sign = stableUnit(`${skill.id}:${context.sequence}:serpent:${wave}:${cannonIndex}`) < 0.5 ? -1 : 1;
      const offsetMin = numberParam(p, "phase2_aim_offset_min_deg", 12);
      const offsetMax = numberParam(p, "phase2_aim_offset_max_deg", 18);
      const offset = sign * (offsetMin + stableUnit(`${skill.id}:serpent_offset:${wave}:${cannonIndex}`) * Math.max(0, offsetMax - offsetMin));
      events.push(projectileEvent(skill, context, t, cannon, rotate(base, offset), phase2Travel, phase2Speed, numberParam(p, "phase2_projectile_radius", 10), "supreme_thunder_kaleidoscope_serpent", "lightning", "阶段二：折线电蛇", { phase: "阶段二：折线电蛇", emitter_index: cannonIndex + 1, projectile_shape: "serpent", trajectory: "sine", sine_amplitude: numberParam(p, "phase2_sine_amplitude", 28), sine_frequency: numberParam(p, "phase2_sine_frequency", 2.4), debug_label: "电蛇摆动轨迹" }));
    }
  }

  const phase3Start = numberParam(p, "phase3_start_ms", 4800);
  const phase3End = numberParam(p, "phase3_end_ms", 6400);
  const phase3Warning = numberParam(p, "phase3_warning_ms", 500);
  const ringRadii = arrayParam(p, "phase3_ring_radii", [160, 260, 360]);
  const ringSpeeds = arrayParam(p, "phase3_rotation_speed_deg_per_sec", [80, -65, 50]);
  const bulletsPerRing = numberParam(p, "phase3_bullets_per_ring", 28);
  const gapBulletCount = numberParam(p, "phase3_gap_bullet_count", 4);
  const ringLifetime = Math.max(320, phase3End - phase3Start - phase3Warning);
  ringRadii.forEach((ringRadius, ringIndex) => {
    const rotationSpeed = ringSpeeds[ringIndex] ?? 0;
    const gapStart = (ringIndex * 7 + context.sequence * 3) % bulletsPerRing;
    events.push(circleEvent(skill, context, phase3Start, context.boss, ringRadius, phase3Warning, "damage_zone_prime", "阶段三：雷环切割", "supreme_thunder_ring_warning", "lightning", { debug_label: "雷环缺口", ring_index: ringIndex + 1, gap_start: gapStart, gap_bullet_count: gapBulletCount, warning_remaining_ms: phase3Warning }));
    for (let bulletIndex = 0; bulletIndex < bulletsPerRing; bulletIndex += 1) {
      if (ringGapContains(bulletIndex, gapStart, gapBulletCount, bulletsPerRing)) continue;
      const angle = bulletIndex * 360 / bulletsPerRing + rotationSpeed * phase3Warning / 1000;
      const spawn = { x: context.boss.x + Math.cos(angle * Math.PI / 180) * ringRadius, y: context.boss.y + Math.sin(angle * Math.PI / 180) * ringRadius };
      const tangent = angleVector(angle + (rotationSpeed >= 0 ? 90 : -90));
      events.push(projectileEvent(skill, context, phase3Start + phase3Warning, spawn, tangent, Math.abs(rotationSpeed) * ringLifetime / 1000 * 2.6, Math.max(80, Math.abs(rotationSpeed) * 2.4), numberParam(p, "phase3_projectile_radius", 8), "supreme_thunder_kaleidoscope_ring_orb", "lightning", "阶段三：雷环切割", { phase: "阶段三：雷环切割", ring_index: ringIndex + 1, ring_radius: ringRadius, gap_start: gapStart, gap_bullet_count: gapBulletCount, rotation_speed_deg_per_sec: rotationSpeed, projectile_shape: "orb" }));
    }
  });

  const phase4Start = numberParam(p, "phase4_start_ms", 6400);
  const outwardSpeed = numberParam(p, "phase4_outward_speed", 520);
  const returnSpeed = numberParam(p, "phase4_return_speed", 420);
  const turnaroundRadius = numberParam(p, "phase4_turnaround_radius", 520);
  const outwardPerCannon = numberParam(p, "phase4_outward_bullets_per_cannon", 8);
  const returnRadius = numberParam(p, "phase4_projectile_radius", 7);
  events.push(circleEvent(skill, context, phase4Start, context.boss, numberParam(p, "phase4_center_danger_radius", 140), 620, "damage_zone", "中心危险区", "supreme_thunder_center_storm", "lightning", { debug_label: "中心危险区" }));
  events.push(circleEvent(skill, context, phase4Start, context.boss, numberParam(p, "phase4_safe_band_outer_radius", 330), 1000, "damage_zone_prime", "安全带", "supreme_thunder_safe_band", "cold", { debug_label: "安全带", safe_band_inner_radius: numberParam(p, "phase4_safe_band_inner_radius", 210), safe_band_outer_radius: numberParam(p, "phase4_safe_band_outer_radius", 330) }));
  for (let cannonIndex = 0; cannonIndex < cannonCount; cannonIndex += 1) {
    const cannonAngle = cannonIndex * 360 / cannonCount;
    const cannon = { x: context.boss.x + Math.cos(cannonAngle * Math.PI / 180) * orbitRadius, y: context.boss.y + Math.sin(cannonAngle * Math.PI / 180) * orbitRadius };
    events.push(circleEvent(skill, context, phase4Start, cannon, 22, 1000, "damage_zone_prime", "阶段四：万花筒回流", "supreme_thunder_cannon_lock", "lightning", { debug_label: "六芒星浮游炮", emitter_index: cannonIndex + 1 }));
    for (let bulletIndex = 0; bulletIndex < outwardPerCannon; bulletIndex += 1) {
      const angle = cannonAngle + (bulletIndex - (outwardPerCannon - 1) / 2) * 4;
      const direction = angleVector(angle);
      const turnPoint = { x: context.boss.x + direction.x * turnaroundRadius, y: context.boss.y + direction.y * turnaroundRadius };
      const outwardTravel = distance(cannon, turnPoint);
      const outwardMs = Math.round(outwardTravel / outwardSpeed * 1000);
      const returnId = `return_${cannonIndex + 1}_${bulletIndex + 1}`;
      events.push(projectileEvent(skill, context, phase4Start, cannon, direction, outwardTravel, outwardSpeed, returnRadius, "supreme_thunder_kaleidoscope_return_orb", "lightning", "阶段四：万花筒回流", { phase: "阶段四：万花筒回流", return_phase: "outward", return_id: returnId, turnaround_point: turnPoint, debug_label: "回流转向点" }));
      events.push(circleEvent(skill, context, phase4Start + outwardMs, turnPoint, 14, 180, "damage_zone_prime", "回流转向点", "supreme_thunder_turnaround_flash", "lightning", { debug_label: "回流转向点", return_id: returnId }));
      events.push(projectileEvent(skill, context, phase4Start + outwardMs, turnPoint, normalized({ x: context.boss.x - turnPoint.x, y: context.boss.y - turnPoint.y }), turnaroundRadius - numberParam(p, "phase4_center_danger_radius", 140), returnSpeed, returnRadius, "supreme_thunder_kaleidoscope_return_orb", "lightning", "阶段四：万花筒回流", { phase: "阶段四：万花筒回流", return_phase: "inward", return_id: returnId, turnaround_point: turnPoint }));
    }
  }
  return withEndGuard(skill, events);
}

function buildClosingFlowerEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [labelEvent(skill, context, 0, "闭合花阵", context.boss, "cast_start")];
  const p = skill.params;
  const layers = numberParam(p, "petal_layer_count", 6);
  const petals = numberParam(p, "petals_per_layer", 12);
  const bullets = numberParam(p, "bullets_per_petal", 3);
  const layerOffset = numberParam(p, "layer_angle_offset_deg", 15);
  const fireTimes = [800, 1300, 1800, 2400, 3000, 3600];
  for (let layer = 0; layer < layers; layer += 1) {
    events.push(circleEvent(skill, context, 400 + layer * 40, context.boss, 56 + layer * 18, 900, "damage_zone_prime", `花瓣层 ${layer + 1}`, "supreme_flower_source", "cold", { debug_label: `花瓣层 ${layer + 1}` }));
    const rotation = arrayNumberParam(p, "layer_rotation_speed_deg", layer, 0) * 0.16;
    for (let petal = 0; petal < petals; petal += 1) {
      for (let b = 0; b < bullets; b += 1) {
        const angle = petal * 360 / petals + layer * layerOffset + (b - 1) * 4 + rotation * Math.max(0, fireTimes[layer] - 2400) / 100;
        const speed = fireTimes[layer] >= numberParam(p, "close_start_time_ms", 3600) ? numberParam(p, "closing_speed", 180) : numberParam(p, "initial_expand_speed", 260);
        const direction = angleVector(angle);
        const spawn = { x: context.boss.x + direction.x * (46 + layer * 16), y: context.boss.y + direction.y * (46 + layer * 16) };
        const finalDirection = fireTimes[layer] >= numberParam(p, "close_start_time_ms", 3600) ? normalized({ x: context.boss.x - spawn.x, y: context.boss.y - spawn.y }) : direction;
        events.push(projectileEvent(skill, context, fireTimes[layer], spawn, finalDirection, 420, speed, numberParam(p, "projectile_radius", 6), "supreme_flower_petal", "cold", fireTimes[layer] >= 3600 ? "闭合阶段" : fireTimes[layer] >= 2400 ? "旋转阶段" : "外扩阶段", { layer: layer + 1, rotation_speed_deg: arrayNumberParam(p, "layer_rotation_speed_deg", layer, 0) }));
      }
    }
  }
  events.push(circleEvent(skill, context, 5400, context.boss, 96, 800, "damage_zone_prime", "中心安全洞", "supreme_safe_zone", "cold", { debug_label: "中心安全洞" }));
  ringProjectiles(events, skill, context, 6200, numberParam(p, "final_burst_count", 36), 0, numberParam(p, "final_burst_speed", 420), 6, "supreme_flower_final", "cold", "终段爆散");
  return withEndGuard(skill, events);
}

function buildAllReturnsZeroEvents(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext) {
  const events: SupremeBossRuntimeEvent[] = [labelEvent(skill, context, 0, "万象归零", context.boss, "cast_start")];
  const p = skill.params;
  const center = { x: context.boss.x, y: context.boss.y };
  const gateCount = numberParam(p, "zero_gate_count", 8);
  const gateRadius = numberParam(p, "zero_gate_orbit_radius", 210);
  const orbitSpeed1 = numberParam(p, "phase1_orbit_speed_deg_per_sec", 70);
  const orbitSpeed2 = numberParam(p, "phase2_orbit_speed_deg_per_sec", -85);
  events.push(circleEvent(skill, context, 0, center, 132, 9000, "damage_zone_prime", "Boss 无敌窗口", "supreme_zero_invulnerable_halo", "chaos", { debug_label: "Boss 无敌窗口", invulnerable_window_ms: skill.cast_duration_ms }));
  events.push(circleEvent(skill, context, 300, center, gateRadius, 2500, "damage_zone_prime", "星门轨道", "supreme_zero_gate_orbit", "cold", { debug_label: "星门轨道", emitter_count: gateCount, warning_remaining_ms: 400 }));
  for (let gateIndex = 0; gateIndex < gateCount; gateIndex += 1) {
    const gate = orbitCannonPosition(center, gateRadius, gateIndex, gateCount, 0, orbitSpeed1);
    events.push(circleEvent(skill, context, 300, gate, 20, skill.cast_duration_ms - 300, "damage_zone_prime", "零点星门", "supreme_zero_gate_portal", "cold", { debug_label: "零点星门", emitter_kind: "zero_gate", emitter_index: gateIndex + 1, emitter_count: gateCount }));
  }

  const phase1Start = numberParam(p, "phase1_start_ms", 700);
  const phase1End = numberParam(p, "phase1_end_ms", 2300);
  const phase1Interval = numberParam(p, "phase1_wave_interval_ms", 180);
  const phase1Speed = numberParam(p, "phase1_projectile_speed", 540);
  const phase1Travel = phase1Speed * numberParam(p, "phase1_projectile_lifetime_ms", 3000) / 1000;
  const phase1Spread = numberParam(p, "phase1_spread_deg", 10);
  const phase1Step = numberParam(p, "phase1_global_angle_step_deg", 7.5);
  for (let t = phase1Start, wave = 0; t <= phase1End; t += phase1Interval, wave += 1) {
    const elapsedSec = (t - 300) / 1000;
    for (let gateIndex = 0; gateIndex < gateCount; gateIndex += 1) {
      const gate = orbitCannonPosition(center, gateRadius, gateIndex, gateCount, elapsedSec, orbitSpeed1);
      const baseAngle = gateIndex * 360 / gateCount + wave * phase1Step;
      for (let bulletIndex = 0; bulletIndex < numberParam(p, "phase1_bullets_per_gate", 2); bulletIndex += 1) {
        const offset = bulletIndex === 0 ? 0 : phase1Spread;
        events.push(projectileEvent(skill, context, t, gate, angleVector(baseAngle + offset), phase1Travel, phase1Speed, numberParam(p, "phase1_projectile_radius", 5), "supreme_zero_star_needle", "lightning", "阶段一：星门花轮", { phase: "阶段一：星门花轮", emitter_index: gateIndex + 1, projectile_shape: "star_needle" }));
      }
    }
  }

  events.push(circleEvent(skill, context, 2300, center, 96, 500, "damage_zone_prime", "归零核心蓄力", "supreme_zero_core_charge", "chaos", { debug_label: "归零核心蓄力", warning_remaining_ms: 500 }));
  const phase2Start = numberParam(p, "phase2_start_ms", 2800);
  const phase2End = numberParam(p, "phase2_end_ms", 4400);
  const phase2Interval = numberParam(p, "phase2_wave_interval_ms", 320);
  const phase2Speed = numberParam(p, "phase2_projectile_speed", 340);
  const phase2Travel = phase2Speed * numberParam(p, "phase2_projectile_lifetime_ms", 3600) / 1000;
  for (let t = phase2Start, wave = 0; t <= phase2End; t += phase2Interval, wave += 1) {
    const elapsedSec = (t - phase2Start) / 1000;
    for (let gateIndex = 0; gateIndex < gateCount; gateIndex += 1) {
      const gate = orbitCannonPosition(center, gateRadius, gateIndex, gateCount, elapsedSec, orbitSpeed2);
      const angle = gateIndex * 360 / gateCount - wave * 11;
      const curveSign = (gateIndex + wave) % 2 === 0 ? 1 : -1;
      events.push(projectileEvent(skill, context, t, gate, angleVector(angle), phase2Travel, phase2Speed, numberParam(p, "phase2_projectile_radius", 10), "supreme_zero_star_petal", "chaos", "阶段二：逆相星瓣", { phase: "阶段二：逆相星瓣", emitter_index: gateIndex + 1, projectile_shape: "star_petal", trajectory: "sine", sine_amplitude: numberParam(p, "phase2_sine_amplitude", 30) * curveSign, sine_frequency: numberParam(p, "phase2_sine_frequency", 1.6), curve_strength: numberParam(p, "phase2_curve_strength", 0.22), homing_target: "geometric_path" }));
    }
  }

  const phase3Start = numberParam(p, "phase3_start_ms", 5000);
  const phase3End = numberParam(p, "phase3_end_ms", 6800);
  const phase3Warning = numberParam(p, "phase3_warning_ms", 600);
  events.push(circleEvent(skill, context, 4400, center, 116, 600, "damage_zone_prime", "零环预警", "supreme_zero_ring_charge", "cold", { debug_label: "零环预警", warning_remaining_ms: 600 }));
  const ringRadii = arrayParam(p, "phase3_ring_radii", [140, 230, 320, 410]);
  const ringSpeeds = arrayParam(p, "phase3_rotation_speed_deg_per_sec", [85, -70, 55, -45]);
  const bulletsByRing = arrayParam(p, "phase3_bullets_per_ring", [20, 28, 36, 44]);
  const gapsByRing = arrayParam(p, "phase3_gap_bullet_count", [4, 5, 6, 7]);
  const minGapsByRing = arrayParam(p, "phase3_min_gap_bullet_count", [3, 4, 5, 6]);
  const maxGapsByRing = arrayParam(p, "phase3_max_gap_bullet_count", [6, 7, 8, 9]);
  const pulseInterval = numberParam(p, "phase3_gap_pulse_interval_ms", 600);
  const ringLifetime = Math.max(320, phase3End - phase3Start - phase3Warning);
  ringRadii.forEach((ringRadius, ringIndex) => {
    const bulletCount = Math.max(1, Math.round(bulletsByRing[ringIndex] ?? 20));
    const configuredGap = Math.round(gapsByRing[ringIndex] ?? 4);
    const minGap = Math.round(minGapsByRing[ringIndex] ?? configuredGap);
    const maxGap = Math.round(maxGapsByRing[ringIndex] ?? configuredGap);
    const currentGap = Math.max(minGap, Math.min(maxGap, configuredGap));
    const rotationSpeed = ringSpeeds[ringIndex] ?? 0;
    const gapStart = (ringIndex * 5 + context.sequence * 3) % bulletCount;
    events.push(circleEvent(skill, context, phase3Start - phase3Warning, center, ringRadius, phase3Warning, "damage_zone_prime", "零环预警", "supreme_zero_ring_warning", "cold", { debug_label: "零环缺口", ring_index: ringIndex + 1, gap_start: gapStart, gap_bullet_count: currentGap, min_gap_bullet_count: minGap, max_gap_bullet_count: maxGap, gap_pulse_interval_ms: pulseInterval, warning_remaining_ms: phase3Warning }));
    events.push(labelEvent(skill, context, phase3Start, `缺口开合 / 第 ${ringIndex + 1} 环`, { x: center.x + ringRadius, y: center.y }, "debug"));
    for (let bulletIndex = 0; bulletIndex < bulletCount; bulletIndex += 1) {
      if (ringGapContains(bulletIndex, gapStart, currentGap, bulletCount)) continue;
      const angle = bulletIndex * 360 / bulletCount + rotationSpeed * phase3Warning / 1000;
      const spawn = { x: center.x + Math.cos(angle * Math.PI / 180) * ringRadius, y: center.y + Math.sin(angle * Math.PI / 180) * ringRadius };
      const tangent = angleVector(angle + (rotationSpeed >= 0 ? 90 : -90));
      events.push(projectileEvent(skill, context, phase3Start, spawn, tangent, Math.abs(rotationSpeed) * ringLifetime / 1000 * 2.8, Math.max(80, Math.abs(rotationSpeed) * 2.35), numberParam(p, "phase3_projectile_radius", 8), "supreme_zero_ring_orb", "lightning", "阶段三：零环开阖", { phase: "阶段三：零环开阖", ring_index: ringIndex + 1, ring_radius: ringRadius, gap_start: gapStart, gap_bullet_count: currentGap, min_gap_bullet_count: minGap, max_gap_bullet_count: maxGap, gap_pulse_interval_ms: pulseInterval, rotation_speed_deg_per_sec: rotationSpeed, projectile_shape: "zero_orb" }));
    }
  });

  const freezeAt = numberParam(p, "phase4_start_ms", 7200) - numberParam(p, "phase4_freeze_before_return_ms", 400);
  const phase4Start = numberParam(p, "phase4_start_ms", 7200);
  const phase4End = numberParam(p, "phase4_end_ms", 8500);
  const safeInner = numberParam(p, "phase4_safe_band_inner_radius", 230);
  const safeOuter = numberParam(p, "phase4_safe_band_outer_radius", 360);
  events.push(circleEvent(skill, context, freezeAt, center, safeOuter, phase4End - freezeAt, "damage_zone_prime", "归零停滞", "supreme_zero_stasis", "cold", { debug_label: "归零停滞", freeze_before_return_ms: numberParam(p, "phase4_freeze_before_return_ms", 400) }));
  events.push(circleEvent(skill, context, freezeAt, center, safeOuter, phase4End - freezeAt, "damage_zone_prime", "旋转安全带", "supreme_zero_safe_band", "cold", { debug_label: "旋转安全带", safe_band_inner_radius: safeInner, safe_band_outer_radius: safeOuter, safe_band_rotation_speed_deg_per_sec: numberParam(p, "phase4_safe_band_rotation_speed_deg_per_sec", 40) }));
  events.push(circleEvent(skill, context, freezeAt, center, numberParam(p, "phase4_center_danger_radius", 150), 400, "damage_zone_prime", "中心危险区", "supreme_zero_center_warning", "chaos", { debug_label: "中心危险区", warning_remaining_ms: 400 }));
  events.push(circleEvent(skill, context, phase4Start, center, numberParam(p, "phase4_center_danger_radius", 150), phase4End - phase4Start, "damage_zone", "中心危险区", "supreme_zero_center_danger", "chaos", { debug_label: "中心危险区" }));
  const laneCount = numberParam(p, "phase4_return_lane_count", 8);
  const perLane = numberParam(p, "phase4_return_projectiles_per_lane", 8);
  const returnSpeed = numberParam(p, "phase4_return_speed", 430);
  const outerRadius = safeOuter + 170;
  const targetRadius = numberParam(p, "phase4_center_danger_radius", 150) + 18;
  for (let lane = 0; lane < laneCount; lane += 1) {
    const laneAngle = lane * 360 / laneCount;
    for (let index = 0; index < perLane; index += 1) {
      const angle = laneAngle + (index - (perLane - 1) / 2) * 2.7;
      const direction = angleVector(angle);
      const spawnRadius = outerRadius + index * 18;
      const spawn = { x: center.x + direction.x * spawnRadius, y: center.y + direction.y * spawnRadius };
      const target = { x: center.x + direction.x * targetRadius, y: center.y + direction.y * targetRadius };
      const delay = phase4Start + index * 42;
      events.push(projectileEvent(skill, context, delay, spawn, normalized({ x: target.x - spawn.x, y: target.y - spawn.y }), distance(spawn, target), returnSpeed, numberParam(p, "phase4_projectile_radius", 7), "supreme_zero_return_star", "chaos", "阶段四：归零回流", { phase: "阶段四：归零回流", return_pattern: "kaleidoscope_inward", return_lane: lane + 1, return_index: index + 1, homing_target: "geometric_center", target_world_position: target, debug_label: "回流路径" }));
    }
  }
  events.push(circleEvent(skill, context, 8500, center, 52, 500, "damage_zone_prime", "万象归零结束", "supreme_zero_final_point", "cold", { debug_label: "万象归零结束" }));
  return withEndGuard(skill, events);
}

function ringProjectiles(events: SupremeBossRuntimeEvent[], skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, count: number, angleOffset: number, speed: number, radius: number, vfxKey: string, damageType: string, label: string, extra: Record<string, unknown> = {}) {
  const spawn = pointFromUnknown(extra.spawn) ?? context.boss;
  const travel = Math.max(1, Number(extra.projectile_travel ?? 620));
  for (let i = 0; i < count; i += 1) {
    events.push(projectileEvent(skill, context, delayMs, spawn, angleVector(angleOffset + i * 360 / count), travel, speed, radius, vfxKey, damageType, label, extra));
  }
}

function sideProjectiles(events: SupremeBossRuntimeEvent[], skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, count: number, side: "left" | "both", speed: number, radius: number, vfxKey: string, damageType: string, label: string) {
  const arena = arenaRect(context);
  const rows = Math.max(1, Math.floor(count / (side === "both" ? 2 : 1)));
  for (let i = 0; i < rows; i += 1) {
    const y = arena.y + (i + 0.5) * arena.height / rows;
    events.push(projectileEvent(skill, context, delayMs + i * 18, { x: arena.x, y }, { x: 1, y: 0 }, arena.width, speed, radius, vfxKey, damageType, label));
    if (side === "both") {
      events.push(projectileEvent(skill, context, delayMs + i * 18, { x: arena.x + arena.width, y }, { x: -1, y: 0 }, arena.width, speed, radius + 2, "supreme_black_orb", "chaos", label));
    }
  }
}

function projectileEvent(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, spawn: { x: number; y: number }, direction: { x: number; y: number }, travel: number, speed: number, radius: number, vfxKey: string, damageType: string, label: string, extra: Record<string, unknown> = {}): SupremeBossRuntimeEvent {
  const dir = normalized(direction);
  const projectileId = `supreme_${context.boss.id}_${skill.id}_${context.sequence}_${delayMs}_${stableStringHash(`${spawn.x}:${spawn.y}:${dir.x}:${dir.y}`)}`;
  const lifetimeMs = Math.max(120, Math.round(travel / Math.max(1, speed) * 1000));
  return baseEvent(skill, context, "projectile_spawn", delayMs, lifetimeMs, spawn, dir, damageType, vfxKey, "supreme_boss_projectile", {
    skill_name: label,
    skill_id: skill.id,
    projectile_id: projectileId,
    projectile_index: Number(extra.projectile_index ?? 1),
    projectile_count: Number(extra.projectile_count ?? 1),
    spawn_world_position: spawn,
    target_world_position: { x: spawn.x + dir.x * travel, y: spawn.y + dir.y * travel },
    expire_world_position: { x: spawn.x + dir.x * travel, y: spawn.y + dir.y * travel },
    direction_world: dir,
    velocity_world: { x: dir.x * speed, y: dir.y * speed },
    projectile_speed: speed,
    projectile_range: travel,
    projectile_width: radius * 2,
    projectile_height: radius * 2,
    projectile_radius: radius,
    collision_radius: radius,
    impact_radius: radius,
    lifetime_ms: lifetimeMs,
    local_spread_angle: 0,
    projectile_visual_mode: "standard",
    trajectory: String(extra.trajectory ?? "linear"),
    area_scale: 1,
    can_hit_player: true,
    source_enemy_id: context.boss.id,
    player_damage_multiplier: supremeBossDamageMultiplier(skill),
    player_hit_kind: "spell",
    suppress_hit_vfx: true,
    debug_label: label,
    ...extra
  });
}

function rectEvent(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, center: { x: number; y: number }, direction: { x: number; y: number }, length: number, width: number, durationMs: number, type: "damage_zone_prime" | "damage_zone", label: string, vfxKey: string, damageType: string, extra: Record<string, unknown> = {}) {
  const dir = normalized(direction);
  return baseEvent(skill, context, type, delayMs, durationMs, center, dir, damageType, vfxKey, type === "damage_zone_prime" ? "supreme_boss_warning" : "supreme_boss_damage_zone", {
    skill_name: label,
    skill_id: skill.id,
    zone_id: `${skill.id}_${context.boss.id}_${context.sequence}_${delayMs}_${label}`,
    shape: "rectangle",
    length,
    width,
    radius: Math.max(length, width) * 0.5,
    origin_world_position: center,
    direction_world: dir,
    source_enemy_id: context.boss.id,
    damage_amount: type === "damage_zone" ? 1 : 0,
    player_damage_multiplier: supremeBossDamageMultiplier(skill),
    ...extra
  });
}

function circleEvent(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, center: { x: number; y: number }, radius: number, durationMs: number, type: "damage_zone_prime" | "damage_zone", label: string, vfxKey: string, damageType: string, extra: Record<string, unknown> = {}) {
  return baseEvent(skill, context, type, delayMs, durationMs, center, { x: 1, y: 0 }, damageType, vfxKey, type === "damage_zone_prime" ? "supreme_boss_warning" : "supreme_boss_damage_zone", {
    skill_name: label,
    skill_id: skill.id,
    zone_id: `${skill.id}_${context.boss.id}_${context.sequence}_${delayMs}_${label}`,
    shape: String(extra.shape ?? "circle"),
    radius,
    origin_world_position: center,
    direction_world: pointFromUnknown(extra.direction_world) ?? { x: 1, y: 0 },
    source_enemy_id: context.boss.id,
    damage_amount: type === "damage_zone" ? 1 : 0,
    player_damage_multiplier: supremeBossDamageMultiplier(skill),
    ...extra
  });
}

function labelEvent(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, delayMs: number, text: string, position: { x: number; y: number }, reason: string) {
  return baseEvent(skill, context, "floating_text", delayMs, 1200, position, { x: 0, y: -1 }, "lightning", skill.vfx_profile, `supreme_boss_${reason}`, {
    skill_name: skill.display_name,
    skill_id: skill.id,
    text,
    floating_text: text,
    source_enemy_id: context.boss.id,
    debug_label: text
  });
}

function baseEvent(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, type: string, delayMs: number, durationMs: number, position: { x: number; y: number }, direction: { x: number; y: number }, damageType: string, vfxKey: string, reasonKey: string, payload: Record<string, unknown>): SupremeBossRuntimeEvent {
  return {
    event_id: `${skill.id}.${context.boss.id}.${context.sequence}.${type}.${delayMs}.${stableStringHash(JSON.stringify(payload))}`,
    type,
    timestamp_ms: context.castStartMs,
    source_entity: "boss",
    target_entity: "player",
    position,
    direction,
    delay_ms: delayMs,
    duration_ms: durationMs,
    amount: null,
    damage_type: damageType,
    skill_instance_id: skill.id,
    vfx_key: vfxKey,
    sfx_key: "",
    reason_key: reasonKey,
    payload
  };
}

function withEndGuard(skill: SupremeBossSkillDefinition, events: SupremeBossRuntimeEvent[]) {
  return events.filter((event) => event.delay_ms <= skill.cast_duration_ms);
}

function sudokuOrbitHasSafeRoute(skill: SupremeBossSkillDefinition) {
  const rows = numberParam(skill.params, "grid_rows", 9);
  const cols = numberParam(skill.params, "grid_cols", 9);
  const rowDanger = numberParam(skill.params, "row_warning_count", 3);
  const colDanger = numberParam(skill.params, "column_warning_count", 3);
  const boxDanger = numberParam(skill.params, "box_warning_count", 3);
  return rows - rowDanger >= 1 && cols - colDanger >= 1 && 9 - boxDanger >= 1;
}

function maxEventEndMs(events: SupremeBossRuntimeEvent[]) {
  return Math.max(0, ...events.map((event) => event.delay_ms + Math.max(0, event.duration_ms)));
}

function arenaRect(context: SupremeBossBuildContext) {
  const margin = 96;
  return {
    x: margin,
    y: margin,
    width: Math.max(320, context.arena.width - margin * 2),
    height: Math.max(260, context.arena.height - margin * 2)
  };
}

function boxCenter(box: number, arena: { x: number; y: number; width: number; height: number }, cellW: number, cellH: number, boxSize: number) {
  const boxCol = box % 3;
  const boxRow = Math.floor(box / 3);
  return { x: arena.x + (boxCol * boxSize + boxSize / 2) * cellW, y: arena.y + (boxRow * boxSize + boxSize / 2) * cellH };
}

function eggCenters(skill: SupremeBossSkillDefinition, context: SupremeBossBuildContext, waveIndex: number, count: number) {
  const arena = arenaRect(context);
  const centers: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    centers.push({
      x: arena.x + arena.width * (0.18 + stableUnit(`${skill.id}:${context.sequence}:egg:${waveIndex}:${i}:x`) * 0.64),
      y: arena.y + arena.height * (0.18 + stableUnit(`${skill.id}:${context.sequence}:egg:${waveIndex}:${i}:y`) * 0.64)
    });
  }
  return centers;
}

function chooseDistinctIndices(skill: SupremeBossSkillDefinition, sequence: number, key: string, size: number, count: number) {
  const values = Array.from({ length: size }, (_, index) => index);
  values.sort((left, right) => stableStringHash(`${skill.id}:${sequence}:${key}:${left}`) - stableStringHash(`${skill.id}:${sequence}:${key}:${right}`));
  return values.slice(0, Math.max(0, Math.min(size, count)));
}

function firstIndexNotIn(size: number, blocked: number[], preferred: number) {
  const blockedSet = new Set(blocked);
  for (let i = 0; i < size; i += 1) {
    const candidate = (preferred + i) % size;
    if (!blockedSet.has(candidate)) return candidate;
  }
  return 0;
}

function orbitCannonPosition(center: { x: number; y: number }, radius: number, index: number, count: number, elapsedSec: number, speedDegPerSec: number) {
  const angle = index * 360 / Math.max(1, count) + elapsedSec * speedDegPerSec;
  const direction = angleVector(angle);
  return { x: center.x + direction.x * radius, y: center.y + direction.y * radius };
}

function ringGapContains(index: number, gapStart: number, gapCount: number, ringCount: number) {
  for (let offset = 0; offset < gapCount; offset += 1) {
    if ((gapStart + offset) % Math.max(1, ringCount) === index) return true;
  }
  return false;
}

function numberParam(params: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(params[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function arrayParam(params: Record<string, unknown>, key: string, fallback: number[]) {
  const row = params[key];
  if (!Array.isArray(row)) return fallback;
  const values = row.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : fallback;
}

function arrayNumberParam(params: Record<string, unknown>, key: string, index: number, fallback: number) {
  const row = params[key];
  if (!Array.isArray(row)) return fallback;
  const value = Number(row[index] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function angleVector(deg: number) {
  const radians = deg * Math.PI / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

function rotate(direction: { x: number; y: number }, deg: number) {
  const radians = deg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
}

function normalized(direction: { x: number; y: number }) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointFromUnknown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as { x?: unknown; y?: unknown };
  const x = Number(row.x);
  const y = Number(row.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function stableUnit(seed: string) {
  return stableStringHash(seed) / 0xFFFFFFFF;
}

function stableIndex(seed: string, size: number) {
  return stableStringHash(seed) % Math.max(1, size);
}

function stableStringHash(seed: string) {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function finitePositive(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function hasChineseText(value: unknown) {
  return typeof value === "string" && /[\u3400-\u9FFF]/.test(value);
}
