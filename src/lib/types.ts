/**
 * Core type definitions for DesignForge.
 *
 * These types mirror the Convex schema and provide strict typing
 * across the frontend boundary. All network-bound data shapes are
 * declared here so components don't use `any`.
 */

import type { Id } from "../../convex/_generated/dataModel";

/* ------------------------------------------------------------------ */
/*  Design System Tokens                                              */
/* ------------------------------------------------------------------ */

export interface DesignSystemTokens {
  colors: Record<string, string>;
  typography: {
    fontFamily: string;
    sizes: Record<string, string>;
    weights: Record<string, number>;
    lineHeight: Record<string, number>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Project                                                           */
/* ------------------------------------------------------------------ */

export interface Project {
  _id: Id<"projects">;
  _creationTime: number;
  name: string;
  description?: string;
  authorId: string;
  canvasContent?: string | null;
  designSystemId?: Id<"designSystems">;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ------------------------------------------------------------------ */
/*  Chat Message                                                      */
/* ------------------------------------------------------------------ */

export interface ChatMessagePart {
  type: string;
  text?: string;
}

export interface ChatMessageRow {
  _id: Id<"chatMessages">;
  _creationTime: number;
  projectId: Id<"projects">;
  authorId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: ChatMessagePart[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Design System                                                     */
/* ------------------------------------------------------------------ */

export interface DesignSystemRow {
  _id: Id<"designSystems">;
  _creationTime: number;
  authorId: string;
  name: string;
  status: "draft" | "published";
  isDefault: boolean;
  source: "manual" | "ai-extracted" | "uploaded";
  designMd?: string;
  tokens?: DesignSystemTokens;
  assets?: Array<Record<string, unknown>>;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Comment (inline pin)                                              */
/* ------------------------------------------------------------------ */

export interface CommentRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CommentRow {
  _id: Id<"comments">;
  _creationTime: number;
  projectId: Id<"projects">;
  authorId: string;
  selector: string;
  tag: string;
  outerHTML: string;
  rect: CommentRect;
  text: string;
  kind: "note" | "edit";
  status: "pending" | "applied";
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Canvas / Element                                                  */
/* ------------------------------------------------------------------ */

export interface ElementStyles {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  padding: string;
  margin: string;
  borderRadius: string;
  border: string;
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  width: string;
  height: string;
  position: string;
  top: string;
  left: string;
  opacity: string;
  boxShadow: string;
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

export interface ElementAttribute {
  name: string;
  value: string;
}

export interface ElementData {
  selector: string;
  tag: string;
  text: string;
  html: string;
  styles: Partial<ElementStyles>;
  rect: { top: number; left: number; width: number; height: number };
  breadcrumb: string[];
  attributes: ElementAttribute[];
}

export interface CanvasMessage {
  source: "designforge-canvas";
  type: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Snapshot                                                          */
/* ------------------------------------------------------------------ */

export interface CanvasSnapshot {
  _id: Id<"canvasSnapshots">;
  _creationTime: number;
  projectId: Id<"projects">;
  name: string;
  content: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/*  Share Token                                                       */
/* ------------------------------------------------------------------ */

export interface ShareToken {
  _id: Id<"shareTokens">;
  _creationTime: number;
  projectId: Id<"projects">;
  token: string;
  name: string;
  createdAt: number;
  expiresAt?: number;
}

/* ------------------------------------------------------------------ */
/*  Utility types                                                     */
/* ------------------------------------------------------------------ */

/** Extracts the resolved document type from a Convex query result. */
export type ConvexDoc<T> = T extends Array<infer U> ? U : T;

/** Narrows an `unknown` error to a string message safely. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

/** Narrows an `unknown` error to an Error object, or wraps it. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(errorMessage(err));
}
