// ============================================================
// MAPF Simulator - Space-Time A* Pathfinding
// ============================================================
// Finds a shortest path for a single agent on the grid while
// respecting a set of CBS constraints (agent cannot be at a
// specific position at a specific timestep).

import { Grid, Position, Constraint, PathStep, stKey } from "./types";
import { getNeighbors, manhattan } from "./grid";

/** Internal node for the A* open list. */
interface AStarNode {
    position: Position;
    timestep: number;
    g: number; // cost so far
    f: number; // g + heuristic
    parent: AStarNode | null;
}

/**
 * Min-heap priority queue for A* nodes, ordered by f-value.
 * Simple array-based implementation sufficient for our grid sizes.
 */
class MinHeap {
    private data: AStarNode[] = [];

    push(node: AStarNode): void {
        this.data.push(node);
        this.bubbleUp(this.data.length - 1);
    }

    pop(): AStarNode | undefined {
        if (this.data.length === 0) return undefined;
        const top = this.data[0];
        const last = this.data.pop()!;
        if (this.data.length > 0) {
            this.data[0] = last;
            this.sinkDown(0);
        }
        return top;
    }

    get size(): number {
        return this.data.length;
    }

    private bubbleUp(i: number): void {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.data[i].f >= this.data[parent].f) break;
            [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
            i = parent;
        }
    }

    private sinkDown(i: number): void {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.data[left].f < this.data[smallest].f) smallest = left;
            if (right < n && this.data[right].f < this.data[smallest].f) smallest = right;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}

/**
 * Space-Time A* search for a single agent.
 *
 * @param grid        The grid environment
 * @param start       Agent's start position
 * @param goal        Agent's goal position
 * @param constraints Set of CBS constraints for this agent
 * @param maxTimestep Upper bound on timesteps to prevent infinite search
 * @returns           Array of PathSteps from start to goal, or null if no path
 */
export function astar(
    grid: Grid,
    start: Position,
    goal: Position,
    constraints: Constraint[] = [],
    maxTimestep: number = 100
): PathStep[] | null {
    // Build a constraint lookup set for O(1) checks
    const constraintSet = new Set<string>();
    for (const c of constraints) {
        constraintSet.add(stKey(c.position, c.timestep));
    }

    /**
     * Check if the agent is allowed at the given position and timestep.
     */
    function isConstrained(pos: Position, t: number): boolean {
        return constraintSet.has(stKey(pos, t));
    }

    const open = new MinHeap();
    const closed = new Set<string>();

    const startNode: AStarNode = {
        position: start,
        timestep: 0,
        g: 0,
        f: manhattan(start, goal),
        parent: null,
    };

    open.push(startNode);

    while (open.size > 0) {
        const current = open.pop()!;
        const currentKey = stKey(current.position, current.timestep);

        // Skip if already visited in this space-time state
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        // Goal reached: reconstruct path
        if (
            current.position.row === goal.row &&
            current.position.col === goal.col
        ) {
            return reconstructPath(current);
        }

        // Exceeded maximum timestep: prune this branch
        if (current.timestep >= maxTimestep) continue;

        // Expand neighbors (includes "wait" action via getNeighbors)
        const neighbors = getNeighbors(grid, current.position);

        for (const next of neighbors) {
            const nextTimestep = current.timestep + 1;

            // Skip if constrained
            if (isConstrained(next, nextTimestep)) continue;

            const nextKey = stKey(next, nextTimestep);
            if (closed.has(nextKey)) continue;

            const g = current.g + 1;
            const f = g + manhattan(next, goal);

            const nextNode: AStarNode = {
                position: next,
                timestep: nextTimestep,
                g,
                f,
                parent: current,
            };

            open.push(nextNode);
        }
    }

    // No path found
    return null;
}

/**
 * Reconstruct the path from the goal node back to the start.
 */
function reconstructPath(node: AStarNode): PathStep[] {
    const path: PathStep[] = [];
    let current: AStarNode | null = node;
    while (current) {
        path.push({
            position: current.position,
            timestep: current.timestep,
        });
        current = current.parent;
    }
    return path.reverse();
}
