import { useCallback, useRef } from "react";
import { useWhimsy } from "@/hooks/use-whimsy";

export function useFloatingHearts() {
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useWhimsy();

  const burst = useCallback(() => {
    if (!settings.heartsEnabled || !settings.effectsEnabled) return;
    const container = ref.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const emojis = settings.heartEmojis;

    for (let i = 0; i < 6; i++) {
      const el = document.createElement("span");
      el.className = "heart-burst-particle";
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 35;
      el.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        --hx: ${Math.cos(angle) * dist}px;
        --hy: ${Math.sin(angle) * dist}px;
      `;
      container.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }

    for (let i = 0; i < 3; i++) {
      const el = document.createElement("span");
      el.className = "heart-float-particle";
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.cssText = `
        left: ${cx + (Math.random() - 0.5) * 20}px;
        top: ${cy - 5}px;
        animation-delay: ${i * 0.12}s;
      `;
      container.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  }, [settings]);

  return { ref, burst };
}
