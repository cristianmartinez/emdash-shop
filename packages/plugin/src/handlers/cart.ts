/**
 * Cart route handlers (public).
 *
 * Uses ctx.content to read products from emdash collections.
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import { DEFAULT_CART_EXPIRY_HOURS } from "../constants.js";
import type {
	CartAddInput,
	CartDiscountInput,
	CartGetInput,
	CartRemoveDiscountInput,
	CartRemoveInput,
	CartUpdateInput,
} from "../schemas.js";
import type { Cart, Discount, ProductData } from "../types.js";

function carts(ctx: RouteContext): StorageCollection<Cart> {
	return ctx.storage.carts as StorageCollection<Cart>;
}

function discountsCol(ctx: RouteContext): StorageCollection<Discount> {
	return ctx.storage.discounts as StorageCollection<Discount>;
}

async function getProduct(ctx: RouteContext, productId: string): Promise<ProductData | null> {
	if (!ctx.content) return null;
	const item = await ctx.content.get("products", productId);
	return item ? (item.data as unknown as ProductData) : null;
}

async function getOrCreateCart(ctx: RouteContext, sessionId: string): Promise<{ id: string; cart: Cart }> {
	const result = await carts(ctx).query({
		where: { sessionId },
		limit: 1,
	});

	if (result.items.length > 0) {
		return { id: result.items[0].id, cart: result.items[0].data };
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + DEFAULT_CART_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
	const currency = (await ctx.kv.get<string>("settings:currency")) ?? "USD";

	const cart: Cart = {
		sessionId,
		items: [],
		discountCodes: [],
		currency,
		subtotal: 0,
		discountTotal: 0,
		taxTotal: 0,
		shippingTotal: 0,
		total: 0,
		expiresAt,
		createdAt: now.toISOString(),
		updatedAt: now.toISOString(),
	};

	const id = sessionId;
	await carts(ctx).put(id, cart);

	return { id, cart };
}

async function recalculateCart(ctx: RouteContext, cart: Cart): Promise<Cart> {
	let subtotal = 0;

	for (const item of cart.items) {
		const product = await getProduct(ctx, item.productId);
		if (!product) continue;

		// Use variant price if applicable
		let unitPrice = product.price ?? 0;
		if (item.variantSku && product.variants) {
			const variant = product.variants.find((v) => v.sku === item.variantSku);
			if (variant) unitPrice = variant.price;
		}

		item.unitPrice = unitPrice;
		item.lineTotal = unitPrice * item.quantity;
		subtotal += item.lineTotal;
	}

	cart.subtotal = subtotal;

	// Apply discount codes
	let discountTotal = 0;
	for (const code of cart.discountCodes) {
		const discountResult = await discountsCol(ctx).query({
			where: { code } as never,
			limit: 1,
		});
		if (discountResult.items.length === 0) continue;

		const discount = discountResult.items[0].data;
		if (discount.status !== "active") continue;

		const now = new Date().toISOString();
		if (discount.startsAt && discount.startsAt > now) continue;
		if (discount.expiresAt && discount.expiresAt < now) continue;
		if (discount.minOrderAmount && subtotal < discount.minOrderAmount) continue;

		switch (discount.type) {
			case "percentage":
				discountTotal += Math.round(subtotal * discount.value / 100);
				break;
			case "fixed_amount":
				discountTotal += Math.min(discount.value, subtotal);
				break;
			case "free_shipping":
				cart.shippingTotal = 0;
				break;
		}
	}

	cart.discountTotal = discountTotal;
	cart.total = Math.max(0, cart.subtotal - cart.discountTotal + cart.taxTotal + cart.shippingTotal);
	cart.updatedAt = new Date().toISOString();

	return cart;
}

function cartToResponse(id: string, cart: Cart) {
	return {
		id,
		sessionId: cart.sessionId,
		items: cart.items,
		discountCodes: cart.discountCodes,
		currency: cart.currency,
		subtotal: cart.subtotal,
		discountTotal: cart.discountTotal,
		taxTotal: cart.taxTotal,
		shippingTotal: cart.shippingTotal,
		total: cart.total,
		itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
	};
}

// ─── Get Cart ────────────────────────────────────────────────────

export async function cartGetHandler(ctx: RouteContext<CartGetInput>) {
	const { id, cart } = await getOrCreateCart(ctx, ctx.input.sessionId);
	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);
	return cartToResponse(id, recalculated);
}

// ─── Add Item ────────────────────────────────────────────────────

export async function cartAddHandler(ctx: RouteContext<CartAddInput>) {
	const { sessionId, productId, variantSku, quantity } = ctx.input;

	const product = await getProduct(ctx, productId);
	if (!product) {
		throw PluginRouteError.notFound("Product not found");
	}

	// Check variant exists if specified
	if (variantSku && product.variants) {
		const variant = product.variants.find((v) => v.sku === variantSku);
		if (!variant) throw PluginRouteError.notFound("Variant not found");
	}

	// Check stock
	if (product.track_inventory) {
		const available = product.stock_quantity ?? 0;
		if (available < quantity) {
			throw PluginRouteError.conflict("Insufficient stock");
		}
	}

	const { id, cart } = await getOrCreateCart(ctx, sessionId);

	const existingIndex = cart.items.findIndex(
		(item) => item.productId === productId && item.variantSku === (variantSku ?? undefined),
	);

	if (existingIndex >= 0) {
		cart.items[existingIndex].quantity += quantity;
	} else {
		cart.items.push({ productId, variantSku, quantity, unitPrice: 0, lineTotal: 0 });
	}

	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);

	return cartToResponse(id, recalculated);
}

// ─── Update Quantity ─────────────────────────────────────────────

export async function cartUpdateHandler(ctx: RouteContext<CartUpdateInput>) {
	const { sessionId, productId, variantSku, quantity } = ctx.input;
	const { id, cart } = await getOrCreateCart(ctx, sessionId);

	const itemIndex = cart.items.findIndex(
		(item) => item.productId === productId && item.variantSku === (variantSku ?? undefined),
	);
	if (itemIndex < 0) throw PluginRouteError.notFound("Item not in cart");

	if (quantity <= 0) {
		cart.items.splice(itemIndex, 1);
	} else {
		cart.items[itemIndex].quantity = quantity;
	}

	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);

	return cartToResponse(id, recalculated);
}

// ─── Remove Item ─────────────────────────────────────────────────

export async function cartRemoveHandler(ctx: RouteContext<CartRemoveInput>) {
	const { sessionId, productId, variantSku } = ctx.input;
	const { id, cart } = await getOrCreateCart(ctx, sessionId);

	cart.items = cart.items.filter(
		(item) => !(item.productId === productId && item.variantSku === (variantSku ?? undefined)),
	);

	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);

	return cartToResponse(id, recalculated);
}

// ─── Apply Discount Code ────────────────────────────────────────

export async function cartApplyDiscountHandler(ctx: RouteContext<CartDiscountInput>) {
	const { sessionId, code } = ctx.input;
	const upperCode = code.toUpperCase();
	const { id, cart } = await getOrCreateCart(ctx, sessionId);

	if (cart.discountCodes.includes(upperCode)) {
		throw PluginRouteError.conflict("Discount code already applied");
	}

	const discountResult = await discountsCol(ctx).query({
		where: { code: upperCode } as never,
		limit: 1,
	});
	if (discountResult.items.length === 0) {
		throw PluginRouteError.notFound("Invalid discount code");
	}

	const discount = discountResult.items[0].data;
	if (discount.status !== "active") throw PluginRouteError.conflict("Discount code is not active");

	const now = new Date().toISOString();
	if (discount.expiresAt && discount.expiresAt < now) throw PluginRouteError.conflict("Discount code has expired");
	if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses) throw PluginRouteError.conflict("Discount code usage limit reached");

	cart.discountCodes.push(upperCode);

	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);

	return cartToResponse(id, recalculated);
}

// ─── Remove Discount Code ───────────────────────────────────────

export async function cartRemoveDiscountHandler(ctx: RouteContext<CartRemoveDiscountInput>) {
	const { sessionId, code } = ctx.input;
	const { id, cart } = await getOrCreateCart(ctx, sessionId);

	cart.discountCodes = cart.discountCodes.filter((c) => c !== code.toUpperCase());

	const recalculated = await recalculateCart(ctx, cart);
	await carts(ctx).put(id, recalculated);

	return cartToResponse(id, recalculated);
}
