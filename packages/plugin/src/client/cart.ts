/**
 * Client-side cart interactions.
 */

const API_BASE = "/_emdash/api/plugins/emdash-commerce";

function getSessionId(): string {
	let sessionId = localStorage.getItem("emdash-cart-session");
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("emdash-cart-session", sessionId);
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

async function apiGet(route: string, params?: Record<string, string>) {
	const url = new URL(`${API_BASE}/${route}`, window.location.origin);
	if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	const res = await fetch(url.toString());
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function getCart() {
	return apiGet("cart/get", { sessionId: getSessionId() });
}

export async function addToCart(productId: string, variantId?: string, quantity = 1) {
	return apiPost("cart/add", { sessionId: getSessionId(), productId, variantId, quantity });
}

export async function updateCartItem(productId: string, quantity: number, variantId?: string) {
	return apiPost("cart/update", { sessionId: getSessionId(), productId, variantId, quantity });
}

export async function removeFromCart(productId: string, variantId?: string) {
	return apiPost("cart/remove", { sessionId: getSessionId(), productId, variantId });
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
	// Add to cart buttons
	document.querySelectorAll<HTMLElement>("[data-add-to-cart]").forEach((button) => {
		button.addEventListener("click", async (e) => {
			e.preventDefault();
			const productId = button.dataset.addToCart!;
			const variantId = button.dataset.variantId;
			const quantity = parseInt(button.dataset.quantity ?? "1", 10);

			try {
				const cart = await addToCart(productId, variantId, quantity);
				updateCartBadge(cart.itemCount);
				dispatchCartEvent("cart:updated", cart);
			} catch (err) {
				console.error("Failed to add to cart:", err);
			}
		});
	});

	// Load initial cart count
	getCart()
		.then((cart) => updateCartBadge(cart.itemCount))
		.catch(() => {});
}

function updateCartBadge(count: number) {
	document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((el) => {
		el.textContent = String(count);
		el.style.display = count > 0 ? "" : "none";
	});
}

function dispatchCartEvent(name: string, detail: unknown) {
	window.dispatchEvent(new CustomEvent(name, { detail }));
}
