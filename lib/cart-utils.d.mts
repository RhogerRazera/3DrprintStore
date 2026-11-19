import type { Product } from "./products";

export type CartItem = Pick<Product, "id" | "title" | "slug" | "category" | "price" | "image"> & { productId: string; quantity: number; variantId?: string; variantName?: string; variantHex?: string; kind?: "product" | "kit"; stock?: number };
export const MAX_CART_QUANTITY: number;
export const MAX_CART_LINES: number;
export function normalizeCartItems(value: unknown): CartItem[];
export function addCartItem(items: unknown, product: Product): CartItem[];
export function updateCartItem(items: unknown, id: string, delta: number): CartItem[];
export function cartTotal(items: unknown): number;
export function isCartPriceCurrent(item: unknown, livePrice: number | undefined): boolean;
export function createWhatsAppMessage(items: unknown, orderId?: string): string;

