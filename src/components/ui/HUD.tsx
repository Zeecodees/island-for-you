import React, { useState } from 'react';
import { GameLevel } from '../../types';
import { Volume2, VolumeX, HelpCircle, ArrowUp, RefreshCw, RotateCcw, Lock, Mail } from 'lucide-react';
import { sound } from '../../systems/audio';

interface HUDProps {
  currentLevel: GameLevel;
  promptText: string | null;
  pinsFallen: number;
  isStrike: boolean;
  isBirthdayRevealed: boolean;
  candlesBlown: boolean;
  psyduckDialogue?: { text: string; screenX: number; screenY: number; visible: boolean } | null;
  unlockedLevels?: GameLevel[];
  isLetterUnlocked?: boolean;
  onOpenLetter?: () => void;
  onLevelSelect: (level: GameLevel) => void;
  onResetBowling: () => void;
  onThrowPsyduck: () => void;
  onJump: () => void;
  onInteract: () => void;
  onResetGame: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentLevel,
  promptText,
  pinsFallen,
  isStrike,
  isBirthdayRevealed,
  candlesBlown,
  psyduckDialogue,
  unlockedLevels = [GameLevel.LEVEL1_TUTORIAL],
  isLetterUnlocked = false,
  onOpenLetter,
  onLevelSelect,
  onResetBowling,
  onThrowPsyduck,
  onJump,
  onInteract,
  onResetGame,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleSound = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMuted(nextMute);
  };

  const getObjectiveText = () => {
    switch (currentLevel) {
      case GameLevel.LEVEL1_TUTORIAL:
        return "Explore the island, pick Psyduck head, find your watermelons and activate the door plate with you small paws!";
      case GameLevel.LEVEL2_BOWLING:
        return isStrike
          ? "🎉 STRIKE! The door is open! Step through to enter island"
          : "Pick up Psyduck and throw it down the lane to knock down all 10 pins!";
      case GameLevel.LEVEL3_EXPLORATION:
        if (candlesBlown) {
          return "All candles blown out! Happy Birthday Aafraa look at the sky fireworks for you !";
        }
        if (isBirthdayRevealed) {
          return "🎂 blow out the candles bae!";
        }
        return "Explore the floating island and find the celestial egg and break it and something you might like hehe good luck!";
      default:
        return "";
    }
  };

  return (
    <div id="game-hud-overlay" className="pointer-events-none absolute inset-0 select-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Quest / Level Banner */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-md sm:max-w-xl">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <span className="text-xs sm:text-sm font-medium text-slate-100 tracking-wide">
              {getObjectiveText()}
            </span>
          </div>

          {/* Level 2: Bowling Pin Scoreboard */}
          {currentLevel === GameLevel.LEVEL2_BOWLING && (
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pins Knocked Down:</span>
              <span className="text-base font-bold text-amber-300">
                {pinsFallen} / 10
              </span>
              {isStrike && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider animate-bounce">
                  STRIKE!
                </span>
              )}
              <button
                id="reset-lane-btn"
                onClick={onResetBowling}
                className="ml-auto pointer-events-auto px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors border border-white/5"
                title="Reset Pins"
              >
                <RefreshCw size={12} />
                Reset Lane
              </button>
            </div>
          )}
        </div>

        {/* Right: Controls, Sound, Level Shortcuts */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
          {/* Level Jumper Buttons (Respects Story Progression) */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 text-xs font-medium text-slate-300">
            <button
              id="goto-level1-btn"
              onClick={() => onLevelSelect(GameLevel.LEVEL1_TUTORIAL)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentLevel === GameLevel.LEVEL1_TUTORIAL
                  ? 'bg-indigo-600 text-white font-semibold shadow'
                  : 'hover:text-white'
              }`}
            >
              L1
            </button>
            <button
              id="goto-level2-btn"
              onClick={() => {
                if (unlockedLevels.includes(GameLevel.LEVEL2_BOWLING)) {
                  onLevelSelect(GameLevel.LEVEL2_BOWLING);
                }
              }}
              disabled={!unlockedLevels.includes(GameLevel.LEVEL2_BOWLING)}
              title={
                unlockedLevels.includes(GameLevel.LEVEL2_BOWLING)
                  ? "Level 2: Bowling"
                  : "Level 2: Locked (Complete Level 1 ancient door first)"
              }
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                !unlockedLevels.includes(GameLevel.LEVEL2_BOWLING)
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : currentLevel === GameLevel.LEVEL2_BOWLING
                  ? 'bg-indigo-600 text-white font-semibold shadow'
                  : 'hover:text-white'
              }`}
            >
              {!unlockedLevels.includes(GameLevel.LEVEL2_BOWLING) && <Lock size={10} />}
              L2
            </button>
            <button
              id="goto-level3-btn"
              onClick={() => {
                if (unlockedLevels.includes(GameLevel.LEVEL3_EXPLORATION)) {
                  onLevelSelect(GameLevel.LEVEL3_EXPLORATION);
                }
              }}
              disabled={!unlockedLevels.includes(GameLevel.LEVEL3_EXPLORATION)}
              title={
                unlockedLevels.includes(GameLevel.LEVEL3_EXPLORATION)
                  ? "Level 3: Birthday Exploration"
                  : "Level 3: Locked (Complete Level 2 bowling strike first)"
              }
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                !unlockedLevels.includes(GameLevel.LEVEL3_EXPLORATION)
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : currentLevel === GameLevel.LEVEL3_EXPLORATION
                  ? 'bg-indigo-600 text-white font-semibold shadow'
                  : 'hover:text-white'
              }`}
            >
              {!unlockedLevels.includes(GameLevel.LEVEL3_EXPLORATION) && <Lock size={10} />}
              L3
            </button>
          </div>

          {/* Letter Button in Top Header (strictly locked until Psyduck gives it) */}
          <button
            id="hud-letter-btn"
            onClick={() => {
              if (isLetterUnlocked && onOpenLetter) {
                onOpenLetter();
              }
            }}
            disabled={!isLetterUnlocked}
            title={
              isLetterUnlocked
                ? "Read Birthday Letter (Z)"
                : "Birthday Letter: Locked (Given by Psyduck at the scenic bench)"
            }
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isLetterUnlocked
                ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-800/40'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 hover:text-white shadow cursor-pointer active:scale-95'
            }`}
          >
            {isLetterUnlocked ? <Mail size={14} className="text-amber-300" /> : <Lock size={14} className="text-slate-500" />}
            <span className="hidden sm:inline">Letter</span>
          </button>

          {/* Help button */}
          <button
            id="toggle-help-btn"
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Controls Guide"
          >
            <HelpCircle size={18} />
          </button>

          {/* Sound Toggle */}
          <button
            id="toggle-audio-btn"
            onClick={toggleSound}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Reset Game Button */}
          <button
            id="open-reset-modal-btn"
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5"
            title="Restart Game"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Controls Help Popover */}
      {showHelp && (
        <div className="pointer-events-auto absolute top-20 right-6 z-40 bg-slate-900/95 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-slate-200 text-xs shadow-2xl max-w-xs space-y-2.5">
          <div className="flex items-center justify-between font-semibold text-sm text-white pb-1 border-b border-white/10">
            <span>Controls Guide</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-slate-300">
            <span className="font-semibold text-white">W A S D</span>
            <span>Move Aafraa</span>
            <span className="font-semibold text-white">Mouse</span>
            <span>Orbit Camera</span>
            <span className="font-semibold text-white">Click Canvas</span>
            <span>Lock Mouse</span>
            <span className="font-semibold text-white">Space</span>
            <span>Jump</span>
            <span className="font-semibold text-white">Space x2</span>
            <span>Double Jump</span>
            <span className="font-semibold text-white">Shift</span>
            <span>Run</span>
            <span className="font-semibold text-white">E</span>
            <span>Interact / Pick Up</span>
            <span className="font-semibold text-white">Run + E</span>
            <span>Throw</span>
            <span className="font-semibold text-white">T</span>
            <span>Talk to Psyduck</span>
            <span className="font-semibold text-white">Q</span>
            <span>Blow Candles</span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            Tip: You can also use the on-screen action buttons on mobile or touchscreens!
          </p>
        </div>
      )}

      {/* Psyduck Contextual Talking Speech Bubble */}
      {psyduckDialogue && psyduckDialogue.visible && (
        <div
          id="psyduck-speech-bubble"
          style={{
            left: `${psyduckDialogue.screenX}px`,
            top: `${psyduckDialogue.screenY}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="pointer-events-none fixed z-50 transition-transform duration-100 ease-out"
        >
          <div className="relative bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-2xl shadow-2xl border-2 border-amber-200 text-xs sm:text-sm tracking-tight max-w-[240px] text-center drop-shadow-xl animate-bounce">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="text-amber-950 font-extrabold text-[9px] uppercase tracking-wider bg-amber-200/90 px-1.5 py-0.2 rounded-full">
                Psyduck
              </span>
            </div>
            <p className="font-extrabold text-slate-900 leading-snug">"{psyduckDialogue.text}"</p>
            {/* Downward comic speech tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400" />
          </div>
        </div>
      )}

      {/* Slightly Larger, Clean Corner Interaction Prompt */}
      {promptText && (
        <div className="pointer-events-none fixed bottom-20 left-6 sm:bottom-8 sm:left-8 z-40">
          <div
            id="corner-interaction-prompt"
            className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-full shadow-2xl flex items-center gap-3 text-sm text-slate-100 font-medium transition-all hover:border-amber-400/50 select-none ${
              promptText.includes('Talk') ? 'px-5 py-2.5 sm:px-6 sm:py-3.5' : 'px-4.5 py-2.5 sm:px-5 sm:py-3'
            }`}
            onClick={() => {
              if (!promptText.includes('•')) {
                const key = promptText.includes('—')
                  ? promptText.split('—')[0].trim()
                  : promptText.includes('-')
                  ? promptText.split('-')[0].trim()
                  : 'E';
                if (key === 'Q') {
                  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
                } else if (key === 'T') {
                  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
                } else if (key === 'Z') {
                  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }));
                } else if (key === 'C') {
                  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }));
                } else if (key === 'S') {
                  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
                } else {
                  onInteract();
                }
              }
            }}
          >
            {promptText.split('•').map((item, idx, arr) => {
              const trimmed = item.trim();
              const hasDash = trimmed.includes('—') || trimmed.includes('-');
              const keyPart = hasDash ? trimmed.split(/—|-/)[0].trim() : 'E';
              const labelPart = hasDash ? trimmed.split(/—|-/)[1].trim() : trimmed;
              const isTalk = keyPart === 'T' || labelPart.includes('Talk');

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 cursor-pointer active:scale-95 transition-transform ${
                    arr.length > 1 ? 'hover:text-amber-300' : ''
                  }`}
                  onClick={(e) => {
                    if (arr.length > 1) {
                      e.stopPropagation();
                      if (keyPart === 'Q') {
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
                      } else if (keyPart === 'T') {
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
                      } else if (keyPart === 'Z') {
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }));
                      } else if (keyPart === 'C') {
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }));
                      } else if (keyPart === 'S') {
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
                      } else {
                        onInteract();
                      }
                    }
                  }}
                >
                  {idx > 0 && <span className="text-white/30 font-bold px-0.5 select-none">•</span>}
                  <span
                    className={`rounded-md sm:rounded-lg bg-amber-400 text-slate-950 font-black tracking-wide shadow-md ${
                      isTalk
                        ? 'px-3 py-1 sm:px-3.5 sm:py-1.5 text-sm sm:text-base'
                        : 'px-2.5 py-1 text-xs sm:text-sm'
                    }`}
                  >
                    {keyPart}
                  </span>
                  <span
                    className={`font-bold tracking-wide text-white ${
                      isTalk ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    }`}
                  >
                    {labelPart}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="bg-slate-900/95 border border-white/10 p-5 rounded-2xl text-slate-200 text-sm shadow-2xl max-w-xs w-full text-center space-y-4">
            <p className="font-bold text-base text-white tracking-wide">Restart the game?</p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                id="confirm-reset-yes-btn"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetGame();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
              >
                YES
              </button>
              <button
                id="confirm-reset-cancel-btn"
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/5 transition-all active:scale-95"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (Accessible touch/click buttons) */}
      <div className="flex items-end justify-between">
        {/* Pointer lock hint on desktop */}
        <div className="hidden sm:block text-[11px] text-slate-400/80 bg-slate-900/50 backdrop-blur-sm px-3 py-1.5 rounded-xl">
          Click screen to lock camera mouse look • Press ESC to unlock
        </div>

        {/* Quick Action Buttons for Touch & Ease of Use */}
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <button
            id="action-interact-btn"
            onClick={onInteract}
            className="w-13 h-13 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs flex flex-col items-center justify-center border border-white/10 shadow-lg transition-all"
            title="Interact (E)"
          >
            <span className="text-[10px] text-amber-300 font-semibold">[E]</span>
            Action
          </button>

          <button
            id="action-throw-btn"
            onClick={onThrowPsyduck}
            className="w-13 h-13 rounded-2xl bg-amber-600/90 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs flex flex-col items-center justify-center border border-amber-400/30 shadow-lg transition-all"
            title="Throw Psyduck Head"
          >
            Throw
          </button>

          <button
            id="action-jump-btn"
            onClick={onJump}
            className="w-14 h-14 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex flex-col items-center justify-center border border-indigo-400/30 shadow-xl transition-all"
            title="Jump (Space)"
          >
            <ArrowUp size={18} />
            Jump
          </button>
        </div>
      </div>
    </div>
  );
};
