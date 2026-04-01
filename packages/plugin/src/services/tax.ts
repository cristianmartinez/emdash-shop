/**
 * Tax calculation service.
 *
 * Supports fixed rate or delegation to a tax provider plugin.
 */

import type { RouteContext } from "emdash";

import type { TaxLine } from "../types.js";

export interface TaxCalculation {
	taxTotal: number;
	taxLines: TaxLine[];
}

/**
 * Calculate tax for a given subtotal.
 */
export async function calculateTax(
	ctx: RouteContext,
	subtotal: number,
	_shippingAddress?: { country: string; state?: string; postalCode?: string },
): Promise<TaxCalculation> {
	const taxCalcMode = (await ctx.kv.get<string>("settings:taxCalculation")) ?? "none";

	if (taxCalcMode === "none") {
		return { taxTotal: 0, taxLines: [] };
	}

	if (taxCalcMode === "fixed") {
		const rate = (await ctx.kv.get<number>("settings:fixedTaxRate")) ?? 0;
		if (rate <= 0) return { taxTotal: 0, taxLines: [] };

		const taxAmount = Math.round(subtotal * rate / 100);
		return {
			taxTotal: taxAmount,
			taxLines: [{ name: "Tax", rate, amount: taxAmount }],
		};
	}

	// Provider mode: delegate to a registered tax provider plugin
	// For now, fall back to no tax if no provider is configured
	const providerPluginId = await ctx.kv.get<string>("state:taxProvider");
	if (!providerPluginId) {
		ctx.log.warn("Tax calculation set to 'provider' but no tax provider plugin registered");
		return { taxTotal: 0, taxLines: [] };
	}

	// TODO: call tax provider plugin route via ctx.http
	return { taxTotal: 0, taxLines: [] };
}
