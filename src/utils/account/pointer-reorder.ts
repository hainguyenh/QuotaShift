export interface SortableCardRect {
  id: string;
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

export interface PointerReorderUpdate {
  dragging: boolean;
  ids: string[];
  sourceId: string | null;
}

export interface PointerReorderFinish {
  committedIds: string[] | null;
  sourceId: string | null;
}

export function reorderIdsAtPointer(
  ids: string[],
  sourceId: string,
  rects: SortableCardRect[],
  pointerY: number,
  grabOffsetY?: number,
  pointerX?: number,
  grabOffsetX?: number,
): string[] {
  if (!ids.includes(sourceId) || ids.length < 2) return [...ids];

  const sourceRect = rects.find((r) => r.id === sourceId);
  const sourceHeight = sourceRect ? Math.max(1, sourceRect.bottom - sourceRect.top) : 0;

  const draggedCenter =
    grabOffsetY !== undefined && sourceHeight > 0
      ? pointerY - grabOffsetY + sourceHeight / 2
      : pointerY;

  const remaining = ids.filter((id) => id !== sourceId);
  const rectById = new Map(rects.map((rect) => [rect.id, rect]));
  const orderedRects = ids.map((id) => rectById.get(id)).filter(Boolean) as SortableCardRect[];

  let targetIndex = remaining.length;
  const hasFlowGeometry =
    pointerX !== undefined &&
    sourceRect?.left !== undefined &&
    sourceRect.right !== undefined &&
    orderedRects.length >= 2 &&
    orderedRects.every((rect) => rect.left !== undefined && rect.right !== undefined);

  if (hasFlowGeometry && sourceRect) {
    const sourceWidth = Math.max(1, sourceRect.right! - sourceRect.left!);
    const draggedCenterX =
      grabOffsetX !== undefined ? pointerX! - grabOffsetX + sourceWidth / 2 : pointerX!;

    let bestSlot = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    orderedRects.forEach((rect, index) => {
      const width = Math.max(1, rect.right! - rect.left!);
      const height = Math.max(1, rect.bottom - rect.top);
      const centerX = (rect.left! + rect.right!) / 2;
      const centerY = (rect.top + rect.bottom) / 2;
      const dx = (draggedCenterX - centerX) / width;
      const dy = (draggedCenter - centerY) / height;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = index;
      }
    });
    targetIndex = bestSlot;
  } else if (orderedRects.length >= 2 && sourceRect) {
    const boundaries: number[] = [];
    for (let i = 0; i < orderedRects.length - 1; i++) {
      const cA = (orderedRects[i].top + orderedRects[i].bottom) / 2;
      const cB = (orderedRects[i + 1].top + orderedRects[i + 1].bottom) / 2;
      boundaries.push((cA + cB) / 2);
    }

    let slot = orderedRects.length - 1;
    for (let i = 0; i < boundaries.length; i++) {
      if (draggedCenter < boundaries[i]) {
        slot = i;
        break;
      }
    }
    targetIndex = slot;
  } else {
    const sortedRemaining = rects
      .filter((r) => remaining.includes(r.id))
      .sort((a, b) => a.top - b.top);

    targetIndex = sortedRemaining.length;
    for (let i = 0; i < sortedRemaining.length; i++) {
      const mid = (sortedRemaining[i].top + sortedRemaining[i].bottom) / 2;
      if (draggedCenter < mid) {
        targetIndex = i;
        break;
      }
    }
  }

  const next = [...remaining];
  const boundedIndex = Math.max(0, Math.min(targetIndex, remaining.length));
  next.splice(boundedIndex, 0, sourceId);
  return next;
}

export class PointerReorderController {
  private readonly threshold: number;
  private sourceId: string | null = null;
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private grabOffsetY: number | undefined = undefined;
  private grabOffsetX: number | undefined = undefined;
  private dragging = false;
  private originalIds: string[] = [];
  private previewIds: string[] = [];
  private initialRects: SortableCardRect[] = [];
  private suppressClick = false;
  private cancelled = false;

  constructor(threshold = 4) {
    this.threshold = threshold;
  }

  begin(
    sourceId: string,
    pointerId: number,
    x: number,
    y: number,
    ids: string[],
    rects?: SortableCardRect[],
    grabOffsetY?: number,
    grabOffsetX?: number,
  ): void {
    this.sourceId = sourceId;
    this.pointerId = pointerId;
    this.startX = x;
    this.startY = y;
    this.dragging = false;
    this.originalIds = [...ids];
    this.previewIds = [...ids];
    this.cancelled = false;
    this.initialRects = rects ? [...rects] : [];
    const sourceRect = rects?.find((r) => r.id === sourceId);
    this.grabOffsetY =
      grabOffsetY !== undefined ? grabOffsetY : sourceRect ? y - sourceRect.top : undefined;
    this.grabOffsetX =
      grabOffsetX !== undefined
        ? grabOffsetX
        : sourceRect?.left !== undefined
          ? x - sourceRect.left
          : undefined;
  }

  ownsPointer(pointerId: number): boolean {
    return this.pointerId === pointerId;
  }

  move(x: number, y: number, rects?: SortableCardRect[]): PointerReorderUpdate {
    if (!this.sourceId || this.cancelled) {
      return { dragging: false, ids: [...this.previewIds], sourceId: null };
    }

    if (!this.dragging) {
      const distance = Math.hypot(x - this.startX, y - this.startY);
      if (distance < this.threshold) {
        return { dragging: false, ids: [...this.previewIds], sourceId: this.sourceId };
      }
      this.dragging = true;
    }

    if (this.initialRects.length === 0 && rects && rects.length > 0) {
      this.initialRects = [...rects];
      const src = rects.find((r) => r.id === this.sourceId);
      if (this.grabOffsetY === undefined) {
        this.grabOffsetY = src ? this.startY - src.top : undefined;
      }
      if (this.grabOffsetX === undefined && src?.left !== undefined) {
        this.grabOffsetX = this.startX - src.left;
      }
    }

    const activeRects = this.initialRects.length > 0 ? this.initialRects : rects || [];
    this.previewIds = reorderIdsAtPointer(
      this.originalIds,
      this.sourceId,
      activeRects,
      y,
      this.grabOffsetY,
      x,
      this.grabOffsetX,
    );
    return { dragging: true, ids: [...this.previewIds], sourceId: this.sourceId };
  }

  finish(): PointerReorderFinish {
    const sourceId = this.sourceId;
    const changed =
      this.dragging &&
      !this.cancelled &&
      this.previewIds.length === this.originalIds.length &&
      this.previewIds.some((id, index) => id !== this.originalIds[index]);
    const committedIds = changed ? [...this.previewIds] : null;
    if (this.dragging && !this.cancelled) this.suppressClick = true;
    this.resetActive();
    return { committedIds, sourceId };
  }

  cancel(): void {
    this.cancelled = true;
    this.resetActive();
  }

  consumeClickSuppression(): boolean {
    if (!this.suppressClick) return false;
    this.suppressClick = false;
    return true;
  }

  private resetActive(): void {
    this.sourceId = null;
    this.pointerId = null;
    this.dragging = false;
    this.originalIds = [];
    this.previewIds = [];
    this.initialRects = [];
    this.grabOffsetY = undefined;
    this.grabOffsetX = undefined;
  }
}
