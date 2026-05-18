import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useContactSettings } from "@/hooks/useSiteData";

export function FloatingWhatsApp() {
  const { data: contact } = useContactSettings();
  const num = contact?.whatsapp_number_1?.replace(/\D/g, "");
  if (!num) return null;
  return (
    <motion.a
      href={`https://wa.me/${num}`}
      target="_blank"
      rel="noreferrer"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: "spring" }}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-elegant"
    >
      <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-[#25D366] opacity-40" />
      <MessageCircle size={26} className="relative" />
    </motion.a>
  );
}
