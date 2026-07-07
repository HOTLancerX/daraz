"use client";

/**
 * plugin/daraz/ui/DarazSliderClient.tsx
 *
 * Category-tabbed product slider built on Embla Carousel.
 *
 * Why Embla instead of react-slick:
 *  - Native CSS gap — no hacks needed
 *  - React 19 + Next.js compatible, zero extra dependencies
 *  - Full TypeScript support
 *  - Fully headless — arrows, dots and all UI are custom JSX
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

import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
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
            className="flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-all focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
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

// ─── Slider core (Embla) ─────────────────────────────────────────────────────

function EmblaSlider({
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
    infinite,
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
    infinite:       string;
    colors:         DarazSliderColors;
}) {
    const autoplayPlugin = autoPlay === "true"
        ? Autoplay({ delay: Math.max(Number(autoPlaySpeed) || 3000, 500), stopOnInteraction: true })
        : undefined;

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop:      infinite !== "false",
            align:     "start",
            slidesToScroll: 1,
        },
        autoplayPlugin ? [autoplayPlugin] : []
    );

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [canPrev, setCanPrev]             = useState(false);
    const [canNext, setCanNext]             = useState(false);
    const [scrollSnaps, setScrollSnaps]     = useState<number[]>([]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanPrev(emblaApi.canScrollPrev());
        setCanNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
        return () => { emblaApi.off("select", onSelect); emblaApi.off("reInit", onSelect); };
    }, [emblaApi, onSelect]);

    const scrollPrev = () => emblaApi?.scrollPrev();
    const scrollNext = () => emblaApi?.scrollNext();
    const scrollTo   = (i: number) => emblaApi?.scrollTo(i);

    const arrowsVisible  = showArrows !== "false";
    const dotsVisible    = showDots   !== "false";
    const dotsOutside    = dotPosition  === "outside";
    const arrowsOutside  = arrowPosition === "outside";

    // Responsive: CSS custom properties on the viewport handle column count.
    // We inject a small <style> block scoped to this element to avoid
    // global side effects. Embla just needs 'flex' slides with a fixed width.
    const safeDesktop = Math.max(Number(slidesDesktop) || 4, 1);
    const safeTablet  = Math.max(Number(slidesTablet)  || 3, 1);
    const safeMobile  = Math.max(Number(slidesMobile)  || 2, 1);
    const uid         = `emb-${products[0]?._id?.slice(-5) ?? "x"}`;

    return (
        <div className="w-full space-y-2">
            <style>{`
                #${uid} .emb-slide {
                    flex: 0 0 calc(100% / ${safeMobile});
                    min-width: 0;
                }
                @media (min-width: 640px) {
                    #${uid} .emb-slide {
                        flex: 0 0 calc(100% / ${safeTablet});
                    }
                }
                @media (min-width: 1024px) {
                    #${uid} .emb-slide {
                        flex: 0 0 calc(100% / ${safeDesktop});
                    }
                }
            `}</style>

            {/* Slider + outside arrows layout */}
            <div id={uid} className="relative">
                <div className={`flex items-center gap-2 ${arrowsOutside ? "" : ""}`}>
                    {/* Prev arrow — outside left */}
                    {arrowsVisible && arrowsOutside && (
                        <ArrowBtn dir="prev" onClick={scrollPrev} colors={colors} disabled={!canPrev} />
                    )}

                    {/* Viewport */}
                    <div className="overflow-hidden flex-1 min-w-0" ref={emblaRef}>
                        <div
                            className="flex"
                            style={{ gap: slideGap }}
                        >
                            {products.map((product) => (
                                <div key={product._id} className="emb-slide shrink-0">
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
                    </div>

                    {/* Next arrow — outside right */}
                    {arrowsVisible && arrowsOutside && (
                        <ArrowBtn dir="next" onClick={scrollNext} colors={colors} disabled={!canNext} />
                    )}
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
                {dotsVisible && !dotsOutside && scrollSnaps.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0">
                        <Dots
                            count={scrollSnaps.length}
                            selected={selectedIndex}
                            onSelect={scrollTo}
                            colors={colors}
                        />
                    </div>
                )}
            </div>

            {/* Dots — outside (normal flow, below slider) */}
            {dotsVisible && dotsOutside && scrollSnaps.length > 1 && (
                <Dots
                    count={scrollSnaps.length}
                    selected={selectedIndex}
                    onSelect={scrollTo}
                    colors={colors}
                />
            )}

            {/* Bottom padding when dots are inside so they don't overlap cards */}
            {dotsVisible && !dotsOutside && scrollSnaps.length > 1 && (
                <div style={{ height: 32 }} />
            )}
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
                <EmblaSlider
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
                    infinite={infinite}
                    colors={colors}
                />
            )}
        </section>
    );
}
