/**
 * plugin/daraz/ui/DarazGrid.tsx
 *
 * SERVER COMPONENT — fetches all categories and products from MongoDB directly,
 * then passes pre-loaded data to DarazGridClient (no client-side requests).
 *
 * Registered in lib/builderData.tsx so Builder.tsx renders it server-side
 * when a "daraz-1" element is found on a builder page.
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import Permalink from "@/models/permalink";
import { Types } from "mongoose";
import DarazGridClient, { type DarazCat, type DarazProduct } from "./DarazGridClient";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DarazGridProps {
    title:           string;
    categoryIds:     string[];
    limit:           number;
    boxStyle:        string;
    showViewAll:     string;
    currencySymbol?: string;
    colsDesktop?:    number;
    colsTablet?:     number;
    colsMobile?:     number;
    cardGap?:        number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(prefix: string, slug: string): string {
    const p = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    return p ? `/${p}/${slug}` : `/${slug}`;
}

function resolveImage(info: Record<string, string>): string {
    if (info.images) {
        try {
            const arr = JSON.parse(info.images);
            if (Array.isArray(arr) && arr[0]) return arr[0] as string;
        } catch {}
    }
    return info.image ?? "";
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchData(categoryIds: string[], limit: number) {
    await connectDB();
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 40);

    // Permalink prefixes
    const [productPL, catPL] = await Promise.all([
        Permalink.findOne({ contentType: "product" }).lean() as Promise<any>,
        Permalink.findOne({ contentType: "product-category" }).lean() as Promise<any>,
    ]);
    const productPrefix = (productPL?.prefix ?? "product").trim().replace(/^\/+|\/+$/g, "") || "product";
    const catPrefix     = (catPL?.prefix  ?? "product/category").trim().replace(/^\/+|\/+$/g, "");

    // Categories
    let catDocs: any[] = [];
    if (categoryIds.length > 0) {
        const validIds = categoryIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
        catDocs = await Cat.find({ _id: { $in: validIds }, status: "published" })
            .select("_id title slug").lean();
        const order = new Map(categoryIds.map((id, i) => [id, i]));
        catDocs.sort(
            (a: any, b: any) =>
                (order.get(a._id.toString()) ?? 999) - (order.get(b._id.toString()) ?? 999)
        );
    } else {
        catDocs = await Cat.find({ type: "product-category", status: "published" })
            .select("_id title slug").sort({ title: 1 }).lean();
    }

    const cats: DarazCat[] = catDocs.map((c: any) => ({
        _id:   c._id.toString(),
        title: c.title ?? "",
        slug:  c.slug  ?? "",
        url:   buildUrl(catPrefix, c.slug ?? ""),
    }));

    // Products — all categories in parallel
    const allPostsByCat = cats.length > 0
        ? await Promise.all(cats.map((cat) =>
            Post.find({
                type:     "product",
                status:   "published",
                category: new Types.ObjectId(cat._id),
            })
                .select("_id title slug")
                .sort({ createdAt: -1 })
                .limit(safeLimit)
                .lean()
        ))
        : [];

    // Post infos — batch fetch for all products
    const allPosts = allPostsByCat.flat();
    const infoMap: Record<string, Record<string, string>> = {};
    if (allPosts.length > 0) {
        const infos = await PostInfo.find({
            postId: { $in: allPosts.map((p) => p._id as Types.ObjectId) },
            name:   { $in: ["images", "image", "_variate", "shipping_inside", "shipping_outside"] },
        })
            .select("postId name value").lean();

        for (const info of infos) {
            const key = (info.postId as Types.ObjectId).toString();
            if (!infoMap[key]) infoMap[key] = {};
            infoMap[key][info.name] = info.value;
        }
    }

    // Build productMap keyed by category _id
    const productMap: Record<string, DarazProduct[]> = {};
    cats.forEach((cat, i) => {
        productMap[cat._id] = (allPostsByCat[i] ?? []).map((p) => {
            const id   = (p._id as Types.ObjectId).toString();
            const info = infoMap[id] ?? {};
            return {
                _id:     id,
                title:   p.title  ?? "",
                slug:    p.slug   ?? "",
                status:  "published",
                postUrl: buildUrl(productPrefix, p.slug ?? ""),
                info,
            };
        });
    });

    return { cats, productMap };
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function DarazGrid({
    title,
    categoryIds,
    limit,
    boxStyle,
    showViewAll,
    currencySymbol,
    colsDesktop,
    colsTablet,
    colsMobile,
    cardGap,
}: DarazGridProps) {
    if (!title && !categoryIds.length) return null;

    const { cats, productMap } = await fetchData(categoryIds, limit);

    return (
        <DarazGridClient
            title={title}
            categoryIds={categoryIds}
            limit={limit}
            boxStyle={boxStyle}
            showViewAll={showViewAll}
            currencySymbol={currencySymbol}
            colsDesktop={colsDesktop}
            colsTablet={colsTablet}
            colsMobile={colsMobile}
            cardGap={cardGap}
            initialCats={cats}
            initialProductMap={productMap}
        />
    );
}
