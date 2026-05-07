type ScreenPoint = {
  x: number;
  y: number;
};

type DamageZoneView = {
  id: string;
  x: number;
  y: number;
  radius: number;
  width: number;
  length: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  warning?: boolean;
  shape: "circle" | "rectangle";
  directionX?: number;
  directionY?: number;
  vfxScale?: unknown;
  vfxKey: string;
  zoneId?: string;
  skillId?: string;
  damageType: string;
};

type AreaNovaView = {
  id: string;
  x: number;
  y: number;
  radius: number;
  ringWidth: number;
  ttl: number;
  duration: number;
  vfxScale?: unknown;
  vfxKey?: string;
  areaId?: string;
  skillId?: string;
  damageType: string;
};

export function DamageZoneLayer<TZone extends DamageZoneView>({
  zones,
  projectPoint,
  directionAngle,
  normalizeVfxScale,
  cssToken,
  zIndex
}: {
  zones: TZone[];
  projectPoint: (worldX: number, worldY: number) => ScreenPoint;
  directionAngle: (direction: { x: number; y: number }, origin: { x: number; y: number }) => number;
  normalizeVfxScale: (value: unknown) => number;
  cssToken: (value: string | undefined) => string;
  zIndex: number;
}) {
  return (
    <>
      {zones.map((zone) => {
        const position = projectPoint(zone.x, zone.y);
        const progress = clamp(1 - zone.ttl / zone.duration, 0, 1);
        const elapsedMs = Math.max(0, (zone.duration - zone.ttl) * 1000);
        const fillProgress = zone.warning
          ? progress
          : zone.hitAtMs && zone.hitAtMs > 0
            ? clamp(elapsedMs / zone.hitAtMs, 0, 1)
            : 1;
        const angle = zone.shape === "rectangle"
          ? directionAngle({ x: zone.directionX || 1, y: zone.directionY || 0 }, { x: zone.x, y: zone.y })
          : 0;
        const vfxScale = normalizeVfxScale(zone.vfxScale);
        return (
          <div
            key={zone.id}
            className={`damage-zone-vfx damage-zone-vfx-${zone.shape} damage-zone-${zone.damageType} damage-zone-vfx-${cssToken(zone.vfxKey)} ${zone.warning ? "damage-zone-vfx-warning" : ""}`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${(zone.shape === "circle" ? zone.radius * 2 : zone.length) * vfxScale}px`,
              height: `${(zone.shape === "circle" ? zone.radius * 2 : zone.width) * vfxScale}px`,
              transform: zone.shape === "rectangle"
                ? `translate(0, -50%) rotate(${angle}rad)`
                : "translate(-50%, -50%)",
              opacity: zone.warning ? Math.max(0.2, 0.65 - progress * 0.35) : Math.max(0, 1 - progress * 0.75),
              zIndex,
              ["--damage-zone-fill-scale" as string]: fillProgress,
              ["--whirlwind-angle" as string]: `${elapsedMs * 0.72}deg`,
            }}
            data-skill-event={zone.warning ? "damage_zone_prime" : "damage_zone"}
            data-vfx-key={zone.vfxKey}
            data-zone-id={zone.zoneId}
            data-skill-id={zone.skillId}
            data-damage-type={zone.damageType}
          >
            <span className="damage-zone-vfx-core" aria-hidden="true" />
            <span className="damage-zone-vfx-cracks" aria-hidden="true" />
            <span className="damage-zone-vfx-spikes" aria-hidden="true" />
            <span className="damage-zone-vfx-burst" aria-hidden="true" />
          </div>
        );
      })}
    </>
  );
}

export function AreaNovaLayer<TNova extends AreaNovaView>({
  novas,
  projectPoint,
  normalizeVfxScale,
  visualTone,
  zIndex
}: {
  novas: TNova[];
  projectPoint: (worldX: number, worldY: number) => ScreenPoint;
  normalizeVfxScale: (value: unknown) => number;
  visualTone: (value: string | undefined) => string;
  zIndex: number;
}) {
  return (
    <>
      {novas.map((nova) => {
        const visualPoint = projectPoint(nova.x, nova.y);
        const duration = Math.max(0.001, nova.duration);
        const progress = clamp(1 - nova.ttl / duration, 0, 1);
        const opacity = Math.max(0, nova.ttl / duration);
        const vfxScale = normalizeVfxScale(nova.vfxScale);
        const diameter = Math.max(1, nova.radius * 2 * (0.18 + progress * 0.82) * vfxScale);
        const ringWidth = Math.max(3, nova.ringWidth * (0.45 + progress * 0.55) * vfxScale);
        return (
          <div
            key={nova.id}
            className={`player-nova-vfx player-nova-vfx-${visualTone(nova.vfxKey || nova.damageType)}`}
            style={{
              left: visualPoint.x,
              top: visualPoint.y,
              width: diameter,
              height: diameter,
              opacity,
              borderWidth: ringWidth,
              zIndex,
            }}
            data-skill-event="area_spawn"
            data-vfx-key={nova.vfxKey}
            data-area-id={nova.areaId}
            data-skill-id={nova.skillId}
            data-center-world-x={nova.x}
            data-center-world-y={nova.y}
            data-radius={nova.radius}
            data-ring-width={nova.ringWidth}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
