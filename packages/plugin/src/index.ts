/**
 * Commerce Plugin for EmDash CMS
 *
 * Products are native emdash collections — managed in the content admin.
 * This plugin adds: cart, checkout, orders, customers, discounts, payments.
 *
 * @example
 * ```typescript
 * // live.config.ts
 * import { commercePlugin } from "@emdash-cms/plugin-commerce";
 *
 * export default defineConfig({
 *   plugins: [commercePlugin()],
 * });
 * ```
 */

import type { ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

import type { CommercePluginOptions } from "./descriptor.js";
import {
	DEFAULT_CURRENCY,
	DEFAULT_LOW_STOCK_THRESHOLD,
	DEFAULT_ORDER_PREFIX,
} from "./constants.js";
import { COMMERCE_STORAGE_CONFIG } from "./storage.js";

// Handlers
import { cartAddHandler, cartGetHandler, cartRemoveDiscountHandler, cartApplyDiscountHandler, cartRemoveHandler, cartUpdateHandler } from "./handlers/cart.js";
import { checkoutConfirmHandler, checkoutInitHandler, checkoutPaymentMethodsHandler, checkoutPlaceOrderHandler, checkoutSelectShippingHandler, checkoutShippingMethodsHandler } from "./handlers/checkout.js";
import { handleCartCleanup, handleOrderDigest } from "./handlers/cron.js";
import { customersGetHandler, customersListHandler, customersUpdateHandler } from "./handlers/customers.js";
import { discountsCreateHandler, discountsDeleteHandler, discountsListHandler, discountsUpdateHandler, priceRulesCreateHandler, priceRulesDeleteHandler, priceRulesListHandler, priceRulesUpdateHandler } from "./handlers/discounts.js";
import { ordersAddTrackingHandler, ordersCancelHandler, ordersGetHandler, ordersListHandler, ordersNotesHandler, ordersRefundHandler, ordersUpdateStatusHandler } from "./handlers/orders.js";
import { reportsOverviewHandler, reportsTopProductsHandler } from "./handlers/reports.js";
import { settingsGetHandler, settingsUpdateHandler } from "./handlers/settings.js";
import { storefrontProductHandler, storefrontProductsHandler, orderStatusHandler } from "./handlers/storefront.js";
import { wishlistAddHandler, wishlistGetHandler, wishlistRemoveHandler } from "./handlers/wishlist.js";

// Schemas
import {
	cartAddSchema, cartDiscountSchema, cartGetSchema, cartRemoveDiscountSchema, cartRemoveSchema, cartUpdateSchema,
	checkoutConfirmSchema, checkoutInitSchema, checkoutPaymentMethodsSchema, checkoutPlaceOrderSchema, checkoutSelectShippingSchema, checkoutShippingMethodsSchema,
	customerGetSchema, customerListSchema, customerUpdateSchema,
	discountCreateSchema, discountDeleteSchema, discountListSchema, discountUpdateSchema,
	orderAddTrackingSchema, orderCancelSchema, orderGetSchema, orderListSchema, orderNotesSchema, orderRefundSchema, orderUpdateStatusSchema,
	priceRuleCreateSchema, priceRuleDeleteSchema, priceRuleListSchema, priceRuleUpdateSchema,
	reportsOverviewSchema, reportsTopProductsSchema,
	settingsUpdateSchema,
	storefrontProductSchema, storefrontProductsSchema,
	wishlistAddSchema, wishlistGetSchema, wishlistRemoveSchema,
	orderStatusSchema,
} from "./schemas.js";

// ─── Plugin Implementation ───────────────────────────────────────

export function createPlugin(options: CommercePluginOptions = {}): ResolvedPlugin {
	return definePlugin({
		id: "emdash-commerce",
		version: "0.1.0",
		capabilities: ["read:content", "write:content", "read:media", "email:send", "network:fetch"],
		allowedHosts: ["*"],

		storage: COMMERCE_STORAGE_CONFIG,

		hooks: {
			"plugin:install": {
				handler: async (_event, ctx) => {
					await ctx.kv.set("settings:currency", options.currency ?? DEFAULT_CURRENCY);
					await ctx.kv.set("settings:orderPrefix", options.orderPrefix ?? DEFAULT_ORDER_PREFIX);
					await ctx.kv.set("settings:lowStockThreshold", DEFAULT_LOW_STOCK_THRESHOLD);
					await ctx.kv.set("settings:enableGuestCheckout", options.guestCheckout ?? true);
					await ctx.kv.set("settings:enableDigitalDownloads", false);
					await ctx.kv.set("settings:taxCalculation", "none");
					await ctx.kv.set("settings:fixedTaxRate", 0);
					await ctx.kv.set("state:orderCounter", 1000);
					ctx.log.info("Commerce plugin installed");
				},
			},

			"plugin:activate": {
				handler: async (_event, ctx) => {
					if (ctx.cron) {
						await ctx.cron.schedule("cart-cleanup", { schedule: "@hourly" });
						await ctx.cron.schedule("order-digest", { schedule: "0 8 * * *" });
					}
				},
			},

			"plugin:deactivate": {
				handler: async (_event, ctx) => {
					if (ctx.cron) {
						await ctx.cron.cancel("cart-cleanup");
						await ctx.cron.cancel("order-digest");
					}
				},
			},

			"content:afterSave": {
				handler: async (event, ctx) => {
					if (event.collection === "products") {
						ctx.log.info(`Product saved: ${event.content.id}`);
					}
				},
			},

			cron: {
				handler: async (event, ctx) => {
					if (event.name === "cart-cleanup") {
						await handleCartCleanup(ctx);
					} else if (event.name === "order-digest") {
						await handleOrderDigest(ctx);
					}
				},
			},
		},

		routes: {
			// ── Storefront (public) ──────────────────────────────

			"storefront/products": {
				public: true,
				input: storefrontProductsSchema,
				handler: storefrontProductsHandler as never,
			},
			"storefront/product": {
				public: true,
				input: storefrontProductSchema,
				handler: storefrontProductHandler as never,
			},

			// ── Cart (public) ────────────────────────────────────

			"cart/get": { public: true, input: cartGetSchema, handler: cartGetHandler as never },
			"cart/add": { public: true, input: cartAddSchema, handler: cartAddHandler as never },
			"cart/update": { public: true, input: cartUpdateSchema, handler: cartUpdateHandler as never },
			"cart/remove": { public: true, input: cartRemoveSchema, handler: cartRemoveHandler as never },
			"cart/discount": { public: true, input: cartDiscountSchema, handler: cartApplyDiscountHandler as never },
			"cart/remove-discount": { public: true, input: cartRemoveDiscountSchema, handler: cartRemoveDiscountHandler as never },

			// ── Checkout (public) ────────────────────────────────

			"checkout/init": { public: true, input: checkoutInitSchema, handler: checkoutInitHandler as never },
			"checkout/shipping-methods": { public: true, input: checkoutShippingMethodsSchema, handler: checkoutShippingMethodsHandler as never },
			"checkout/select-shipping": { public: true, input: checkoutSelectShippingSchema, handler: checkoutSelectShippingHandler as never },
			"checkout/payment-methods": { public: true, input: checkoutPaymentMethodsSchema, handler: checkoutPaymentMethodsHandler as never },
			"checkout/place-order": { public: true, input: checkoutPlaceOrderSchema, handler: checkoutPlaceOrderHandler as never },
			"checkout/confirm": { public: true, input: checkoutConfirmSchema, handler: checkoutConfirmHandler as never },

			// ── Order Status (public) ────────────────────────────

			"order/status": { public: true, input: orderStatusSchema, handler: orderStatusHandler as never },

			// ── Wishlist (public) ────────────────────────────────

			"wishlist/get": { public: true, input: wishlistGetSchema, handler: wishlistGetHandler as never },
			"wishlist/add": { public: true, input: wishlistAddSchema, handler: wishlistAddHandler as never },
			"wishlist/remove": { public: true, input: wishlistRemoveSchema, handler: wishlistRemoveHandler as never },

			// ── Discounts (admin) ────────────────────────────────

			"discounts/list": { input: discountListSchema, handler: discountsListHandler as never },
			"discounts/create": { input: discountCreateSchema, handler: discountsCreateHandler as never },
			"discounts/update": { input: discountUpdateSchema, handler: discountsUpdateHandler as never },
			"discounts/delete": { input: discountDeleteSchema, handler: discountsDeleteHandler as never },

			// ── Price Rules (admin) ──────────────────────────────

			"price-rules/list": { input: priceRuleListSchema, handler: priceRulesListHandler as never },
			"price-rules/create": { input: priceRuleCreateSchema, handler: priceRulesCreateHandler as never },
			"price-rules/update": { input: priceRuleUpdateSchema, handler: priceRulesUpdateHandler as never },
			"price-rules/delete": { input: priceRuleDeleteSchema, handler: priceRulesDeleteHandler as never },

			// ── Orders (admin) ───────────────────────────────────

			"orders/list": { input: orderListSchema, handler: ordersListHandler as never },
			"orders/get": { input: orderGetSchema, handler: ordersGetHandler as never },
			"orders/update-status": { input: orderUpdateStatusSchema, handler: ordersUpdateStatusHandler as never },
			"orders/add-tracking": { input: orderAddTrackingSchema, handler: ordersAddTrackingHandler as never },
			"orders/cancel": { input: orderCancelSchema, handler: ordersCancelHandler as never },
			"orders/refund": { input: orderRefundSchema, handler: ordersRefundHandler as never },
			"orders/notes": { input: orderNotesSchema, handler: ordersNotesHandler as never },

			// ── Customers (admin) ────────────────────────────────

			"customers/list": { input: customerListSchema, handler: customersListHandler as never },
			"customers/get": { input: customerGetSchema, handler: customersGetHandler as never },
			"customers/update": { input: customerUpdateSchema, handler: customersUpdateHandler as never },

			// ── Reports (admin) ──────────────────────────────────

			"reports/overview": { input: reportsOverviewSchema, handler: reportsOverviewHandler as never },
			"reports/top-products": { input: reportsTopProductsSchema, handler: reportsTopProductsHandler as never },

			// ── Settings (admin) ─────────────────────────────────

			"settings/get": { handler: settingsGetHandler },
			"settings/update": { input: settingsUpdateSchema, handler: settingsUpdateHandler as never },
		},

		admin: {
			settingsSchema: {
				currency: {
					type: "select",
					label: "Default Currency",
					options: [
						{ value: "USD", label: "US Dollar (USD)" },
						{ value: "EUR", label: "Euro (EUR)" },
						{ value: "GBP", label: "British Pound (GBP)" },
						{ value: "COP", label: "Colombian Peso (COP)" },
					],
					default: "USD",
				},
				orderPrefix: { type: "string", label: "Order Number Prefix", default: "EM-" },
				lowStockThreshold: { type: "number", label: "Low Stock Alert Threshold", default: 5, min: 0 },
				enableGuestCheckout: { type: "boolean", label: "Allow Guest Checkout", default: true },
				orderNotifyEmails: { type: "string", label: "Order Notification Emails", multiline: true },
				taxCalculation: {
					type: "select",
					label: "Tax Calculation",
					options: [
						{ value: "none", label: "No Tax" },
						{ value: "fixed", label: "Fixed Rate" },
						{ value: "provider", label: "Tax Provider Plugin" },
					],
					default: "none",
				},
				fixedTaxRate: { type: "number", label: "Fixed Tax Rate (%)", default: 0, min: 0, max: 100 },
			},
			pages: [
				{ path: "/", label: "Dashboard", icon: "chart-bar" },
				{ path: "/orders", label: "Orders", icon: "receipt" },
				{ path: "/customers", label: "Customers", icon: "users" },
				{ path: "/discounts", label: "Discounts", icon: "tag" },
				{ path: "/settings", label: "Settings", icon: "gear" },
			],
			widgets: [
				{ id: "revenue-summary", title: "Revenue", size: "half" },
				{ id: "recent-orders", title: "Recent Orders", size: "half" },
				{ id: "low-stock", title: "Low Stock", size: "third" },
				{ id: "top-products", title: "Top Sellers", size: "third" },
			],
			portableTextBlocks: [
				{
					type: "emdash-product",
					label: "Product",
					icon: "package",
					description: "Embed a product card",
					fields: [{ type: "text_input", action_id: "productId", label: "Product ID" }],
				},
			],
		},
	});
}

export default createPlugin;

export type * from "./types.js";
export type { CommerceStorage } from "./storage.js";
export { commercePlugin } from "./descriptor.js";
