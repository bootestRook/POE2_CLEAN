import type { CSSProperties } from "react";
import type { BakedBattleMapData } from "../../bakedMapLoader";

type RestAreaInteractionKind = "stage" | "stash";
type RestAreaCamera = {
  screenX: number;
  screenY: number;
  zoom: number;
};

export const REST_AREA_INTERACTION_RADIUS = 96;

const REST_AREA_WIDTH = 1640;
const REST_AREA_HEIGHT = 1000;
const REST_AREA_INTERACTABLES = {
  wangYang: { kind: "stage" as const, id: "wang-yang", label: "鐜嬮槼", x: 330, y: 330 },
  stash: { kind: "stash" as const, id: "stash", label: "浠撳簱", x: 760, y: 335 }
} as const;
const WANG_YANG_NPC_SPRITE = new URL("../../assets/rest-area-wang-yang.svg", import.meta.url).href;

export function RestAreaScene({
  player,
  playerRotation,
  interactionTarget,
  onInteract
}: {
  player: { x: number; y: number };
  playerRotation: number;
  interactionTarget: RestAreaInteractionKind | null;
  onInteract: (kind: RestAreaInteractionKind) => void;
}) {
  return (
    <section className="rest-area-scene" aria-label="浼戞伅鍖?" data-rest-area="true">
      <div className="rest-area-room" style={{ width: REST_AREA_WIDTH, height: REST_AREA_HEIGHT }}>
        <div className="rest-area-floor" aria-hidden="true" />
        <button
          type="button"
          className={`rest-area-name-label rest-area-wang-yang-label${interactionTarget === "stage" ? " pending" : ""}`}
          style={{ left: REST_AREA_INTERACTABLES.wangYang.x, top: REST_AREA_INTERACTABLES.wangYang.y - 62 }}
          onClick={() => onInteract("stage")}
        >
          {REST_AREA_INTERACTABLES.wangYang.label}
        </button>
        <div className="rest-area-npc" style={{ left: REST_AREA_INTERACTABLES.wangYang.x, top: REST_AREA_INTERACTABLES.wangYang.y }}>
          <img src={WANG_YANG_NPC_SPRITE} alt="鐜嬮槼" draggable={false} />
        </div>
        <button
          type="button"
          className={`rest-area-name-label rest-area-stash-label${interactionTarget === "stash" ? " pending" : ""}`}
          style={{ left: REST_AREA_INTERACTABLES.stash.x, top: REST_AREA_INTERACTABLES.stash.y - 48 }}
          onClick={() => onInteract("stash")}
        >
          {REST_AREA_INTERACTABLES.stash.label}
        </button>
        <div className="rest-area-stash-prop" style={{ left: REST_AREA_INTERACTABLES.stash.x, top: REST_AREA_INTERACTABLES.stash.y }} aria-hidden="true">
          <span />
        </div>
        <div className="rest-area-player-marker" style={{ left: player.x, top: player.y, "--rest-player-rotation": `${playerRotation}rad` } as CSSProperties} aria-label="鐜╁" />
      </div>
    </section>
  );
}

export function RestAreaMapInteractableLayer({
  map,
  camera,
  interactionTarget,
  projectPosition,
  onInteract
}: {
  map: BakedBattleMapData | null;
  camera: RestAreaCamera;
  interactionTarget: RestAreaInteractionKind | null;
  projectPosition: (worldPosition: { x: number; y: number }, camera: RestAreaCamera) => { x: number; y: number };
  onInteract: (kind: RestAreaInteractionKind) => void;
}) {
  const wangYang = projectPosition(restAreaInteractablePosition("stage", map), camera);
  const stash = projectPosition(restAreaInteractablePosition("stash", map), camera);
  return (
    <div className="rest-area-map-interactable-layer" aria-label="浼戞伅鍖轰氦浜掔偣">
      <button
        type="button"
        className={`rest-area-map-label${interactionTarget === "stage" ? " pending" : ""}`}
        style={{ left: wangYang.x, top: wangYang.y - 58 }}
        onClick={() => onInteract("stage")}
      >
        {REST_AREA_INTERACTABLES.wangYang.label}
      </button>
      <img
        className="rest-area-map-npc"
        src={WANG_YANG_NPC_SPRITE}
        alt=""
        draggable={false}
        style={{ left: wangYang.x, top: wangYang.y }}
      />
      <button
        type="button"
        className={`rest-area-map-label${interactionTarget === "stash" ? " pending" : ""}`}
        style={{ left: stash.x, top: stash.y - 44 }}
        onClick={() => onInteract("stash")}
      >
        {REST_AREA_INTERACTABLES.stash.label}
      </button>
      <span className="rest-area-map-stash" style={{ left: stash.x, top: stash.y }} aria-hidden="true" />
    </div>
  );
}

export function restAreaInteractablePosition(kind: RestAreaInteractionKind, map: BakedBattleMapData | null | undefined) {
  if (!map) return REST_AREA_INTERACTABLES[kind === "stage" ? "wangYang" : "stash"];
  const offset = kind === "stage" ? { x: -220, y: -40 } : { x: 220, y: -40 };
  return {
    x: clamp(map.playerSpawn.x + offset.x, 80, map.meta.world_width - 80),
    y: clamp(map.playerSpawn.y + offset.y, 80, map.meta.world_height - 80)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
