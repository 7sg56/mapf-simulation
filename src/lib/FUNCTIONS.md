# MAPF Simulator Function Summary

This document provides a summary of every function exported and used within the `src/lib` directory.

## `types.ts`

- **`posKey(p: Position): string`**: Serializes a 2D position into a unique string key (e.g., `"2,3"`) for use in Sets and Maps.
- **`parseKey(key: string): Position`**: Parses a serialized string key back into a `Position` object (`row` and `col`).
- **`stKey(p: Position, t: number): string`**: Serializes a space-time coordinate (position + timestep) into a unique string key for collision and constraint lookup.

## `grid.ts`

- **`createGrid(width: number, height: number): Grid`**: Initializes and returns a new empty grid with the specified dimensions and no obstacles.
- **`toggleObstacle(grid: Grid, pos: Position): Set<string>`**: Returns a new, immutable set of obstacles with the specific cell's obstacle state flipped (added if empty, removed if present).
- **`isWalkable(grid: Grid, pos: Position): boolean`**: Validates whether a given position exists within the grid bounds and is not marked as an obstacle.
- **`getNeighbors(grid: Grid, pos: Position): Position[]`**: Returns all valid neighboring positions (up, down, left, right, wait) from a given cell that are walkable.
- **`randomizeGrid(width, height, obstacleRatio, agentCount)`**: Generates a random Map-Agent Pathfinding scenario. It places random obstacles and assigns start and goal positions to the specified number of agents. It returns the populated `Grid` and `Agent[]`, or `null` if the grid is too crowded.
- **`manhattan(a: Position, b: Position): number`**: Calculates and returns the Manhattan distance between two generic positions, serving as the core A* heuristic.

## `astar.ts`

- **`astar(grid, start, goal, constraints, maxTimestep): PathStep[] | null`**: The core space-time A* pathfinding algorithm. Finding the optimal route for a single agent from `start` to `goal` while traversing space-time steps, avoiding dynamic `constraints` at their specific timesteps.
- **`reconstructPath(node: AStarNode): PathStep[]`**: Internal helper that traverses backwards from the solved goal node up through its parents to reconstruct and format the complete list of chronological `PathStep`s.
- **`MinHeap` (Class Methods)**: Includes `.push()`, `.pop()`, `.bubbleUp()`, and `.sinkDown()` implementing an optimized priority queue sorting by the lowest combined step and heuristic `f-value` for `astar`.

## `conflicts.ts`

- **`findFirstConflict(paths: Map<number, PathStep[]>): Conflict | null`**: Iterates through all given paths to locate the first occurrence of two agents colliding. Detects both **vertex** conflicts (same cell, same timestep) and **edge** conflicts (agents swapping directly with each other).
- **`findAllConflicts(paths: Map<number, PathStep[]>): Conflict[]`**: Similar to above, but fully scans every timestep to catalog and return an array of all detected collisions across the entire scenario without terminating early.

## `cbs.ts`

- **`solveCBS(grid, agents, log): Solution | null`**: The optimal Conflict-Based Search solver. At the high level, it creates a constraint tree. It routes agents individually, checks for overlaps via `conflicts.ts`, and recursively branches new avoidance constraints routing `astar.ts` until a mathematically conflict-free solution is achieved globally.
- **`computeCost(paths): number`**: Utility calculating the cumulative sum of step lengths across all successful agent pathways.
- **`computeMakespan(paths): number`**: Utility determining the longest individual pathway duration, signifying when the overall scenario officially concludes.

## `prioritized.ts`

- **`solvePrioritized(grid, agents, log): Solution | null`**: A deterministic but sub-optimal MAPF planner. Iterates over agents consecutively by priority, utilizing `astar.ts` to map a route, and then directly converts each route into hard constraints for every subsequent agent to path around.

## `simulator.ts`

- **`createSimulation(agents, paths): SimulationState`**: Given all agents and their mathematically solved pathways, this initializes the runtime state at `timestep 0`.
- **`stepSimulation(state, agents, paths, log): SimulationState`**: The core engine ticker. Steps the active simulation forward individually by one tick (`timestep + 1`), advancing agents across their respective paths and eliminating them when they successfully conclude their journeys.
- **`resetSimulation(agents, paths): SimulationState`**: A quick wrapper around `createSimulation` to restore an active simulation back to the very beginning.
- **`getActiveAgentCells(state): Map<string, number>`**: Retrieves a map of coordinate keys pointing to `agentId`s containing only agents who have not yet reached their final destination at the current tick, used for rendering.
