export const CATEGORY_STYLES = {
  Food: { icon: "🍔", color: "#f97316", bg: "#ffedd5" },
  Petrol: { icon: "⛽", color: "#0891b2", bg: "#cffafe" },
  Salary: { icon: "💼", color: "#16a34a", bg: "#dcfce7" },
  Shopping: { icon: "🛍️", color: "#db2777", bg: "#fce7f3" },
  Bills: { icon: "🧾", color: "#ca8a04", bg: "#fef9c3" },
  Travel: { icon: "✈️", color: "#2563eb", bg: "#dbeafe" },
  Entertainment: { icon: "🎬", color: "#9333ea", bg: "#f3e8ff" },
  Health: { icon: "💊", color: "#dc2626", bg: "#fee2e2" },
  Other: { icon: "📦", color: "#4b5563", bg: "#f3f4f6" },
};

export const CATEGORIES = Object.keys(CATEGORY_STYLES);

export function styleFor(category) {
  const key = CATEGORIES.find((k) => k.toLowerCase() === String(category).toLowerCase());
  return { ...CATEGORY_STYLES[key || "Other"], name: key || category };
}

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
