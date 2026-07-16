import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useSettingsStore } from "../store/settingsStore";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  return <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig>;
}