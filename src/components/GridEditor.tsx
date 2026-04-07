"use client";

// ============================================================
// Grid Editor Component
// ============================================================
// Interactive grid configuration: resize, place obstacles,
// set agent start/goal positions, randomize scenarios.

import React, { useCallback } from "react";
import { Grid, Agent, Position, posKey, AGENT_COLORS } from "@/lib/types";
import { toggleObstacle, randomizeGrid } from "@/lib/grid";

/** The current editing mode (what a click does). */
export type EditMode = "obstacle" | "start" | "goal";

interface GridEditorProps {
    grid: Grid;
    agents: Agent[];
    editMode: EditMode;
    /** Which agent index we are placing start/goal for. */
    activeAgentIndex: number;
    onGridChange: (grid: Grid) => void;
    onAgentsChange: (agents: Agent[]) => void;
    onEditModeChange: (mode: EditMode) => void;
    onActiveAgentIndexChange: (index: number) => void;
}

export default function GridEditor({
    grid,
    agents,
    editMode,
    activeAgentIndex,
    onGridChange,
    onAgentsChange,
    onEditModeChange,
    onActiveAgentIndexChange,
}: GridEditorProps) {
    // --- Grid resize handlers ---
    const handleResize = useCallback(
        (width: number, height: number) => {
            const w = Math.max(3, Math.min(30, width));
            const h = Math.max(3, Math.min(30, height));
            // Clear obstacles that fall outside new bounds
            const newObstacles = new Set<string>();
            grid.obstacles.forEach((key) => {
                const [r, c] = key.split(",").map(Number);
                if (r < h && c < w) newObstacles.add(key);
            });
            onGridChange({ width: w, height: h, obstacles: newObstacles });
            // Remove agents that are out of bounds
            const validAgents = agents.filter(
                (a) =>
                    a.start.row < h &&
                    a.start.col < w &&
                    a.goal.row < h &&
                    a.goal.col < w
            );
            if (validAgents.length !== agents.length) {
                onAgentsChange(validAgents);
            }
        },
        [grid, agents, onGridChange, onAgentsChange]
    );

    // --- Cell click handler ---
    const handleCellClick = useCallback(
        (pos: Position) => {
            const key = posKey(pos);

            if (editMode === "obstacle") {
                // Toggle obstacle, but don't allow on agent start/goal
                const isAgentCell = agents.some(
                    (a) => posKey(a.start) === key || posKey(a.goal) === key
                );
                if (isAgentCell) return;
                const newObstacles = toggleObstacle(grid, pos);
                onGridChange({ ...grid, obstacles: newObstacles });
            } else if (editMode === "start") {
                // Set start for active agent
                if (grid.obstacles.has(key)) return;
                // Don't allow overlap with other agents' starts/goals
                const overlap = agents.some(
                    (a, i) =>
                        i !== activeAgentIndex &&
                        (posKey(a.start) === key || posKey(a.goal) === key)
                );
                if (overlap) return;

                const updated = [...agents];
                if (activeAgentIndex < updated.length) {
                    updated[activeAgentIndex] = {
                        ...updated[activeAgentIndex],
                        start: pos,
                    };
                }
                onAgentsChange(updated);
            } else if (editMode === "goal") {
                if (grid.obstacles.has(key)) return;
                const overlap = agents.some(
                    (a, i) =>
                        i !== activeAgentIndex &&
                        (posKey(a.start) === key || posKey(a.goal) === key)
                );
                if (overlap) return;

                const updated = [...agents];
                if (activeAgentIndex < updated.length) {
                    updated[activeAgentIndex] = {
                        ...updated[activeAgentIndex],
                        goal: pos,
                    };
                }
                onAgentsChange(updated);
            }
        },
        [editMode, grid, agents, activeAgentIndex, onGridChange, onAgentsChange]
    );

    // --- Add agent ---
    const handleAddAgent = useCallback(() => {
        if (agents.length >= 10) return; // Max 10 agents
        const id = agents.length;
        // Find two free cells
        const occupied = new Set<string>();
        grid.obstacles.forEach((k) => occupied.add(k));
        agents.forEach((a) => {
            occupied.add(posKey(a.start));
            occupied.add(posKey(a.goal));
        });

        let startPos: Position | null = null;
        let goalPos: Position | null = null;

        for (let r = 0; r < grid.height && (!startPos || !goalPos); r++) {
            for (let c = 0; c < grid.width && (!startPos || !goalPos); c++) {
                const key = posKey({ row: r, col: c });
                if (!occupied.has(key)) {
                    if (!startPos) {
                        startPos = { row: r, col: c };
                        occupied.add(key);
                    } else if (!goalPos) {
                        goalPos = { row: r, col: c };
                        occupied.add(key);
                    }
                }
            }
        }

        if (!startPos || !goalPos) return; // No room

        const newAgent: Agent = {
            id,
            start: startPos,
            goal: goalPos,
            color: AGENT_COLORS[id % AGENT_COLORS.length],
            name: `A${id}`,
        };

        onAgentsChange([...agents, newAgent]);
        onActiveAgentIndexChange(id);
    }, [agents, grid, onAgentsChange, onActiveAgentIndexChange]);

    // --- Remove agent ---
    const handleRemoveAgent = useCallback(
        (index: number) => {
            const updated = agents
                .filter((_, i) => i !== index)
                .map((a, i) => ({
                    ...a,
                    id: i,
                    name: `A${i}`,
                    color: AGENT_COLORS[i % AGENT_COLORS.length],
                }));
            onAgentsChange(updated);
            if (activeAgentIndex >= updated.length) {
                onActiveAgentIndexChange(Math.max(0, updated.length - 1));
            }
        },
        [agents, activeAgentIndex, onAgentsChange, onActiveAgentIndexChange]
    );

    // --- Randomize ---
    const handleRandomize = useCallback(() => {
        const result = randomizeGrid(grid.width, grid.height, 0.2, 3);
        if (result) {
            onGridChange(result.grid);
            onAgentsChange(result.agents);
        }
    }, [grid.width, grid.height, onGridChange, onAgentsChange]);

    // --- Clear ---
    const handleClear = useCallback(() => {
        onGridChange({ ...grid, obstacles: new Set<string>() });
        onAgentsChange([]);
    }, [grid, onGridChange, onAgentsChange]);

    // --- Determine cell class ---
    const getCellInfo = (pos: Position) => {
        const key = posKey(pos);

        // Check if obstacle
        if (grid.obstacles.has(key)) {
            return { className: "grid-cell grid-cell-obstacle", label: "", color: "" };
        }

        // Check agents
        for (const agent of agents) {
            if (posKey(agent.start) === key) {
                return {
                    className: "grid-cell grid-cell-start",
                    label: agent.name,
                    color: agent.color,
                };
            }
            if (posKey(agent.goal) === key) {
                return {
                    className: "grid-cell grid-cell-goal",
                    label: agent.name,
                    color: agent.color,
                };
            }
        }

        return { className: "grid-cell grid-cell-empty", label: "", color: "" };
    };

    return (
        <div className="setup-layout">
            {/* Sidebar */}
            <div className="setup-sidebar">
                {/* Grid Size */}
                <div className="panel">
                    <div className="panel-header">
                        <h2>Grid Size</h2>
                    </div>
                    <div className="panel-body">
                        <div className="input-row">
                            <div className="input-group">
                                <label>Rows</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={grid.height}
                                    min={3}
                                    max={30}
                                    onChange={(e) =>
                                        handleResize(grid.width, parseInt(e.target.value) || 3)
                                    }
                                />
                            </div>
                            <div className="input-group">
                                <label>Cols</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={grid.width}
                                    min={3}
                                    max={30}
                                    onChange={(e) =>
                                        handleResize(parseInt(e.target.value) || 3, grid.height)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Mode */}
                <div className="panel">
                    <div className="panel-header">
                        <h2>Edit Mode</h2>
                    </div>
                    <div className="panel-body">
                        <div className="toolbar">
                            <button
                                className={`mode-btn ${editMode === "obstacle" ? "active" : ""}`}
                                onClick={() => onEditModeChange("obstacle")}
                            >
                                Obstacle
                            </button>
                            <button
                                className={`mode-btn ${editMode === "start" ? "active" : ""}`}
                                onClick={() => onEditModeChange("start")}
                            >
                                Start
                            </button>
                            <button
                                className={`mode-btn ${editMode === "goal" ? "active" : ""}`}
                                onClick={() => onEditModeChange("goal")}
                            >
                                Goal
                            </button>
                        </div>
                    </div>
                </div>

                {/* Agents */}
                <div className="panel">
                    <div className="panel-header">
                        <h2>Agents ({agents.length})</h2>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={handleAddAgent}
                            disabled={agents.length >= 10}
                        >
                            + Add
                        </button>
                    </div>
                    <div className="panel-body">
                        {agents.length === 0 && (
                            <p className="text-muted text-sm">
                                No agents yet. Click &quot;Add&quot; or &quot;Randomize&quot;.
                            </p>
                        )}
                        <div className="agent-list">
                            {agents.map((agent, i) => (
                                <div
                                    key={agent.id}
                                    className="agent-list-item"
                                    style={{
                                        borderColor:
                                            i === activeAgentIndex
                                                ? agent.color
                                                : "var(--border-subtle)",
                                    }}
                                    onClick={() => onActiveAgentIndexChange(i)}
                                >
                                    <div
                                        className="agent-list-color"
                                        style={{ background: agent.color }}
                                    />
                                    <div className="agent-list-info">
                                        <strong>{agent.name}</strong>{" "}
                                        ({agent.start.row},{agent.start.col}) &rarr; ({agent.goal.row},{agent.goal.col})
                                    </div>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveAgent(i);
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="panel">
                    <div className="panel-body">
                        <div className="toolbar">
                            <button className="btn btn-ghost" onClick={handleRandomize}>
                                Randomize
                            </button>
                            <button className="btn btn-ghost" onClick={handleClear}>
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="legend">
                    <div className="legend-item">
                        <div
                            className="legend-swatch"
                            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}
                        />
                        Empty
                    </div>
                    <div className="legend-item">
                        <div
                            className="legend-swatch"
                            style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}
                        />
                        Obstacle
                    </div>
                    <div className="legend-item">
                        <div
                            className="legend-swatch"
                            style={{ background: "var(--accent-cyan)", border: "2px solid var(--accent-cyan)" }}
                        />
                        Start
                    </div>
                    <div className="legend-item">
                        <div
                            className="legend-swatch"
                            style={{ background: "transparent", border: "2px dashed var(--accent-cyan)" }}
                        />
                        Goal
                    </div>
                </div>
            </div>

            {/* Main grid area */}
            <div className="setup-main">
                <div
                    className="grid-container"
                    style={{
                        gridTemplateColumns: `repeat(${grid.width}, var(--cell-size))`,
                    }}
                >
                    {Array.from({ length: grid.height }, (_, r) =>
                        Array.from({ length: grid.width }, (_, c) => {
                            const pos: Position = { row: r, col: c };
                            const info = getCellInfo(pos);
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={info.className}
                                    style={
                                        info.color
                                            ? {
                                                borderColor: info.color,
                                                background: info.color + "20",
                                                color: info.color,
                                            }
                                            : undefined
                                    }
                                    onClick={() => handleCellClick(pos)}
                                >
                                    {info.label}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
