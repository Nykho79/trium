import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAudioStore } from "./store/audioStore";
import { useGameStore } from "./store/gameStore";
import { useSettingsStore } from "./store/settingsStore";
import { ErrorBoundary } from "../ui/components/ErrorBoundary";
import { setGlobalAudioEnabled } from "../ui/audio/soundManager";
import { DesignSystemScreen } from "../ui/screens/DesignSystemScreen";
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
  const currentScreen = !import.meta.env.DEV && screen === "design-system" ? "settings" : screen;
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);

  useEffect(() => {
    setGlobalAudioEnabled(soundEnabled && !masterMuted);
  }, [masterMuted, soundEnabled]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <div className="ambient-grid" aria-hidden="true" />
        <AnimatePresence mode="wait">
          <div key={currentScreen} className="screen-slot">
            {currentScreen === "home" && <HomeScreen />}
            {currentScreen === "rules" && <RulesScreen />}
            {currentScreen === "player-setup" && <PlayerSetupScreen />}
            {currentScreen === "format-selection" && <FormatSelectionScreen />}
            {currentScreen === "game-intro" && <GameIntroScreen />}
            {currentScreen === "game" && <GameScreen />}
            {currentScreen === "question-transition" && <QuestionTransitionScreen />}
            {currentScreen === "round-result" && <RoundResultScreen />}
            {currentScreen === "finale" && <FinaleScreen />}
            {currentScreen === "summary" && <SummaryScreen />}
            {currentScreen === "settings" && <SettingsScreen />}
            {currentScreen === "dev-question-bank" && <DevQuestionBankScreen />}
            {import.meta.env.DEV && currentScreen === "design-system" && <DesignSystemScreen />}
          </div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}