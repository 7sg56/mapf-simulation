// ============================================================
// MAPF Simulator - Conflict-Based Search (CBS)
// ============================================================
// Optimal multi-agent pathfinding via high-level constraint tree
// search with low-level space-time A*.

import { Grid, Agent, Constraint, PathStep, Solution, LogEntry } from "./types";
import { astar } from "./astar";
import { findFirstConflict } from "./conflicts";

/** A node in the CBS constraint tree. */
interface CTNode {
    constraints: Constraint[];
    paths: Map<number, PathStep[]>;
    cost: number;
}

/** Logger callback type. */
type Logger = (entry: Omit<LogEntry, "id" | "timestamp">) => void;

/**
 * Solve MAPF using Conflict-Based Search.
 *
 * High-level algorithm:
 * 1. Create root node: solve each agent independently with A*.
 * 2. Pick the CT node with lowest cost.
 * 3. Check for conflicts. If none, return solution.
 * 4. On conflict, branch: create two child nodes, each adding a
 *    constraint for one of the conflicting agents.
 * 5. Re-plan only the constrained agent. Repeat.
 *
 * @param grid   The grid environment
 * @param agents List of agents with start/goal
 * @param log    Optional logger callback
 * @returns      A conflict-free Solution, or null if unsolvable
 */
export function solveCBS(
    grid: Grid,
    agents: Agent[],
    log?: Logger
): Solution | null {
    const startTime = performance.now();
    let conflictsResolved = 0;

    log?.({
        level: "info",
        message: `CBS: Starting search for ${agents.length} agents`,
    });

    // --- Build root node ---
    const rootPaths = new Map<number, PathStep[]>();
    for (const agent of agents) {
        log?.({
            level: "info",
            message: `CBS: Computing initial path for Agent ${agent.name} (${agent.start.row},${agent.start.col}) -> (${agent.goal.row},${agent.goal.col})`,
        });

        const path = astar(grid, agent.start, agent.goal, []);
        if (!path) {
            log?.({
                level: "warning",
                message: `CBS: No path exists for Agent ${agent.name}. Problem is unsolvable.`,
            });
            return null;
        }

        log?.({
            level: "success",
            message: `CBS: Agent ${agent.name} initial path length: ${path.length - 1} steps`,
        });

        rootPaths.set(agent.id, path);
    }

    const rootCost = computeCost(rootPaths);
    const root: CTNode = {
        constraints: [],
        paths: rootPaths,
        cost: rootCost,
    };

    // --- Open list (sorted by cost, simple array for small instances) ---
    const open: CTNode[] = [root];
    let iterations = 0;
    const maxIterations = 5000; // Safety limit

    while (open.length > 0 && iterations < maxIterations) {
        iterations++;

        // Pick the node with lowest cost
        open.sort((a, b) => a.cost - b.cost);
        const current = open.shift()!;

        // Check for conflicts
        const conflict = findFirstConflict(current.paths);

        if (!conflict) {
            // No conflicts -- we have a solution!
            const elapsed = performance.now() - startTime;
            const makespan = computeMakespan(current.paths);

            log?.({
                level: "success",
                message: `CBS: Solution found! Cost: ${current.cost}, Makespan: ${makespan}, Conflicts resolved: ${conflictsResolved}, Time: ${elapsed.toFixed(1)}ms`,
            });

            return {
                paths: current.paths,
                cost: current.cost,
                makespan,
                algorithm: "cbs",
                computeTimeMs: elapsed,
                conflictsResolved,
            };
        }

        // Log the conflict
        conflictsResolved++;
        const conflictAgentNames = agents.filter(
            (a) => a.id === conflict.agent1 || a.id === conflict.agent2
        );
        log?.({
            level: "conflict",
            message: `CBS: ${conflict.type} conflict between ${conflictAgentNames.map((a) => a.name).join(" and ")} at (${conflict.position1.row},${conflict.position1.col}) t=${conflict.timestep}`,
        });

        // Branch: create two child nodes
        const constrainedAgents = [conflict.agent1, conflict.agent2];

        for (const constrainedAgent of constrainedAgents) {
            const agentObj = agents.find((a) => a.id === constrainedAgent)!;

            // Build new constraint
            const newConstraint: Constraint = {
                agentId: constrainedAgent,
                position: conflict.position1,
                timestep: conflict.timestep,
            };

            const childConstraints = [...current.constraints, newConstraint];

            // Get constraints specific to this agent
            const agentConstraints = childConstraints.filter(
                (c) => c.agentId === constrainedAgent
            );

            log?.({
                level: "route",
                message: `CBS: Re-routing Agent ${agentObj.name} with ${agentConstraints.length} constraints`,
            });

            // Re-plan only the constrained agent
            const newPath = astar(
                grid,
                agentObj.start,
                agentObj.goal,
                agentConstraints
            );

            if (!newPath) {
                log?.({
                    level: "warning",
                    message: `CBS: Agent ${agentObj.name} cannot find path with current constraints. Pruning branch.`,
                });
                continue; // Prune this branch
            }

            // Build child node with updated path
            const childPaths = new Map(current.paths);
            childPaths.set(constrainedAgent, newPath);

            const childCost = computeCost(childPaths);

            log?.({
                level: "info",
                message: `CBS: New path for Agent ${agentObj.name}: ${newPath.length - 1} steps (branch cost: ${childCost})`,
            });

            open.push({
                constraints: childConstraints,
                paths: childPaths,
                cost: childCost,
            });
        }
    }

    // Exceeded iteration limit
    const elapsed = performance.now() - startTime;
    log?.({
        level: "warning",
        message: `CBS: Search exhausted after ${iterations} iterations (${elapsed.toFixed(1)}ms). No solution found.`,
    });

    return null;
}

/** Sum of all path lengths (each path length - 1 = number of moves). */
function computeCost(paths: Map<number, PathStep[]>): number {
    let cost = 0;
    for (const path of paths.values()) {
        cost += path.length - 1;
    }
    return cost;
}

/** Maximum path length across all agents. */
function computeMakespan(paths: Map<number, PathStep[]>): number {
    let max = 0;
    for (const path of paths.values()) {
        if (path.length - 1 > max) max = path.length - 1;
    }
    return max;
}
