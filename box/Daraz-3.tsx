'use client';

/**
 * plugin/daraz/box/Daraz-3.tsx
 *
 * Minimal dense card — clean image, title, price.
 * "Add to Cart" button reveals on hover via smooth slide-up.
 * Ideal for 5–6 column grids.
 *
 * Variant support:
 *  - Price range (e.g. $100 – $500)
 *  - Color swatches on hover area
 *  - "Select" button opens VariantPopup with qty-aware cart add
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useFlashSale, applyFlashSale, type FlashSaleCampaignFull } from './flashSaleOptional';
import VariantPopup, { type VariantData } from './VariantPopup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DarazBoxProps {
    data: {
        _id:       string;
        title:     string;
        slug:      string;
        status:    string;
        category?: string | null;
        createdAt?: string;
        info:      Record<string, string>;
    };
    productUrl:        string;
    currencySymbol?:   string;
    /** Active flash-sale campaign — injected server-side when available */
    flashSaleCampaign?: FlashSaleCampaignFull | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function addToCartDirect(item: Record<string, unknown>) {
    try {
        const raw    = localStorage.getItem('shopping_cart');
        const cart: any[] = raw ? JSON.parse(raw) : [];
        const idx    = cart.findIndex(
            (c: any) => c.productId === item.productId && c.variantId === item.variantId
        );
        const maxQty = (item.maxQuantity as number) ?? 9999;
        const addQty = Math.max(1, (item.quantity as number) || 1);
        if (idx >= 0) {
            cart[idx].quantity = Math.min((cart[idx].quantity ?? 0) + addQty, maxQty);
        } else {
            cart.push({ ...item, quantity: Math.min(addQty, maxQty) });
        }
        localStorage.setItem('shopping_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    } catch { /* localStorage unavailable */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DarazBox3({ data, productUrl, currencySymbol = '$', flashSaleCampaign }: DarazBoxProps) {
    const { resolvePrice } = useFlashSale();
    const slug = data?.slug || String(data?._id || '');
    const finalProductUrl = productUrl || `/product/${slug}`;

    const variate   = parseJson<Record<string, any>>(data.info?._variate, {});
    const priceType = (variate.priceType ?? 'single') as 'single' | 'variant';
    const variants  = (variate.variants ?? []) as VariantData[];

    // ── Single ────────────────────────────────────────────────────────────────
    const sellingPrice = parseFloat(variate.sellingprice ?? '0') || 0;
    const regularPrice = parseFloat(variate.regularprice ?? '0') || 0;
    const singleStock  = parseInt(variate.stock ?? '0', 10) || 0;
    const basePrice    = sellingPrice > 0 ? sellingPrice : regularPrice;

    const flashResult   = flashSaleCampaign
        ? applyFlashSale(basePrice, flashSaleCampaign)
        : resolvePrice(basePrice, String(data._id), data.category ?? null);

    const hasFlash      = flashResult.applied;
    const productDisc   = !hasFlash && sellingPrice > 0 && regularPrice > sellingPrice;
    const singleBase    = hasFlash ? flashResult.sellingPrice : basePrice;
    const strikePrice   = hasFlash ? flashResult.regularPrice : (productDisc ? regularPrice : basePrice);
    const hasDiscount   = hasFlash || productDisc;
    const discPct       = hasFlash
        ? flashResult.discountPercent
        : (productDisc ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100) : 0);

    // ── Variant ───────────────────────────────────────────────────────────────
    const variantPrices = variants.map((v) => parseFloat(v.price ?? '0') || 0).filter((p) => p > 0);
    const minPrice      = variantPrices.length ? Math.min(...variantPrices) : 0;
    const maxVarPrice   = variantPrices.length ? Math.max(...variantPrices) : 0;
    const variantStock  = variants.reduce((s, v) => s + (parseInt(v.quantity ?? '0', 10) || 0), 0);

    const selectedAttributes: { label: string; values: string[]; displayStyle?: string }[] =
        variate.selectedAttributes ?? [];

    const colorAttr =
        selectedAttributes.find((a) => (a.displayStyle ?? '').includes('color')) ??
        selectedAttributes.find((a) => variants.some((v) => v.options[a.label] && v.color));

    type Swatch = { value: string; hex: string; image: string };
    const swatches: Swatch[] = [];
    if (colorAttr) {
        const seen = new Set<string>();
        for (const val of colorAttr.values) {
            if (seen.has(val)) continue;
            seen.add(val);
            const m = variants.find((v) => v.options[colorAttr.label] === val);
            swatches.push({ value: val, hex: m?.color ?? '', image: m?.image ?? '' });
        }
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const [activeSwatch, setActiveSwatch] = useState<string | null>(swatches[0]?.value ?? null);
    const [showPopup, setShowPopup]       = useState(false);

    // Resolve image
    let img = '';
    if (priceType === 'variant' && activeSwatch && colorAttr) {
        img = variants.find((v) => v.options[colorAttr.label] === activeSwatch)?.image ?? '';
    }
    if (!img) { for (const v of variants) { if (v.image) { img = v.image; break; } } }
    if (!img) { img = parseJson<string[]>(data.info?.images, [])[0] ?? ''; }

    const inStock = priceType === 'single' ? singleStock > 0 : variantStock > 0;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSingleCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!inStock) return;
        addToCartDirect({
            productId:       String(data._id),
            productSlug:     data.slug,
            productTitle:    data.title,
            productImage:    img,
            price:           singleBase,
            maxQuantity:     singleStock,
            shippingInside:  parseFloat(data.info?.shipping_inside ?? '') || undefined,
            shippingOutside: parseFloat(data.info?.shipping_outside ?? '') || undefined,
        });
    };

    const handleVariantCart = (variant: VariantData, qty: number) => {
        addToCartDirect({
            productId:       String(data._id),
            productSlug:     data.slug,
            productTitle:    data.title,
            productImage:    variant.image || img,
            variantId:       variant.id,
            variantOptions:  variant.options,
            sku:             variant.sku,
            price:           parseFloat(variant.price ?? '0') || 0,
            maxQuantity:     parseInt(variant.quantity ?? '0', 10) || 9999,
            quantity:        qty,
            shippingInside:  parseFloat(data.info?.shipping_inside ?? '') || undefined,
            shippingOutside: parseFloat(data.info?.shipping_outside ?? '') || undefined,
        });
    };

    const MAX_SW = 5;
    const visibleSw = swatches.slice(0, MAX_SW);
    const extraSw   = swatches.length - MAX_SW;

    return (
        <>
            <div className="group relative bg-white rounded-xl border border-gray-100 hover:border-orange-300 hover:shadow-lg transition-all overflow-hidden flex flex-col">

                {/* ── Discount ribbon ── */}
                {discPct > 0 && (
                    <span className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow leading-none">
                        -{discPct}%
                    </span>
                )}

                {/* ── Sold-out badge ── */}
                {!inStock && (
                    <span className="absolute top-2 right-2 z-10 bg-gray-600/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                        Sold Out
                    </span>
                )}

                {/* ── Image ── */}
                <Link
                    href={finalProductUrl}
                    className="block bg-gray-50 overflow-hidden"
                    style={{ aspectRatio: '1/1' }}
                    tabIndex={-1}
                >
                    {img ? (
                        <Image
                            src={img}
                            alt={data.title}
                            width={280}
                            height={280}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Icon icon="mdi:image-off" width={32} />
                        </div>
                    )}
                </Link>

                {/* ── Body ── */}
                <div className="p-2.5 flex flex-col gap-1.5">

                    {/* Title */}
                    <Link
                        href={finalProductUrl}
                        className="text-[11px] font-semibold text-gray-800 hover:text-orange-500 line-clamp-2 leading-snug transition-colors"
                    >
                        {data.title}
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 flex-wrap">
                        {priceType === 'single' ? (
                            singleBase > 0 && (
                                <>
                                    <span className="text-sm font-bold text-orange-600">
                                        {currencySymbol}{fmtPrice(singleBase)}
                                    </span>
                                    {hasDiscount && (
                                        <span className="text-[10px] text-gray-400 line-through">
                                            {currencySymbol}{fmtPrice(strikePrice)}
                                        </span>
                                    )}
                                </>
                            )
                        ) : (
                            minPrice > 0 ? (
                                <span className="text-sm font-bold text-orange-600">
                                    {minPrice === maxVarPrice
                                        ? `${currencySymbol}${fmtPrice(minPrice)}`
                                        : `${currencySymbol}${fmtPrice(minPrice)} – ${currencySymbol}${fmtPrice(maxVarPrice)}`
                                    }
                                </span>
                            ) : (
                                <span className="text-[10px] text-gray-400 italic">See options</span>
                            )
                        )}
                    </div>

                    {/* Color swatches (variant) */}
                    {priceType === 'variant' && visibleSw.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                            {visibleSw.map((sw) => (
                                sw.hex ? (
                                    <button
                                        key={sw.value}
                                        type="button"
                                        title={sw.value}
                                        onClick={(e) => { e.preventDefault(); setActiveSwatch(sw.value); }}
                                        className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                                            activeSwatch === sw.value
                                                ? 'border-orange-500 scale-110 ring-1 ring-orange-200'
                                                : 'border-white shadow-sm hover:border-orange-300 hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: sw.hex }}
                                    />
                                ) : (
                                    <button
                                        key={sw.value}
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setActiveSwatch(sw.value); }}
                                        className={`px-1 py-0.5 rounded text-[9px] border transition-all ${
                                            activeSwatch === sw.value
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300'
                                        }`}
                                    >
                                        {sw.value}
                                    </button>
                                )
                            ))}
                            {extraSw > 0 && (
                                <span className="text-[9px] text-gray-400">+{extraSw}</span>
                            )}
                        </div>
                    )}

                    {/* Cart button — slides up on hover */}
                    <div className="overflow-hidden h-0 group-hover:h-7 transition-all duration-200 ease-out">
                        <button
                            type="button"
                            onClick={priceType === 'variant'
                                ? (e) => { e.preventDefault(); if (inStock) setShowPopup(true); }
                                : handleSingleCart
                            }
                            disabled={!inStock}
                            className="w-full h-7 rounded-lg bg-orange-500 text-white text-[10px] font-bold hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                            <Icon icon="mdi:cart-plus" width={11} />
                            {inStock
                                ? (priceType === 'variant' ? 'Select Options' : 'Add to Cart')
                                : 'Out of Stock'
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Popup */}
            {showPopup && priceType === 'variant' && (
                <VariantPopup
                    productId={String(data._id)}
                    productSlug={data.slug}
                    productTitle={data.title}
                    productImage={img}
                    variants={variants}
                    selectedAttributes={selectedAttributes}
                    currencySymbol={currencySymbol}
                    onClose={() => setShowPopup(false)}
                    onAddToCart={handleVariantCart}
                />
            )}
        </>
    );
}
