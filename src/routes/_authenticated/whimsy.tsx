import { createFileRoute, Link } from "@tanstack/react-router";
import { useWhimsy, DEFAULT_EMOJIS, type EffectSpeed } from "@/hooks/use-whimsy";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Flower2, Heart, RotateCcw, Palette } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/whimsy")({
  head: () => ({ meta: [{ title: "Customise effects · Her Haven" }] }),
  component: WhimsyPage,
});

// ── emoji palettes ─────────────────────────────────────

const EMOJI_PALETTES = {
  sparkles: [
    ["✨", "💫", "⭐"],
    ["🌸", "💖", "🦋"],
    ["🌟", "💝", "🎀"],
    ["🌙", "🕯️", "💎"],
  ],
  blossoms: [
    ["🌸", "💮", "🌺"],
    ["🌷", "🪻", "🌼"],
    ["🍃", "🌿", "🪷"],
    ["💐", "🌻", "🌾"],
  ],
  hearts: [
    ["💖", "💕", "💗"],
    ["💝", "🩷", "❤️"],
    ["💘", "💓", "💞"],
    ["🧡", "💛", "🤍"],
  ],
};

const SPEED_LABELS: { value: EffectSpeed; label: string }[] = [
  { value: "slow", label: "Gentle" },
  { value: "medium", label: "Breezy" },
  { value: "fast", label: "Lively" },
];

// ── emoji picker ───────────────────────────────────────

function EmojiPalettePicker({
  current,
  palettes,
  onChange,
  label,
  max,
}: {
  current: string[];
  palettes: string[][];
  onChange: (emojis: string[]) => void;
  label: string;
  max: number;
}) {
  const [custom, setCustom] = useState("");
  const display = current.slice(0, max);

  const addEmoji = (e: string) => {
    if (current.includes(e)) {
      onChange(current.filter((x) => x !== e));
    } else if (current.length < max) {
      onChange([...current, e]);
    }
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || current.includes(trimmed) || current.length >= max) return;
    onChange([...current, trimmed]);
    setCustom("");
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      {/* Preset palettes */}
      <div className="flex flex-wrap gap-2">
        {palettes.map((palette, i) => {
          const active = palette.every((e) => current.includes(e));
          return (
            <button
              key={i}
              onClick={() => onChange(palette.slice(0, max))}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--rose-deep)] bg-[var(--rose-soft)]"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              {palette.slice(0, max).join(" ")}
            </button>
          );
        })}
      </div>
      {/* Current selection */}
      <div className="flex items-center gap-2">
        {display.map((e, i) => (
          <button
            key={i}
            onClick={() => onChange(current.filter((x) => x !== e))}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rose-deep)] bg-[var(--rose-soft)] text-lg transition hover:bg-[var(--rose)]"
          >
            {e}
          </button>
        ))}
        {current.length < max && (
          <div className="flex items-center gap-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="+ emoji"
              className="h-9 w-20 rounded-full border border-border bg-transparent px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--rose-deep)] focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────

function WhimsyPage() {
  const { settings, update, reset } = useWhimsy();

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <Link to="/feed" className="text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rose-soft)]">
          <Palette className="h-5 w-5 text-[var(--rose-deep)]" />
        </span>
        <div>
          <h1 className="font-serif text-3xl text-foreground">Customise effects</h1>
          <p className="text-xs text-muted-foreground">Make Her Haven feel like yours.</p>
        </div>
      </div>

      {/* ── Master toggle ─────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-sm font-medium text-foreground">All effects</p>
          <p className="text-xs text-muted-foreground">
            {settings.effectsEnabled ? "Whimsy is on ✨" : "Whimsy is off"}
          </p>
        </div>
        <Switch
          checked={settings.effectsEnabled}
          onCheckedChange={(v) => update({ effectsEnabled: v })}
        />
      </div>

      {settings.effectsEnabled && (
        <>
          {/* ── Per-effect toggles ────────────────────── */}
          <div className="mt-4 grid gap-3">
            {[
              {
                key: "sparklesEnabled" as const,
                icon: Sparkles,
                label: "Click sparkles",
                desc: "Emoji bursts when you tap buttons",
              },
              {
                key: "blossomsEnabled" as const,
                icon: Flower2,
                label: "Cherry blossoms",
                desc: "Falling petals on the feed",
              },
              {
                key: "heartsEnabled" as const,
                icon: Heart,
                label: "Floating hearts",
                desc: "Hearts burst when reacting ❤️",
              },
            ].map(({ key, icon: Icon, label, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(v) => update({ [key]: v })}
                />
              </div>
            ))}
          </div>

          {/* ── Blossom settings ───────────────────────── */}
          {settings.blossomsEnabled && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-6">
              <p className="eyebrow">🌸 Blossom settings</p>

              {/* Count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground">Petals</p>
                  <span className="text-xs tabular-nums text-muted-foreground">{settings.blossomCount}</span>
                </div>
                <Slider
                  value={[settings.blossomCount]}
                  min={10}
                  max={40}
                  step={5}
                  onValueChange={([v]) => update({ blossomCount: v })}
                />
              </div>

              {/* Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground">Size</p>
                  <span className="text-xs tabular-nums text-muted-foreground">{settings.blossomSize}px</span>
                </div>
                <Slider
                  value={[settings.blossomSize]}
                  min={8}
                  max={24}
                  step={2}
                  onValueChange={([v]) => update({ blossomSize: v })}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground">Opacity</p>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(settings.blossomOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.blossomOpacity * 100]}
                  min={20}
                  max={100}
                  step={10}
                  onValueChange={([v]) => update({ blossomOpacity: v / 100 })}
                />
              </div>

              {/* Speed */}
              <div className="space-y-2">
                <p className="text-xs text-foreground">Speed</p>
                <div className="flex gap-2">
                  {SPEED_LABELS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => update({ blossomSpeed: value })}
                      className={`flex-1 rounded-full border px-3 py-2 text-xs transition ${
                        settings.blossomSpeed === value
                          ? "border-[var(--rose-deep)] bg-[var(--rose-soft)] text-[var(--rose-deep)]"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Emoji pickers ──────────────────────────── */}
          <div className="mt-4 space-y-8 rounded-2xl border border-border bg-card p-6">
            <p className="eyebrow">🎨 Choose your emojis</p>

            {settings.sparklesEnabled && (
              <EmojiPalettePicker
                current={settings.sparkleEmojis}
                palettes={EMOJI_PALETTES.sparkles}
                onChange={(emojis) => update({ sparkleEmojis: emojis })}
                label="Click sparkles"
                max={8}
              />
            )}

            {settings.blossomsEnabled && (
              <EmojiPalettePicker
                current={settings.blossomEmojis}
                palettes={EMOJI_PALETTES.blossoms}
                onChange={(emojis) => update({ blossomEmojis: emojis })}
                label="Cherry blossoms"
                max={10}
              />
            )}

            {settings.heartsEnabled && (
              <EmojiPalettePicker
                current={settings.heartEmojis}
                palettes={EMOJI_PALETTES.hearts}
                onChange={(emojis) => update({ heartEmojis: emojis })}
                label="Floating hearts"
                max={8}
              />
            )}
          </div>
        </>
      )}

      {/* ── Reset ───────────────────────────────────────── */}
      <button
        onClick={reset}
        className="mt-6 flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" /> Reset to defaults
      </button>
    </div>
  );
}
