"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { MenuItem } from "@/models/Menu";
import { xFetch } from "@/lib/express";
import {
  Text,
  Select,
  ColorPickerPopup,
  NumberControl,
} from "@/components/builder/controls";

function getDimensionsStyles(obj: any, property: "margin" | "padding") {
  if (!obj || typeof obj !== "object") return {};
  const u = obj.unit || "px";
  if (u === "auto") return { [property]: "auto" };
  const t = obj.top === "" || obj.top === undefined ? 0 : obj.top;
  const r = obj.right === "" || obj.right === undefined ? 0 : obj.right;
  const b = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
  const l = obj.left === "" || obj.left === undefined ? 0 : obj.left;
  if (t === 0 && r === 0 && b === 0 && l === 0) return {};
  return { [property]: `${t}${u} ${r}${u} ${b}${u} ${l}${u}` };
}

function getInitialMenuItems(location: string): MenuItem[] {
  if (typeof window === "undefined") return [];
  const menus = (window as any).__initialMenus || [];
  const matched = menus.find((m: any) => m.location?.includes(location));
  return (matched?.items ?? []) as MenuItem[];
}

function getActiveColumns(items: MenuItem[], path: string[]): MenuItem[][] {
  const cols: MenuItem[][] = [];
  let currentLevelItems = items;
  for (const activeId of path) {
    const activeItem = currentLevelItems.find((item) => item.id === activeId);
    if (activeItem && activeItem.children && activeItem.children.length > 0) {
      cols.push(activeItem.children);
      currentLevelItems = activeItem.children;
    } else {
      break;
    }
  }
  return cols;
}

function DarazMenusFrontend({ element }: { element: any }) {
  const s = element.schema;
  const location = s.content?.location || "header-1";
  const submenuDirection = s.content?.submenu_direction || "left"; // left = menu on left (opens right), right = menu on right (opens left)
  const menuHeight = s.content?.menu_height || 420;
  const panelWidth = s.content?.panel_width || 240;

  const [isMounted, setIsMounted] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<string[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const initialItems = getInitialMenuItems(location);
    if (initialItems.length > 0) {
      setMenuItems(initialItems);
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (!location) return;
    xFetch(`/menu?location=${location}`)
      .then((res) => res.json())
      .then((data) => {
        setMenuItems(data.menu?.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[DarazMenus] Error loading menu:", err);
        setLoading(false);
      });
  }, [location]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setActivePath([]);
    }, 150);
  };

  const handleItemHover = (level: number, itemId: string) => {
    cancelClose();
    setActivePath((prev) => {
      const next = prev.slice(0, level);
      next[level] = itemId;
      return next;
    });
  };

  const marginStyle = getDimensionsStyles(s.advanced?.margin, "margin");
  const paddingStyle = getDimensionsStyles(s.advanced?.padding, "padding");

  if (isMounted && !loading && menuItems.length === 0) {
    return (
      <div className="p-6 text-center text-[13px] text-gray-400 font-semibold border border-dashed border-gray-300 rounded-xl">
        No active items found for menu location: <span className="font-mono text-indigo-500 font-bold">{location}</span>.
      </div>
    );
  }

  const activeColumns = getActiveColumns(menuItems, activePath);

  const colors = {
    navBg: s.style?.nav_bg || "#ffffff",
    navText: s.style?.nav_text || "#111827",
    navHighlight: s.style?.nav_highlight || "#f57224",
    navHoverBg: s.style?.nav_hover_bg || "#f5f5f5",
    navHoverText: s.style?.nav_hover_text || "#f57224",
    navBorderColor: s.style?.nav_border_color || "#e5e7eb",
    navFontSize: s.style?.nav_font_size || 14,
    navFontWeight: s.style?.nav_font_weight || 500,
  };

  const hasSubmenus = activeColumns.length > 0;

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 10,
        ...marginStyle,
        ...paddingStyle,
      }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="relative inline-block select-none">
        {/* Level 1 Parent Menu Panel */}
        <div
          className="flex flex-col transition-all duration-200"
          style={{
            width: `${panelWidth}px`,
            height: `${menuHeight}px`,
            backgroundColor: colors.navBg,
            borderColor: colors.navBorderColor,
          }}
        >
          <div className="overflow-y-auto flex-1 scrollbar-thin divide-gray-200 divide-y">
            {menuItems.map((item) => {
              const isActive = activePath[0] === item.id;
              const hasChildren = item.children && item.children.length > 0;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => handleItemHover(0, item.id)}
                  style={{
                    backgroundColor: isActive ? colors.navHoverBg : "transparent",
                  }}
                  className="transition-colors duration-150"
                >
                  <Link
                    href={item.url || "#"}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{
                      color: isActive ? colors.navHoverText : colors.navText,
                      fontSize: `${colors.navFontSize}px`,
                      fontWeight: colors.navFontWeight,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.image && (
                        <Image
                          width={18}
                          height={18}
                          src={item.image}
                          alt={item.label}
                          className="w-4.5 h-4.5 object-cover rounded shrink-0"
                          unoptimized
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {hasChildren && (
                      <Icon
                        icon={
                          submenuDirection === "right"
                            ? "mdi:chevron-left"
                            : "mdi:chevron-right"
                        }
                        className="w-4 h-4 opacity-55 shrink-0"
                      />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Submenus Panel Container */}
        {hasSubmenus && (
          <div
            className={`absolute top-0 z-10 flex overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-${
              submenuDirection === "right" ? "right" : "left"
            }-2`}
            style={{
              [submenuDirection === "right" ? "right" : "left"]: `${panelWidth}px`,
              height: `${menuHeight}px`,
              backgroundColor: colors.navBg,
              borderColor: colors.navBorderColor,
              flexDirection: submenuDirection === "right" ? "row-reverse" : "row",
            }}
          >
            {activeColumns.map((colItems, colIdx) => {
              const currentActiveId = activePath[colIdx + 1];
              return (
                <div
                  key={colIdx}
                  className="flex flex-col border-r last:border-r-0"
                  style={{
                    width: `${panelWidth}px`,
                    height: "100%",
                    borderColor: colors.navBorderColor,
                  }}
                >
                  <div className="overflow-y-auto flex-1 scrollbar-thin">
                    {colItems.map((item) => {
                      const isActive = currentActiveId === item.id;
                      const hasChildren = item.children && item.children.length > 0;
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => handleItemHover(colIdx + 1, item.id)}
                          style={{
                            backgroundColor: isActive ? colors.navHoverBg : "transparent",
                          }}
                          className="transition-colors duration-150"
                        >
                          <Link
                            href={item.url || "#"}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{
                              color: isActive ? colors.navHoverText : colors.navText,
                              fontSize: `${colors.navFontSize}px`,
                              fontWeight: colors.navFontWeight,
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {item.image && (
                                <Image
                                  width={18}
                                  height={18}
                                  src={item.image}
                                  alt={item.label}
                                  className="w-4.5 h-4.5 object-cover rounded shrink-0"
                                  unoptimized
                                />
                              )}
                              <span className="truncate">{item.label}</span>
                            </div>
                            {hasChildren && (
                              <Icon
                                icon={
                                  submenuDirection === "right"
                                    ? "mdi:chevron-left"
                                    : "mdi:chevron-right"
                                }
                                className="w-4 h-4 opacity-55 shrink-0"
                              />
                            )}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuLocationControl({ value, onChange }: { value: any; onChange: any }) {
  const [slots, setSlots] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    xFetch("/menu?limit=100")
      .then((res) => res.json())
      .then((data) => {
        const slotsList: Array<{ value: string; label: string }> = [];
        (data.menus || []).forEach((m: any) => {
          (m.location || []).forEach((l: string) => {
            if (l) {
              slotsList.push({
                value: l,
                label: `${m.title} (${l})`,
              });
            }
          });
        });
        setSlots(slotsList);
      })
      .catch((err) => console.error("[DarazMenus] Error fetching slots:", err));
  }, []);

  return (
    <>
      {slots.length > 0 ? (
        <Select
          label="Select Active Menu Location"
          value={value || ""}
          onChange={onChange}
          options={[
            { value: "", label: "— Choose a location —" },
            ...slots
          ]}
        />
      ) : (
        <div className="text-xs text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mb-3">
          No menus have assigned location slots. Go to Settings or Menus admin page to assign a location.
        </div>
      )}
      <Text
        label="Or enter custom Location Name"
        value={value || ""}
        onChange={onChange}
        placeholder="e.g. header-1"
      />
    </>
  );
}

const darazMenusElement = {
  type: "daraz-menus",
  category: "Navigation",
  label: "Vertical Menu",
  icon: "memory:box-light-vertical-menu-right",

  schema: {
    content: {
      location: "header-1",
      submenu_direction: "left", // left = opens right, right = opens left
      menu_height: 420,
      panel_width: 240,
    },

    style: {
      nav_bg: "#ffffff",
      nav_text: "#111827",
      nav_highlight: "#f57224",
      nav_hover_bg: "#f5f5f5",
      nav_hover_text: "#f57224",
      nav_border_color: "#e5e7eb",
      nav_font_size: 14,
      nav_font_weight: 500,
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Layout",
      section: "Menu Connection",
      controls: [
        {
          name: "location",
          responsive: false,
          render: (value: any, onChange: any) => (
            <MenuLocationControl value={value} onChange={onChange} />
          ),
        },
        {
          name: "submenu_direction",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Position / Submenu Open Side"
              value={value || "left"}
              onChange={onChange}
              options={[
                { value: "left", label: "Left-side (Submenus open to the right)" },
                { value: "right", label: "Right-side (Submenus open to the left)" },
              ]}
            />
          ),
        },
        {
          name: "menu_height",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Menu Height (px)"
              value={value ?? 420}
              onChange={onChange}
              min={200}
              max={1000}
              step={10}
            />
          ),
        },
        {
          name: "panel_width",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Column Width (px)"
              value={value ?? 240}
              onChange={onChange}
              min={150}
              max={500}
              step={5}
            />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Colours & Styling",
      controls: [
        {
          name: "nav_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Panel Background Colour" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "nav_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Item Text Colour" value={value ?? "#111827"} onChange={onChange} />
          ),
        },
        {
          name: "nav_hover_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Item Hover Text Colour" value={value ?? "#f57224"} onChange={onChange} />
          ),
        },
        {
          name: "nav_hover_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Item Hover Background Colour" value={value ?? "#f5f5f5"} onChange={onChange} />
          ),
        },
        {
          name: "nav_border_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Border Colour" value={value ?? "#e5e7eb"} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Typography",
      controls: [
        {
          name: "nav_font_size",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Font Size (px)"
              value={value ?? 14}
              onChange={onChange}
              min={10}
              max={24}
              step={1}
            />
          ),
        },
        {
          name: "nav_font_weight",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Font Weight"
              value={String(value ?? 500)}
              onChange={(v) => onChange(parseInt(v, 10))}
              options={[
                { value: "400", label: "400 — Regular" },
                { value: "500", label: "500 — Medium" },
                { value: "600", label: "600 — Semi-bold" },
                { value: "700", label: "700 — Bold" },
              ]}
            />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <DarazMenusFrontend element={element} />,
};

export default darazMenusElement;
