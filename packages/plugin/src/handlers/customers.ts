/**
 * Customer management route handlers (admin).
 */

import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import type { CustomerGetInput, CustomerListInput, CustomerUpdateInput } from "../schemas.js";
import type { Customer, CustomerAddress, Order } from "../types.js";

function customers(ctx: RouteContext): StorageCollection<Customer> {
	return ctx.storage.customers as StorageCollection<Customer>;
}

function addresses(ctx: RouteContext): StorageCollection<CustomerAddress> {
	return ctx.storage.addresses as StorageCollection<CustomerAddress>;
}

function orders(ctx: RouteContext): StorageCollection<Order> {
	return ctx.storage.orders as StorageCollection<Order>;
}

// ─── List ────────────────────────────────────────────────────────

export async function customersListHandler(ctx: RouteContext<CustomerListInput>) {
	const { limit, cursor } = ctx.input;

	const result = await customers(ctx).query({
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

export async function customersGetHandler(ctx: RouteContext<CustomerGetInput>) {
	const customer = await customers(ctx).get(ctx.input.id);
	if (!customer) throw PluginRouteError.notFound("Customer not found");

	// Fetch addresses
	const addressesResult = await addresses(ctx).query({
		where: { customerId: ctx.input.id },
		limit: 20,
	});

	// Fetch recent orders
	const ordersResult = await orders(ctx).query({
		where: { customerId: ctx.input.id },
		orderBy: { createdAt: "desc" },
		limit: 10,
	});

	return {
		id: ctx.input.id,
		...customer,
		addresses: addressesResult.items.map((a) => ({ id: a.id, ...a.data })),
		recentOrders: ordersResult.items.map((o) => ({ id: o.id, ...o.data })),
	};
}

// ─── Update ──────────────────────────────────────────────────────

export async function customersUpdateHandler(ctx: RouteContext<CustomerUpdateInput>) {
	const { id, ...updates } = ctx.input;

	const existing = await customers(ctx).get(id);
	if (!existing) throw PluginRouteError.notFound("Customer not found");

	const updated: Customer = {
		...existing,
		...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
		updatedAt: new Date().toISOString(),
	};

	await customers(ctx).put(id, updated);

	return { id, ...updated };
}
