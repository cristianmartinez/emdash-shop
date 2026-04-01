/**
 * Public storefront route handlers.
 *
 * Uses ctx.content to read products from emdash collections.
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import type { OrderStatusInput, StorefrontProductInput, StorefrontProductsInput } from "../schemas.js";
import type { Order, ProductData } from "../types.js";

function orders(ctx: RouteContext): StorageCollection<Order> {
	return ctx.storage.orders as StorageCollection<Order>;
}

// ─── Products Listing ────────────────────────────────────────────

export async function storefrontProductsHandler(ctx: RouteContext<StorefrontProductsInput>) {
	const { limit, sort, category, tag } = ctx.input;

	if (!ctx.content) {
		throw new Error("read:content capability required");
	}

	const options: Record<string, unknown> = {};
	if (category) options.where = { "product-category": category };
	else if (tag) options.where = { "product-tag": tag };

	const result = await ctx.content.list("products", {
		...options,
		limit,
	});

	const items = result.items.map((item: any) => {
		const data = item.data as ProductData;
		return {
			id: item.id,
			slug: data.slug,
			title: data.title,
			description: data.description,
			product_type: data.product_type,
			featured_image: data.featured_image,
			price: data.price,
			compare_at_price: data.compare_at_price,
			currency: data.currency ?? "USD",
			track_inventory: data.track_inventory,
			inStock: !data.track_inventory || (data.stock_quantity ?? 0) > 0,
			attributes: data.attributes,
		};
	});

	// Client-side sort
	if (sort === "price-asc") items.sort((a: any, b: any) => a.price - b.price);
	else if (sort === "price-desc") items.sort((a: any, b: any) => b.price - a.price);
	else if (sort === "name") items.sort((a: any, b: any) => a.title.localeCompare(b.title));

	return { items };
}

// ─── Single Product ──────────────────────────────────────────────

export async function storefrontProductHandler(ctx: RouteContext<StorefrontProductInput>) {
	if (!ctx.content) {
		throw new Error("read:content capability required");
	}

	const item = await ctx.content.get("products", ctx.input.slug);
	if (!item) {
		throw PluginRouteError.notFound("Product not found");
	}

	const data = item.data as unknown as ProductData;

	return {
		id: item.id,
		slug: data.slug,
		title: data.title,
		description: data.description,
		content: data.content,
		product_type: data.product_type,
		featured_image: data.featured_image,
		gallery: data.gallery,
		price: data.price,
		compare_at_price: data.compare_at_price,
		currency: data.currency ?? "USD",
		sku: data.sku,
		track_inventory: data.track_inventory,
		stock_quantity: data.stock_quantity,
		inStock: !data.track_inventory || (data.stock_quantity ?? 0) > 0,
		variants: data.variants,
		bundle_items: data.bundle_items,
		digital_asset: data.digital_asset ? { filename: data.digital_asset.filename } : undefined,
		attributes: data.attributes,
	};
}

// ─── Order Status (public) ───────────────────────────────────────

export async function orderStatusHandler(ctx: RouteContext<OrderStatusInput>) {
	const { orderId, email } = ctx.input;

	const order = await orders(ctx).get(orderId);
	if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
		throw PluginRouteError.notFound("Order not found");
	}

	return {
		orderNumber: order.orderNumber,
		status: order.status,
		paymentStatus: order.paymentStatus,
		fulfillmentStatus: order.fulfillmentStatus,
		total: order.total,
		currency: order.currency,
		tracking: order.tracking,
		createdAt: order.createdAt,
	};
}
