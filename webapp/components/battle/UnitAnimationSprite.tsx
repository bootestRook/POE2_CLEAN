import type { CSSProperties } from "react";
import type { UnitAnimationFrame } from "../../unitAnimation";

export function UnitAnimationSprite({ frame, hitFlash = 0 }: { frame: UnitAnimationFrame; hitFlash?: number }) {
  const motionStyle = unitAnimationMotionStyle(frame);
  const showAttackSwipe = frame.animation.state === "attack" && frame.animation.unitId !== "enemy_imp";
  const flash = clamp(hitFlash, 0, 1);
  return (
    <span
      className={`unit-sprite unit-animation-sprite unit-animation-${frame.animation.state}`}
      style={{
        width: frame.animation.frameWidth,
        height: frame.animation.frameHeight,
        backgroundImage: `url(${frame.animation.src})`,
        backgroundPosition: `${-frame.frameIndex * frame.animation.frameWidth}px ${-frame.animation.frameRow * frame.animation.frameHeight}px`,
        filter: flash > 0
          ? `brightness(${1 + flash * 1.9}) saturate(${1 - flash * 0.62}) drop-shadow(0 0 ${Math.round(10 + flash * 14)}px rgba(255, 255, 255, ${0.32 + flash * 0.58}))`
          : undefined,
        ...motionStyle
      }}
      data-animation-frame={frame.frameIndex}
      aria-hidden="true"
    >
      {showAttackSwipe && <span className="unit-attack-swipe" />}
    </span>
  );
}

function unitAnimationMotionStyle(frame: UnitAnimationFrame): CSSProperties {
  const state = frame.animation.state;
  if (state === "idle") return {};
  const direction = frame.animation.direction;
  const frameIndex = frame.frameIndex;
  const signX = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  const signY = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const diagonalX = signX || (direction === "up" || direction === "down" ? 0.35 : 0);
  if (state === "walk") {
    return {};
  }
  const attackPhase = frame.animation.frameCount <= 1 ? 1 : frameIndex / (frame.animation.frameCount - 1);
  const lunge = Math.sin(attackPhase * Math.PI);
  const recoil = attackPhase > 0.62 ? -3 * (attackPhase - 0.62) : 0;
  const forwardX = (signX || diagonalX) * (10 * lunge + recoil);
  const forwardY = signY * (7 * lunge + recoil * 0.5);
  const rotate = (signX || 1) * (attackPhase < 0.45 ? -7 : 10) * lunge;
  const scale = 1 + 0.07 * lunge;
  return {
    transform: `translate(${forwardX}px, ${forwardY}px) rotate(${rotate}deg) scale(${scale})`
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
