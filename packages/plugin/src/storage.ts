/**
 * Storage type definition for the commerce plugin.
 *
 * Products and categories are emdash content collections (defined in seed.json).
 * Plugin storage is used only for transactional/commerce-specific data.
 */

import type { PluginStorageConfig } from "emdash";

export type CommerceStorage = PluginStorageConfig & {
	priceLists: {
		indexes: ["status", "currency"];
		uniqueIndexes: ["slug"];
	};
	priceEntries: {
		indexes: ["priceListId", "productId", ["priceListId", "productId"]];
	};
	priceRules: {
		indexes: ["status", "priority", "type", ["status", "priority"]];
	};
	discounts: {
		indexes: ["status", "createdAt", ["status", "createdAt"]];
		uniqueIndexes: ["code"];
	};
	customers: {
		indexes: ["createdAt", "orderCount", "totalSpent"];
		uniqueIndexes: ["email"];
	};
	addresses: {
		indexes: ["customerId", ["customerId", "type"]];
	};
	carts: {
		indexes: ["customerId", "expiresAt"];
		uniqueIndexes: ["sessionId"];
	};
	wishlists: {
		indexes: ["customerId"];
		uniqueIndexes: ["sessionId"];
	};
	orders: {
		indexes: [
			"customerId",
			"status",
			"paymentStatus",
			"createdAt",
			["customerId", "createdAt"],
			["status", "createdAt"],
		];
		uniqueIndexes: ["orderNumber"];
	};
	orderLines: {
		indexes: ["orderId", "productId", ["orderId", "productId"]];
	};
};

export const COMMERCE_STORAGE_CONFIG = {
	priceLists: {
		indexes: ["status", "currency"] as const,
		uniqueIndexes: ["slug"] as const,
	},
	priceEntries: {
		indexes: ["priceListId", "productId", ["priceListId", "productId"]] as const,
	},
	priceRules: {
		indexes: ["status", "priority", "type", ["status", "priority"]] as const,
	},
	discounts: {
		indexes: ["status", "createdAt", ["status", "createdAt"]] as const,
		uniqueIndexes: ["code"] as const,
	},
	customers: {
		indexes: ["createdAt", "orderCount", "totalSpent"] as const,
		uniqueIndexes: ["email"] as const,
	},
	addresses: {
		indexes: ["customerId", ["customerId", "type"]] as const,
	},
	carts: {
		indexes: ["customerId", "expiresAt"] as const,
		uniqueIndexes: ["sessionId"] as const,
	},
	wishlists: {
		indexes: ["customerId"] as const,
		uniqueIndexes: ["sessionId"] as const,
	},
	orders: {
		indexes: [
			"customerId",
			"status",
			"paymentStatus",
			"createdAt",
			["customerId", "createdAt"],
			["status", "createdAt"],
		] as const,
		uniqueIndexes: ["orderNumber"] as const,
	},
	orderLines: {
		indexes: ["orderId", "productId", ["orderId", "productId"]] as const,
	},
} satisfies PluginStorageConfig;
