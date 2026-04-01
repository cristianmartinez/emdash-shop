/**
 * Payment provider registry and dispatch service.
 *
 * Payment providers register themselves via KV keys.
 * This service dispatches payment operations to the registered provider.
 */

import type { RouteContext } from "emdash";

import type {
	Order,
	OrderLine,
	PaymentConfirmResult,
	PaymentInitiateResult,
	PaymentProviderConfig,
	PaymentRefundResult,
} from "../types.js";

const PROVIDER_PREFIX = "state:paymentProvider:";

/**
 * List all registered payment providers.
 */
export async function listPaymentProviders(ctx: RouteContext): Promise<PaymentProviderConfig[]> {
	const entries = await ctx.kv.list(PROVIDER_PREFIX);
	return entries.map((entry) => entry.value as PaymentProviderConfig);
}

/**
 * Get a specific payment provider by ID.
 */
export async function getPaymentProvider(
	ctx: RouteContext,
	providerId: string,
): Promise<PaymentProviderConfig | null> {
	return ctx.kv.get<PaymentProviderConfig>(`${PROVIDER_PREFIX}${providerId}`);
}

/**
 * Register a payment provider. Called by provider plugins on activate.
 */
export async function registerPaymentProvider(
	ctx: RouteContext,
	config: PaymentProviderConfig,
): Promise<void> {
	await ctx.kv.set(`${PROVIDER_PREFIX}${config.id}`, config);
}

/**
 * Unregister a payment provider. Called by provider plugins on deactivate.
 */
export async function unregisterPaymentProvider(
	ctx: RouteContext,
	providerId: string,
): Promise<void> {
	await ctx.kv.delete(`${PROVIDER_PREFIX}${providerId}`);
}

/**
 * Initiate a payment with the specified provider.
 */
export async function initiatePayment(
	ctx: RouteContext,
	provider: PaymentProviderConfig,
	order: Order,
	orderLines: OrderLine[],
	returnUrl: string,
	cancelUrl: string,
): Promise<PaymentInitiateResult> {
	if (!ctx.http) {
		throw new Error("HTTP access required for payment provider communication");
	}

	const providerUrl = ctx.url(`/_emdash/api/plugins/${provider.pluginId}/initiate`);

	const response = await ctx.http.fetch(providerUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ order, orderLines, returnUrl, cancelUrl }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Payment initiation failed: ${error}`);
	}

	return response.json() as Promise<PaymentInitiateResult>;
}

/**
 * Confirm a payment with the specified provider.
 */
export async function confirmPayment(
	ctx: RouteContext,
	provider: PaymentProviderConfig,
	orderId: string,
	providerReference: string,
	callbackData: Record<string, unknown>,
): Promise<PaymentConfirmResult> {
	if (!ctx.http) {
		throw new Error("HTTP access required for payment provider communication");
	}

	const providerUrl = ctx.url(`/_emdash/api/plugins/${provider.pluginId}/confirm`);

	const response = await ctx.http.fetch(providerUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ orderId, providerReference, callbackData }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Payment confirmation failed: ${error}`);
	}

	return response.json() as Promise<PaymentConfirmResult>;
}

/**
 * Request a refund from the specified provider.
 */
export async function refundPayment(
	ctx: RouteContext,
	provider: PaymentProviderConfig,
	order: Order,
	amount: number,
	reason?: string,
): Promise<PaymentRefundResult> {
	if (!ctx.http) {
		throw new Error("HTTP access required for payment provider communication");
	}

	const providerUrl = ctx.url(`/_emdash/api/plugins/${provider.pluginId}/refund`);

	const response = await ctx.http.fetch(providerUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			order,
			amount,
			providerReference: order.paymentReference,
			reason,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Payment refund failed: ${error}`);
	}

	return response.json() as Promise<PaymentRefundResult>;
}
