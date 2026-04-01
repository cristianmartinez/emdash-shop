// ─── Product ─────────────────────────────────────────────────────

export const PRODUCT_TYPES = ["simple", "variable", "digital", "bundle"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const VARIANT_STATUSES = ["active", "disabled"] as const;
export type VariantStatus = (typeof VARIANT_STATUSES)[number];

// ─── Category ────────────────────────────────────────────────────

export const CATEGORY_STATUSES = ["active", "hidden"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

// ─── Order ───────────────────────────────────────────────────────

export const ORDER_STATUSES = [
	"pending",
	"confirmed",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
	"refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
	"pending",
	"authorized",
	"paid",
	"partially_refunded",
	"refunded",
	"failed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = ["unfulfilled", "partially_fulfilled", "fulfilled"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

// ─── Discount ────────────────────────────────────────────────────

export const DISCOUNT_TYPES = ["percentage", "fixed_amount", "free_shipping"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_SCOPES = ["order", "products", "categories"] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];

export const DISCOUNT_STATUSES = ["active", "disabled", "expired"] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUSES)[number];

// ─── Price Rule ──────────────────────────────────────────────────

export const PRICE_RULE_TYPES = ["percentage", "fixed_amount", "tiered", "bogo"] as const;
export type PriceRuleType = (typeof PRICE_RULE_TYPES)[number];

export const PRICE_RULE_SCOPES = ["order", "products", "categories"] as const;
export type PriceRuleScope = (typeof PRICE_RULE_SCOPES)[number];

export const PRICE_RULE_STATUSES = ["active", "disabled"] as const;
export type PriceRuleStatus = (typeof PRICE_RULE_STATUSES)[number];

export const TIER_TYPES = ["percentage", "fixed_price", "fixed_discount"] as const;
export type TierType = (typeof TIER_TYPES)[number];

// ─── Price List ──────────────────────────────────────────────────

export const PRICE_LIST_STATUSES = ["active", "inactive"] as const;
export type PriceListStatus = (typeof PRICE_LIST_STATUSES)[number];

// ─── Payment ─────────────────────────────────────────────────────

export const PAYMENT_FLOW_TYPES = ["redirect", "inline", "modal"] as const;
export type PaymentFlowType = (typeof PAYMENT_FLOW_TYPES)[number];

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_ORDER_PREFIX = "EM-";
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const DEFAULT_CART_EXPIRY_HOURS = 72;

// ─── Currencies (common subset) ─────────────────────────────────

export const CURRENCIES = [
	{ value: "USD", label: "US Dollar (USD)" },
	{ value: "EUR", label: "Euro (EUR)" },
	{ value: "GBP", label: "British Pound (GBP)" },
	{ value: "CAD", label: "Canadian Dollar (CAD)" },
	{ value: "AUD", label: "Australian Dollar (AUD)" },
	{ value: "JPY", label: "Japanese Yen (JPY)" },
	{ value: "CHF", label: "Swiss Franc (CHF)" },
	{ value: "CNY", label: "Chinese Yuan (CNY)" },
	{ value: "SEK", label: "Swedish Krona (SEK)" },
	{ value: "NZD", label: "New Zealand Dollar (NZD)" },
	{ value: "MXN", label: "Mexican Peso (MXN)" },
	{ value: "BRL", label: "Brazilian Real (BRL)" },
	{ value: "KRW", label: "South Korean Won (KRW)" },
	{ value: "INR", label: "Indian Rupee (INR)" },
	{ value: "COP", label: "Colombian Peso (COP)" },
] as const;
