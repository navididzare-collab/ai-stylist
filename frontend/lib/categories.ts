export type CategoryFilterType = "category" | "occasion";

export interface CategoryItem {
  id: number;
  label: string;
  icon: string | null;
  filterType: CategoryFilterType | null;
  value: string | null;
}

export const categories: CategoryItem[] = [
  { id: 2, label: "تیشرت", icon: "/categories/tshirt.png", filterType: "category", value: "تیشرت" },
  { id: 3, label: "شلوار", icon: "/categories/pants.png", filterType: "category", value: "شلوار" },
  { id: 5, label: "کاپشن", icon: "/categories/jacket.png", filterType: "category", value: "کاپشن" },
  { id: 6, label: "هودی", icon: "/categories/hoodie.png", filterType: "category", value: "هودی" },
  { id: 8, label: "مانتو", icon: "/categories/manto.png", filterType: "category", value: "مانتو" },
  { id: 9, label: "رسمی", icon: "/categories/formal.png", filterType: "occasion", value: "رسمی" },
  { id: 10, label: "بیشتر", icon: null, filterType: null, value: null },
];