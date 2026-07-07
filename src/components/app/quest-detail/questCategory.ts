import {
  Bookmark,
  Dumbbell,
  Landmark,
  Moon,
  Palette,
  ShoppingBag,
  Trees,
  UtensilsCrossed,
} from "lucide-react";
import type { QuestCategory } from "@/types/db";

/** Display label + icon for each quest category — used by the hero chip. */
export const CATEGORY_META: Record<
  QuestCategory,
  { label: string; icon: React.ElementType }
> = {
  art: { label: "Art", icon: Palette },
  food: { label: "Food & Drink", icon: UtensilsCrossed },
  outdoors: { label: "Outdoors", icon: Trees },
  culture: { label: "Culture", icon: Landmark },
  nightlife: { label: "Nightlife", icon: Moon },
  shopping: { label: "Shopping", icon: ShoppingBag },
  fitness: { label: "Fitness", icon: Dumbbell },
  hidden_gem: { label: "Hidden Gem", icon: Bookmark },
};

export function categoryMeta(category: string) {
  return (
    CATEGORY_META[category as QuestCategory] ?? {
      label: category.replace(/_/g, " "),
      icon: Bookmark,
    }
  );
}
