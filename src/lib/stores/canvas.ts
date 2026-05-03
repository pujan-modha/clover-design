import { Store } from "@tanstack/store";

interface CanvasState {
  zoom: number;
  showGrid: boolean;
  mode: "select" | "draw" | "text" | "pan";
  selectedElementId: string | null;
  isFullscreen: boolean;
}

const initialState: CanvasState = {
  zoom: 1,
  showGrid: true,
  mode: "select",
  selectedElementId: null,
  isFullscreen: false,
};

export const canvasStore = new Store<CanvasState>(initialState);

export function setZoom(zoom: number) {
  canvasStore.setState((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(3, zoom)) }));
}

export function setShowGrid(show: boolean) {
  canvasStore.setState((prev) => ({ ...prev, showGrid: show }));
}

export function setMode(mode: CanvasState["mode"]) {
  canvasStore.setState((prev) => ({ ...prev, mode }));
}

export function setSelectedElement(id: string | null) {
  canvasStore.setState((prev) => ({ ...prev, selectedElementId: id }));
}

export function toggleFullscreen() {
  canvasStore.setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
}
