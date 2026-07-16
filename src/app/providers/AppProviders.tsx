import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useGameStore } from "../store/gameStore";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  return <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig>;
}
