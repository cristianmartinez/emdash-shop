/**
 * Order number generation service.
 *
 * Generates sequential human-readable order numbers using a KV counter.
 */

import type { RouteContext } from "emdash";

import { DEFAULT_ORDER_PREFIX } from "../constants.js";

/**
 * Generate the next order number. Format: "{prefix}{counter}"
 * e.g., "EM-1001", "EM-1002", etc.
 */
export async function generateOrderNumber(ctx: RouteContext): Promise<string> {
	const prefix = (await ctx.kv.get<string>("settings:orderPrefix")) ?? DEFAULT_ORDER_PREFIX;
	const counter = (await ctx.kv.get<number>("state:orderCounter")) ?? 1000;

	const nextCounter = counter + 1;
	await ctx.kv.set("state:orderCounter", nextCounter);

	return `${prefix}${nextCounter}`;
}
