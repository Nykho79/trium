import { motion } from "framer-motion";
import { Icon } from "./Icon";

interface CaptainIndicatorProps {
  playerName: string;
}

export function CaptainIndicator({ playerName }: CaptainIndicatorProps) {
  return (
    <motion.div className="captain-indicator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <Icon name="captain" />
      <span>Capitaine</span>
      <strong>{playerName}</strong>
    </motion.div>
  );
}