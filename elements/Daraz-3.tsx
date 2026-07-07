"use client";

/**
 * plugin/daraz/elements/Daraz-3.tsx
 *
 * Builder element — Daraz Load More grid.
 *
 * Identical grid + category + box-style controls as Daraz-1,
 * plus a dedicated "Load More" section:
 *
 *  Layout tab
 *  ├─ Content
 *  │   ├─ Section title
 *  │   ├─ Box style selector
 *  │   ├─ Categories multi-select
 *  │   └─ Show View All toggle
 *  ├─ Grid  (same as Daraz-1)
 *  │   ├─ Desktop / tablet / mobile columns
 *  │   └─ Card gap
 *  └─ Load More
 *      ├─ Initial products shown
 *      ├─ How many to add per load
 *      ├─ Mode: Button / Infinite Scroll / Both
 *      ├─ Button text (default "∞ Load More")
 *      └─ Scroll threshold (px before bottom)
 *
 *  Style tab
 *  ├─ Title colour + typography
 *  └─ Button colours (bg, text, hover bg, hover text, border)
 *
 *  Advanced tab — margin / padding / alignSelf
 */

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    Text,
    NumberControl,
    Dimensions,
    AlignSelf,
    Section,
    ColorPickerPopup,
    Typography,
    Toggle,
    Select,
    ButtonGroup,
} from "@/components/builder/controls";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";
import DarazLoadMoreClient from "@/plugin/daraz/ui/DarazLoadMoreClient";

// ─── Shared sub-components (identical to Daraz-1) ────────────────────────────

interface Cat { _id: string; title: string; }

function CategorySorter({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [cats, setCats]       = useState<Cat[]>([]);
    const [loading, setLoading] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    useEffect(() => {
        setLoading(true);
        xFetch("/builder-post/cats?type=product-category")
            .then((r) => r.json())
            .then((d) => { setCats(d.cats ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const toggle = (id: string) =>
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

    const handleDrop = (toIdx: number) => {
        if (dragIdx === null || dragIdx === toIdx) return;
        const next = [...value];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        onChange(next);
        setDragIdx(null);
    };

    if (loading) return (
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-2">
            <Icon icon="svg-spinners:ring-resize" width={14} /> Loading categories...
        </div>
    );
    if (cats.length === 0) return <p className="text-xs text-gray-400 px-1">No product categories found.</p>;

    const selectedIds    = value.filter((id) => cats.some((c) => c._id === id));
    const unselectedCats = cats.filter((c) => !selectedIds.includes(c._id));
    const catById        = Object.fromEntries(cats.map((c) => [c._id, c]));

    return (
        <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} className="w-3.5 h-3.5 accent-orange-500" />
                <span className="text-xs text-gray-700 font-medium">All categories</span>
            </label>
            <div className="border-t border-gray-100 my-1" />
            {selectedIds.length > 0 && (
                <>
                    <p className="text-[10px] text-gray-400 px-1 uppercase tracking-wide font-semibold">Selected (drag to reorder)</p>
                    {selectedIds.map((id, idx) => {
                        const cat = catById[id];
                        if (!cat) return null;
                        return (
                            <div key={id} draggable onDragStart={() => setDragIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(idx)}
                                className={`flex items-center gap-2 px-1 py-1 rounded cursor-grab hover:bg-orange-50 ${dragIdx === idx ? "opacity-50" : ""}`}>
                                <Icon icon="mdi:drag" width={14} className="text-gray-300 shrink-0" />
                                <input type="checkbox" checked onChange={() => toggle(id)} className="w-3.5 h-3.5 accent-orange-500" />
                                <span className="text-xs text-gray-700">{cat.title}</span>
                                <span className="ml-auto text-[10px] text-orange-400 font-semibold">#{idx + 1}</span>
                            </div>
                        );
                    })}
                    {unselectedCats.length > 0 && <div className="border-t border-gray-100 my-1" />}
                </>
            )}
            {unselectedCats.map((cat) => (
                <label key={cat._id} className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50">
                    <span className="w-3.5 shrink-0" />
                    <input type="checkbox" checked={false} onChange={() => toggle(cat._id)} className="w-3.5 h-3.5 accent-orange-500" />
                    <span className="text-xs text-gray-700">{cat.title}</span>
                </label>
            ))}
        </div>
    );
}

function BoxStyleSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const activePlugins = useActivePlugins();
    const [boxes, setBoxes] = useState<{ label: string; pluginNx: string }[]>([]);

    useEffect(() => {
        if (activePlugins === null) return;
        const registered = getHooks("root.pages").filter((p) => p.type === "product-box" && p.slug === "dynamic");
        setBoxes(registered.map((b) => ({ label: b.label, pluginNx: b.pluginNx ?? "" })));
    }, [activePlugins]);

    if (boxes.length === 0) return <p className="text-xs text-gray-400 px-1">No product-box templates registered.</p>;

    const activeLabel = value || boxes[0]?.label;
    return (
        <div className="flex flex-col gap-1.5">
            {boxes.map((box) => {
                const isSelected = box.label === activeLabel;
                return (
                    <button key={`${box.label}::${box.pluginNx}`} type="button" onClick={() => onChange(box.label)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${isSelected ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300" : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"}`}>
                        <span className={`shrink-0 w-3 h-3 rounded-full border-2 ${isSelected ? "border-orange-500 bg-orange-500" : "border-gray-300 bg-white"}`} />
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-tight ${isSelected ? "text-orange-700" : "text-gray-700"}`}>{box.label}</p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">{box.pluginNx}</p>
                        </div>
                        {isSelected && <Icon icon="mdi:check-circle" width={16} className="text-orange-500 shrink-0" />}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Element definition ───────────────────────────────────────────────────────

const daraz3Element = {
    type:     "daraz-3",
    category: "Products",
    label:    "Daraz Load More",
    icon:     "solar:bag-plus-bold",

    schema: {
        content: {
            title:       "",
            categoryIds: [] as string[],
            boxStyle:    "",
            showViewAll: "true",
        },
        grid: {
            colsDesktop: 5,
            colsTablet:  4,
            colsMobile:  2,
            cardGap:     12,
        },
        loadmore: {
            initialCount:    8,
            loadStep:        8,
            loadMode:        "button",   // "button" | "infinite" | "both"
            btnText:         "∞ Load More",
            scrollThreshold: 200,
        },
        style: {
            titleColor:     "",
            titleTypography: {
                fontFamily: "", fontSize: 18, fontSizeUnit: "px",
                fontWeight: "700", textTransform: "", fontStyle: "",
                textDecoration: "", lineHeight: 0, lineHeightUnit: "px",
                letterSpacing: 0, letterSpacingUnit: "px",
                wordSpacing: 0, wordSpacingUnit: "px",
            },
            btnBg:          "#f97316",
            btnText:        "#ffffff",
            btnHoverBg:     "#ea6c00",
            btnHoverText:   "#ffffff",
            btnBorderColor: "",
        },
        advanced: {
            margin:    { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
            padding:   { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
            alignSelf: "auto",
        },
    },

    controls: [
        // ═══════════════════════════════════════════════════ LAYOUT ══════════

        // ── Content ──
        {
            tab: "Layout", section: "Content",
            controls: [
                {
                    name: "title", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Section Title" defaultOpen>
                            <Text label="Title" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name: "boxStyle", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Product Box Style" defaultOpen>
                            <BoxStyleSelector value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name: "categoryIds", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Categories" defaultOpen>
                            <CategorySorter value={value ?? []} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name: "showViewAll", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="View All Link">
                            <Toggle label="Show View All" value={value !== "false"} onChange={(v: boolean) => onChange(v ? "true" : "false")} />
                        </Section>
                    ),
                },
            ],
        },

        // ── Grid ──
        {
            tab: "Layout", section: "Grid",
            controls: [
                {
                    name: "colsDesktop", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Desktop columns (≥1280px)" defaultOpen>
                            <NumberControl label="Columns" value={value ?? 5} onChange={onChange} min={1} max={8} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "colsTablet", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Tablet columns (768–1279px)">
                            <NumberControl label="Columns" value={value ?? 4} onChange={onChange} min={1} max={6} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "colsMobile", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Mobile columns (<768px)">
                            <NumberControl label="Columns" value={value ?? 2} onChange={onChange} min={1} max={4} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "cardGap", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Gap between cards (px)">
                            <NumberControl label="Gap" value={value ?? 12} onChange={onChange} min={0} max={48} showSlider unit="px" />
                        </Section>
                    ),
                },
            ],
        },

        // ── Load More ──
        {
            tab: "Layout", section: "Load More",
            controls: [
                {
                    name: "initialCount", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Initial products shown" defaultOpen>
                            <NumberControl label="Count" value={value ?? 8} onChange={onChange} min={1} max={100} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "loadStep", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Products added per load">
                            <NumberControl label="Step" value={value ?? 8} onChange={onChange} min={1} max={100} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "loadMode", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Load mode">
                            <ButtonGroup
                                label="Mode"
                                value={value ?? "button"}
                                onChange={onChange}
                                deselectable={false}
                                options={[
                                    { value: "button",   label: "Button" },
                                    { value: "infinite", label: "Scroll" },
                                    { value: "both",     label: "Both" },
                                ]}
                            />
                        </Section>
                    ),
                },
                {
                    name: "btnText", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Button text">
                            <Text label='Text (use ∞ for infinity symbol)' value={value ?? "∞ Load More"} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name: "scrollThreshold", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Scroll trigger distance (px from bottom)">
                            <NumberControl label="Threshold" value={value ?? 200} onChange={onChange} min={0} max={800} showSlider unit="px" />
                        </Section>
                    ),
                },
            ],
        },

        // ═══════════════════════════════════════════════════ STYLE ═══════════

        {
            tab: "Style", section: "Title",
            controls: [
                {
                    name: "titleColor", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Title Colour" defaultOpen>
                            <ColorPickerPopup label="Colour" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name: "titleTypography", responsive: true,
                    render: (value: any, onChange: any) => (
                        <Section label="Title Typography">
                            <Typography value={value} onChange={onChange} />
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Style", section: "Load More Button",
            controls: [
                {
                    name: "btnBg", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Button colours" defaultOpen>
                            <div className="flex flex-col gap-2">
                                <ColorPickerPopup label="Background" value={value ?? "#f97316"} onChange={onChange} />
                                <ColorPickerPopup label="Text"
                                    value={schema.style?.btnText ?? "#ffffff"}
                                    onChange={(v: string) => updateSchema("style", "btnText", v)} />
                                <ColorPickerPopup label="Border"
                                    value={schema.style?.btnBorderColor ?? ""}
                                    onChange={(v: string) => updateSchema("style", "btnBorderColor", v)} />
                            </div>
                        </Section>
                    ),
                },
                {
                    name: "btnHoverBg", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Button hover colours">
                            <div className="flex flex-col gap-2">
                                <ColorPickerPopup label="Background" value={value ?? "#ea6c00"} onChange={onChange} />
                                <ColorPickerPopup label="Text"
                                    value={schema.style?.btnHoverText ?? "#ffffff"}
                                    onChange={(v: string) => updateSchema("style", "btnHoverText", v)} />
                            </div>
                        </Section>
                    ),
                },
            ],
        },

        // ═══════════════════════════════════════════════════ ADVANCED ════════
        {
            tab: "Advanced", section: "Spacing",
            controls: [
                {
                    name: "margin", responsive: true,
                    render: (value: any, onChange: any) => <Dimensions type="margin" value={value} onChange={onChange} />,
                },
                {
                    name: "padding", responsive: true,
                    render: (value: any, onChange: any) => <Dimensions type="padding" value={value} onChange={onChange} />,
                },
                {
                    name: "alignSelf", responsive: true,
                    render: (value: any, onChange: any) => <AlignSelf value={value} onChange={onChange} />,
                },
            ],
        },
    ],

    render: (element: any) => {
        const c  = element.schema?.content  ?? {};
        const g  = element.schema?.grid     ?? {};
        const lm = element.schema?.loadmore ?? {};
        const s  = element.schema?.style    ?? {};
        return (
            <DarazLoadMoreClient
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
    },
};

export default daraz3Element;
