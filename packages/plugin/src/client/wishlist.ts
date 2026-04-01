/**
 * Client-side wishlist interactions.
 */

const API_BASE = "/_emdash/api/plugins/emdash-commerce";

function getSessionId(): string {
	let sessionId = localStorage.getItem("emdash-wishlist-session");
	if (!sessionId) {
		sessionId = localStorage.getItem("emdash-cart-session") ?? crypto.randomUUID();
		localStorage.setItem("emdash-wishlist-session", sessionId);
	}
	return sessionId;
}

async function apiPost(route: string, data: unknown) {
	const res = await fetch(`${API_BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function getWishlist() {
	const url = new URL(`${API_BASE}/wishlist/get`, window.location.origin);
	url.searchParams.set("sessionId", getSessionId());
	const res = await fetch(url.toString());
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function addToWishlist(productId: string, variantId?: string) {
	return apiPost("wishlist/add", { sessionId: getSessionId(), productId, variantId });
}

export async function removeFromWishlist(productId: string, variantId?: string) {
	return apiPost("wishlist/remove", { sessionId: getSessionId(), productId, variantId });
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
			const variantId = button.dataset.variantId;
			const isActive = button.classList.contains("active");

			try {
				if (isActive) {
					await removeFromWishlist(productId, variantId);
					button.classList.remove("active");
				} else {
					await addToWishlist(productId, variantId);
					button.classList.add("active");
				}
			} catch (err) {
				console.error("Wishlist error:", err);
			}
		});
	});
}
