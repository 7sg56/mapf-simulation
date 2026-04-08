// ============================================================
// MAPF Simulator - Conflict Detection
// ============================================================
// Scans all agent path combinations for vertex and edge collisions.

import { Conflict, PathStep, posKey } from "./types";

/**
 * Find the first conflict among a set of agent paths.
 *
 * Checks for:
 * 1. Vertex conflicts: two agents at the same cell at the same timestep.
 * 2. Edge conflicts: two agents swap positions between consecutive timesteps.
 *
 * @param paths Map of agentId -> PathStep[]
 * @returns     The first Conflict found, or null if paths are conflict-free.
 */
export function findFirstConflict(
    paths: Map<number, PathStep[]>
): Conflict | null {
    const agentIds = Array.from(paths.keys());

    // Determine the maximum timestep across all paths
    let maxT = 0;
    for (const p of paths.values()) {
        if (p.length > maxT) maxT = p.length;
    }

    // Helper: get agent's position at time t.
    // If t >= path length, the agent has disappeared (reached goal).
    function getPos(agentId: number, t: number): PathStep | null {
        const path = paths.get(agentId)!;
        if (t >= path.length) return null; // agent has disappeared at goal
        return path[t];
    }

    // Check every pair of agents at every timestep
    for (let t = 0; t < maxT; t++) {
        for (let i = 0; i < agentIds.length; i++) {
            for (let j = i + 1; j < agentIds.length; j++) {
                const a1 = agentIds[i];
                const a2 = agentIds[j];
                const pos1 = getPos(a1, t);
                const pos2 = getPos(a2, t);

                // If either agent has disappeared, no conflict possible
                if (!pos1 || !pos2) continue;

                // --- Vertex conflict ---
                if (posKey(pos1.position) === posKey(pos2.position)) {
                    return {
                        type: "vertex",
                        agent1: a1,
                        agent2: a2,
                        position1: pos1.position,
                        timestep: t,
                    };
                }

                // --- Edge conflict (swap detection) ---
                if (t + 1 < maxT) {
                    const next1 = getPos(a1, t + 1);
                    const next2 = getPos(a2, t + 1);

                    if (next1 && next2) {
                        // Check if agents swap: a1 goes to a2's position and vice versa
                        if (
                            posKey(pos1.position) === posKey(next2.position) &&
                            posKey(pos2.position) === posKey(next1.position)
                        ) {
                            return {
                                type: "edge",
                                agent1: a1,
                                agent2: a2,
                                position1: pos1.position,
                                position2: pos2.position,
                                timestep: t,
                            };
                        }
                    }
                }
            }
        }
    }

    return null;
}

/**
 * Find ALL conflicts in a set of paths (for logging purposes).
 */
export function findAllConflicts(
    paths: Map<number, PathStep[]>
): Conflict[] {
    const conflicts: Conflict[] = [];
    const agentIds = Array.from(paths.keys());

    let maxT = 0;
    for (const p of paths.values()) {
        if (p.length > maxT) maxT = p.length;
    }

    function getPos(agentId: number, t: number): PathStep | null {
        const path = paths.get(agentId)!;
        if (t >= path.length) return null;
        return path[t];
    }

    for (let t = 0; t < maxT; t++) {
        for (let i = 0; i < agentIds.length; i++) {
            for (let j = i + 1; j < agentIds.length; j++) {
                const a1 = agentIds[i];
                const a2 = agentIds[j];
                const pos1 = getPos(a1, t);
                const pos2 = getPos(a2, t);

                if (!pos1 || !pos2) continue;

                if (posKey(pos1.position) === posKey(pos2.position)) {
                    conflicts.push({
                        type: "vertex",
                        agent1: a1,
                        agent2: a2,
                        position1: pos1.position,
                        timestep: t,
                    });
                }

                if (t + 1 < maxT) {
                    const next1 = getPos(a1, t + 1);
                    const next2 = getPos(a2, t + 1);

                    if (next1 && next2) {
                        if (
                            posKey(pos1.position) === posKey(next2.position) &&
                            posKey(pos2.position) === posKey(next1.position)
                        ) {
                            conflicts.push({
                                type: "edge",
                                agent1: a1,
                                agent2: a2,
                                position1: pos1.position,
                                position2: pos2.position,
                                timestep: t,
                            });
                        }
                    }
                }
            }
        }
    }

    return conflicts;
}
