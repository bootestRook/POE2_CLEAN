import { CSSProperties, useEffect, useState } from "react";
import { getAnimationFrame } from "../../unitAnimation";
import type { UnitAnimationFrame } from "../../unitAnimation";
import { UNIT_ANIMATION_ASSETS, UNIT_ANIMATION_BY_KEY, unitAnimationKey } from "../../unitAssets";
import type { UnitAnimationAsset, UnitAnimationState, UnitDirection, UnitVisualType } from "../../unitAssets";
import { UnitAnimationSprite } from "../battle/UnitAnimationSprite";

const SPRITE_TEST_DIRECTIONS: UnitDirection[] = ["left", "right"];
const SPRITE_TEST_ACTIONS: UnitAnimationState[] = ["idle", "walk", "attack"];
const SPRITE_TEST_SPEEDS = [0.25, 0.5, 1, 2];
const SPRITE_TEST_DIRECTION_TEXT: Record<UnitDirection, string> = {
  up: "上",
  down: "下",
  left: "左",
  right: "右",
  up_left: "左上",
  up_right: "右上",
  down_left: "左下",
  down_right: "右下"
};
const SPRITE_TEST_ACTION_TEXT: Record<UnitAnimationState, string> = {
  idle: "待机",
  walk: "行走",
  attack: "攻击"
};
const SPRITE_TEST_RESOURCE_TEXT: Record<UnitVisualType, string> = {
  player_adventurer: "玩家角色 sprite",
  enemy_imp: "普通怪物 sprite",
  enemy_brute: "精英怪物 sprite"
};
const SPRITE_TEST_DIRECTION_VECTOR: Record<UnitDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up_left: { x: -1, y: -1 },
  up_right: { x: 1, y: -1 },
  down_left: { x: -1, y: 1 },
  down_right: { x: 1, y: 1 }
};
const SPRITE_TEST_DIRECTION_FALLBACK: Record<UnitDirection, UnitDirection> = {
  down: "right",
  down_right: "right",
  right: "right",
  up_right: "right",
  up: "right",
  up_left: "left",
  left: "left",
  down_left: "left"
};
const SPRITE_TEST_UNITS = Array.from(new Set(UNIT_ANIMATION_ASSETS.map((asset) => asset.unitId))) as UnitVisualType[];
const SPRITE_TEST_PATHS = [
  { id: "horizontal", label: "横向直线", points: [{ x: 70, y: 150 }, { x: 440, y: 150 }] },
  { id: "vertical", label: "纵向直线", points: [{ x: 250, y: 40 }, { x: 250, y: 270 }] },
  { id: "diagonal", label: "斜向直线", points: [{ x: 90, y: 255 }, { x: 430, y: 55 }] },
  { id: "turn", label: "折线路径", points: [{ x: 80, y: 70 }, { x: 220, y: 70 }, { x: 220, y: 230 }, { x: 430, y: 230 }] }
];

type SpriteTestResolvedFrame = {
  frame: UnitAnimationFrame;
  exact: boolean;
  missingAction: boolean;
  requestedAction: UnitAnimationState;
  requestedDirection: UnitDirection;
};

export function SpriteTestScene() {
  const [unitIndex, setUnitIndex] = useState(0);
  const [action, setAction] = useState<UnitAnimationState>("idle");
  const [direction, setDirection] = useState<UnitDirection>("right");
  const [playing, setPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [manualFrame, setManualFrame] = useState<number | null>(null);
  const [showCollision, setShowCollision] = useState(false);
  const [showAttachment, setShowAttachment] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoCycle, setAutoCycle] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [pathId, setPathId] = useState(SPRITE_TEST_PATHS[0].id);
  const unitId = SPRITE_TEST_UNITS[unitIndex] ?? SPRITE_TEST_UNITS[0] ?? "player_adventurer";
  const resolved = resolveSpriteTestFrame(unitId, action, direction, elapsedMs, playbackSpeed, manualFrame);
  const currentAsset = resolved.frame.animation;
  const currentFrame = resolved.frame.frameIndex;
  const missingMessages = spriteTestMissingMessages(unitId, action, direction, resolved);
  const walkPath = SPRITE_TEST_PATHS.find((path) => path.id === pathId) ?? SPRITE_TEST_PATHS[0];
  const walkProgress = ((elapsedMs * playbackSpeed) % 3200) / 3200;
  const walkPoint = pointOnSpriteTestPath(walkPath.points, walkProgress);
  const walkDirection = directionFromSpriteTestPath(walkPath.points, walkProgress);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    function tick(now: number) {
      const dt = Math.min(80, now - previous);
      previous = now;
      setElapsedMs((value) => value + dt);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    if (!autoCycle) return;
    const timer = window.setInterval(() => {
      setDirection((current) => {
        const index = SPRITE_TEST_DIRECTIONS.indexOf(current);
        return SPRITE_TEST_DIRECTIONS[(index + 1) % SPRITE_TEST_DIRECTIONS.length];
      });
      setManualFrame(null);
      setElapsedMs(0);
    }, action === "attack" ? 900 : 1300);
    return () => window.clearInterval(timer);
  }, [action, autoCycle]);

  function selectUnit(nextIndex: number) {
    const count = Math.max(1, SPRITE_TEST_UNITS.length);
    setUnitIndex((nextIndex + count) % count);
    setManualFrame(null);
    setElapsedMs(0);
  }

  function selectAction(nextAction: UnitAnimationState) {
    setAction(nextAction);
    setManualFrame(null);
    setElapsedMs(0);
  }

  function stepFrame() {
    const frameCount = Math.max(1, currentAsset.frameCount);
    setPlaying(false);
    setManualFrame((value) => ((value ?? currentFrame) + 1) % frameCount);
  }

  return (
    <main className={`sprite-test-screen ${screenshotMode ? "sprite-test-screen-shot" : ""}`} data-mode="sprite-test">
      <header className="sprite-test-header">
        <div>
          <h1>Sprites 动作测试场景</h1>
          <p>独立 Debug 入口：/sprite-test，只读现有 sprites manifest，不进入正式游戏流程；当前资源只测试左右方向。</p>
        </div>
        <a className="sprite-test-exit" href="/" aria-label="返回正式入口">返回正式入口</a>
      </header>

      <section className="sprite-test-control-panel" aria-label="测试控制面板">
        <div className="sprite-test-control-status">
          <span>当前资源：{SPRITE_TEST_RESOURCE_TEXT[unitId] ?? unitId}</span>
          <span>当前动作：{SPRITE_TEST_ACTION_TEXT[action]}</span>
          <span>当前方向：{SPRITE_TEST_DIRECTION_TEXT[direction]}</span>
          <span>播放状态：{playing ? "播放" : "暂停"}</span>
          <span>播放速度：{playbackSpeed}x</span>
          <span>当前帧：{currentFrame + 1} / {currentAsset.frameCount}</span>
          <span>资源路径：{spriteTestAssetPath(currentAsset)}</span>
          <span>碰撞框显示：{showCollision ? "开" : "关"}</span>
          <span>挂点显示：{showAttachment ? "开" : "关"}</span>
          <span>网格显示：{showGrid ? "开" : "关"}</span>
        </div>
        <div className="sprite-test-controls">
          <button type="button" onClick={() => selectUnit(unitIndex - 1)}>上一个资源</button>
          <button type="button" onClick={() => selectUnit(unitIndex + 1)}>下一个资源</button>
          <select value={unitId} aria-label="资源测试对象" onChange={(event) => selectUnit(SPRITE_TEST_UNITS.indexOf(event.target.value as UnitVisualType))}>
            {SPRITE_TEST_UNITS.map((item) => <option key={item} value={item}>{SPRITE_TEST_RESOURCE_TEXT[item] ?? item}</option>)}
          </select>
          <button type="button" onClick={() => selectAction(nextSpriteTestAction(action))}>切换动作</button>
          <button type="button" onClick={() => setDirection(nextSpriteTestDirection(direction))}>切换方向</button>
          <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "暂停" : "播放"}</button>
          <button type="button" onClick={stepFrame}>单帧前进</button>
          <button type="button" onClick={() => { setElapsedMs(0); setManualFrame(null); }}>重置位置</button>
          <button type="button" onClick={() => setScreenshotMode((value) => !value)}>截图模式</button>
        </div>
        <div className="sprite-test-toggles">
          <label><input type="checkbox" checked={autoCycle} onChange={(event) => setAutoCycle(event.target.checked)} /> 轮播方向</label>
          <label><input type="checkbox" checked={showCollision} onChange={(event) => setShowCollision(event.target.checked)} /> 碰撞框显示</label>
          <label><input type="checkbox" checked={showAttachment} onChange={(event) => setShowAttachment(event.target.checked)} /> 挂点显示</label>
          <label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> 网格显示</label>
          <label>
            播放速度：
            <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))}>
              {SPRITE_TEST_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
            </select>
          </label>
        </div>
        <div className="sprite-test-warnings" aria-live="polite">
          {missingMessages.length === 0 ? <span>资源状态：当前动作与方向可直接播放。</span> : missingMessages.map((message) => <span key={message}>{message}</span>)}
        </div>
      </section>

      <section className="sprite-test-zones" aria-label="Sprites 动作测试区">
        <SpriteIdleTestZone
          unitId={unitId}
          direction={direction}
          frame={resolved.frame}
          elapsedMs={elapsedMs}
          playbackSpeed={playbackSpeed}
          showCollision={showCollision}
          showAttachment={showAttachment}
          showGrid={showGrid}
          onDirection={setDirection}
        />
        <SpriteMoveTestZone
          unitId={unitId}
          state="walk"
          title="行走测试区"
          actionText="行走"
          direction={direction}
          activePathId={pathId}
          walkPoint={walkPoint}
          walkDirection={walkDirection}
          elapsedMs={elapsedMs}
          playbackSpeed={playbackSpeed}
          manualFrame={manualFrame}
          showCollision={showCollision}
          showAttachment={showAttachment}
          showGrid={showGrid}
          onPath={setPathId}
        />
      </section>
    </main>
  );
}

function SpriteIdleTestZone({
  unitId,
  direction,
  frame,
  elapsedMs,
  playbackSpeed,
  showCollision,
  showAttachment,
  showGrid,
  onDirection
}: {
  unitId: UnitVisualType;
  direction: UnitDirection;
  frame: UnitAnimationFrame;
  elapsedMs: number;
  playbackSpeed: number;
  showCollision: boolean;
  showAttachment: boolean;
  showGrid: boolean;
  onDirection: (direction: UnitDirection) => void;
}) {
  return (
    <section className={`sprite-test-zone sprite-test-idle-zone ${showGrid ? "sprite-test-grid-on" : ""}`} aria-label="待机测试区">
      <div className="sprite-test-zone-title">
        <h2>待机测试区</h2>
        <span>当前方向：{SPRITE_TEST_DIRECTION_TEXT[direction]}，当前动作：待机，左右方向</span>
      </div>
      <div className="sprite-test-direction-stage">
        <SpriteTestSprite frame={frame} showCollision={showCollision} showAttachment={showAttachment} style={{ left: "50%", top: "72%" }} />
        {SPRITE_TEST_DIRECTIONS.map((item) => (
          <button
            key={item}
            className={`sprite-test-direction-marker sprite-test-direction-${item} ${item === direction ? "active" : ""}`}
            type="button"
            onClick={() => onDirection(item)}
          >
            {SPRITE_TEST_DIRECTION_TEXT[item]}
          </button>
        ))}
      </div>
      <SpriteDirectionSamples unitId={unitId} state="idle" elapsedMs={elapsedMs} playbackSpeed={playbackSpeed} showCollision={showCollision} showAttachment={showAttachment} />
    </section>
  );
}

function SpriteMoveTestZone({
  unitId,
  state,
  title,
  actionText,
  direction,
  activePathId,
  walkPoint,
  walkDirection,
  elapsedMs,
  playbackSpeed,
  manualFrame,
  showCollision,
  showAttachment,
  showGrid,
  onPath
}: {
  unitId: UnitVisualType;
  state: UnitAnimationState;
  title: string;
  actionText: string;
  direction: UnitDirection;
  activePathId: string;
  walkPoint: { x: number; y: number };
  walkDirection: UnitDirection;
  elapsedMs: number;
  playbackSpeed: number;
  manualFrame: number | null;
  showCollision: boolean;
  showAttachment: boolean;
  showGrid: boolean;
  onPath: (pathId: string) => void;
}) {
  const frame = resolveSpriteTestFrame(unitId, state, walkDirection || direction, elapsedMs, playbackSpeed, manualFrame).frame;
  return (
    <section className={`sprite-test-zone sprite-test-walk-zone ${showGrid ? "sprite-test-grid-on" : ""}`} aria-label="行走测试区">
      <div className="sprite-test-zone-title">
        <h2>{title}</h2>
        <span>当前方向：{SPRITE_TEST_DIRECTION_TEXT[walkDirection]}，当前动作：{actionText}，重点检查脚底锚点</span>
      </div>
      <div className="sprite-test-path-buttons">
        {SPRITE_TEST_PATHS.map((path) => (
          <button key={path.id} className={path.id === activePathId ? "active" : ""} type="button" onClick={() => onPath(path.id)}>
            {path.label}
          </button>
        ))}
      </div>
      <div className="sprite-test-walk-field" aria-label="行走路径网格">
        <svg viewBox="0 0 520 310" aria-hidden="true">
          {SPRITE_TEST_PATHS.map((path) => (
            <polyline key={path.id} className={path.id === activePathId ? "sprite-test-path-active" : ""} points={path.points.map((point) => `${point.x},${point.y}`).join(" ")} />
          ))}
        </svg>
        <SpriteTestSprite frame={frame} showCollision={showCollision} showAttachment={showAttachment} style={{ left: walkPoint.x, top: walkPoint.y }} />
      </div>
      <SpriteDirectionSamples unitId={unitId} state={state} elapsedMs={elapsedMs} playbackSpeed={playbackSpeed} showCollision={showCollision} showAttachment={showAttachment} />
    </section>
  );
}

function SpriteDirectionSamples({
  unitId,
  state,
  elapsedMs,
  playbackSpeed,
  showCollision,
  showAttachment
}: {
  unitId: UnitVisualType;
  state: UnitAnimationState;
  elapsedMs: number;
  playbackSpeed: number;
  showCollision: boolean;
  showAttachment: boolean;
}) {
  return (
    <div className="sprite-test-samples" aria-label={`左右方向 ${SPRITE_TEST_ACTION_TEXT[state]} 样例`}>
      {SPRITE_TEST_DIRECTIONS.map((direction) => {
        const resolved = resolveSpriteTestFrame(unitId, state, direction, elapsedMs, playbackSpeed, null);
        return (
          <div key={`${state}-${direction}`} className={`sprite-test-sample ${resolved.exact ? "" : "sprite-test-sample-missing"}`}>
            <SpriteTestSprite frame={resolved.frame} scale={0.38} showCollision={showCollision} showAttachment={showAttachment} style={{ left: "50%", top: "78%" }} />
            <span>{SPRITE_TEST_DIRECTION_TEXT[direction]}</span>
            {!resolved.exact && <small>缺少方向</small>}
          </div>
        );
      })}
    </div>
  );
}

function SpriteTestSprite({
  frame,
  scale = 0.58,
  showCollision,
  showAttachment,
  style
}: {
  frame: UnitAnimationFrame;
  scale?: number;
  showCollision: boolean;
  showAttachment: boolean;
  style: CSSProperties;
}) {
  const asset = frame.animation;
  return (
    <div
      className={`sprite-test-sprite unit-visual-${asset.unitId}`}
      style={{
        width: asset.frameWidth,
        height: asset.frameHeight,
        "--unit-anchor-x": asset.anchorX,
        "--unit-anchor-y": asset.anchorY,
        "--sprite-test-scale": scale * asset.scale,
        ...style
      } as CSSProperties}
      data-animation-state={asset.state}
      data-animation-direction={asset.direction}
      data-animation-frame={frame.frameIndex}
    >
      {showCollision && <span className="sprite-test-collision-box" aria-hidden="true" />}
      {showAttachment && (
        <>
          <span className="sprite-test-anchor-point" aria-hidden="true" />
          <span className="sprite-test-attachment-point" aria-hidden="true" />
        </>
      )}
      <UnitAnimationSprite frame={frame} />
    </div>
  );
}

function resolveSpriteTestFrame(
  unitId: UnitVisualType,
  state: UnitAnimationState,
  direction: UnitDirection,
  elapsedMs: number,
  playbackSpeed: number,
  manualFrame: number | null
): SpriteTestResolvedFrame {
  const exact = UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, state, direction));
  const stateFallback = UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, state, SPRITE_TEST_DIRECTION_FALLBACK[direction]))
    ?? UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, state, "right"))
    ?? UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, state, "left"));
  const idleFallback = UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, "idle", SPRITE_TEST_DIRECTION_FALLBACK[direction]))
    ?? UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, "idle", "right"))
    ?? UNIT_ANIMATION_BY_KEY.get(unitAnimationKey(unitId, "idle", "left"))
    ?? UNIT_ANIMATION_ASSETS[0];
  const asset = exact ?? stateFallback ?? idleFallback;
  const hasAction = UNIT_ANIMATION_ASSETS.some((item) => item.unitId === unitId && item.state === state);
  const resolved = getAnimationFrame(asset, elapsedMs, playbackSpeed);
  return {
    frame: {
      ...resolved,
      frameIndex: manualFrame === null ? resolved.frameIndex : manualFrame % Math.max(1, asset.frameCount)
    },
    exact: Boolean(exact),
    missingAction: !hasAction,
    requestedAction: state,
    requestedDirection: direction
  };
}

function spriteTestMissingMessages(unitId: UnitVisualType, action: UnitAnimationState, direction: UnitDirection, resolved: SpriteTestResolvedFrame) {
  const messages: string[] = [];
  if (resolved.missingAction) messages.push(`缺少动作：${action}`);
  if (!resolved.exact) messages.push(`缺少方向：${SPRITE_TEST_DIRECTION_TEXT[direction]}（${direction}）`);
  if (resolved.frame.animation.frameCount <= 0) messages.push(`缺少帧配置：${action}/${direction}`);
  if (!UNIT_ANIMATION_ASSETS.some((asset) => asset.unitId === unitId)) messages.push(`缺少资源：${unitId}`);
  if (action === "attack" && resolved.missingAction) messages.push("当前 sprite 未配置攻击动作");
  return messages;
}

function nextSpriteTestAction(action: UnitAnimationState) {
  return SPRITE_TEST_ACTIONS[(SPRITE_TEST_ACTIONS.indexOf(action) + 1) % SPRITE_TEST_ACTIONS.length];
}

function nextSpriteTestDirection(direction: UnitDirection) {
  return SPRITE_TEST_DIRECTIONS[(SPRITE_TEST_DIRECTIONS.indexOf(direction) + 1) % SPRITE_TEST_DIRECTIONS.length];
}

function spriteTestAssetPath(asset: UnitAnimationAsset) {
  return (asset as UnitAnimationAsset & { path?: string }).path ?? asset.src;
}

function pointOnSpriteTestPath(points: { x: number; y: number }[], progress: number) {
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return { from: previous, to: point, length: Math.hypot(point.x - previous.x, point.y - previous.y) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0) || 1;
  let distanceLeft = progress * total;
  for (const segment of segments) {
    if (distanceLeft <= segment.length) {
      const local = segment.length <= 0 ? 0 : distanceLeft / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * local,
        y: segment.from.y + (segment.to.y - segment.from.y) * local
      };
    }
    distanceLeft -= segment.length;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}

function directionFromSpriteTestPath(points: { x: number; y: number }[], progress: number): UnitDirection {
  const now = pointOnSpriteTestPath(points, progress);
  const next = pointOnSpriteTestPath(points, (progress + 0.02) % 1);
  return next.x - now.x < 0 ? "left" : "right";
}
