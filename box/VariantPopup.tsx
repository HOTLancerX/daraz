'use client';

/**
 * plugin/daraz/box/VariantPopup.tsx
 *
 * Full-screen modal for selecting a product variant.
 * Shows all attribute options grouped by label, with the same
 * display style as the product page (color swatches or text chips).
 * Selecting a complete combination adds it to cart and closes.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Icon } from '@iconify/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantData {
    id:       string;
    handle:   string;
    options:  Record<string, string>;
    color?:   string;
    image?:   string;
    price?:   string;
    quantity?: string;
    sku?:     string;
    shippingInside?:  string;
    shippingOutside?: string;
}

interface VariantPopupProps {
    productId:      string;
    productSlug:    string;
    productTitle:   string;
    productImage:   string;
    variants:       VariantData[];
    selectedAttributes: { label: string; values: string[]; displayStyle?: string }[];
    currencySymbol: string;
    onClose:        () => void;
    onAddToCart:    (variant: VariantData, qty: number) => void;
    shippingInside?:  number;
    shippingOutside?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number, sym: string): string {
    return `${sym}${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
}

function findVariant(variants: VariantData[], selection: Record<string, string>): VariantData | null {
    return variants.find((v) =>
        Object.entries(selection).every(([k, val]) => v.options[k] === val)
    ) ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantPopup({
    productTitle,
    productImage,
    variants,
    selectedAttributes,
    currencySymbol,
    onClose,
    onAddToCart,
}: VariantPopupProps) {
    // Build initial selection: pick first available value per attribute
    const buildInitial = useCallback(() => {
        const sel: Record<string, string> = {};
        for (const attr of selectedAttributes) {
            if (attr.values.length > 0) sel[attr.label] = attr.values[0];
        }
        return sel;
    }, [selectedAttributes]);

    const [selection, setSelection] = useState<Record<string, string>>(buildInitial);
    const [qty, setQty]             = useState(1);
    const [previewImg, setPreviewImg] = useState(productImage);

    // Resolved variant for the current selection
    const matched = findVariant(variants, selection);
    const inStock = matched
        ? parseInt(matched.quantity ?? '0', 10) > 0
        : false;
    const price  = matched ? parseFloat(matched.price ?? '0') || 0 : 0;
    const maxQty = matched ? parseInt(matched.quantity ?? '0', 10) || 9999 : 9999;

    // Update preview image whenever matched variant changes
    useEffect(() => {
        if (matched?.image) setPreviewImg(matched.image);
        else setPreviewImg(productImage);
    }, [matched, productImage]);

    // Trap focus / close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const pick = (label: string, value: string) => {
        setSelection((prev) => ({ ...prev, [label]: value }));
        // Update image from a matching variant that has that option
        const candidate = variants.find(
            (v) => v.options[label] === value && v.image
        );
        if (candidate?.image) setPreviewImg(candidate.image);
    };

    const handleAdd = () => {
        if (!matched || !inStock) return;
        onAddToCart(matched, qty);
        onClose();
    };

    const isComplete = selectedAttributes.every(
        (attr) => selection[attr.label] !== undefined
    );

    const modal = (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Select variant"
        >
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
                    <h2 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1 mr-3">
                        {productTitle}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        aria-label="Close"
                    >
                        <Icon icon="mdi:close" width={14} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-4 space-y-4">

                    {/* Product image + price */}
                    <div className="flex gap-3 items-start">
                        <div className="shrink-0 w-24 h-24 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                            {previewImg ? (
                                <Image
                                    src={previewImg}
                                    alt={productTitle}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <Icon icon="mdi:image-off" width={28} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{productTitle}</p>
                            {price > 0 ? (
                                <p className="text-lg font-bold text-orange-600">
                                    {fmtPrice(price, currencySymbol)}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Select options</p>
                            )}
                            {matched && (
                                <p className={`text-xs font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                                    {inStock ? `${matched.quantity} in stock` : 'Out of stock'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Attribute selectors */}
                    {selectedAttributes.map((attr) => {
                        const isColor = (attr.displayStyle ?? '').includes('color');
                        return (
                            <div key={attr.label} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-700">{attr.label}</span>
                                    {selection[attr.label] && (
                                        <span className="text-xs text-gray-400">— {selection[attr.label]}</span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {attr.values.map((val) => {
                                        const isSelected = selection[attr.label] === val;
                                        // Find color hex for this value
                                        const colorVariant = variants.find(
                                            (v) => v.options[attr.label] === val && v.color
                                        );
                                        const hex = colorVariant?.color ?? '';

                                        // Is this value available (has stock in any variant with current other selections)?
                                        const available = variants.some((v) => {
                                            if (v.options[attr.label] !== val) return false;
                                            // Check other selections match
                                            return Object.entries(selection).every(([k, sv]) =>
                                                k === attr.label || v.options[k] === sv
                                            );
                                        });

                                        if (isColor && hex) {
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => pick(attr.label, val)}
                                                    title={val}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                        isSelected
                                                            ? 'border-orange-500 scale-110 ring-2 ring-orange-300'
                                                            : available
                                                                ? 'border-gray-200 hover:border-orange-300 hover:scale-105'
                                                                : 'border-gray-100 opacity-40 cursor-not-allowed'
                                                    }`}
                                                    style={{ backgroundColor: hex }}
                                                    disabled={!available}
                                                />
                                            );
                                        }

                                        return (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => pick(attr.label, val)}
                                                disabled={!available}
                                                className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                                                    isSelected
                                                        ? 'bg-orange-500 text-white border-orange-500'
                                                        : available
                                                            ? 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                            : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Quantity */}
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-700">Quantity</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <Icon icon="mdi:minus" width={14} />
                            </button>
                            <span className="w-10 text-center text-sm font-bold">{qty}</span>
                            <button
                                type="button"
                                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                                disabled={qty >= maxQty}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Icon icon="mdi:plus" width={14} />
                            </button>
                            {matched && inStock && (
                                <span className="text-[10px] text-gray-400 ml-1">max {maxQty}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="shrink-0 px-4 pb-4 pt-3 border-t border-gray-100 space-y-2">
                    {!isComplete && (
                        <p className="text-xs text-center text-gray-400">
                            Please select all options above
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!isComplete || !inStock}
                        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            background: isComplete && inStock
                                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                : undefined,
                            backgroundColor: isComplete && inStock ? undefined : '#e5e7eb',
                            color: isComplete && inStock ? '#fff' : '#9ca3af',
                        }}
                    >
                        <Icon icon="mdi:cart-plus" width={18} />
                        {inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
