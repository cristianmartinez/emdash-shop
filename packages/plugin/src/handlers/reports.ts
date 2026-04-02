/**
 * Dashboard reporting route handlers (admin).
 */

import type { RouteContext, StorageCollection } from "emdash";

import type { ReportsOverviewInput, ReportsTopProductsInput } from "../schemas.js";
import type { Order, OrderLine } from "../types.js";

function orders(ctx: RouteContext): StorageCollection<Order> {
	return ctx.storage.orders as StorageCollection<Order>;
}

function orderLines(ctx: RouteContext): StorageCollection<OrderLine> {
	return ctx.storage.orderLines as StorageCollection<OrderLine>;
}

async function getProductName(ctx: RouteContext, productId: string): Promise<string> {
	if (!ctx.content) return "Unknown Product";
	const item = await ctx.content.get("products", productId);
	return item ? (item.data as any).title ?? "Unknown Product" : "Deleted Product";
}

// ─── Overview ────────────────────────────────────────────────────

export async function reportsOverviewHandler(ctx: RouteContext<ReportsOverviewInput>) {
	const { from, to } = ctx.input;

	const where: Record<string, unknown> = {};
	if (from || to) {
		const range: Record<string, string> = {};
		if (from) range.gte = from;
		if (to) range.lte = to;
		where.createdAt = range;
	}

	const ordersResult = await orders(ctx).query({
		where: Object.keys(where).length > 0 ? where : undefined,
		orderBy: { createdAt: "desc" },
		limit: 1000,
	});

	let totalRevenue = 0;
	let totalOrders = 0;
	let paidOrders = 0;

	for (const order of ordersResult.items) {
		totalOrders++;
		if (order.data.paymentStatus === "paid") {
			totalRevenue += order.data.total;
			paidOrders++;
		}
	}

	const averageOrderValue = paidOrders > 0 ? Math.round(totalRevenue / paidOrders) : 0;

	const pendingCount = await orders(ctx).count({ status: "pending" });

	return {
		totalRevenue,
		totalOrders,
		paidOrders,
		averageOrderValue,
		pendingOrders: pendingCount,
		currency: (await ctx.kv.get<string>("settings:currency")) ?? "USD",
	};
}

// ─── Top Products ────────────────────────────────────────────────

export async function reportsTopProductsHandler(ctx: RouteContext<ReportsTopProductsInput>) {
	const { limit } = ctx.input;

	// Get all order lines and aggregate by product
	const linesResult = await orderLines(ctx).query({
		limit: 1000,
	});

	const productSales = new Map<string, { quantity: number; revenue: number }>();

	for (const line of linesResult.items) {
		const existing = productSales.get(line.data.productId) ?? { quantity: 0, revenue: 0 };
		existing.quantity += line.data.quantity;
		existing.revenue += line.data.lineTotal;
		productSales.set(line.data.productId, existing);
	}

	// Sort by revenue and take top N
	const sorted = [...productSales.entries()]
		.sort(([, a], [, b]) => b.revenue - a.revenue)
		.slice(0, limit);

	const items = await Promise.all(
		sorted.map(async ([productId, sales]) => {
			const name = await getProductName(ctx, productId);
			return {
				productId,
				name,
				quantity: sales.quantity,
				revenue: sales.revenue,
			};
		}),
	);

	return { items };
}
