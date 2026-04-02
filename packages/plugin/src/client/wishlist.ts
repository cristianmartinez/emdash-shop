/**
 * Client-side wishlist interactions.
 */

import { apiPost, getSessionId } from "./api.js";

export async function getWishlist() {
	return apiPost("wishlist/get", { sessionId: getSessionId() });
}

export async function addToWishlist(productId: string, variantSku?: string) {
	return apiPost("wishlist/add", { sessionId: getSessionId(), productId, variantSku });
}

export async function removeFromWishlist(productId: string, variantSku?: string) {
	return apiPost("wishlist/remove", { sessionId: getSessionId(), productId, variantSku });
}

/**
 * Initialize wishlist UI interactions.
 * Binds click handlers to [data-wishlist-toggle] buttons.
 */
export function initWishlist() {
	document.querySelectorAll<HTMLElement>("[data-wishlist-toggle]").forEach((button) => {
		button.addEventListener("click", async (e) => {
			e.preventDefault();
			const productId = button.dataset.wishlistToggle!;
			const variantSku = button.dataset.variantSku;
			const isActive = button.classList.contains("active");

			try {
				if (isActive) {
					await removeFromWishlist(productId, variantSku);
					button.classList.remove("active");
				} else {
					await addToWishlist(productId, variantSku);
					button.classList.add("active");
				}
			} catch (err) {
				console.error("Wishlist error:", err);
			}
		});
	});
}
