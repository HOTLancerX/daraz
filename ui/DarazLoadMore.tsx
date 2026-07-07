/**
 * plugin/daraz/ui/DarazLoadMore.tsx
 *
 * SERVER COMPONENT — fetches the first page of products and category info
 * from MongoDB, passes them to DarazLoadMoreClient.
 * Additional pages are fetched client-side via xFetch on demand.
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import Permalink from "@/models/permalink";
import { Types } from "mongoose";
import DarazLoadMoreClient, {
    type DarazLoadMoreClientProps,
    type DarazLoadMoreColors,
} from "./DarazLoadMoreClient";
import type { DarazCat, DarazProduct } from "./DarazGridClient";

// ─── Props ────────────────────────────────────────────────────────────────────

export type DarazLoadMoreProps = Omit<
    DarazLoadMoreClientProps,
    "initialProducts" | "totalCount" | "initialCat" | "productPrefix"
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(prefix: string, slug: string): string {
    const p = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    return p ? `/${p}/${slug}` : `/${slug}`;
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchData(categoryIds: string[], initialCount: number) {
    await connectDB();
    const safeLimit = Math.min(Math.max(Number(initialCount) || 8, 1), 100);

    const [productPL, catPL] = await Promise.all([
        Permalink.findOne({ contentType: "product" }).lean() as Promise<any>,
        Permalink.findOne({ contentType: "product-category" }).lean() as Promise<any>,
    ]);
    const productPrefix = (productPL?.prefix ?? "product").trim().replace(/^\/+|\/+$/g, "") || "product";
    const catPrefix     = (catPL?.prefix ?? "product/category").trim().replace(/^\/+|\/+$/g, "");

    // Build category filter
    let catIds: Types.ObjectId[] = [];
    let catDoc: any = null;

    if (categoryIds.length > 0) {
        const validIds = categoryIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));

        // Collect all descendant category ids
        const allIds: Types.ObjectId[] = [...validIds];
        const queue = [...validIds];
        while (queue.length > 0) {
            const pid = queue.shift()!;
            const children = await Cat.find({ parentId: pid }).select("_id").lean() as any[];
            for (const c of children) {
                allIds.push(c._id);
                queue.push(c._id);
            }
        }
        catIds = allIds;

        // Single category info for View All link
        if (categoryIds.length === 1) {
            catDoc = await Cat.findById(validIds[0]).lean() as any;
        }
    }

    const query: Record<string, any> = { type: "product", status: "published" };
    if (catIds.length > 0) query.category = { $in: catIds };

    const [rawPosts, total] = await Promise.all([
        Post.find(query)
            .select("_id title slug")
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .lean() as Promise<any[]>,
        Post.countDocuments(query),
    ]);

    const infoMap: Record<string, Record<string, string>> = {};
    if (rawPosts.length > 0) {
        const infos = await PostInfo.find({
            postId: { $in: rawPosts.map((p) => p._id as Types.ObjectId) },
            name:   { $in: ["images", "image", "_variate", "shipping_inside", "shipping_outside"] },
        }).select("postId name value").lean() as any[];

        for (const info of infos) {
            const key = (info.postId as Types.ObjectId).toString();
            if (!infoMap[key]) infoMap[key] = {};
            infoMap[key][info.name] = info.value;
        }
    }

    const products: DarazProduct[] = rawPosts.map((p) => {
        const id   = (p._id as Types.ObjectId).toString();
        return {
            _id:     id,
            title:   p.title ?? "",
            slug:    p.slug  ?? "",
            status:  "published",
            postUrl: buildUrl(productPrefix, p.slug ?? ""),
            info:    infoMap[id] ?? {},
        };
    });

    const cat: DarazCat | null = catDoc
        ? {
            _id:   catDoc._id.toString(),
            title: catDoc.title ?? "",
            slug:  catDoc.slug  ?? "",
            url:   buildUrl(catPrefix, catDoc.slug ?? ""),
        }
        : null;

    return { products, total, cat, productPrefix };
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function DarazLoadMore(props: DarazLoadMoreProps) {
    const { products, total, cat, productPrefix } = await fetchData(
        props.categoryIds,
        props.initialCount
    );

    return (
        <DarazLoadMoreClient
            {...props}
            initialProducts={products}
            totalCount={total}
            initialCat={cat}
            productPrefix={productPrefix}
        />
    );
}
