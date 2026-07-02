import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, Plus, Pencil, Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories · Admin · Her Haven" }] }),
  component: AdminCategoriesPage,
});

const PLANNED = [
  {
    icon: GripVertical,
    title: "Drag-to-reorder",
    note: "Reorder rooms, the ord column on each category updates accordingly.",
  },
  {
    icon: Pencil,
    title: "Inline edit",
    note: "Edit a category's name or description in place.",
  },
  {
    icon: Plus,
    title: "Add new room",
    note: "Slug + name + description. Calls admin_manage_category('UPSERT').",
  },
  {
    icon: Trash2,
    title: "Retire a room",
    note: "Only allowed when no posts reference it. Calls admin_manage_category('DELETE').",
  },
];

function AdminCategoriesPage() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-10">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--rose-soft)]/70 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
          <LayoutGrid className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">Stage 3</p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            Categories — coming soon
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The migration dropped the obsolete{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              categories.emoji
            </code>{" "}
            column (icons now come from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              src/lib/category-icons.tsx
            </code>
            ). CRUD will route through the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              admin_manage_category
            </code>{" "}
            RPC.
          </p>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {PLANNED.map((p) => {
          const Icon = p.icon;
          return (
            <li
              key={p.title}
              className="rounded-xl border border-border bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-[var(--rose-deep)]" />
                <div className="min-w-0">
                  <p className="font-serif text-base text-foreground">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
