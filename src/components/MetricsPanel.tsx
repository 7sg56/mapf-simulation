"use client";

// ============================================================
// Metrics Panel Component
// ============================================================
// Displays solution statistics: cost, makespan, computation time,
// conflicts resolved, and per-agent path lengths.

import React from "react";
import { Solution, Agent } from "@/lib/types";

interface MetricsPanelProps {
    solution: Solution | null;
    agents: Agent[];
}

export default function MetricsPanel({ solution, agents }: MetricsPanelProps) {
    if (!solution) {
        return (
            <div className="panel">
                <div className="panel-header">
                    <h2>Metrics</h2>
                </div>
                <div className="panel-body">
                    <p className="text-muted text-sm">No solution computed yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="panel-header">
                <h2>Metrics</h2>
                <span
                    style={{
                        fontSize: "0.65rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    {solution.algorithm.toUpperCase()}
                </span>
            </div>
            <div className="panel-body">
                {/* Summary metrics */}
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-label">Total Cost</div>
                        <div className="metric-value" style={{ color: "var(--accent-cyan)" }}>
                            {solution.cost}
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Makespan</div>
                        <div className="metric-value" style={{ color: "var(--accent-orange)" }}>
                            {solution.makespan}
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Conflicts</div>
                        <div className="metric-value" style={{ color: "var(--accent-red)" }}>
                            {solution.conflictsResolved}
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Time</div>
                        <div className="metric-value" style={{ color: "var(--accent-green)" }}>
                            {solution.computeTimeMs.toFixed(1)}
                            <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>ms</span>
                        </div>
                    </div>
                </div>

                {/* Per-agent path lengths */}
                <div className="divider" />
                <table className="path-table">
                    <thead>
                        <tr>
                            <th>Agent</th>
                            <th>Path Length</th>
                            <th>Start</th>
                            <th>Goal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((agent) => {
                            const path = solution.paths.get(agent.id);
                            const len = path ? path.length - 1 : 0;
                            return (
                                <tr key={agent.id}>
                                    <td>
                                        <span style={{ color: agent.color, fontWeight: 600 }}>
                                            {agent.name}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: "var(--font-mono)" }}>{len}</td>
                                    <td style={{ fontFamily: "var(--font-mono)" }}>
                                        ({agent.start.row},{agent.start.col})
                                    </td>
                                    <td style={{ fontFamily: "var(--font-mono)" }}>
                                        ({agent.goal.row},{agent.goal.col})
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
