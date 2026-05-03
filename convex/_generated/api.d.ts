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
import type * as designSystems from "../designSystems.js";
import type * as http from "../http.js";
import type * as lib_identity from "../lib/identity.js";
import type * as projects from "../projects.js";
import type * as shareTokens from "../shareTokens.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  canvasSnapshots: typeof canvasSnapshots;
  chatMessages: typeof chatMessages;
  designSystems: typeof designSystems;
  http: typeof http;
  "lib/identity": typeof lib_identity;
  projects: typeof projects;
  shareTokens: typeof shareTokens;
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
