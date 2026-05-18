import { motion } from "framer-motion";
import { useMemo } from "react";

export function ParticlesBackground() {
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 6 + Math.random() * 14,
      dur: 8 + Math.random() * 10,
    })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 0 }}
          animate={{ y: [`${p.y}vh`, `${p.y - 20}vh`, `${p.y}vh`], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: p.size, height: p.size }}
          className="absolute rounded-full bg-gradient-gold blur-[1px]"
        />
      ))}
    </div>
  );
}
