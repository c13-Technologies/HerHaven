import { useCallback, useRef, type ReactNode, type MouseEvent } from "react";
import { useWhimsy } from "@/hooks/use-whimsy";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  size: number;
  emoji: string;
}

export function ClickSparkle({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const { settings } = useWhimsy();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!settings.sparklesEnabled || !settings.effectsEnabled) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const emojis = settings.sparkleEmojis;

      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
        const dist = 25 + Math.random() * 30;
        const el = document.createElement("span");
        el.className = "sparkle-particle";
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.cssText = `
          left: ${x}px;
          top: ${y}px;
          font-size: ${8 + Math.random() * 10}px;
          --sx: ${Math.cos(angle) * dist}px;
          --sy: ${Math.sin(angle) * dist}px;
        `;
        containerRef.current?.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }
    },
    [settings],
  );

  return (
    <div ref={containerRef} onClick={handleClick} className={`relative ${className ?? ""}`}>
      {children}
    </div>
  );
}
