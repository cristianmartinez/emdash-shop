/**
 * Inventory management service.
 *
 * Handles stock checking, reservation, and release.
 */

import type { RouteContext, StorageCollection } from "emdash";

import type { Product, ProductVariant } from "../types.js";

export interface StockCheckResult {
	available: boolean;
	quantity: number;
	trackInventory: boolean;
}

/**
 * Check if a product/variant has sufficient stock.
 */
export async function checkStock(
	ctx: RouteContext,
	productId: string,
	variantId: string | undefined,
	requestedQuantity: number,
): Promise<StockCheckResult> {
	if (variantId) {
		const variants = ctx.storage.variants as StorageCollection<ProductVariant>;
		const variant = await variants.get(variantId);
		if (!variant) return { available: false, quantity: 0, trackInventory: true };

		if (!variant.trackInventory) {
			return { available: true, quantity: Infinity, trackInventory: false };
		}

		return {
			available: (variant.stockQuantity ?? 0) >= requestedQuantity,
			quantity: variant.stockQuantity ?? 0,
			trackInventory: true,
		};
	}

	const products = ctx.storage.products as StorageCollection<Product>;
	const product = await products.get(productId);
	if (!product) return { available: false, quantity: 0, trackInventory: true };

	if (!product.trackInventory) {
		return { available: true, quantity: Infinity, trackInventory: false };
	}

	return {
		available: (product.stockQuantity ?? 0) >= requestedQuantity,
		quantity: product.stockQuantity ?? 0,
		trackInventory: true,
	};
}

/**
 * Reserve stock for an order (decrement quantities).
 */
export async function reserveStock(
	ctx: RouteContext,
	items: Array<{ productId: string; variantId?: string; quantity: number }>,
): Promise<void> {
	for (const item of items) {
		if (item.variantId) {
			const variants = ctx.storage.variants as StorageCollection<ProductVariant>;
			const variant = await variants.get(item.variantId);
			if (variant?.trackInventory) {
				await variants.put(item.variantId, {
					...variant,
					stockQuantity: Math.max(0, (variant.stockQuantity ?? 0) - item.quantity),
					updatedAt: new Date().toISOString(),
				});
			}
		} else {
			const products = ctx.storage.products as StorageCollection<Product>;
			const product = await products.get(item.productId);
			if (product?.trackInventory) {
				await products.put(item.productId, {
					...product,
					stockQuantity: Math.max(0, (product.stockQuantity ?? 0) - item.quantity),
					updatedAt: new Date().toISOString(),
				});
			}
		}
	}
}

/**
 * Release reserved stock (increment quantities back).
 */
export async function releaseStock(
	ctx: RouteContext,
	items: Array<{ productId: string; variantId?: string; quantity: number }>,
): Promise<void> {
	for (const item of items) {
		if (item.variantId) {
			const variants = ctx.storage.variants as StorageCollection<ProductVariant>;
			const variant = await variants.get(item.variantId);
			if (variant?.trackInventory) {
				await variants.put(item.variantId, {
					...variant,
					stockQuantity: (variant.stockQuantity ?? 0) + item.quantity,
					updatedAt: new Date().toISOString(),
				});
			}
		} else {
			const products = ctx.storage.products as StorageCollection<Product>;
			const product = await products.get(item.productId);
			if (product?.trackInventory) {
				await products.put(item.productId, {
					...product,
					stockQuantity: (product.stockQuantity ?? 0) + item.quantity,
					updatedAt: new Date().toISOString(),
				});
			}
		}
	}
}
