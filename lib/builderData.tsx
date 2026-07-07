/**
 * plugin/daraz/lib/builderData.tsx
 *
 * SERVER-ONLY. Registers server-side renderers for daraz builder elements.
 *
 * Auto-discovered by hook/builderDataHooks.ts via require.context.
 * Each call to registerBuilderElement maps an element type string to an
 * async server component factory — Builder.tsx renders these server-side
 * with zero client-side data fetching.
 */

import { registerBuilderElement } from "@/hook/builderDataHooks";
import DarazGrid from "@/plugin/daraz/ui/DarazGrid";
import DarazSlider from "@/plugin/daraz/ui/DarazSlider";
import DarazLoadMore from "@/plugin/daraz/ui/DarazLoadMore";

// ── daraz-1: category-tabbed product grid ─────────────────────────────────────

registerBuilderElement("daraz-1", (schema) => {
    const c  = schema?.content ?? {};
    const g  = schema?.grid    ?? {};
    const s  = schema?.style   ?? {};

    return (
        <DarazGrid
            title={c.title           ?? ""}
            categoryIds={c.categoryIds ?? []}
            limit={c.limit           ?? 8}
            boxStyle={c.boxStyle       ?? ""}
            showViewAll={c.showViewAll ?? "true"}
            currencySymbol={s.currencySymbol ?? undefined}
            colsDesktop={g.colsDesktop ?? 5}
            colsTablet={g.colsTablet   ?? 4}
            colsMobile={g.colsMobile   ?? 2}
            cardGap={g.cardGap         ?? 12}
        />
    );
});

// ── daraz-3: load-more / infinite-scroll product grid ────────────────────────

registerBuilderElement("daraz-3", (schema) => {
    const c  = schema?.content  ?? {};
    const g  = schema?.grid     ?? {};
    const lm = schema?.loadmore ?? {};
    const s  = schema?.style    ?? {};

    return (
        <DarazLoadMore
            title={c.title           ?? ""}
            categoryIds={c.categoryIds ?? []}
            boxStyle={c.boxStyle       ?? ""}
            showViewAll={c.showViewAll ?? "true"}
            initialCount={lm.initialCount    ?? 8}
            loadStep={lm.loadStep            ?? 8}
            loadMode={lm.loadMode            ?? "button"}
            btnText={lm.btnText              ?? "∞ Load More"}
            scrollThreshold={lm.scrollThreshold ?? 200}
            colsDesktop={g.colsDesktop ?? 5}
            colsTablet={g.colsTablet   ?? 4}
            colsMobile={g.colsMobile   ?? 2}
            cardGap={g.cardGap         ?? 12}
            colors={{
                titleColor:     s.titleColor     || "",
                btnBg:          s.btnBg          || "#f97316",
                btnText:        s.btnText        || "#ffffff",
                btnHoverBg:     s.btnHoverBg     || "#ea6c00",
                btnHoverText:   s.btnHoverText   || "#ffffff",
                btnBorderColor: s.btnBorderColor || "",
            }}
        />
    );
});

registerBuilderElement("daraz-2", (schema) => {
    const c  = schema?.content ?? {};
    const sl = schema?.slider  ?? {};
    const s  = schema?.style   ?? {};

    return (
        <DarazSlider
            title={c.title           ?? ""}
            categoryIds={c.categoryIds ?? []}
            limit={c.limit           ?? 10}
            boxStyle={c.boxStyle       ?? ""}
            showViewAll={c.showViewAll ?? "true"}
            slidesDesktop={sl.slidesDesktop  ?? 4}
            slidesTablet={sl.slidesTablet    ?? 3}
            slidesMobile={sl.slidesMobile    ?? 2}
            slideGap={sl.slideGap            ?? 12}
            infinite={sl.infinite            ?? "true"}
            autoPlay={sl.autoPlay            ?? "false"}
            autoPlaySpeed={sl.autoPlaySpeed  ?? 3000}
            showArrows={sl.showArrows        ?? "true"}
            arrowPosition={sl.arrowPosition  ?? "inside"}
            showDots={sl.showDots            ?? "true"}
            dotPosition={sl.dotPosition      ?? "inside"}
            colors={{
                arrowColor:      s.arrowColor      || "#374151",
                arrowBg:         s.arrowBg         || "rgba(255,255,255,0.9)",
                arrowHoverColor: s.arrowHoverColor || "#ffffff",
                arrowHoverBg:    s.arrowHoverBg    || "#f97316",
                dotColor:        s.dotColor        || "#d1d5db",
                dotActiveColor:  s.dotActiveColor  || "#f97316",
                tabActiveBg:     s.tabActiveBg     || "#f97316",
                tabActiveText:   s.tabActiveText   || "#ffffff",
                tabInactiveBg:   s.tabInactiveBg   || "",
                tabInactiveText: s.tabInactiveText || "",
                titleColor:      s.titleColor      || "",
            }}
        />
    );
});
