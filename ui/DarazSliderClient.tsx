"use client";

/**
 * plugin/daraz/ui/DarazSliderClient.tsx
 *
 * Category-tabbed product slider built on native CSS scroll-snap.
 * Zero external carousel dependencies — all navigation logic is native JS + CSS.
 *
 * Features:
 *  - Smooth horizontal scroll with scroll-snap
 *  - Custom arrow buttons (inside or outside)
 *  - Dot navigation (inside or outside)
 *  - Auto-play via setInterval
 *  - Responsive columns via CSS Grid
 *  - Category tabs with lazy-load
 *
 * Two data modes:
 *  1. Server path: initialCats + initialProductMap pre-loaded — no fetches.
 *  2. Canvas preview: falls back to xFetch.
 *
 * Title / header logic:
 *  - No title → header row hidden; products still show.
 *  - Has title → title + optional tabs + optional View All shown.
 *
 * View All logic:
 *  - Exactly 1 category selected + showViewAll != "false" → shown.
 *  - 0 or 2+ selected → hidden.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";
import type { DarazCat, DarazProduct } from "./DarazGridClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DarazSliderColors {
    arrowColor:      string;
    arrowBg:         string;
    arrowHoverColor: string;
    arrowHoverBg:    string;
    dotColor:        string;
    dotActiveColor:  string;
    tabActiveBg:     string;
    tabActiveText:   string;
    tabInactiveBg:   string;
    tabInactiveText: string;
    titleColor:      string;
}

export interface DarazSliderClientProps {
    title:            string;
    categoryIds:      string[];
    limit:            number;
    boxStyle:         string;
    /** Slides visible on desktop ≥1024px */
    slidesDesktop:    number;
    /** Slides visible on tablet 640–1023px */
    slidesTablet:     number;
    /** Slides visible on mobile <640px */
    slidesMobile:     number;
    showArrows:       string;
    /** "inside" | "outside" */
    arrowPosition:    string;
    showDots:         string;
    /** "inside" | "outside" */
    dotPosition:      string;
    autoPlay:         string;
    autoPlaySpeed:    number;
    infinite:         string;
    /** Gap between slides in px */
    slideGap:         number;
    showViewAll:      string;
    currencySymbol?:  string;
    colors:           DarazSliderColors;
    initialCats?:     DarazCat[];
    initialProductMap?: Record<string, DarazProduct[]>;
}

// ─── Arrow button ─────────────────────────────────────────────────────────────

function ArrowBtn({
    dir,
    onClick,
    colors,
    disabled,
}: {
    dir: "prev" | "next";
    onClick: () => void;
    colors: DarazSliderColors;
    disabled: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={dir === "prev" ? "Previous" : "Next"}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-all focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed shrink-0 z-10"
            style={{
                backgroundColor: hovered
                    ? (colors.arrowHoverBg    || "#f97316")
                    : (colors.arrowBg         || "rgba(255,255,255,0.9)"),
                color: hovered
                    ? (colors.arrowHoverColor || "#ffffff")
                    : (colors.arrowColor      || "#374151"),
            }}
        >
            <Icon
                icon={dir === "prev" ? "mdi:chevron-left" : "mdi:chevron-right"}
                width={20}
            />
        </button>
    );
}

// ─── Dot navigation ───────────────────────────────────────────────────────────

function Dots({
    count,
    selected,
    onSelect,
    colors,
}: {
    count: number;
    selected: number;
    onSelect: (i: number) => void;
    colors: DarazSliderColors;
}) {
    return (
        <div className="flex items-center justify-center gap-1.5 py-2">
            {Array.from({ length: count }).map((_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="transition-all focus:outline-none"
                    style={{
                        width:        i === selected ? "20px" : "8px",
                        height:       "8px",
                        borderRadius: "9999px",
                        background:   i === selected
                            ? (colors.dotActiveColor || "#f97316")
                            : (colors.dotColor       || "#d1d5db"),
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                    }}
                />
            ))}
        </div>
    );
}

// ─── Native scroll-snap slider ────────────────────────────────────────────────

function NativeSlider({
    products,
    BoxComponent,
    currencySymbol,
    slidesDesktop,
    slidesTablet,
    slidesMobile,
    slideGap,
    showArrows,
    arrowPosition,
    showDots,
    dotPosition,
    autoPlay,
    autoPlaySpeed,
    colors,
}: {
    products:      DarazProduct[];
    BoxComponent:  React.ComponentType<any> | null;
    currencySymbol: string;
    slidesDesktop:  number;
    slidesTablet:   number;
    slidesMobile:   number;
    slideGap:       number;
    showArrows:     string;
    arrowPosition:  string;
    showDots:       string;
    dotPosition:    string;
    autoPlay:       string;
    autoPlaySpeed:  number;
    colors:         DarazSliderColors;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [canPrev, setCanPrev]           = useState(false);
    const [canNext, setCanNext]           = useState(false);

    // Calculate how many pages we have based on current viewport
    const getSlidesPerView = useCallback(() => {
        if (typeof window === 'undefined') return slidesDesktop;
        const width = window.innerWidth;
        if (width < 640) return slidesMobile;
        if (width < 1024) return slidesTablet;
        return slidesDesktop;
    }, [slidesDesktop, slidesTablet, slidesMobile]);

    const [slidesPerView, setSlidesPerView] = useState(getSlidesPerView());
    const totalPages = Math.ceil(products.length / slidesPerView);

    // Update slidesPerView on resize
    useEffect(() => {
        const handleResize = () => setSlidesPerView(getSlidesPerView());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getSlidesPerView]);

    // Update scroll buttons state
    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const atStart = el.scrollLeft <= 10;
        const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
        setCanPrev(!atStart);
        setCanNext(!atEnd);
        // Update current index based on scroll position
        const itemWidth = el.scrollWidth / products.length;
        const newIndex = Math.round(el.scrollLeft / (itemWidth * slidesPerView));
        setCurrentIndex(Math.max(0, Math.min(totalPages - 1, newIndex)));
    }, [products.length, slidesPerView, totalPages]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState);
        return () => el.removeEventListener('scroll', updateScrollState);
    }, [updateScrollState]);

    // Scroll controls
    const scrollPrev = () => {
        const el = scrollRef.current;
        if (!el) return;
        const itemWidth = el.scrollWidth / products.length;
        el.scrollBy({ left: -itemWidth * slidesPerView, behavior: 'smooth' });
    };

    const scrollNext = () => {
        const el = scrollRef.current;
        if (!el) return;
        const itemWidth = el.scrollWidth / products.length;
        el.scrollBy({ left: itemWidth * slidesPerView, behavior: 'smooth' });
    };

    const scrollToPage = (pageIndex: number) => {
        const el = scrollRef.current;
        if (!el) return;
        const itemWidth = el.scrollWidth / products.length;
        el.scrollTo({ left: itemWidth * slidesPerView * pageIndex, behavior: 'smooth' });
    };

    // Auto-play
    useEffect(() => {
        if (autoPlay !== "true") return;
        const delay = Math.max(Number(autoPlaySpeed) || 3000, 500);
        const timer = setInterval(() => {
            const el = scrollRef.current;
            if (!el) return;
            const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
            if (atEnd) {
                // Loop back to start
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                scrollNext();
            }
        }, delay);
        return () => clearInterval(timer);
    }, [autoPlay, autoPlaySpeed]);

    const arrowsVisible = showArrows !== "false";
    const dotsVisible   = showDots   !== "false";
    const dotsOutside   = dotPosition  === "outside";
    const arrowsOutside = arrowPosition === "outside";

    const uid = `slider-${products[0]?._id?.slice(-5) ?? "x"}`;

    return (
        <div className="w-full space-y-2">
            {/* Slider + outside arrows layout */}
            <div className="relative">
                <div className={`flex items-center gap-2 ${arrowsOutside ? "" : ""}`}>
                    {/* Prev arrow — outside left */}
                    {arrowsVisible && arrowsOutside && (
                        <ArrowBtn dir="prev" onClick={scrollPrev} colors={colors} disabled={!canPrev} />
                    )}

                    {/* Scroll container */}
                    <div className="overflow-hidden flex-1 min-w-0 relative">
                        <div
                            ref={scrollRef}
                            className="overflow-x-auto scrollbar-hide"
                            style={{
                                display: 'grid',
                                gridAutoFlow: 'column',
                                gridAutoColumns: `calc((100% - ${slideGap * (slidesMobile - 1)}px) / ${slidesMobile})`,
                                gap: `${slideGap}px`,
                                scrollSnapType: 'x mandatory',
                                scrollBehavior: 'smooth',
                            }}
                        >
                            <style jsx>{`
                                .scrollbar-hide {
                                    -ms-overflow-style: none;
                                    scrollbar-width: none;
                                }
                                .scrollbar-hide::-webkit-scrollbar {
                                    display: none;
                                }
                                @media (min-width: 640px) {
                                    #${uid} > div {
                                        grid-auto-columns: calc((100% - ${slideGap * (slidesTablet - 1)}px) / ${slidesTablet});
                                    }
                                }
                                @media (min-width: 1024px) {
                                    #${uid} > div {
                                        grid-auto-columns: calc((100% - ${slideGap * (slidesDesktop - 1)}px) / ${slidesDesktop});
                                    }
                                }
                            `}</style>
                            {products.map((product) => (
                                <div key={product._id} style={{ scrollSnapAlign: 'start' }}>
                                    {BoxComponent ? (
                                        <BoxComponent
                                            data={product}
                                            productUrl={product.postUrl || "#"}
                                            currencySymbol={currencySymbol}
                                        />
                                    ) : (
                                        <Link
                                            href={product.postUrl || "#"}
                                            className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 h-full"
                                        >
                                            <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.title}</p>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Inside arrows — overlaid on the viewport */}
                        {arrowsVisible && !arrowsOutside && (
                            <>
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                                    <ArrowBtn dir="prev" onClick={scrollPrev} colors={colors} disabled={!canPrev} />
                                </div>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                                    <ArrowBtn dir="next" onClick={scrollNext} colors={colors} disabled={!canNext} />
                                </div>
                            </>
                        )}

                        {/* Dots — inside (absolute, below slides) */}
                        {dotsVisible && !dotsOutside && totalPages > 1 && (
                            <div className="absolute bottom-0 left-0 right-0">
                                <Dots
                                    count={totalPages}
                                    selected={currentIndex}
                                    onSelect={scrollToPage}
                                    colors={colors}
                                />
                            </div>
                        )}
                    </div>

                    {/* Next arrow — outside right */}
                    {arrowsVisible && arrowsOutside && (
                        <ArrowBtn dir="next" onClick={scrollNext} colors={colors} disabled={!canNext} />
                    )}
                </div>

                {/* Dots — outside (normal flow, below slider) */}
                {dotsVisible && dotsOutside && totalPages > 1 && (
                    <Dots
                        count={totalPages}
                        selected={currentIndex}
                        onSelect={scrollToPage}
                        colors={colors}
                    />
                )}

                {/* Bottom padding when dots are inside so they don't overlap cards */}
                {dotsVisible && !dotsOutside && totalPages > 1 && (
                    <div style={{ height: 32 }} />
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DarazSliderClient({
    title,
    categoryIds,
    limit,
    boxStyle,
    slidesDesktop,
    slidesTablet,
    slidesMobile,
    showArrows,
    arrowPosition,
    showDots,
    dotPosition,
    autoPlay,
    autoPlaySpeed,
    infinite,
    slideGap,
    showViewAll,
    currencySymbol = "$",
    colors,
    initialCats,
    initialProductMap,
}: DarazSliderClientProps) {
    const activePlugins = useActivePlugins();

    const [cats, setCats]             = useState<DarazCat[]>(initialCats ?? []);
    const [activeTab, setActiveTab]   = useState<string>(initialCats?.[0]?._id ?? "");
    const [productMap, setProductMap] = useState<Record<string, DarazProduct[]>>(initialProductMap ?? {});
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
        initialProductMap ? new Set(Object.keys(initialProductMap)) : new Set()
    );
    const [loading, setLoading]           = useState(!initialCats);
    const [BoxComponent, setBoxComponent] = useState<React.ComponentType<any> | null>(null);

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

    // ── Canvas: lazy-fetch products ───────────────────────────────────────────
    useEffect(() => {
        if (initialCats) return;
        if (!activeTab || loadedTabs.has(activeTab)) return;
        const params = new URLSearchParams({
            type:  "product",
            limit: String(Math.min(Number(limit) || 10, 40)),
            cats:  activeTab,
        });
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

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasTitle   = title.trim() !== "";
    const showTabs   = hasTitle && cats.length > 1;
    const canViewAll = showViewAll !== "false" && categoryIds.length === 1;
    const activeCat  = cats.find((c) => c._id === activeTab);
    const products   = productMap[activeTab] ?? [];
    const isTabLoading = !initialCats && !loadedTabs.has(activeTab);

    // ── Guards ────────────────────────────────────────────────────────────────
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
        <section className="w-full space-y-3">

            {/* ── Header — only when title is set ── */}
            {hasTitle && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2
                        className="text-base sm:text-lg font-bold shrink-0"
                        style={{ color: colors.titleColor || "inherit" }}
                    >
                        {title}
                    </h2>

                    {showTabs && (
                        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden flex-1">
                            {cats.map((cat) => {
                                const isActive = cat._id === activeTab;
                                return (
                                    <button
                                        key={cat._id}
                                        onClick={() => setActiveTab(cat._id)}
                                        className="shrink-0 px-3 py-1 text-xs font-semibold rounded-full border transition-colors"
                                        style={{
                                            backgroundColor: isActive ? (colors.tabActiveBg    || "#f97316") : (colors.tabInactiveBg  || "#fff"),
                                            color:           isActive ? (colors.tabActiveText  || "#fff")    : (colors.tabInactiveText || "#6b7280"),
                                            borderColor:     isActive ? (colors.tabActiveBg    || "#f97316") : "#e5e7eb",
                                        }}
                                    >
                                        {cat.title}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {canViewAll && activeCat && (
                        <Link
                            href={activeCat.url}
                            className="shrink-0 text-xs font-semibold flex items-center gap-0.5"
                            style={{ color: colors.tabActiveBg || "#f97316" }}
                        >
                            View All
                            <Icon icon="mdi:chevron-right" width={14} />
                        </Link>
                    )}
                </div>
            )}

            {/* ── Slider ── */}
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
                <NativeSlider
                    key={activeTab}
                    products={products}
                    BoxComponent={BoxComponent}
                    currencySymbol={currencySymbol}
                    slidesDesktop={slidesDesktop}
                    slidesTablet={slidesTablet}
                    slidesMobile={slidesMobile}
                    slideGap={slideGap}
                    showArrows={showArrows}
                    arrowPosition={arrowPosition}
                    showDots={showDots}
                    dotPosition={dotPosition}
                    autoPlay={autoPlay}
                    autoPlaySpeed={autoPlaySpeed}
                    colors={colors}
                />
            )}
        </section>
    );
}
