import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motionTimings } from "../theme/motion";

interface ScreenFrameProps {
  children: ReactNode;
  title?: string;
}

export function ScreenFrame({ children, title }: ScreenFrameProps) {
  return (
    <motion.main
      className="screen-frame"
      aria-label={title}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: motionTimings.screen, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}
