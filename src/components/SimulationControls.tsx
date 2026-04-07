"use client";

// ============================================================
// Simulation Controls Component
// ============================================================
// Playback bar: play/pause, step, reset, speed, algorithm select.

import React from "react";

interface SimulationControlsProps {
    isPlaying: boolean;
    timestep: number;
    maxTimestep: number;
    speed: number; // ms per step
    algorithm: "cbs" | "prioritized";
    isSolving: boolean;
    hasSolution: boolean;
    isComplete: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStep: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
    onAlgorithmChange: (algo: "cbs" | "prioritized") => void;
    onSolve: () => void;
    onBackToSetup: () => void;
}

export default function SimulationControls({
    isPlaying,
    timestep,
    maxTimestep,
    speed,
    algorithm,
    isSolving,
    hasSolution,
    isComplete,
    onPlay,
    onPause,
    onStep,
    onReset,
    onSpeedChange,
    onAlgorithmChange,
    onSolve,
    onBackToSetup,
}: SimulationControlsProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {/* Algorithm selector + solve */}
            <div className="playback-bar">
                <div className="input-group" style={{ flex: 1 }}>
                    <label>Algorithm</label>
                    <select
                        className="select"
                        value={algorithm}
                        onChange={(e) =>
                            onAlgorithmChange(e.target.value as "cbs" | "prioritized")
                        }
                        disabled={isSolving}
                    >
                        <option value="cbs">Conflict-Based Search (CBS)</option>
                        <option value="prioritized">Prioritized Planning</option>
                    </select>
                </div>
                <button
                    className="btn btn-success"
                    onClick={onSolve}
                    disabled={isSolving}
                >
                    {isSolving ? "Solving..." : "Solve"}
                </button>
            </div>

            {/* Playback controls */}
            {hasSolution && (
                <div className="playback-bar">
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={onReset}
                        title="Reset"
                    >
                        &#x21BA;
                    </button>

                    {isPlaying ? (
                        <button
                            className="btn btn-icon btn-primary"
                            onClick={onPause}
                            title="Pause"
                        >
                            &#x23F8;
                        </button>
                    ) : (
                        <button
                            className="btn btn-icon btn-primary"
                            onClick={onPlay}
                            disabled={isComplete}
                            title="Play"
                        >
                            &#x25B6;
                        </button>
                    )}

                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={onStep}
                        disabled={isComplete || isPlaying}
                        title="Step"
                    >
                        &#x23ED;
                    </button>

                    <div className="timestep-display">
                        t = {timestep} / {maxTimestep}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-sm)",
                            marginLeft: "auto",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            {speed}ms
                        </span>
                        <input
                            type="range"
                            className="speed-slider"
                            min={100}
                            max={2000}
                            step={100}
                            value={speed}
                            onChange={(e) => onSpeedChange(parseInt(e.target.value))}
                        />
                    </div>
                </div>
            )}

            {/* Back to setup */}
            <button className="btn btn-ghost" onClick={onBackToSetup}>
                &larr; Back to Setup
            </button>
        </div>
    );
}
