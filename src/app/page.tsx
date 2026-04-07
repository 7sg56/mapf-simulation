"use client";

// ============================================================
// MAPF Simulator - Main Page
// ============================================================
// Two-phase layout:
//   1. Setup Phase: GridEditor for placing obstacles/agents
//   2. Simulation Phase: GridView + controls + logs + metrics

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Grid, Agent, Solution, LogEntry } from "@/lib/types";
import { createGrid } from "@/lib/grid";
import { solveCBS } from "@/lib/cbs";
import { solvePrioritized } from "@/lib/prioritized";
import {
  SimulationState,
  createSimulation,
  stepSimulation,
  resetSimulation,
} from "@/lib/simulator";

import GridEditor, { EditMode } from "@/components/GridEditor";
import GridView from "@/components/GridView";
import SimulationControls from "@/components/SimulationControls";
import LogPanel from "@/components/LogPanel";
import MetricsPanel from "@/components/MetricsPanel";

type Phase = "setup" | "simulation";

export default function HomePage() {
  // --- Grid & Agent State ---
  const [grid, setGrid] = useState<Grid>(() => createGrid(8, 8));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("obstacle");
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);

  // --- Phase ---
  const [phase, setPhase] = useState<Phase>("setup");

  // --- Algorithm & Solving ---
  const [algorithm, setAlgorithm] = useState<"cbs" | "prioritized">("cbs");
  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [noSolution, setNoSolution] = useState(false);

  // --- Simulation ---
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms per step

  // --- Logging ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp">) => {
      const id = logIdRef.current++;
      setLogs((prev) => [
        ...prev,
        { ...entry, id, timestamp: Date.now() },
      ]);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // --- Start Simulation ---
  const handleStartSimulation = useCallback(() => {
    if (agents.length === 0) return;
    setPhase("simulation");
    setSolution(null);
    setSimState(null);
    setNoSolution(false);
    setIsPlaying(false);
  }, [agents]);

  // --- Solve ---
  const handleSolve = useCallback(() => {
    if (agents.length === 0) return;
    setIsSolving(true);
    setNoSolution(false);
    setSolution(null);
    setSimState(null);
    setIsPlaying(false);
    clearLogs();

    // Run in a timeout to allow the UI to update
    setTimeout(() => {
      let result: Solution | null = null;

      if (algorithm === "cbs") {
        result = solveCBS(grid, agents, addLog);
      } else {
        result = solvePrioritized(grid, agents, addLog);
      }

      if (result) {
        setSolution(result);
        setSimState(createSimulation(agents, result.paths));
        setNoSolution(false);
      } else {
        setNoSolution(true);
        addLog({
          level: "warning",
          message: "No solution found. Try removing obstacles or reducing agent count.",
        });
      }

      setIsSolving(false);
    }, 50);
  }, [agents, grid, algorithm, addLog, clearLogs]);

  // --- Playback controls ---
  const handleStep = useCallback(() => {
    if (!simState || !solution || simState.isComplete) return;
    const next = stepSimulation(simState, agents, solution.paths, addLog);
    setSimState(next);
  }, [simState, solution, agents, addLog]);

  const handleReset = useCallback(() => {
    if (!solution) return;
    setSimState(resetSimulation(agents, solution.paths));
    setIsPlaying(false);
  }, [solution, agents]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  // --- Auto-play interval ---
  useEffect(() => {
    if (!isPlaying || !simState || !solution || simState.isComplete) {
      return;
    }

    const interval = setInterval(() => {
      setSimState((prev) => {
        if (!prev || prev.isComplete) {
          setIsPlaying(false);
          return prev;
        }
        return stepSimulation(prev, agents, solution.paths, addLog);
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, simState?.isComplete, speed, agents, solution, addLog, simState]);

  // --- Back to setup ---
  const handleBackToSetup = useCallback(() => {
    setPhase("setup");
    setSolution(null);
    setSimState(null);
    setIsPlaying(false);
    setNoSolution(false);
  }, []);

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <h1>MAPF Simulator</h1>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          {phase === "setup" && (
            <button
              className="btn btn-primary"
              onClick={handleStartSimulation}
              disabled={agents.length === 0}
            >
              Run Simulation &rarr;
            </button>
          )}
          <span className="app-header-badge">
            {phase === "setup" ? "SETUP" : "SIMULATION"}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {phase === "setup" && (
          <GridEditor
            grid={grid}
            agents={agents}
            editMode={editMode}
            activeAgentIndex={activeAgentIndex}
            onGridChange={setGrid}
            onAgentsChange={setAgents}
            onEditModeChange={setEditMode}
            onActiveAgentIndexChange={setActiveAgentIndex}
          />
        )}

        {phase === "simulation" && (
          <div className="sim-layout">
            {/* Center: grid + controls */}
            <div className="sim-center">
              <SimulationControls
                isPlaying={isPlaying}
                timestep={simState?.timestep ?? 0}
                maxTimestep={simState?.maxTimestep ?? 0}
                speed={speed}
                algorithm={algorithm}
                isSolving={isSolving}
                hasSolution={solution !== null}
                isComplete={simState?.isComplete ?? false}
                onPlay={handlePlay}
                onPause={handlePause}
                onStep={handleStep}
                onReset={handleReset}
                onSpeedChange={setSpeed}
                onAlgorithmChange={setAlgorithm}
                onSolve={handleSolve}
                onBackToSetup={handleBackToSetup}
              />

              {noSolution && (
                <div className="no-solution-msg">
                  No collision-free solution exists for this configuration.
                  <br />
                  <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                    Try removing obstacles or repositioning agents.
                  </span>
                </div>
              )}

              {simState && solution && (
                <GridView
                  grid={grid}
                  agents={agents}
                  paths={solution.paths}
                  simState={simState}
                />
              )}
            </div>

            {/* Sidebar: metrics + log */}
            <div className="sim-sidebar">
              <MetricsPanel solution={solution} agents={agents} />
              <LogPanel entries={logs} onClear={clearLogs} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
