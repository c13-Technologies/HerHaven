import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/lib/category-icons";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type CategoryRow = {
  slug: string;
  name: string;
  description: string | null;
  ord: number;
};

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories · Admin · Her Haven" }] }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: rows } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("slug, name, description, ord")
        .order("ord", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CategoryRow[];
    },
  });

  // Keep local optimistic ordering in sync with the server after refetches.
  useEffect(() => {
    if (rows) setItems(rows);
  }, [rows]);

  // Snapshot taken at drag-start so a failed reorder can roll back to
  // exactly what the user had on their screen, not whatever the server
  // refetch delivered in the meantime.
  const dragSnapshotRef = useState<CategoryRow[]>([])[0];

  const persistOrder = async (next: CategoryRow[], snapshot: CategoryRow[]) => {
    try {
      const { error } = await supabase.rpc("admin_reorder_categories", {
        p_slugs: next.map((r) => r.slug),
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-overview-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["categories-with-counts"] });
      qc.invalidateQueries({ queryKey: ["category", ""] });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Reorder failed — rolling back.";
      toast.error(msg);
      if (snapshot.length) setItems(snapshot);
    }
  };

  const handleDragStart = () => {
    // Capture the pre-drag order at the moment the user starts dragging.
    dragSnapshotRef.splice(0, dragSnapshotRef.length, ...items);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((r) => r.slug === active.id);
      const newIndex = prev.findIndex((r) => r.slug === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      // Recompute ord values so the server sees a self-consistent array.
      const renumbered = next.map((r, i) => ({ ...r, ord: i + 1 }));
      // Pass a fresh snapshot in case the user has dragged multiple times
      // and we want to undo only the latest move.
      const snapshot = [...dragSnapshotRef];
      void persistOrder(renumbered, snapshot);
      return renumbered;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Categories</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag to reorder. Edit, add, or retire rooms from here.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAdding(true)}
          className="gap-2 rounded-full"
        >
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) =>
              `Picked up category ${active.id}. Use arrow keys to move it.`,
            onDragOver: ({ active, over }) =>
              over ? `Over ${over.id}.` : "",
            onDragEnd: ({ active, over }) =>
              over
                ? `Dropped ${active.id} on ${over.id}. Order saved.`
                : `Drop cancelled. ${active.id} returned to its starting position.`,
            onDragCancel: ({ active }) => `Cancelled drag of ${active.id}.`,
          },
        }}
      >
        <SortableContext
          items={items.map((r) => r.slug)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-6 space-y-2">
            {items.map((c) => (
              <SortableCategoryRow
                key={c.slug}
                category={c}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
            {items.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                No categories yet.
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>

      {editing && (
        <EditCategoryDialog
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
          }}
        />
      )}

      {adding && (
        <AddCategoryDialog
          currentMaxOrd={items.length}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  <span className="text-foreground">{deleting.name}</span> will
                  be removed from the public list.{" "}
                  {deleting.slug === "general"
                    ? "The 'general' room is the fallback for posts that don't pick a category — retire it with care."
                    : "If any posts still sit in this room, the action will be refused by the database."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  const { error } = await supabase.rpc("admin_manage_category", {
                    p_action: "DELETE",
                    p_slug: deleting.slug,
                  });
                  if (error) throw error;
                  toast.success(`${deleting.name} retired.`);
                  qc.invalidateQueries({ queryKey: ["admin-categories"] });
                  qc.invalidateQueries({
                    queryKey: ["admin-overview-categories"],
                  });
                } catch (e: unknown) {
                  const msg =
                    e instanceof Error ? e.message : "Retire failed";
                  toast.error(msg);
                } finally {
                  setDeleting(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableCategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryRow;
  onEdit: (c: CategoryRow) => void;
  onDelete: (c: CategoryRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.slug });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-full text-muted-foreground transition hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--rose-soft)]/60 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
        <CategoryIcon slug={category.slug} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base text-foreground">
          {category.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
            /{category.slug}
          </code>
          {category.description ? (
            <>
              <span className="mx-2">·</span>
              {category.description}
            </>
          ) : null}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onEdit(category)}
        aria-label={`Edit ${category.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(category)}
        aria-label={`Retire ${category.name}`}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function EditCategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: CategoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [desc, setDesc] = useState(category.description ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    name.trim() !== category.name.trim() ||
    (desc ?? "").trim() !== (category.description ?? "").trim();

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_manage_category", {
        p_action: "UPSERT",
        p_slug: category.slug,
        p_name: name.trim(),
        p_description: desc.trim(),
        p_ord: category.ord,
      });
      if (error) throw error;
      toast.success("Saved.");
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit "{category.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Slug (immutable)
            </label>
            <Input
              value={category.slug}
              readOnly
              className="mt-1 h-10 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Display name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Name"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Description
            </label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="What kind of sisterhood sits in this room?"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={save}
            disabled={saving || !name.trim() || !dirty}
            className="rounded-full"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryDialog({
  currentMaxOrd,
  onClose,
  onSaved,
}: {
  currentMaxOrd: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanSlug = slug.trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cleanSlug)) {
      toast.error("Slug: lowercase letters, numbers, dashes, must start alphanumeric.");
      return;
    }
    if (!name.trim()) {
      toast.error("Display name is required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_manage_category", {
        p_action: "UPSERT",
        p_slug: cleanSlug,
        p_name: name.trim(),
        p_description: desc.trim(),
        p_ord: currentMaxOrd + 1,
      });
      if (error) throw error;
      toast.success("Category added.");
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Slug
            </label>
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="e.g. caregiving"
              maxLength={32}
              className="mt-1 h-10 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Display name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Caregiving"
              maxLength={40}
              className="mt-1 h-10"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Description
            </label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="A short line that sets the tone."
              rows={3}
              maxLength={200}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={save}
            disabled={saving || !slug.trim() || !name.trim()}
            className="rounded-full"
          >
            {saving ? "Adding…" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
