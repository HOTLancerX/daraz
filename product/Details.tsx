"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import ProductFlashBox from "@/plugin/flash-sale/box/Product-flash";
import Variant from "@/plugin/product/product/Variant";
import { getAllRootPages } from "@/hook";
import { xFetch } from "@/lib/express";
import DarazReviews from "./DarazReviews";

export interface DarazProductDetailsProps {
  data: { id: string; title: string; slug: string };
  productId?: string;
  categoryId?: string | null;
  priceType: "single" | "variant";
  regularPrice: number;
  sellingPrice: number;
  displayPrice: number;
  hasDiscount: boolean;
  discountPercent: number;
  singleStock: number;
  variants: any[];
  selectedAttributes: any[];
  variantDisplayStyle: string;
  allImages: string[];
  specifications: any[];
  currencySymbol: string;
  whatsappNumber: string;
  telegramUsername: string;
  facebookPageId: string;
  shortDescription: string;
  description: string;
  htmlDescription: string;
  orderNote: string;
  warranty?: string;
  shippingInside?: number;
  shippingOutside?: number;
  shippingInsideLabel?: string;
  shippingOutsideLabel?: string;
  shippingInsideRate?: number;
  shippingOutsideRate?: number;
  relatedCols?: number;
  categoryLinks?: { title: string; url: string }[];
  brand?: {
    _id: string;
    title: string;
    slug: string;
    url: string;
  } | null;
  seller?: {
    _id: string;
    name: string;
    image: string;
    slug: string;
    city: string;
    state: string;
    bio: string;
    website: string;
    twitter: string;
    profileUrl: string;
  } | null;
  categoryProducts?: any[] | null;
  flashSaleCampaign?: any | null;
  permalinkMap?: Record<string, string>;
  builder?: React.ReactNode;
  reviewsData?: any | null;
}

interface CartItem {
  productId: string;
  productSlug: string;
  productTitle: string;
  productImage: string;
  variantId?: string;
  variantOptions?: Record<string, string>;
  sku?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  shippingInside?: number;
  shippingOutside?: number;
  orderNote?: string;
}

function addToCart(item: CartItem) {
  try {
    const raw = localStorage.getItem("shopping_cart");
    const cart: CartItem[] = raw ? JSON.parse(raw) : [];
    const idx = cart.findIndex(
      (c) => c.productId === item.productId && c.variantId === item.variantId
    );
    if (idx >= 0) {
      cart[idx].quantity = Math.min(cart[idx].quantity + item.quantity, item.maxQuantity);
    } else {
      cart.push(item);
    }
    localStorage.setItem("shopping_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
  } catch {
    /* localStorage unavailable */
  }
}

function buildAttributes(variants: any[], selectedAttributes: any[]) {
  if (!variants?.length) return [];

  const attrMap: Record<string, Set<string>> = {};
  variants.forEach((v: any) => {
    if (!v.options) return;
    Object.entries(v.options).forEach(([key, value]) => {
      if (!attrMap[key]) attrMap[key] = new Set();
      attrMap[key].add(value as string);
    });
  });

  if (selectedAttributes?.length > 0) {
    return [...selectedAttributes]
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .filter((sa: any) => attrMap[sa.label])
      .map((sa: any) => {
        const saved = (sa.values || []).filter((v: string) => attrMap[sa.label]?.has(v));
        const extra = Array.from(attrMap[sa.label] || []).filter((v) => !saved.includes(v));
        return {
          label: sa.label,
          values: [...saved, ...extra],
          displayStyle: sa.displayStyle,
          position: sa.position,
        };
      });
  }

  return Object.entries(attrMap).map(([label, values]) => ({
    label,
    values: Array.from(values),
  }));
}

function fmtPrice(n: number) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export default function DarazProductDetails({
  data,
  priceType,
  regularPrice,
  displayPrice,
  hasDiscount,
  discountPercent,
  singleStock,
  variants,
  selectedAttributes,
  variantDisplayStyle,
  allImages,
  specifications,
  currencySymbol = "৳",
  whatsappNumber = "",
  shortDescription,
  description,
  htmlDescription,
  orderNote,
  warranty,
  shippingInside,
  shippingOutside,
  shippingInsideLabel = "Inside Shipping",
  shippingOutsideLabel = "Outside Shipping",
  shippingInsideRate = 0,
  shippingOutsideRate = 0,
  relatedCols = 6,
  categoryLinks = [],
  brand = null,
  seller = null,
  categoryProducts = null,
  flashSaleCampaign = null,
  permalinkMap = {},
  builder,
  reviewsData = null,
}: DarazProductDetailsProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [productPrefix, setProductPrefix] = useState(() =>
    (permalinkMap["product"] ?? "product").trim().replace(/^\/+|\/+$/g, "")
  );

  useEffect(() => {
    if (permalinkMap["product"]) {
      setProductPrefix(permalinkMap["product"].trim().replace(/^\/+|\/+$/g, ""));
    } else {
      xFetch("/permalink", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => {
          if (data && typeof data === "object" && !(data as any).error) {
            const prefix = (data as Record<string, string>)["product"] ?? "product";
            setProductPrefix(prefix.trim().replace(/^\/+|\/+$/g, ""));
          }
        })
        .catch(() => {});
    }
  }, [permalinkMap]);

  const buildProductUrl = (slug: string) =>
    productPrefix ? `/${productPrefix}/${slug}` : `/${slug}`;

  const BoxComponent = useMemo(() => {
    const boxes = getAllRootPages().filter(
      (p) => p.type === "product-box" && p.slug === "dynamic"
    );
    if (!boxes.length) return ProductFlashBox;
    return (boxes.find((b) => b.active === true) ?? boxes[0])?.component ?? ProductFlashBox;
  }, []);

  // ── Flash Sale Computations ───────────────────────────────────────────────
  const hasFlash = !!flashSaleCampaign;
  const effectivePrice = hasFlash
    ? flashSaleCampaign.saleType === "fake"
      ? displayPrice
      : Math.round(displayPrice * (1 - flashSaleCampaign.percentage / 100) * 100) / 100
    : displayPrice;
  const effectiveRegular = hasFlash
    ? flashSaleCampaign.saleType === "fake"
      ? Math.round(displayPrice * (1 + flashSaleCampaign.percentage / 100) * 100) / 100
      : displayPrice
    : regularPrice;
  const effectiveDiscount = hasFlash
    ? flashSaleCampaign.saleType === "fake"
      ? Math.round(((effectiveRegular - effectivePrice) / effectiveRegular) * 100)
      : flashSaleCampaign.percentage
    : discountPercent;
  const effectiveHasDiscount = hasFlash || hasDiscount;

  // ── Variant Selection State ───────────────────────────────────────────────
  const [selectedVariant, setSelectedVariant] = useState<any>(() => variants[0] ?? null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    variants[0]?.options ? { ...variants[0].options } : {}
  );

  const attributes = useMemo(
    () => buildAttributes(variants, selectedAttributes),
    [variants, selectedAttributes]
  );

  const handleOptionSelect = (label: string, value: string) => {
    const nextOptions = { ...selectedOptions, [label]: value };
    setSelectedOptions(nextOptions);

    const matched = variants.find((v: any) =>
      v.options ? Object.entries(nextOptions).every(([k, val]) => v.options[k] === val) : false
    );
    setSelectedVariant(matched ?? null);
  };

  // Current calculated values
  const currentPrice = useMemo(() => {
    if (priceType === "single") return effectivePrice;
    if (selectedVariant) {
      const base = parseFloat(selectedVariant.price ?? "0") || 0;
      if (hasFlash) {
        return flashSaleCampaign.saleType === "fake"
          ? base
          : Math.round(base * (1 - flashSaleCampaign.percentage / 100) * 100) / 100;
      }
      return base;
    }
    return 0;
  }, [priceType, effectivePrice, selectedVariant, hasFlash, flashSaleCampaign]);

  const currentStock = useMemo(() => {
    if (priceType === "single") return singleStock;
    if (selectedVariant) return parseInt(selectedVariant.quantity ?? "0", 10) || 0;
    return 0;
  }, [priceType, singleStock, selectedVariant]);

  const gallery = useMemo(() => {
    const images: string[] = [];
    if (selectedVariant?.image) images.push(selectedVariant.image);
    if (selectedVariant?.gallery?.length) images.push(...selectedVariant.gallery);
    allImages.forEach((img) => {
      if (!images.includes(img)) images.push(img);
    });
    return images.filter(Boolean);
  }, [selectedVariant, allImages]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const activeImage = gallery[activeImgIndex] || gallery[0] || "";

  // Quantity Stepper
  const [quantity, setQuantity] = useState(1);
  const inc = () => setQuantity((q) => (currentStock > 0 ? Math.min(q + 1, currentStock) : q + 1));
  const dec = () => setQuantity((q) => Math.max(1, q - 1));

  const [noteValue, setNoteValue] = useState("");
  const [expandedDesc, setExpandedDesc] = useState(false);

  // Cart Logic
  const buildCartItem = (): CartItem | null => {
    if (priceType === "variant" && !selectedVariant) {
      error("Please select all product options.");
      return null;
    }
    if (currentStock <= 0) {
      error("This item is currently out of stock.");
      return null;
    }
    return {
      productId: data.id,
      productSlug: data.slug,
      productTitle: data.title,
      productImage: activeImage,
      variantId: selectedVariant?.id,
      variantOptions: selectedVariant?.options,
      sku: selectedVariant?.sku,
      price: currentPrice,
      quantity,
      maxQuantity: currentStock,
      shippingInside,
      shippingOutside,
      orderNote: noteValue,
    };
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    if (!item) return;
    addToCart(item);
    success("Product added to cart!");
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    if (!item) return;
    addToCart(item);
    router.push("/checkout");
  };

  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="w-full min-h-screen py-3 pb-16 md:pb-12 font-sans text-gray-800">
      <div className="container space-y-3">
        {/* ─── 1. BREADCRUMBS BAR ─── */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 py-1 flex-wrap">
          <Link href="/" className="hover:text-[#f57224] transition-colors">
            Home
          </Link>
          {categoryLinks.map((cat, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <Icon icon="mdi:chevron-right" width={14} className="text-gray-400" />
              <Link href={cat.url} className="hover:text-[#f57224] transition-colors">
                {cat.title}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
            <Icon icon="mdi:chevron-right" width={14} className="text-gray-400 shrink-0" />
            <span className="text-gray-700 font-medium truncate">{data.title}</span>
          </span>
        </nav>

        {/* ─── 2. TOP PRODUCT DETAILS BOX (3-COLUMN LAYOUT) ─── */}
        <div className="bg-white rounded p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── COL 1: GALLERY SLIDER (LG: 4 COLS) ── */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Main Active Image View */}
            <div className="relative aspect-square w-full bg-gray-50 border border-gray-100 rounded-lg overflow-hidden group">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={data.title}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Icon icon="mdi:image-off" width={48} />
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {gallery.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-14 h-14 shrink-0 rounded border-2 overflow-hidden bg-gray-50 transition-all ${
                      activeImgIndex === idx
                        ? "border-[#f57224] ring-1 ring-[#f57224]/30"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-contain" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── COL 2: MAIN BUY BOX & VARIANTS (LG: 5 COLS) ── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Product Title */}
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-snug">
              {data.title}
            </h1>

            {/* Ratings & Share Header */}
            <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} icon="solar:star-bold" width={14} className="text-gray-300" />
                  ))}
                </div>
                <span className="text-blue-500 hover:underline cursor-pointer">No Ratings</span>
              </div>
              <div className="flex items-center gap-3 relative">
                <button
                  type="button"
                  onClick={() => setShareOpen((v) => !v)}
                  className="hover:text-[#f57224] flex items-center gap-1 transition-colors relative"
                  title="Share"
                >
                  <Icon icon="solar:share-bold" width={18} />
                </button>

                {/* Share Popover Box */}
                {shareOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Top Arrow */}
                    <div className="absolute -top-2 right-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-8 border-b-white" />

                    <p className="text-xs font-semibold text-gray-800 mb-2">Share via:</p>
                    <div className="flex items-center gap-3">
                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-xs"
                        title="Facebook"
                      >
                        <Icon icon="bi:facebook" width={15} />
                      </a>

                      {/* Pinterest */}
                      <a
                        href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(activeImage)}&description=${encodeURIComponent(data.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#E60023] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-xs"
                        title="Pinterest"
                      >
                        <Icon icon="bi:pinterest" width={15} />
                      </a>

                      {/* X (Twitter) */}
                      <a
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(data.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-xs"
                        title="X (Twitter)"
                      >
                        <Icon icon="ri:twitter-x-fill" width={15} />
                      </a>
                    </div>
                  </div>
                )}

                <button type="button" className="hover:text-[#f57224] flex items-center gap-1 transition-colors" title="Wishlist">
                  <Icon icon="solar:heart-bold" width={18} />
                </button>
              </div>
            </div>

            {/* Brand Information — conditionally rendered if brand exists */}
            {brand && brand.title && (
              <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                <span>Brand:</span>
                <Link href={brand.url} className="text-blue-600 hover:underline font-medium">
                  {brand.title}
                </Link>
                <span className="text-gray-300 mx-0.5">|</span>
                <Link href={brand.url} className="text-blue-600 hover:underline">
                  More {categoryLinks[categoryLinks.length - 1]?.title || "Products"} from {brand.title}
                </Link>
              </div>
            )}

            {/* Price Block */}
            <div className="bg-gray-50/80 p-3.5 rounded-lg flex flex-col gap-1 border border-gray-100">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#f57224]">
                  {currencySymbol} {fmtPrice(currentPrice)}
                </span>
                {effectiveHasDiscount && effectiveRegular > currentPrice && (
                  <>
                    <span className="text-xs sm:text-sm text-gray-400 line-through">
                      {currencySymbol} {fmtPrice(effectiveRegular)}
                    </span>
                    <span className="text-xs font-bold text-[#f57224]">
                      -{effectiveDiscount}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Variants Selector */}
            {priceType === "variant" && attributes.length > 0 && (
              <div className="py-2 space-y-3">
                <Variant
                  info={{ variants }}
                  attributes={attributes}
                  selectedOptions={selectedOptions}
                  selectedVariant={selectedVariant}
                  displayStyle={variantDisplayStyle}
                  onOptionSelect={handleOptionSelect}
                  currencySymbol={currencySymbol}
                />
              </div>
            )}

            {/* Quantity Stepper */}
            <div className="flex items-center gap-4 py-2">
              <span className="text-xs font-medium text-gray-500 w-16">Quantity</span>
              <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={dec}
                  disabled={quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                >
                  <Icon icon="mdi:minus" width={14} />
                </button>
                <span className="w-10 text-center text-xs font-bold text-gray-800">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={inc}
                  className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600"
                >
                  <Icon icon="mdi:plus" width={14} />
                </button>
              </div>
              {currentStock > 0 ? (
                <span className="text-xs text-green-600 font-medium">In Stock</span>
              ) : (
                <span className="text-xs text-red-500 font-medium">Out of Stock</span>
              )}
            </div>

            {/* Action Buttons: Buy Now & Add to Cart */}
            <div className="hidden md:flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={currentStock <= 0}
                className="flex-1 py-3 px-4 rounded bg-[#00b4d8] hover:bg-[#0096c7] text-white text-sm font-bold shadow-xs active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className="flex-1 py-3 px-4 rounded bg-[#f57224] hover:bg-[#d85c10] text-white text-sm font-bold shadow-xs active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
            </div>
          </div>

          {/* ── COL 3: DELIVERY & SELLER SIDEBAR (LG: 3 COLS) ── */}
          <div className="lg:col-span-3 bg-gray-50/60 p-3.5 rounded-lg border border-gray-100 flex flex-col gap-4 text-xs">
            {/* Delivery Options Header */}
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="font-semibold text-gray-700">Delivery Options</span>
                <Icon icon="mdi:information-outline" width={14} className="text-gray-400" />
              </div>

              {/* Dynamic Shipping Rates Display */}
              <div className="mt-2.5 text-gray-600 space-y-1.5 bg-white p-2.5 rounded border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icon icon="iconamoon:delivery-fast-fill" width={20} className="text-gray-400" />
                    {shippingInsideLabel}:
                  </span>
                  <span className="font-bold text-gray-800">
                    {shippingInside !== undefined
                      ? `${currencySymbol} ${shippingInside}`
                      : `${currencySymbol} ${shippingInsideRate}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icon icon="iconamoon:delivery-fast-light" width={20} className="text-gray-400" />
                    {shippingOutsideLabel}:
                  </span>
                  <span className="font-bold text-gray-800">
                    {shippingOutside !== undefined
                      ? `${currencySymbol} ${shippingOutside}`
                      : `${currencySymbol} ${shippingOutsideRate}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Return & Warranty */}
            <div className="border-t border-gray-200/80 pt-3 space-y-2">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="font-semibold text-gray-700">Return & Warranty</span>
                <Icon icon="mdi:information-outline" width={16} className="text-gray-400" />
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Icon icon="solar:restart-bold" width={30} className="text-gray-400 shrink-0" />
                <span>Return Restriction Apply</span>
              </div>
              {warranty  && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Icon icon="solar:shield-check-bold" width={30} className="text-gray-400 shrink-0" />
                  <span>{warranty}</span>
                </div>
              )}
            </div>

            {/* QR Code App Promo Card */}
            <div className="border-t border-gray-200/80 pt-3 flex items-center gap-2.5 bg-white p-2.5 rounded border">
              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-600 shrink-0 border">
                <Icon icon="solar:qr-code-bold" width={28} />
              </div>
              <div className="text-[11px]">
                <p className="font-bold text-gray-800">Scan with mobile</p>
                <p className="text-gray-500 leading-tight">Download app to enjoy exclusive discounts!</p>
              </div>
            </div>

            {/* Seller Card (Sold by) — conditionally rendered if seller exists */}
            {seller && (
              <div className="border-t border-gray-200/80 pt-3 space-y-2.5">
                <div className="flex items-start gap-3">
                  {/* Seller Avatar */}
                  <Link href={seller.profileUrl} className="shrink-0">
                    {seller.image ? (
                      <img
                        src={seller.image}
                        alt={seller.name}
                        className="w-12 h-12 rounded-lg object-cover ring-1 ring-orange-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                        {seller.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400">Sold by</p>
                    <Link
                      href={seller.profileUrl}
                      className="font-bold text-gray-900 text-sm hover:text-[#f57224] transition-colors block truncate"
                    >
                      {seller.name}
                    </Link>

                    {(seller.city || seller.state) && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        📍 {[seller.city, seller.state].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {seller.bio && (
                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{seller.bio}</p>
                    )}
                  </div>
                </div>

                {/* Seller Links */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={seller.profileUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                  >
                    🛒 View all products
                  </Link>
                  {seller.website && (
                    <a
                      href={seller.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      🌐 Website
                    </a>
                  )}
                  {seller.twitter && (
                    <a
                      href={`https://x.com/${seller.twitter.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      𝕏 {seller.twitter.startsWith("@") ? seller.twitter : `@${seller.twitter}`}
                    </a>
                  )}
                </div>

                {/* Seller Ratings Grid */}
                <div className="grid grid-cols-3 gap-1 bg-white p-2 rounded text-center border border-gray-200 mt-2">
                  <div>
                    <p className="text-[10px] text-gray-400">Positive Ratings</p>
                    <p className="font-extrabold text-sm text-gray-800">83%</p>
                  </div>
                  <div className="border-x border-gray-100">
                    <p className="text-[10px] text-gray-400">Ship on Time</p>
                    <p className="font-extrabold text-sm text-gray-800">100%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Chat Response</p>
                    <p className="font-medium text-[11px] text-gray-400 mt-1">N/A</p>
                  </div>
                </div>

                {/* Chat with Seller Button */}
                <Link
                  href={`/account/messages/${seller.slug}?productId=${encodeURIComponent(data.id)}&productTitle=${encodeURIComponent(data.title)}&productImage=${encodeURIComponent(activeImage)}&productPrice=${encodeURIComponent(currentPrice)}&productSlug=${encodeURIComponent(data.slug)}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors shadow-xs mt-2"
                >
                  <Icon icon="solar:chat-round-dots-bold" width={16} />
                  <span>Chat with Seller</span>
                </Link>

                <Link
                  href={seller.profileUrl}
                  className="block text-center text-xs font-bold text-blue-600 uppercase hover:underline py-1"
                >
                  GO TO STORE
                </Link>
              </div>
            )}
          </div>
        </div>

        {builder}

        {/* ─── 3. PRODUCT DETAILS BOX ─── */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
            Product details of {data.title}
          </h2>

          {/* Key Highlights Bullet List */}
          {specifications?.length > 0 && (
            <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-100 space-y-2">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Key Highlights</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                {specifications.map((spec, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Icon icon="mdi:check-circle" className="text-green-500 w-4 h-4 shrink-0" />
                    <span>
                      <strong className="font-semibold text-gray-900">{spec.label || spec.name}:</strong>{" "}
                      {spec.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rich Description */}
          <div className="relative">
            <div
              className={`prose max-w-none text-xs sm:text-sm description text-gray-700 leading-relaxed overflow-hidden transition-all duration-500 ${
                expandedDesc ? "max-h-none" : "max-h-48"
              }`}
              dangerouslySetInnerHTML={{
                __html: htmlDescription || description || shortDescription || "<p>No detailed description available.</p>",
              }}
            />
            {!expandedDesc && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setExpandedDesc(!expandedDesc)}
              className="px-6 py-2 border border-blue-500 text-blue-600 text-xs font-bold rounded hover:bg-blue-50 uppercase transition-all"
            >
              {expandedDesc ? "VIEW LESS" : "VIEW MORE"}
            </button>
          </div>
        </div>

        {/* ─── 4. RATINGS & REVIEWS BOX ─── */}
        <DarazReviews reviewsData={reviewsData} productTitle={data.title} />

        {/* ─── 5. QUESTIONS ABOUT THIS PRODUCT BOX ─── */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
            Questions about this product
          </h2>

          <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
            <Icon icon="solar:question-square-bold-duotone" width={44} className="text-gray-300" />
            <p>There are no questions yet.</p>
            <p className="text-blue-500 hover:underline cursor-pointer">
              Login or Register to ask the seller now
            </p>
          </div>
        </div>

        {/* ─── 6. YOU MAY ALSO LIKE (RELATED CATEGORY PRODUCTS) ─── */}
        {categoryProducts && categoryProducts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 pb-3">
              You may also like
            </h2>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  relatedCols >= 6 ? "180px" : "220px"
                }, 1fr))`,
              }}
            >
              {categoryProducts.map((item: any) => (
                <BoxComponent
                  key={item._id}
                  data={item}
                  productUrl={buildProductUrl(item.slug)}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MOBILE FIXED BOTTOM ACTION BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden flex items-center h-12 overflow-hidden">
        {/* Left Side: Store & Chat */}
        <div className="flex items-center gap-2 px-1 shrink-0">
          {/* Store */}
          <Link
            href={seller?.profileUrl || "#"}
            className="flex flex-col items-center justify-center text-center px-1.5 text-gray-600 hover:text-[#f57224] transition-colors"
          >
            {seller?.image ? (
              <img src={seller.image} alt={seller.name} className="w-5 h-5 object-contain rounded" />
            ) : (
              <Icon icon="solar:shop-bold" width={20} className="text-gray-700" />
            )}
            <span className="text-[10px] text-gray-500 leading-tight mt-0.5 font-medium">Store</span>
          </Link>

          {/* Divider line */}
          <div className="w-px h-6 bg-gray-200 my-auto" />

          {/* Chat */}
          {seller?.slug ? (
            <Link
              href={`/account/messages/${seller.slug}?productId=${encodeURIComponent(data.id)}&productTitle=${encodeURIComponent(data.title)}&productImage=${encodeURIComponent(activeImage)}&productPrice=${encodeURIComponent(currentPrice)}&productSlug=${encodeURIComponent(data.slug)}`}
              className="flex flex-col items-center justify-center text-center px-1.5 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <Icon icon="griddy-icons:chat" width={20} className="text-orange-500" />
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5 font-medium">Chat</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (whatsappNumber) {
                  window.open(`https://wa.me/${whatsappNumber}`, "_blank");
                } else if (seller?.website) {
                  window.open(seller.website, "_blank");
                }
              }}
              className="flex flex-col items-center justify-center text-center px-1.5 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Icon icon="ic:baseline-whatsapp" width={22} className="text-gray-700" />
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5 font-medium">Chat</span>
            </button>
          )}
        </div>

        {/* Right Side: Slanted Buy Now & Add to Cart */}
        <div className="flex-1 flex items-center h-full ml-1 overflow-hidden">
          <div className="flex-1 flex items-center h-full skew-x-[-15deg] transform translate-x-2">
            {/* Buy Now Button */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={currentStock <= 0}
              className="flex-1 h-full bg-[#00b4d8] hover:bg-[#0096c7] text-white flex items-center justify-center font-bold text-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span className="skew-x-15">Buy Now</span>
            </button>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={currentStock <= 0}
              className="flex-1 h-full bg-[#f57224] hover:bg-[#d85c10] text-white flex items-center justify-center font-bold text-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span className="skew-x-15">Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
