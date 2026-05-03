/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as canvasSnapshots from "../canvasSnapshots.js";
import type * as chatMessages from "../chatMessages.js";
import type * as comments from "../comments.js";
import type * as designSystems from "../designSystems.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_search_adapters from "../lib/search_adapters.js";
import type * as lib_skills from "../lib/skills.js";
import type * as lib_toolkit from "../lib/toolkit.js";
import type * as lib_usage from "../lib/usage.js";
import type * as projects from "../projects.js";
import type * as settings from "../settings.js";
import type * as shareTokens from "../shareTokens.js";
import type * as streamStates from "../streamStates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  canvasSnapshots: typeof canvasSnapshots;
  chatMessages: typeof chatMessages;
  comments: typeof comments;
  designSystems: typeof designSystems;
  files: typeof files;
  http: typeof http;
  "lib/encryption": typeof lib_encryption;
  "lib/identity": typeof lib_identity;
  "lib/models": typeof lib_models;
  "lib/search_adapters": typeof lib_search_adapters;
  "lib/skills": typeof lib_skills;
  "lib/toolkit": typeof lib_toolkit;
  "lib/usage": typeof lib_usage;
  projects: typeof projects;
  settings: typeof settings;
  shareTokens: typeof shareTokens;
  streamStates: typeof streamStates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
