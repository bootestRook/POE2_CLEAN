import type { ReactNode } from "react";

export type InventoryOverlayProps = {
  children: ReactNode;
};

export function InventoryOverlay({ children }: InventoryOverlayProps) {
  return (
    <section className="inventory-overlay" aria-label="背包界面">
      {children}
    </section>
  );
}
