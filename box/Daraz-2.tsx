'use client';

/**
 * plugin/daraz/box/Daraz-2.tsx
 *
 * Horizontal list-style card — square image on the left, info stacked right.
 * Good for compact list views or sidebar product feeds.
 *
 * Variant support:
 *  - Price range shown (e.g. $100 – $500)
 *  - Color swatches (up to 4) below the title
 *  - "Select Options" opens VariantPopup with qty-aware cart add
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

export default function DarazBox2({ data, productUrl, currencySymbol = '$', flashSaleCampaign }: DarazBoxProps) {
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

    // ── Single cart ───────────────────────────────────────────────────────────
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

    // ── Variant cart (from popup) ─────────────────────────────────────────────
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

    const MAX_SW = 4;
    const visibleSw = swatches.slice(0, MAX_SW);
    const extraSw   = swatches.length - MAX_SW;

    return (
        <>
            <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all overflow-hidden flex flex-row">

                {/* ── Image block ── */}
                <Link
                    href={finalProductUrl}
                    className="relative shrink-0 bg-gray-50 overflow-hidden rounded-l-2xl"
                    style={{ width: 100, minHeight: 100 }}
                    tabIndex={-1}
                >
                    {discPct > 0 && (
                        <span className="absolute top-1.5 left-1.5 z-10 bg-main text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow">
                            -{discPct}%
                        </span>
                    )}
                    {!inStock && (
                        <span className="absolute bottom-1.5 left-1.5 z-10 bg-gray-700/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                            Sold Out
                        </span>
                    )}
                    {img ? (
                        <Image
                            src={img}
                            alt={data.title}
                            fill
                            sizes="100px"
                            className="object-contain group-hover:scale-105 transition-transform duration-300 p-1"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Icon icon="mdi:image-off" width={28} />
                        </div>
                    )}
                </Link>

                {/* ── Info ── */}
                <div className="flex flex-col flex-1 p-3 gap-1 min-w-0">

                    {/* Title */}
                    <Link
                        href={finalProductUrl}
                        className="text-xs font-semibold text-gray-800 hover:text-main transition-colors line-clamp-2 leading-snug"
                    >
                        {data.title}
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
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

                    {/* Color swatches */}
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
                                                ? 'border-main scale-110 ring-1 ring-orange-300'
                                                : 'border-white shadow-sm hover:border-orange-300'
                                        }`}
                                        style={{ backgroundColor: sw.hex }}
                                    />
                                ) : (
                                    <button
                                        key={sw.value}
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setActiveSwatch(sw.value); }}
                                        className={`px-1 py-0.5 rounded text-[9px] font-medium border transition-all ${
                                            activeSwatch === sw.value
                                                ? 'bg-main text-white border-main'
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

                    {/* Cart button */}
                    <button
                        type="button"
                        onClick={priceType === 'variant'
                            ? (e) => { e.preventDefault(); if (inStock) setShowPopup(true); }
                            : handleSingleCart
                        }
                        disabled={!inStock}
                        className="mt-auto w-full py-1.5 rounded-xl bg-main/20 border border-main/50 text-main text-sm font-bold hover:bg-main hover:text-white hover:border-main disabled:bg-gray-50 disabled:border-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
                    >
                        <Icon icon="mdi:cart-plus" width={11} />
                        {inStock
                            ? (priceType === 'variant' ? 'Select' : 'Add to Cart')
                            : 'Sold Out'
                        }
                    </button>
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
