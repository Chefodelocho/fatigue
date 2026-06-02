/**
 * Types for 3D coordinate visualization of FEM fatigue analysis results.
 *
 * These types support the optional upload of node coordinate files and
 * the production of 3D scatter visualizations showing the spatial
 * distribution of safety factors across the FEM model.
 *
 * @module coordinates
 */

import type { StressComponent } from './fem-analysis';

// -- Node Coordinates ----------------------------------------------------------

/**
 * 3D spatial coordinates for a single FEM node.
 *
 * Coordinates are in millimeters, matching the FEM export format.
 */
interface NodeCoordinates {
  /** Unique FEM mesh node identifier */
  readonly nodeId: number;
  /** X coordinate in mm */
  readonly x: number;
  /** Y coordinate in mm */
  readonly y: number;
  /** Z coordinate in mm */
  readonly z: number;
}

// -- 3D Visualization Point ----------------------------------------------------

/**
 * A single node in the 3D safety factor visualization.
 *
 * Combines spatial coordinates with fatigue safety data for rendering
 * in a 3D scatter plot. Color is derived from `minSF` on the client side.
 */
interface Node3DVizPoint {
  /** Unique FEM mesh node identifier */
  readonly nodeId: number;
  /** X coordinate in mm */
  readonly x: number;
  /** Y coordinate in mm */
  readonly y: number;
  /** Z coordinate in mm */
  readonly z: number;
  /** Minimum safety factor across Goodman/Gerber/Soderberg for this component */
  readonly minSF: number;
  /** Goodman safety factor */
  readonly goodmanSF: number;
  /** Gerber safety factor */
  readonly gerberSF: number;
  /** Soderberg safety factor */
  readonly soderbergSF: number;
  /** Mean stress in MPa */
  readonly meanStress: number;
  /** Alternating stress in MPa */
  readonly alternatingStress: number;
}

// -- Per-Component 3D Data -----------------------------------------------------

/**
 * 3D visualization data for a single stress component.
 */
interface Component3DData {
  /** Worst nodes sorted by minSF ascending (capped at MAX_3D_POINTS) */
  readonly worstNodes: readonly Node3DVizPoint[];
  /** Total number of nodes that had matching coordinates */
  readonly totalMatchedNodes: number;
}

// -- Bounding Box --------------------------------------------------------------

/**
 * Axis-aligned bounding box for 3D camera framing.
 */
interface BoundingBox3D {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

// -- Complete 3D Visualization Payload -----------------------------------------

/**
 * Complete 3D visualization payload returned by the API when coordinates
 * are provided.
 *
 * Contains the worst 10,000 nodes (by safety factor) for each stress
 * component, a random sample of background coordinates for context,
 * and a bounding box for camera setup.
 */
interface Visualization3DData {
  /** Total nodes with coordinates in the uploaded file */
  readonly coordinateNodeCount: number;
  /** Total nodes that matched between stress data and coordinates */
  readonly matchedNodeCount: number;
  /** Bounding box for initial camera framing */
  readonly bounds: BoundingBox3D;
  /** Random sample of all matched coordinates for transparent background trace */
  readonly backgroundCoordinates: readonly NodeCoordinates[];
  /** Worst 10,000 nodes per stress component */
  readonly worstByComponent: {
    readonly VON: Component3DData;
    readonly P1: Component3DData;
    readonly P2: Component3DData;
    readonly P3: Component3DData;
  };
}

export type {
  NodeCoordinates,
  Node3DVizPoint,
  Component3DData,
  BoundingBox3D,
  Visualization3DData,
};
