/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as backend from "../backend.js";
import type * as http from "../http.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_grade_utils from "../lib/grade_utils.js";
import type * as lib_test_blueprints_curriculum_fit from "../lib/test_blueprints/curriculum_fit.js";
import type * as lib_test_blueprints_hk_aptitude from "../lib/test_blueprints/hk_aptitude.js";
import type * as lib_test_blueprints_ielts_practice from "../lib/test_blueprints/ielts_practice.js";
import type * as lib_test_blueprints_index from "../lib/test_blueprints/index.js";
import type * as lib_test_blueprints_shared_schema from "../lib/test_blueprints/shared_schema.js";
import type * as lib_test_blueprints_types from "../lib/test_blueprints/types.js";
import type * as lib_test_blueprints_validate_payload from "../lib/test_blueprints/validate_payload.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  backend: typeof backend;
  http: typeof http;
  "lib/gemini": typeof lib_gemini;
  "lib/grade_utils": typeof lib_grade_utils;
  "lib/test_blueprints/curriculum_fit": typeof lib_test_blueprints_curriculum_fit;
  "lib/test_blueprints/hk_aptitude": typeof lib_test_blueprints_hk_aptitude;
  "lib/test_blueprints/ielts_practice": typeof lib_test_blueprints_ielts_practice;
  "lib/test_blueprints/index": typeof lib_test_blueprints_index;
  "lib/test_blueprints/shared_schema": typeof lib_test_blueprints_shared_schema;
  "lib/test_blueprints/types": typeof lib_test_blueprints_types;
  "lib/test_blueprints/validate_payload": typeof lib_test_blueprints_validate_payload;
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
