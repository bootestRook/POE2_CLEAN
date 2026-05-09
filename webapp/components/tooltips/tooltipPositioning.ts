import { clientRectToGameViewportRect, currentGameViewportMetrics } from "../../utils/gameViewportMetrics";

export type TooltipPositionSource = "board" | "inventory" | "equipment" | "stash";

export type TooltipPosition = {
  left: number;
  top: number;
  transform: string;
};

export type TooltipPositionConfig = {
  width: number;
  comparisonGap: number;
  screenPadding: number;
  inventoryColumns: number;
};

export function resolveTooltipPosition(
  anchor: HTMLElement,
  source: TooltipPositionSource,
  slotIndex: number | undefined,
  config: TooltipPositionConfig
): TooltipPosition {
  if (source === "board") return getBoardTooltipPosition(anchor, config);
  if (source === "equipment") return getEquipmentTooltipPosition(anchor, config);
  return getInventoryTooltipPosition(anchor, slotIndex ?? 0, config);
}

function getBoardTooltipPosition(anchor: HTMLElement, config: TooltipPositionConfig): TooltipPosition {
  const cell = anchor.closest("[data-board-row][data-board-column]") as HTMLElement | null;
  const board = anchor.closest(".board-grid") as HTMLElement | null;
  const cellRect = clientRectToGameViewportRect((cell ?? anchor).getBoundingClientRect());
  const boardRect = clientRectToGameViewportRect((board ?? anchor).getBoundingClientRect());
  const centerTop = clampTooltipTop(cellRect.top + cellRect.height / 2, config);

  return {
    left: clampTooltipLeft(boardRect.left - 5 - config.width, config),
    top: centerTop,
    transform: `translateY(max(-50%, ${boardRect.top - centerTop}px))`
  };
}

function getInventoryTooltipPosition(anchor: HTMLElement, slotIndex: number, config: TooltipPositionConfig): TooltipPosition {
  const rect = clientRectToGameViewportRect(anchor.getBoundingClientRect());
  const columnIndex = slotIndex % config.inventoryColumns;
  if (columnIndex >= config.inventoryColumns - 4) {
    return {
      left: clampTooltipLeft(rect.left - 2 - config.width, config),
      top: clampTooltipTop(rect.top + rect.height / 2, config),
      transform: "translateY(-50%)"
    };
  }

  return {
    left: clampTooltipLeft(rect.left + rect.width / 2 - config.width / 2, config),
    top: Math.max(config.screenPadding, rect.top - 2),
    transform: "translateY(-100%)"
  };
}

function getEquipmentTooltipPosition(anchor: HTMLElement, config: TooltipPositionConfig): TooltipPosition {
  const rect = clientRectToGameViewportRect(anchor.getBoundingClientRect());
  return {
    left: clampTooltipLeft(rect.right + 8, config),
    top: clampTooltipTop(rect.top + rect.height / 2, config),
    transform: "translateY(-50%)"
  };
}

function clampTooltipLeft(left: number, config: TooltipPositionConfig) {
  const viewport = currentGameViewportMetrics();
  return Math.max(config.screenPadding, Math.min(left, viewport.width - config.width - config.screenPadding));
}

function clampTooltipTop(top: number, config: TooltipPositionConfig) {
  const viewport = currentGameViewportMetrics();
  return Math.max(config.screenPadding, Math.min(top, viewport.height - config.screenPadding));
}

export function getComparisonTooltipPosition(tooltip: TooltipPosition, config: TooltipPositionConfig): TooltipPosition {
  const rightLeft = tooltip.left + config.width + config.comparisonGap;
  const viewport = currentGameViewportMetrics();
  if (rightLeft + config.width <= viewport.width - config.screenPadding) {
    return {
      left: rightLeft,
      top: tooltip.top,
      transform: tooltip.transform
    };
  }
  return {
    left: Math.max(config.screenPadding, tooltip.left - config.width - config.comparisonGap),
    top: tooltip.top,
    transform: tooltip.transform
  };
}
