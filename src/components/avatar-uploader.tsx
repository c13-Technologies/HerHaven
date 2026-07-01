import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarUploaderProps {
  userId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

export function AvatarUploader({
  userId,
  currentUrl,
  onUploaded,
  onRemoved,
}: AvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleUpload = async () => {
    if (!file || !userId) return;
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const finalUrl = urlData.publicUrl;

    // Update the profile's avatar_url
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: finalUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update profile: " + updateError.message);
      setUploading(false);
      return;
    }

    onUploaded(finalUrl);
    toast.success("Avatar updated!");
    setUploading(false);
    setFile(null);
  };

  const handleRemove = () => {
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemoved();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Drop zone / preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`relative h-28 w-28 cursor-pointer rounded-full border-2 border-dashed transition-all duration-200 ${
          dragging
            ? "scale-105 border-[var(--rose)] bg-[var(--rose-soft)]/20"
            : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
        } flex items-center justify-center overflow-hidden`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Photo
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Save photo"}
          </button>
        )}
        {(preview || file) && (
          <button
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Drag & drop or click · JPG, PNG, WebP · Max 5MB
      </p>
    </div>
  );
}
