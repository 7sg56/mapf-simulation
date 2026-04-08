// ============================================================
// MAPF Simulator - Core Type Definitions
// ============================================================

/** A position on the 2D grid (row, col). */
export interface Position {
  row: number;
  col: number;
}

/** Unique string key for a position, used in Sets/Maps. */
export function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

/** Parse a position key back into a Position. */
export function parseKey(key: string): Position {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

/** Space-time key: position + timestep. */
export function stKey(p: Position, t: number): string {
  return `${p.row},${p.col},${t}`;
}

/** An agent with a unique ID, start, goal, and display color. */
export interface Agent {
  id: number;
  start: Position;
  goal: Position;
  color: string;
  name: string;
}

/** What a cell on the grid contains. */
export type CellType = "empty" | "obstacle";

/** The grid environment. */
export interface Grid {
  width: number; // number of columns
  height: number; // number of rows
  obstacles: Set<string>; // set of posKey strings
}

/** A single step in an agent's path. */
export interface PathStep {
  position: Position;
  timestep: number;
}

/** A collision-free solution for all agents. */
export interface Solution {
  paths: Map<number, PathStep[]>; // agentId -> path
  cost: number; // sum of all path lengths
  makespan: number; // max path length
  algorithm: "cbs" | "prioritized";
  computeTimeMs: number;
  conflictsResolved: number;
}

/** Types of conflicts between two agents. */
export type ConflictType = "vertex" | "edge";

/** A detected conflict between two agents. */
export interface Conflict {
  type: ConflictType;
  agent1: number;
  agent2: number;
  position1: Position;
  position2?: Position; // for edge conflicts: the second position in the swap
  timestep: number;
}

/** A constraint imposed on an agent: cannot be at position at timestep. */
export interface Constraint {
  agentId: number;
  position: Position;
  timestep: number;
}

/** Log severity levels. */
export type LogLevel = "info" | "warning" | "conflict" | "success" | "route";

/** A single log entry for the logger panel. */
export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

/** The available actions an agent can take. */
export const ACTIONS: Position[] = [
  { row: -1, col: 0 }, // up
  { row: 1, col: 0 },  // down
  { row: 0, col: -1 }, // left
  { row: 0, col: 1 },  // right
  { row: 0, col: 0 },  // wait
];

/** Agent colors palette (visually distinct, dark-theme friendly). */
export const AGENT_COLORS = [
  "#00d4ff", // cyan
  "#ff6b9d", // rose
  "#c084fc", // purple
  "#4ade80", // green
  "#fb923c", // orange
  "#f472b6", // pink
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#facc15", // yellow
  "#2dd4bf", // teal
];
