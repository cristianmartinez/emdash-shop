/**
 * Client-side JavaScript for commerce storefront components.
 *
 * Handles cart interactions, checkout flow, variant selection, and wishlist toggles.
 */

export { initCart, addToCart, getCart, updateCartItem, removeFromCart, applyDiscount, removeDiscount } from "./cart.js";
export { initCheckout, initCheckoutSession, getShippingMethods, selectShippingMethod, getPaymentMethods, placeOrder, confirmPayment } from "./checkout.js";
export { initWishlist, addToWishlist, removeFromWishlist, getWishlist } from "./wishlist.js";
