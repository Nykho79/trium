import { motion } from "framer-motion";
import { Icon } from "./Icon";

interface LoadingScreenProps {
  title?: string;
  message?: string;
}

export function LoadingScreen({ title = "Chargement", message = "Preparation de la partie" }: LoadingScreenProps) {
  return (
    <section className="loading-screen" aria-busy="true" aria-live="polite">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
        <Icon name="loader" />
      </motion.div>
      <h1>{title}</h1>
      <p>{message}</p>
    </section>
  );
}