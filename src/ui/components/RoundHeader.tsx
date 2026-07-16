import { motion } from "framer-motion";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

interface RoundHeaderProps {
  roundLabel: string;
  questionIndex: number;
  questionCount: number;
  categoryLabel?: string;
}

export function RoundHeader({ roundLabel, questionIndex, questionCount, categoryLabel }: RoundHeaderProps) {
  return (
    <motion.header className="round-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div>
        <Badge tone="violet">Manche</Badge>
        <h1>{roundLabel}</h1>
        {categoryLabel ? <p>{categoryLabel}</p> : null}
      </div>
      <ProgressBar value={questionIndex} max={questionCount} label={`Question ${questionIndex} / ${questionCount}`} tone="cyan" />
    </motion.header>
  );
}