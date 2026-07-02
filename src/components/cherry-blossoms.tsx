import { useMemo } from "react";
import { useWhimsy } from "@/hooks/use-whimsy";
import type { EffectSpeed } from "@/hooks/use-whimsy";

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const SPEED_MAP: Record<EffectSpeed, number> = { slow: 18, medium: 13, fast: 8 };

export function CherryBlossoms() {
  const { settings } = useWhimsy();

  const petals = useMemo(() => {
    if (!settings.blossomsEnabled || !settings.effectsEnabled) return [];
    const emojis = settings.blossomEmojis;
    const baseSpeed = SPEED_MAP[settings.blossomSpeed];
    return Array.from({ length: settings.blossomCount }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      size: settings.blossomSize + Math.random() * 6,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: baseSpeed + Math.random() * 5,
      rotate: 200 + Math.random() * 400,
      drift: 20 + Math.random() * 60,
    }));
  }, [settings]);

  if (petals.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="blossom-petal"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            opacity: settings.blossomOpacity,
            animationDelay: `${p.delay}s`,
            "--dur": `${p.duration}s`,
            "--pr": `${p.rotate}deg`,
            "--px": `${p.drift}px`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
