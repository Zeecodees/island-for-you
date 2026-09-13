import * as THREE from 'three';
import { sound } from './audio';

export type DialogueCategory =
  | 'PICKUP'
  | 'DROP'
  | 'THROW'
  | 'BAD_THROW'
  | 'BOWLING_MISS'
  | 'EGG_HIT'
  | 'REUNION'
  | 'FOLLOWING'
  | 'IDLE'
  | 'CATCH_PLAY'
  | 'FETCH'
  | 'TALK'
  | 'BENCH';

const DIALOGUE_LINES: Record<DialogueCategory, string[]> = {
  PICKUP: [
    "Okay, okay, I'm coming.",
    
    "Careful with my smoll head.",
    "do you like carrying me like this",
  ],
  DROP: [
    "Wow. Abandoned already?",
    "Rude.",
    "I'll just sit here then.",
    "I was comfortable there...tho",
  ],
  THROW: [
    "HEY easy!",
    "WHEEEE!",
    "I did not agree to this!",
    "Not the face!",
  ],
  BAD_THROW: [
    "That was your plan?",
    "Interesting strategy.",
    "You almost had it.",
    "Maybe aim next time?",
  ],
  BOWLING_MISS: [
    "We're pretending that didn't happen.",
    "Nice throw. Terrible result.",
    "I believe in you. Barely.",
  ],
  EGG_HIT: [
    "huh",
    "its so funny to see u like this",
    
  ],
  REUNION: [
    "FINALLY.",
    "I've been waiting for that.",
  ],
  FOLLOWING: [
    "Where are we going?",
    "You're walking pretty fast.",
    "Wait for me!",
    
    
    "You know, I'm doing most of the emotional support here.",
  ],
  IDLE: [
    "So... are we just standing here now?",
    "uhm",
    "Nice weather for floating in the void.",
    "its so good to see you",
    "i like here with you sm :)",
    "Did you forget what we're doing?",
  ],
  CATCH_PLAY: [
    "Again!",
    "That was terrible.",
    "Okay, my turn.",
    "You're getting better.",
    "Was that supposed to hit me?",
    "Catch this!",
    "I'm surprisingly athletic!",
  ],
  FETCH: [
    "Throw it!",
    "Got it!",
    "Again!",
    "Here!",
    "Your turn!",
    "That was a bad throw.",
    "Come on!",
  ],
  TALK: [
    // Cute
    "Hi shortcake!",
    "You came back.",
    "atleast i can hangout wiht you here",
    "You're my favorite cake.",
    "Are we going somewhere fun?",
    "I'm glad you're here.",
    "You're doing pretty good and im so proud of you",
    "I like this place specially with you",
    // Funny
    "What are you staring at?",
    "You know I'm adorable, right?",
    "how's your study?",
    "Do you have snacks? or may i hehehe",
    "I'm following you because I have no better plans.",
    "i was thinking to add kiss option too but who is going to kiss any pokemon with those big ass lips",
    "I was going to say something ... never mind i forgot",
    "You're such a weird I love it.",
    // Sarcastic / Teasing
    "i like the avoidance side of yours",
    
    "I totally believed you knew where you were going.",
    "i missed you ",
    "Should I be worried about you ?",
    "You really need me, don't you?",
    "I'm starting to question your decision-making.",
    "how you doing.",
    "come here hug me",
    // Sweet
    "I'm happy you're here.",
    "I'll stay with you.",
    "We make a pretty good team.",
    "Don't worry, I've got you.",
    "Let's finish this together.",
    "You're not getting rid of me now.",
  ],
  BENCH: [
    "Oh... you're sitting.",
    "Wanna enjoy the view together?",
    "Okay... this is actually pretty nice.",
    "Finally, a break.",
    "Nice view, huh?",
    "We've come a long way.",
  ],
};

export interface ActiveDialogueInfo {
  text: string;
  worldPos: THREE.Vector3;
  timer: number;
  duration: number;
}

export class PsyduckDialogueManager {
  private currentDialogue: ActiveDialogueInfo | null = null;
  private lastSpokenCategory: Record<string, number> = {};
  private lastLineIndex: Record<string, number> = {};
  private globalCooldownUntil = 0;
  private positionSourceFn: (() => THREE.Vector3) | null = null;

  public setPositionSource(sourceFn: (() => THREE.Vector3) | null) {
    this.positionSourceFn = sourceFn;
  }

  public trigger(category: DialogueCategory, position?: THREE.Vector3, force = false): boolean {
    const now = performance.now();

    // Respect global cooldown (unless forced like egg hit or reunion)
    if (!force && now < this.globalCooldownUntil) {
      return false;
    }

    // Category cooldowns to prevent spamming
    const minCategoryIntervals: Partial<Record<DialogueCategory, number>> = {
      FOLLOWING: 22000,
      IDLE: 18000,
      THROW: 4000,
      PICKUP: 4000,
      DROP: 4000,
      BAD_THROW: 6000,
      BOWLING_MISS: 6000,
      CATCH_PLAY: 3500,
      FETCH: 2500,
      TALK: 2500,
      BENCH: 3000,
    };

    const interval = minCategoryIntervals[category] ?? 3000;
    const lastSpoken = this.lastSpokenCategory[category] ?? 0;
    if (!force && now - lastSpoken < interval) {
      return false;
    }

    const lines = DIALOGUE_LINES[category];
    if (!lines || lines.length === 0) return false;

    // Pick a line different from previous one in this category
    const prevIdx = this.lastLineIndex[category] ?? -1;
    let nextIdx = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && nextIdx === prevIdx) {
      nextIdx = (nextIdx + 1) % lines.length;
    }
    this.lastLineIndex[category] = nextIdx;

    const chosenText = lines[nextIdx];
    const worldPos = position?.clone() ?? this.positionSourceFn?.()?.clone() ?? new THREE.Vector3();

    const duration = Math.min(4.5, Math.max(2.8, chosenText.length * 0.08 + 1.2));
    this.currentDialogue = {
      text: chosenText,
      worldPos,
      timer: duration,
      duration,
    };

    this.lastSpokenCategory[category] = now;
    this.globalCooldownUntil = now + (category === 'REUNION' ? 2500 : 3000);

    // Audio chirp
    sound.playPsyduckTalk();
    return true;
  }

  public triggerSpecific(text: string, position?: THREE.Vector3, durationSec?: number): boolean {
    const worldPos = position?.clone() ?? this.positionSourceFn?.()?.clone() ?? new THREE.Vector3();
    const duration = durationSec ?? Math.min(4.5, Math.max(2.8, text.length * 0.08 + 1.2));
    this.currentDialogue = {
      text,
      worldPos,
      timer: duration,
      duration,
    };
    this.globalCooldownUntil = performance.now() + duration * 1000;
    sound.playPsyduckTalk();
    return true;
  }

  public update(delta: number): ActiveDialogueInfo | null {
    if (!this.currentDialogue) return null;

    this.currentDialogue.timer -= delta;

    // Keep world position updated if we have a live source
    if (this.positionSourceFn) {
      const livePos = this.positionSourceFn();
      if (livePos) {
        this.currentDialogue.worldPos.copy(livePos);
      }
    }

    if (this.currentDialogue.timer <= 0) {
      this.currentDialogue = null;
      return null;
    }

    return this.currentDialogue;
  }

  public getCurrent(): ActiveDialogueInfo | null {
    return this.currentDialogue;
  }

  public clear() {
    this.currentDialogue = null;
  }
}

export const psyduckDialogue = new PsyduckDialogueManager();
