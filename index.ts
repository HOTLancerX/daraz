/**
 * plugin/daraz/index.ts
 *
 * Daraz plugin.
 *
 * Registers:
 *   - Three product-box templates (Daraz Box 1 / 2 / 3)
 *   - A "Daraz Products" builder element with:
 *       - Box style selector (all registered product-box types, highlighted)
 *       - Multi-category selector with drag-to-reorder
 *       - Per-category product count control
 *       - Show/hide "View All" toggle
 *
 * Uses the core product plugin's post type ("product") and category
 * type ("product-category") — no new post/cat types are registered here.
 *
 * NO server-only / Mongoose imports here.
 */

import { addHook, addBuilderElement, type PluginMeta } from "@/hook";
import DarazBox1 from "./box/Daraz-1";
import DarazBox2 from "./box/Daraz-2";
import DarazBox3 from "./box/Daraz-3";
import daraz1Element from "./elements/Daraz-1";
import daraz2Element from "./elements/Daraz-2";
import daraz3Element from "./elements/Daraz-3";

// ─── Plugin metadata ──────────────────────────────────────────────────────────

export const PLUGINS: PluginMeta = {
    nx:          "com.system.daraz",
    name:        "daraz",
    version:     "1.0.0",
    description: "Daraz-style product box templates, a multi-category product grid, and a product slider builder element.",
    author:      "System",
    path:        "https://github.com/HOTLancerX/daraz.git",
    icon:        "solar:bag-bold",
    color:       "from-orange-500 to-amber-500",
};

// ─── Register ─────────────────────────────────────────────────────────────────

export function register(): void {
    // ── Product box templates ──────────────────────────────────────────────
    // type: "product-box" — shown in the Template manager and used by any
    // product-category layout that resolves the active box from the registry.
    addHook("root.pages", [
        {
            key:      "product-box",
            label:    "Daraz Box 1",
            type:     "product-box",
            slug:     "dynamic",
            style:    "left",
            position: 30,
            active:   false,
            component: DarazBox1,
        },
        {
            key:      "product-box",
            label:    "Daraz Box 2",
            type:     "product-box",
            slug:     "dynamic",
            style:    "left",
            position: 31,
            active:   false,
            component: DarazBox2,
        },
        {
            key:      "product-box",
            label:    "Daraz Box 3",
            type:     "product-box",
            slug:     "dynamic",
            style:    "left",
            position: 32,
            active:   false,
            component: DarazBox3,
        },
    ], PLUGINS.nx);

    // ── Builder elements ───────────────────────────────────────────────────
    // "Daraz Products"  — category-tabbed product grid
    addBuilderElement(daraz1Element, PLUGINS.nx);
    // "Daraz Slider"    — category-tabbed product carousel (Embla)
    addBuilderElement(daraz2Element, PLUGINS.nx);
    // "Daraz Load More" — single grid with load-more button / infinite scroll
    addBuilderElement(daraz3Element, PLUGINS.nx);
}
