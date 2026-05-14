import { ReactNode } from "react";
import { BattleGeometryCanvas } from "../../BattleGeometryCanvas";
import type { BattleGeometrySnapshot } from "../../battleGeometryRenderer";
import { BakedMapBackground, MapDebugOverlay } from "../../components/battle/BattleMapDebugLayers";
import { AreaNovaLayer, DamageZoneLayer, FloatingTextLayer, MeleeArcLayer, PassiveAuraLayer } from "../../components/battle/BattleGroundVfxLayers";
import { BossHealthBar } from "../../components/battle/BossHealthBar";
import { BossPortalLayer } from "../../components/battle/BossPortalLayer";
import { ChainSegmentLayer } from "../../components/battle/ChainSegmentLayer";
import { GroundDropLayer } from "../../components/battle/GroundDropLayer";
import { PlayerBuffLayer as BattlePlayerBuffLayer } from "../../components/battle/HitAndBuffViews";
import { PlayableBattleMinimap } from "../../components/battle/PlayableBattleMinimap";
import { PlayerOverheadResourceBars, type PlayerDisplacementSkillCooldownView } from "../../components/battle/PlayerOverheadResourceBars";
import { FrontendSkillGuideLayer } from "../../components/battle/SkillGuideOverlay";
import { RestAreaMapInteractableLayer } from "../../components/rest-area/RestAreaScene";
import type { RestAreaInteractionKind } from "../../components/rest-area/RestAreaScene";

type AnyBattleObject = any;

type PlayableBattleSceneProps = {
  activeBossEnemy: AnyBattleObject | null;
  showBattleMapLayer: boolean;
  battleMap: AnyBattleObject | null;
  editorBattleMap: AnyBattleObject | null;
  mapDebugEnabled: boolean;
  terrainWidth: number;
  terrainHeight: number;
  terrainTransform: string;
  battleCamera: AnyBattleObject;
  gameViewport: { width: number; height: number };
  animationNowMs: number;
  player: AnyBattleObject;
  playerMoving: boolean;
  guardActive: boolean;
  visibleEnemies: AnyBattleObject[];
  anchoredBolts: AnyBattleObject[];
  anchoredHitVfxs: AnyBattleObject[];
  passiveVisualEffects: AnyBattleObject[];
  areaNovas: AnyBattleObject[];
  damageZones: AnyBattleObject[];
  meleeArcs: AnyBattleObject[];
  chainSegments: AnyBattleObject[];
  texts: AnyBattleObject[];
  activePlayerBuffs: AnyBattleObject[];
  sortedRenderItems: AnyBattleObject[];
  battleAnimationContexts: AnyBattleObject;
  renderBattleRenderItem: (item: AnyBattleObject, depthIndex: number, animationContexts: AnyBattleObject) => ReactNode;
  shouldRenderLegacyBattleItem: (item: AnyBattleObject) => boolean;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  worldDirectionToBattleScreenAngle: (direction: { x: number; y: number }, origin: { x: number; y: number }) => number;
  battleWorldToViewport: (worldPosition: { x: number; y: number }, camera: AnyBattleObject) => { x: number; y: number };
  normalizedVfxScale: (value: unknown) => number;
  visualTone: (value: string | undefined) => string;
  cssToken: (value: string | undefined) => string;
  activeDamageZoneTickProgress: (zoneId: string) => number | null;
  canvasGeometrySkillEffects: boolean;
  battleEntityZIndexBase: number;
  floatingTextVisualRiseSpeed: number;
  skillEditorMode: boolean;
  activeSkills: AnyBattleObject[];
  enemies: AnyBattleObject[];
  skillEditorGuidePackage: AnyBattleObject | null;
  skillEditorDebugOptions: AnyBattleObject;
  skillGuideHelpers: AnyBattleObject;
  drops: AnyBattleObject[];
  dropDisplayPositions: Map<string, { x: number; y: number }>;
  beginDropPickup: (drop: AnyBattleObject) => void;
  bossPortal: AnyBattleObject | null;
  beginBossPortalUse: (portal: AnyBattleObject) => void;
  restAreaMapActive: boolean;
  restAreaInteractionTarget: RestAreaInteractionKind | null;
  interactWithRestArea: (kind: RestAreaInteractionKind) => void;
  playableMinimapVisible: boolean;
  exploredMinimapCells: Set<string>;
  playableMinimapMode: "compact" | "expanded";
  displacementSkillCooldown: PlayerDisplacementSkillCooldownView | null;
  onBattlePointerMove: (clientX: number, clientY: number) => void;
};

export function PlayableBattleScene({
  activeBossEnemy,
  showBattleMapLayer,
  battleMap,
  editorBattleMap,
  mapDebugEnabled,
  terrainWidth,
  terrainHeight,
  terrainTransform,
  battleCamera,
  gameViewport,
  animationNowMs,
  player,
  playerMoving,
  guardActive,
  visibleEnemies,
  anchoredBolts,
  anchoredHitVfxs,
  passiveVisualEffects,
  areaNovas,
  damageZones,
  meleeArcs,
  chainSegments,
  texts,
  activePlayerBuffs,
  sortedRenderItems,
  battleAnimationContexts,
  renderBattleRenderItem,
  shouldRenderLegacyBattleItem,
  projectBattleWorldToScreen,
  worldDirectionToBattleScreenAngle,
  battleWorldToViewport,
  normalizedVfxScale,
  visualTone,
  cssToken,
  activeDamageZoneTickProgress,
  canvasGeometrySkillEffects,
  battleEntityZIndexBase,
  floatingTextVisualRiseSpeed,
  skillEditorMode,
  activeSkills,
  enemies,
  skillEditorGuidePackage,
  skillEditorDebugOptions,
  skillGuideHelpers,
  drops,
  dropDisplayPositions,
  beginDropPickup,
  bossPortal,
  beginBossPortalUse,
  restAreaMapActive,
  restAreaInteractionTarget,
  interactWithRestArea,
  playableMinimapVisible,
  exploredMinimapCells,
  playableMinimapMode,
  displacementSkillCooldown,
  onBattlePointerMove
}: PlayableBattleSceneProps) {
  const battleGeometrySnapshot: BattleGeometrySnapshot = {
    width: terrainWidth,
    height: terrainHeight,
    timeMs: animationNowMs,
    camera: battleCamera,
    terrain: editorBattleMap ? {
      tiles: editorBattleMap.editorTiles,
      tileSize: editorBattleMap.meta.grid_size,
      width: editorBattleMap.meta.world_width,
      height: editorBattleMap.meta.world_height
    } : undefined,
    player: {
      ...player,
      moving: playerMoving,
      guardActive
    },
    enemies: visibleEnemies.map((enemy) => ({
      id: enemy.id,
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      lastDamagedAt: enemy.lastDamagedAt,
      monsterId: enemy.monsterId,
      spawnRarity: enemy.spawnRarity,
      visualPrimaryColor: enemy.visualPrimaryColor,
      boss: enemy.boss,
      runtimeTier: enemy.runtimeTier
    })),
    projectiles: anchoredBolts.map((bolt) => ({
      id: bolt.id,
      x: bolt.x,
      y: bolt.y,
      targetX: bolt.targetX,
      targetY: bolt.targetY,
      velocityX: bolt.velocityX,
      velocityY: bolt.velocityY,
      directionX: bolt.directionX,
      directionY: bolt.directionY,
      trajectory: bolt.trajectory,
      arcHeight: bolt.arcHeight,
      projectileVisualMode: bolt.projectileVisualMode,
      projectileWidth: bolt.projectileWidth,
      projectileHeight: bolt.projectileHeight,
      splitProjectile: bolt.splitProjectile,
      projectileSpeed: bolt.projectileSpeed,
      damageType: bolt.damageType,
      vfxKey: bolt.vfxKey,
      ttl: bolt.ttl,
      duration: bolt.duration,
      fadeDuration: bolt.fadeDuration
    })),
    areas: [
      ...passiveVisualEffects.map((gem, index) => ({
        id: index,
        kind: "passive-aura" as const,
        x: player.x,
        y: player.y,
        radius: 92 + index * 16,
        vfxKey: gem.visual_effect || gem.instance_id,
        ttl: 1,
        duration: 1
      })),
      ...areaNovas.map((nova) => ({
        id: nova.id,
        kind: "nova" as const,
        x: nova.followPlayer ? player.x : nova.x,
        y: nova.followPlayer ? player.y : nova.y,
        radius: nova.radius,
        ringWidth: nova.ringWidth,
        damageType: nova.damageType,
        vfxKey: nova.vfxKey,
        vfxScale: nova.vfxScale,
        ttl: nova.ttl,
        duration: nova.duration
      })),
      ...damageZones.map((zone) => ({
        id: zone.id,
        kind: "damage-zone" as const,
        x: zone.followPlayer ? player.x : zone.x,
        y: zone.followPlayer ? player.y : zone.y,
        radius: zone.shape === "circle" ? zone.radius : undefined,
        width: zone.shape === "rectangle" ? zone.length : undefined,
        height: zone.shape === "rectangle" ? zone.width : undefined,
        directionX: zone.directionX,
        directionY: zone.directionY,
        damageType: zone.damageType,
        vfxKey: zone.vfxKey,
        warning: zone.warning,
        hitAtMs: zone.hitAtMs,
        elapsedMs: animationNowMs,
        tickProgress: activeDamageZoneTickProgress(zone.zoneId) ?? zone.tickProgress,
        ttl: zone.ttl,
        duration: zone.duration
      })),
      ...meleeArcs.map((arc) => ({
        id: arc.id,
        kind: "melee-arc" as const,
        x: arc.x,
        y: arc.y,
        radius: arc.radius,
        directionX: arc.directionX,
        directionY: arc.directionY,
        arcAngle: arc.arcAngle,
        damageType: arc.damageType,
        vfxKey: arc.vfxKey,
        ttl: arc.ttl,
        duration: arc.duration
      })),
      ...chainSegments.map((segment) => ({
        id: segment.id,
        kind: "chain" as const,
        startX: segment.startX,
        startY: segment.startY,
        endX: segment.endX,
        endY: segment.endY,
        damageType: segment.damageType,
        vfxKey: segment.vfxKey,
        ttl: segment.ttl,
        duration: segment.duration
      }))
    ],
    hits: anchoredHitVfxs.map((vfx) => ({
      id: vfx.id,
      x: vfx.x,
      y: vfx.y,
      radius: Math.max(vfx.impactRadius ?? 0, vfx.projectileWidth ?? 0, vfx.projectileHeight ?? 0) * 0.5,
      damageType: vfx.damageType,
      vfxKey: vfx.vfxKey,
      shapeEffects: (vfx.shapeEffects ?? []).map((effect: { id: string }) => effect.id),
      ttl: vfx.ttl,
      duration: vfx.duration
    })),
    texts: texts.map((text) => ({
      id: text.id,
      x: text.x,
      y: text.y,
      text: text.text,
      damageType: text.damageType,
      ttl: text.ttl,
      duration: text.duration
    }))
  };

  return (
    <>
      {activeBossEnemy && <BossHealthBar enemy={activeBossEnemy} />}
      {showBattleMapLayer && <section className="map-layer" aria-label="可玩地图" onPointerMove={(event) => onBattlePointerMove(event.clientX, event.clientY)}>
        <div
          className="terrain"
          data-map-template-id={battleMap?.id ?? ""}
          data-map-instance-rotation={editorBattleMap?.mapInstance?.rotation ?? 0}
          style={{
            width: terrainWidth,
            height: terrainHeight,
            transform: terrainTransform
          }}
        >
          <div className="terrain-ground">
            {battleMap && <BakedMapBackground map={battleMap} />}
            {battleMap && <MapDebugOverlay map={battleMap} enabled={mapDebugEnabled} />}
          </div>
          {!canvasGeometrySkillEffects && (
            <div className="battle-ground-decal-layer">
              <PassiveAuraLayer
                effects={passiveVisualEffects}
                x={player.x}
                y={player.y}
                projectPoint={projectBattleWorldToScreen}
                visualTone={visualTone}
              />
              <DamageZoneLayer
                zones={damageZones}
                projectPoint={projectBattleWorldToScreen}
                directionAngle={worldDirectionToBattleScreenAngle}
                normalizeVfxScale={normalizedVfxScale}
                cssToken={cssToken}
                zIndex={battleEntityZIndexBase - 2}
              />
              <AreaNovaLayer
                novas={areaNovas}
                projectPoint={projectBattleWorldToScreen}
                normalizeVfxScale={normalizedVfxScale}
                visualTone={visualTone}
                zIndex={battleEntityZIndexBase - 2}
              />
              <MeleeArcLayer
                arcs={meleeArcs}
                projectPoint={projectBattleWorldToScreen}
                directionAngle={worldDirectionToBattleScreenAngle}
                normalizeVfxScale={normalizedVfxScale}
                visualTone={visualTone}
                zIndex={battleEntityZIndexBase - 1}
              />
              <ChainSegmentLayer
                segments={chainSegments}
                projectPoint={projectBattleWorldToScreen}
                normalizeVfxScale={normalizedVfxScale}
                visualTone={visualTone}
                zIndex={battleEntityZIndexBase - 1}
              />
            </div>
          )}
          <div className="battle-entity-layer">
            {sortedRenderItems
              .filter(shouldRenderLegacyBattleItem)
              .map((item, index) => renderBattleRenderItem(item, index, battleAnimationContexts))}
          </div>
          <div className="battle-effect-layer">
            <BattlePlayerBuffLayer
              buffs={activePlayerBuffs}
              player={player}
              projectBattleWorldToScreen={projectBattleWorldToScreen}
            />
            {skillEditorMode && (
              <FrontendSkillGuideLayer
                skills={activeSkills}
                player={player}
                enemies={enemies}
                guidePackage={skillEditorGuidePackage}
                debugOptions={skillEditorDebugOptions}
                helpers={skillGuideHelpers}
              />
            )}
          </div>
          <div className="battle-text-layer">
            {/* Legacy damage-number DOM fallback stays gated: !canvasGeometrySkillEffects && texts.map */}
            {!canvasGeometrySkillEffects && (
              <FloatingTextLayer
                texts={texts}
                projectPoint={projectBattleWorldToScreen}
                cssToken={cssToken}
                riseSpeed={floatingTextVisualRiseSpeed}
              />
            )}
          </div>
        </div>
        <BattleGeometryCanvas snapshot={battleGeometrySnapshot} viewportWidth={gameViewport.width} viewportHeight={gameViewport.height} />
        <PlayerOverheadResourceBars player={player} displacementSkillCooldown={displacementSkillCooldown} projectPosition={(worldPosition) => battleWorldToViewport(worldPosition, battleCamera)} />
        <GroundDropLayer
          drops={drops}
          displayPositions={dropDisplayPositions}
          projectPosition={(worldPosition) => battleWorldToViewport(worldPosition, battleCamera)}
          onPickup={beginDropPickup}
        />
        <BossPortalLayer portal={bossPortal} camera={battleCamera} projectPosition={battleWorldToViewport} onUse={beginBossPortalUse} />
        {restAreaMapActive && (
          <RestAreaMapInteractableLayer
            map={battleMap}
            camera={battleCamera}
            projectPosition={battleWorldToViewport}
            interactionTarget={restAreaInteractionTarget}
            onInteract={interactWithRestArea}
          />
        )}
        {playableMinimapVisible && battleMap && (
          <PlayableBattleMinimap
            map={battleMap}
            player={player}
            exploredCells={exploredMinimapCells}
            mode={playableMinimapMode}
          />
        )}
      </section>}
    </>
  );
}
