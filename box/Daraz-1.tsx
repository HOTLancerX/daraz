'use client';

/**
 * plugin/daraz/box/Daraz-1.tsx
 *
 * Daraz-style product card with full variant support.
 *
 * Single mode:
 *  - Shows selling price (or regular if no selling price) + strikethrough
 *  - Discount badge top-left
 *  - "Add to Cart" button adds the single product directly
 *
 * Variant mode:
 *  - Shows price range: lowest–highest variant price (e.g. $100 – $500)
 *  - Color attribute swatches rendered below the title (max 5 + overflow count)
 *    Clicking a swatch swaps the preview image and highlights the swatch
 *  - "Add to Cart" opens VariantPopup for full option selection
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
        _id:      string;
        title:    string;
        slug:     string;
        status:   string;
        category?: string | null;
        info:     Record<string, string>;
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
        const raw  = localStorage.getItem('shopping_cart');
        const cart: any[] = raw ? JSON.parse(raw) : [];
        const idx  = cart.findIndex(
            (c: any) => c.productId === item.productId && c.variantId === item.variantId
        );
        const maxQty   = (item.maxQuantity as number) ?? 9999;
        // Use the quantity passed in the item (from popup), default to 1
        const addQty   = Math.max(1, (item.quantity as number) || 1);
        if (idx >= 0) {
            // Already in cart — add the requested quantity on top
            cart[idx].quantity = Math.min((cart[idx].quantity ?? 0) + addQty, maxQty);
        } else {
            // New cart entry — store the exact quantity requested
            cart.push({ ...item, quantity: Math.min(addQty, maxQty) });
        }
        localStorage.setItem('shopping_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    } catch { /* localStorage unavailable */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DarazBox1({ data, productUrl, currencySymbol = '$', flashSaleCampaign }: DarazBoxProps) {
    const { resolvePrice } = useFlashSale();

    const variate   = parseJson<Record<string, any>>(data.info?._variate, {});
    const priceType = (variate.priceType ?? 'single') as 'single' | 'variant';
    const variants  = (variate.variants ?? []) as VariantData[];

    // ── Single mode fields ────────────────────────────────────────────────────
    const sellingPrice = parseFloat(variate.sellingprice ?? '0') || 0;
    const regularPrice = parseFloat(variate.regularprice ?? '0') || 0;
    const singleStock  = parseInt(variate.stock ?? '0', 10) || 0;
    const basePrice    = sellingPrice > 0 ? sellingPrice : regularPrice;

    // Flash-sale: use server-injected prop first, fall back to client hook
    const flashResult = flashSaleCampaign
        ? applyFlashSale(basePrice, flashSaleCampaign)
        : resolvePrice(basePrice, String(data._id), data.category ?? null);

    const hasFlash        = flashResult.applied;
    const productHasDisc  = !hasFlash && sellingPrice > 0 && regularPrice > sellingPrice;
    const displaySelling  = hasFlash ? flashResult.sellingPrice : basePrice;
    const displayRegular  = hasFlash ? flashResult.regularPrice : (productHasDisc ? regularPrice : basePrice);
    const discountPercent = hasFlash
        ? flashResult.discountPercent
        : (productHasDisc ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100) : 0);
    const showStrike      = hasFlash || productHasDisc;

    const singleBasePrice = displaySelling;
    const hasDiscount     = showStrike;

    // ── Variant mode fields ───────────────────────────────────────────────────

    // Price range: min and max across all variants with a price set
    const variantPrices = variants
        .map((v) => parseFloat(v.price ?? '0') || 0)
        .filter((p) => p > 0);
    const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
    const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;

    const totalStock = variants.reduce(
        (sum, v) => sum + (parseInt(v.quantity ?? '0', 10) || 0),
        0
    );
    const variantInStock = totalStock > 0;

    // Selected attributes (for display style / popup)
    const selectedAttributes: { label: string; values: string[]; displayStyle?: string }[] =
        variate.selectedAttributes ?? [];

    // Build color axis: first attribute with displayStyle containing 'color',
    // or fall back to first attribute that has a variant with a color hex
    const colorAttr = selectedAttributes.find((a) =>
        (a.displayStyle ?? '').includes('color')
    ) ?? selectedAttributes.find((a) =>
        variants.some((v) => v.options[a.label] && v.color)
    );

    // Unique swatch entries for the color axis: { value, hex, image }
    type Swatch = { value: string; hex: string; image: string };
    const swatches: Swatch[] = [];
    if (colorAttr) {
        const seen = new Set<string>();
        for (const val of colorAttr.values) {
            if (seen.has(val)) continue;
            seen.add(val);
            const match = variants.find((v) => v.options[colorAttr.label] === val);
            swatches.push({
                value: val,
                hex:   match?.color  ?? '',
                image: match?.image  ?? '',
            });
        }
    }

    // ── Local state ───────────────────────────────────────────────────────────
    const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null);
    const [selectedSwatch, setSelectedSwatch] = useState<string | null>(
        swatches[0]?.value ?? null
    );
    const [showPopup, setShowPopup] = useState(false);

    // Resolve displayed image
    const activeSwatch = hoveredSwatch ?? selectedSwatch;
    let displayImg = '';
    if (priceType === 'variant' && activeSwatch && colorAttr) {
        const v = variants.find((vt) => vt.options[colorAttr.label] === activeSwatch);
        displayImg = v?.image ?? '';
    }
    if (!displayImg) {
        // Fallback: first variant image → product images array
        for (const v of variants) { if (v.image) { displayImg = v.image; break; } }
    }
    if (!displayImg) {
        const imgs = parseJson<string[]>(data.info?.images, []);
        displayImg = imgs[0] ?? '';
    }

    const inStock = priceType === 'single' ? singleStock > 0 : variantInStock;

    // ── Cart handler for single mode ─────────────────────────────────────────
    const handleSingleCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!inStock) return;
        addToCartDirect({
            productId:       String(data._id),
            productSlug:     data.slug,
            productTitle:    data.title,
            productImage:    displayImg,
            price:           singleBasePrice,
            maxQuantity:     singleStock,
            shippingInside:  parseFloat(data.info?.shipping_inside ?? '') || undefined,
            shippingOutside: parseFloat(data.info?.shipping_outside ?? '') || undefined,
        });
    };

    // ── Cart handler from popup ───────────────────────────────────────────────
    const handleVariantCart = (variant: VariantData, qty: number) => {
        const price = parseFloat(variant.price ?? '0') || 0;
        addToCartDirect({
            productId:       String(data._id),
            productSlug:     data.slug,
            productTitle:    data.title,
            productImage:    variant.image || displayImg,
            variantId:       variant.id,
            variantOptions:  variant.options,
            sku:             variant.sku,
            price,
            maxQuantity:     parseInt(variant.quantity ?? '0', 10) || 9999,
            quantity:        qty,
            shippingInside:  parseFloat(data.info?.shipping_inside ?? '') || undefined,
            shippingOutside: parseFloat(data.info?.shipping_outside ?? '') || undefined,
        });
    };

    const MAX_SWATCHES = 5;
    const visibleSwatches = swatches.slice(0, MAX_SWATCHES);
    const extraSwatches   = swatches.length - MAX_SWATCHES;

    return (
        <>
            <div className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col">

                {/* ── Badges ── */}
                {priceType === 'single' && discountPercent > 0 && (
                    <span className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        -{discountPercent}%
                    </span>
                )}
                {!inStock && (
                    <span className="absolute top-2 right-2 z-10 bg-gray-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        Sold Out
                    </span>
                )}

                {/* ── Image ── */}
                <Link
                    href={productUrl}
                    className="block bg-gray-50 overflow-hidden shrink-0"
                    style={{ aspectRatio: '1/1' }}
                    tabIndex={-1}
                >
                    {displayImg ? (
                        <Image
                            src={displayImg}
                            alt={data.title}
                            width={320}
                            height={320}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Icon icon="mdi:image-off" width="40" />
                        </div>
                    )}
                </Link>

                {/* ── Body ── */}
                <div className="flex flex-col flex-1 p-3 gap-1.5">

                    {/* Title */}
                    <Link
                        href={productUrl}
                        className="text-xs font-medium text-gray-800 hover:text-orange-500 transition-colors line-clamp-2 leading-snug"
                    >
                        {data.title}
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 flex-wrap mt-auto pt-1">
                        {priceType === 'single' ? (
                            singleBasePrice > 0 ? (
                                <>
                                    <span className="text-sm font-bold text-orange-600">
                                        {currencySymbol}{fmtPrice(singleBasePrice)}
                                    </span>
                                    {hasDiscount && (
                                        <span className="text-[11px] text-gray-400 line-through">
                                            {currencySymbol}{fmtPrice(displayRegular)}
                                        </span>
                                    )}
                                </>
                            ) : null
                        ) : (
                            /* Variant price range */
                            minPrice > 0 ? (
                                <span className="text-sm font-bold text-orange-600">
                                    {minPrice === maxPrice
                                        ? `${currencySymbol}${fmtPrice(minPrice)}`
                                        : `${currencySymbol}${fmtPrice(minPrice)} – ${currencySymbol}${fmtPrice(maxPrice)}`
                                    }
                                </span>
                            ) : (
                                <span className="text-xs text-gray-400 italic">See options</span>
                            )
                        )}
                    </div>

                    {/* Color swatches (variant mode only) */}
                    {priceType === 'variant' && visibleSwatches.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {visibleSwatches.map((swatch) => {
                                const isActive = activeSwatch === swatch.value;
                                return swatch.hex ? (
                                    /* Color circle */
                                    <button
                                        key={swatch.value}
                                        type="button"
                                        title={swatch.value}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedSwatch(swatch.value);
                                        }}
                                        onMouseEnter={() => setHoveredSwatch(swatch.value)}
                                        onMouseLeave={() => setHoveredSwatch(null)}
                                        className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
                                            isActive
                                                ? 'border-orange-500 scale-110 ring-1 ring-orange-300'
                                                : 'border-white shadow-sm hover:scale-110 hover:border-orange-300'
                                        }`}
                                        style={{ backgroundColor: swatch.hex }}
                                    />
                                ) : (
                                    /* Text chip fallback */
                                    <button
                                        key={swatch.value}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedSwatch(swatch.value);
                                        }}
                                        onMouseEnter={() => setHoveredSwatch(swatch.value)}
                                        onMouseLeave={() => setHoveredSwatch(null)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                                            isActive
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
                                        }`}
                                    >
                                        {swatch.value}
                                    </button>
                                );
                            })}
                            {extraSwatches > 0 && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    +{extraSwatches}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Add to Cart button */}
                    <button
                        type="button"
                        onClick={priceType === 'variant'
                            ? (e) => { e.preventDefault(); if (inStock) setShowPopup(true); }
                            : handleSingleCart
                        }
                        disabled={!inStock}
                        className="mt-1 w-full py-1.5 rounded-lg border border-orange-400 text-orange-500 text-xs font-semibold hover:bg-orange-500 hover:text-white disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                    >
                        <Icon icon="mdi:cart-plus" width="13" />
                        {inStock
                            ? (priceType === 'variant' ? 'Select Options' : 'Add to Cart')
                            : 'Out of Stock'
                        }
                    </button>
                </div>
            </div>

            {/* Variant selection popup */}
            {showPopup && priceType === 'variant' && (
                <VariantPopup
                    productId={String(data._id)}
                    productSlug={data.slug}
                    productTitle={data.title}
                    productImage={displayImg}
                    variants={variants}
                    selectedAttributes={selectedAttributes}
                    currencySymbol={currencySymbol}
                    onClose={() => setShowPopup(false)}
                    onAddToCart={handleVariantCart}
                    shippingInside={parseFloat(data.info?.shipping_inside ?? '') || undefined}
                    shippingOutside={parseFloat(data.info?.shipping_outside ?? '') || undefined}
                />
            )}
        </>
    );
}
