import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAudioStore } from "./store/audioStore";
import { useGameStore } from "./store/gameStore";
import { useSettingsStore } from "./store/settingsStore";
import { setGlobalAudioEnabled } from "../ui/audio/soundManager";
import { DevQuestionBankScreen } from "../ui/screens/DevQuestionBankScreen";
import { FinaleScreen } from "../ui/screens/FinaleScreen";
import { FormatSelectionScreen } from "../ui/screens/FormatSelectionScreen";
import { GameIntroScreen } from "../ui/screens/GameIntroScreen";
import { GameScreen } from "../ui/screens/GameScreen";
import { HomeScreen } from "../ui/screens/HomeScreen";
import { PlayerSetupScreen } from "../ui/screens/PlayerSetupScreen";
import { QuestionTransitionScreen } from "../ui/screens/QuestionTransitionScreen";
import { RoundResultScreen } from "../ui/screens/RoundResultScreen";
import { RulesScreen } from "../ui/screens/RulesScreen";
import { SettingsScreen } from "../ui/screens/SettingsScreen";
import { SummaryScreen } from "../ui/screens/SummaryScreen";

export function App() {
  const screen = useGameStore((state) => state.screen);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);

  useEffect(() => {
    setGlobalAudioEnabled(soundEnabled && !masterMuted);
  }, [masterMuted, soundEnabled]);

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <div key={screen} className="screen-slot">
          {screen === "home" && <HomeScreen />}
          {screen === "rules" && <RulesScreen />}
          {screen === "player-setup" && <PlayerSetupScreen />}
          {screen === "format-selection" && <FormatSelectionScreen />}
          {screen === "game-intro" && <GameIntroScreen />}
          {screen === "game" && <GameScreen />}
          {screen === "question-transition" && <QuestionTransitionScreen />}
          {screen === "round-result" && <RoundResultScreen />}
          {screen === "finale" && <FinaleScreen />}
          {screen === "summary" && <SummaryScreen />}
          {screen === "settings" && <SettingsScreen />}
          {screen === "dev-question-bank" && <DevQuestionBankScreen />}
        </div>
      </AnimatePresence>
    </div>
  );
}