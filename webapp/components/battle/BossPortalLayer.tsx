type BossPortalView = {
  portal_id: string;
  position: { x: number; y: number };
  used?: boolean;
};

type CameraView = {
  screenX: number;
  screenY: number;
  zoom: number;
};

type ScreenPoint = {
  x: number;
  y: number;
};

export function BossPortalLayer<TPortal extends BossPortalView, TCamera extends CameraView>({
  portal,
  camera,
  projectPosition,
  onUse
}: {
  portal: TPortal | null;
  camera: TCamera;
  projectPosition: (worldPosition: { x: number; y: number }, camera: TCamera) => ScreenPoint;
  onUse: (portal: TPortal) => void;
}) {
  if (!portal || portal.used) return null;
  const position = projectPosition(portal.position, camera);
  return (
    <div className="boss-portal-layer" aria-label="Boss exit portal">
      <button
        type="button"
        className="boss-portal"
        style={{ left: position.x, top: position.y }}
        onClick={() => onUse(portal)}
        title="Boss exit"
      >
        <span className="boss-portal-label">{"Boss \u51fa\u53e3"}</span>
        <span className="boss-portal-gate" aria-hidden="true">
          <span className="boss-portal-door" />
        </span>
      </button>
    </div>
  );
}
