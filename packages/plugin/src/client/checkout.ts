/**
 * Client-side checkout flow.
 */

import { apiPost, getSessionId } from "./api.js";

export async function initCheckoutSession(email: string, shippingAddress: Record<string, string>, billingAddress?: Record<string, string>) {
	return apiPost("checkout/init", { sessionId: getSessionId(), email, shippingAddress, billingAddress });
}

export async function getShippingMethods() {
	return apiPost("checkout/shipping-methods", { sessionId: getSessionId() });
}

export async function selectShippingMethod(shippingMethodId: string) {
	return apiPost("checkout/select-shipping", { sessionId: getSessionId(), shippingMethodId });
}

export async function getPaymentMethods() {
	return apiPost("checkout/payment-methods", { sessionId: getSessionId() });
}

export async function placeOrder(paymentMethodId: string, customerNote?: string) {
	return apiPost("checkout/place-order", { sessionId: getSessionId(), paymentMethodId, customerNote });
}

export async function confirmPayment(orderId: string, paymentReference: string) {
	return apiPost("checkout/confirm", { orderId, paymentReference });
}

/**
 * Initialize checkout form interactions.
 */
export function initCheckout() {
	const form = document.querySelector<HTMLFormElement>("[data-checkout-form]");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const formData = new FormData(form);

		try {
			const email = formData.get("email") as string;
			const shippingAddress = {
				firstName: formData.get("shipping_firstName") as string,
				lastName: formData.get("shipping_lastName") as string,
				line1: formData.get("shipping_line1") as string,
				line2: (formData.get("shipping_line2") as string) || undefined,
				city: formData.get("shipping_city") as string,
				state: (formData.get("shipping_state") as string) || undefined,
				postalCode: formData.get("shipping_postalCode") as string,
				country: formData.get("shipping_country") as string,
			};
			await initCheckoutSession(email, shippingAddress);
			window.dispatchEvent(new CustomEvent("checkout:step", { detail: { step: "shipping" } }));
		} catch (err) {
			console.error("Checkout error:", err);
		}
	});
}
