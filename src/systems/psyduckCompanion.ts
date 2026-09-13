import * as THREE from 'three';
import { sound } from './audio';
import { psyduckDialogue } from './psyduckDialogue';
import { PsyduckHead } from './psyduckModel';
import { FetchToy } from './fetchToy';
import { PsyduckState } from '../types';

export enum CompanionState {
  INANIMATE_BODY = 'INANIMATE_BODY',
  CONNECTING = 'CONNECTING',
  AWAKENING = 'AWAKENING',
  LIVING_COMPANION = 'LIVING_COMPANION',
}

export enum FetchState {
  IDLE = 'IDLE',
  OBJECT_THROWN = 'OBJECT_THROWN',
  FETCHING = 'FETCHING',
  CARRYING = 'CARRYING',
  RETURNING = 'RETURNING',
  DELIVERING = 'DELIVERING',
}

export class PsyduckCompanion {
  public group: THREE.Group;
  public state: CompanionState = CompanionState.INANIMATE_BODY;
  public position: THREE.Vector3;

  // Mesh Hierarchies
  public bodyGroup: THREE.Group;
  public headGroup: THREE.Group;
  private leftWing: THREE.Group;
  private rightWing: THREE.Group;
  private leftFoot: THREE.Mesh;
  private rightFoot: THREE.Mesh;
  private neckAuraLight: THREE.PointLight;
  private neckRingMesh: THREE.Mesh;

  // Animation Timers & States
  private walkTimer = 0;
  private idleTimer = 0;
  private connectionTimer = 0;
  private connectionStartPos = new THREE.Vector3();
  private awakeningTimer = 0;
  private awakeningStage = 0;

  // Follow & Fetch Behavior
  private followSpeed = 4.2;
  public fetchState: FetchState = FetchState.IDLE;
  public fetchTargetBall: FetchToy | PsyduckHead | null = null;
  public fetchTimer = 0;
  private fetchQuipCooldown = 0;
  public onDeliverToyCallback: (() => void) | null = null;
  private currentYaw = 0;
  private idleQuipCooldown = 15.0;
  public onAwakened?: () => void;

  // Talk Interaction
  public talkCooldown = 0;
  public talkingAnimTimer = 0;

  // Bench Sitting
  public isSittingOnBench = false;
  private benchTargetPos = new THREE.Vector3();
  private benchTargetYaw = 0;
  public benchSitProgress = 0;
  public suppressBenchDialogue = false;

  public isSeatedOnBench(): boolean {
    return this.isSittingOnBench && this.benchSitProgress === 1;
  }

  constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(3.2, 1.0, -15.5)) {
    this.group = new THREE.Group();
    this.group.name = "PsyduckCompanion";
    this.position = initialPosition.clone();
    this.group.position.copy(this.position);

    // Shared Stylized Materials
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xfbd03c });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xf6e3aa });
    const billMat = new THREE.MeshToonMaterial({ color: 0xf6e3aa });
    const feetMat = new THREE.MeshToonMaterial({ color: 0xf5cd79 });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const tuftMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a });

    // --- 1. Plump Body ---
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Main torso
    const torsoGeo = new THREE.SphereGeometry(0.52, 20, 20);
    torsoGeo.scale(1.08, 1.25, 0.95);
    const torsoMesh = new THREE.Mesh(torsoGeo, yellowMat);
    torsoMesh.position.y = 0.58;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.bodyGroup.add(torsoMesh);

    // Cream Belly Patch
    const bellyGeo = new THREE.SphereGeometry(0.42, 16, 16);
    bellyGeo.scale(0.88, 1.08, 0.45);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, 0.54, 0.28);
    this.bodyGroup.add(bellyMesh);

    // Left Foot (Webbed duck foot)
    const footGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.08, 10);
    footGeo.scale(1.0, 0.6, 1.6);
    this.leftFoot = new THREE.Mesh(footGeo, feetMat);
    this.leftFoot.position.set(-0.24, 0.04, 0.08);
    this.leftFoot.castShadow = true;
    this.bodyGroup.add(this.leftFoot);

    // Right Foot
    this.rightFoot = new THREE.Mesh(footGeo, feetMat);
    this.rightFoot.position.set(0.24, 0.04, 0.08);
    this.rightFoot.castShadow = true;
    this.bodyGroup.add(this.rightFoot);

    // Tail
    const tailGeo = new THREE.ConeGeometry(0.14, 0.28, 6);
    tailGeo.rotateX(-0.6);
    const tailMesh = new THREE.Mesh(tailGeo, yellowMat);
    tailMesh.position.set(0, 0.38, -0.46);
    this.bodyGroup.add(tailMesh);

    // Left Wing / Arm with pivot shoulder
    this.leftWing = new THREE.Group();
    this.leftWing.position.set(-0.46, 0.68, 0.02);
    const wingGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.42, 8);
    wingGeo.translate(0, -0.18, 0);
    const leftWingMesh = new THREE.Mesh(wingGeo, yellowMat);
    leftWingMesh.rotation.z = 0.35;
    leftWingMesh.castShadow = true;
    this.leftWing.add(leftWingMesh);
    this.bodyGroup.add(this.leftWing);

    // Right Wing / Arm
    this.rightWing = new THREE.Group();
    this.rightWing.position.set(0.46, 0.68, 0.02);
    const rightWingMesh = new THREE.Mesh(wingGeo, yellowMat);
    rightWingMesh.rotation.z = -0.35;
    rightWingMesh.castShadow = true;
    this.rightWing.add(rightWingMesh);
    this.bodyGroup.add(this.rightWing);

    // --- 2. Inactive Neck Marker (Ring + Aura) ---
    const neckRingGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 20);
    neckRingGeo.rotateX(Math.PI / 2);
    const neckRingMat = new THREE.MeshBasicMaterial({ color: 0xffeaa7 });
    this.neckRingMesh = new THREE.Mesh(neckRingGeo, neckRingMat);
    this.neckRingMesh.position.y = 1.05;
    this.bodyGroup.add(this.neckRingMesh);

    this.neckAuraLight = new THREE.PointLight(0xfbd03c, 1.2, 3);
    this.neckAuraLight.position.set(0, 1.15, 0);
    this.bodyGroup.add(this.neckAuraLight);

    // --- 3. Head Group ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.05, 0);
    this.group.add(this.headGroup);

    // Head base (pear shape)
    const headGeo = new THREE.SphereGeometry(0.44, 22, 22);
    headGeo.scale(1.0, 1.12, 1.04);
    const headMesh = new THREE.Mesh(headGeo, yellowMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.38, 14, 14);
    cheekGeo.scale(1.18, 0.85, 1.0);
    const cheekMesh = new THREE.Mesh(cheekGeo, yellowMat);
    cheekMesh.position.set(0, -0.09, 0.02);
    this.headGroup.add(cheekMesh);

    // Bill
    const billGroup = new THREE.Group();
    billGroup.position.set(0, -0.05, 0.38);
    this.headGroup.add(billGroup);

    const upperBillGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.15, 14);
    upperBillGeo.scale(1.2, 0.7, 1.4);
    upperBillGeo.rotateX(0.12);
    const upperBill = new THREE.Mesh(upperBillGeo, billMat);
    upperBill.castShadow = true;
    billGroup.add(upperBill);

    const lowerBillGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.11, 12);
    lowerBillGeo.scale(1.1, 0.6, 1.2);
    lowerBillGeo.rotateX(-0.1);
    const lowerBill = new THREE.Mesh(lowerBillGeo, billMat);
    lowerBill.position.set(0, -0.07, -0.02);
    billGroup.add(lowerBill);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.11, 14, 14);
    eyeGeo.scale(1.0, 1.15, 0.5);
    const pupilGeo = new THREE.SphereGeometry(0.038, 8, 8);
    pupilGeo.scale(1.0, 1.0, 0.4);

    // Left eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.22, 0.15, 0.35);
    leftEye.rotation.y = -0.3;
    this.headGroup.add(leftEye);

    const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    leftPupil.position.set(-0.22, 0.15, 0.41);
    leftPupil.rotation.y = -0.3;
    this.headGroup.add(leftPupil);

    // Right eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.22, 0.15, 0.35);
    rightEye.rotation.y = 0.3;
    this.headGroup.add(rightEye);

    const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    rightPupil.position.set(0.22, 0.15, 0.41);
    rightPupil.rotation.y = 0.3;
    this.headGroup.add(rightPupil);

    // Tufts
    const tuftGeo = new THREE.ConeGeometry(0.04, 0.3, 6);
    const centerTuft = new THREE.Mesh(tuftGeo, tuftMat);
    centerTuft.position.set(0, 0.58, 0);
    this.headGroup.add(centerTuft);

    const leftTuft = new THREE.Mesh(tuftGeo, tuftMat);
    leftTuft.position.set(-0.07, 0.56, 0);
    leftTuft.rotation.z = 0.35;
    this.headGroup.add(leftTuft);

    const rightTuft = new THREE.Mesh(tuftGeo, tuftMat);
    rightTuft.position.set(0.07, 0.56, 0);
    rightTuft.rotation.z = -0.35;
    this.headGroup.add(rightTuft);

    // Head is hidden initially while body is inanimate
    this.headGroup.visible = false;

    // Slump body slightly forward while inanimate
    this.bodyGroup.rotation.x = 0.15;
  }

  public isNear(playerPos: THREE.Vector3, threshold = 2.4): boolean {
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    return Math.sqrt(dx * dx + dz * dz) < threshold;
  }

  public getHeadWorldPosition(): THREE.Vector3 {
    return this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  }

  /**
   * Start head attachment animation
   */
  public attachHead(carriedHeadWorldPos: THREE.Vector3) {
    this.state = CompanionState.CONNECTING;
    this.connectionTimer = 0;
    this.connectionStartPos.copy(carriedHeadWorldPos);

    // Make head visible and place at start position
    this.headGroup.visible = true;
    const localStart = this.connectionStartPos.clone().sub(this.position);
    this.headGroup.position.copy(localStart);

    sound.playReunionAwaken();
  }

  public setOnDeliverToy(callback: () => void) {
    this.onDeliverToyCallback = callback;
  }

  public getMouthWorldPosition(): THREE.Vector3 {
    const mouthLocal = new THREE.Vector3(0, 1.0, 0.46);
    mouthLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentYaw);
    return this.position.clone().add(mouthLocal);
  }

  public startFetch(ball: FetchToy | PsyduckHead) {
    if (this.state !== CompanionState.LIVING_COMPANION) return;
    this.fetchTargetBall = ball;
    this.fetchState = FetchState.FETCHING;
    this.fetchTimer = 0;

    // Face the thrown ball immediately
    const dx = ball.position.x - this.position.x;
    const dz = ball.position.z - this.position.z;
    this.currentYaw = Math.atan2(dx, dz);
    this.group.rotation.y = this.currentYaw;

    // Fetch dialogue on throw with cooldown
    const now = performance.now();
    if (now > this.fetchQuipCooldown && Math.random() < 0.6) {
      const throwQuips = ["Throw it!", "Come on!"];
      const quip = throwQuips[Math.floor(Math.random() * throwQuips.length)];
      psyduckDialogue.triggerSpecific(quip, this.getHeadWorldPosition(), 2.5);
      this.fetchQuipCooldown = now + 4000;
    }
  }

  public playWithBall(ball: FetchToy | PsyduckHead) {
    this.startFetch(ball);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isPlayerMoving: boolean,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {

    switch (this.state) {
      case CompanionState.INANIMATE_BODY: {
        // Pulse neck ring aura
        const glow = 0.8 + Math.sin(Date.now() * 0.005) * 0.4;
        this.neckAuraLight.intensity = glow;
        break;
      }

      case CompanionState.CONNECTING: {
        this.connectionTimer += delta * 1.5;
        const progress = Math.min(1.0, this.connectionTimer);
        const ease = progress * progress * (3 - 2 * progress); // smoothstep

        // Arc head up and onto neck
        const targetLocal = new THREE.Vector3(0, 1.05, 0);
        const currentLocal = new THREE.Vector3().lerpVectors(
          this.connectionStartPos.clone().sub(this.position),
          targetLocal,
          ease
        );
        currentLocal.y += Math.sin(progress * Math.PI) * 0.6;
        this.headGroup.position.copy(currentLocal);

        if (progress >= 1.0) {
          this.headGroup.position.copy(targetLocal);
          this.state = CompanionState.AWAKENING;
          this.awakeningTimer = 0;
          this.awakeningStage = 0;
          this.neckRingMesh.visible = false;
          this.neckAuraLight.intensity = 0;

          // Awakening quip 1
          psyduckDialogue.trigger('REUNION', this.getHeadWorldPosition(), true);
        }
        break;
      }

      case CompanionState.AWAKENING: {
        this.awakeningTimer += delta;

        // Stage 0: Shake body and stand up straight
        if (this.awakeningTimer < 1.0) {
          this.bodyGroup.rotation.x = 0.15 * (1 - this.awakeningTimer);
          this.headGroup.rotation.z = Math.sin(this.awakeningTimer * 20) * 0.15;
          this.leftWing.rotation.z = 0.35 + Math.sin(this.awakeningTimer * 15) * 0.2;
          this.rightWing.rotation.z = -0.35 - Math.sin(this.awakeningTimer * 15) * 0.2;
        } else if (this.awakeningTimer < 2.2) {
          // Stage 1: Joyful little hop and wing flutter
          const hopTime = (this.awakeningTimer - 1.0) / 1.2;
          this.group.position.y = this.position.y + Math.sin(hopTime * Math.PI) * 0.4;
          this.leftWing.rotation.z = 0.8 + Math.sin(hopTime * 30) * 0.3;
          this.rightWing.rotation.z = -0.8 - Math.sin(hopTime * 30) * 0.3;
          this.headGroup.rotation.z = 0;
        } else {
          // Awakening complete -> Living companion!
          this.group.position.y = this.position.y;
          this.state = CompanionState.LIVING_COMPANION;
          this.bodyGroup.rotation.x = 0;
          this.leftWing.rotation.z = 0.35;
          this.rightWing.rotation.z = -0.35;
          psyduckDialogue.triggerSpecific("I got my legs back!", this.getHeadWorldPosition(), 3.5);
          this.onAwakened?.();
        }
        break;
      }

      case CompanionState.LIVING_COMPANION: {
        this.updateLivingCompanion(delta, playerPos, isPlayerMoving, getGroundHeight);
        break;
      }
    }
  }

  public talk(playerPos: THREE.Vector3): boolean {
    if (this.state !== CompanionState.LIVING_COMPANION) return false;
    if (this.talkCooldown > 0) return false;

    // Immediately orient toward Aafraa
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    this.currentYaw = Math.atan2(dx, dz);
    this.group.rotation.y = this.currentYaw;

    const spoken = psyduckDialogue.trigger('TALK', this.getHeadWorldPosition(), true);
    if (!spoken) return false;

    this.talkingAnimTimer = 2.0;
    this.talkCooldown = 2.4; // Cooldown to prevent spam
    return true;
  }

  public sitOnBench(benchSeatPos: THREE.Vector3, sceneryYaw: number) {
    if (this.state !== CompanionState.LIVING_COMPANION) return;
    this.isSittingOnBench = true;
    this.benchTargetPos.copy(benchSeatPos);
    this.benchTargetYaw = sceneryYaw;
    this.benchSitProgress = 0;
    this.fetchState = FetchState.IDLE;
    this.fetchTargetBall = null;
  }

  public standUpFromBench() {
    if (!this.isSittingOnBench) return;
    this.isSittingOnBench = false;
    this.benchSitProgress = 0;
    // Small joyful flutter on standing
    this.leftWing.rotation.z = 0.6;
    this.rightWing.rotation.z = -0.6;
  }

  public reset(spawnPos: THREE.Vector3 = new THREE.Vector3(3.2, 1.0, -15.5)) {
    this.state = CompanionState.INANIMATE_BODY;
    this.position.copy(spawnPos);
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
    this.bodyGroup.rotation.set(0.15, 0, 0); // slump forward while inanimate
    this.headGroup.visible = false;
    this.neckRingMesh.visible = true;
    this.neckAuraLight.intensity = 1.2;
    this.isSittingOnBench = false;
    this.benchSitProgress = 0;
    this.fetchState = FetchState.IDLE;
    this.fetchTargetBall = null;
    this.fetchTimer = 0;
    this.fetchQuipCooldown = 0;
    this.talkCooldown = 0;
    this.talkingAnimTimer = 0;
    this.awakeningTimer = 0;
    this.connectionTimer = 0;
    this.currentYaw = 0;
  }

  private updateLivingCompanion(
    delta: number,
    playerPos: THREE.Vector3,
    isPlayerMoving: boolean,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {
    this.talkCooldown = Math.max(0, this.talkCooldown - delta);

    // Cute Talking Animation sequence when Aafraa interacts with living Psyduck
    if (this.talkingAnimTimer > 0) {
      this.talkingAnimTimer -= delta;

      const groundInfo = getGroundHeight(this.position.x, this.position.z);
      if (groundInfo.isValid) {
        this.position.y = groundInfo.groundY;
      }
      this.group.position.copy(this.position);

      // Smoothly orient toward Aafraa while chatting
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      const targetYaw = Math.atan2(dx, dz);
      this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 8.0);
      this.group.rotation.y = this.currentYaw;
      this.group.rotation.z = 0;

      // Playful talking gestures: bobbing head, quizzical head tilt, happy wing flutters
      const talkCycle = (2.0 - this.talkingAnimTimer) * 12.0;
      this.headGroup.rotation.x = Math.sin(talkCycle) * 0.12;
      this.headGroup.rotation.z = Math.sin(talkCycle * 0.6) * 0.14;
      this.leftWing.rotation.z = 0.45 + Math.sin(talkCycle * 0.8) * 0.25;
      this.rightWing.rotation.z = -0.45 - Math.sin(talkCycle * 0.8) * 0.25;

      const bounce = Math.sin(talkCycle) * 0.03;
      this.bodyGroup.scale.set(1 + bounce * 0.5, 1 - bounce, 1 + bounce * 0.5);
      return;
    }

    // 0. Bench Sitting Behavior
    if (this.isSittingOnBench) {
      const bdx = this.benchTargetPos.x - this.position.x;
      const bdz = this.benchTargetPos.z - this.position.z;
      const distToBenchSeat = Math.hypot(bdx, bdz);

      if (distToBenchSeat > 0.3) {
        // Walk over to the bench beside Aafraa
        this.walkTimer += delta * 7.0;
        const dirX = bdx / distToBenchSeat;
        const dirZ = bdz / distToBenchSeat;
        this.position.x += dirX * this.followSpeed * delta;
        this.position.z += dirZ * this.followSpeed * delta;

        const targetYaw = Math.atan2(dirX, dirZ);
        this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 8.0);
        this.group.rotation.y = this.currentYaw;

        this.group.rotation.z = Math.sin(this.walkTimer) * 0.1;
        this.leftWing.rotation.z = 0.4 + Math.sin(this.walkTimer) * 0.2;
        this.rightWing.rotation.z = -0.4 - Math.sin(this.walkTimer) * 0.2;
      } else {
        // Arrived at bench seat beside Aafraa!
        this.position.x = this.benchTargetPos.x;
        this.position.z = this.benchTargetPos.z;
        this.currentYaw = this.lerpAngle(this.currentYaw, this.benchTargetYaw, delta * 7.0);
        this.group.rotation.y = this.currentYaw;
        this.group.rotation.z = 0;

        if (this.benchSitProgress === 0) {
          this.benchSitProgress = 1;
          // Trigger contextual sitting dialogue line!
          if (!this.suppressBenchDialogue) {
            psyduckDialogue.trigger('BENCH', this.getHeadWorldPosition(), true);
          }
        }

        // Cute seated posture
        this.idleTimer += delta;
        const breath = Math.sin(this.idleTimer * 2.2) * 0.02;
        this.bodyGroup.scale.set(1.05 + breath * 0.5, 0.92 + breath, 1.05 + breath * 0.5);
        this.leftWing.rotation.z = 0.25;
        this.rightWing.rotation.z = -0.25;
        this.leftFoot.position.z = 0.02;
        this.rightFoot.position.z = 0.02;
        this.headGroup.rotation.z = Math.sin(this.idleTimer * 0.6) * 0.06;
      }

      this.position.y = this.benchTargetPos.y;
      this.group.position.copy(this.position);
      return;
    }

    // 1. Check if we should execute fetch state machine
    if (this.fetchState !== FetchState.IDLE && this.fetchTargetBall) {
      this.handleFetchStateMachine(delta, playerPos, getGroundHeight);
      return;
    }

    // 2. Standard Following Behavior
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    const comfortableStopDist = 2.4;
    const resumeFollowDist = 2.9;

    const isMovingToPlayer = distToPlayer > resumeFollowDist;

    if (isMovingToPlayer) {
      this.walkTimer += delta * 7.5;

      // Move toward player
      const dirX = dx / distToPlayer;
      const dirZ = dz / distToPlayer;

      this.position.x += dirX * this.followSpeed * delta;
      this.position.z += dirZ * this.followSpeed * delta;

      // Rotate toward movement direction smoothly
      const targetYaw = Math.atan2(dirX, dirZ);
      this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 8.0);
      this.group.rotation.y = this.currentYaw;

      // Cute waddle animation
      this.group.rotation.z = Math.sin(this.walkTimer) * 0.11;
      this.leftWing.rotation.z = 0.4 + Math.sin(this.walkTimer) * 0.25;
      this.rightWing.rotation.z = -0.4 - Math.sin(this.walkTimer) * 0.25;
      this.leftFoot.position.z = 0.08 + Math.sin(this.walkTimer) * 0.12;
      this.rightFoot.position.z = 0.08 - Math.sin(this.walkTimer) * 0.12;

      // Occasional following dialogue
      this.idleQuipCooldown = 12.0;
      if (Math.random() < 0.003) {
        psyduckDialogue.trigger('FOLLOWING', this.getHeadWorldPosition());
      }
    } else {
      // Idle near Aafraa
      this.idleTimer += delta;
      this.walkTimer = 0;

      // Smoothly look toward Aafraa
      const targetYaw = Math.atan2(dx, dz);
      this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 5.0);
      this.group.rotation.y = this.currentYaw;
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, delta * 6.0);

      // Subtle breathing
      const breath = Math.sin(this.idleTimer * 2.8) * 0.02;
      this.bodyGroup.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);

      // Relaxed wings & feet
      this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.35, delta * 6);
      this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.35, delta * 6);
      this.leftFoot.position.z = THREE.MathUtils.lerp(this.leftFoot.position.z, 0.08, delta * 6);
      this.rightFoot.position.z = THREE.MathUtils.lerp(this.rightFoot.position.z, 0.08, delta * 6);

      // Occasional head tilt
      this.headGroup.rotation.z = Math.sin(this.idleTimer * 0.8) * 0.08;

      // Idle comments if standing still
      if (!isPlayerMoving) {
        this.idleQuipCooldown -= delta;
        if (this.idleQuipCooldown <= 0) {
          psyduckDialogue.trigger('IDLE', this.getHeadWorldPosition());
          this.idleQuipCooldown = 20.0 + Math.random() * 10;
        }
      }
    }

    // Keep grounded on Level 3 terrain
    const groundInfo = getGroundHeight(this.position.x, this.position.z);
    if (groundInfo.isValid) {
      this.position.y = groundInfo.groundY;
    }
    this.group.position.copy(this.position);
  }

  private handleFetchStateMachine(
    delta: number,
    playerPos: THREE.Vector3,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {
    if (!this.fetchTargetBall) {
      this.fetchState = FetchState.IDLE;
      return;
    }

    this.fetchTimer += delta;

    switch (this.fetchState) {
      case FetchState.OBJECT_THROWN:
      case FetchState.FETCHING: {
        const bx = this.fetchTargetBall.position.x;
        const bz = this.fetchTargetBall.position.z;
        const dx = bx - this.position.x;
        const dz = bz - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 1.1) {
          // Eagerly waddle towards the thrown ball
          this.walkTimer += delta * 11.0;
          const speed = 5.4;

          this.position.x += (dx / dist) * speed * delta;
          this.position.z += (dz / dist) * speed * delta;

          const targetYaw = Math.atan2(dx, dz);
          this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 10.0);
          this.group.rotation.y = this.currentYaw;

          // Animated excited waddle with outstretched wings
          this.group.rotation.z = Math.sin(this.walkTimer) * 0.14;
          this.leftWing.rotation.z = 0.7 + Math.sin(this.walkTimer) * 0.3;
          this.rightWing.rotation.z = -0.7 - Math.sin(this.walkTimer) * 0.3;
        } else {
          // Reached ball -> Pick it up!
          sound.playCatchToss();

          // Distance check for bad throw reaction
          const throwDist = (this.fetchTargetBall as any).throwDistance ?? 10;
          if (throwDist < 3.5 && Math.random() < 0.6) {
            psyduckDialogue.triggerSpecific("That was a bad throw.", this.getHeadWorldPosition(), 2.8);
          } else if (Math.random() < 0.65) {
            psyduckDialogue.triggerSpecific("Got it!", this.getHeadWorldPosition(), 2.2);
          }

          // Attach ball to bill/mouth
          this.fetchTargetBall.state = PsyduckState.CARRIED;
          this.fetchTargetBall.position.copy(this.getMouthWorldPosition());
          this.fetchTargetBall.velocity.set(0, 0, 0);
          this.fetchTargetBall.group.position.copy(this.fetchTargetBall.position);

          this.fetchState = FetchState.RETURNING;
          this.fetchTimer = 0;
        }

        // Safeguard: if stuck chasing for too long (> 14s)
        if (this.fetchTimer > 14.0) {
          this.fetchTargetBall.position.copy(this.getMouthWorldPosition());
          this.fetchState = FetchState.RETURNING;
          this.fetchTimer = 0;
        }
        break;
      }

      case FetchState.CARRYING:
      case FetchState.RETURNING: {
        // Keep ball securely anchored in mouth
        this.fetchTargetBall.state = PsyduckState.CARRIED;
        this.fetchTargetBall.position.copy(this.getMouthWorldPosition());
        this.fetchTargetBall.group.position.copy(this.fetchTargetBall.position);
        this.fetchTargetBall.velocity.set(0, 0, 0);

        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const distToPlayer = Math.hypot(dx, dz);

        if (distToPlayer > 1.8) {
          // Trotting proudly back to Aafraa
          this.walkTimer += delta * 8.5;
          const speed = 4.6;

          this.position.x += (dx / distToPlayer) * speed * delta;
          this.position.z += (dz / distToPlayer) * speed * delta;

          const targetYaw = Math.atan2(dx, dz);
          this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 9.0);
          this.group.rotation.y = this.currentYaw;

          // Happy trotting waddle carrying ball
          this.group.rotation.z = Math.sin(this.walkTimer) * 0.1;
          this.leftWing.rotation.z = 0.35 + Math.sin(this.walkTimer) * 0.15;
          this.rightWing.rotation.z = -0.35 - Math.sin(this.walkTimer) * 0.15;
        } else {
          // Reached Aafraa -> Deliver the ball!
          this.fetchState = FetchState.DELIVERING;
          this.fetchTimer = 0;
        }

        // Safeguard: if player moved away endlessly for > 16s
        if (this.fetchTimer > 16.0) {
          this.fetchState = FetchState.DELIVERING;
          this.fetchTimer = 0;
        }
        break;
      }

      case FetchState.DELIVERING: {
        // Face Aafraa directly
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        this.currentYaw = Math.atan2(dx, dz);
        this.group.rotation.y = this.currentYaw;

        // Delivery bow & wing extension
        this.headGroup.rotation.x = 0.15;
        this.leftWing.rotation.z = 0.55;
        this.rightWing.rotation.z = -0.55;

        // Delivery quip
        const deliveryQuips = ["Here!", "Your turn!", "Again!"];
        if (Math.random() < 0.7) {
          const quip = deliveryQuips[Math.floor(Math.random() * deliveryQuips.length)];
          psyduckDialogue.triggerSpecific(quip, this.getHeadWorldPosition(), 2.2);
        }

        // Hand ball back to Aafraa
        if (this.onDeliverToyCallback) {
          this.onDeliverToyCallback();
        }

        // Return to IDLE
        this.fetchState = FetchState.IDLE;
        this.fetchTargetBall = null;
        this.walkTimer = 0;
        break;
      }

      default:
        this.fetchState = FetchState.IDLE;
        this.fetchTargetBall = null;
        break;
    }

    const groundInfo = getGroundHeight(this.position.x, this.position.z);
    if (groundInfo.isValid) {
      this.position.y = groundInfo.groundY;
    }
    this.group.position.copy(this.position);
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * Math.min(1.0, t);
  }
}
