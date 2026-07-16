import { motion } from "framer-motion";
import { Icon } from "./Icon";

type FeedbackTone = "success" | "warning" | "danger" | "info";

interface FeedbackBannerProps {
  tone?: FeedbackTone;
  title: string;
  message: string;
}

const toneIcons: Record<FeedbackTone, "check" | "alert" | "bolt" | "spark"> = {
  success: "check",
  warning: "alert",
  danger: "alert",
  info: "spark",
};

export function FeedbackBanner({ tone = "info", title, message }: FeedbackBannerProps) {
  return (
    <motion.div className={`feedback-banner feedback-${tone}`} role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <Icon name={toneIcons[tone]} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </motion.div>
  );
}