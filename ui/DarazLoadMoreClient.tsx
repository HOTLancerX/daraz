"use client";

/**
 * plugin/daraz/ui/DarazLoadMoreClient.tsx
 *
 * Product grid with load-more / infinite-scroll capability.
 *
 * Modes (loadMode):
 *  "button"   — "Load More" button at bottom; click adds `loadStep` products.
 *  "infinite" — IntersectionObserver sentinel; auto-loads when sentinel enters
 *               the viewport.
 *  "both"     — Shows button AND also triggers on scroll.
 *
 * Data modes:
 *  1. Server path: `initialProducts` + `totalCount` pre-loaded — no initial fetch.
 *     Client fetches additional pages via xFetch when user loads more.
 *  2. Canvas preview: `initialProducts` absent — full client-side fetch.
 *
 * Title / header: hidden when title is empty; products still show.
 * View All: shown only when exactly 1 category is selected + not disabled.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";
import type { DarazProduct, DarazCat } from "./DarazGridClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DarazLoadMoreColors {
    titleColor:        string;
    btnBg:             string;
    btnText:           string;
    btnHoverBg:        string;
    btnHoverText:      string;
    btnBorderColor:    string;
}

export interface DarazLoadMoreClientProps {
    title:             string;
    categoryIds:       string[];
    /** Initial products to show */
    initialCount:      number;
    /** How many to add each load */
    loadStep:          number;
    /** "button" | "infinite" | "both" */
    loadMode:          string;
    /** Text on the button — supports ∞ character */
    btnText:           string;
    /** px from bottom of sentinel before auto-load fires */
    scrollThreshold:   number;
    boxStyle:          string;
    showViewAll:       string;
    currencySymbol?:   string;
    colsDesktop?:      number;
    colsTablet?:       number;
    colsMobile?:       number;
    cardGap?:          number;
    colors:            DarazLoadMoreColors;
    /** Pre-fetched first page — provided by server component */
    initialProducts?:  DarazProduct[];
    /** Total available products (for disabling Load More) */
    totalCount?:       number;
    /** Pre-fetched category info for View All link */
    initialCat?:       DarazCat | null;
    /** Permalink prefix for fetching more pages */
    productPrefix?:    string;
}

// ─── Tailwind column maps ─────────────────────────────────────────────────────

const MOBILE_COLS: Record<number, string>  = { 1:"grid-cols-1", 2:"grid-cols-2", 3:"grid-cols-3", 4:"grid-cols-4", 5:"grid-cols-5", 6:"grid-cols-6" };
const TABLET_COLS: Record<number, string>  = { 1:"md:grid-cols-1", 2:"md:grid-cols-2", 3:"md:grid-cols-3", 4:"md:grid-cols-4", 5:"md:grid-cols-5", 6:"md:grid-cols-6" };
const DESKTOP_COLS: Record<number, string> = { 1:"xl:grid-cols-1", 2:"xl:grid-cols-2", 3:"xl:grid-cols-3", 4:"xl:grid-cols-4", 5:"xl:grid-cols-5", 6:"xl:grid-cols-6", 7:"xl:grid-cols-7", 8:"xl:grid-cols-8" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function DarazLoadMoreClient({
    title,
    categoryIds,
    initialCount,
    loadStep,
    loadMode,
    btnText,
    scrollThreshold,
    boxStyle,
    showViewAll,
    currencySymbol = "$",
    colsDesktop = 5,
    colsTablet  = 4,
    colsMobile  = 2,
    cardGap     = 12,
    colors,
    initialProducts,
    totalCount: serverTotal,
    initialCat,
    productPrefix = "product",
}: DarazLoadMoreClientProps) {
    const activePlugins = useActivePlugins();

    const [products, setProducts]       = useState<DarazProduct[]>(initialProducts ?? []);
    const [total, setTotal]             = useState<number>(serverTotal ?? 0);
    const [cat, setCat]                 = useState<DarazCat | null>(initialCat ?? null);
    const [loading, setLoading]         = useState(!initialProducts);
    const [loadingMore, setLoadingMore] = useState(false);
    const [BoxComponent, setBoxComponent] = useState<React.ComponentType<any> | null>(null);

    // sentinel ref for infinite scroll
    const sentinelRef = useRef<HTMLDivElement>(null);
    // track if we've started a load (prevents double-trigger)
    const isLoadingRef = useRef(false);

    const safeStep    = Math.max(Number(loadStep)    || 8, 1);
    const safeInitial = Math.max(Number(initialCount) || 8, 1);

    // ── Box resolution ────────────────────────────────────────────────────────
    useEffect(() => {
        if (activePlugins === null) return;
        const boxes = getHooks("root.pages").filter(
            (p) => p.type === "product-box" && p.slug === "dynamic"
        );
        let match: React.ComponentType<any> | null = null;
        if (boxStyle) {
            match =
                boxes.find((b) => b.label === boxStyle)?.component ??
                boxes.find((b) => b.active === true)?.component ??
                boxes[0]?.component ?? null;
        } else {
            match = boxes.find((b) => b.active === true)?.component ?? boxes[0]?.component ?? null;
        }
        setBoxComponent(() => match);
    }, [activePlugins, boxStyle]);

    // ── Canvas-preview: initial fetch ─────────────────────────────────────────
    useEffect(() => {
        if (initialProducts) return;
        setLoading(true);

        // Fetch cat info if a single category is selected
        const catFetch = categoryIds.length > 0
            ? xFetch(`/builder-post/cats?type=product-category`)
                .then((r) => r.json())
                .then((d) => {
                    const all: { _id: string; title: string; slug: string }[] = d.cats ?? [];
                    const found = all.find((c) => c._id === categoryIds[0]);
                    if (found) setCat({ _id: found._id, title: found.title, slug: found.slug, url: `/product/category/${found.slug}` });
                })
                .catch(() => {})
            : Promise.resolve();

        const params = new URLSearchParams({
            type:   "product",
            limit:  String(safeInitial),
            offset: "0",
            ...(categoryIds.length ? { cats: categoryIds.join(",") } : {}),
        });

        Promise.all([
            catFetch,
            xFetch(`/builder-post?${params}`).then((r) => r.json()),
        ])
            .then(([, data]) => {
                setProducts(data.posts ?? []);
                setTotal(data.total  ?? (data.posts?.length ?? 0));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(categoryIds), safeInitial, !!initialProducts]);

    // ── Load more ─────────────────────────────────────────────────────────────
    const loadMore = useCallback(async () => {
        if (isLoadingRef.current) return;
        if (products.length >= total && total > 0) return;
        isLoadingRef.current = true;
        setLoadingMore(true);
        try {
            const params = new URLSearchParams({
                type:   "product",
                limit:  String(safeStep),
                offset: String(products.length),
                ...(categoryIds.length ? { cats: categoryIds.join(",") } : {}),
            });
            const data = await xFetch(`/builder-post?${params}`).then((r) => r.json());
            const newPosts: DarazProduct[] = data.posts ?? [];
            setProducts((prev) => {
                const seen = new Set(prev.map((p) => p._id));
                return [...prev, ...newPosts.filter((p) => !seen.has(p._id))];
            });
            if (data.total !== undefined) setTotal(data.total);
        } catch {
            // silent — user can retry by clicking button
        } finally {
            setLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [products.length, total, safeStep, categoryIds]);

    // ── Infinite scroll sentinel ──────────────────────────────────────────────
    useEffect(() => {
        if (loadMode === "button") return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMore();
                }
            },
            { rootMargin: `0px 0px ${scrollThreshold ?? 200}px 0px` }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMode, loadMore, scrollThreshold]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasTitle     = title.trim() !== "";
    const canViewAll   = showViewAll !== "false" && categoryIds.length === 1 && cat !== null;
    const hasMore      = total === 0 ? false : products.length < total;
    const showBtn      = (loadMode === "button" || loadMode === "both") && hasMore;

    const mobileClass  = MOBILE_COLS[Math.min(Math.max(colsMobile,  1), 6)] ?? "grid-cols-2";
    const tabletClass  = TABLET_COLS[Math.min(Math.max(colsTablet,  1), 6)] ?? "md:grid-cols-4";
    const desktopClass = DESKTOP_COLS[Math.min(Math.max(colsDesktop, 1), 8)] ?? "xl:grid-cols-5";

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={20} />
                <span className="text-xs">Loading...</span>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                <Icon icon="solar:bag-bold" width={32} className="opacity-30" />
                <p className="text-xs">No products found.</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <section className="w-full space-y-4">

            {/* Header */}
            {hasTitle && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 shrink-0"
                        style={{ color: colors.titleColor || "inherit" }}>
                        {title}
                    </h2>

                    <div className="flex items-center gap-3 ml-auto">
                        {/* Counter */}
                        {total > 0 && (
                            <span className="text-xs text-gray-400">
                                {products.length}
                                {total > products.length ? ` / ${total}` : ` of ${total}`}
                            </span>
                        )}

                        {/* View All */}
                        {canViewAll && cat && (
                            <Link
                                href={cat.url}
                                className="shrink-0 text-xs font-semibold flex items-center gap-0.5 hover:underline"
                                style={{ color: colors.btnBg || "#f97316" }}
                            >
                                View All
                                <Icon icon="mdi:chevron-right" width={14} />
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Grid */}
            <div
                className={`grid ${mobileClass} ${tabletClass} ${desktopClass}`}
                style={{ gap: cardGap }}
            >
                {products.map((product) =>
                    BoxComponent ? (
                        <BoxComponent
                            key={product._id}
                            data={product}
                            productUrl={product.postUrl || "#"}
                            currencySymbol={currencySymbol}
                        />
                    ) : (
                        <Link
                            key={product._id}
                            href={product.postUrl || "#"}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3"
                        >
                            <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.title}</p>
                        </Link>
                    )
                )}
            </div>

            {/* Load More button */}
            {showBtn && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: colors.btnBg         || "#f97316",
                            color:           colors.btnText       || "#ffffff",
                            borderColor:     colors.btnBorderColor || "transparent",
                        }}
                        onMouseEnter={(e) => {
                            const btn = e.currentTarget;
                            btn.style.backgroundColor = colors.btnHoverBg   || "#ea6c00";
                            btn.style.color           = colors.btnHoverText || "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                            const btn = e.currentTarget;
                            btn.style.backgroundColor = colors.btnBg   || "#f97316";
                            btn.style.color           = colors.btnText || "#ffffff";
                        }}
                    >
                        {loadingMore ? (
                            <Icon icon="svg-spinners:ring-resize" width={16} />
                        ) : (
                            <Icon icon="mdi:plus-circle-outline" width={16} />
                        )}
                        {loadingMore ? "Loading…" : (btnText || "Load More")}
                        {!loadingMore && total > 0 && (
                            <span className="opacity-70 text-xs font-normal">
                                +{Math.min(safeStep, total - products.length)}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* All loaded message */}
            {!hasMore && total > 0 && products.length >= total && (
                <p className="text-center text-xs text-gray-400 pt-1">
                    All {total} products loaded
                </p>
            )}

            {/* Infinite scroll sentinel */}
            {(loadMode === "infinite" || loadMode === "both") && (
                <div ref={sentinelRef} className="h-4" aria-hidden />
            )}
        </section>
    );
}
