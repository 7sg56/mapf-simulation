// ============================================================
// MAPF Simulator - Simulation Engine
// ============================================================
// Manages timestep-by-timestep execution of computed paths,
// tracks agent positions, and handles the disappear-at-goal model.

import { Agent, PathStep, Position, posKey, LogEntry } from "./types";

/** The state of the simulation at a given timestep. */
export interface SimulationState {
    timestep: number;
    /** Current position of each active agent (agentId -> position). */
    agentPositions: Map<number, Position>;
    /** Previous position of each active agent (for animation). */
    agentPreviousPositions: Map<number, Position>;
    /** Set of agent IDs that have reached their goal and disappeared. */
    arrivedAgents: Set<number>;
    /** Whether the simulation is complete (all agents arrived). */
    isComplete: boolean;
    /** Maximum timestep across all paths. */
    maxTimestep: number;
}

/** Logger callback type. */
type Logger = (entry: Omit<LogEntry, "id" | "timestamp">) => void;

/**
 * Create initial simulation state from solved paths.
 *
 * @param agents All agents in the scenario
 * @param paths  Solved paths (agentId -> PathStep[])
 * @returns      The initial SimulationState at timestep 0
 */
export function createSimulation(
    agents: Agent[],
    paths: Map<number, PathStep[]>
): SimulationState {
    const agentPositions = new Map<number, Position>();
    const agentPreviousPositions = new Map<number, Position>();

    let maxTimestep = 0;

    for (const agent of agents) {
        const path = paths.get(agent.id);
        if (path && path.length > 0) {
            agentPositions.set(agent.id, path[0].position);
            agentPreviousPositions.set(agent.id, path[0].position);
            if (path.length - 1 > maxTimestep) {
                maxTimestep = path.length - 1;
            }
        }
    }

    return {
        timestep: 0,
        agentPositions,
        agentPreviousPositions,
        arrivedAgents: new Set<number>(),
        isComplete: false,
        maxTimestep,
    };
}

/**
 * Advance the simulation by one timestep.
 *
 * Moves each active agent to their next position along their path.
 * If an agent reaches its goal, it "disappears" (disappear-at-goal model).
 *
 * @param state   Current simulation state
 * @param agents  All agents
 * @param paths   Solved paths
 * @param log     Optional logger callback
 * @returns       New SimulationState for the next timestep
 */
export function stepSimulation(
    state: SimulationState,
    agents: Agent[],
    paths: Map<number, PathStep[]>,
    log?: Logger
): SimulationState {
    if (state.isComplete) return state;

    const nextTimestep = state.timestep + 1;
    const nextPositions = new Map<number, Position>();
    const prevPositions = new Map<number, Position>();
    const arrivedAgents = new Set(state.arrivedAgents);

    for (const agent of agents) {
        // Skip agents that have already arrived
        if (arrivedAgents.has(agent.id)) continue;

        const path = paths.get(agent.id);
        if (!path) continue;

        // Get current position (for tracking previous)
        const currentPos = state.agentPositions.get(agent.id);
        if (currentPos) {
            prevPositions.set(agent.id, currentPos);
        }

        if (nextTimestep < path.length) {
            // Agent still has steps to take
            const nextPos = path[nextTimestep].position;
            nextPositions.set(agent.id, nextPos);

            // Check if agent just reached its goal
            if (
                nextPos.row === agent.goal.row &&
                nextPos.col === agent.goal.col &&
                nextTimestep === path.length - 1
            ) {
                arrivedAgents.add(agent.id);
                log?.({
                    level: "success",
                    message: `Agent ${agent.name} reached goal at (${nextPos.row},${nextPos.col}) - disappearing from grid`,
                });
            }
        } else {
            // Agent has already completed their path -- they've disappeared
            arrivedAgents.add(agent.id);
        }
    }

    const isComplete = arrivedAgents.size === agents.length;

    if (isComplete) {
        log?.({
            level: "success",
            message: `All agents have reached their goals! Simulation complete at timestep ${nextTimestep}.`,
        });
    }

    return {
        timestep: nextTimestep,
        agentPositions: nextPositions,
        agentPreviousPositions: prevPositions,
        arrivedAgents,
        isComplete,
        maxTimestep: state.maxTimestep,
    };
}

/**
 * Reset the simulation back to timestep 0.
 */
export function resetSimulation(
    agents: Agent[],
    paths: Map<number, PathStep[]>
): SimulationState {
    return createSimulation(agents, paths);
}

/**
 * Get the set of cells occupied by agents who have NOT yet reached
 * their goal at the current timestep. Used for rendering.
 */
export function getActiveAgentCells(
    state: SimulationState
): Map<string, number> {
    const cells = new Map<string, number>(); // posKey -> agentId
    for (const [agentId, pos] of state.agentPositions) {
        if (!state.arrivedAgents.has(agentId)) {
            cells.set(posKey(pos), agentId);
        }
    }
    return cells;
}
