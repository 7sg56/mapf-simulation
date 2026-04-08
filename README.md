# MAPF Simulator (Multi-Agent Pathfinding)

**Live Simulator:** [mapf-ai.netlify.app](https://mapf-ai.netlify.app)

## Theoretical Overview

Multi-Agent Pathfinding (MAPF) is the theoretical computational problem of finding collision-free paths for multiple agents operating in a shared environment, from a set of starting locations to a set of target destinations. Finding optimal solutions to MAPF is NP-hard, making it a critical research area in artificial intelligence, robotics, and warehouse automation.

This project serves as an interactive simulator to visualize the behavior and constraints of two fundamental MAPF algorithms: **Conflict-Based Search (CBS)** and **Prioritized Planning**.

### The Problem Space

In MAPF, agents traverse a discretized grid. A valid solution must ensure that at no timestep `t` do two agents:

1. Occupy the same vertex (Vertex Collision).
2. Traverse the same edge in opposite directions simultaneously (Edge/Swap Collision).

### Conflict-Based Search (CBS)

CBS is a prominent two-level, optimal algorithm.

- **High-Level Search:** Builds a Constraint Tree (CT). Each node in the CT contains a set of constraints and a solution consistent with those constraints. If the solution contains conflicts (e.g., Agent A and Agent B schedule the same cell at time `t`), the node is split. Two child nodes are created where a new constraint is added to each: one forbidding A from being at the cell at $t$, and another forbidding B.
- **Low-Level Search:** Performs an A* search in space-time for individual agents, respecting the constraints dictated by the high-level node.

Because CBS only searches the joint state space when forced to by a conflict, it successfully mitigates the exponential blowup typically associated with tracking multiple agents simultaneously in traditional A*.

### Prioritized Planning

Prioritized Planning is a decoupled, sub-optimal (heuristic) approach prized for its extreme computational efficiency.

- Agents are assigned a strict priority ordering.
- Paths are planned sequentially based on this order.
- When planning for Agent N, the algorithm treats the space-time paths of all higher-priority agents (1 through N-1) as dynamic, moving obstacles.

While incredibly fast, Prioritized Planning is inherently *incomplete* (it may fail to find a solution when one exists, particularly in dense scenarios where high-priority agents block critical thoroughfares) and *sub-optimal* (the sum of costs may be higher than mathematically necessary).

## About this Simulator

The simulator provides a grid-spaced visual abstraction of these theoretical concepts:

- **Metrics Analysis:** Exposes Makespan (the time until the last agent completes its path), Total Cost (the sum of all path lengths), and the number of node expansions/conflicts encountered.
- **Path Verification:** Visualizes how paths gracefully detour each other through deterministic coordinate routing to avoid space-time collapses.
- **Algorithmic Determinism:** Allows live toggling between solving methodologies to demonstratively prove the operational boundaries and trade-offs of CBS vs Prioritized Planning.
