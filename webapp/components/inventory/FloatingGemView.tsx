import type { ReactNode } from "react";

export type FloatingGemViewModel<TGem> = {
  gem: TGem;
  x: number;
  y: number;
};

export function FloatingGemView<TGem>({
  floatingGem,
  renderGem
}: {
  floatingGem: FloatingGemViewModel<TGem>;
  renderGem: (gem: TGem) => ReactNode;
}) {
  return (
    <div className="floating-gem" style={{ left: floatingGem.x, top: floatingGem.y }}>
      {renderGem(floatingGem.gem)}
    </div>
  );
}
