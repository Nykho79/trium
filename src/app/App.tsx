import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAudioStore } from "./store/audioStore";
import { useGameStore } from "./store/gameStore";
import { useSettingsStore } from "./store/settingsStore";
import { ErrorBoundary } from "../ui/components/ErrorBoundary";
import { setGlobalAudioEnabled } from "../ui/audio/soundManager";
import { DesignSystemScreen } from "../ui/screens/DesignSystemScreen";
import { DevQuestionBankScreen } from "../ui/screens/DevQuestionBankScreen";
import { ErrorScreen } from "../ui/screens/ErrorScreen";
import { FinaleScreen } from "../ui/screens/FinaleScreen";
import { GameIntroScreen } from "../ui/screens/GameIntroScreen";
import { GameModeScreen } from "../ui/screens/GameModeScreen";
import { GameResultScreen } from "../ui/screens/GameResultScreen";
import { GameScreen } from "../ui/screens/GameScreen";
import { HomeScreen } from "../ui/screens/HomeScreen";
import { PlayerSetupScreen } from "../ui/screens/PlayerSetupScreen";
import { QuestionTransitionScreen } from "../ui/screens/QuestionTransitionScreen";
import { ResumeGameScreen } from "../ui/screens/ResumeGameScreen";
import { RoundIntroScreen } from "../ui/screens/RoundIntroScreen";
import { RoundResultScreen } from "../ui/screens/RoundResultScreen";
import { RulesScreen } from "../ui/screens/RulesScreen";
import { SettingsScreen } from "../ui/screens/SettingsScreen";

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
            {(currentScreen === "format-selection" || currentScreen === "game-mode") && <GameModeScreen />}
            {currentScreen === "resume-game" && <ResumeGameScreen />}
            {currentScreen === "game-intro" && <GameIntroScreen />}
            {currentScreen === "round-intro" && <RoundIntroScreen />}
            {currentScreen === "game" && <GameScreen />}
            {currentScreen === "question-transition" && <QuestionTransitionScreen />}
            {currentScreen === "round-result" && <RoundResultScreen />}
            {currentScreen === "finale" && <FinaleScreen />}
            {(currentScreen === "summary" || currentScreen === "game-result") && <GameResultScreen />}
            {currentScreen === "settings" && <SettingsScreen />}
            {currentScreen === "dev-question-bank" && <DevQuestionBankScreen />}
            {currentScreen === "error" && <ErrorScreen />}
            {import.meta.env.DEV && currentScreen === "design-system" && <DesignSystemScreen />}
          </div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}