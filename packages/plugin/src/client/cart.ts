/**
 * Client-side cart interactions.
 */

import { apiGet, apiPost, getSessionId } from "./api.js";

export async function getCart() {
	return apiGet("cart/get", { sessionId: getSessionId() });
}

export async function addToCart(productId: string, variantSku?: string, quantity = 1) {
	return apiPost("cart/add", { sessionId: getSessionId(), productId, variantSku, quantity });
}

export async function updateCartItem(productId: string, quantity: number, variantSku?: string) {
	return apiPost("cart/update", { sessionId: getSessionId(), productId, variantSku, quantity });
}

export async function removeFromCart(productId: string, variantSku?: string) {
	return apiPost("cart/remove", { sessionId: getSessionId(), productId, variantSku });
}

export async function applyDiscount(code: string) {
	return apiPost("cart/discount", { sessionId: getSessionId(), code });
}

export async function removeDiscount(code: string) {
	return apiPost("cart/remove-discount", { sessionId: getSessionId(), code });
}

/**
 * Initialize cart UI interactions.
 * Binds click handlers to [data-add-to-cart] buttons and updates [data-cart-count] elements.
 */
export function initCart() {
	document.querySelectorAll<HTMLElement>("[data-add-to-cart]").forEach((button) => {
		button.addEventListener("click", async (e) => {
			e.preventDefault();
			const productId = button.dataset.addToCart!;
			const variantSku = button.dataset.variantSku;
			const quantity = parseInt(button.dataset.quantity ?? "1", 10);

			try {
				const cart = await addToCart(productId, variantSku, quantity);
				updateCartBadge((cart as any).itemCount);
				window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
			} catch (err) {
				console.error("Failed to add to cart:", err);
			}
		});
	});

	getCart()
		.then((cart) => updateCartBadge((cart as any).itemCount))
		.catch(() => {});
}

function updateCartBadge(count: number) {
	document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((el) => {
		el.textContent = String(count);
		el.style.display = count > 0 ? "" : "none";
	});
}
