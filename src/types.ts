export enum GameLevel {
  LEVEL1_TUTORIAL = 1,
  LEVEL2_BOWLING = 2,
  LEVEL3_EXPLORATION = 3,
}

export enum PsyduckState {
  IDLE = 'IDLE',
  CARRIED = 'CARRIED',
  THROWN = 'THROWN',
  ROLLING = 'ROLLING',
}

export enum Level3StoryState {
  BEFORE_EGG = 'BEFORE_EGG',
  EGG_BROKEN = 'EGG_BROKEN',
  POST_EGG_DIALOGUE = 'POST_EGG_DIALOGUE',
  WAIT_FOR_BENCH = 'WAIT_FOR_BENCH',
  AAFRAA_SITS = 'AAFRAA_SITS',
  PSYDUCK_SITS = 'PSYDUCK_SITS',
  LETTER_GIVEN = 'LETTER_GIVEN',
  Z_OPENS_LETTER = 'Z_OPENS_LETTER',
  LETTER_FINISHED = 'LETTER_FINISHED',
  CONTINUE_EXPLORING = 'CONTINUE_EXPLORING',
  TULIP_GIVEN = 'TULIP_GIVEN',
  NORMAL_EXPLORATION = 'NORMAL_EXPLORATION',
}

export interface PlayerControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  interact: boolean;
  throwKey: boolean;
  run: boolean;
}

export interface PinState {
  id: number;
  initialX: number;
  initialZ: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  isFallen: boolean;
  source?: string;
}

export interface GameEventCallbacks {
  onLevelChange?: (level: GameLevel) => void;
  onStrike?: () => void;
  onEggBroken?: () => void;
  onCandlesBlown?: () => void;
  onOpenLetter?: () => void;
}
