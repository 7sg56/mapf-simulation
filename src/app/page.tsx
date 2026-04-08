"use client";

// ============================================================
// MAPF Simulator - Main Page
// ============================================================
// Single-page layout: left sidebar (setup), center (grid),
// right sidebar (solve + playback + logs + metrics).
// Everything is always visible -- no phase switching.

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Grid, Agent, Solution, LogEntry, Position, posKey } from "@/lib/types";
import { createGrid, toggleObstacle, randomizeGrid } from "@/lib/grid";
import { AGENT_COLORS } from "@/lib/types";
import { solveCBS } from "@/lib/cbs";
import { solvePrioritized } from "@/lib/prioritized";
import {
  SimulationState,
  createSimulation,
  stepSimulation,
  resetSimulation,
} from "@/lib/simulator";
import LogPanel from "@/components/LogPanel";
import MetricsPanel from "@/components/MetricsPanel";

type EditMode = "obstacle" | "start" | "goal";

export default function HomePage() {
  // --- Grid & Agent State ---
  const [grid, setGrid] = useState<Grid>(() => createGrid(8, 8));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("obstacle");
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);

  // --- Algorithm & Solving ---
  const [algorithm, setAlgorithm] = useState<"cbs" | "prioritized">("cbs");
  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [noSolution, setNoSolution] = useState(false);

  // --- Simulation ---
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  // --- Logging ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp">) => {
      const id = logIdRef.current++;
      setLogs((prev) => [...prev, { ...entry, id, timestamp: Date.now() }]);
    },
    []
  );
  const clearLogs = useCallback(() => setLogs([]), []);

  // Derived: are we in simulation mode (have a solution)?
  const isSimulating = solution !== null && simState !== null;

  // --- Clear solution when grid/agents change ---
  const clearSolution = useCallback(() => {
    setSolution(null);
    setSimState(null);
    setIsPlaying(false);
    setNoSolution(false);
  }, []);

  // --- Grid resize ---
  const handleResize = useCallback(
    (width: number, height: number) => {
      const w = Math.max(3, Math.min(30, width));
      const h = Math.max(3, Math.min(30, height));
      const newObstacles = new Set<string>();
      grid.obstacles.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        if (r < h && c < w) newObstacles.add(key);
      });
      setGrid({ width: w, height: h, obstacles: newObstacles });
      setAgents((prev) =>
        prev.filter(
          (a) => a.start.row < h && a.start.col < w && a.goal.row < h && a.goal.col < w
        )
      );
      clearSolution();
    },
    [grid, clearSolution]
  );

  // --- Cell click ---
  const handleCellClick = useCallback(
    (pos: Position) => {
      if (isSimulating) return; // Don't edit while simulating
      const key = posKey(pos);

      if (editMode === "obstacle") {
        const isAgentCell = agents.some(
          (a) => posKey(a.start) === key || posKey(a.goal) === key
        );
        if (isAgentCell) return;
        setGrid((g) => ({ ...g, obstacles: toggleObstacle(g, pos) }));
      } else if (editMode === "start") {
        if (grid.obstacles.has(key)) return;
        const overlap = agents.some(
          (a, i) => i !== activeAgentIndex && (posKey(a.start) === key || posKey(a.goal) === key)
        );
        if (overlap) return;
        setAgents((prev) =>
          prev.map((a, i) => (i === activeAgentIndex ? { ...a, start: pos } : a))
        );
      } else if (editMode === "goal") {
        if (grid.obstacles.has(key)) return;
        const overlap = agents.some(
          (a, i) => i !== activeAgentIndex && (posKey(a.start) === key || posKey(a.goal) === key)
        );
        if (overlap) return;
        setAgents((prev) =>
          prev.map((a, i) => (i === activeAgentIndex ? { ...a, goal: pos } : a))
        );
      }
      clearSolution();
    },
    [editMode, grid, agents, activeAgentIndex, isSimulating, clearSolution]
  );

  // --- Add agent ---
  const handleAddAgent = useCallback(() => {
    if (agents.length >= 10) return;
    const id = agents.length;
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
    if (!startPos || !goalPos) return;
    setAgents((prev) => [
      ...prev,
      { id, start: startPos, goal: goalPos, color: AGENT_COLORS[id % AGENT_COLORS.length], name: `A${id}` },
    ]);
    setActiveAgentIndex(id);
    clearSolution();
  }, [agents, grid, clearSolution]);

  // --- Remove agent ---
  const handleRemoveAgent = useCallback(
    (index: number) => {
      setAgents((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((a, i) => ({ ...a, id: i, name: `A${i}`, color: AGENT_COLORS[i % AGENT_COLORS.length] }))
      );
      setActiveAgentIndex((prev) => Math.max(0, Math.min(prev, agents.length - 2)));
      clearSolution();
    },
    [agents.length, clearSolution]
  );

  // --- Randomize ---
  const handleRandomize = useCallback(() => {
    // Keep the current number of agents, default to 3 if none, but don't exceed 10.
    const count = agents.length > 0 ? agents.length : 3;
    const result = randomizeGrid(grid.width, grid.height, 0.2, count);
    if (result) {
      setGrid(result.grid);
      setAgents(result.agents);
      clearSolution();
    }
  }, [grid.width, grid.height, agents.length, clearSolution]);

  // --- Clear ---
  const handleClear = useCallback(() => {
    setGrid((g) => ({ ...g, obstacles: new Set<string>() }));
    setAgents([]);
    clearSolution();
    clearLogs();
  }, [clearSolution, clearLogs]);

  // --- Solve ---
  const handleSolve = useCallback(() => {
    if (agents.length === 0) return;
    setIsSolving(true);
    setNoSolution(false);
    setSolution(null);
    setSimState(null);
    setIsPlaying(false);
    clearLogs();

    setTimeout(() => {
      const result = algorithm === "cbs"
        ? solveCBS(grid, agents, addLog)
        : solvePrioritized(grid, agents, addLog);

      if (result) {
        setSolution(result);
        setSimState(createSimulation(agents, result.paths));
        setNoSolution(false);
      } else {
        setNoSolution(true);
        addLog({ level: "warning", message: "No solution found. Try removing obstacles or reducing agent count." });
      }
      setIsSolving(false);
    }, 50);
  }, [agents, grid, algorithm, addLog, clearLogs]);

  // --- Playback ---
  const handleStep = useCallback(() => {
    if (!simState || !solution || simState.isComplete) return;
    setSimState(stepSimulation(simState, agents, solution.paths, addLog));
  }, [simState, solution, agents, addLog]);

  const handleReset = useCallback(() => {
    if (!solution) return;
    setSimState(resetSimulation(agents, solution.paths));
    setIsPlaying(false);
  }, [solution, agents]);

  // --- Auto-play ---
  useEffect(() => {
    if (!isPlaying || !simState || !solution || simState.isComplete) return;
    const interval = setInterval(() => {
      setSimState((prev) => {
        if (!prev || prev.isComplete) { setIsPlaying(false); return prev; }
        return stepSimulation(prev, agents, solution.paths, addLog);
      });
    }, speed);
    return () => clearInterval(interval);
  }, [isPlaying, simState?.isComplete, speed, agents, solution, addLog, simState]);

  // --- Back to edit (clear solution) ---
  const handleBackToEdit = useCallback(() => {
    clearSolution();
    clearLogs();
  }, [clearSolution, clearLogs]);

  // --- Cell rendering ---
  const getCellInfo = (pos: Position) => {
    const key = posKey(pos);

    // During simulation, show agent positions from simState
    if (isSimulating) {
      if (grid.obstacles.has(key)) {
        return { className: "grid-cell grid-cell-obstacle", label: "", color: "", isAgent: false, goalReached: false };
      }
      // Check if an active agent is here
      for (const agent of agents) {
        if (simState.arrivedAgents.has(agent.id)) continue;
        const agentPos = simState.agentPositions.get(agent.id);
        if (agentPos && posKey(agentPos) === key) {
          return { className: "grid-cell grid-cell-empty", label: agent.name, color: agent.color, isAgent: true, goalReached: false };
        }
      }
      // Check goal markers -- always show, highlight if arrived
      for (const agent of agents) {
        if (posKey(agent.goal) === key) {
          const reached = simState.arrivedAgents.has(agent.id);
          const cls = reached ? "grid-cell grid-cell-goal goal-reached" : "grid-cell grid-cell-goal";
          return { className: cls, label: agent.name, color: agent.color, isAgent: false, goalReached: reached };
        }
      }
      // Check start markers -- always show, highlight like finished node
      for (const agent of agents) {
        if (posKey(agent.start) === key) {
          return { className: "grid-cell grid-cell-start goal-reached", label: "", color: agent.color, isAgent: false, goalReached: true };
        }
      }
      return { className: "grid-cell grid-cell-empty", label: "", color: "", isAgent: false, goalReached: false };
    }

    // Setup mode rendering
    if (grid.obstacles.has(key)) {
      return { className: "grid-cell grid-cell-obstacle", label: "", color: "", isAgent: false, goalReached: false };
    }
    for (const agent of agents) {
      if (posKey(agent.start) === key) {
        return { className: "grid-cell grid-cell-start", label: agent.name, color: agent.color, isAgent: false, goalReached: false };
      }
      if (posKey(agent.goal) === key) {
        return { className: "grid-cell grid-cell-goal", label: agent.name, color: agent.color, isAgent: false, goalReached: false };
      }
    }
    return { className: "grid-cell grid-cell-empty", label: "", color: "", isAgent: false, goalReached: false };
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <h1>MAPF Simulator</h1>
        <span className="app-header-badge">
          {isSimulating ? "SIMULATING" : "SETUP"}
        </span>
      </header>

      {/* Main: 3-column layout */}
      <main className="app-main">
        {/* LEFT SIDEBAR: Setup controls */}
        <div className="setup-sidebar">
          {/* Pathfinding / Algorithm */}
          <div className="panel">
            <div className="panel-header"><h2>Pathfinding</h2></div>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <div className="input-group">
                <label>Algorithm</label>
                <select className="select" value={algorithm} disabled={isSolving} onChange={(e) => setAlgorithm(e.target.value as "cbs" | "prioritized")}>
                  <option value="cbs">Conflict-Based Search (CBS)</option>
                  <option value="prioritized">Prioritized Planning</option>
                </select>
              </div>
              <button className="btn btn-success" onClick={handleSolve} disabled={isSolving || agents.length === 0}>
                {isSolving ? "Solving..." : "Solve"}
              </button>
              {isSimulating && (
                <button className="btn btn-ghost" style={{ background: "var(--bg-elevated)" }} onClick={handleBackToEdit}>
                  &larr; Back to Edit
                </button>
              )}
            </div>
          </div>

          {/* Grid Size */}
          <div className="panel">
            <div className="panel-header"><h2>Grid Size</h2></div>
            <div className="panel-body">
              <div className="input-row">
                <div className="input-group">
                  <label>Rows</label>
                  <input type="number" className="input" value={grid.height} min={3} max={30}
                    disabled={isSimulating}
                    onChange={(e) => handleResize(grid.width, parseInt(e.target.value) || 3)} />
                </div>
                <div className="input-group">
                  <label>Cols</label>
                  <input type="number" className="input" value={grid.width} min={3} max={30}
                    disabled={isSimulating}
                    onChange={(e) => handleResize(parseInt(e.target.value) || 3, grid.height)} />
                </div>
              </div>
            </div>
          </div>

          {/* Edit Mode */}
          <div className="panel">
            <div className="panel-header"><h2>Edit Mode</h2></div>
            <div className="panel-body">
              <div className="toolbar">
                {(["obstacle", "start", "goal"] as EditMode[]).map((mode) => (
                  <button key={mode} className={`mode-btn ${editMode === mode ? "active" : ""}`}
                    disabled={isSimulating}
                    onClick={() => setEditMode(mode)}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agents */}
          <div className="panel">
            <div className="panel-header">
              <h2>Agents ({agents.length})</h2>
              <button className="btn btn-sm btn-primary" onClick={handleAddAgent}
                disabled={agents.length >= 10 || isSimulating}>
                + Add
              </button>
            </div>
            <div className="panel-body">
              {agents.length === 0 && (
                <p className="text-muted text-sm">No agents. Click &quot;Add&quot; or &quot;Randomize&quot;.</p>
              )}
              <div className="agent-list">
                {agents.map((agent, i) => (
                  <div key={agent.id} className="agent-list-item"
                    style={{ borderLeft: i === activeAgentIndex ? `3px solid ${agent.color}` : "3px solid transparent" }}
                    onClick={() => !isSimulating && setActiveAgentIndex(i)}>
                    <div className="agent-list-color" style={{ background: agent.color }} />
                    <div className="agent-list-info">
                      <strong>{agent.name}</strong>{" "}
                      ({agent.start.row},{agent.start.col}) &rarr; ({agent.goal.row},{agent.goal.col})
                    </div>
                    {!isSimulating && (
                      <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); handleRemoveAgent(i); }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <button className="btn btn-ghost" style={{ background: "var(--bg-tertiary)" }} onClick={handleRandomize} disabled={isSimulating}>
              Randomize
            </button>
            <button className="btn btn-ghost" style={{ background: "var(--bg-tertiary)" }} onClick={handleClear} disabled={isSimulating}>
              Clear
            </button>
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "var(--bg-tertiary)" }} /> Empty
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "#1a1a2e" }} /> Obstacle
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "var(--accent-cyan)" }} /> Start
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "transparent", border: "2px dashed var(--accent-cyan)" }} /> Goal
            </div>
          </div>
        </div>

        {/* CENTER: Grid */}
        <div className="setup-main">
          {/* Top Controls Toolbar */}
          <div style={{ display: "flex", gap: "var(--space-lg)", width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
            {/* Playback Controls */}
            {isSimulating && (
              <div className="panel" style={{ display: "flex", alignItems: "center", padding: "var(--space-sm) var(--space-lg)", gap: "var(--space-md)", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>PLAYBACK</span>
                <button className="btn btn-icon btn-ghost" onClick={handleReset} title="Reset">&#x21BA;</button>
                {isPlaying ? (
                  <button className="btn btn-icon btn-primary" onClick={() => setIsPlaying(false)} title="Pause">&#x23F8;</button>
                ) : (
                  <button className="btn btn-icon btn-primary" onClick={() => setIsPlaying(true)} disabled={simState.isComplete} title="Play">&#x25B6;</button>
                )}
                <button className="btn btn-icon btn-ghost" onClick={handleStep} disabled={simState.isComplete || isPlaying} title="Step">&#x23ED;</button>
                <div className="timestep-display" style={{ margin: "0 var(--space-sm)" }}>t={simState.timestep}/{simState.maxTimestep}</div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", borderLeft: "1px solid var(--border-subtle)", paddingLeft: "var(--space-md)" }}>
                  <input type="range" className="speed-slider" min={100} max={2000} step={100} value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} />
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", minWidth: 36 }}>{speed}ms</span>
                </div>
              </div>
            )}
          </div>
          {noSolution && (
            <div className="no-solution-msg" style={{ padding: "var(--space-sm)", fontSize: "0.85rem", background: "var(--accent-red-dim)", color: "var(--accent-red)", borderRadius: "var(--radius-md)" }}>
              No collision-free solution found.
            </div>
          )}

          <div style={{ position: "relative" }}>
            <div className="grid-container"
              style={{ gridTemplateColumns: `repeat(${grid.width}, var(--cell-size))` }}>
              {Array.from({ length: grid.height }, (_, r) =>
                Array.from({ length: grid.width }, (_, c) => {
                  const pos: Position = { row: r, col: c };
                  const info = getCellInfo(pos);
                  return (
                    <div key={`${r}-${c}`} className={info.className}
                      style={info.color ? {
                        borderColor: info.color,
                        background: info.goalReached
                          ? info.color + "35"
                          : info.isAgent ? info.color + "30" : info.color + "20",
                        color: info.color,
                        ...(info.goalReached ? {
                          boxShadow: `inset 0 0 16px ${info.color}50, 0 0 10px ${info.color}30`,
                          borderWidth: "2px",
                          borderStyle: "solid",
                        } : {}),
                      } : undefined}
                      onClick={() => handleCellClick(pos)}>
                      {/* Agent marker during simulation */}
                      {info.isAgent && (
                        <div className="agent-marker"
                          style={{ background: info.color, boxShadow: `0 0 14px ${info.color}60` }}>
                          {info.label}
                        </div>
                      )}
                      {/* Label (non-agent) */}
                      {!info.isAgent && info.label}
                    </div>
                  );
                })
              )}
            </div>

            {/* SVG Path Overlay */}
            {isSimulating && solution && (
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
                {agents.map((agent, i) => {
                  const path = solution.paths.get(agent.id);
                  if (!path) return null;

                  // We draw path up to the current timestep. If timestep=0, we only have start position
                  const end = Math.min(simState!.timestep + 1, path.length);
                  if (end === 0) return null;

                  const activePath = path.slice(0, end);

                  // Offset each agent's line slightly to avoid overlapping perfectly.
                  // E.g., if spread is 16px, an agent's line is shifted between -8px and 8px depending on index.
                  const spread = 16;
                  const offset = agents.length > 1 ? (-spread / 2 + i * (spread / (agents.length - 1))) : 0;

                  const points = activePath.map((step) => {
                    // cell_size = 44, cell_gap = 2, padding = 8
                    // cx = 8 + col * (44 + 2) + 22 = col * 46 + 30
                    const cx = step.position.col * 46 + 30 + offset;
                    const cy = step.position.row * 46 + 30 + offset;
                    return `${cx},${cy}`;
                  }).join(" ");

                  return (
                    <polyline
                      key={agent.id}
                      points={points}
                      fill="none"
                      stroke={agent.color}
                      strokeWidth="4"
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      opacity="0.8"
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {/* Agent status during simulation */}
          {isSimulating && (
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", justifyContent: "center" }}>
              {agents.map((agent) => {
                const arrived = simState.arrivedAgents.has(agent.id);
                return (
                  <div key={agent.id} style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                    background: arrived ? "var(--accent-green-dim)" : "var(--bg-tertiary)",
                    fontSize: "0.7rem", color: arrived ? "var(--accent-green)" : agent.color,
                    fontFamily: "var(--font-mono)", opacity: arrived ? 0.6 : 1,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: arrived ? "var(--accent-green)" : agent.color
                    }} />
                    {agent.name} {arrived ? "(done)" : ""}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: Metrics + Log */}
        <div className="sim-sidebar">
          {/* Metrics */}
          <MetricsPanel solution={solution} agents={agents} />

          {/* Log */}
          <LogPanel entries={logs} onClear={clearLogs} />
        </div>
      </main>
    </div>
  );
}
