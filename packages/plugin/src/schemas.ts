/**
 * Zod schemas for route input validation.
 *
 * Product/category schemas are not needed — those are managed by the native emdash admin.
 */

import { z } from "astro/zod";

// ─── Shared ──────────────────────────────────────────────────────

const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	cursor: z.string().optional(),
});

const addressSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	company: z.string().max(200).optional(),
	line1: z.string().min(1).max(200),
	line2: z.string().max(200).optional(),
	city: z.string().min(1).max(100),
	state: z.string().max(100).optional(),
	postalCode: z.string().min(1).max(20),
	country: z.string().length(2),
	phone: z.string().max(30).optional(),
});

// ─── Price List Schemas ──────────────────────────────────────────

export const priceListCreateSchema = z.object({
	name: z.string().min(1).max(200),
	slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	currency: z.string().length(3),
	conditions: z
		.object({
			customerTags: z.array(z.string()).optional(),
			minQuantity: z.number().int().min(1).optional(),
			validFrom: z.string().optional(),
			validUntil: z.string().optional(),
		})
		.optional(),
	status: z.enum(["active", "inactive"]).default("active"),
});
export type PriceListCreateInput = z.infer<typeof priceListCreateSchema>;

export const priceListUpdateSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(200).optional(),
	slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
	currency: z.string().length(3).optional(),
	conditions: z
		.object({
			customerTags: z.array(z.string()).optional(),
			minQuantity: z.number().int().min(1).optional(),
			validFrom: z.string().nullable().optional(),
			validUntil: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
	status: z.enum(["active", "inactive"]).optional(),
});
export type PriceListUpdateInput = z.infer<typeof priceListUpdateSchema>;

export const priceListDeleteSchema = z.object({ id: z.string().min(1) });
export type PriceListDeleteInput = z.infer<typeof priceListDeleteSchema>;

export const priceListListSchema = z.object({
	status: z.enum(["active", "inactive"]).optional(),
});
export type PriceListListInput = z.infer<typeof priceListListSchema>;

// ─── Price Entry Schemas ─────────────────────────────────────────

export const priceEntryUpsertSchema = z.object({
	priceListId: z.string().min(1),
	productId: z.string().min(1),
	variantId: z.string().optional(),
	price: z.number().int().min(0),
	compareAtPrice: z.number().int().min(0).optional(),
});
export type PriceEntryUpsertInput = z.infer<typeof priceEntryUpsertSchema>;

export const priceEntryDeleteSchema = z.object({ id: z.string().min(1) });
export type PriceEntryDeleteInput = z.infer<typeof priceEntryDeleteSchema>;

export const priceEntryListSchema = z.object({
	priceListId: z.string().min(1),
	productId: z.string().optional(),
});
export type PriceEntryListInput = z.infer<typeof priceEntryListSchema>;

// ─── Price Rule Schemas ──────────────────────────────────────────

const tierSchema = z.object({
	minQuantity: z.number().int().min(1),
	maxQuantity: z.number().int().min(1).optional(),
	type: z.enum(["percentage", "fixed_price", "fixed_discount"]),
	value: z.number().min(0),
});

export const priceRuleCreateSchema = z.object({
	name: z.string().min(1).max(200),
	type: z.enum(["percentage", "fixed_amount", "tiered", "bogo"]),
	value: z.number().min(0).optional(),
	scope: z.enum(["order", "products", "categories"]),
	scopeIds: z.array(z.string()).optional(),
	conditions: z
		.object({
			minQuantity: z.number().int().min(1).optional(),
			minAmount: z.number().int().min(0).optional(),
			customerTags: z.array(z.string()).optional(),
		})
		.optional(),
	tiers: z.array(tierSchema).optional(),
	stackable: z.boolean().default(false),
	priority: z.number().int().default(100),
	status: z.enum(["active", "disabled"]).default("active"),
	startsAt: z.string().optional(),
	expiresAt: z.string().optional(),
});
export type PriceRuleCreateInput = z.infer<typeof priceRuleCreateSchema>;

export const priceRuleUpdateSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(200).optional(),
	type: z.enum(["percentage", "fixed_amount", "tiered", "bogo"]).optional(),
	value: z.number().min(0).nullable().optional(),
	scope: z.enum(["order", "products", "categories"]).optional(),
	scopeIds: z.array(z.string()).nullable().optional(),
	conditions: z
		.object({
			minQuantity: z.number().int().min(1).optional(),
			minAmount: z.number().int().min(0).optional(),
			customerTags: z.array(z.string()).optional(),
		})
		.nullable()
		.optional(),
	tiers: z.array(tierSchema).nullable().optional(),
	stackable: z.boolean().optional(),
	priority: z.number().int().optional(),
	status: z.enum(["active", "disabled"]).optional(),
	startsAt: z.string().nullable().optional(),
	expiresAt: z.string().nullable().optional(),
});
export type PriceRuleUpdateInput = z.infer<typeof priceRuleUpdateSchema>;

export const priceRuleDeleteSchema = z.object({ id: z.string().min(1) });
export type PriceRuleDeleteInput = z.infer<typeof priceRuleDeleteSchema>;

export const priceRuleListSchema = z.object({
	status: z.enum(["active", "disabled"]).optional(),
});
export type PriceRuleListInput = z.infer<typeof priceRuleListSchema>;

// ─── Discount Schemas ────────────────────────────────────────────

export const discountCreateSchema = z.object({
	code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
	description: z.string().max(500).optional(),
	type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
	value: z.number().min(0),
	scope: z.enum(["order", "products", "categories"]).default("order"),
	scopeIds: z.array(z.string()).optional(),
	minOrderAmount: z.number().int().min(0).optional(),
	maxUses: z.number().int().min(0).default(0),
	maxUsesPerCustomer: z.number().int().min(0).default(0),
	startsAt: z.string().optional(),
	expiresAt: z.string().optional(),
	status: z.enum(["active", "disabled", "expired"]).default("active"),
});
export type DiscountCreateInput = z.infer<typeof discountCreateSchema>;

export const discountUpdateSchema = z.object({
	id: z.string().min(1),
	code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i).optional(),
	description: z.string().max(500).nullable().optional(),
	type: z.enum(["percentage", "fixed_amount", "free_shipping"]).optional(),
	value: z.number().min(0).optional(),
	scope: z.enum(["order", "products", "categories"]).optional(),
	scopeIds: z.array(z.string()).nullable().optional(),
	minOrderAmount: z.number().int().min(0).nullable().optional(),
	maxUses: z.number().int().min(0).optional(),
	maxUsesPerCustomer: z.number().int().min(0).optional(),
	startsAt: z.string().nullable().optional(),
	expiresAt: z.string().nullable().optional(),
	status: z.enum(["active", "disabled", "expired"]).optional(),
});
export type DiscountUpdateInput = z.infer<typeof discountUpdateSchema>;

export const discountDeleteSchema = z.object({ id: z.string().min(1) });
export type DiscountDeleteInput = z.infer<typeof discountDeleteSchema>;

export const discountListSchema = paginationSchema.extend({
	status: z.enum(["active", "disabled", "expired"]).optional(),
});
export type DiscountListInput = z.infer<typeof discountListSchema>;

// ─── Order Schemas ───────────────────────────────────────────────

export const orderListSchema = paginationSchema.extend({
	status: z
		.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
		.optional(),
	customerId: z.string().optional(),
});
export type OrderListInput = z.infer<typeof orderListSchema>;

export const orderGetSchema = z.object({ id: z.string().min(1) });
export type OrderGetInput = z.infer<typeof orderGetSchema>;

export const orderUpdateStatusSchema = z.object({
	id: z.string().min(1),
	status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
});
export type OrderUpdateStatusInput = z.infer<typeof orderUpdateStatusSchema>;

export const orderAddTrackingSchema = z.object({
	id: z.string().min(1),
	carrier: z.string().min(1).max(100),
	trackingNumber: z.string().min(1).max(200),
	trackingUrl: z.string().url().optional(),
});
export type OrderAddTrackingInput = z.infer<typeof orderAddTrackingSchema>;

export const orderCancelSchema = z.object({
	id: z.string().min(1),
	reason: z.string().max(500).optional(),
	refund: z.boolean().default(false),
});
export type OrderCancelInput = z.infer<typeof orderCancelSchema>;

export const orderRefundSchema = z.object({
	id: z.string().min(1),
	amount: z.number().int().min(1).optional(),
	reason: z.string().max(500).optional(),
});
export type OrderRefundInput = z.infer<typeof orderRefundSchema>;

export const orderNotesSchema = z.object({
	id: z.string().min(1),
	notes: z.string().max(2000),
});
export type OrderNotesInput = z.infer<typeof orderNotesSchema>;

// ─── Customer Schemas ────────────────────────────────────────────

export const customerListSchema = paginationSchema.extend({
	search: z.string().optional(),
});
export type CustomerListInput = z.infer<typeof customerListSchema>;

export const customerGetSchema = z.object({ id: z.string().min(1) });
export type CustomerGetInput = z.infer<typeof customerGetSchema>;

export const customerUpdateSchema = z.object({
	id: z.string().min(1),
	firstName: z.string().max(100).optional(),
	lastName: z.string().max(100).optional(),
	phone: z.string().max(30).nullable().optional(),
	tags: z.array(z.string()).optional(),
	acceptsMarketing: z.boolean().optional(),
	notes: z.string().max(2000).nullable().optional(),
});
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

// ─── Cart Schemas (Public) ───────────────────────────────────────

export const cartGetSchema = z.object({
	sessionId: z.string().min(1),
});
export type CartGetInput = z.infer<typeof cartGetSchema>;

export const cartAddSchema = z.object({
	sessionId: z.string().min(1),
	productId: z.string().min(1),
	variantSku: z.string().optional(),
	quantity: z.number().int().min(1).default(1),
});
export type CartAddInput = z.infer<typeof cartAddSchema>;

export const cartUpdateSchema = z.object({
	sessionId: z.string().min(1),
	productId: z.string().min(1),
	variantSku: z.string().optional(),
	quantity: z.number().int().min(0),
});
export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;

export const cartRemoveSchema = z.object({
	sessionId: z.string().min(1),
	productId: z.string().min(1),
	variantSku: z.string().optional(),
});
export type CartRemoveInput = z.infer<typeof cartRemoveSchema>;

export const cartDiscountSchema = z.object({
	sessionId: z.string().min(1),
	code: z.string().min(1),
});
export type CartDiscountInput = z.infer<typeof cartDiscountSchema>;

export const cartRemoveDiscountSchema = z.object({
	sessionId: z.string().min(1),
	code: z.string().min(1),
});
export type CartRemoveDiscountInput = z.infer<typeof cartRemoveDiscountSchema>;

// ─── Checkout Schemas (Public) ───────────────────────────────────

export const checkoutInitSchema = z.object({
	sessionId: z.string().min(1),
	email: z.string().email(),
	shippingAddress: addressSchema,
	billingAddress: addressSchema.optional(),
});
export type CheckoutInitInput = z.infer<typeof checkoutInitSchema>;

export const checkoutShippingMethodsSchema = z.object({
	sessionId: z.string().min(1),
});
export type CheckoutShippingMethodsInput = z.infer<typeof checkoutShippingMethodsSchema>;

export const checkoutSelectShippingSchema = z.object({
	sessionId: z.string().min(1),
	shippingMethodId: z.string().min(1),
});
export type CheckoutSelectShippingInput = z.infer<typeof checkoutSelectShippingSchema>;

export const checkoutPaymentMethodsSchema = z.object({
	sessionId: z.string().min(1),
});
export type CheckoutPaymentMethodsInput = z.infer<typeof checkoutPaymentMethodsSchema>;

export const checkoutPlaceOrderSchema = z.object({
	sessionId: z.string().min(1),
	paymentMethodId: z.string().min(1),
	customerNote: z.string().max(1000).optional(),
});
export type CheckoutPlaceOrderInput = z.infer<typeof checkoutPlaceOrderSchema>;

export const checkoutConfirmSchema = z.object({
	orderId: z.string().min(1),
	paymentReference: z.string().min(1),
});
export type CheckoutConfirmInput = z.infer<typeof checkoutConfirmSchema>;

// ─── Storefront Schemas (Public) ─────────────────────────────────

export const storefrontProductsSchema = paginationSchema.extend({
	category: z.string().optional(),
	tag: z.string().optional(),
	sort: z.enum(["newest", "price-asc", "price-desc", "name", "popular"]).default("newest"),
});
export type StorefrontProductsInput = z.infer<typeof storefrontProductsSchema>;

export const storefrontProductSchema = z.object({
	slug: z.string().min(1),
});
export type StorefrontProductInput = z.infer<typeof storefrontProductSchema>;

// ─── Wishlist Schemas (Public) ───────────────────────────────────

export const wishlistGetSchema = z.object({
	sessionId: z.string().min(1),
});
export type WishlistGetInput = z.infer<typeof wishlistGetSchema>;

export const wishlistAddSchema = z.object({
	sessionId: z.string().min(1),
	productId: z.string().min(1),
	variantSku: z.string().optional(),
});
export type WishlistAddInput = z.infer<typeof wishlistAddSchema>;

export const wishlistRemoveSchema = z.object({
	sessionId: z.string().min(1),
	productId: z.string().min(1),
	variantSku: z.string().optional(),
});
export type WishlistRemoveInput = z.infer<typeof wishlistRemoveSchema>;

// ─── Order Status (Public) ───────────────────────────────────────

export const orderStatusSchema = z.object({
	orderId: z.string().min(1),
	email: z.string().email(),
});
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

// ─── Reports Schemas ─────────────────────────────────────────────

export const reportsOverviewSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});
export type ReportsOverviewInput = z.infer<typeof reportsOverviewSchema>;

export const reportsTopProductsSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ReportsTopProductsInput = z.infer<typeof reportsTopProductsSchema>;

// ─── Settings Schema ─────────────────────────────────────────────

export const settingsUpdateSchema = z.object({
	currency: z.string().length(3).optional(),
	orderPrefix: z.string().max(10).optional(),
	lowStockThreshold: z.number().int().min(0).optional(),
	enableGuestCheckout: z.boolean().optional(),
	enableDigitalDownloads: z.boolean().optional(),
	orderNotifyEmails: z.string().optional(),
	taxCalculation: z.enum(["none", "fixed", "provider"]).optional(),
	fixedTaxRate: z.number().min(0).max(100).optional(),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
