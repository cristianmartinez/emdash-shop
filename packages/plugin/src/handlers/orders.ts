/**
 * Order management route handlers (admin).
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import type {
	OrderAddTrackingInput,
	OrderCancelInput,
	OrderGetInput,
	OrderListInput,
	OrderNotesInput,
	OrderRefundInput,
	OrderUpdateStatusInput,
} from "../schemas.js";
import type { Customer, Order, OrderLine } from "../types.js";
import { releaseStock } from "../services/inventory.js";
import { getPaymentProvider, refundPayment } from "../services/payment.js";

function orders(ctx: RouteContext): StorageCollection<Order> {
	return ctx.storage.orders as StorageCollection<Order>;
}

function orderLines(ctx: RouteContext): StorageCollection<OrderLine> {
	return ctx.storage.orderLines as StorageCollection<OrderLine>;
}

function customers(ctx: RouteContext): StorageCollection<Customer> {
	return ctx.storage.customers as StorageCollection<Customer>;
}

// ─── List ────────────────────────────────────────────────────────

export async function ordersListHandler(ctx: RouteContext<OrderListInput>) {
	const { status, customerId, limit, cursor } = ctx.input;

	const where: Record<string, unknown> = {};
	if (status) where.status = status;
	if (customerId) where.customerId = customerId;

	const result = await orders(ctx).query({
		where: Object.keys(where).length > 0 ? where : undefined,
		orderBy: { createdAt: "desc" },
		limit,
		cursor,
	});

	return {
		items: result.items.map((item) => ({ id: item.id, ...item.data })),
		hasMore: result.hasMore,
		cursor: result.cursor,
	};
}

// ─── Get ─────────────────────────────────────────────────────────

export async function ordersGetHandler(ctx: RouteContext<OrderGetInput>) {
	const order = await orders(ctx).get(ctx.input.id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	const linesResult = await orderLines(ctx).query({
		where: { orderId: ctx.input.id },
		limit: 100,
	});

	return {
		id: ctx.input.id,
		...order,
		lines: linesResult.items.map((l) => ({ id: l.id, ...l.data })),
	};
}

// ─── Update Status ───────────────────────────────────────────────

export async function ordersUpdateStatusHandler(ctx: RouteContext<OrderUpdateStatusInput>) {
	const { id, status } = ctx.input;

	const order = await orders(ctx).get(id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	const updated: Order = {
		...order,
		status,
		updatedAt: new Date().toISOString(),
	};

	// Auto-update fulfillment status
	if (status === "shipped" || status === "delivered") {
		updated.fulfillmentStatus = status === "delivered" ? "fulfilled" : "partially_fulfilled";
	}

	await orders(ctx).put(id, updated);

	return { id, ...updated };
}

// ─── Add Tracking ────────────────────────────────────────────────

export async function ordersAddTrackingHandler(ctx: RouteContext<OrderAddTrackingInput>) {
	const { id, carrier, trackingNumber, trackingUrl } = ctx.input;

	const order = await orders(ctx).get(id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	const updated: Order = {
		...order,
		tracking: { carrier, trackingNumber, trackingUrl },
		status: order.status === "processing" ? "shipped" : order.status,
		updatedAt: new Date().toISOString(),
	};

	await orders(ctx).put(id, updated);

	return { id, ...updated };
}

// ─── Cancel ──────────────────────────────────────────────────────

export async function ordersCancelHandler(ctx: RouteContext<OrderCancelInput>) {
	const { id, reason, refund } = ctx.input;

	const order = await orders(ctx).get(id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	if (order.status === "cancelled" || order.status === "refunded") {
		throw PluginRouteError.conflict("Order is already cancelled or refunded");
	}

	// Release inventory
	const linesResult = await orderLines(ctx).query({
		where: { orderId: id },
		limit: 100,
	});

	await releaseStock(
		ctx,
		linesResult.items.map((l) => ({
			productId: l.data.productId,
			variantSku: l.data.variantSku,
			quantity: l.data.quantity,
		})),
	);

	// Process refund if requested
	if (refund && order.paymentReference) {
		const provider = await getPaymentProvider(ctx, order.paymentMethod.id);
		if (provider?.supportsRefunds) {
			await refundPayment(ctx, provider, order, order.total, reason);
		}
	}

	const updated: Order = {
		...order,
		status: "cancelled",
		paymentStatus: refund ? "refunded" : order.paymentStatus,
		cancelledAt: new Date().toISOString(),
		cancelReason: reason,
		updatedAt: new Date().toISOString(),
	};

	await orders(ctx).put(id, updated);

	// Update customer stats
	const customerResult = await customers(ctx).query({
		where: { email: order.email },
		limit: 1,
	});
	if (customerResult.items.length > 0) {
		const customer = customerResult.items[0];
		await customers(ctx).put(customer.id, {
			...customer.data,
			orderCount: Math.max(0, customer.data.orderCount - 1),
			totalSpent: Math.max(0, customer.data.totalSpent - order.total),
			updatedAt: new Date().toISOString(),
		});
	}

	return { id, ...updated };
}

// ─── Refund ──────────────────────────────────────────────────────

export async function ordersRefundHandler(ctx: RouteContext<OrderRefundInput>) {
	const { id, amount, reason } = ctx.input;

	const order = await orders(ctx).get(id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	if (order.paymentStatus === "refunded") {
		throw PluginRouteError.conflict("Order is already fully refunded");
	}

	const refundAmount = amount ?? order.total;

	if (order.paymentReference) {
		const provider = await getPaymentProvider(ctx, order.paymentMethod.id);
		if (provider?.supportsRefunds) {
			await refundPayment(ctx, provider, order, refundAmount, reason);
		}
	}

	const isFullRefund = refundAmount >= order.total;
	const updated: Order = {
		...order,
		paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
		status: isFullRefund ? "refunded" : order.status,
		updatedAt: new Date().toISOString(),
	};

	await orders(ctx).put(id, updated);

	return { id, ...updated, refundedAmount: refundAmount };
}

// ─── Notes ───────────────────────────────────────────────────────

export async function ordersNotesHandler(ctx: RouteContext<OrderNotesInput>) {
	const { id, notes } = ctx.input;

	const order = await orders(ctx).get(id);
	if (!order) throw PluginRouteError.notFound("Order not found");

	const updated: Order = {
		...order,
		internalNotes: notes,
		updatedAt: new Date().toISOString(),
	};

	await orders(ctx).put(id, updated);

	return { id, ...updated };
}
