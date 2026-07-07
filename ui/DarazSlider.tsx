/**
 * plugin/daraz/ui/DarazSlider.tsx
 *
 * SERVER COMPONENT — fetches all categories and products from MongoDB,
 * then passes pre-loaded data to DarazSliderClient (no client fetches).
 *
 * Registered in lib/builderData.tsx so Builder.tsx renders it server-side.
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import Permalink from "@/models/permalink";
import { Types } from "mongoose";
import DarazSliderClient, {
    type DarazSliderClientProps,
    type DarazSliderColors,
} from "./DarazSliderClient";
import type { DarazCat, DarazProduct } from "./DarazGridClient";

// ─── Props ────────────────────────────────────────────────────────────────────

export type DarazSliderProps = Omit<
    DarazSliderClientProps,
    "initialCats" | "initialProductMap"
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(prefix: string, slug: string): string {
    const p = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    return p ? `/${p}/${slug}` : `/${slug}`;
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchData(categoryIds: string[], limit: number) {
    await connectDB();
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 40);

    const [productPL, catPL] = await Promise.all([
        Permalink.findOne({ contentType: "product" }).lean() as Promise<any>,
        Permalink.findOne({ contentType: "product-category" }).lean() as Promise<any>,
    ]);
    const productPrefix = (productPL?.prefix ?? "product").trim().replace(/^\/+|\/+$/g, "") || "product";
    const catPrefix     = (catPL?.prefix  ?? "product/category").trim().replace(/^\/+|\/+$/g, "");

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

    const allPosts = allPostsByCat.flat();
    const infoMap: Record<string, Record<string, string>> = {};
    if (allPosts.length > 0) {
        const infos = await PostInfo.find({
            postId: { $in: allPosts.map((p) => p._id as Types.ObjectId) },
            name:   { $in: ["images", "image", "_variate", "shipping_inside", "shipping_outside"] },
        }).select("postId name value").lean();

        for (const info of infos) {
            const key = (info.postId as Types.ObjectId).toString();
            if (!infoMap[key]) infoMap[key] = {};
            infoMap[key][info.name] = info.value;
        }
    }

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

export default async function DarazSlider(props: DarazSliderProps) {
    if (!props.title && !props.categoryIds.length) return null;

    const { cats, productMap } = await fetchData(props.categoryIds, props.limit);

    return (
        <DarazSliderClient
            {...props}
            initialCats={cats}
            initialProductMap={productMap}
        />
    );
}
