"use client";

/**
 * plugin/daraz/elements/Daraz-1.tsx
 *
 * Builder element definition for the Daraz product grid.
 *
 * Controls:
 *   Layout tab:
 *     - Section title (text)
 *     - Box style selector — shows all registered product-box types as
 *       highlighted preview cards; the selected one is highlighted
 *     - Categories multi-select with drag-to-reorder
 *     - Number of products per category
 *     - Show "View All" toggle
 *   Style tab:
 *     - Title colour + typography
 *     - Active tab / inactive tab colours
 *   Advanced tab:
 *     - Margin / padding / alignSelf
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
} from "@/components/builder/controls";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";
import DarazGridClient from "@/plugin/daraz/ui/DarazGridClient";
// ─── Category multi-select with drag-to-reorder ──────────────────────────────

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
            .then((data) => {
                setCats(data.cats ?? []);
                setLoading(false);
            })
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

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-2">
                <Icon icon="svg-spinners:ring-resize" width={14} />
                Loading categories...
            </div>
        );
    }

    if (cats.length === 0) {
        return <p className="text-xs text-gray-400 px-1">No product categories found.</p>;
    }

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
                                className={`flex items-center gap-2 px-1 py-1 rounded cursor-grab hover:bg-orange-50 ${
                                    dragIdx === idx ? "opacity-50" : ""
                                }`}
                            >
                                <Icon icon="mdi:drag" width={14} className="text-gray-300 shrink-0" />
                                <input
                                    type="checkbox"
                                    checked
                                    onChange={() => toggle(id)}
                                    className="w-3.5 h-3.5 accent-orange-500"
                                />
                                <span className="text-xs text-gray-700">{cat.title}</span>
                                <span className="ml-auto text-[10px] text-orange-400 font-semibold">
                                    #{idx + 1}
                                </span>
                            </div>
                        );
                    })}
                    {unselectedCats.length > 0 && (
                        <div className="border-t border-gray-100 my-1" />
                    )}
                </>
            )}

            {unselectedCats.map((cat) => (
                <label
                    key={cat._id}
                    className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50"
                >
                    <span className="w-3.5 shrink-0" />
                    <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggle(cat._id)}
                        className="w-3.5 h-3.5 accent-orange-500"
                    />
                    <span className="text-xs text-gray-700">{cat.title}</span>
                </label>
            ))}
        </div>
    );
}

// ─── Box style selector ───────────────────────────────────────────────────────

function BoxStyleSelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const activePlugins = useActivePlugins();
    const [boxes, setBoxes] = useState<{ label: string; pluginNx: string }[]>([]);

    useEffect(() => {
        if (activePlugins === null) return;
        const registered = getHooks("root.pages").filter(
            (p) => p.type === "product-box" && p.slug === "dynamic"
        );
        setBoxes(registered.map((b) => ({ label: b.label, pluginNx: b.pluginNx ?? "" })));
    }, [activePlugins]);

    if (boxes.length === 0) {
        return (
            <p className="text-xs text-gray-400 px-1">
                No product-box templates registered.
            </p>
        );
    }

    // If no value chosen, treat first box as default selection visually
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
                        {/* Highlight indicator */}
                        <span
                            className={`shrink-0 w-3 h-3 rounded-full border-2 ${
                                isSelected
                                    ? "border-orange-500 bg-orange-500"
                                    : "border-gray-300 bg-white"
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-xs font-semibold leading-tight ${
                                    isSelected ? "text-orange-700" : "text-gray-700"
                                }`}
                            >
                                {box.label}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">
                                {box.pluginNx}
                            </p>
                        </div>
                        {isSelected && (
                            <Icon
                                icon="mdi:check-circle"
                                width={16}
                                className="text-orange-500 shrink-0"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Element definition ───────────────────────────────────────────────────────

const daraz1Element = {
    type:     "daraz-1",
    category: "Products",
    label:    "Daraz Products",
    icon:     "solar:bag-bold",

    schema: {
        content: {
            title:       "",
            categoryIds: [] as string[],
            limit:       8,
            boxStyle:    "",
            showViewAll: "true",
        },
        grid: {
            colsDesktop: 5,
            colsTablet:  4,
            colsMobile:  2,
            cardGap:     12,
        },
        style: {
            titleColor:           "",
            titleHoverColor:      "",
            titleTypography: {
                fontFamily: "", fontSize: 18, fontSizeUnit: "px",
                fontWeight: "700", textTransform: "", fontStyle: "",
                textDecoration: "", lineHeight: 0, lineHeightUnit: "px",
                letterSpacing: 0, letterSpacingUnit: "px",
                wordSpacing: 0, wordSpacingUnit: "px",
            },
            activeTabColor:     "#f97316",
            activeTabTextColor: "#ffffff",
            inactiveTabColor:   "",
            inactiveTabTextColor: "",
        },
        advanced: {
            margin:    { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
            padding:   { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
            alignSelf: "auto",
        },
    },

    controls: [
        // ══════════════════════════════════════════════════════ LAYOUT ════════
        {
            tab:      "Layout",
            section:  "Content",
            controls: [
                {
                    name:       "title",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Section Title" defaultOpen>
                            <Text label="Title" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name:       "boxStyle",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Product Box Style" defaultOpen>
                            <BoxStyleSelector value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name:       "categoryIds",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Categories" defaultOpen>
                            <CategorySorter value={value ?? []} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name:       "limit",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Products Per Category">
                            <NumberControl
                                label="Limit"
                                value={value ?? 8}
                                onChange={onChange}
                                min={2}
                                max={40}
                            />
                        </Section>
                    ),
                },
                {
                    name:       "showViewAll",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="View All Link">
                            <Toggle
                                label="Show View All"
                                value={value !== "false"}
                                onChange={(v: boolean) => onChange(v ? "true" : "false")}
                            />
                        </Section>
                    ),
                },
            ],
        },

        // ── Grid columns + gap ──
        {
            tab:      "Layout",
            section:  "Grid",
            controls: [
                {
                    name:       "colsDesktop",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Desktop columns (≥1280px)" defaultOpen>
                            <NumberControl label="Columns" value={value ?? 5} onChange={onChange} min={1} max={8} showSlider />
                        </Section>
                    ),
                },
                {
                    name:       "colsTablet",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Tablet columns (768–1279px)">
                            <NumberControl label="Columns" value={value ?? 4} onChange={onChange} min={1} max={6} showSlider />
                        </Section>
                    ),
                },
                {
                    name:       "colsMobile",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Mobile columns (<768px)">
                            <NumberControl label="Columns" value={value ?? 2} onChange={onChange} min={1} max={4} showSlider />
                        </Section>
                    ),
                },
                {
                    name:       "cardGap",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Gap between cards (px)">
                            <NumberControl label="Gap" value={value ?? 12} onChange={onChange} min={0} max={48} showSlider unit="px" />
                        </Section>
                    ),
                },
            ],
        },

        // ══════════════════════════════════════════════════════ STYLE ═════════
        {
            tab:      "Style",
            section:  "Title",
            controls: [
                {
                    name:       "titleColor",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Title Colour" defaultOpen>
                            <ColorPickerPopup label="Colour" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name:       "titleTypography",
                    responsive: true,
                    render:     (value: any, onChange: any) => (
                        <Section label="Title Typography">
                            <Typography value={value} onChange={onChange} />
                        </Section>
                    ),
                },
            ],
        },
        {
            tab:      "Style",
            section:  "Active Tab",
            controls: [
                {
                    name:       "activeTabColor",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Active Tab Background" defaultOpen>
                            <ColorPickerPopup
                                label="Background"
                                value={value ?? "#f97316"}
                                onChange={onChange}
                            />
                        </Section>
                    ),
                },
                {
                    name:       "activeTabTextColor",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Active Tab Text">
                            <ColorPickerPopup
                                label="Text Colour"
                                value={value ?? "#ffffff"}
                                onChange={onChange}
                            />
                        </Section>
                    ),
                },
            ],
        },
        {
            tab:      "Style",
            section:  "Inactive Tab",
            controls: [
                {
                    name:       "inactiveTabColor",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Inactive Tab Background" defaultOpen>
                            <ColorPickerPopup label="Background" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
                {
                    name:       "inactiveTabTextColor",
                    responsive: false,
                    render:     (value: any, onChange: any) => (
                        <Section label="Inactive Tab Text">
                            <ColorPickerPopup label="Text Colour" value={value ?? ""} onChange={onChange} />
                        </Section>
                    ),
                },
            ],
        },

        // ══════════════════════════════════════════════════════ ADVANCED ══════
        {
            tab:      "Advanced",
            section:  "Spacing",
            controls: [
                {
                    name:       "margin",
                    responsive: true,
                    render:     (value: any, onChange: any) => (
                        <Dimensions type="margin" value={value} onChange={onChange} />
                    ),
                },
                {
                    name:       "padding",
                    responsive: true,
                    render:     (value: any, onChange: any) => (
                        <Dimensions type="padding" value={value} onChange={onChange} />
                    ),
                },
                {
                    name:       "alignSelf",
                    responsive: true,
                    render:     (value: any, onChange: any) => (
                        <AlignSelf value={value} onChange={onChange} />
                    ),
                },
            ],
        },
    ],

    render: (element: any) => {
        const c = element.schema?.content ?? {};
        const g = element.schema?.grid    ?? {};
        return (
            <DarazGridClient
                title={c.title           ?? ""}
                categoryIds={c.categoryIds ?? []}
                limit={c.limit           ?? 8}
                boxStyle={c.boxStyle       ?? ""}
                showViewAll={c.showViewAll ?? "true"}
                colsDesktop={g.colsDesktop ?? 5}
                colsTablet={g.colsTablet   ?? 4}
                colsMobile={g.colsMobile   ?? 2}
                cardGap={g.cardGap         ?? 12}
            />
        );
    },
};

export default daraz1Element;
