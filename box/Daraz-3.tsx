'use client';

/**
 * plugin/daraz/box/Daraz-3.tsx
 *
 * Daraz-style minimal card — compact image + title + price stack,
 * orange CTA on hover. Suitable for dense 5-6 column grids.
 */

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface DarazBoxProps {
    data: {
        _id: string;
        title: string;
        slug: string;
        status: string;
        category?: string | null;
        createdAt?: string;
        info: Record<string, string>;
    };
    productUrl: string;
    currencySymbol?: string;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function fmtPrice(n: number): string {
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function addToCart(item: Record<string, unknown>) {
    try {
        const raw  = localStorage.getItem('shopping_cart');
        const cart: any[] = raw ? JSON.parse(raw) : [];
        const idx  = cart.findIndex(
            (c: any) => c.productId === item.productId && c.variantId === item.variantId
        );
        const maxQty = (item.maxQuantity as number) ?? 9999;
        if (idx >= 0) {
            cart[idx].quantity = Math.min((cart[idx].quantity ?? 0) + 1, maxQty);
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        localStorage.setItem('shopping_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    } catch { /* localStorage unavailable */ }
}

export default function DarazBox3({ data, productUrl, currencySymbol = '$' }: DarazBoxProps) {
    const variate      = parseJson<Record<string, any>>(data.info?._variate, {});
    const priceType    = (variate.priceType ?? 'single') as string;
    const variants     = (variate.variants ?? []) as any[];
    const sellingPrice = parseFloat(variate.sellingprice ?? '0') || 0;
    const regularPrice = parseFloat(variate.regularprice ?? '0') || 0;
    const stock        = parseInt(variate.stock ?? '0', 10) || 0;

    const basePrice = priceType === 'single'
        ? (sellingPrice > 0 ? sellingPrice : regularPrice)
        : 0;
    const inStock = priceType === 'single'
        ? stock > 0
        : variants.some((v: any) => parseInt(v.quantity || '0') > 0);

    const hasDiscount = priceType === 'single' && sellingPrice > 0 && regularPrice > sellingPrice;
    const discountPercent = hasDiscount
        ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100)
        : 0;

    let img = '';
    for (const v of variants) {
        if (v.image) { img = v.image; break; }
    }
    if (!img) {
        const imgs = parseJson<string[]>(data.info?.images, []);
        img = imgs[0] ?? '';
    }

    const firstVariant = variants[0];

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!inStock) return;
        addToCart({
            productId:       String(data._id),
            productSlug:     data.slug,
            productTitle:    data.title,
            productImage:    img,
            variantId:       firstVariant?.id,
            variantOptions:  firstVariant?.options,
            sku:             firstVariant?.sku,
            price:           basePrice || parseFloat(firstVariant?.price || '0') || 0,
            maxQuantity:     stock || parseInt(firstVariant?.quantity || '0', 10) || 9999,
            shippingInside:  parseFloat(data.info?.shipping_inside ?? '') || undefined,
            shippingOutside: parseFloat(data.info?.shipping_outside ?? '') || undefined,
        });
    };

    return (
        <div className="group relative bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden flex flex-col">
            {/* Ribbon badge */}
            {discountPercent > 0 && (
                <div className="absolute top-0 left-0 z-10 w-0 h-0"
                    style={{ borderTop: '36px solid #f97316', borderRight: '36px solid transparent' }}>
                    <span className="absolute -top-8 left-0.5 text-white text-[9px] font-black leading-none w-8 text-center">
                        -{discountPercent}%
                    </span>
                </div>
            )}

            {/* Image */}
            <Link href={productUrl} className="block bg-gray-50 overflow-hidden" style={{ aspectRatio: '1/1' }}>
                {img ? (
                    <Image
                        src={img}
                        alt={data.title}
                        width={300}
                        height={300}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Icon icon="mdi:image-off" width="36" />
                    </div>
                )}
            </Link>

            {/* Body */}
            <div className="p-2 flex flex-col gap-1">
                <Link
                    href={productUrl}
                    className="text-[11px] font-medium text-gray-800 hover:text-orange-500 line-clamp-2 leading-snug transition-colors"
                >
                    {data.title}
                </Link>

                <div className="flex items-baseline gap-1 flex-wrap">
                    {priceType === 'single' && basePrice > 0 ? (
                        <>
                            <span className="text-sm font-bold text-orange-600">
                                {currencySymbol}{fmtPrice(basePrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-[10px] text-gray-400 line-through">
                                    {currencySymbol}{fmtPrice(regularPrice)}
                                </span>
                            )}
                        </>
                    ) : priceType === 'variant' && variants.length > 0 ? (
                        <span className="text-[10px] text-gray-500 italic">{variants.length} variants</span>
                    ) : null}
                </div>

                {/* Cart button — slides in on hover */}
                <div className="overflow-hidden max-h-0 group-hover:max-h-10 transition-all duration-200">
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        className="w-full py-1 mt-0.5 bg-orange-500 text-white text-[10px] font-bold hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 rounded"
                    >
                        <Icon icon="mdi:cart-plus" width="11" />
                        {inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
