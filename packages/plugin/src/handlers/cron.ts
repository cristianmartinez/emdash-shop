/**
 * Cron task handlers.
 */

import type { PluginContext } from "emdash";

import type { Cart, Order } from "../types.js";

/**
 * Clean up expired carts.
 */
export async function handleCartCleanup(ctx: PluginContext): Promise<void> {
	const now = new Date().toISOString();

	const result = await (ctx.storage.carts as any).query({
		where: { expiresAt: { lte: now } },
		limit: 100,
	});

	if (result.items.length > 0) {
		const ids = result.items.map((item: any) => item.id);
		await (ctx.storage.carts as any).deleteMany(ids);
		ctx.log.info(`Cleaned up ${ids.length} expired carts`);
	}
}

/**
 * Send daily order digest email.
 */
export async function handleOrderDigest(ctx: PluginContext): Promise<void> {
	const notifyEmails = await ctx.kv.get<string>("settings:orderNotifyEmails");
	if (!notifyEmails) return;

	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const result = await (ctx.storage.orders as any).query({
		where: { createdAt: { gte: yesterday } },
		orderBy: { createdAt: "desc" },
		limit: 100,
	});

	if (result.items.length === 0) return;

	const orders = result.items as Array<{ id: string; data: Order }>;
	const totalRevenue = orders.reduce(
		(sum: number, o: { data: Order }) => sum + (o.data.paymentStatus === "paid" ? o.data.total : 0),
		0,
	);

	const currency = (await ctx.kv.get<string>("settings:currency")) ?? "USD";
	const subject = `Daily Order Digest: ${orders.length} orders`;

	const lines = orders.map(
		(o: { id: string; data: Order }) =>
			`- ${o.data.orderNumber}: ${o.data.status} / ${o.data.paymentStatus} — ${formatCents(o.data.total, currency)}`,
	);

	const text = [
		`Order Digest for the last 24 hours`,
		``,
		`Total orders: ${orders.length}`,
		`Total revenue: ${formatCents(totalRevenue, currency)}`,
		``,
		...lines,
	].join("\n");

	const emails = notifyEmails.split(/[,\n]/).map((e: string) => e.trim()).filter(Boolean);

	for (const email of emails) {
		if (ctx.email) {
			await ctx.email.send({ to: email, subject, text });
		}
	}

	ctx.log.info(`Sent order digest to ${emails.length} recipients`);
}

function formatCents(cents: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100);
}
