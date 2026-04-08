// ============================================================
// MAPF Simulator - Grid Utilities
// ============================================================
// Creates, modifies, and queries the 2D grid environment.

import { Grid, Position, posKey, ACTIONS, Agent, AGENT_COLORS } from "./types";

/**
 * Create an empty grid with the given dimensions.
 * @param width  Number of columns
 * @param height Number of rows
 */
export function createGrid(width: number, height: number): Grid {
    return {
        width,
        height,
        obstacles: new Set<string>(),
    };
}

/**
 * Toggle an obstacle at the given position.
 * Returns a new obstacles Set (immutable pattern for React state).
 */
export function toggleObstacle(grid: Grid, pos: Position): Set<string> {
    const key = posKey(pos);
    const next = new Set(grid.obstacles);
    if (next.has(key)) {
        next.delete(key);
    } else {
        next.add(key);
    }
    return next;
}

/**
 * Check if a position is within bounds and not an obstacle.
 */
export function isWalkable(grid: Grid, pos: Position): boolean {
    if (pos.row < 0 || pos.row >= grid.height) return false;
    if (pos.col < 0 || pos.col >= grid.width) return false;
    return !grid.obstacles.has(posKey(pos));
}

/**
 * Get all valid neighbor positions (4-directional + wait).
 * Returns positions that are within bounds and walkable.
 */
export function getNeighbors(grid: Grid, pos: Position): Position[] {
    const neighbors: Position[] = [];
    for (const action of ACTIONS) {
        const next: Position = {
            row: pos.row + action.row,
            col: pos.col + action.col,
        };
        if (isWalkable(grid, next)) {
            neighbors.push(next);
        }
    }
    return neighbors;
}

/**
 * Generate a random grid scenario with obstacles and agents.
 * @param width         Grid columns
 * @param height        Grid rows
 * @param obstacleRatio Fraction of cells to fill with obstacles (0-0.4)
 * @param agentCount    Number of agents to place
 * @returns             { grid, agents } or null if placement fails
 */
export function randomizeGrid(
    width: number,
    height: number,
    obstacleRatio: number,
    agentCount: number
): { grid: Grid; agents: Agent[] } | null {
    const grid = createGrid(width, height);
    const totalCells = width * height;

    // Clamp obstacle ratio
    const ratio = Math.min(Math.max(obstacleRatio, 0), 0.4);
    const obstacleCount = Math.floor(totalCells * ratio);

    // Collect all cell positions
    const allPositions: Position[] = [];
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            allPositions.push({ row: r, col: c });
        }
    }

    // Shuffle positions using Fisher-Yates
    for (let i = allPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    // Place obstacles
    for (let i = 0; i < obstacleCount && i < allPositions.length; i++) {
        grid.obstacles.add(posKey(allPositions[i]));
    }

    // Remaining free cells for agent placement
    const freeCells = allPositions.filter((p) => !grid.obstacles.has(posKey(p)));

    // Need 2 cells per agent (start + goal)
    if (freeCells.length < agentCount * 2) {
        return null; // Not enough space
    }

    // Shuffle free cells and assign starts and goals
    for (let i = freeCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freeCells[i], freeCells[j]] = [freeCells[j], freeCells[i]];
    }

    const agents: Agent[] = [];
    for (let i = 0; i < agentCount; i++) {
        agents.push({
            id: i,
            start: freeCells[i * 2],
            goal: freeCells[i * 2 + 1],
            color: AGENT_COLORS[i % AGENT_COLORS.length],
            name: `A${i}`,
        });
    }

    return { grid, agents };
}

/**
 * Manhattan distance heuristic between two positions.
 */
export function manhattan(a: Position, b: Position): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
