"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import useEmblaCarousel from "embla-carousel-react";
import {
  Text,
  Select,
  ColorPickerPopup,
  Section,
  ImageGallery,
  Url,
  NumberControl,
  Dimensions,
} from "@/components/builder/controls";

interface CategoryItemType {
  id: string;
  title: string;
  image: string;
  link?: {
    url: string;
    target?: string;
    nofollow?: boolean;
  };
}

const DEFAULT_CATEGORIES: CategoryItemType[] = [
  {
    id: "cat_1",
    title: "Power Sanders",
    image: "https://img.drz.lazcdn.com/static/bd/p/a27953a2a7c3276cccff164e3080ff7d.jpg_170x170q80.jpg",
    link: { url: "/sanders" },
  },
  {
    id: "cat_2",
    title: "Kitchen Fittings",
    image: "https://img.drz.lazcdn.com/static/bd/p/8785da0a53f3adb63ae0269a1c5ca0a9.png_170x170q80.png",
    link: { url: "/kitchen-fixtures" },
  },
  {
    id: "cat_3",
    title: "Womens Fashion",
    image: "https://img.drz.lazcdn.com/static/bd/p/ef4656e721aeea9299df44595f2933f6.jpg_170x170q80.jpg",
    link: { url: "/wholesale-womens-fashion" },
  },
  {
    id: "cat_4",
    title: "Donate to Healthcare",
    image: "https://img.drz.lazcdn.com/static/bd/p/442c7ce7bdcbb3fe541102e6dc59e664.jpg_170x170q80.jpg",
    link: { url: "/daraz-donates-healthcare" },
  },
  {
    id: "cat_5",
    title: "Goat",
    image: "https://img.drz.lazcdn.com/static/bd/p/488c62944d2714bf58438c8f980199fd.jpg_170x170q80.jpg",
    link: { url: "/livestock-goat" },
  },
  {
    id: "cat_6",
    title: "Watering Systems & Garden Hoses",
    image: "https://img.drz.lazcdn.com/static/bd/p/b81936ac4b750e17a5b8fd980199fd.jpg_170x170q80.jpg",
    link: { url: "/watering-systems" },
  },
  {
    id: "cat_7",
    title: "Bedding Sets",
    image: "https://img.drz.lazcdn.com/static/bd/p/861f1e334d106652b30171be7a12cdd5.jpg_170x170q80.jpg",
    link: { url: "/shop-bedding-sets" },
  },
  {
    id: "cat_8",
    title: "Pools",
    image: "https://img.drz.lazcdn.com/g/kf/S7c56fcac573f439fb0c5a487ba4dc8b0W.jpg_170x170q80.jpg",
    link: { url: "/inflatable-pools" },
  },
  {
    id: "cat_9",
    title: "Bathroom Lighting",
    image: "https://img.drz.lazcdn.com/static/bd/p/bef401fb5cd3f97cbaa43c680d2a52b4.jpg_170x170q80.jpg",
    link: { url: "/bathroom-lights" },
  },
  {
    id: "cat_10",
    title: "Eye Primers",
    image: "https://img.drz.lazcdn.com/g/kf/Sae426a830eb547e8a76f29b49c779fffn.jpg_170x170q80.jpg",
    link: { url: "/eye-primer" },
  },
  {
    id: "cat_11",
    title: "Digital Downloads",
    image: "https://ae01.alicdn.com/kf/Se6f904aee97d4c5794c3414b033c5698E.jpg",
    link: { url: "/xbox-digital-downloads" },
  },
  {
    id: "cat_12",
    title: "Skirts",
    image: "https://img.drz.lazcdn.com/static/bd/p/4573a174dbcf555ef7ffece31b794eaf.jpg_170x170q80.jpg",
    link: { url: "/girls-sports-skirts" },
  },
  {
    id: "cat_13",
    title: "Beans & Chickpeas",
    image: "https://img.drz.lazcdn.com/static/bd/p/cc7df6b311dcdfba7e3b9c0949318143.jpg_170x170q80.jpg",
    link: { url: "/pulses-beans" },
  },
  {
    id: "cat_14",
    title: "Others",
    image: "https://img.drz.lazcdn.com/static/bd/p/8f5be87b6f66b86583a537a3f2fa3ccd.jpg_170x170q80.jpg",
    link: { url: "/charity-other" },
  },
  {
    id: "cat_15",
    title: "Combo Washer Dryer",
    image: "https://laz-img-sg.alicdn.com/p/41d45f15ea455f7f5cd10d891955b56a.jpg",
    link: { url: "/washer-dryer-combo" },
  },
  {
    id: "cat_16",
    title: "Artificial Flowers & Plants",
    image: "https://img.lazcdn.com/g/p/b16c0098ac473d79a5b750bbf3574a65.jpg_170x170q80.jpg",
    link: { url: "/artificial-flowers-plants" },
  }
];

function CategoryItem({
  item,
  shape,
  bgColor,
  textColor,
  hoverBorderColor,
  hoverTextColor,
  boxRadius,
  itemPaddingStyle,
}: {
  item: CategoryItemType;
  shape: "round" | "circle";
  bgColor: string;
  textColor: string;
  hoverBorderColor: string;
  hoverTextColor: string;
  boxRadius: number;
  itemPaddingStyle: string;
}) {
  return (
    <Link
      href={item.link?.url || "#"}
      target={item.link?.target || "_self"}
      rel={item.link?.nofollow ? "nofollow" : undefined}
      className="group flex flex-col items-center gap-2 transition-all duration-300 border border-gray-100/50 h-full"
      style={{ backgroundColor: bgColor, borderRadius: `${boxRadius}px`, padding: itemPaddingStyle }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = hoverBorderColor;
        const textSpan = (e.currentTarget as HTMLElement).querySelector(".cat-title") as HTMLElement;
        if (textSpan) textSpan.style.color = hoverTextColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(243, 244, 246, 0.5)";
        const textSpan = (e.currentTarget as HTMLElement).querySelector(".cat-title") as HTMLElement;
        if (textSpan) textSpan.style.color = textColor;
      }}
    >
      <div
        className="relative w-16 h-16 overflow-hidden bg-gray-50 flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
        style={{
          borderRadius: shape === "circle" ? "50%" : `${boxRadius}px`,
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <Icon icon="mdi:tag-outline" className="w-7 h-7 text-gray-400" />
        )}
      </div>
      <span
        className="cat-title text-xs text-center font-medium line-clamp-2 leading-tight transition-colors duration-300 px-1"
        style={{ color: textColor }}
      >
        {item.title}
      </span>
    </Link>
  );
}

function DarazCategoriesFrontend({ element }: { element: any }) {
  const s = element.schema;
  const items = s.content?.items || DEFAULT_CATEGORIES;
  const sectionTitle = s.content?.section_title !== undefined ? s.content.section_title : "Categories";
  const imageShape = s.content?.image_shape || "round";
  const desktopCols = s.content?.desktop_cols ?? 8;
  const tabletCols = s.content?.tablet_cols ?? 6;
  const mobileCols = s.content?.mobile_cols ?? 4;
  
  const bgColor = s.style?.bg_color || "#ffffff";
  const itemBgColor = s.style?.item_bg_color || "#ffffff";
  const textColor = s.style?.text_color || "#212121";
  const hoverBorderColor = s.style?.hover_border_color || "#f57224";
  const hoverTextColor = s.style?.hover_text_color || "#f57224";
  const insideGap = s.style?.inside_gap ?? 12;
  const boxRadius = s.style?.box_radius ?? 12;
  const itemPadding = s.style?.item_padding || { top: 12, right: 12, bottom: 12, left: 12, unit: "px" };
  const itemPaddingStyle = `${itemPadding.top ?? 12}${itemPadding.unit || "px"} ${itemPadding.right ?? 12}${itemPadding.unit || "px"} ${itemPadding.bottom ?? 12}${itemPadding.unit || "px"} ${itemPadding.left ?? 12}${itemPadding.unit || "px"}`;

  const [isMounted, setIsMounted] = useState(false);
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const halfLength = Math.ceil(items.length / 2);
  const row1 = items.slice(0, halfLength);
  const row2 = items.slice(halfLength);
  const pairs: Array<{ top: CategoryItemType; bottom?: CategoryItemType }> = [];
  
  for (let i = 0; i < row1.length; i++) {
    pairs.push({
      top: row1[i],
      bottom: row2[i],
    });
  }

  return (
    <div
      className="w-full transition-all duration-300"
      style={{ backgroundColor: bgColor }}
    >
      {sectionTitle && (
        <h3
          className="text-lg md:text-xl font-bold mb-4 tracking-tight"
          style={{ color: textColor }}
        >
          {sectionTitle}
        </h3>
      )}

      {/* ── DESKTOP & TABLET GRID ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 640px) {
          .categories-grid-${element.id} {
            display: grid;
            grid-template-columns: repeat(${tabletCols}, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .categories-grid-${element.id} {
            display: grid;
            grid-template-columns: repeat(${desktopCols}, minmax(0, 1fr));
          }
        }
      `}} />
      <div
        className={`hidden sm:grid categories-grid-${element.id}`}
        style={{ gap: `${insideGap}px` }}
      >
        {items.map((item: CategoryItemType) => (
          <div key={item.id}>
            <CategoryItem
              item={item}
              shape={imageShape}
              bgColor={itemBgColor}
              textColor={textColor}
              hoverBorderColor={hoverBorderColor}
              hoverTextColor={hoverTextColor}
              boxRadius={boxRadius}
              itemPaddingStyle={itemPaddingStyle}
            />
          </div>
        ))}
      </div>

      {/* ── MOBILE 2-ROW SWIPER (SLIDER) ── */}
      <div className="block sm:hidden">
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex" style={{ gap: `${insideGap}px` }}>
            {pairs.map((pair, idx) => (
              <div
                key={idx}
                className="min-w-0 flex flex-col"
                style={{
                  flex: `0 0 calc(${100 / mobileCols}% - ${(insideGap * (mobileCols - 1)) / mobileCols}px)`,
                  gap: `${insideGap}px`
                }}
              >
                <div className="flex-1">
                  <CategoryItem
                    item={pair.top}
                    shape={imageShape}
                    bgColor={itemBgColor}
                    textColor={textColor}
                    hoverBorderColor={hoverBorderColor}
                    hoverTextColor={hoverTextColor}
                    boxRadius={boxRadius}
                    itemPaddingStyle={itemPaddingStyle}
                  />
                </div>
                {pair.bottom && (
                  <div className="flex-1">
                    <CategoryItem
                      item={pair.bottom}
                      shape={imageShape}
                      bgColor={itemBgColor}
                      textColor={textColor}
                      hoverBorderColor={hoverBorderColor}
                      hoverTextColor={hoverTextColor}
                      boxRadius={boxRadius}
                      itemPaddingStyle={itemPaddingStyle}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const darazCategoriesElement = {
  type: "daraz-categories",
  category: "daraz",
  label: "Category Grid",
  icon: "memory:box-light-vertical-menu-right",

  schema: {
    content: {
      section_title: "Categories",
      image_shape: "round",
      items: DEFAULT_CATEGORIES,
      desktop_cols: 8,
      tablet_cols: 6,
      mobile_cols: 4,
    },

    style: {
      bg_color: "#ffffff",
      item_bg_color: "#ffffff",
      text_color: "#212121",
      hover_border_color: "#f57224",
      hover_text_color: "#f57224",
      inside_gap: 12,
      box_radius: 12,
      item_padding: { top: 12, right: 12, bottom: 12, left: 12, unit: "px" },
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Content",
      section: "Header Options",
      controls: [
        {
          name: "section_title",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Section Title" value={value ?? "Categories"} onChange={onChange} />
          ),
        },
        {
          name: "image_shape",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Image Corner Shape"
              value={value || "round"}
              onChange={onChange}
              options={[
                { value: "round", label: "Rounded Box" },
                { value: "circle", label: "Circular" },
              ]}
            />
          ),
        },
        {
          name: "desktop_cols",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Desktop Columns"
              value={value ?? 8}
              onChange={onChange}
              min={4}
              max={12}
              step={1}
            />
          ),
        },
        {
          name: "tablet_cols",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Tablet Columns"
              value={value ?? 6}
              onChange={onChange}
              min={3}
              max={10}
              step={1}
            />
          ),
        },
        {
          name: "mobile_cols",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Mobile Columns"
              value={value ?? 4}
              onChange={onChange}
              min={2}
              max={6}
              step={1}
            />
          ),
        },
      ],
    },
    {
      tab: "Content",
      section: "Category Items",
      controls: [
        {
          name: "items",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div className="space-y-4">
              {(value || []).map((item: any, idx: number) => (
                <Section key={item.id || idx} label={`Category #${idx + 1}: ${item.title || ""}`}>
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const u = [...value];
                          u.splice(idx + 1, 0, { ...item, id: `cat_${Date.now()}` });
                          onChange(u);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-orange-200 bg-white text-gray-500 hover:text-orange-500 cursor-pointer transition-colors shadow-sm"
                        title="Duplicate Category"
                      >
                        <Icon icon="solar:copy-linear" width="15" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange((value || []).filter((_: any, i: number) => i !== idx))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-red-200 bg-white text-gray-500 hover:text-red-500 cursor-pointer transition-colors shadow-sm"
                        title="Remove Category"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" width="15" />
                      </button>
                    </div>

                    <Text
                      label="Title"
                      value={item.title || ""}
                      onChange={(v: string) => {
                        const u = [...value]; u[idx] = { ...u[idx], title: v }; onChange(u);
                      }}
                    />

                    <div className="flex flex-col gap-1.5 relative">
                      <ImageGallery
                        label="Image"
                        value={item.image || ""}
                        onChange={(v: string) => {
                          const u = [...value]; u[idx] = { ...u[idx], image: v }; onChange(u);
                        }}
                      />
                      {item.image && (
                        <button
                          type="button"
                          onClick={() => {
                            const u = [...value]; u[idx] = { ...u[idx], image: "" }; onChange(u);
                          }}
                          className="absolute right-0 top-0 text-[11px] text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                        >
                          <Icon icon="solar:close-circle-bold" width="14" />
                          Remove Image
                        </button>
                      )}
                    </div>

                    <Url
                      label="Link"
                      value={item.link || { url: "" }}
                      onChange={(v: any) => {
                        const u = [...value]; u[idx] = { ...u[idx], link: v }; onChange(u);
                      }}
                    />
                  </div>
                </Section>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newCat = {
                    id: `cat_${Date.now()}`,
                    title: `New Category`,
                    image: "",
                    link: { url: "" },
                  };
                  onChange([...(value || []), newCat]);
                }}
                className="w-full flex items-center justify-center gap-1 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-[13px] font-medium cursor-pointer transition-colors"
              >
                <Icon icon="solar:plus-linear" width="16" />
                Add Category Item
              </button>
            </div>
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Colours & Theme",
      controls: [
        {
          name: "bg_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Block Background Colour" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "item_bg_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Card Background Colour" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "text_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Colour" value={value ?? "#212121"} onChange={onChange} />
          ),
        },
        {
          name: "hover_border_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Hover Border Accent" value={value ?? "#f57224"} onChange={onChange} />
          ),
        },
        {
          name: "hover_text_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Hover Text Accent" value={value ?? "#f57224"} onChange={onChange} />
          ),
        },
        {
          name: "inside_gap",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Gap Spacing (px)"
              value={value ?? 12}
              onChange={onChange}
              min={0}
              max={40}
              step={1}
            />
          ),
        },
        {
          name: "box_radius",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Card Border Radius (px)"
              value={value ?? 12}
              onChange={onChange}
              min={0}
              max={32}
              step={1}
            />
          ),
        },
        {
          name: "item_padding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <DarazCategoriesFrontend element={element} />,
};

export default darazCategoriesElement;
