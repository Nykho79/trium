/* global navigator, EventTarget, Element, WakeLockSentinel, KeyboardEvent */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppScreen } from "../../core/types";
import { useSettingsStore } from "../store/settingsStore";

const MIN_TV_WIDTH = 1280;
const MIN_TV_HEIGHT = 720;
const CURSOR_IDLE_MS = 3200;


interface TvRuntimeInput {
  currentScreen: AppScreen;
  previousScreen: AppScreen;
  navigate: (screen: AppScreen) => void;
}

export interface TvRuntimeState {
  isCursorHidden: boolean;
  isWindowTooSmall: boolean;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function currentViewportSize(): { width: number; height: number } {
  const visualViewport = window.visualViewport;
  return {
    width: Math.round(visualViewport?.width ?? window.innerWidth),
    height: Math.round(visualViewport?.height ?? window.innerHeight),
  };
}

function fullscreenElement(): Element | null {
  return document.fullscreenElement ?? null;
}

export function useTvRuntime(input: TvRuntimeInput): TvRuntimeState {
  const keepScreenAwake = useSettingsStore((state) => state.keepScreenAwake);
  const setFullscreenActive = useSettingsStore((state) => state.setFullscreenActive);
  const setWakeLockStatus = useSettingsStore((state) => state.setWakeLockStatus);
  const [isCursorHidden, setCursorHidden] = useState(false);
  const [isWindowTooSmall, setWindowTooSmall] = useState(false);
  const cursorTimerRef = useRef<number | undefined>(undefined);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const updateViewportState = useCallback(() => {
    const viewport = currentViewportSize();
    setWindowTooSmall(viewport.width < MIN_TV_WIDTH || viewport.height < MIN_TV_HEIGHT);
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (fullscreenElement() && document.exitFullscreen) {
      await document.exitFullscreen();
    }
    setFullscreenActive(fullscreenElement() !== null);
  }, [setFullscreenActive]);

  const requestFullscreen = useCallback(async () => {
    if (!fullscreenElement() && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    setFullscreenActive(fullscreenElement() !== null);
  }, [setFullscreenActive]);

  const toggleFullscreen = useCallback(async () => {
    if (fullscreenElement()) {
      await exitFullscreen();
      return;
    }
    await requestFullscreen();
  }, [exitFullscreen, requestFullscreen]);

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (wakeLock && !wakeLock.released) {
      await wakeLock.release();
    }
    setWakeLockStatus("inactive");
  }, [setWakeLockStatus]);

  const requestWakeLock = useCallback(async () => {
    if (!keepScreenAwake || document.visibilityState !== "visible") {
      await releaseWakeLock();
      return;
    }
    if (!navigator.wakeLock) {
      setWakeLockStatus("unsupported");
      return;
    }
    try {
      const wakeLock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wakeLock;
      wakeLock.addEventListener("release", () => {
        if (wakeLockRef.current === wakeLock) {
          wakeLockRef.current = null;
          setWakeLockStatus("inactive");
        }
      }, { once: true });
      setWakeLockStatus("active");
    } catch {
      setWakeLockStatus("blocked");
    }
  }, [keepScreenAwake, releaseWakeLock, setWakeLockStatus]);

  const resetCursorTimer = useCallback(() => {
    setCursorHidden(false);
    if (cursorTimerRef.current !== undefined) {
      window.clearTimeout(cursorTimerRef.current);
    }
    cursorTimerRef.current = window.setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreenActive(fullscreenElement() !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setFullscreenActive]);

  useEffect(() => {
    const onResize = () => updateViewportState();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    updateViewportState();
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [updateViewportState]);

  useEffect(() => {
    const onActivity = () => resetCursorTimer();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    resetCursorTimer();
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (cursorTimerRef.current !== undefined) {
        window.clearTimeout(cursorTimerRef.current);
      }
    };
  }, [resetCursorTimer]);

  useEffect(() => {
    const onVisibilityChange = () => {
      void requestWakeLock();
    };
    const onFirstInteraction = () => {
      void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    void requestWakeLock();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      void releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      if (event.key.toLowerCase() === "f" || event.code === "KeyF") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (event.key === "Escape" && input.currentScreen !== "settings") {
        input.navigate("settings");
      } else if (event.key === "Escape" && input.currentScreen === "settings") {
        input.navigate(input.previousScreen === "settings" ? "home" : input.previousScreen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input, toggleFullscreen]);

  return { isCursorHidden, isWindowTooSmall, requestFullscreen, exitFullscreen, toggleFullscreen };
}





