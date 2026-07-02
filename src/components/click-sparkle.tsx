import { useCallback, useRef, type ReactNode, type MouseEvent } from "react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  size: number;
  emoji: string;
}

const EMOJIS = ["✨", "💫", "⭐", "🌸", "💖", "🦋"];

export function ClickSparkle({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sparkles: Sparkle[] = [];

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const dist = 25 + Math.random() * 30;
      sparkles.push({
        id: ++idRef.current,
        x,
        y,
        sx: Math.cos(angle) * dist,
        sy: Math.sin(angle) * dist,
        size: 8 + Math.random() * 10,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }

    sparkles.forEach((s) => {
      const el = document.createElement("span");
      el.className = "sparkle-particle";
      el.textContent = s.emoji;
      el.style.cssText = `
        left: ${s.x}px;
        top: ${s.y}px;
        font-size: ${s.size}px;
        --sx: ${s.sx}px;
        --sy: ${s.sy}px;
      `;
      containerRef.current?.appendChild(el);
      setTimeout(() => el.remove(), 800);
    });
  }, []);

  return (
    <div ref={containerRef} onClick={handleClick} className={`relative ${className ?? ""}`}>
      {children}
    </div>
  );
}
