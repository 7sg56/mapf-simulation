"use client";

// ============================================================
// Grid View Component (Simulation Mode)
// ============================================================
// Renders the grid during simulation with animated agents,
// path trails, goal markers, and collision highlighting.

import React, { useMemo } from "react";
import { Grid, Agent, Position, PathStep, posKey } from "@/lib/types";
import { SimulationState } from "@/lib/simulator";

interface GridViewProps {
    grid: Grid;
    agents: Agent[];
    paths: Map<number, PathStep[]>;
    simState: SimulationState;
}

export default function GridView({
    grid,
    agents,
    paths,
    simState,
}: GridViewProps) {
    // Build lookup maps for rendering
    const agentPositionMap = useMemo(() => {
        const map = new Map<string, Agent>();
        for (const agent of agents) {
            if (simState.arrivedAgents.has(agent.id)) continue;
            const pos = simState.agentPositions.get(agent.id);
            if (pos) {
                map.set(posKey(pos), agent);
            }
        }
        return map;
    }, [agents, simState]);

    // Path trails: show where each agent has been up to current timestep
    const trailMap = useMemo(() => {
        const map = new Map<string, string>(); // posKey -> agent color
        for (const agent of agents) {
            const path = paths.get(agent.id);
            if (!path) continue;
            // Show trail from step 0 to current timestep (exclusive of current)
            const end = Math.min(simState.timestep, path.length);
            for (let t = 0; t < end; t++) {
                const key = posKey(path[t].position);
                map.set(key, agent.color);
            }
        }
        return map;
    }, [agents, paths, simState.timestep]);

    // Goal positions
    const goalMap = useMemo(() => {
        const map = new Map<string, Agent>();
        for (const agent of agents) {
            // Show goal only if agent hasn't arrived yet
            if (!simState.arrivedAgents.has(agent.id)) {
                map.set(posKey(agent.goal), agent);
            }
        }
        return map;
    }, [agents, simState.arrivedAgents]);

    // Render a single cell
    const renderCell = (pos: Position) => {
        const key = posKey(pos);
        const isObstacle = grid.obstacles.has(key);
        const agentHere = agentPositionMap.get(key);
        const goalHere = goalMap.get(key);
        const trailColor = trailMap.get(key);

        let className = "grid-cell";
        let style: React.CSSProperties = {};

        if (isObstacle) {
            className += " grid-cell-obstacle";
        } else {
            className += " grid-cell-empty";
        }

        // Goal marker (draw underneath agent)
        if (goalHere && !isObstacle) {
            style.borderColor = goalHere.color;
            style.border = `2px dashed ${goalHere.color}`;
            style.background = goalHere.color + "10";
        }

        return (
            <div key={key} className={className} style={style}>
                {/* Path trail dot */}
                {trailColor && !isObstacle && !agentHere && (
                    <div
                        className="path-trail"
                        style={{ background: trailColor }}
                    />
                )}

                {/* Agent marker */}
                {agentHere && (
                    <div
                        className="agent-marker"
                        style={{
                            background: agentHere.color,
                            boxShadow: `0 0 14px ${agentHere.color}60`,
                        }}
                    >
                        {agentHere.name}
                    </div>
                )}

                {/* Goal label (when no agent on top) */}
                {goalHere && !agentHere && (
                    <span
                        style={{
                            color: goalHere.color,
                            fontSize: "0.55rem",
                            opacity: 0.7,
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        {goalHere.name}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div>
            <div
                className="grid-container"
                style={{
                    gridTemplateColumns: `repeat(${grid.width}, var(--cell-size))`,
                }}
            >
                {Array.from({ length: grid.height }, (_, r) =>
                    Array.from({ length: grid.width }, (_, c) =>
                        renderCell({ row: r, col: c })
                    )
                )}
            </div>

            {/* Agent status bar */}
            <div
                style={{
                    display: "flex",
                    gap: "var(--space-sm)",
                    marginTop: "var(--space-md)",
                    flexWrap: "wrap",
                    justifyContent: "center",
                }}
            >
                {agents.map((agent) => {
                    const arrived = simState.arrivedAgents.has(agent.id);
                    return (
                        <div
                            key={agent.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-sm)",
                                background: arrived ? "var(--accent-green-dim)" : "var(--bg-tertiary)",
                                border: `1px solid ${arrived ? "var(--accent-green)" : agent.color + "40"}`,
                                fontSize: "0.7rem",
                                color: arrived ? "var(--accent-green)" : agent.color,
                                fontFamily: "var(--font-mono)",
                                opacity: arrived ? 0.6 : 1,
                            }}
                        >
                            <div
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: arrived ? "var(--accent-green)" : agent.color,
                                }}
                            />
                            {agent.name} {arrived ? "(done)" : ""}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
