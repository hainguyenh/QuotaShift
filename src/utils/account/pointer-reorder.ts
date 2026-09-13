export interface SortableCardRect {
  id: string;
  top: number;
  bottom: number;
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
): string[] {
  if (!ids.includes(sourceId) || ids.length < 2) return [...ids];

  const sourceRect = rects.find((r) => r.id === sourceId);
  const sourceHeight = sourceRect ? Math.max(1, sourceRect.bottom - sourceRect.top) : 0;

  const draggedCenter =
    grabOffsetY !== undefined && sourceHeight > 0
      ? pointerY - grabOffsetY + sourceHeight / 2
      : pointerY;

  const remaining = ids.filter((id) => id !== sourceId);
  const sortedAll = rects
    .filter((r) => ids.includes(r.id))
    .sort((a, b) => a.top - b.top);

  let targetIndex = remaining.length;

  if (sortedAll.length >= 2 && sourceRect) {
    const boundaries: number[] = [];
    for (let i = 0; i < sortedAll.length - 1; i++) {
      const cA = (sortedAll[i].top + sortedAll[i].bottom) / 2;
      const cB = (sortedAll[i + 1].top + sortedAll[i + 1].bottom) / 2;
      boundaries.push((cA + cB) / 2);
    }

    let slot = sortedAll.length - 1;
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
    if (grabOffsetY !== undefined) {
      this.grabOffsetY = grabOffsetY;
    } else if (rects) {
      const src = rects.find((r) => r.id === sourceId);
      this.grabOffsetY = src ? y - src.top : undefined;
    } else {
      this.grabOffsetY = undefined;
    }
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
      if (this.grabOffsetY === undefined) {
        const src = rects.find((r) => r.id === this.sourceId);
        this.grabOffsetY = src ? this.startY - src.top : undefined;
      }
    }

    const activeRects = this.initialRects.length > 0 ? this.initialRects : (rects || []);
    this.previewIds = reorderIdsAtPointer(
      this.originalIds,
      this.sourceId,
      activeRects,
      y,
      this.grabOffsetY,
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
  }
}
