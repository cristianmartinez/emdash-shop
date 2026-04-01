/**
 * Price resolution service.
 *
 * Resolves the final price for a product/variant through the pricing chain:
 * base price → variant price → price list override → price rules → discount codes
 */

import type { RouteContext, StorageCollection } from "emdash";

import type { PriceEntry, PriceList, PriceRule, Product, ProductVariant } from "../types.js";

export interface ResolvedPrice {
	/** Final unit price in cents */
	unitPrice: number;
	/** Original price before any rules/discounts */
	originalPrice: number;
	/** Compare-at price (for "was $X" display) */
	compareAtPrice?: number;
	/** Currency code */
	currency: string;
	/** Applied price rules */
	appliedRules: Array<{ ruleId: string; name: string; discount: number }>;
}

/**
 * Resolve the effective price for a product or variant.
 */
export async function resolvePrice(
	ctx: RouteContext,
	product: Product,
	variant?: ProductVariant,
	quantity: number = 1,
	_customerTags: string[] = [],
): Promise<ResolvedPrice> {
	// Step 1: Base price (variant overrides product)
	let unitPrice = variant?.price ?? product.price;
	const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
	const currency = variant?.currency ?? product.currency;
	const originalPrice = unitPrice;

	// Step 2: Check active price lists
	const priceLists = ctx.storage.priceLists as StorageCollection<PriceList>;
	const priceEntries = ctx.storage.priceEntries as StorageCollection<PriceEntry>;

	const activeListsResult = await priceLists.query({
		where: { status: "active" },
		limit: 50,
	});

	const now = new Date().toISOString();

	for (const list of activeListsResult.items) {
		const conditions = list.data.conditions;
		if (conditions) {
			if (conditions.validFrom && conditions.validFrom > now) continue;
			if (conditions.validUntil && conditions.validUntil < now) continue;
			if (conditions.minQuantity && quantity < conditions.minQuantity) continue;
		}

		// Look for a price entry matching this product/variant
		const entriesResult = await priceEntries.query({
			where: { priceListId: list.id, productId: product.slug },
			limit: 10,
		});

		for (const entry of entriesResult.items) {
			if (variant && entry.data.variantId && entry.data.variantId !== variant.sku) continue;
			if (!variant && entry.data.variantId) continue;
			unitPrice = entry.data.price;
			break;
		}
	}

	// Step 3: Apply automatic price rules (sorted by priority)
	const priceRulesCol = ctx.storage.priceRules as StorageCollection<PriceRule>;
	const rulesResult = await priceRulesCol.query({
		where: { status: "active" },
		orderBy: { priority: "asc" },
		limit: 50,
	});

	const appliedRules: ResolvedPrice["appliedRules"] = [];
	let hasAppliedNonStackable = false;

	for (const rule of rulesResult.items) {
		if (hasAppliedNonStackable && !rule.data.stackable) continue;

		// Check time validity
		if (rule.data.startsAt && rule.data.startsAt > now) continue;
		if (rule.data.expiresAt && rule.data.expiresAt < now) continue;

		// Check conditions
		const conditions = rule.data.conditions;
		if (conditions?.minQuantity && quantity < conditions.minQuantity) continue;

		// Check scope
		if (rule.data.scope === "products" && rule.data.scopeIds) {
			const productId = variant?.productId ?? product.slug;
			if (!rule.data.scopeIds.includes(productId)) continue;
		}
		if (rule.data.scope === "categories" && rule.data.scopeIds) {
			const inCategory = product.categoryIds.some((id) => rule.data.scopeIds!.includes(id));
			if (!inCategory) continue;
		}

		let discount = 0;

		switch (rule.data.type) {
			case "percentage":
				discount = Math.round(unitPrice * (rule.data.value ?? 0) / 100);
				break;
			case "fixed_amount":
				discount = Math.min(rule.data.value ?? 0, unitPrice);
				break;
			case "tiered": {
				const tier = rule.data.tiers
					?.filter((t) => quantity >= t.minQuantity)
					.filter((t) => !t.maxQuantity || quantity <= t.maxQuantity)
					.sort((a, b) => b.minQuantity - a.minQuantity)[0];

				if (tier) {
					switch (tier.type) {
						case "percentage":
							discount = Math.round(unitPrice * tier.value / 100);
							break;
						case "fixed_price":
							discount = Math.max(0, unitPrice - tier.value);
							break;
						case "fixed_discount":
							discount = Math.min(tier.value, unitPrice);
							break;
					}
				}
				break;
			}
			case "bogo":
				// Buy one get one: discount = price of every other item
				if (quantity >= 2) {
					const freeItems = Math.floor(quantity / 2);
					discount = Math.round((freeItems * unitPrice) / quantity);
				}
				break;
		}

		if (discount > 0) {
			unitPrice -= discount;
			appliedRules.push({ ruleId: rule.id, name: rule.data.name, discount });

			if (!rule.data.stackable) {
				hasAppliedNonStackable = true;
			}
		}
	}

	return {
		unitPrice: Math.max(0, unitPrice),
		originalPrice,
		compareAtPrice,
		currency,
		appliedRules,
	};
}
