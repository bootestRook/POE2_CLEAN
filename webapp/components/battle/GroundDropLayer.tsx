import { cssToken } from "../../utils/vfxTone";

type GroundDropView = {
  drop_id: string;
  name_text: string;
  picked_up?: boolean;
  position?: { x: number; y: number } | null;
  loot_kind?: string;
  equipment_rarity?: string;
  rarity_text?: string;
};

type GroundDropLayerProps<TDrop extends GroundDropView> = {
  drops: TDrop[];
  displayPositions: Map<string, { x: number; y: number }>;
  projectPosition: (worldPosition: { x: number; y: number }) => { x: number; y: number };
  onPickup: (drop: TDrop) => void;
};

export function GroundDropLayer<TDrop extends GroundDropView>({
  drops,
  displayPositions,
  projectPosition,
  onPickup
}: GroundDropLayerProps<TDrop>) {
  const visibleDrops = drops.filter((drop) => !drop.picked_up && drop.position);
  if (visibleDrops.length === 0) return null;
  return (
    <div className="ground-drop-layer" aria-label="地面掉落">
      {visibleDrops.map((drop) => {
        const position = projectPosition(displayPositions.get(drop.drop_id) ?? drop.position!);
        const kind = drop.loot_kind || "gem";
        const rarityTone = kind === "equipment" ? equipmentRarityTone(drop.equipment_rarity ?? drop.rarity_text) : "";
        return (
          <button
            key={drop.drop_id}
            type="button"
            className={`ground-drop ground-drop-${cssToken(kind)}${rarityTone ? ` ground-drop-rarity-${rarityTone}` : ""}`}
            style={{ left: position.x, top: position.y }}
            onClick={() => onPickup(drop)}
            title={drop.name_text}
          >
            <span className="ground-drop-label">{drop.name_text}</span>
            <span className="ground-drop-icon" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function equipmentRarityTone(rarity: unknown) {
  const key = String(rarity ?? "").trim().toLowerCase();
  if (key === "white" || key === "白色" || key === "普通") return "white";
  if (key === "blue" || key === "蓝色" || key === "魔法") return "blue";
  if (key === "purple" || key === "紫色" || key === "稀有") return "purple";
  if (key === "pink" || key === "粉色" || key === "传奇") return "pink";
  return "white";
}
