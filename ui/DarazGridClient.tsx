"use client";

/**
 * plugin/daraz/ui/DarazGridClient.tsx
 *
 * Category-tabbed product grid client component.
 *
 * Modes:
 *  1. Server path: initialCats + initialProductMap pre-loaded — no network requests.
 *  2. Canvas preview: falls back to xFetch for live preview.
 *
 * Title logic:
 *  - No title  → header row (title + tabs) is hidden; products still render.
 *  - Has title → full header shown.
 *
 * View All logic:
 *  - 0 categories selected (all)     → hidden (too many to link)
 *  - Exactly 1 category selected     → shown (links to that category)
 *  - More than 1 category selected   → hidden
 *  The showViewAll prop acts as an additional manual override (set "false" to always hide).
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DarazProduct {
    _id:     string;
    title:   string;
    slug:    string;
    status:  string;
    postUrl: string;
    info:    Record<string, string>;
}

export interface DarazCat {
    _id:   string;
    title: string;
    slug:  string;
    url:   string;
}

export interface DarazGridClientProps {
    title:           string;
    categoryIds:     string[];
    limit:           number;
    boxStyle:        string;
    showViewAll:     string;
    currencySymbol?: string;
    /** Columns on desktop ≥1280px */
    colsDesktop?:    number;
    /** Columns on tablet 768–1279px */
    colsTablet?:     number;
    /** Columns on mobile <768px */
    colsMobile?:     number;
    /** Gap between cards in px */
    cardGap?:        number;
    /** Pre-fetched by server component */
    initialCats?:       DarazCat[];
    initialProductMap?: Record<string, DarazProduct[]>;
}

// ─── Tailwind column map ──────────────────────────────────────────────────────
// We need static class strings — Tailwind can't detect dynamic ones.
// We cover 1-6 for mobile/tablet and 1-8 for desktop.

const MOBILE_COLS: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
};

const TABLET_COLS: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
};

const DESKTOP_COLS: Record<number, string> = {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
    7: "xl:grid-cols-7",
    8: "xl:grid-cols-8",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DarazGridClient({
    title,
    categoryIds,
    limit,
    boxStyle,
    showViewAll,
    currencySymbol = "$",
    colsDesktop = 5,
    colsTablet  = 4,
    colsMobile  = 2,
    cardGap     = 12,
    initialCats,
    initialProductMap,
}: DarazGridClientProps) {
    const activePlugins = useActivePlugins();

    const [cats, setCats]             = useState<DarazCat[]>(initialCats ?? []);
    const [activeTab, setActiveTab]   = useState<string>(initialCats?.[0]?._id ?? "");
    const [productMap, setProductMap] = useState<Record<string, DarazProduct[]>>(initialProductMap ?? {});
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
        initialProductMap ? new Set(Object.keys(initialProductMap)) : new Set()
    );
    const [loading, setLoading]           = useState(!initialCats);
    const [BoxComponent, setBoxComponent] = useState<React.ComponentType<any> | null>(null);

    // ── Resolve box component ─────────────────────────────────────────────────
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

    // ── Canvas: fetch categories ──────────────────────────────────────────────
    useEffect(() => {
        if (initialCats) return;
        setLoading(true);
        xFetch("/builder-post/cats?type=product-category")
            .then((r) => r.json())
            .then((data) => {
                const all: { _id: string; title: string; slug: string }[] = data.cats ?? [];
                const ordered: DarazCat[] = (
                    categoryIds.length
                        ? categoryIds.map((id) => all.find((c) => c._id === id)).filter(Boolean) as typeof all
                        : all
                ).map((c) => ({ _id: c._id, title: c.title, slug: c.slug, url: `/product/category/${c.slug}` }));
                setCats(ordered);
                if (ordered.length > 0) setActiveTab(ordered[0]._id);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(categoryIds), !!initialCats]);

    // ── Canvas: lazy-load products for active tab ─────────────────────────────
    useEffect(() => {
        if (initialCats) return;
        if (!activeTab || loadedTabs.has(activeTab)) return;
        const safeLimit = Math.min(Number(limit) || 8, 40);
        const params = new URLSearchParams({ type: "product", limit: String(safeLimit), cats: activeTab });
        xFetch(`/builder-post?${params}`)
            .then((r) => r.json())
            .then((data) => {
                setProductMap((prev) => ({ ...prev, [activeTab]: data.posts ?? [] }));
                setLoadedTabs((prev) => new Set(prev).add(activeTab));
            })
            .catch(() => {
                setProductMap((prev) => ({ ...prev, [activeTab]: [] }));
                setLoadedTabs((prev) => new Set(prev).add(activeTab));
            });
    }, [activeTab, loadedTabs, limit, initialCats]);

    // ── Derived state ─────────────────────────────────────────────────────────
    const hasTitle     = title.trim() !== "";
    const showTabs     = hasTitle && cats.length > 1;
    // View All: only when exactly 1 category is selected AND showViewAll != "false"
    const canViewAll   = showViewAll !== "false" && categoryIds.length === 1;
    const activeCat    = cats.find((c) => c._id === activeTab);
    const products     = productMap[activeTab] ?? [];
    const isTabLoading = !initialCats && !loadedTabs.has(activeTab);

    // ── Grid classes ──────────────────────────────────────────────────────────
    const mobileClass  = MOBILE_COLS[Math.min(Math.max(colsMobile,  1), 6)] ?? "grid-cols-2";
    const tabletClass  = TABLET_COLS[Math.min(Math.max(colsTablet,  1), 6)] ?? "md:grid-cols-4";
    const desktopClass = DESKTOP_COLS[Math.min(Math.max(colsDesktop, 1), 8)] ?? "xl:grid-cols-5";

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={20} />
                <span className="text-xs">Loading...</span>
            </div>
        );
    }

    if (cats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                <Icon icon="solar:folder-bold" width={32} className="opacity-30" />
                <p className="text-xs">No product categories found.</p>
            </div>
        );
    }

    return (
        <section className="w-full space-y-4">

            {/* ── Header: only rendered when a title is set ── */}
            {hasTitle && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 shrink-0">{title}</h2>

                    {/* Category tabs — only when multiple cats */}
                    {showTabs && (
                        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden flex-1">
                            {cats.map((cat) => (
                                <button
                                    key={cat._id}
                                    onClick={() => setActiveTab(cat._id)}
                                    className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                                        activeTab === cat._id
                                            ? "bg-orange-500 text-white border-orange-500"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500"
                                    }`}
                                >
                                    {cat.title}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* View All — only for exactly 1 selected category */}
                    {canViewAll && activeCat && (
                        <Link
                            href={activeCat.url}
                            className="shrink-0 text-xs text-orange-500 hover:underline font-semibold flex items-center gap-0.5"
                        >
                            View All
                            <Icon icon="mdi:chevron-right" width={14} />
                        </Link>
                    )}
                </div>
            )}

            {/* ── Product grid ── */}
            {isTabLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Icon icon="svg-spinners:ring-resize" width={18} />
                    <span className="text-xs">Loading products...</span>
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300 border border-dashed border-gray-200 rounded-xl">
                    <Icon icon="solar:bag-bold" width={28} className="opacity-30" />
                    <p className="text-xs">No products in this category.</p>
                </div>
            ) : (
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
            )}
        </section>
    );
}
