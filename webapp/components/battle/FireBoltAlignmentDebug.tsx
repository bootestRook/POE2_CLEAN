import { useMemo } from "react";

type Point = { x: number; y: number };

export type FireBoltAlignmentDebugOptions = {
  showLaunchPoints: boolean;
  showDirectionLines: boolean;
  showCollisionRadius: boolean;
  showTargetPoint: boolean;
};

export function FireBoltAlignmentDebug({
  start,
  current,
  hit,
  direction,
  lineLength,
  lineAngle,
  projectileIndex,
  projectileCount,
  label = "\u6295\u5c04\u7269",
  debugOptions,
  projectBattleWorldToScreen,
  worldDirectionToBattleScreenAngle
}: {
  start: Point;
  current: Point;
  hit: Point;
  direction: Point;
  lineLength: number;
  lineAngle: number;
  projectileIndex?: number;
  projectileCount?: number;
  label?: string;
  debugOptions: FireBoltAlignmentDebugOptions;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
}) {
  const { startVisual, currentVisual, hitVisual, facingAngle } = useMemo(() => ({
    startVisual: projectBattleWorldToScreen(start.x, start.y),
    currentVisual: projectBattleWorldToScreen(current.x, current.y),
    hitVisual: projectBattleWorldToScreen(hit.x, hit.y),
    facingAngle: worldDirectionToBattleScreenAngle(direction, start)
  }), [current.x, current.y, direction.x, direction.y, hit.x, hit.y, projectBattleWorldToScreen, start.x, start.y, worldDirectionToBattleScreenAngle]);
  const suffix = projectileIndex && projectileCount ? `\uff08${projectileIndex}/${projectileCount}\uff09` : "";
  return (
    <div className="fire-bolt-alignment-debug" aria-label={`${label}\u5bf9\u9f50\u8c03\u8bd5\u5c42`} data-projectile-index={projectileIndex} data-projectile-count={projectileCount}>
      {debugOptions.showLaunchPoints && (
        <>
          <span className="fire-bolt-debug-point fire-bolt-debug-logic-spawn" style={{ left: startVisual.x, top: startVisual.y }} title={`${label}\u903b\u8f91\u53d1\u5c04\u70b9${suffix}`} />
          <span className="fire-bolt-debug-point fire-bolt-debug-vfx-spawn" style={{ left: startVisual.x, top: startVisual.y }} title={`${label}\u7279\u6548\u53d1\u5c04\u70b9${suffix}`} />
        </>
      )}
      {debugOptions.showDirectionLines && (
        <>
          <span
            className="fire-bolt-debug-line fire-bolt-debug-direction"
            style={{ left: startVisual.x, top: startVisual.y, width: lineLength, transform: `rotate(${lineAngle}rad)` }}
            title={`${label}\u903b\u8f91\u98de\u884c\u65b9\u5411${suffix}`}
          />
          <span
            className="fire-bolt-debug-line fire-bolt-debug-facing"
            style={{ left: startVisual.x, top: startVisual.y, width: Math.min(72, lineLength), transform: `rotate(${facingAngle}rad)` }}
            title={`${label}\u7279\u6548\u671d\u5411${suffix}`}
          />
        </>
      )}
      {debugOptions.showCollisionRadius && <span className="fire-bolt-debug-point fire-bolt-debug-center" style={{ left: currentVisual.x, top: currentVisual.y }} title={`${label}\u5f53\u524d\u4e2d\u5fc3${suffix}`} />}
      {debugOptions.showTargetPoint && <span className="fire-bolt-debug-point fire-bolt-debug-hit" style={{ left: hitVisual.x, top: hitVisual.y }} title={`${label}\u547d\u4e2d\u70b9${suffix}`} />}
    </div>
  );
}
