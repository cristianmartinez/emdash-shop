/**
 * Discount and price rule CRUD route handlers (admin).
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";
import { ulid } from "ulidx";

import type {
	DiscountCreateInput,
	DiscountDeleteInput,
	DiscountListInput,
	DiscountUpdateInput,
	PriceRuleCreateInput,
	PriceRuleDeleteInput,
	PriceRuleListInput,
	PriceRuleUpdateInput,
} from "../schemas.js";
import type { Discount, PriceRule } from "../types.js";

function discounts(ctx: RouteContext): StorageCollection<Discount> {
	return ctx.storage.discounts as StorageCollection<Discount>;
}

function priceRules(ctx: RouteContext): StorageCollection<PriceRule> {
	return ctx.storage.priceRules as StorageCollection<PriceRule>;
}

// ─── Discounts ───────────────────────────────────────────────────

export async function discountsListHandler(ctx: RouteContext<DiscountListInput>) {
	const { status, limit, cursor } = ctx.input;

	const result = await discounts(ctx).query({
		where: status ? { status } : undefined,
		orderBy: { createdAt: "desc" },
		limit,
		cursor,
	});

	return {
		items: result.items.map((item) => ({ id: item.id, ...item.data })),
		hasMore: result.hasMore,
		cursor: result.cursor,
	};
}

export async function discountsCreateHandler(ctx: RouteContext<DiscountCreateInput>) {
	const input = ctx.input;

	// Check code uniqueness
	const existing = await discounts(ctx).query({
		where: { code: input.code.toUpperCase() } as never,
		limit: 1,
	});
	if (existing.items.length > 0) {
		throw PluginRouteError.conflict(`A discount with code "${input.code}" already exists`);
	}

	const now = new Date().toISOString();
	const id = ulid();

	const discount: Discount = {
		code: input.code.toUpperCase(),
		description: input.description,
		type: input.type,
		value: input.value,
		scope: input.scope ?? "order",
		scopeIds: input.scopeIds,
		minOrderAmount: input.minOrderAmount,
		maxUses: input.maxUses ?? 0,
		usedCount: 0,
		maxUsesPerCustomer: input.maxUsesPerCustomer ?? 0,
		startsAt: input.startsAt,
		expiresAt: input.expiresAt,
		status: input.status ?? "active",
		createdAt: now,
		updatedAt: now,
	};

	await discounts(ctx).put(id, discount);

	return { id, ...discount };
}

export async function discountsUpdateHandler(ctx: RouteContext<DiscountUpdateInput>) {
	const { id, ...updates } = ctx.input;

	const existing = await discounts(ctx).get(id);
	if (!existing) throw PluginRouteError.notFound("Discount not found");

	if (updates.code && updates.code.toUpperCase() !== existing.code) {
		const codeCheck = await discounts(ctx).query({
			where: { code: updates.code.toUpperCase() } as never,
			limit: 1,
		});
		if (codeCheck.items.length > 0) {
			throw PluginRouteError.conflict(`A discount with code "${updates.code}" already exists`);
		}
	}

	const updated: Discount = {
		...existing,
		...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
		code: updates.code ? updates.code.toUpperCase() : existing.code,
		updatedAt: new Date().toISOString(),
	};

	await discounts(ctx).put(id, updated);

	return { id, ...updated };
}

export async function discountsDeleteHandler(ctx: RouteContext<DiscountDeleteInput>) {
	const existing = await discounts(ctx).get(ctx.input.id);
	if (!existing) throw PluginRouteError.notFound("Discount not found");

	await discounts(ctx).delete(ctx.input.id);

	return { deleted: true };
}

// ─── Price Rules ─────────────────────────────────────────────────

export async function priceRulesListHandler(ctx: RouteContext<PriceRuleListInput>) {
	const { status } = ctx.input;

	const result = await priceRules(ctx).query({
		where: status ? { status } : undefined,
		orderBy: { priority: "asc" },
		limit: 100,
	});

	return {
		items: result.items.map((item) => ({ id: item.id, ...item.data })),
	};
}

export async function priceRulesCreateHandler(ctx: RouteContext<PriceRuleCreateInput>) {
	const input = ctx.input;
	const now = new Date().toISOString();
	const id = ulid();

	const rule: PriceRule = {
		name: input.name,
		type: input.type,
		value: input.value,
		scope: input.scope,
		scopeIds: input.scopeIds,
		conditions: input.conditions,
		tiers: input.tiers,
		stackable: input.stackable ?? false,
		priority: input.priority ?? 100,
		status: input.status ?? "active",
		startsAt: input.startsAt,
		expiresAt: input.expiresAt,
		createdAt: now,
		updatedAt: now,
	};

	await priceRules(ctx).put(id, rule);

	return { id, ...rule };
}

export async function priceRulesUpdateHandler(ctx: RouteContext<PriceRuleUpdateInput>) {
	const { id, ...updates } = ctx.input;

	const existing = await priceRules(ctx).get(id);
	if (!existing) throw PluginRouteError.notFound("Price rule not found");

	const updated: PriceRule = {
		...existing,
		...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
		updatedAt: new Date().toISOString(),
	};

	await priceRules(ctx).put(id, updated);

	return { id, ...updated };
}

export async function priceRulesDeleteHandler(ctx: RouteContext<PriceRuleDeleteInput>) {
	const existing = await priceRules(ctx).get(ctx.input.id);
	if (!existing) throw PluginRouteError.notFound("Price rule not found");

	await priceRules(ctx).delete(ctx.input.id);

	return { deleted: true };
}
