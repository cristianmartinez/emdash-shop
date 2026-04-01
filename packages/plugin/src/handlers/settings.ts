/**
 * Settings route handlers (admin).
 */

import type { RouteContext } from "emdash";

import type { SettingsUpdateInput } from "../schemas.js";

// ─── Get Settings ────────────────────────────────────────────────

export async function settingsGetHandler(ctx: RouteContext) {
	const currency = await ctx.kv.get<string>("settings:currency");
	const orderPrefix = await ctx.kv.get<string>("settings:orderPrefix");
	const lowStockThreshold = await ctx.kv.get<number>("settings:lowStockThreshold");
	const enableGuestCheckout = await ctx.kv.get<boolean>("settings:enableGuestCheckout");
	const enableDigitalDownloads = await ctx.kv.get<boolean>("settings:enableDigitalDownloads");
	const orderNotifyEmails = await ctx.kv.get<string>("settings:orderNotifyEmails");
	const taxCalculation = await ctx.kv.get<string>("settings:taxCalculation");
	const fixedTaxRate = await ctx.kv.get<number>("settings:fixedTaxRate");

	return {
		currency: currency ?? "USD",
		orderPrefix: orderPrefix ?? "EM-",
		lowStockThreshold: lowStockThreshold ?? 5,
		enableGuestCheckout: enableGuestCheckout ?? true,
		enableDigitalDownloads: enableDigitalDownloads ?? false,
		orderNotifyEmails: orderNotifyEmails ?? "",
		taxCalculation: taxCalculation ?? "none",
		fixedTaxRate: fixedTaxRate ?? 0,
	};
}

// ─── Update Settings ─────────────────────────────────────────────

export async function settingsUpdateHandler(ctx: RouteContext<SettingsUpdateInput>) {
	const input = ctx.input;

	if (input.currency !== undefined) await ctx.kv.set("settings:currency", input.currency);
	if (input.orderPrefix !== undefined) await ctx.kv.set("settings:orderPrefix", input.orderPrefix);
	if (input.lowStockThreshold !== undefined) await ctx.kv.set("settings:lowStockThreshold", input.lowStockThreshold);
	if (input.enableGuestCheckout !== undefined) await ctx.kv.set("settings:enableGuestCheckout", input.enableGuestCheckout);
	if (input.enableDigitalDownloads !== undefined) await ctx.kv.set("settings:enableDigitalDownloads", input.enableDigitalDownloads);
	if (input.orderNotifyEmails !== undefined) await ctx.kv.set("settings:orderNotifyEmails", input.orderNotifyEmails);
	if (input.taxCalculation !== undefined) await ctx.kv.set("settings:taxCalculation", input.taxCalculation);
	if (input.fixedTaxRate !== undefined) await ctx.kv.set("settings:fixedTaxRate", input.fixedTaxRate);

	return settingsGetHandler(ctx);
}
