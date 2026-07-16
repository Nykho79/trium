import { AnimatePresence } from "framer-motion";
import { useEffect, type CSSProperties } from "react";
import { useTvRuntime } from "./hooks/useTvRuntime";
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

const devOnlyScreens = new Set(["design-system", "dev-question-bank"]);

export function App() {
  const screen = useGameStore((state) => state.screen);
  const previousScreen = useGameStore((state) => state.previousScreen);
  const navigate = useGameStore((state) => state.navigate);
  const currentScreen = !import.meta.env.DEV && devOnlyScreens.has(screen) ? "settings" : screen;
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const fullscreenActive = useSettingsStore((state) => state.fullscreenActive);
  const uiScale = useSettingsStore((state) => state.uiScale);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  const tvRuntime = useTvRuntime({ currentScreen, previousScreen, navigate });
  const shellStyle = { "--trium-ui-scale": uiScale } as CSSProperties;

  useEffect(() => {
    setGlobalAudioEnabled(soundEnabled && !masterMuted);
  }, [masterMuted, soundEnabled]);

  return (
    <ErrorBoundary>
      <div aria-label="TRIUM" className={`app-shell ${tvRuntime.isCursorHidden ? "is-cursor-hidden" : ""}`} style={shellStyle} tabIndex={-1}>
        <div className="ambient-grid" aria-hidden="true" />
        <div className="tv-controls" aria-label="Affichage TV">
          <button type="button" className="tv-control-button" onClick={() => void tvRuntime.toggleFullscreen()}>
            {fullscreenActive ? "Sortir" : "Plein ecran"}
          </button>
          <button type="button" className="tv-control-button" onClick={() => navigate(currentScreen === "settings" ? previousScreen : "settings")}>
            Menu
          </button>
        </div>
        {tvRuntime.isWindowTooSmall ? (
          <div className="tv-size-warning" role="alert">
            Fenetre trop petite pour une TV : 1280 x 720 minimum recommande.
          </div>
        ) : null}
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
            {import.meta.env.DEV && currentScreen === "dev-question-bank" && <DevQuestionBankScreen />}
            {currentScreen === "error" && <ErrorScreen />}
            {import.meta.env.DEV && currentScreen === "design-system" && <DesignSystemScreen />}
          </div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
