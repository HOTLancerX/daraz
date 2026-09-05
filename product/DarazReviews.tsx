"use client";

/**
 * plugin/daraz/product/DarazReviews.tsx
 *
 * Daraz-styled Ratings & Reviews component matching the Daraz visual ratio and aesthetics.
 *
 * Features:
 *   - Overall score (e.g. 4.8/5) with 5 solid gold stars and total ratings count.
 *   - Rating distribution bars (5★ to 1★) with amber progress fills and exact counts.
 *   - Daraz Filter Tabs: All, 5 Star, 4 Star, 3 Star, 2 Star, 1 Star, and With Images.
 *   - Detailed review cards with verified buyer tags, purchase variations, and timestamps.
 *   - Attached customer images with click-to-preview lightbox modal.
 *   - Official Seller / Store response cards (Daraz-style indented response bubble).
 *   - Clean empty states when no reviews or no filtered reviews match.
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";

export interface ReviewItem {
  _id: string;
  userName: string;
  userImage?: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  orderNumber?: string;
  verifiedPurchase?: boolean;
  variantOptions?: Record<string, string>;
  reply?: {
    content: string;
    authorName?: string;
    authorRole?: string;
    createdAt?: string;
  } | null;
  createdAt: string;
}

export interface ReviewsData {
  reviews: ReviewItem[];
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

interface DarazReviewsProps {
  reviewsData?: ReviewsData | null;
  productTitle: string;
}

function fmtDate(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DarazReviews({
  reviewsData,
  productTitle,
}: DarazReviewsProps) {
  const reviews = reviewsData?.reviews ?? [];
  const averageRating = reviewsData?.averageRating ?? 0;
  const totalReviews = reviewsData?.totalReviews ?? reviews.length;
  const distribution = reviewsData?.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Count reviews with images
  const imageReviewsCount = useMemo(() => {
    return reviews.filter((r) => r.images && r.images.length > 0).length;
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (activeFilter === "all") return reviews;
    if (activeFilter === "images") {
      return reviews.filter((r) => r.images && r.images.length > 0);
    }
    const starNum = parseInt(activeFilter, 10);
    if (!isNaN(starNum)) {
      return reviews.filter((r) => r.rating === starNum);
    }
    return reviews;
  }, [reviews, activeFilter]);

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-xs space-y-5 border border-gray-100">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          Ratings &amp; Reviews of {productTitle}
        </h2>
        {totalReviews > 0 && (
          <span className="text-xs text-gray-500 font-medium">
            {totalReviews} Total {totalReviews === 1 ? "Rating" : "Ratings"}
          </span>
        )}
      </div>

      {/* ─── Daraz Score & Distribution Ratio Section ─── */}
      {totalReviews > 0 ? (
        <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 py-3 border-b border-gray-100 bg-[#fafafa] p-4 rounded-lg">
          {/* Left: Big Score & Stars */}
          <div className="flex flex-col items-center justify-center text-center md:pr-8 md:border-r border-gray-200 min-w-44 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-[#f57224] tracking-tight">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-xl font-medium text-gray-400">/5</span>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon="solar:star-bold"
                  width={20}
                  className={
                    star <= Math.round(averageRating)
                      ? "text-[#ffc700]"
                      : "text-gray-200"
                  }
                />
              ))}
            </div>

            <p className="text-xs text-gray-500 font-medium">
              {totalReviews} {totalReviews === 1 ? "Rating" : "Ratings"}
            </p>
          </div>

          {/* Right: Star Distribution Bars */}
          <div className="flex-1 w-full flex flex-col justify-center space-y-2 text-xs text-gray-600">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const percent =
                totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 justify-end font-medium">
                    <span>{star}</span>
                    <Icon icon="solar:star-bold" width={13} className="text-[#ffc700]" />
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f57224] transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <span className="w-8 text-right font-medium text-gray-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ─── Daraz Filter Chips / Tabs ─── */}
      {totalReviews > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap text-xs">
          <span className="font-bold text-gray-600 mr-1 text-xs">Filter by:</span>

          {/* All */}
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              activeFilter === "all"
                ? "bg-[#f57224] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({totalReviews})
          </button>

          {/* 5 Stars to 1 Star */}
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0;
            if (count === 0 && activeFilter !== String(star)) return null;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setActiveFilter(String(star))}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-medium transition ${
                  activeFilter === String(star)
                    ? "bg-[#f57224] text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {star} ★ ({count})
              </button>
            );
          })}

          {/* With Images */}
          {imageReviewsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("images")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-medium transition ${
                activeFilter === "images"
                  ? "bg-[#f57224] text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon icon="solar:camera-bold" width={13} />
              With Images ({imageReviewsCount})
            </button>
          )}
        </div>
      )}

      {/* ─── Reviews List ─── */}
      {totalReviews === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-full bg-orange-50 text-[#f57224] flex items-center justify-center">
            <Icon icon="solar:chat-round-line-bold-duotone" width={32} />
          </div>
          <p className="text-sm font-bold text-gray-700">This product has no reviews yet.</p>
          <p className="text-gray-400 max-w-sm">
            Purchased this item? Leave a review from your account order history to help other shoppers!
          </p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          <p>No reviews match the selected filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredReviews.map((rev) => (
            <div key={rev._id} className="py-4 space-y-2.5 first:pt-2">
              {/* Rating stars & verified badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        icon="solar:star-bold"
                        width={15}
                        className={
                          star <= rev.rating ? "text-[#ffc700]" : "text-gray-200"
                        }
                      />
                    ))}
                  </div>

                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00a650] bg-emerald-50 px-2 py-0.5 rounded">
                      <Icon icon="mdi:check-decagram" width={13} />
                      Verified Purchase
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-gray-400">
                  {fmtDate(rev.createdAt)}
                </span>
              </div>

              {/* Reviewer info */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-800">
                  by {rev.userName || "Daraz Customer"}
                </span>

                {rev.variantOptions && Object.keys(rev.variantOptions).length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-gray-400">
                      {Object.entries(rev.variantOptions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Comment Text */}
              {rev.title && (
                <p className="text-xs font-bold text-gray-900 leading-snug">
                  {rev.title}
                </p>
              )}

              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {rev.content}
              </p>

              {/* Customer Photo Attachments */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {rev.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 hover:border-[#f57224] transition group block cursor-pointer"
                    >
                      <img
                        src={img}
                        alt="Customer review photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Daraz-Style Seller Response Card */}
              {rev.reply?.content && (
                <div className="mt-3 bg-[#f8f9fa] border-l-4 border-[#f57224] p-3 rounded-r-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-gray-800 font-bold">
                    <span className="flex items-center gap-1.5 text-[#f57224]">
                      <Icon icon="solar:chat-round-dots-bold" width={14} />
                      Seller Response ({rev.reply.authorName || "Seller"})
                    </span>
                    {rev.reply.createdAt && (
                      <span className="text-[10px] text-gray-400 font-normal">
                        {fmtDate(rev.reply.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line pt-0.5">
                    {rev.reply.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Review Full Preview"
              className="max-h-[78vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
