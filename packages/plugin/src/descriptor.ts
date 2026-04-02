/**
 * Build-time plugin descriptor for the commerce plugin.
 *
 * Imported in astro.config.mjs / live.config.ts — must be side-effect-free.
 * Products and categories are native emdash collections (defined in seed.json).
 */

import type { PluginDescriptor } from "emdash";

export interface CommercePluginOptions {
	/** Default currency code (ISO 4217). Defaults to "USD". */
	currency?: string;
	/** Order number prefix. Defaults to "EM-". */
	orderPrefix?: string;
	/** Enable guest checkout. Defaults to true. */
	guestCheckout?: boolean;
}

export function commercePlugin(
	options: CommercePluginOptions = {},
): PluginDescriptor<CommercePluginOptions> {
	return {
		id: "emdash-commerce",
		version: "0.1.0",
		entrypoint: "@emdash-cms/plugin-commerce",
		adminEntry: "@emdash-cms/plugin-commerce/admin",
		componentsEntry: "@emdash-cms/plugin-commerce/astro",
		options,
		capabilities: ["read:content", "write:content", "read:media", "email:send", "network:fetch"],
		allowedHosts: ["*"],
		adminPages: [
			{ path: "/", label: "Dashboard", icon: "chart-bar" },
			{ path: "/orders", label: "Orders", icon: "receipt" },
			{ path: "/customers", label: "Customers", icon: "users" },
			{ path: "/discounts", label: "Discounts", icon: "tag" },
			{ path: "/settings", label: "Settings", icon: "gear" },
		],
		adminWidgets: [
			{ id: "revenue-summary", title: "Revenue", size: "half" },
			{ id: "recent-orders", title: "Recent Orders", size: "half" },
			{ id: "low-stock", title: "Low Stock", size: "third" },
			{ id: "top-products", title: "Top Sellers", size: "third" },
		],
		storage: {
			priceLists: { indexes: ["status", "currency"], uniqueIndexes: ["slug"] },
			priceEntries: { indexes: ["priceListId", "productId", ["priceListId", "productId"]] },
			priceRules: { indexes: ["status", "priority", "type", ["status", "priority"]] },
			discounts: { indexes: ["status", "createdAt", ["status", "createdAt"]], uniqueIndexes: ["code"] },
			customers: { indexes: ["createdAt", "orderCount", "totalSpent"], uniqueIndexes: ["email"] },
			addresses: { indexes: ["customerId", ["customerId", "type"]] },
			carts: { indexes: ["customerId", "expiresAt"], uniqueIndexes: ["sessionId"] },
			wishlists: { indexes: ["customerId"], uniqueIndexes: ["sessionId"] },
			orders: { indexes: ["customerId", "status", "paymentStatus", "createdAt", ["customerId", "createdAt"], ["status", "createdAt"]], uniqueIndexes: ["orderNumber"] },
			orderLines: { indexes: ["orderId", "productId", ["orderId", "productId"]] },
		},
	};
}
