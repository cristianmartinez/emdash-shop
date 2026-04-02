/**
 * Core types for the commerce plugin.
 *
 * Products and categories are emdash content collections (types auto-generated).
 * These types cover plugin storage entities and the product data shape for handlers.
 */

import type {
	DiscountScope,
	DiscountStatus,
	DiscountType,
	FulfillmentStatus,
	OrderStatus,
	PaymentFlowType,
	PaymentStatus,
	PriceListStatus,
	PriceRuleScope,
	PriceRuleStatus,
	PriceRuleType,
	TierType,
} from "./constants.js";

// ─── Product Data (mirrors the emdash collection fields) ─────────

/** Shape of product data from the emdash `products` collection. */
export interface ProductData {
	id: string;
	slug: string | null;
	title: string;
	description?: string;
	content?: unknown[];
	product_type?: string;
	featured_image?: { id: string; src?: string; alt?: string; width?: number; height?: number };
	gallery?: unknown[];
	price: number;
	compare_at_price?: number;
	currency?: string;
	sku?: string;
	track_inventory?: boolean;
	stock_quantity?: number;
	weight_grams?: number;
	dimensions?: { length: number; width: number; height: number };
	tax_category?: string;
	variants?: ProductVariantData[];
	bundle_items?: BundleItemData[];
	digital_asset?: { filename: string; maxDownloads?: number };
	attributes?: Record<string, string>;
}

export interface ProductVariantData {
	name: string;
	sku: string;
	options: Record<string, string>;
	price: number;
	stock?: number;
	imageId?: string;
}

export interface BundleItemData {
	productId: string;
	quantity: number;
}

// ─── Price List ──────────────────────────────────────────────────

export interface PriceList {
	name: string;
	slug: string;
	currency: string;
	conditions?: PriceListConditions;
	status: PriceListStatus;
	createdAt: string;
	updatedAt: string;
}

export interface PriceListConditions {
	customerTags?: string[];
	minQuantity?: number;
	validFrom?: string;
	validUntil?: string;
}

export interface PriceEntry {
	priceListId: string;
	productId: string;
	variantId?: string;
	price: number;
	compareAtPrice?: number;
	createdAt: string;
	updatedAt: string;
}

// ─── Price Rule ──────────────────────────────────────────────────

export interface PriceRule {
	name: string;
	type: PriceRuleType;
	value?: number;
	scope: PriceRuleScope;
	scopeIds?: string[];
	conditions?: PriceRuleConditions;
	tiers?: PriceRuleTier[];
	stackable: boolean;
	priority: number;
	status: PriceRuleStatus;
	startsAt?: string;
	expiresAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PriceRuleConditions {
	minQuantity?: number;
	minAmount?: number;
	customerTags?: string[];
}

export interface PriceRuleTier {
	minQuantity: number;
	maxQuantity?: number;
	type: TierType;
	value: number;
}

// ─── Discount (Coupon Code) ──────────────────────────────────────

export interface Discount {
	code: string;
	description?: string;
	type: DiscountType;
	value: number;
	scope: DiscountScope;
	scopeIds?: string[];
	minOrderAmount?: number;
	maxUses: number;
	usedCount: number;
	maxUsesPerCustomer: number;
	startsAt?: string;
	expiresAt?: string;
	status: DiscountStatus;
	createdAt: string;
	updatedAt: string;
}

// ─── Customer ────────────────────────────────────────────────────

export interface Customer {
	email: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	tags: string[];
	userId?: string;
	totalSpent: number;
	orderCount: number;
	acceptsMarketing: boolean;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CustomerAddress {
	customerId: string;
	type: "billing" | "shipping" | "both";
	isDefault: boolean;
	firstName: string;
	lastName: string;
	company?: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
	phone?: string;
	createdAt: string;
	updatedAt: string;
}

// ─── Cart ────────────────────────────────────────────────────────

export interface Cart {
	sessionId: string;
	customerId?: string;
	email?: string;
	items: CartItem[];
	discountCodes: string[];
	currency: string;
	subtotal: number;
	discountTotal: number;
	taxTotal: number;
	shippingTotal: number;
	total: number;
	shippingAddress?: OrderAddress;
	billingAddress?: OrderAddress;
	shippingMethodId?: string;
	paymentMethodId?: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface CartItem {
	productId: string;
	variantSku?: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

// ─── Wishlist ────────────────────────────────────────────────────

export interface Wishlist {
	sessionId: string;
	customerId?: string;
	items: WishlistItem[];
	createdAt: string;
	updatedAt: string;
}

export interface WishlistItem {
	productId: string;
	variantSku?: string;
	addedAt: string;
}

// ─── Order ───────────────────────────────────────────────────────

export interface Order {
	orderNumber: string;
	customerId: string;
	email: string;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	currency: string;
	subtotal: number;
	discountTotal: number;
	taxTotal: number;
	shippingTotal: number;
	total: number;
	discounts: AppliedDiscount[];
	taxLines: TaxLine[];
	shippingAddress: OrderAddress;
	billingAddress: OrderAddress;
	shippingMethod?: { id: string; name: string; price: number };
	paymentMethod: { id: string; name: string };
	paymentReference?: string;
	customerNote?: string;
	internalNotes?: string;
	ipAddress?: string;
	tracking?: OrderTracking;
	cancelledAt?: string;
	cancelReason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface OrderLine {
	orderId: string;
	productId: string;
	variantSku?: string;
	productName: string;
	variantName?: string;
	sku?: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
	taxAmount: number;
	discountAmount: number;
	fulfilledQuantity: number;
	createdAt: string;
}

export interface OrderAddress {
	firstName: string;
	lastName: string;
	company?: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
	phone?: string;
}

export interface AppliedDiscount {
	code?: string;
	description: string;
	amount: number;
	type: "percentage" | "fixed";
}

export interface TaxLine {
	name: string;
	rate: number;
	amount: number;
}

export interface OrderTracking {
	carrier: string;
	trackingNumber: string;
	trackingUrl?: string;
}

// ─── Payment Provider ────────────────────────────────────────────

export interface PaymentProviderConfig {
	id: string;
	name: string;
	pluginId: string;
	supportsRefunds: boolean;
	flowType: PaymentFlowType;
	icon?: string;
}

export interface PaymentInitiateResult {
	redirectUrl?: string;
	clientSecret?: string;
	providerReference: string;
	metadata?: Record<string, unknown>;
}

export interface PaymentConfirmResult {
	success: boolean;
	providerReference: string;
	failureReason?: string;
}

export interface PaymentRefundResult {
	success: boolean;
	refundReference: string;
	failureReason?: string;
}
