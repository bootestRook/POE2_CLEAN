import type { CSSProperties } from "react";

export function GemOrbView({
  className,
  sprite,
  iconText,
  levelText
}: {
  className: string;
  sprite: string;
  iconText: string;
  levelText: string;
}) {
  const style = sprite ? ({ "--gem-icon-sprite": `url(${sprite})` } as CSSProperties) : undefined;
  return (
    <span className={`gem-orb ${className} ${sprite ? "gem-orb-sprite" : ""}`} style={style}>
      {sprite ? <span className="gem-orb-label">{iconText}</span> : iconText}
      {levelText ? <span className="gem-orb-roman-level">{levelText}</span> : null}
    </span>
  );
}
