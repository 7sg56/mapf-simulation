"use client";

// ============================================================
// Log Panel Component
// ============================================================
// Terminal-style scrollable log showing AI thinking, conflicts,
// re-routing decisions, and agent events.

import React, { useEffect, useRef } from "react";
import { LogEntry } from "@/lib/types";

interface LogPanelProps {
    entries: LogEntry[];
    onClear: () => void;
}

export default function LogPanel({ entries, onClear }: LogPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new entries
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [entries]);

    return (
        <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "150px" }}>
            <div className="panel-header">
                <h2>AI Log</h2>
                <button className="btn btn-sm btn-ghost" onClick={onClear}>
                    Clear
                </button>
            </div>
            <div className="log-container" ref={scrollRef} style={{ flex: 1, minHeight: 0 }}>
                {entries.length === 0 && (
                    <div
                        style={{
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            padding: "var(--space-md)",
                            textAlign: "center",
                        }}
                    >
                        Waiting for pathfinding...
                    </div>
                )}
                {entries.map((entry) => (
                    <div key={entry.id} className="log-entry">
                        <span className={`log-badge log-badge-${entry.level}`}>
                            {entry.level}
                        </span>
                        <span className="log-message">{entry.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
