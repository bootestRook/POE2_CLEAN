import { cssToken } from "../../utils/vfxTone";
import { FireBoltAlignmentDebug } from "./FireBoltAlignmentDebug";
import { projectileVfxKind } from "./projectileVfxPresentation";

type Point = { x: number; y: number };

type SkillGuideDebugOptions = {
  showLaunchPoints: boolean;
  showTargetPoint: boolean;
  showDirectionLines: boolean;
  showCollisionRadius: boolean;
  showSearchRange: boolean;
};

type SkillGuideEnemy = {
  x: number;
  y: number;
  hp: number;
};

type SkillGuideSkill = {
  skill_package_id?: string;
  behavior_template?: string;
  runtime_params?: Record<string, unknown>;
  cast?: Record<string, unknown>;
  hit?: Record<string, unknown>;
  classification?: { damage_type?: string };
  damage_type?: string;
  visual_effect?: string;
  presentation_keys?: Record<string, unknown>;
  projectile_count?: number;
  area_multiplier?: number;
};

type SkillGuidePackage = {
  cast?: Record<string, unknown>;
  hit?: { hit_radius?: number };
  classification?: { damage_type?: string };
  behavior?: {
    template?: string;
    params?: Record<string, unknown>;
  };
  presentation?: {
    vfx?: unknown;
    projectile_vfx_key?: unknown;
  };
  modules?: {
    type?: string;
    params: Record<string, unknown>;
  }[];
};

type RuntimeModuleGuide = {
  type?: string;
  params: Record<string, unknown>;
};

type SkillGuideHelpers = {
  isProjectileSkillTemplate: (behaviorTemplate: string | undefined) => boolean;
  nearestGuideTarget: (source: Point, enemies: SkillGuideEnemy[], searchRange: number, maxDistance: number) => Point;
  guideDirection: (source: Point, target: Point) => Point;
  projectileSpawnWorldPosition: (player: Point, runtimeParams: Record<string, unknown>) => Point;
  projectileSpreadAngleDeg: (behaviorTemplate: string | undefined, runtimeParams: Record<string, unknown>) => number;
  projectileAngleStepDeg: (behaviorTemplate: string | undefined, runtimeParams: Record<string, unknown>) => number;
  projectileSpreadDirections: (direction: Point, projectileCount: number, spreadAngleDeg: number, angleStepDeg?: number) => Point[];
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
  rotateDirection: (direction: Point, angleDeg: number) => Point;
  formatPreviewNumber: (value: number) => string;
};

export function FrontendSkillGuideLayer({
  skills,
  player,
  enemies,
  guidePackage,
  debugOptions,
  helpers
}: {
  skills: SkillGuideSkill[];
  player: Point;
  enemies: SkillGuideEnemy[];
  guidePackage: SkillGuidePackage | null;
  debugOptions: SkillGuideDebugOptions;
  helpers: SkillGuideHelpers;
}) {
  const skill = skills.find((item) => item.skill_package_id && (
    helpers.isProjectileSkillTemplate(item.behavior_template)
    || item.behavior_template === "damage_zone"
    || item.behavior_template === "module_chain"
  ));
  if (!skill && !guidePackage) return null;
  const runtimeParams = guidePackage?.behavior?.params ?? skill?.runtime_params ?? {};
  const behaviorTemplate = guidePackage?.behavior?.template ?? skill?.behavior_template;
  const moduleChainDamageZone = behaviorTemplate === "module_chain"
    ? damageZoneModuleGuideParams(guidePackage, skill)
    : null;
  if (behaviorTemplate === "damage_zone") {
    return (
      <DamageZoneRuntimeGuide
        params={runtimeParams}
        cast={guidePackage?.cast ?? skill?.cast ?? {}}
        hitRadius={typeof skill?.hit?.hit_radius === "number" ? skill.hit.hit_radius : guidePackage?.hit?.hit_radius}
        damageType={guidePackage?.classification?.damage_type ?? skill?.damage_type ?? "physical"}
        vfxKey={String(runtimeParams.zone_vfx_key ?? guidePackage?.presentation?.vfx ?? skill?.presentation_keys?.vfx ?? skill?.visual_effect ?? "")}
        player={player}
        enemies={enemies}
        originPolicy={String(runtimeParams.origin_policy ?? "caster")}
        debugOptions={debugOptions}
        helpers={helpers}
      />
    );
  }
  if (moduleChainDamageZone) {
    return (
      <DamageZoneRuntimeGuide
        params={moduleChainDamageZone.params}
        cast={guidePackage?.cast ?? skill?.cast ?? {}}
        hitRadius={typeof skill?.hit?.hit_radius === "number" ? skill.hit.hit_radius : guidePackage?.hit?.hit_radius}
        damageType={guidePackage?.classification?.damage_type ?? skill?.damage_type ?? "physical"}
        vfxKey={String(moduleChainDamageZone.params.zone_vfx_key ?? moduleChainDamageZone.params.vfx_key ?? guidePackage?.presentation?.vfx ?? skill?.presentation_keys?.vfx ?? skill?.visual_effect ?? "")}
        player={player}
        enemies={enemies}
        originPolicy={String(moduleChainDamageZone.params.origin_policy ?? "trigger_position")}
        debugOptions={debugOptions}
        helpers={helpers}
      />
    );
  }
  if (!behaviorTemplate || !helpers.isProjectileSkillTemplate(behaviorTemplate)) return null;
  const guideVfxKind = projectileVfxKind(String(skill?.presentation_keys?.projectile_vfx_key ?? skill?.visual_effect ?? guidePackage?.presentation?.projectile_vfx_key ?? guidePackage?.presentation?.vfx ?? ""));
  const guideDebugLabel = guideVfxKind === "ice_shards" ? "冰棱" : guideVfxKind === "penetrating_shot" ? "贯穿射击" : "投射物";
  const cast = guidePackage?.cast ?? skill?.cast ?? {};
  const areaMultiplier = skill?.area_multiplier ?? 1;
  const projectileCount = Math.max(1, Math.round(Number(runtimeParams.projectile_count ?? skill?.projectile_count ?? 1)));
  const searchRange = Math.max(1, Number(cast.search_range ?? runtimeParams.max_distance ?? 520) * areaMultiplier);
  const maxDistance = Math.max(1, Number(runtimeParams.max_distance ?? searchRange));
  const collisionRadius = Math.max(1, Number(runtimeParams.collision_radius ?? runtimeParams.projectile_radius ?? 12));
  const spreadAngleDeg = helpers.projectileSpreadAngleDeg(behaviorTemplate, runtimeParams);
  const angleStepDeg = helpers.projectileAngleStepDeg(behaviorTemplate, runtimeParams);
  const source = helpers.projectileSpawnWorldPosition(player, runtimeParams);
  const target = helpers.nearestGuideTarget(source, enemies, searchRange, maxDistance);
  const direction = helpers.guideDirection(source, target);
  const directions = helpers.projectileSpreadDirections(direction, projectileCount, spreadAngleDeg, angleStepDeg);
  const sourceVisual = helpers.projectBattleWorldToScreen(source.x, source.y);
  const targetVisual = helpers.projectBattleWorldToScreen(target.x, target.y);
  const searchDiameter = searchRange * 2;
  const collisionDiameter = collisionRadius * 2;
  const guideDistance = Math.min(maxDistance, Math.hypot(target.x - source.x, target.y - source.y) || maxDistance);

  return (
    <div className="runtime-skill-guides" aria-label="编辑器运行辅助线" data-projectile-count={projectileCount}>
      {debugOptions.showSearchRange && (
        <div
          className="runtime-skill-search-ring"
          title="技能搜索范围线圈"
          style={{
            left: sourceVisual.x,
            top: sourceVisual.y,
            width: searchDiameter,
            height: searchDiameter
          }}
        />
      )}
      {debugOptions.showTargetPoint && (
        <span className="fire-bolt-debug-point fire-bolt-debug-target" style={{ left: targetVisual.x, top: targetVisual.y }} title="目标点" />
      )}
      {directions.map((projectileDirection, index) => {
        const start = source;
        const end = {
          x: start.x + projectileDirection.x * guideDistance,
          y: start.y + projectileDirection.y * guideDistance
        };
        const collision = {
          x: start.x + (end.x - start.x) * 0.68,
          y: start.y + (end.y - start.y) * 0.68
        };
        const startVisual = helpers.projectBattleWorldToScreen(start.x, start.y);
        const endVisual = helpers.projectBattleWorldToScreen(end.x, end.y);
        const collisionVisual = helpers.projectBattleWorldToScreen(collision.x, collision.y);
        const length = Math.hypot(endVisual.x - startVisual.x, endVisual.y - startVisual.y);
        const angle = Math.atan2(endVisual.y - startVisual.y, endVisual.x - startVisual.x);
        return (
          <div key={`runtime-guide-${index}`}>
            {debugOptions.showDirectionLines && (
              <span
                className="runtime-skill-trajectory-line"
                title="逻辑飞行方向"
                style={{
                  left: startVisual.x,
                  top: startVisual.y,
                  width: length,
                  transform: `rotate(${angle}rad)`
                }}
              />
            )}
            <FireBoltAlignmentDebug
              start={start}
              current={collision}
              hit={end}
              direction={projectileDirection}
              lineLength={length}
              lineAngle={angle}
              projectileIndex={index + 1}
              projectileCount={projectileCount}
              label={guideDebugLabel}
              debugOptions={debugOptions}
              projectBattleWorldToScreen={helpers.projectBattleWorldToScreen}
              worldDirectionToBattleScreenAngle={helpers.worldDirectionToBattleScreenAngle}
            />
            {debugOptions.showCollisionRadius && (
              <>
                <span
                  className="runtime-skill-collision-ring"
                  title={`投射物碰撞范围线圈：半径 ${helpers.formatPreviewNumber(collisionRadius)}`}
                  style={{
                    left: collisionVisual.x,
                    top: collisionVisual.y,
                    width: collisionDiameter,
                    height: collisionDiameter
                  }}
                />
                <span
                  className="runtime-projectile-collision-dimension"
                  title={`投射物碰撞范围线圈：半径 ${helpers.formatPreviewNumber(collisionRadius)}`}
                  style={{
                    left: collisionVisual.x,
                    top: collisionVisual.y
                  }}
                >
                  碰撞半径 {helpers.formatPreviewNumber(collisionRadius)}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function damageZoneModuleGuideParams(guidePackage: SkillGuidePackage | null, skill: SkillGuideSkill | undefined) {
  const packageModule = guidePackage?.modules?.find((module) => module.type === "damage_zone");
  if (packageModule) return packageModule;
  const runtimeModules = Array.isArray(skill?.runtime_params?.modules) ? skill?.runtime_params.modules : [];
  return runtimeModules.find((module): module is RuntimeModuleGuide => (
    typeof module === "object"
    && module !== null
    && (module as { type?: unknown }).type === "damage_zone"
    && typeof (module as { params?: unknown }).params === "object"
    && (module as { params?: unknown }).params !== null
  ));
}

function DamageZoneRuntimeGuide({
  params,
  cast,
  hitRadius,
  damageType,
  vfxKey,
  player,
  enemies,
  originPolicy,
  debugOptions,
  helpers
}: {
  params: Record<string, unknown>;
  cast: Record<string, unknown>;
  hitRadius?: number;
  damageType: string;
  vfxKey: string;
  player: Point;
  enemies: SkillGuideEnemy[];
  originPolicy: string;
  debugOptions: SkillGuideDebugOptions;
  helpers: SkillGuideHelpers;
}) {
  const shape = String(params.shape ?? "circle") === "rectangle" ? "rectangle" : "circle";
  const searchRange = Math.max(1, Number(cast.search_range ?? hitRadius ?? params.radius ?? params.length ?? 360));
  const target = helpers.nearestGuideTarget(player, enemies, searchRange, searchRange);
  const origin = originPolicy === "trigger_position" ? target : player;
  const originVisual = helpers.projectBattleWorldToScreen(origin.x, origin.y);
  const targetVisual = helpers.projectBattleWorldToScreen(target.x, target.y);
  const facingTarget = originPolicy === "trigger_position"
    ? helpers.nearestGuideTarget(origin, enemies, searchRange, searchRange)
    : target;
  const baseDirection = helpers.guideDirection(origin, facingTarget);
  const direction = shape === "rectangle"
    ? helpers.rotateDirection(baseDirection, Number(params.angle_offset_deg ?? 0))
    : { x: 0, y: 0 };
  const directionEnd = {
    x: origin.x + direction.x * Math.max(48, Math.min(searchRange, Number(params.length ?? hitRadius ?? searchRange))),
    y: origin.y + direction.y * Math.max(48, Math.min(searchRange, Number(params.length ?? hitRadius ?? searchRange)))
  };
  const directionEndVisual = helpers.projectBattleWorldToScreen(directionEnd.x, directionEnd.y);
  const guideLineLength = Math.hypot(directionEndVisual.x - originVisual.x, directionEndVisual.y - originVisual.y);
  const guideLineAngle = Math.atan2(directionEndVisual.y - originVisual.y, directionEndVisual.x - originVisual.x);
  const radius = Math.max(1, Number(params.radius ?? hitRadius ?? searchRange));
  const length = Math.max(1, Number(params.length ?? hitRadius ?? searchRange));
  const width = Math.max(1, Number(params.width ?? 96));
  const rectangleAngle = helpers.worldDirectionToBattleScreenAngle(direction, origin);
  const guideVisual = damageZoneGuideVisual(shape, vfxKey);
  const rangeLabel = shape === "rectangle"
    ? `damage_zone 矩形范围：长 ${helpers.formatPreviewNumber(length)}，宽 ${helpers.formatPreviewNumber(width)}`
    : `damage_zone 圆形范围：半径 ${helpers.formatPreviewNumber(radius)}`;
  const dimensionLabel = shape === "rectangle"
    ? `长 ${helpers.formatPreviewNumber(length)} / 宽 ${helpers.formatPreviewNumber(width)}`
    : `半径 ${helpers.formatPreviewNumber(radius)}`;
  const dimensionVisual = shape === "rectangle"
    ? helpers.projectBattleWorldToScreen(origin.x + direction.x * length * 0.5, origin.y + direction.y * length * 0.5)
    : helpers.projectBattleWorldToScreen(origin.x, origin.y - radius);

  return (
    <div className="runtime-skill-guides" aria-label="编辑器 damage_zone 范围辅助线" data-damage-zone-shape={shape}>
      {debugOptions.showSearchRange && (
        <div
          className="runtime-skill-search-ring"
          title="技能搜索范围线圈"
          style={{
            left: originVisual.x,
            top: originVisual.y,
            width: searchRange * 2,
            height: searchRange * 2
          }}
        />
      )}
      {debugOptions.showTargetPoint && (
        <>
          <span className="fire-bolt-debug-point fire-bolt-debug-logic-spawn" style={{ left: originVisual.x, top: originVisual.y }} title="damage_zone 原点" />
          <span className="fire-bolt-debug-point fire-bolt-debug-target" style={{ left: targetVisual.x, top: targetVisual.y }} title="damage_zone 参考目标" />
        </>
      )}
      <div
        className={`runtime-damage-zone-range runtime-damage-zone-geometry-${shape} runtime-damage-zone-guide-${guideVisual} damage-zone-${damageType} runtime-damage-zone-range-${cssToken(vfxKey)}`}
        title={rangeLabel}
        style={{
          left: originVisual.x,
          top: originVisual.y,
          width: shape === "circle" ? radius * 2 : length,
          height: shape === "circle" ? radius * 2 : width,
          transform: shape === "circle"
            ? "translate(-50%, -50%)"
            : `translate(0, -50%) rotate(${rectangleAngle}rad)`,
          ["--whirlwind-angle" as string]: `${Date.now() * 0.36}deg`
        }}
        data-zone-shape={shape}
        data-zone-radius={shape === "circle" ? radius : undefined}
        data-zone-length={shape === "rectangle" ? length : undefined}
        data-zone-width={shape === "rectangle" ? width : undefined}
      />
      <span
        className={`runtime-damage-zone-dimension runtime-damage-zone-dimension-${shape}`}
        style={{ left: dimensionVisual.x, top: dimensionVisual.y }}
        title={rangeLabel}
      >
        {dimensionLabel}
      </span>
      {shape === "rectangle" && debugOptions.showDirectionLines && (
        <span
          className="runtime-skill-trajectory-line runtime-damage-zone-facing-line"
          title="damage_zone 朝向"
          style={{
            left: originVisual.x,
            top: originVisual.y,
            width: guideLineLength,
            transform: `rotate(${guideLineAngle}rad)`
          }}
        />
      )}
    </div>
  );
}

type DamageZoneGuideVisual = "circle" | "rectangle" | "whirlwind";

function damageZoneGuideVisual(shape: "circle" | "rectangle", vfxKey: string): DamageZoneGuideVisual {
  const token = cssToken(vfxKey);
  if (token.includes("whirlwind")) return "whirlwind";
  return shape;
}
