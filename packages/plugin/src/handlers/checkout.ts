/**
 * Checkout flow route handlers (public).
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";
import { ulid } from "ulidx";

import type {
	CheckoutConfirmInput,
	CheckoutInitInput,
	CheckoutPaymentMethodsInput,
	CheckoutPlaceOrderInput,
	CheckoutSelectShippingInput,
	CheckoutShippingMethodsInput,
} from "../schemas.js";
import type { Cart, Customer, Discount, Order, OrderLine } from "../types.js";
import { checkStock, reserveStock } from "../services/inventory.js";
import { generateOrderNumber } from "../services/order-number.js";
import { confirmPayment, getPaymentProvider, initiatePayment, listPaymentProviders } from "../services/payment.js";
import { getShippingMethods } from "../services/shipping.js";
import { calculateTax } from "../services/tax.js";

function carts(ctx: RouteContext): StorageCollection<Cart> {
	return ctx.storage.carts as StorageCollection<Cart>;
}

function orders(ctx: RouteContext): StorageCollection<Order> {
	return ctx.storage.orders as StorageCollection<Order>;
}

function orderLinesCol(ctx: RouteContext): StorageCollection<OrderLine> {
	return ctx.storage.orderLines as StorageCollection<OrderLine>;
}

function customers(ctx: RouteContext): StorageCollection<Customer> {
	return ctx.storage.customers as StorageCollection<Customer>;
}

function discountsCol(ctx: RouteContext): StorageCollection<Discount> {
	return ctx.storage.discounts as StorageCollection<Discount>;
}

async function getCart(ctx: RouteContext, sessionId: string): Promise<{ id: string; cart: Cart }> {
	const result = await carts(ctx).query({
		where: { sessionId },
		limit: 1,
	});

	if (result.items.length === 0) {
		throw PluginRouteError.notFound("Cart not found");
	}

	return { id: result.items[0].id, cart: result.items[0].data };
}

// ─── Init Checkout ───────────────────────────────────────────────

export async function checkoutInitHandler(ctx: RouteContext<CheckoutInitInput>) {
	const { sessionId, email, shippingAddress, billingAddress } = ctx.input;

	const { id, cart } = await getCart(ctx, sessionId);

	if (cart.items.length === 0) {
		throw PluginRouteError.badRequest("Cart is empty");
	}

	// Validate stock for all items
	for (const item of cart.items) {
		const stock = await checkStock(ctx, item.productId, item.variantSku, item.quantity);
		if (!stock.available) {
			throw PluginRouteError.conflict(`Insufficient stock for product ${item.productId}`);
		}
	}

	// Calculate tax
	const tax = await calculateTax(ctx, cart.subtotal, {
		country: shippingAddress.country,
		state: shippingAddress.state,
		postalCode: shippingAddress.postalCode,
	});

	cart.email = email;
	cart.shippingAddress = shippingAddress;
	cart.billingAddress = billingAddress ?? shippingAddress;
	cart.taxTotal = tax.taxTotal;
	cart.total = Math.max(0, cart.subtotal - cart.discountTotal + cart.taxTotal + cart.shippingTotal);
	cart.updatedAt = new Date().toISOString();

	await carts(ctx).put(id, cart);

	return {
		subtotal: cart.subtotal,
		discountTotal: cart.discountTotal,
		taxTotal: cart.taxTotal,
		taxLines: tax.taxLines,
		shippingTotal: cart.shippingTotal,
		total: cart.total,
		currency: cart.currency,
	};
}

// ─── Shipping Methods ────────────────────────────────────────────

export async function checkoutShippingMethodsHandler(ctx: RouteContext<CheckoutShippingMethodsInput>) {
	const { cart } = await getCart(ctx, ctx.input.sessionId);

	if (!cart.shippingAddress) {
		throw PluginRouteError.badRequest("Shipping address required. Call checkout/init first.");
	}

	const methods = await getShippingMethods(ctx, cart, cart.shippingAddress);

	return { methods };
}

// ─── Select Shipping ─────────────────────────────────────────────

export async function checkoutSelectShippingHandler(ctx: RouteContext<CheckoutSelectShippingInput>) {
	const { sessionId, shippingMethodId } = ctx.input;

	const { id, cart } = await getCart(ctx, sessionId);

	if (!cart.shippingAddress) {
		throw PluginRouteError.badRequest("Shipping address required. Call checkout/init first.");
	}

	const methods = await getShippingMethods(ctx, cart, cart.shippingAddress);
	const selected = methods.find((m) => m.id === shippingMethodId);

	if (!selected) {
		throw PluginRouteError.notFound("Shipping method not found");
	}

	cart.shippingMethodId = shippingMethodId;
	cart.shippingTotal = selected.price;
	cart.total = Math.max(0, cart.subtotal - cart.discountTotal + cart.taxTotal + cart.shippingTotal);
	cart.updatedAt = new Date().toISOString();

	await carts(ctx).put(id, cart);

	return {
		shippingMethod: selected,
		total: cart.total,
		currency: cart.currency,
	};
}

// ─── Payment Methods ─────────────────────────────────────────────

export async function checkoutPaymentMethodsHandler(ctx: RouteContext<CheckoutPaymentMethodsInput>) {
	const providers = await listPaymentProviders(ctx);

	return {
		methods: providers.map((p) => ({
			id: p.id,
			name: p.name,
			flowType: p.flowType,
			icon: p.icon,
		})),
	};
}

// ─── Place Order ─────────────────────────────────────────────────

export async function checkoutPlaceOrderHandler(ctx: RouteContext<CheckoutPlaceOrderInput>) {
	const { sessionId, paymentMethodId, customerNote } = ctx.input;

	const { id: cartId, cart } = await getCart(ctx, sessionId);

	if (cart.items.length === 0) {
		throw PluginRouteError.badRequest("Cart is empty");
	}
	if (!cart.email) {
		throw PluginRouteError.badRequest("Email required. Call checkout/init first.");
	}
	if (!cart.shippingAddress || !cart.billingAddress) {
		throw PluginRouteError.badRequest("Addresses required. Call checkout/init first.");
	}

	const email = cart.email;

	// Final stock check
	for (const item of cart.items) {
		const stock = await checkStock(ctx, item.productId, item.variantSku, item.quantity);
		if (!stock.available) {
			throw PluginRouteError.conflict(`Insufficient stock for product ${item.productId}`);
		}
	}

	// Reserve inventory
	await reserveStock(
		ctx,
		cart.items.map((item) => ({
			productId: item.productId,
			variantSku: item.variantSku,
			quantity: item.quantity,
		})),
	);

	// Generate order number
	const orderNumber = await generateOrderNumber(ctx);
	const orderId = ulid();
	const now = new Date().toISOString();

	// Find or create customer by email
	let customerId: string;
	const existingCustomer = await customers(ctx).query({
		where: { email } as never,
		limit: 1,
	});

	if (existingCustomer.items.length > 0) {
		customerId = existingCustomer.items[0].id;
	} else {
		customerId = ulid();
		await customers(ctx).put(customerId, {
			email,
			firstName: cart.billingAddress.firstName,
			lastName: cart.billingAddress.lastName,
			tags: [],
			totalSpent: 0,
			orderCount: 0,
			acceptsMarketing: false,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Get payment provider info
	const provider = await getPaymentProvider(ctx, paymentMethodId);
	const paymentMethodName = provider?.name ?? paymentMethodId;

	// Create order
	const order: Order = {
		orderNumber,
		customerId,
		email,
		status: "pending",
		paymentStatus: "pending",
		fulfillmentStatus: "unfulfilled",
		currency: cart.currency,
		subtotal: cart.subtotal,
		discountTotal: cart.discountTotal,
		taxTotal: cart.taxTotal,
		shippingTotal: cart.shippingTotal,
		total: cart.total,
		discounts: [],
		taxLines: [],
		shippingAddress: cart.shippingAddress,
		billingAddress: cart.billingAddress,
		shippingMethod: cart.shippingMethodId
			? { id: cart.shippingMethodId, name: cart.shippingMethodId, price: cart.shippingTotal }
			: undefined,
		paymentMethod: { id: paymentMethodId, name: paymentMethodName },
		customerNote,
		ipAddress: ctx.requestMeta?.ip ?? undefined,
		createdAt: now,
		updatedAt: now,
	};

	await orders(ctx).put(orderId, order);

	// Create order lines
	for (const item of cart.items) {
		const lineId = ulid();
		const line: OrderLine = {
			orderId,
			productId: item.productId,
			variantSku: item.variantSku,
			productName: item.productId,
			sku: item.variantSku,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			lineTotal: item.lineTotal,
			taxAmount: 0,
			discountAmount: 0,
			fulfilledQuantity: 0,
			createdAt: now,
		};
		await orderLinesCol(ctx).put(lineId, line);
	}

	// Increment discount usage
	for (const code of cart.discountCodes) {
		const discountResult = await discountsCol(ctx).query({
			where: { code } as never,
			limit: 1,
		});
		if (discountResult.items.length > 0) {
			const discount = discountResult.items[0];
			await discountsCol(ctx).put(discount.id, {
				...discount.data,
				usedCount: discount.data.usedCount + 1,
				updatedAt: now,
			});
		}
	}

	// Update customer stats
	const customerData = await customers(ctx).get(customerId);
	if (customerData) {
		await customers(ctx).put(customerId, {
			...customerData,
			orderCount: customerData.orderCount + 1,
			totalSpent: customerData.totalSpent + cart.total,
			updatedAt: now,
		});
	}

	// Delete cart
	await carts(ctx).delete(cartId);

	// Initiate payment if provider is configured
	let paymentResult = null;
	if (provider) {
		const returnUrl = ctx.url(`/order/confirmation?id=${orderId}`);
		const cancelUrl = ctx.url(`/checkout?cancelled=true`);

		const linesResult = await orderLinesCol(ctx).query({
			where: { orderId },
			limit: 100,
		});

		paymentResult = await initiatePayment(
			ctx,
			provider,
			order,
			linesResult.items.map((l) => l.data),
			returnUrl,
			cancelUrl,
		);

		// Store payment reference
		await orders(ctx).put(orderId, {
			...order,
			paymentReference: paymentResult.providerReference,
			paymentStatus: "authorized",
			updatedAt: new Date().toISOString(),
		});
	}

	return {
		orderId,
		orderNumber,
		total: cart.total,
		currency: cart.currency,
		paymentStatus: provider ? "authorized" : "pending",
		redirectUrl: paymentResult?.redirectUrl,
		clientSecret: paymentResult?.clientSecret,
	};
}

// ─── Confirm Payment ─────────────────────────────────────────────

export async function checkoutConfirmHandler(ctx: RouteContext<CheckoutConfirmInput>) {
	const { orderId, paymentReference } = ctx.input;

	const order = await orders(ctx).get(orderId);
	if (!order) throw PluginRouteError.notFound("Order not found");

	const provider = await getPaymentProvider(ctx, order.paymentMethod.id);
	if (!provider) {
		throw PluginRouteError.badRequest("Payment provider not found");
	}

	const result = await confirmPayment(ctx, provider, orderId, paymentReference, {});

	if (result.success) {
		await orders(ctx).put(orderId, {
			...order,
			status: "confirmed",
			paymentStatus: "paid",
			paymentReference: result.providerReference,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, orderNumber: order.orderNumber };
	}

	return { success: false, reason: result.failureReason };
}
