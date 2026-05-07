export function currentGameViewportMetrics() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { width: 1920, height: 1080, scale: 1, left: 0, top: 0 };
  }
  const viewport = document.querySelector<HTMLElement>("[data-game-viewport-content='true']");
  if (!viewport) return { width: window.innerWidth, height: window.innerHeight, scale: 1, left: 0, top: 0 };
  const rect = viewport.getBoundingClientRect();
  const width = Number(viewport.dataset.viewportWidth) || rect.width || window.innerWidth;
  const height = Number(viewport.dataset.viewportHeight) || rect.height || window.innerHeight;
  const scale = rect.width > 0 && width > 0 ? rect.width / width : 1;
  return { width, height, scale: scale > 0 ? scale : 1, left: rect.left, top: rect.top };
}

export function clientToGameViewportPoint(clientX: number, clientY: number) {
  const viewport = currentGameViewportMetrics();
  return {
    x: (clientX - viewport.left) / viewport.scale,
    y: (clientY - viewport.top) / viewport.scale
  };
}

export function clientRectToGameViewportRect(rect: DOMRect) {
  const viewport = currentGameViewportMetrics();
  return {
    left: (rect.left - viewport.left) / viewport.scale,
    right: (rect.right - viewport.left) / viewport.scale,
    top: (rect.top - viewport.top) / viewport.scale,
    bottom: (rect.bottom - viewport.top) / viewport.scale,
    width: rect.width / viewport.scale,
    height: rect.height / viewport.scale
  };
}
