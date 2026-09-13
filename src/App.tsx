import React, { useEffect, useRef, useState, type TouchEvent } from 'react';
import { GameLevel } from './types';
import { GameEngine } from './systems/gameEngine';
import { sound } from './systems/audio';
import { psyduckDialogue as psyduckDialogueSystem } from './systems/psyduckDialogue';
import { HUD } from './components/ui/HUD';
import { LetterModal } from './components/ui/LetterModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI States
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(GameLevel.LEVEL1_TUTORIAL);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [pinsFallen, setPinsFallen] = useState(0);
  const [isStrike, setIsStrike] = useState(false);
  const [isBirthdayRevealed, setIsBirthdayRevealed] = useState(false);
  const [candlesBlown, setCandlesBlown] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [unlockedLevels, setUnlockedLevels] = useState<GameLevel[]>([GameLevel.LEVEL1_TUTORIAL]);
  const [isLetterUnlocked, setIsLetterUnlocked] = useState(false);
  const [dialogueUI, setDialogueUI] = useState<{ text: string; screenX: number; screenY: number; visible: boolean } | null>(null);

  // Touch drag tracking for mobile camera orbit
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize 3D Game Engine
    const engine = new GameEngine(containerRef.current, {
      onLevelChanged: (level) => {
        setCurrentLevel(level);
        setPromptText(null);
      },
      onPromptChanged: (prompt) => {
        setPromptText(prompt);
      },
      onBowlingUpdate: (pins, strike) => {
        setPinsFallen(pins);
        setIsStrike(strike);
      },
      onBirthdayRevealed: () => {
        setIsBirthdayRevealed(true);
      },
      onCandlesBlown: () => {
        setCandlesBlown(true);
      },
      onOpenLetter: () => {
        setIsLetterOpen(true);
      },
      onPsyduckDialogue: (dialogue) => {
        setDialogueUI(dialogue);
      },
      onUnlockedLevelsChanged: (unlocked) => {
        setUnlockedLevels(unlocked);
      },
      onLetterUnlocked: (unlocked) => {
        setIsLetterUnlocked(unlocked);
      },
    });

    engineRef.current = engine;
    if (typeof window !== 'undefined') {
      (window as any).gameEngine = engine;
      (window as any).sound = sound;
      (window as any).psyduckDialogue = psyduckDialogueSystem;
    }

    return () => {
      if (typeof window !== 'undefined') {
        if ((window as any).gameEngine === engine) {
          (window as any).gameEngine = null;
        }
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Touch drag controls for mobile/tablet camera navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartPos.current && engineRef.current) {
      const deltaX = e.touches[0].clientX - touchStartPos.current.x;
      const deltaY = e.touches[0].clientY - touchStartPos.current.y;

      engineRef.current.rotateCameraBy(deltaX * 0.005, deltaY * 0.005);

      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
  };

  const handleLevelSelect = (lvl: GameLevel) => {
    // Lock Level Select until legitimately unlocked
    if (!unlockedLevels.includes(lvl)) {
      return;
    }
    if (engineRef.current) {
      engineRef.current.loadLevel(lvl);
    }
  };

  const handleResetBowling = () => {
    if (engineRef.current) {
      engineRef.current.resetBowlingPins();
    }
  };

  const handleThrowPsyduck = () => {
    if (engineRef.current) {
      engineRef.current.throwPsyduckExplicit();
    }
  };

  const handleJump = () => {
    if (engineRef.current) {
      engineRef.current.performJump();
    }
  };

  const handleInteract = () => {
    if (engineRef.current) {
      engineRef.current.performInteraction();
    }
  };

  const handleContinueExploring = () => {
    setIsLetterOpen(false);
    if (engineRef.current) {
      engineRef.current.onContinueExploring();
    }
  };

  const handleResetEntireGame = () => {
    setIsBirthdayRevealed(false);
    setCandlesBlown(false);
    setPinsFallen(0);
    setIsStrike(false);
    setPromptText(null);
    setIsLetterOpen(false);
    setDialogueUI(null);
    setUnlockedLevels([GameLevel.LEVEL1_TUTORIAL]);
    setIsLetterUnlocked(false);
    if (engineRef.current) {
      engineRef.current.resetEntireGame();
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        id="game-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Modern In-Game HUD */}
      <HUD
        currentLevel={currentLevel}
        promptText={promptText}
        pinsFallen={pinsFallen}
        isStrike={isStrike}
        isBirthdayRevealed={isBirthdayRevealed}
        candlesBlown={candlesBlown}
        psyduckDialogue={dialogueUI}
        unlockedLevels={unlockedLevels}
        isLetterUnlocked={isLetterUnlocked}
        onOpenLetter={() => {
          if (isLetterUnlocked && engineRef.current) {
            engineRef.current.openLetter();
          }
        }}
        onLevelSelect={handleLevelSelect}
        onResetBowling={handleResetBowling}
        onThrowPsyduck={handleThrowPsyduck}
        onJump={handleJump}
        onInteract={handleInteract}
        onResetGame={handleResetEntireGame}
      />

      {/* Big Emotional Birthday Letter Modal */}
      <LetterModal
        isOpen={isLetterOpen}
        onContinueExploring={handleContinueExploring}
      />
    </main>
  );
}
