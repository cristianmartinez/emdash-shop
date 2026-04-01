/**
 * Shipping method resolution service.
 *
 * Returns available shipping methods for a cart.
 * Can be extended by shipping provider plugins.
 */

import type { RouteContext } from "emdash";

import type { Cart, OrderAddress } from "../types.js";

export interface ShippingMethod {
	id: string;
	name: string;
	description?: string;
	price: number;
	currency: string;
	estimatedDays?: { min: number; max: number };
}

/**
 * Get available shipping methods for a cart.
 */
export async function getShippingMethods(
	ctx: RouteContext,
	cart: Cart,
	_shippingAddress: OrderAddress,
): Promise<ShippingMethod[]> {
	// Check for registered shipping provider plugins
	const providerIds = await ctx.kv.list("state:shippingProvider:");

	if (providerIds.length > 0) {
		// TODO: call shipping provider plugin routes via ctx.http
		// and aggregate results
	}

	// Default built-in shipping methods based on cart total
	const currency = cart.currency;
	const methods: ShippingMethod[] = [];

	// Free shipping threshold
	const freeShippingThreshold = (await ctx.kv.get<number>("settings:freeShippingThreshold")) ?? 0;

	if (freeShippingThreshold > 0 && cart.subtotal >= freeShippingThreshold) {
		methods.push({
			id: "free",
			name: "Free Shipping",
			description: "Standard delivery",
			price: 0,
			currency,
			estimatedDays: { min: 5, max: 10 },
		});
	}

	// Standard flat rate
	const standardRate = (await ctx.kv.get<number>("settings:standardShippingRate")) ?? 0;
	if (standardRate > 0) {
		methods.push({
			id: "standard",
			name: "Standard Shipping",
			price: standardRate,
			currency,
			estimatedDays: { min: 5, max: 10 },
		});
	}

	// Express flat rate
	const expressRate = (await ctx.kv.get<number>("settings:expressShippingRate")) ?? 0;
	if (expressRate > 0) {
		methods.push({
			id: "express",
			name: "Express Shipping",
			price: expressRate,
			currency,
			estimatedDays: { min: 1, max: 3 },
		});
	}

	// If no methods configured, provide a default free option
	if (methods.length === 0) {
		methods.push({
			id: "default",
			name: "Standard Shipping",
			price: 0,
			currency,
		});
	}

	return methods;
}
