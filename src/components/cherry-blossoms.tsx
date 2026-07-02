import { useMemo } from "react";

const PETALS = [
  { emoji: "🌸", size: 12 },
  { emoji: "🌸", size: 16 },
  { emoji: "🌸", size: 10 },
  { emoji: "💮", size: 11 },
  { emoji: "🌺", size: 14 },
  { emoji: "🌸", size: 13 },
  { emoji: "🌷", size: 10 },
  { emoji: "🌸", size: 15 },
  { emoji: "💮", size: 9 },
  { emoji: "🌸", size: 12 },
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function CherryBlossoms() {
  const petals = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const petal = PETALS[i % PETALS.length];
      return {
        id: i,
        emoji: petal.emoji,
        size: petal.size + Math.random() * 6,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: randomBetween(10, 18),
        rotate: 200 + Math.random() * 400,
        sway: 10 + Math.random() * 40,
        drift: 20 + Math.random() * 60,
      };
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="blossom-petal"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            "--dur": `${p.duration}s`,
            "--pr": `${p.rotate}deg`,
            "--px": `${p.drift}px`,
            "--sw": `${p.sway}px`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
