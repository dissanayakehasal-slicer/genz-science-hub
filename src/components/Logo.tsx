import { motion } from "framer-motion";

export function Logo({ size = 40, logoUrl }: { size?: number; logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="GSM" style={{ width: size, height: size }} className="rounded-xl object-cover shadow-gold" />;
  }
  return (
    <motion.div
      whileHover={{ rotate: 6, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-gradient-brown grid place-items-center rounded-xl shadow-gold"
      style={{ width: size, height: size }}
    >
      <span className="font-display font-bold tracking-tight text-[var(--gold-soft)]" style={{ fontSize: size * 0.38 }}>
        GSM
      </span>
    </motion.div>
  );
}
