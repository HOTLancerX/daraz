'use client';

/**
 * plugin/daraz/box/Daraz-2.tsx
 *
 * Daraz-style horizontal card — image on left, info on right.
 * Good for list-style product rows.
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

export default function DarazBox2({ data, productUrl, currencySymbol = '$' }: DarazBoxProps) {
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
        <div className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-row gap-0">
            {/* Image */}
            <Link
                href={productUrl}
                className="relative shrink-0 bg-gray-50 overflow-hidden"
                style={{ width: 90, height: 90 }}
            >
                {discountPercent > 0 && (
                    <span className="absolute top-1 left-1 z-10 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">
                        -{discountPercent}%
                    </span>
                )}
                {img ? (
                    <Image
                        src={img}
                        alt={data.title}
                        fill
                        sizes="90px"
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Icon icon="mdi:image-off" width="28" height="28" />
                    </div>
                )}
            </Link>

            {/* Info */}
            <div className="flex flex-col flex-1 p-2.5 gap-1 min-w-0">
                <Link
                    href={productUrl}
                    className="text-xs font-medium text-gray-800 hover:text-orange-500 transition-colors line-clamp-2 leading-snug"
                >
                    {data.title}
                </Link>

                <div className="flex items-baseline gap-1.5 flex-wrap">
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
                        <span className="text-[10px] text-gray-500 italic">
                            {variants.length} option{variants.length !== 1 ? 's' : ''}
                        </span>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="mt-auto w-full py-1 rounded border border-orange-400 text-orange-500 text-[10px] font-semibold hover:bg-orange-500 hover:text-white disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                >
                    <Icon icon="mdi:cart-plus" width="11" height="11" />
                    {inStock ? 'Add to Cart' : 'Sold Out'}
                </button>
            </div>
        </div>
    );
}
