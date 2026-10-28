import {
  canOccupyPosition,
  findWalkablePointNear,
} from "./collision-system";
import type { CollisionObstacle, MapPoint, RectBounds } from "@/types/map";

export interface NavigationGrid {
  bounds: RectBounds;
  obstacles: CollisionObstacle[];
  radius: number;
  cellSize: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

interface Cell {
  col: number;
  row: number;
}

interface HeapNode {
  index: number;
  score: number;
}

const DIRECTIONS = [
  { dc: 1, dr: 0, cost: 1 },
  { dc: -1, dr: 0, cost: 1 },
  { dc: 0, dr: 1, cost: 1 },
  { dc: 0, dr: -1, cost: 1 },
  { dc: 1, dr: 1, cost: Math.SQRT2 },
  { dc: 1, dr: -1, cost: Math.SQRT2 },
  { dc: -1, dr: 1, cost: Math.SQRT2 },
  { dc: -1, dr: -1, cost: Math.SQRT2 },
] as const;

/**
 * Tiny binary heap for A*. A linear open-set scan would also be fast enough at
 * this map size, but the heap keeps tap-to-move responsive on slower phones.
 */
class MinHeap {
  private readonly nodes: HeapNode[] = [];

  get size(): number {
    return this.nodes.length;
  }

  push(node: HeapNode): void {
    this.nodes.push(node);
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this.nodes.length === 0) {
      return undefined;
    }

    const root = this.nodes[0];
    const last = this.nodes.pop();

    if (this.nodes.length > 0 && last) {
      this.nodes[0] = last;
      this.sinkDown(0);
    }

    return root;
  }

  private bubbleUp(startIndex: number): void {
    let index = startIndex;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (this.nodes[parent].score <= this.nodes[index].score) {
        break;
      }

      [this.nodes[parent], this.nodes[index]] = [
        this.nodes[index],
        this.nodes[parent],
      ];
      index = parent;
    }
  }

  private sinkDown(startIndex: number): void {
    let index = startIndex;

    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (
        left < this.nodes.length &&
        this.nodes[left].score < this.nodes[smallest].score
      ) {
        smallest = left;
      }

      if (
        right < this.nodes.length &&
        this.nodes[right].score < this.nodes[smallest].score
      ) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      [this.nodes[index], this.nodes[smallest]] = [
        this.nodes[smallest],
        this.nodes[index],
      ];
      index = smallest;
    }
  }
}

/**
 * Builds a static walkability grid from the same collision geometry used by
 * keyboard and joystick movement. Cell centers are checked with the player's
 * full radius, so the grid is deliberately conservative.
 */
export function buildNavigationGrid({
  bounds,
  obstacles,
  radius,
  cellSize = 20,
}: {
  bounds: RectBounds;
  obstacles: CollisionObstacle[];
  radius: number;
  cellSize?: number;
}): NavigationGrid {
  const cols = Math.max(1, Math.ceil(bounds.width / cellSize));
  const rows = Math.max(1, Math.ceil(bounds.height / cellSize));
  const walkable = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = bounds.x + (col + 0.5) * cellSize;
      const y = bounds.y + (row + 0.5) * cellSize;

      walkable[row * cols + col] = canOccupyPosition({
        x,
        y,
        radius,
        bounds,
        obstacles,
      })
        ? 1
        : 0;
    }
  }

  return {
    bounds,
    obstacles,
    radius,
    cellSize,
    cols,
    rows,
    walkable,
  };
}

/**
 * Finds a walkable route between two world points.
 *
 * The returned path is simplified with a line-of-sight pass. Every kept
 * segment is sampled against the collision geometry, so smoothing cannot cut
 * through a stage, fence, or the sea.
 */
export function findNavigationPath({
  grid,
  start,
  goal,
}: {
  grid: NavigationGrid;
  start: MapPoint;
  goal: MapPoint;
}): MapPoint[] | null {
  const startCell = findVisibleCell(grid, start);
  const goalCell = findVisibleCell(grid, goal);

  if (!startCell || !goalCell) {
    return null;
  }

  const startIndex = startCell.row * grid.cols + startCell.col;
  const goalIndex = goalCell.row * grid.cols + goalCell.col;
  const cellCount = grid.cols * grid.rows;
  const gScore = new Float64Array(cellCount).fill(Number.POSITIVE_INFINITY);
  const cameFrom = new Int32Array(cellCount).fill(-1);
  const closed = new Uint8Array(cellCount);
  const open = new MinHeap();

  const heuristic = (index: number): number => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const dx = Math.abs(col - goalCell.col);
    const dy = Math.abs(row - goalCell.row);

    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  gScore[startIndex] = 0;
  open.push({ index: startIndex, score: heuristic(startIndex) });

  while (open.size > 0) {
    const current = open.pop();

    if (!current || closed[current.index]) {
      continue;
    }

    if (current.index === goalIndex) {
      break;
    }

    closed[current.index] = 1;

    const col = current.index % grid.cols;
    const row = Math.floor(current.index / grid.cols);

    for (const direction of DIRECTIONS) {
      const nextCol = col + direction.dc;
      const nextRow = row + direction.dr;

      if (!isWalkableCell(grid, nextCol, nextRow)) {
        continue;
      }

      // Do not let a diagonal step cut through the corner of an obstacle.
      if (
        direction.dc !== 0 &&
        direction.dr !== 0 &&
        (!isWalkableCell(grid, col + direction.dc, row) ||
          !isWalkableCell(grid, col, row + direction.dr))
      ) {
        continue;
      }

      const nextIndex = nextRow * grid.cols + nextCol;

      if (closed[nextIndex]) {
        continue;
      }

      const tentativeScore = gScore[current.index] + direction.cost;

      if (tentativeScore >= gScore[nextIndex]) {
        continue;
      }

      gScore[nextIndex] = tentativeScore;
      cameFrom[nextIndex] = current.index;
      open.push({
        index: nextIndex,
        score: tentativeScore + heuristic(nextIndex),
      });
    }
  }

  if (startIndex !== goalIndex && cameFrom[goalIndex] === -1) {
    return null;
  }

  const cells: Cell[] = [];
  let currentIndex = goalIndex;

  while (currentIndex !== -1) {
    cells.push({
      col: currentIndex % grid.cols,
      row: Math.floor(currentIndex / grid.cols),
    });

    if (currentIndex === startIndex) {
      break;
    }

    currentIndex = cameFrom[currentIndex];
  }

  if (currentIndex === -1) {
    return null;
  }

  cells.reverse();

  const points: MapPoint[] = [start];

  for (const cell of cells) {
    const center = cellCenter(grid, cell);
    const previous = points[points.length - 1];

    if (
      Math.abs(center.x - previous.x) > 0.01 ||
      Math.abs(center.y - previous.y) > 0.01
    ) {
      points.push(center);
    }
  }

  const last = points[points.length - 1];

  if (Math.abs(goal.x - last.x) > 0.01 || Math.abs(goal.y - last.y) > 0.01) {
    points.push(goal);
  }

  return simplifyPath(points, grid);
}

/**
 * Samples a straight world segment with the player footprint. Used both for
 * path smoothing and for choosing start/goal grid cells that are actually
 * visible from the requested point.
 */
export function isSegmentWalkable(
  start: MapPoint,
  end: MapPoint,
  grid: NavigationGrid,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const sampleStep = Math.max(4, grid.radius * 0.5);
  const samples = Math.max(1, Math.ceil(distance / sampleStep));

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    const x = start.x + dx * progress;
    const y = start.y + dy * progress;

    if (
      !canOccupyPosition({
        x,
        y,
        radius: grid.radius,
        bounds: grid.bounds,
        obstacles: grid.obstacles,
      })
    ) {
      return false;
    }
  }

  return true;
}

function simplifyPath(points: MapPoint[], grid: NavigationGrid): MapPoint[] {
  const deduped = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > 0.01 ||
      Math.abs(point.y - points[index - 1].y) > 0.01,
  );

  if (deduped.length <= 2) {
    return deduped;
  }

  const result: MapPoint[] = [deduped[0]];
  let anchor = 0;

  while (anchor < deduped.length - 1) {
    let next = deduped.length - 1;

    while (
      next > anchor + 1 &&
      !isSegmentWalkable(deduped[anchor], deduped[next], grid)
    ) {
      next -= 1;
    }

    result.push(deduped[next]);
    anchor = next;
  }

  return result;
}

function findVisibleCell(
  grid: NavigationGrid,
  point: MapPoint,
): Cell | null {
  const base = worldToCell(grid, point);
  const maxCellRadius = 8;
  let best: Cell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  const minRow = Math.max(0, base.row - maxCellRadius);
  const maxRow = Math.min(grid.rows - 1, base.row + maxCellRadius);
  const minCol = Math.max(0, base.col - maxCellRadius);
  const maxCol = Math.min(grid.cols - 1, base.col + maxCellRadius);

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!isWalkableCell(grid, col, row)) {
        continue;
      }

      const center = cellCenter(grid, { col, row });
      const distance = Math.hypot(center.x - point.x, center.y - point.y);

      if (distance >= bestDistance) {
        continue;
      }

      if (!isSegmentWalkable(point, center, grid)) {
        continue;
      }

      best = { col, row };
      bestDistance = distance;
    }
  }

  return best;
}

function worldToCell(grid: NavigationGrid, point: MapPoint): Cell {
  return {
    col: Math.min(
      Math.max(
        Math.floor((point.x - grid.bounds.x) / grid.cellSize),
        0,
      ),
      grid.cols - 1,
    ),
    row: Math.min(
      Math.max(
        Math.floor((point.y - grid.bounds.y) / grid.cellSize),
        0,
      ),
      grid.rows - 1,
    ),
  };
}

function cellCenter(grid: NavigationGrid, cell: Cell): MapPoint {
  return {
    x: grid.bounds.x + (cell.col + 0.5) * grid.cellSize,
    y: grid.bounds.y + (cell.row + 0.5) * grid.cellSize,
  };
}

function isWalkableCell(
  grid: NavigationGrid,
  col: number,
  row: number,
): boolean {
  return (
    col >= 0 &&
    col < grid.cols &&
    row >= 0 &&
    row < grid.rows &&
    grid.walkable[row * grid.cols + col] === 1
  );
}

/**
 * Finds a walkable point near a target that can actually be reached from the
 * current position.
 *
 * Venue markers can sit inside a dense cluster of umbrellas or on a building
 * footprint. The nearest walkable point may be a small isolated pocket, so this
 * helper tries the nearest point first and then floods the reachable grid to
 * find the closest reachable cell inside the allowed interaction radius.
 */
export function findReachablePointNear({
  grid,
  start,
  x,
  y,
  radius,
  bounds,
  obstacles,
  maxDistance,
  step = 20,
}: {
  grid: NavigationGrid;
  start: MapPoint;
  x: number;
  y: number;
  radius: number;
  bounds: RectBounds;
  obstacles: CollisionObstacle[];
  maxDistance: number;
  step?: number;
}): MapPoint | null {
  const nearest = findWalkablePointNear({
    x,
    y,
    radius,
    bounds,
    obstacles,
    maxDistance,
    step,
  });

  if (nearest && findNavigationPath({ grid, start, goal: nearest })) {
    return nearest;
  }

  const startCell = findVisibleCell(grid, start);

  if (!startCell) {
    return null;
  }

  // Flood the reachable grid once, then pick the reachable cell closest to the
  // marker. This is much faster than running A* for every candidate point and
  // handles markers inside dense clusters without trapping the player.
  const cellCount = grid.cols * grid.rows;
  const visited = new Uint8Array(cellCount);
  const queue: number[] = [startCell.row * grid.cols + startCell.col];
  let best: MapPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  visited[queue[0]] = 1;

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const point = cellCenter(grid, { col, row });
    const distance = Math.hypot(point.x - x, point.y - y);

    if (distance <= maxDistance && distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }

    for (const direction of DIRECTIONS) {
      const nextCol = col + direction.dc;
      const nextRow = row + direction.dr;

      if (!isWalkableCell(grid, nextCol, nextRow)) {
        continue;
      }

      if (
        direction.dc !== 0 &&
        direction.dr !== 0 &&
        (!isWalkableCell(grid, col + direction.dc, row) ||
          !isWalkableCell(grid, col, row + direction.dr))
      ) {
        continue;
      }

      const nextIndex = nextRow * grid.cols + nextCol;

      if (visited[nextIndex]) {
        continue;
      }

      visited[nextIndex] = 1;
      queue.push(nextIndex);
    }
  }

  return best;
}
