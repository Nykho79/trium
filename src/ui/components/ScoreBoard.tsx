import { motion } from "framer-motion";
import { Icon } from "./Icon";

interface ScoreBoardProps {
  score: number;
  streak: number;
  roundLabel: string;
  className?: string;
}

export function ScoreBoard({ score, streak, roundLabel, className = "" }: ScoreBoardProps) {
  return (
    <section className={`score-board ${className}`} aria-label="Score de l'equipe">
      <div>
        <span>Manche</span>
        <strong>{roundLabel}</strong>
      </div>
      <motion.div key={score} initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ duration: 0.22 }}>
        <span>Score equipe</span>
        <strong><Icon name="trophy" /> {score.toLocaleString("fr-FR")}</strong>
      </motion.div>
      <div>
        <span>Serie</span>
        <strong>{streak}</strong>
      </div>
    </section>
  );
}