/**
 * Inventory management service.
 *
 * Products are emdash content collections. Stock checking reads from content,
 * but stock updates require write:content capability.
 */

import type { RouteContext } from "emdash";

import type { ProductData } from "../types.js";

export interface StockCheckResult {
	available: boolean;
	quantity: number;
	trackInventory: boolean;
}

/**
 * Get product data from the content collection.
 */
async function getProduct(ctx: RouteContext, productId: string): Promise<ProductData | null> {
	if (!ctx.content) return null;
	const item = await ctx.content.get("products", productId);
	return item ? (item.data as unknown as ProductData) : null;
}

/**
 * Check if a product/variant has sufficient stock.
 */
export async function checkStock(
	ctx: RouteContext,
	productId: string,
	variantSku: string | undefined,
	requestedQuantity: number,
): Promise<StockCheckResult> {
	const product = await getProduct(ctx, productId);
	if (!product) return { available: false, quantity: 0, trackInventory: true };

	if (!product.track_inventory) {
		return { available: true, quantity: Infinity, trackInventory: false };
	}

	// Check variant-specific stock if applicable
	if (variantSku && product.variants) {
		const variant = product.variants.find((v) => v.sku === variantSku);
		if (variant && variant.stock !== undefined) {
			return {
				available: variant.stock >= requestedQuantity,
				quantity: variant.stock,
				trackInventory: true,
			};
		}
	}

	return {
		available: (product.stock_quantity ?? 0) >= requestedQuantity,
		quantity: product.stock_quantity ?? 0,
		trackInventory: true,
	};
}

/**
 * Reserve stock for an order (decrement quantities).
 *
 * Updates the product content via ctx.content.update().
 */
export async function reserveStock(
	ctx: RouteContext,
	items: Array<{ productId: string; variantSku?: string; quantity: number }>,
): Promise<void> {
	if (!ctx.content?.update) return;

	for (const item of items) {
		const product = await getProduct(ctx, item.productId);
		if (!product?.track_inventory) continue;

		if (item.variantSku && product.variants) {
			// Update variant stock within the variants JSON
			const updatedVariants = product.variants.map((v) =>
				v.sku === item.variantSku
					? { ...v, stock: Math.max(0, (v.stock ?? 0) - item.quantity) }
					: v,
			);
			await ctx.content.update("products", item.productId, {
				variants: updatedVariants,
				stock_quantity: Math.max(0, (product.stock_quantity ?? 0) - item.quantity),
			});
		} else {
			await ctx.content.update("products", item.productId, {
				stock_quantity: Math.max(0, (product.stock_quantity ?? 0) - item.quantity),
			});
		}
	}
}

/**
 * Release reserved stock (increment quantities back).
 */
export async function releaseStock(
	ctx: RouteContext,
	items: Array<{ productId: string; variantSku?: string; quantity: number }>,
): Promise<void> {
	if (!ctx.content?.update) return;

	for (const item of items) {
		const product = await getProduct(ctx, item.productId);
		if (!product?.track_inventory) continue;

		if (item.variantSku && product.variants) {
			const updatedVariants = product.variants.map((v) =>
				v.sku === item.variantSku
					? { ...v, stock: (v.stock ?? 0) + item.quantity }
					: v,
			);
			await ctx.content.update("products", item.productId, {
				variants: updatedVariants,
				stock_quantity: (product.stock_quantity ?? 0) + item.quantity,
			});
		} else {
			await ctx.content.update("products", item.productId, {
				stock_quantity: (product.stock_quantity ?? 0) + item.quantity,
			});
		}
	}
}
