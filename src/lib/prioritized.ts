// ============================================================
// MAPF Simulator - Prioritized Planning
// ============================================================
// A simpler, faster (but suboptimal) approach: plan agents
// one-by-one in priority order. Each subsequent agent treats
// earlier agents' paths as moving obstacles.

import { Grid, Agent, Constraint, PathStep, Solution, LogEntry } from "./types";
import { astar } from "./astar";

/** Logger callback type. */
type Logger = (entry: Omit<LogEntry, "id" | "timestamp">) => void;

/**
 * Solve MAPF using Prioritized Planning.
 *
 * Algorithm:
 * 1. Order agents by priority (default: by ID).
 * 2. For each agent, convert all previously planned agents' paths
 *    into constraints (the new agent cannot be where they are).
 * 3. Run space-time A* with those constraints.
 *
 * This is fast but:
 * - May produce suboptimal solutions.
 * - May fail even when CBS would succeed (order-dependent).
 *
 * @param grid   The grid environment
 * @param agents List of agents with start/goal
 * @param log    Optional logger callback
 * @returns      A Solution (possibly suboptimal), or null if any agent fails
 */
export function solvePrioritized(
    grid: Grid,
    agents: Agent[],
    log?: Logger
): Solution | null {
    const startTime = performance.now();

    log?.({
        level: "info",
        message: `Prioritized: Starting search for ${agents.length} agents`,
    });

    const paths = new Map<number, PathStep[]>();
    const allConstraints: Constraint[] = [];

    // Plan agents in order of their ID (priority)
    for (const agent of agents) {
        // Constraints for this agent: everywhere that previously-planned
        // agents will be at each timestep
        const agentConstraints = allConstraints.filter(
            (c) => c.agentId === agent.id
        );

        log?.({
            level: "info",
            message: `Prioritized: Planning Agent ${agent.name} (priority ${agent.id + 1}/${agents.length}) with ${agentConstraints.length} constraints`,
        });

        const path = astar(grid, agent.start, agent.goal, agentConstraints);

        if (!path) {
            const elapsed = performance.now() - startTime;
            log?.({
                level: "warning",
                message: `Prioritized: Agent ${agent.name} cannot find a path. Search failed after ${elapsed.toFixed(1)}ms.`,
            });
            return null;
        }

        log?.({
            level: "success",
            message: `Prioritized: Agent ${agent.name} path found: ${path.length - 1} steps`,
        });

        paths.set(agent.id, path);

        // Convert this agent's path into constraints for all subsequent agents.
        // Each position this agent occupies becomes a constraint for every
        // other unplanned agent.
        for (const step of path) {
            for (const futureAgent of agents) {
                if (futureAgent.id <= agent.id) continue; // already planned or self
                allConstraints.push({
                    agentId: futureAgent.id,
                    position: step.position,
                    timestep: step.timestep,
                });
            }
        }
    }

    const elapsed = performance.now() - startTime;
    let cost = 0;
    let makespan = 0;
    for (const path of paths.values()) {
        const len = path.length - 1;
        cost += len;
        if (len > makespan) makespan = len;
    }

    log?.({
        level: "success",
        message: `Prioritized: Solution found! Cost: ${cost}, Makespan: ${makespan}, Time: ${elapsed.toFixed(1)}ms`,
    });

    return {
        paths,
        cost,
        makespan,
        algorithm: "prioritized",
        computeTimeMs: elapsed,
        conflictsResolved: 0, // No conflicts resolved in prioritized planning
    };
}
