/**
 * Wishlist route handlers (public).
 */

import type { RouteContext, StorageCollection } from "emdash";

import type { WishlistAddInput, WishlistGetInput, WishlistRemoveInput } from "../schemas.js";
import type { Wishlist } from "../types.js";

function wishlists(ctx: RouteContext): StorageCollection<Wishlist> {
	return ctx.storage.wishlists as StorageCollection<Wishlist>;
}

async function getOrCreateWishlist(ctx: RouteContext, sessionId: string): Promise<{ id: string; wishlist: Wishlist }> {
	const result = await wishlists(ctx).query({
		where: { sessionId },
		limit: 1,
	});

	if (result.items.length > 0) {
		return { id: result.items[0].id, wishlist: result.items[0].data };
	}

	const now = new Date().toISOString();
	const wishlist: Wishlist = {
		sessionId,
		items: [],
		createdAt: now,
		updatedAt: now,
	};

	const id = sessionId;
	await wishlists(ctx).put(id, wishlist);

	return { id, wishlist };
}

// ─── Get ─────────────────────────────────────────────────────────

export async function wishlistGetHandler(ctx: RouteContext<WishlistGetInput>) {
	const { wishlist } = await getOrCreateWishlist(ctx, ctx.input.sessionId);

	return {
		items: wishlist.items,
		itemCount: wishlist.items.length,
	};
}

// ─── Add ─────────────────────────────────────────────────────────

export async function wishlistAddHandler(ctx: RouteContext<WishlistAddInput>) {
	const { sessionId, productId, variantSku } = ctx.input;

	const { id, wishlist } = await getOrCreateWishlist(ctx, sessionId);

	// Check if already in wishlist
	const exists = wishlist.items.some(
		(item) => item.productId === productId && item.variantSku === (variantSku ?? undefined),
	);

	if (!exists) {
		wishlist.items.push({
			productId,
			variantSku,
			addedAt: new Date().toISOString(),
		});
		wishlist.updatedAt = new Date().toISOString();
		await wishlists(ctx).put(id, wishlist);
	}

	return {
		items: wishlist.items,
		itemCount: wishlist.items.length,
	};
}

// ─── Remove ──────────────────────────────────────────────────────

export async function wishlistRemoveHandler(ctx: RouteContext<WishlistRemoveInput>) {
	const { sessionId, productId, variantSku } = ctx.input;

	const { id, wishlist } = await getOrCreateWishlist(ctx, sessionId);

	wishlist.items = wishlist.items.filter(
		(item) => !(item.productId === productId && item.variantSku === (variantSku ?? undefined)),
	);
	wishlist.updatedAt = new Date().toISOString();
	await wishlists(ctx).put(id, wishlist);

	return {
		items: wishlist.items,
		itemCount: wishlist.items.length,
	};
}
