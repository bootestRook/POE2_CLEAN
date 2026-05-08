type ChainSegmentView = {
  id: string | number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ttl: number;
  duration: number;
  vfxScale?: unknown;
  vfxKey?: string;
  damageType: string;
  segmentIndex: number;
  segmentId?: string;
  skillId?: string;
};

type ScreenPoint = {
  x: number;
  y: number;
};

export function ChainSegmentLayer<TSegment extends ChainSegmentView>({
  segments,
  projectPoint,
  normalizeVfxScale,
  visualTone,
  zIndex
}: {
  segments: TSegment[];
  projectPoint: (worldX: number, worldY: number) => ScreenPoint;
  normalizeVfxScale: (value: unknown) => number;
  visualTone: (value: string | undefined) => string;
  zIndex: number;
}) {
  return (
    <>
      {segments.map((segment) => {
        const start = projectPoint(segment.startX, segment.startY);
        const end = projectPoint(segment.endX, segment.endY);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        const progress = clamp(1 - segment.ttl / Math.max(0.001, segment.duration), 0, 1);
        const vfxScale = normalizeVfxScale(segment.vfxScale);
        return (
          <div
            key={segment.id}
            className={`chain-segment-vfx chain-segment-vfx-${visualTone(segment.vfxKey || segment.damageType)}`}
            style={{
              left: start.x,
              top: start.y,
              width: length,
              opacity: Math.max(0, 1 - progress * 0.65),
              transform: `rotate(${angle}rad) scaleY(${vfxScale})`,
              zIndex,
            }}
            data-skill-event="chain_segment"
            data-vfx-key={segment.vfxKey}
            data-chain-segment-index={segment.segmentIndex}
            data-segment-id={segment.segmentId}
            data-skill-id={segment.skillId}
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
