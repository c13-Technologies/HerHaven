import {
  Brain,
  Briefcase,
  Coffee,
  Compass,
  Gem,
  HeartHandshake,
  type LucideIcon,
  MessagesSquare,
  Sprout,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

/**
 * Lucide icon map for the eleven categories. The previous emoji column on
 * the `categories` table is no longer rendered anywhere; these icons are the
 * single source of truth. Pass `CategoryIcon({ slug, className })` to render.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  relationships: HeartHandshake,
  career: Briefcase,
  marriage: Gem,
  motherhood: UsersRound,
  "mental-wellness": Brain,
  "personal-growth": Sprout,
  finance: Wallet,
  friendship: Users,
  faith: Compass,
  lifestyle: Coffee,
  general: MessagesSquare,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? MessagesSquare;
  return <Icon className={className} aria-hidden="true" />;
}
