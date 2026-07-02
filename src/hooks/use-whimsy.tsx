import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ── types ──────────────────────────────────────────────

export type EffectSpeed = "slow" | "medium" | "fast";

export interface WhimsySettings {
  effectsEnabled: boolean;
  sparklesEnabled: boolean;
  blossomsEnabled: boolean;
  heartsEnabled: boolean;
  blossomCount: number;    // 10-40
  blossomSize: number;     // 8-24
  blossomSpeed: EffectSpeed;
  blossomOpacity: number;  // 0.2-1.0
  sparkleEmojis: string[];
  blossomEmojis: string[];
  heartEmojis: string[];
}

// ── defaults ───────────────────────────────────────────

export const DEFAULT_EMOJIS = {
  sparkles: ["✨", "💫", "⭐", "🌸", "💖", "🦋"],
  blossoms: ["🌸", "🌸", "🌸", "💮", "🌺", "🌸", "🌷", "🌸", "💮", "🌸"],
  hearts: ["💖", "💕", "💗", "💝", "🩷", "❤️"],
};

const DEFAULTS: WhimsySettings = {
  effectsEnabled: true,
  sparklesEnabled: true,
  blossomsEnabled: true,
  heartsEnabled: true,
  blossomCount: 20,
  blossomSize: 12,
  blossomSpeed: "medium",
  blossomOpacity: 0.8,
  sparkleEmojis: DEFAULT_EMOJIS.sparkles,
  blossomEmojis: DEFAULT_EMOJIS.blossoms,
  heartEmojis: DEFAULT_EMOJIS.hearts,
};

const STORAGE_KEY = "her-haven-whimsy";

// ── context ────────────────────────────────────────────

const WhimsyContext = createContext<{
  settings: WhimsySettings;
  update: (patch: Partial<WhimsySettings>) => void;
  reset: () => void;
} | null>(null);

function loadSettings(): WhimsySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function saveSettings(s: WhimsySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function WhimsyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WhimsySettings>(DEFAULTS);

  // load once on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<WhimsySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    saveSettings(DEFAULTS);
  }, []);

  return (
    <WhimsyContext.Provider value={{ settings, update, reset }}>
      {children}
    </WhimsyContext.Provider>
  );
}

export function useWhimsy() {
  const ctx = useContext(WhimsyContext);
  if (!ctx) throw new Error("useWhimsy must be used within a WhimsyProvider");
  return ctx;
}
