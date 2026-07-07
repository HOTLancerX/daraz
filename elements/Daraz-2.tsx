"use client";

/**
 * plugin/daraz/elements/Daraz-2.tsx
 *
 * Builder element definition — Daraz Product Slider.
 *
 * Full control panel:
 *
 *  Layout tab
 *  ├─ Content
 *  │   ├─ Section title
 *  │   ├─ Box style selector (all registered product-box types, highlighted)
 *  │   ├─ Category multi-select with drag-to-reorder
 *  │   ├─ Products per category (limit)
 *  │   └─ Show "View All" toggle
 *  ├─ Slider
 *  │   ├─ Slides on desktop  (1–8)
 *  │   ├─ Slides on tablet   (1–6)
 *  │   ├─ Slides on mobile   (1–4)
 *  │   ├─ Gap between slides (px)
 *  │   ├─ Infinite loop
 *  │   ├─ Auto-play
 *  │   └─ Auto-play speed (ms)
 *  ├─ Arrows
 *  │   ├─ Show arrows toggle
 *  │   └─ Arrow position (inside / outside)
 *  └─ Dots
 *      ├─ Show dots toggle
 *      └─ Dot position (inside bottom / outside)
 *
 *  Style tab
 *  ├─ Title — colour + typography
 *  ├─ Arrows — colour, background, hover colour, hover background
 *  ├─ Dots — normal colour + active colour
 *  └─ Tabs — active bg/text, inactive bg/text
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
    Tabs,
    Typography,
    Toggle,
    Select,
    ButtonGroup,
} from "@/components/builder/controls";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";
import DarazSliderClient from "@/plugin/daraz/ui/DarazSliderClient";
// ─── Category sorter (same as Daraz-1 element) ────────────────────────────────

interface Cat {
    _id: string;
    title: string;
}

function CategorySorter({
    value,
    onChange,
}: {
    value: string[];
    onChange: (v: string[]) => void;
}) {
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

    if (loading)
        return (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-2">
                <Icon icon="svg-spinners:ring-resize" width={14} /> Loading categories...
            </div>
        );

    if (cats.length === 0)
        return <p className="text-xs text-gray-400 px-1">No product categories found.</p>;

    const selectedIds    = value.filter((id) => cats.some((c) => c._id === id));
    const unselectedCats = cats.filter((c) => !selectedIds.includes(c._id));
    const catById        = Object.fromEntries(cats.map((c) => [c._id, c]));

    return (
        <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50">
                <input
                    type="checkbox"
                    checked={value.length === 0}
                    onChange={() => onChange([])}
                    className="w-3.5 h-3.5 accent-orange-500"
                />
                <span className="text-xs text-gray-700 font-medium">All categories</span>
            </label>
            <div className="border-t border-gray-100 my-1" />
            {selectedIds.length > 0 && (
                <>
                    <p className="text-[10px] text-gray-400 px-1 uppercase tracking-wide font-semibold">
                        Selected (drag to reorder)
                    </p>
                    {selectedIds.map((id, idx) => {
                        const cat = catById[id];
                        if (!cat) return null;
                        return (
                            <div
                                key={id}
                                draggable
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(idx)}
                                className={`flex items-center gap-2 px-1 py-1 rounded cursor-grab hover:bg-orange-50 ${dragIdx === idx ? "opacity-50" : ""}`}
                            >
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

// ─── Box style selector ───────────────────────────────────────────────────────

function BoxStyleSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const activePlugins = useActivePlugins();
    const [boxes, setBoxes] = useState<{ label: string; pluginNx: string }[]>([]);

    useEffect(() => {
        if (activePlugins === null) return;
        const registered = getHooks("root.pages").filter(
            (p) => p.type === "product-box" && p.slug === "dynamic"
        );
        setBoxes(registered.map((b) => ({ label: b.label, pluginNx: b.pluginNx ?? "" })));
    }, [activePlugins]);

    if (boxes.length === 0)
        return <p className="text-xs text-gray-400 px-1">No product-box templates registered.</p>;

    const activeLabel = value || boxes[0]?.label;

    return (
        <div className="flex flex-col gap-1.5">
            {boxes.map((box) => {
                const isSelected = box.label === activeLabel;
                return (
                    <button
                        key={`${box.label}::${box.pluginNx}`}
                        type="button"
                        onClick={() => onChange(box.label)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                            isSelected
                                ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300"
                                : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                        }`}
                    >
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

// ─── Default schema ───────────────────────────────────────────────────────────

const DEFAULT_SCHEMA = {
    content: {
        title:         "",
        categoryIds:   [] as string[],
        limit:         10,
        boxStyle:      "",
        showViewAll:   "true",
    },
    slider: {
        slidesDesktop:  4,
        slidesTablet:   3,
        slidesMobile:   2,
        slideGap:       12,
        infinite:       "true",
        autoPlay:       "false",
        autoPlaySpeed:  3000,
        showArrows:     "true",
        arrowPosition:  "inside",
        showDots:       "true",
        dotPosition:    "inside",
    },
    style: {
        titleColor:          "",
        titleTypography: {
            fontFamily: "", fontSize: 18, fontSizeUnit: "px",
            fontWeight: "700", textTransform: "", fontStyle: "",
            textDecoration: "", lineHeight: 0, lineHeightUnit: "px",
            letterSpacing: 0, letterSpacingUnit: "px",
            wordSpacing: 0, wordSpacingUnit: "px",
        },
        arrowColor:          "#374151",
        arrowBg:             "rgba(255,255,255,0.9)",
        arrowHoverColor:     "#ffffff",
        arrowHoverBg:        "#f97316",
        dotColor:            "#d1d5db",
        dotActiveColor:      "#f97316",
        tabActiveBg:         "#f97316",
        tabActiveText:       "#ffffff",
        tabInactiveBg:       "",
        tabInactiveText:     "",
    },
    advanced: {
        margin:    { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
        padding:   { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
        alignSelf: "auto",
    },
};

// ─── Element definition ───────────────────────────────────────────────────────

const daraz2Element = {
    type:     "daraz-2",
    category: "Products",
    label:    "Daraz Slider",
    icon:     "solar:bag-smile-bold",

    schema: DEFAULT_SCHEMA,

    controls: [

        // ════════════════════════════════════════════════════ LAYOUT ══════════

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
                    name: "limit", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Products Per Category">
                            <NumberControl label="Limit" value={value ?? 10} onChange={onChange} min={2} max={40} />
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

        // ── Slider settings ──
        {
            tab: "Layout", section: "Slides Per Row",
            controls: [
                {
                    name: "slidesDesktop", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Desktop (≥1024px)" defaultOpen>
                            <NumberControl label="Slides" value={value ?? 4} onChange={onChange} min={1} max={8} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "slidesTablet", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Tablet (640–1023px)">
                            <NumberControl label="Slides" value={value ?? 3} onChange={onChange} min={1} max={6} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "slidesMobile", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Mobile (<640px)">
                            <NumberControl label="Slides" value={value ?? 2} onChange={onChange} min={1} max={4} showSlider />
                        </Section>
                    ),
                },
                {
                    name: "slideGap", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Gap Between Slides (px)">
                            <NumberControl label="Gap" value={value ?? 12} onChange={onChange} min={0} max={40} showSlider unit="px" />
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Layout", section: "Playback",
            controls: [
                {
                    name: "infinite", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Infinite Loop" defaultOpen>
                            <Toggle label="Infinite" value={value !== "false"} onChange={(v: boolean) => onChange(v ? "true" : "false")} />
                        </Section>
                    ),
                },
                {
                    name: "autoPlay", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Auto Play">
                            <Toggle label="Auto Play" value={value === "true"} onChange={(v: boolean) => onChange(v ? "true" : "false")} />
                        </Section>
                    ),
                },
                {
                    name: "autoPlaySpeed", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Auto Play Speed (ms)">
                            <NumberControl label="Speed" value={value ?? 3000} onChange={onChange} min={500} max={10000} step={100} showSlider={false} />
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Layout", section: "Arrows",
            controls: [
                {
                    name: "showArrows", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Show Arrows" defaultOpen>
                            <Toggle label="Visible" value={value !== "false"} onChange={(v: boolean) => onChange(v ? "true" : "false")} />
                        </Section>
                    ),
                },
                {
                    name: "arrowPosition", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Arrow Position">
                            <ButtonGroup
                                label="Position"
                                value={value ?? "inside"}
                                onChange={onChange}
                                deselectable={false}
                                options={[
                                    { value: "inside",  label: "Inside" },
                                    { value: "outside", label: "Outside" },
                                ]}
                            />
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Layout", section: "Dots",
            controls: [
                {
                    name: "showDots", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Show Dots" defaultOpen>
                            <Toggle label="Visible" value={value !== "false"} onChange={(v: boolean) => onChange(v ? "true" : "false")} />
                        </Section>
                    ),
                },
                {
                    name: "dotPosition", responsive: false,
                    render: (value: any, onChange: any) => (
                        <Section label="Dot Position">
                            <ButtonGroup
                                label="Position"
                                value={value ?? "inside"}
                                onChange={onChange}
                                deselectable={false}
                                options={[
                                    { value: "inside",  label: "Inside" },
                                    { value: "outside", label: "Outside" },
                                ]}
                            />
                        </Section>
                    ),
                },
            ],
        },

        // ════════════════════════════════════════════════════ STYLE ═══════════

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
            tab: "Style", section: "Arrows",
            controls: [
                {
                    name: "arrowColor", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Arrow Colours" defaultOpen>
                            <Tabs tabs={[
                                {
                                    label: "Normal",
                                    content: (
                                        <div className="flex flex-col gap-2 pt-1">
                                            <ColorPickerPopup label="Icon Colour" value={value ?? "#374151"} onChange={onChange} />
                                            <ColorPickerPopup
                                                label="Background"
                                                value={schema.style?.arrowBg ?? "rgba(255,255,255,0.9)"}
                                                onChange={(v: string) => updateSchema("style", "arrowBg", v)}
                                            />
                                        </div>
                                    ),
                                },
                                {
                                    label: "Hover",
                                    content: (
                                        <div className="flex flex-col gap-2 pt-1">
                                            <ColorPickerPopup
                                                label="Icon Colour"
                                                value={schema.style?.arrowHoverColor ?? "#ffffff"}
                                                onChange={(v: string) => updateSchema("style", "arrowHoverColor", v)}
                                            />
                                            <ColorPickerPopup
                                                label="Background"
                                                value={schema.style?.arrowHoverBg ?? "#f97316"}
                                                onChange={(v: string) => updateSchema("style", "arrowHoverBg", v)}
                                            />
                                        </div>
                                    ),
                                },
                            ]} />
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Style", section: "Dots",
            controls: [
                {
                    name: "dotColor", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Dot Colours" defaultOpen>
                            <div className="flex flex-col gap-2">
                                <ColorPickerPopup label="Dot Colour (normal)" value={value ?? "#d1d5db"} onChange={onChange} />
                                <ColorPickerPopup
                                    label="Dot Colour (active)"
                                    value={schema.style?.dotActiveColor ?? "#f97316"}
                                    onChange={(v: string) => updateSchema("style", "dotActiveColor", v)}
                                />
                            </div>
                        </Section>
                    ),
                },
            ],
        },

        {
            tab: "Style", section: "Category Tabs",
            controls: [
                {
                    name: "tabActiveBg", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Active Tab" defaultOpen>
                            <div className="flex flex-col gap-2">
                                <ColorPickerPopup label="Background" value={value ?? "#f97316"} onChange={onChange} />
                                <ColorPickerPopup
                                    label="Text"
                                    value={schema.style?.tabActiveText ?? "#ffffff"}
                                    onChange={(v: string) => updateSchema("style", "tabActiveText", v)}
                                />
                            </div>
                        </Section>
                    ),
                },
                {
                    name: "tabInactiveBg", responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Inactive Tab">
                            <div className="flex flex-col gap-2">
                                <ColorPickerPopup label="Background" value={value ?? ""} onChange={onChange} />
                                <ColorPickerPopup
                                    label="Text"
                                    value={schema.style?.tabInactiveText ?? ""}
                                    onChange={(v: string) => updateSchema("style", "tabInactiveText", v)}
                                />
                            </div>
                        </Section>
                    ),
                },
            ],
        },

        // ════════════════════════════════════════════════════ ADVANCED ════════
        {
            tab: "Advanced", section: "Spacing",
            controls: [
                {
                    name: "margin", responsive: true,
                    render: (value: any, onChange: any) => (
                        <Dimensions type="margin" value={value} onChange={onChange} />
                    ),
                },
                {
                    name: "padding", responsive: true,
                    render: (value: any, onChange: any) => (
                        <Dimensions type="padding" value={value} onChange={onChange} />
                    ),
                },
                {
                    name: "alignSelf", responsive: true,
                    render: (value: any, onChange: any) => (
                        <AlignSelf value={value} onChange={onChange} />
                    ),
                },
            ],
        },
    ],

    render: (element: any) => {
        const c = element.schema?.content ?? {};
        const sl = element.schema?.slider  ?? {};
        const s  = element.schema?.style   ?? {};
        return (
            <DarazSliderClient
                title={c.title            ?? ""}
                categoryIds={c.categoryIds  ?? []}
                limit={c.limit            ?? 10}
                boxStyle={c.boxStyle        ?? ""}
                showViewAll={c.showViewAll  ?? "true"}
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
    },
};

export default daraz2Element;
