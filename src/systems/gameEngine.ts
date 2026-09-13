import * as THREE from 'three';
import { GameLevel, PsyduckState, PlayerControls, Level3StoryState } from '../types';
import { GAME_CONFIG } from '../config/gameConfig';
import { AafraaCharacter } from './characterModel';
import { PsyduckHead } from './psyduckModel';
import { WorldEnvironment } from './environment';
import { Level1Tutorial } from '../levels/Level1Tutorial';
import { Level2Bowling } from '../levels/Level2Bowling';
import { Level3Birthday } from '../levels/Level3Birthday';
import { sound } from './audio';
import { psyduckDialogue } from './psyduckDialogue';
import { CompanionState, FetchState } from './psyduckCompanion';
import { TulipState } from './tulipProp';
import { WatermelonProp } from './watermelonPlant';

export interface GameEngineCallbacks {
  onLevelChanged: (level: GameLevel) => void;
  onPromptChanged: (prompt: string | null) => void;
  onBowlingUpdate: (pinsFallen: number, isStrike: boolean) => void;
  onBirthdayRevealed: () => void;
  onCandlesBlown: () => void;
  onPsyduckDialogue?: (dialogue: { text: string; screenX: number; screenY: number; visible: boolean } | null) => void;
  onOpenLetter?: () => void;
  onUnlockedLevelsChanged?: (unlockedLevels: GameLevel[]) => void;
  onLetterUnlocked?: (unlocked: boolean) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Game Systems
  public player: AafraaCharacter;
  public psyduck: PsyduckHead;
  public psyduckDialogue = psyduckDialogue;
  private environment: WorldEnvironment;
  
  // Levels
  public currentLevel: GameLevel = GameLevel.LEVEL1_TUTORIAL;
  public unlockedLevels: Set<GameLevel> = new Set([GameLevel.LEVEL1_TUTORIAL]);
  public isLetterUnlocked = false;
  private level1: Level1Tutorial;
  private level2: Level2Bowling;
  private level3: Level3Birthday;

  // Player Physics & Movement
  public playerPosition = new THREE.Vector3();
  public playerVelocity = new THREE.Vector3();
  public playerRotationY = 0;
  public isGrounded = false;
  public jumpsRemaining = 2;
  public isCarrying = false;
  public isCarryingPlayHead = false;
  public isCarryingTulip = false;
  public isCarryingWatermelon = false;
  public carriedWatermelon: WatermelonProp | null = null;
  private lastWatermelonReactionTime = 0;
  public isRunning = false;
  public isSittingOnBench = false;

  // Level 3 Post-Egg Story State Machine
  public storyState: Level3StoryState = Level3StoryState.BEFORE_EGG;
  private benchReminderTimer = 0;
  private benchReminderCount = 0;
  private hasRemindedBench = false;
  private psyduckSeatedDelayTimer = 0;
  private isLetterOpen = false;

  // Lifelike Psyduck Contextual Progression State
  private level1HasGreeted = false;
  private level1NoProgressTimer = 0;
  private level1ReminderGiven = false;
  private level2StrikeCelebrated = false;
  private level3ExplorationStage = 0; // 0: flowers, 1: tulips, 2: bench, 3: alive, 4: done
  private level3StageTimer = 0;

  // Throw Tracking for Contextual Psyduck Reactions
  private isTrackingThrow = false;
  private throwFlightTimer = 0;
  private throwStartLevel: GameLevel | null = null;
  private bowlingFallenAtThrowStart = 0;

  // Camera Orbit & Controls
  public cameraYaw = 0;
  public cameraPitch = 0.28; // ~16 degrees down
  private cameraDistance = GAME_CONFIG.camera.distance;
  private cameraTarget = new THREE.Vector3();

  // Input states
  private controls: PlayerControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    interact: false,
    throwKey: false,
    run: false,
  };

  public currentPrompt: string | null = null;
  private callbacks: GameEngineCallbacks;
  private isPointerLocked = false;
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private isDestroyed = false;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    const origOnPrompt = callbacks.onPromptChanged;
    this.callbacks = {
      ...callbacks,
      onPromptChanged: (prompt: string | null) => {
        this.currentPrompt = prompt;
        origOnPrompt(prompt);
      },
    };

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.camera.fov,
      container.clientWidth / container.clientHeight,
      0.1,
      400
    );

    // Environment
    this.environment = new WorldEnvironment(this.scene);

    // Player
    this.player = new AafraaCharacter();
    this.scene.add(this.player.group);

    // Psyduck Head
    this.psyduck = new PsyduckHead();
    this.scene.add(this.psyduck.group);

    // Instantiate Levels
    this.level1 = new Level1Tutorial();
    this.level2 = new Level2Bowling();
    this.level3 = new Level3Birthday();

    // Living Psyduck delivers fetch ball back directly to Aafraa's hands (or drops at feet post-egg or if holding tulip)
    this.level3.companion.setOnDeliverToy(() => {
      if (this.level3.isEggBroken || this.isCarryingTulip) {
        if (this.level3.playHead) {
          const dropPos = this.playerPosition.clone().add(new THREE.Vector3(0, 0.2, 0));
          this.level3.playHead.drop(dropPos);
        }
      } else {
        this.isCarryingPlayHead = true;
        this.player.setCarrying(true);
      }
    });

    // Living Psyduck awakens -> spawns separate pink ball for egg minigame!
    this.level3.companion.onAwakened = () => {
      this.level3.spawnPlayHead();
    };

    // Set Level 1 active initially
    this.scene.add(this.level1.group);
    this.loadLevel(GameLevel.LEVEL1_TUTORIAL);
    this.callbacks.onUnlockedLevelsChanged?.(Array.from(this.unlockedLevels));
    this.callbacks.onLetterUnlocked?.(false);

    // Setup input event listeners
    this.setupEventListeners();

    // Start loop
    this.animate();
  }

  public unlockLevel(level: GameLevel) {
    if (!this.unlockedLevels.has(level)) {
      this.unlockedLevels.add(level);
      this.callbacks.onUnlockedLevelsChanged?.(Array.from(this.unlockedLevels));
    }
  }

  public unlockLetter() {
    if (!this.isLetterUnlocked) {
      this.isLetterUnlocked = true;
      this.callbacks.onLetterUnlocked?.(true);
    }
  }

  public loadLevel(level: GameLevel) {
    // Only allow loading levels that have legitimately been unlocked
    if (!this.unlockedLevels.has(level)) {
      return;
    }

    this.currentLevel = level;
    psyduckDialogue.clear();

    // Detach all levels
    this.scene.remove(this.level1.group);
    this.scene.remove(this.level2.group);
    this.scene.remove(this.level3.group);

    if (level === GameLevel.LEVEL1_TUTORIAL) {
      this.scene.add(this.level1.group);
      this.playerPosition.copy(this.level1.spawnPoint);
      this.psyduck.resetTo(this.level1.psyduckSpawn);
      this.playerRotationY = Math.PI; // Face forward
      this.level1.setMusicBoxActive(sound.hasStartedMainTheme);
    } else if (level === GameLevel.LEVEL2_BOWLING) {
      this.scene.add(this.level2.group);
      this.playerPosition.copy(this.level2.spawnPoint);
      this.playerRotationY = Math.PI;
      // Head is already in Aafraa's hands for the bowling sequence
      this.isCarrying = true;
      this.player.setCarrying(true);
      this.player.group.position.copy(this.playerPosition);
      this.player.group.rotation.y = this.playerRotationY;
      const holdPos = new THREE.Vector3();
      this.player.getHoldPointWorldPosition(holdPos);
      this.psyduck.setCarried(holdPos, this.playerRotationY);
    } else if (level === GameLevel.LEVEL3_EXPLORATION) {
      this.scene.add(this.level3.group);
      this.playerPosition.copy(this.level3.spawnPoint);
      this.psyduck.resetTo(this.level3.psyduckSpawn);
      this.playerRotationY = Math.PI;
      this.level3ExplorationStage = 0;
      this.level3StageTimer = 0;
    }

    this.playerVelocity.set(0, 0, 0);
    if (level !== GameLevel.LEVEL2_BOWLING) {
      this.isCarrying = false;
      this.player.setCarrying(false);
    }
    this.isCarryingPlayHead = false;
    this.isCarryingTulip = false;
    if (this.isCarryingWatermelon && this.carriedWatermelon) {
      this.scene.remove(this.carriedWatermelon.group);
      this.isCarryingWatermelon = false;
      this.carriedWatermelon = null;
    }
    this.player.group.position.copy(this.playerPosition);

    this.isTrackingThrow = false;
    this.throwFlightTimer = 0;

    // Set dynamic speaker position source for speech bubble projection
    // Ownership: strictly tied to Psyduck (never the separate pink ball/playHead)
    psyduckDialogue.setPositionSource(() => {
      // In Level 3, companion body only speaks AFTER the head has been placed and awakened.
      // While inanimate body, speech belongs strictly to the separate Psyduck head!
      if (
        this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
        this.level3.companion &&
        this.level3.companion.state !== CompanionState.INANIMATE_BODY
      ) {
        return this.level3.companion.getHeadWorldPosition();
      }
      if (this.isCarrying) {
        return this.playerPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
      }
      return this.psyduck.position.clone().add(new THREE.Vector3(0, 0.4, 0));
    });

    this.cameraYaw = 0; // Camera placed behind player looking forward along -Z
    this.cameraPitch = 0.28;

    this.callbacks.onLevelChanged(level);
  }

  private setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Pointer lock & mouse look
    this.renderer.domElement.addEventListener('click', this.requestPointerLock);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);

    // Window resize
    window.addEventListener('resize', this.handleResize);
  }

  private requestPointerLock = () => {
    if (!this.isPointerLocked && document.pointerLockElement !== this.renderer.domElement) {
      this.renderer.domElement.requestPointerLock?.();
    }
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPointerLocked) {
      const sensitivity = GAME_CONFIG.camera.sensitivity;
      this.cameraYaw -= e.movementX * sensitivity;
      this.cameraPitch = Math.max(-0.25, Math.min(1.1, this.cameraPitch + e.movementY * sensitivity));
    }
  };

  // Touch & on-screen orbit for touch devices
  public rotateCameraBy(deltaYaw: number, deltaPitch: number) {
    this.cameraYaw -= deltaYaw;
    this.cameraPitch = Math.max(-0.25, Math.min(1.1, this.cameraPitch + deltaPitch));
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isLetterOpen) return;

    const code = e.code;
    const atBenchMusic = this.isNearBenchMusicArea();

    if (code === 'KeyW' || code === 'ArrowUp') this.controls.forward = true;

    if (code === 'KeyS' || code === 'ArrowDown') {
      if (code === 'KeyS' && atBenchMusic && (sound.isBenchMusicPlaying || this.isSittingOnBench)) {
        // S stops the music when within interaction range of music player or sitting on the bench!
        // Outside this range or when music is not playing, S functions normally as backward movement.
        this.stopBenchMusic();
        return;
      }
      this.controls.backward = true;
    }

    if (code === 'KeyA' || code === 'ArrowLeft') this.controls.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') this.controls.right = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.controls.run = true;

    if (code === 'KeyC') {
      if (atBenchMusic) {
        this.cycleBenchMusic();
        return;
      }
    }

    if (code === 'Space') {
      if (!this.controls.jump) {
        this.performJump();
      }
      this.controls.jump = true;
    }

    if (code === 'KeyE') {
      this.performInteraction();
    }

    if (code === 'KeyQ') {
      this.performBlowCandles();
    }

    if (code === 'KeyT') {
      this.performTalkInteraction();
    }

    if (code === 'KeyZ') {
      if (this.isLetterUnlocked || this.storyState === Level3StoryState.LETTER_GIVEN) {
        this.openLetter();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') this.controls.forward = false;
    if (code === 'KeyS' || code === 'ArrowDown') this.controls.backward = false;
    if (code === 'KeyA' || code === 'ArrowLeft') this.controls.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') this.controls.right = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.controls.run = false;
    if (code === 'Space') this.controls.jump = false;
  };

  public setVirtualControl(action: keyof PlayerControls, active: boolean) {
    this.controls[action] = active;
    if (action === 'jump' && active) {
      this.performJump();
    }
    if (action === 'interact' && active) {
      this.performInteraction();
    }
  }

  public performJump() {
    if (this.isGrounded) {
      this.playerVelocity.y = GAME_CONFIG.player.jumpForce;
      this.isGrounded = false;
      this.jumpsRemaining = 1;
      sound.playJump();
    } else if (this.jumpsRemaining > 0) {
      // Double Jump
      this.playerVelocity.y = GAME_CONFIG.player.doubleJumpForce;
      this.jumpsRemaining = 0;
      sound.playDoubleJump();
    }
  }

  public performBlowCandles() {
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.isNearCake(this.playerPosition) &&
      !this.level3.candlesBlown &&
      this.level3.isBirthdayRevealed
    ) {
      this.level3.blowOutCandles();
      this.callbacks.onCandlesBlown();
    }
  }

  public isNearBenchMusicArea(): boolean {
    return (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      (this.isSittingOnBench || this.level3.isNearBenchArea(this.playerPosition))
    );
  }

  public cycleBenchMusic() {
    if (!this.isNearBenchMusicArea()) return;
    sound.nextBenchTrack();
    this.level3.setMusicBoxActive(true);
    if (
      this.level3.companion.state === CompanionState.LIVING_COMPANION &&
      this.level3.companion.isNear(this.playerPosition, 5.0)
    ) {
      sound.playPsyduckTalk();
    }
  }

  public stopBenchMusic() {
    if (!this.isNearBenchMusicArea()) return;
    sound.stopBenchMusic();
    this.level3.setMusicBoxActive(false);
  }

  public performTalkInteraction() {
    // Dedicated T key: Talk to living Psyduck (works even while holding objects)
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.companion.state === CompanionState.LIVING_COMPANION &&
      !this.isSittingOnBench &&
      this.level3.companion.isNear(this.playerPosition, 2.5)
    ) {
      this.level3.companion.talk(this.playerPosition);
    }
  }

  public openLetter() {
    if (
      !this.isLetterUnlocked &&
      this.storyState !== Level3StoryState.LETTER_GIVEN &&
      this.storyState !== Level3StoryState.Z_OPENS_LETTER &&
      this.storyState !== Level3StoryState.LETTER_FINISHED
    ) {
      return;
    }
    this.storyState = Level3StoryState.Z_OPENS_LETTER;
    this.isLetterOpen = true;
    this.callbacks.onOpenLetter?.();
  }

  public onContinueExploring() {
    this.isLetterOpen = false;
    this.storyState = Level3StoryState.CONTINUE_EXPLORING;
    this.level3.companion.suppressBenchDialogue = false;
    this.storyState = Level3StoryState.TULIP_GIVEN;

    // Psyduck says: "Here... this one's for you."
    psyduckDialogue.triggerSpecific("Here... this one's for you.", this.level3.companion.getHeadWorldPosition(), 4.5);

    // Mutual exclusivity: ensure any other held toy/head/watermelon is released
    if (this.isCarryingWatermelon) this.dropWatermelon();
    if (this.isCarryingPlayHead) this.dropPlayHead();
    if (this.isCarrying) this.dropHead();

    // Spawn tulip directly into Aafraa's hands!
    const holdPos = new THREE.Vector3();
    this.player.getHoldPointWorldPosition(holdPos);
    this.level3.spawnTulip(holdPos);

    this.isCarryingTulip = true;
    this.player.setCarrying(true);
    if (this.level3.tulip) {
      this.level3.tulip.pickup();
      this.level3.tulip.setCarried(holdPos, this.playerRotationY);
    }

    this.storyState = Level3StoryState.NORMAL_EXPLORATION;
  }

  public dropTulip() {
    if (!this.isCarryingTulip || !this.level3.tulip) return;
    this.isCarryingTulip = false;
    this.player.setCarrying(false);
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();
    const dropPos = this.playerPosition.clone().add(new THREE.Vector3(0, 0.4, 0)).addScaledVector(forwardDir, 0.8);
    this.level3.tulip.drop(dropPos);
    sound.playPickup();
  }

  public dropPlayHead() {
    if (!this.isCarryingPlayHead || !this.level3.playHead) return;
    this.isCarryingPlayHead = false;
    this.player.setCarrying(false);
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();
    const dropPos = this.playerPosition.clone().add(new THREE.Vector3(0, 0.4, 0)).addScaledVector(forwardDir, 0.8);
    this.level3.playHead.drop(dropPos);
    sound.playPickup();
  }

  public dropHead() {
    if (!this.isCarrying) return;
    this.isCarrying = false;
    this.player.setCarrying(false);
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();
    const dropPos = this.playerPosition.clone().add(new THREE.Vector3(0, 0.4, 0)).addScaledVector(forwardDir, 0.8);
    this.psyduck.drop(dropPos, forwardDir);
    sound.playPickup();
  }

  public dropWatermelon() {
    if (!this.isCarryingWatermelon || !this.carriedWatermelon) return;
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();
    const dropPos = this.playerPosition.clone().add(new THREE.Vector3(0, 0.4, 0)).addScaledVector(forwardDir, 0.8);
    this.scene.remove(this.carriedWatermelon.group);
    this.level1.watermelonPlant.dropCarried(dropPos);
    this.isCarryingWatermelon = false;
    this.carriedWatermelon = null;
    this.player.setCarrying(false);
  }

  public eatWatermelon() {
    if (!this.isCarryingWatermelon || !this.carriedWatermelon) return;
    const mouthPos = this.playerPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.scene.remove(this.carriedWatermelon.group);
    this.level1.watermelonPlant.eatCarried(mouthPos);

    this.isCarryingWatermelon = false;
    this.carriedWatermelon = null;
    this.player.setCarrying(false);

    // Cute Psyduck reaction (short & sweet, on cooldown)
    const now = performance.now();
    if (now - this.lastWatermelonReactionTime > 8000) {
      this.lastWatermelonReactionTime = now;
      const lines = [
        "Mmm... watermelon!",
        "You really love those, huh?",
      ];
      const line = lines[Math.floor(Math.random() * lines.length)];
      const speakerPos = this.psyduck.group.visible
        ? this.psyduck.position.clone().add(new THREE.Vector3(0, 0.6, 0))
        : this.playerPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
      psyduckDialogue.triggerSpecific(line, speakerPos, 3.2);
    }
  }

  public performInteraction() {
    // 0. If in Level 1 and near music box, start playing the continuous song
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL && this.level1.isNearMusicBox(this.playerPosition)) {
      if (!sound.hasStartedMainTheme) {
        sound.playMainTheme();
        this.level1.setMusicBoxActive(true);
        return;
      }
    }

    // 0.5. Level 1 Watermelon: Holding watermelon eats it, UNLESS near Psyduck head to pick it up
    const distToHead = this.playerPosition.distanceTo(this.psyduck.position);
    const isNearHeadToPick = distToHead < GAME_CONFIG.psyduck.pickupRadius && this.psyduck.group.visible && !this.isCarrying;

    if (this.isCarryingWatermelon && !isNearHeadToPick) {
      this.eatWatermelon();
      return;
    }

    // 0.6. Level 1 Watermelon: Pickup from plant socket or dropped melon on ground
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
      const nearMelon = this.level1.watermelonPlant.getNearestAvailableMelon(this.playerPosition, 2.2);
      if (nearMelon) {
        // Mutual exclusivity: Drop any currently carried item first
        if (this.isCarrying) this.dropHead();
        if (this.isCarryingTulip) this.dropTulip();
        if (this.isCarryingPlayHead) this.dropPlayHead();

        let melon: WatermelonProp | null = null;
        if (nearMelon.type === 'plant' && nearMelon.index !== undefined) {
          melon = this.level1.watermelonPlant.pickupFromSocket(nearMelon.index);
        } else if (nearMelon.type === 'loose' && nearMelon.melon) {
          melon = this.level1.watermelonPlant.pickupLoose(nearMelon.melon);
        }

        if (melon) {
          this.isCarryingWatermelon = true;
          this.carriedWatermelon = melon;
          this.scene.add(melon.group);
          this.player.setCarrying(true);
          sound.playPickup();
          return;
        }
      }
    }

    // 1. Level 3 Tulip: Pickup if on ground and nearby
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.tulip &&
      this.level3.tulip.state === TulipState.DROPPED &&
      this.level3.tulip.isNear(this.playerPosition, 2.0)
    ) {
      // Mutual exclusivity: Drop any currently carried item first
      if (this.isCarryingWatermelon) this.dropWatermelon();
      if (this.isCarryingPlayHead) this.dropPlayHead();
      if (this.isCarrying) this.dropHead();

      this.isCarryingTulip = true;
      this.player.setCarrying(true);
      this.level3.tulip.pickup();
      sound.playPickup();
      return;
    }

    // 2. Level 3 Scenic Bench: Sit down and enjoy view with Psyduck
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.isNearBench(this.playerPosition)
    ) {
      if (!this.isSittingOnBench) {
        // Auto-drop any carried items before sitting down
        if (this.isCarryingWatermelon) this.dropWatermelon();
        if (this.isCarryingTulip) this.dropTulip();
        if (this.isCarryingPlayHead) this.dropPlayHead();
        if (this.isCarrying) this.dropHead();

        this.isSittingOnBench = true;
        const seatPos = this.level3.getBenchSeatPosition();
        this.playerPosition.copy(seatPos);
        this.playerVelocity.set(0, 0, 0);
        this.playerRotationY = this.level3.getBenchFacingYaw();
        this.player.setSitting(true);
        this.player.group.position.copy(this.playerPosition);
        this.player.group.rotation.y = this.playerRotationY;
        this.level3.companion.sitOnBench(this.level3.getBenchCompanionPosition(), this.playerRotationY);

        if (this.storyState === Level3StoryState.WAIT_FOR_BENCH) {
          this.storyState = Level3StoryState.AAFRAA_SITS;
          this.psyduckSeatedDelayTimer = 0;
        }
        return;
      }
    }

    // 3. Carrying Tulip: Gentle Drop
    if (this.isCarryingTulip) {
      this.dropTulip();
      return;
    }

    // 4. LEVEL 3 REUNION: Place Head on Psyduck Body!
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.companion.state === CompanionState.INANIMATE_BODY
    ) {
      if (this.isCarrying && this.level3.companion.isNear(this.playerPosition, 2.6)) {
        // Aafraa places head onto body!
        const carriedHeadWorldPos = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0));
        this.level3.companion.attachHead(carriedHeadWorldPos);

        // Hide original carried head & release carry state
        this.isCarrying = false;
        this.player.setCarrying(false);
        this.psyduck.group.visible = false;
        this.psyduck.position.set(0, -999, 0);

        // Conclude initial exploration lines immediately upon head placement
        this.level3ExplorationStage = 4;
        psyduckDialogue.clear();
        return;
      }
    }

    // 5. LEVEL 3 FETCH MINIGAME: Carrying or picking up the separate Fetch Toy
    if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION && this.level3.playHead) {
      if (this.isCarryingPlayHead) {
        // Throw separate fetch toy to play fetch with living Psyduck!
        const forwardDir = new THREE.Vector3(
          Math.sin(this.playerRotationY),
          0,
          Math.cos(this.playerRotationY)
        ).normalize();

        sound.playThrow();
        const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forwardDir, 0.8);
        this.level3.playHead.throw(throwOrigin, forwardDir, this.isRunning);
        this.level3.companion.startFetch(this.level3.playHead);

        this.isCarryingPlayHead = false;
        this.player.setCarrying(false);
        return;
      } else {
        const distToPlayHead = this.playerPosition.distanceTo(this.level3.playHead.position);
        if (distToPlayHead < GAME_CONFIG.psyduck.pickupRadius) {
          // Mutual exclusivity: Drop watermelon, tulip or head first
          if (this.isCarryingWatermelon) this.dropWatermelon();
          if (this.isCarryingTulip) this.dropTulip();
          if (this.isCarrying) this.dropHead();

          this.isCarryingPlayHead = true;
          this.player.setCarrying(true);
          sound.playPickup();
          return;
        }
      }
    }

    // 6. Standard Head: Drop or Throw!
    if (this.isCarrying) {
      const forwardDir = new THREE.Vector3(
        Math.sin(this.playerRotationY),
        0,
        Math.cos(this.playerRotationY)
      ).normalize();

      if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
        // Level 2 Bowling: E always executes a dedicated forward bowling throw down the lane!
        sound.playThrow();
        const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 0.65, 0)).addScaledVector(forwardDir, 0.7);
        this.psyduck.customFriction = 0.996; // Smooth glide on polished bowling wood
        const bowlingSpeed = this.isRunning ? 28.5 : 24.5;
        this.psyduck.throw(throwOrigin, forwardDir, this.isRunning, bowlingSpeed, 1.2);
        psyduckDialogue.trigger('THROW', this.psyduck.position);

        this.level2.startThrowAttempt();
        this.isTrackingThrow = true;
        this.throwFlightTimer = 0;
        this.throwStartLevel = this.currentLevel;
        this.bowlingFallenAtThrowStart = this.level2.fallenCount;
      } else {
        const isMovingFast = this.controls.forward || this.controls.run || this.controls.backward || this.controls.left || this.controls.right;

        if (isMovingFast) {
          // Run + E = Throw Psyduck Head!
          sound.playThrow();
          const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forwardDir, 0.8);
          this.psyduck.throw(throwOrigin, forwardDir, this.isRunning);
          psyduckDialogue.trigger('THROW', this.psyduck.position);

          // Track throw for contextual reactions (bad throw / bowling miss)
          this.isTrackingThrow = true;
          this.throwFlightTimer = 0;
          this.throwStartLevel = this.currentLevel;
          this.bowlingFallenAtThrowStart = this.level2.fallenCount;
        } else {
          // E while standing = Gentle Drop
          sound.playPickup();
          const dropOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 0.4, 0)).addScaledVector(forwardDir, 0.8);
          this.psyduck.drop(dropOrigin, forwardDir);
          psyduckDialogue.trigger('DROP', this.psyduck.position);
        }
      }

      this.isCarrying = false;
      this.player.setCarrying(false);
      return;
    }

    // 7. Standard Head: Pickup radius check
    const distToPsyduck = this.playerPosition.distanceTo(this.psyduck.position);
    if (distToPsyduck < GAME_CONFIG.psyduck.pickupRadius) {
      // Mutual exclusivity: Drop watermelon, tulip or playhead first
      if (this.isCarryingWatermelon) this.dropWatermelon();
      if (this.isCarryingTulip) this.dropTulip();
      if (this.isCarryingPlayHead) this.dropPlayHead();

      // In Level 2: if pins were knocked down but no strike occurred, reset pins cleanly upon ball retrieval
      if (this.currentLevel === GameLevel.LEVEL2_BOWLING && !this.level2.isStrike) {
        if (this.level2.fallenCount > 0) {
          this.level2.resetPins();
          this.callbacks.onBowlingUpdate(0, false);
        }
      }

      this.isCarrying = true;
      this.player.setCarrying(true);
      sound.playPickup();
      if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
        psyduckDialogue.triggerSpecific("Be careful with the hair!", this.psyduck.position);
      } else {
        psyduckDialogue.trigger('PICKUP', this.psyduck.position);
      }
    }
  }

  public throwPsyduckExplicit() {
    if (this.isCarryingTulip) {
      this.dropTulip();
      return;
    }
    if (this.isCarryingPlayHead && this.level3.playHead) {
      const forwardDir = new THREE.Vector3(
        Math.sin(this.playerRotationY),
        0,
        Math.cos(this.playerRotationY)
      ).normalize();

      sound.playThrow();
      const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forwardDir, 0.8);
      this.level3.playHead.throw(throwOrigin, forwardDir, true);
      this.level3.companion.startFetch(this.level3.playHead);

      this.isCarryingPlayHead = false;
      this.player.setCarrying(false);
      return;
    }

    if (!this.isCarrying) return;
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();

    sound.playThrow();
    if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 0.65, 0)).addScaledVector(forwardDir, 0.7);
      this.psyduck.customFriction = 0.996;
      this.psyduck.throw(throwOrigin, forwardDir, true, 26.0, 1.2);
      this.level2.startThrowAttempt();
    } else {
      const throwOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forwardDir, 0.8);
      this.psyduck.throw(throwOrigin, forwardDir, true);
    }
    psyduckDialogue.trigger('THROW', this.psyduck.position);

    this.isTrackingThrow = true;
    this.throwFlightTimer = 0;
    this.throwStartLevel = this.currentLevel;
    this.bowlingFallenAtThrowStart = this.level2.fallenCount;

    this.isCarrying = false;
    this.player.setCarrying(false);
  }

  private animate = () => {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.08);

    this.updatePlayer(delta);
    this.updatePsyduck(delta);
    this.updateLevels(delta);
    this.updateCamera(delta);
    this.updatePrompts();
    this.environment.update(delta);

    // Update Psyduck dialogue & screen projected speech bubble
    const activeDialogue = psyduckDialogue.update(delta);
    if (activeDialogue && this.callbacks.onPsyduckDialogue) {
      const screenPos = this.projectToScreen(activeDialogue.worldPos);
      this.callbacks.onPsyduckDialogue({
        text: activeDialogue.text,
        screenX: screenPos.x,
        screenY: screenPos.y,
        visible: screenPos.visible,
      });
    } else if (this.callbacks.onPsyduckDialogue) {
      this.callbacks.onPsyduckDialogue(null);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private projectToScreen(worldPos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = worldPos.clone().add(new THREE.Vector3(0, 0.45, 0));
    v.project(this.camera);

    const inFront = v.z < 1.0;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const rawX = (v.x * 0.5 + 0.5) * width;
    const rawY = (-v.y * 0.5 + 0.5) * height;

    const x = Math.max(70, Math.min(width - 70, rawX));
    const y = Math.max(80, Math.min(height - 110, rawY));

    return { x, y, visible: inFront };
  }

  private updatePlayer(delta: number) {
    if (this.isSittingOnBench) {
      // If player presses any movement key or jump, stand up from bench
      if (
        this.controls.forward ||
        this.controls.backward ||
        this.controls.left ||
        this.controls.right ||
        this.controls.jump
      ) {
        this.standUpFromBench();
      } else {
        this.playerVelocity.set(0, 0, 0);
        this.player.group.position.copy(this.playerPosition);
        this.player.group.rotation.y = this.playerRotationY;
        this.player.updateAnimation(
          {
            isMoving: false,
            isRunning: false,
            isGrounded: true,
            verticalVelocity: 0,
          },
          delta
        );
        return;
      }
    }

    // Camera horizontal basis vectors on the XZ ground plane directly from camera world direction:
    const camForward = new THREE.Vector3();
    this.camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() < 0.0001) {
      camForward.set(0, 0, -1);
    } else {
      camForward.normalize();
    }

    const camRight = new THREE.Vector3();
    camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    // Standard camera-relative movement inputs:
    // W = forward (+1), S = backward (-1)
    // D = right (+1), A = left (-1)
    let moveForward = 0;
    let moveRight = 0;

    if (this.controls.forward) moveForward += 1;
    if (this.controls.backward) moveForward -= 1;
    if (this.controls.left) moveRight -= 1;
    if (this.controls.right) moveRight += 1;

    const isMoving = moveForward !== 0 || moveRight !== 0;
    this.isRunning = this.controls.run;

    let targetSpeed = 0;
    if (isMoving) {
      const inputLen = Math.hypot(moveForward, moveRight);
      const normForward = moveForward / inputLen;
      const normRight = moveRight / inputLen;

      // Calculate world travel direction relative to camera view
      const moveDir = new THREE.Vector3()
        .addScaledVector(camForward, normForward)
        .addScaledVector(camRight, normRight)
        .normalize();

      targetSpeed = GAME_CONFIG.player.moveSpeed * (this.isRunning ? GAME_CONFIG.player.runSpeedMultiplier : 1.0);
      this.playerVelocity.x = moveDir.x * targetSpeed;
      this.playerVelocity.z = moveDir.z * targetSpeed;

      // Aafraa's model's local forward axis is +Z (0, 0, 1).
      // Under playerRotationY (angle θ around Y), her world forward is (sin(θ), 0, cos(θ)).
      // To face the exact direction of travel (moveDir.x, moveDir.z):
      // sin(θ) = moveDir.x, cos(θ) = moveDir.z => targetAngle = Math.atan2(moveDir.x, moveDir.z).
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - this.playerRotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.playerRotationY += diff * (GAME_CONFIG.player.turnSmoothing * 60 * delta);
    } else {
      // Deceleration
      this.playerVelocity.x *= Math.pow(0.8, delta * 60);
      this.playerVelocity.z *= Math.pow(0.8, delta * 60);
    }

    // Apply Gravity
    this.playerVelocity.y -= GAME_CONFIG.player.gravity * delta;

    // Update position
    this.playerPosition.x += this.playerVelocity.x * delta;
    this.playerPosition.y += this.playerVelocity.y * delta;
    this.playerPosition.z += this.playerVelocity.z * delta;

    // Ground Check from active level
    const groundInfo = this.getActiveLevelGroundHeight(this.playerPosition.x, this.playerPosition.z);

    if (this.playerPosition.y <= groundInfo.groundY && groundInfo.isValid) {
      this.playerPosition.y = groundInfo.groundY;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
      this.jumpsRemaining = 2; // Reset jump counter
    } else {
      this.isGrounded = false;
    }

    // Fall safety respawn (if fell off floating island)
    if (this.playerPosition.y < -16.0) {
      this.respawnPlayer();
    }

    // Update player mesh transform & animations
    this.player.group.position.copy(this.playerPosition);
    this.player.group.rotation.y = this.playerRotationY;

    this.player.updateAnimation(
      {
        isMoving,
        isRunning: this.isRunning,
        isGrounded: this.isGrounded,
        verticalVelocity: this.playerVelocity.y,
      },
      delta
    );
  }

  private updatePsyduck(delta: number) {
    // 1. Play-head / Fetch toy carrying & physics in Level 3 fetch
    if (this.level3.playHead) {
      if (this.isCarryingPlayHead) {
        const holdPos = new THREE.Vector3();
        this.player.getHoldPointWorldPosition(holdPos);
        this.level3.playHead.setCarried(holdPos, this.playerRotationY);
      } else if (
        this.level3.companion.fetchState !== FetchState.CARRYING &&
        this.level3.companion.fetchState !== FetchState.RETURNING &&
        this.level3.companion.fetchState !== FetchState.DELIVERING
      ) {
        this.level3.playHead.updatePhysics(
          delta,
          (x, z) => this.getActiveLevelGroundHeight(x, z),
          this.getCollidableObstacles()
        );
      }
    }

    // 2. Standard head carrying / physics
    if (this.isCarrying) {
      const holdPos = new THREE.Vector3();
      this.player.getHoldPointWorldPosition(holdPos);
      this.psyduck.setCarried(holdPos, this.playerRotationY);
    } else {
      this.psyduck.updatePhysics(
        delta,
        (x, z) => this.getActiveLevelGroundHeight(x, z),
        this.getCollidableObstacles()
      );

      // Check if Psyduck fell into the abyss
      if (this.psyduck.position.y < -18.0) {
        this.respawnPsyduck();
      }
    }

    // 3. Tulip carrying
    if (this.level3.tulip && this.isCarryingTulip) {
      const holdPos = new THREE.Vector3();
      this.player.getHoldPointWorldPosition(holdPos);
      this.level3.tulip.setCarried(holdPos, this.playerRotationY);
    }

    // 3b. Watermelon carrying
    if (this.isCarryingWatermelon && this.carriedWatermelon) {
      const holdPos = new THREE.Vector3();
      this.player.getHoldPointWorldPosition(holdPos);
      this.carriedWatermelon.setCarried(holdPos, this.playerRotationY);
    }

    // 4. Monitor throw outcome for contextual reactions (bad throw or bowling miss)
    if (this.isTrackingThrow) {
      this.throwFlightTimer += delta;
      const speed = this.psyduck.velocity.length();

      if (this.throwFlightTimer > 1.4 && speed < 0.35) {
        this.isTrackingThrow = false;

        // Bowling miss check:
        if (this.throwStartLevel === GameLevel.LEVEL2_BOWLING) {
          this.level2.endThrowAttempt();
          if (this.level2.fallenCount === this.bowlingFallenAtThrowStart && this.psyduck.position.z < 2.0) {
            psyduckDialogue.trigger('BOWLING_MISS', this.psyduck.position);
          }
        } else if (this.psyduck.position.y > -2.0) {
          // Bad / short throw
          psyduckDialogue.trigger('BAD_THROW', this.psyduck.position);
        }
      }
    }
  }

  private updateLevels(delta: number) {
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
      this.level1.checkPuzzle(this.psyduck);
      this.level1.update(delta, this.playerPosition);

      // Level 1: First approach greeting
      if (!this.level1HasGreeted && !this.isCarrying) {
        if (this.playerPosition.distanceTo(this.psyduck.position) < 3.5) {
          this.level1HasGreeted = true;
          psyduckDialogue.triggerSpecific("Oh Hiiii silly... pick me up!", this.psyduck.position, 3.5);
        }
      }

      // Level 1: Wandering reminder if no progress after 1-2 minutes
      if (!this.level1ReminderGiven) {
        if (this.level1.isPlateActivated || this.level1.isDoorOpen) {
          this.level1ReminderGiven = true;
        } else {
          this.level1NoProgressTimer += delta;
          if (this.level1NoProgressTimer >= 80.0) {
            this.level1ReminderGiven = true;
            psyduckDialogue.triggerSpecific("Okay dummbo, now go to the door. Find the way!", this.psyduck.position, 4.0);
          }
        }
      }

      if (this.level1.isPlayerAtDoor(this.playerPosition)) {
        this.unlockLevel(GameLevel.LEVEL2_BOWLING);
        this.loadLevel(GameLevel.LEVEL2_BOWLING);
      }
    } else if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      this.level2.updatePhysics(this.psyduck, delta);
      this.callbacks.onBowlingUpdate(this.level2.fallenCount, this.level2.isStrike);

      // Level 2: Enthusiastic celebration on STRIKE (knocking down 10 pins)
      if (this.level2.isStrike && !this.level2StrikeCelebrated) {
        this.level2StrikeCelebrated = true;
        psyduckDialogue.triggerSpecific("YAYYYYY! Great ! You did it!", this.psyduck.position, 4.0);
      }

      if (this.level2.isPlayerAtDoor(this.playerPosition)) {
        this.unlockLevel(GameLevel.LEVEL3_EXPLORATION);
        this.loadLevel(GameLevel.LEVEL3_EXPLORATION);
      }
    } else if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION) {
      // Egg Mechanic: Head must be placed first, only separate pink ball can damage the egg!
      if (this.level3.playHead && !this.level3.isEggBroken) {
        const hitResult = this.level3.checkEggHit(this.level3.playHead);
        if (hitResult.hit) {
          if (hitResult.hitCount === 1) {
            psyduckDialogue.triggerSpecific("Aww...cute try again silly", this.level3.companion.getHeadWorldPosition(), 3.0);
          } else if (hitResult.hitCount === 2) {
            psyduckDialogue.triggerSpecific("Okay! That's better!", this.level3.companion.getHeadWorldPosition(), 3.0);
          } else if (hitResult.broken) {
            this.environment.shiftToBirthdayWarmth();
            this.callbacks.onBirthdayRevealed();

            // Cancel active fetch targeting the ball that hit the egg
            this.level3.companion.fetchState = FetchState.IDLE;
            this.level3.companion.fetchTargetBall = null;
            if (this.level3.playHead && this.level3.playHead.state === PsyduckState.CARRIED && !this.isCarryingPlayHead) {
              this.level3.playHead.state = PsyduckState.IDLE;
            }

            // Advance story state to EGG_BROKEN
            this.storyState = Level3StoryState.EGG_BROKEN;

            // Step 5: After 3rd hit - celebration & birthday song sequence
            psyduckDialogue.triggerSpecific("Yayayayaaa!", this.level3.companion.getHeadWorldPosition(), 2.0);

            // ~2.0 seconds later: timed birthday lines in sequence
            setTimeout(() => {
              this.storyState = Level3StoryState.POST_EGG_DIALOGUE;
              psyduckDialogue.triggerSpecific("Happy birthday to you...", this.level3.companion.getHeadWorldPosition(), 2.5);

              setTimeout(() => {
                psyduckDialogue.triggerSpecific("Happy birthday to you..dear aafraa", this.level3.companion.getHeadWorldPosition(), 2.5);

                setTimeout(() => {
                  psyduckDialogue.triggerSpecific(" you are so special to me :3", this.level3.companion.getHeadWorldPosition(), 3.0);

                  setTimeout(() => {
                    psyduckDialogue.triggerSpecific("I hope you like this.", this.level3.companion.getHeadWorldPosition(), 3.0);

                    setTimeout(() => {
                      this.storyState = Level3StoryState.WAIT_FOR_BENCH;
                      this.benchReminderTimer = 0;
                      this.benchReminderCount = 0;
                    }, 3200);
                  }, 3200);
                }, 2800);
              }, 2800);
            }, 2000);
          }
        }
      }

      // Post-Egg Story State Machine Progression
      if (this.storyState === Level3StoryState.WAIT_FOR_BENCH) {
        this.level3.companion.suppressBenchDialogue = true;

        if (!this.isSittingOnBench) {
          this.benchReminderTimer += delta;
          if (this.benchReminderTimer >= 50.0) {
            this.benchReminderTimer = 0;
            const reminderLines = [
              "Come on, let's go to the bench and sit.",
              "Hey... let's go sit on the bench.",
            ];
            const line = reminderLines[this.benchReminderCount % reminderLines.length];
            this.benchReminderCount++;
            psyduckDialogue.triggerSpecific(line, this.level3.companion.getHeadWorldPosition(), 4.5);
          }
        } else {
          this.benchReminderTimer = 0;
          this.storyState = Level3StoryState.AAFRAA_SITS;
          this.psyduckSeatedDelayTimer = 0;
        }
      } else if (this.storyState === Level3StoryState.AAFRAA_SITS) {
        this.level3.companion.suppressBenchDialogue = true;
        if (!this.isSittingOnBench) {
          this.storyState = Level3StoryState.WAIT_FOR_BENCH;
        } else if (this.level3.companion.isSeatedOnBench()) {
          this.storyState = Level3StoryState.PSYDUCK_SITS;
          this.psyduckSeatedDelayTimer = 0;
        }
      } else if (this.storyState === Level3StoryState.PSYDUCK_SITS) {
        this.level3.companion.suppressBenchDialogue = true;
        if (!this.isSittingOnBench) {
          this.storyState = Level3StoryState.WAIT_FOR_BENCH;
        } else {
          this.psyduckSeatedDelayTimer += delta;
          if (this.psyduckSeatedDelayTimer >= 1.0) {
            // Psyduck sits beside Aafraa:
            // "I don't remember... I have something for you."
            psyduckDialogue.triggerSpecific("i think u should change song.", this.level3.companion.getHeadWorldPosition(), 3.5);
            this.storyState = Level3StoryState.LETTER_GIVEN;
            this.unlockLetter();

            setTimeout(() => {
              if (this.isSittingOnBench && this.storyState === Level3StoryState.LETTER_GIVEN) {
                psyduckDialogue.triggerSpecific("I got something for you.", this.level3.companion.getHeadWorldPosition(), 2.5);
                setTimeout(() => {
                  if (this.isSittingOnBench && this.storyState === Level3StoryState.LETTER_GIVEN) {
                    psyduckDialogue.triggerSpecific("Open it with Z.", this.level3.companion.getHeadWorldPosition(), 3.0);
                  }
                }, 2700);
              }
            }, 3600);
          }
        }
      }

      // Level 3 Initial Exploration Sequential Dialogue
      // Spoken strictly by the separate Psyduck head while exploring before head placement
      if (this.level3.companion.state === CompanionState.INANIMATE_BODY) {
        const getHeadPos = () => {
          if (this.isCarrying) {
            return this.playerPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
          }
          return this.psyduck.position.clone().add(new THREE.Vector3(0, 0.4, 0));
        };

        if (this.level3ExplorationStage === 0) {
          if (this.level3.flowerTrail.flowerCount > 0 || this.playerPosition.distanceTo(this.level3.spawnPoint) > 4.5) {
            psyduckDialogue.triggerSpecific("Look, you're growing something like you!", getHeadPos(), 3.5);
            this.level3ExplorationStage = 1;
            this.level3StageTimer = 0;
          }
        } else if (this.level3ExplorationStage === 1) {
          if (psyduckDialogue.getCurrent() === null) {
            this.level3StageTimer += delta;
            if (this.level3StageTimer >= 5.0) {
              psyduckDialogue.triggerSpecific("Yeah, I know you love tulips.", getHeadPos(), 3.5);
              this.level3ExplorationStage = 2;
              this.level3StageTimer = 0;
            }
          }
        } else if (this.level3ExplorationStage === 2) {
          if (psyduckDialogue.getCurrent() === null) {
            this.level3StageTimer += delta;
            if (this.level3StageTimer >= 5.0) {
              psyduckDialogue.triggerSpecific("Yeah... there's a bench too for you.", getHeadPos(), 3.5);
              this.level3ExplorationStage = 3;
              this.level3StageTimer = 0;
            }
          }
        } else if (this.level3ExplorationStage === 3) {
          if (psyduckDialogue.getCurrent() === null) {
            this.level3StageTimer += delta;
            if (this.level3StageTimer >= 5.0) {
              psyduckDialogue.triggerSpecific("But first, go find my body shortcake.", getHeadPos(), 3.5);
              this.level3ExplorationStage = 4; // Done!
              this.level3StageTimer = 0;
            }
          }
        }
      } else {
        if (this.level3ExplorationStage < 4) {
          this.level3ExplorationStage = 4;
        }
      }

      const isMoving = Math.hypot(this.playerVelocity.x, this.playerVelocity.z) > 0.4;
      this.level3.update(delta, this.playerPosition, isMoving, this.isGrounded);
    }
  }

  private updateCamera(delta: number) {
    // Smooth third-person follow
    this.cameraTarget.copy(this.playerPosition).add(new THREE.Vector3(0, 1.4, 0));

    // Spherical orbit coordinates
    const horizontalDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const verticalDist = this.cameraDistance * Math.sin(this.cameraPitch);

    const desiredCameraPos = new THREE.Vector3(
      this.cameraTarget.x + horizontalDist * Math.sin(this.cameraYaw),
      this.cameraTarget.y + verticalDist,
      this.cameraTarget.z + horizontalDist * Math.cos(this.cameraYaw)
    );

    // Smooth lerp
    this.camera.position.lerp(desiredCameraPos, delta * 12);
    this.camera.lookAt(this.cameraTarget);
  }

  private updatePrompts() {
    // If Letter Modal is open, clear prompt
    if (this.isLetterOpen) {
      this.callbacks.onPromptChanged(null);
      return;
    }

    // 0. Level 3 Post-Egg Bench Letter Handoff prompt (top priority)
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.storyState === Level3StoryState.LETTER_GIVEN
    ) {
      if (this.isSittingOnBench || this.level3.isNearBenchArea(this.playerPosition)) {
        if (sound.isBenchMusicPlaying) {
          this.callbacks.onPromptChanged("Z — Open Letter  •  C — Change Song  •  S — Stop Song");
        } else {
          this.callbacks.onPromptChanged("Z — Open Letter  •  C — Change Song");
        }
      } else {
        this.callbacks.onPromptChanged("Z — Open Letter");
      }
      return;
    }

    // 1. Level 1 Music Box interaction prompt
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL && this.level1.isNearMusicBox(this.playerPosition)) {
      if (!sound.hasStartedMainTheme) {
        this.callbacks.onPromptChanged("E — Play Music");
        return;
      }
    }

    // 2. Level 3 Scenic Bench & Music Controls (when sitting)
    if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION && this.isSittingOnBench) {
      if (sound.isBenchMusicPlaying) {
        this.callbacks.onPromptChanged("C — Change Song  •  S — Stop Song");
      } else {
        this.callbacks.onPromptChanged("C — Change Song");
      }
      return;
    }

    // 3. Level 3 Scenic Bench & Music Controls (when approaching bench)
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.isNearBenchArea(this.playerPosition)
    ) {
      // If closer to a dropped tulip than the bench seat, tulip takes priority
      const isNearDroppedTulip = Boolean(
        this.level3.tulip &&
        this.level3.tulip.state === TulipState.DROPPED &&
        this.level3.tulip.isNear(this.playerPosition, 2.0)
      );

      const seatPos = this.level3.getBenchSeatPosition();
      const distToBenchSeat = this.playerPosition.distanceTo(seatPos);
      const distToTulip = this.level3.tulip ? this.playerPosition.distanceTo(this.level3.tulip.position) : 999;

      if (!isNearDroppedTulip || distToBenchSeat < distToTulip) {
        if (this.level3.isNearBench(this.playerPosition)) {
          if (sound.isBenchMusicPlaying) {
            this.callbacks.onPromptChanged("E — Sit  •  C — Change Song  •  S — Stop Song");
          } else {
            this.callbacks.onPromptChanged("E — Sit  •  C — Change Song");
          }
        } else {
          if (sound.isBenchMusicPlaying) {
            this.callbacks.onPromptChanged("C — Change Song  •  S — Stop Song");
          } else {
            this.callbacks.onPromptChanged("C — Change Song");
          }
        }
        return;
      }
    }

    // 4. Level 3 Birthday Cake candle blowing prompt (Q, NOT E)
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.isNearCake(this.playerPosition) &&
      !this.level3.candlesBlown &&
      this.level3.isBirthdayRevealed
    ) {
      this.callbacks.onPromptChanged("Q — Blow Candles");
      return;
    }

    // 5. Level 3 Reunion: Place Head on Body prompt
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.companion.state === CompanionState.INANIMATE_BODY &&
      this.isCarrying &&
      this.level3.companion.isNear(this.playerPosition, 2.6)
    ) {
      this.callbacks.onPromptChanged("E — Place Head");
      return;
    }

    // 6. Level 3 Living Psyduck Talk Prompt (works even while holding objects)
    const isNearLivingPsyduck =
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.companion.state === CompanionState.LIVING_COMPANION &&
      !this.isSittingOnBench &&
      this.level3.companion.isNear(this.playerPosition, 2.5);

    if (isNearLivingPsyduck) {
      if (this.isCarryingTulip) {
        this.callbacks.onPromptChanged("T — Talk  •  E — Drop");
      } else if (this.isCarryingPlayHead) {
        this.callbacks.onPromptChanged("T — Talk  •  E — Throw");
      } else if (this.isCarryingWatermelon) {
        this.callbacks.onPromptChanged("T — Talk  •  E — Eat Watermelon");
      } else if (this.isCarrying) {
        this.callbacks.onPromptChanged("T — Talk  •  E — Drop");
      } else {
        this.callbacks.onPromptChanged("T — Talk");
      }
      return;
    }

    // 7. Level 3 Tulip Carrying / Dropped Prompts
    if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION) {
      if (this.isCarryingTulip) {
        this.callbacks.onPromptChanged("E — Drop");
        return;
      }
      if (
        this.level3.tulip &&
        this.level3.tulip.state === TulipState.DROPPED &&
        this.level3.tulip.isNear(this.playerPosition, 2.0)
      ) {
        this.callbacks.onPromptChanged("E — Pickup Tulip");
        return;
      }
    }

    // 8. Level 3 Catch Minigame Prompts
    if (
      this.currentLevel === GameLevel.LEVEL3_EXPLORATION &&
      this.level3.companion.state === CompanionState.LIVING_COMPANION &&
      this.level3.playHead
    ) {
      if (this.isCarryingPlayHead) {
        this.callbacks.onPromptChanged("E — Throw");
        return;
      }
      const distToPlayHead = this.playerPosition.distanceTo(this.level3.playHead.position);
      if (distToPlayHead < GAME_CONFIG.psyduck.pickupRadius) {
        this.callbacks.onPromptChanged("E — Pickup");
        return;
      }
    }

    // 8b. Level 1 Watermelon Prompts
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL && this.level1.watermelonPlant) {
      if (this.isCarryingWatermelon) {
        const distToPsyduck = this.playerPosition.distanceTo(this.psyduck.position);
        if (distToPsyduck < GAME_CONFIG.psyduck.pickupRadius && this.psyduck.group.visible && !this.isCarrying) {
          this.callbacks.onPromptChanged("E — Pickup");
          return;
        }
        this.callbacks.onPromptChanged("E — Eat Watermelon");
        return;
      }

      const nearMelon = this.level1.watermelonPlant.getNearestAvailableMelon(this.playerPosition, 2.2);
      if (nearMelon) {
        this.callbacks.onPromptChanged("E — Pick Up Watermelon");
        return;
      }
    }

    // Watermelon carrying fallback
    if (this.isCarryingWatermelon) {
      this.callbacks.onPromptChanged("E — Eat Watermelon");
      return;
    }

    // 9. Standard carrying prompt (Level 1, Level 2, Level 3)
    if (this.isCarrying) {
      if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
        this.callbacks.onPromptChanged("E — Throw");
        return;
      }
      if (this.controls.forward || this.controls.run || this.controls.backward || this.controls.left || this.controls.right) {
        this.callbacks.onPromptChanged("E — Throw");
      } else {
        this.callbacks.onPromptChanged("E — Drop");
      }
      return;
    }

    // 10. Standard head pickup prompt
    const distToPsyduck = this.playerPosition.distanceTo(this.psyduck.position);
    if (distToPsyduck < GAME_CONFIG.psyduck.pickupRadius && this.psyduck.group.visible) {
      this.callbacks.onPromptChanged("E — Pickup");
      return;
    }

    this.callbacks.onPromptChanged(null);
  }

  private getActiveLevelGroundHeight(x: number, z: number): { groundY: number; isValid: boolean } {
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
      return this.level1.getGroundHeight(x, z);
    }
    if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      return this.level2.getGroundHeight(x, z);
    }
    if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION) {
      return this.level3.getGroundHeight(x, z);
    }
    return { groundY: 0, isValid: true };
  }

  private getCollidableObstacles(): { x: number; z: number; radius: number; height: number; y: number }[] {
    // Collision cylinders for props that bounce Psyduck
    if (this.currentLevel === GameLevel.LEVEL3_EXPLORATION && !this.level3.isEggBroken) {
      return [
        {
          x: this.level3.eggPosition.x,
          z: this.level3.eggPosition.z,
          radius: 1.6,
          height: 3.0,
          y: 0.5,
        },
      ];
    }
    return [];
  }

  public respawnPlayer() {
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
      this.playerPosition.copy(this.level1.spawnPoint);
    } else if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      this.playerPosition.copy(this.level2.spawnPoint);
    } else {
      this.playerPosition.copy(this.level3.spawnPoint);
    }
    this.playerVelocity.set(0, 0, 0);
    this.playerRotationY = Math.PI;
    this.cameraYaw = 0;
  }

  public respawnPsyduck() {
    if (this.currentLevel === GameLevel.LEVEL1_TUTORIAL) {
      this.psyduck.resetTo(this.level1.psyduckSpawn);
    } else if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      this.psyduck.resetTo(this.level2.psyduckSpawn);
      if (!this.level2.isStrike && this.level2.fallenCount > 0) {
        this.level2.resetPins();
        this.callbacks.onBowlingUpdate(0, false);
      }
    } else {
      this.psyduck.resetTo(this.level3.psyduckSpawn);
    }
  }

  public resetBowlingPins() {
    if (this.currentLevel === GameLevel.LEVEL2_BOWLING) {
      this.level2.resetPins();
      this.level2StrikeCelebrated = false;
      this.psyduck.resetTo(this.level2.psyduckSpawn);
      this.callbacks.onBowlingUpdate(0, false);
    }
  }

  public standUpFromBench() {
    if (!this.isSittingOnBench) return;
    this.isSittingOnBench = false;
    this.player.setSitting(false);
    const forwardDir = new THREE.Vector3(
      Math.sin(this.playerRotationY),
      0,
      Math.cos(this.playerRotationY)
    ).normalize();
    this.playerPosition.addScaledVector(forwardDir, 0.85);
    this.player.group.position.copy(this.playerPosition);
    this.level3.companion.standUpFromBench();

    if (this.storyState === Level3StoryState.AAFRAA_SITS || this.storyState === Level3StoryState.PSYDUCK_SITS) {
      this.storyState = Level3StoryState.WAIT_FOR_BENCH;
    }
  }

  public resetEntireGame() {
    this.isSittingOnBench = false;
    this.player.setSitting(false);
    this.isCarrying = false;
    this.isCarryingPlayHead = false;
    this.isCarryingTulip = false;
    if (this.isCarryingWatermelon && this.carriedWatermelon) {
      if (this.carriedWatermelon.group.parent) {
        this.carriedWatermelon.group.parent.remove(this.carriedWatermelon.group);
      }
    }
    this.isCarryingWatermelon = false;
    this.carriedWatermelon = null;
    this.lastWatermelonReactionTime = 0;
    this.player.setCarrying(false);

    // Reset story state & timers
    this.storyState = Level3StoryState.BEFORE_EGG;
    this.benchReminderTimer = 0;
    this.hasRemindedBench = false;
    this.psyduckSeatedDelayTimer = 0;
    this.isLetterOpen = false;

    // Reset progression & dialogue states
    this.unlockedLevels = new Set([GameLevel.LEVEL1_TUTORIAL]);
    this.isLetterUnlocked = false;
    this.benchReminderCount = 0;
    this.level1HasGreeted = false;
    this.level1NoProgressTimer = 0;
    this.level1ReminderGiven = false;
    this.level2StrikeCelebrated = false;
    this.level3ExplorationStage = 0;
    this.level3StageTimer = 0;

    // Reset levels
    this.level1.reset();
    this.level2.reset();
    this.level3.reset();

    // Reset audio
    sound.resetAllMusic();

    // Reset environment
    this.environment.reset();

    // Reset Psyduck dialogue
    psyduckDialogue.clear();

    // Reset Psyduck head to Level 1
    this.psyduck.group.visible = true;
    this.psyduck.resetTo(this.level1.psyduckSpawn);

    // Load Level 1
    this.loadLevel(GameLevel.LEVEL1_TUTORIAL);

    // Callbacks
    this.callbacks.onLevelChanged(GameLevel.LEVEL1_TUTORIAL);
    this.callbacks.onPromptChanged(null);
    this.callbacks.onBowlingUpdate(0, false);
    this.callbacks.onUnlockedLevelsChanged?.(Array.from(this.unlockedLevels));
    this.callbacks.onLetterUnlocked?.(false);
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);

    sound.stopMusic();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
