import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { IslandProps } from '../systems/islandProps';
import { PsyduckHead } from '../systems/psyduckModel';
import { sound } from '../systems/audio';
import { PinState, PsyduckState } from '../types';

export class Level2Bowling {
  public group: THREE.Group;
  public spawnPoint = new THREE.Vector3(0, 1.2, 14);
  public psyduckSpawn = new THREE.Vector3(0, 1.0, 11);

  // Bowling Lane Geometry & Dimensions
  public laneWidth = 4.2;
  public laneLength = 22.0;
  public laneCenterZ = 0; // runs from z = 10 down to z = -12
  public pinDeckZ = -8.5;

  // 10 Pins
  private pins: PinState[] = [];
  private pinMeshes: THREE.Group[] = [];
  
  // State
  public fallenCount = 0;
  public isStrike = false;
  public isDoorOpen = false;
  private doorProgress = 0;
  private doorLeft: THREE.Mesh;
  private doorRight: THREE.Mesh;
  private portalField: THREE.Mesh;
  private strikeBannerMesh: THREE.Mesh | null = null;
  private bannerTimer = 0;

  // Single-Throw Strike Tracking & Polish
  public currentThrowFallenCount = 0;
  public isThrowInProgress = false;
  private lastPinHitSoundTime = 0;

  public startThrowAttempt() {
    this.currentThrowFallenCount = 0;
    this.isThrowInProgress = true;
  }

  public endThrowAttempt() {
    this.isThrowInProgress = false;
  }

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Level_2_Bowling";

    this.buildIslandGeometry();
    this.buildBowlingLane();
    this.setup10Pins();
    this.buildExitArchway();
    this.buildScenery();
  }

  private buildIslandGeometry() {
    // Stylized floating island
    const grassMat = new THREE.MeshToonMaterial({
      color: 0x1a535c, // Deep blue-green night grass
    });

    const rockMat = new THREE.MeshToonMaterial({
      color: 0x222a3d,
    });

    // Elongated island for the bowling lane
    const islandGeo = new THREE.CylinderGeometry(16, 15, 3.5, 24);
    islandGeo.scale(1.1, 1.0, 1.6);
    const islandMesh = new THREE.Mesh(islandGeo, grassMat);
    islandMesh.position.y = -1.75;
    islandMesh.receiveShadow = true;
    this.group.add(islandMesh);

    // Conical underbelly
    const underGeo = new THREE.ConeGeometry(15, 26, 24);
    underGeo.scale(1.1, 1.0, 1.6);
    underGeo.rotateX(Math.PI);
    const underMesh = new THREE.Mesh(underGeo, rockMat);
    underMesh.position.y = -16.5;
    underMesh.castShadow = true;
    this.group.add(underMesh);
  }

  private buildBowlingLane() {
    const laneGroup = new THREE.Group();
    this.group.add(laneGroup);

    // Polished Wooden Bowling Lane Board
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 512;
    woodCanvas.height = 1024;
    const ctx = woodCanvas.getContext('2d')!;

    // Rich parquet wood planks
    ctx.fillStyle = '#dfa467';
    ctx.fillRect(0, 0, woodCanvas.width, woodCanvas.height);

    ctx.strokeStyle = '#c58348';
    ctx.lineWidth = 6;
    for (let x = 0; x < woodCanvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, woodCanvas.height);
      ctx.stroke();
    }

    // Aiming arrows near approach
    ctx.fillStyle = '#8b5a2b';
    for (let a = 1; a <= 5; a++) {
      const ax = (woodCanvas.width / 6) * a;
      const ay = woodCanvas.height * 0.72;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 30);
      ctx.lineTo(ax - 12, ay + 15);
      ctx.lineTo(ax + 12, ay + 15);
      ctx.closePath();
      ctx.fill();
    }

    const laneTexture = new THREE.CanvasTexture(woodCanvas);
    laneTexture.wrapS = THREE.RepeatWrapping;
    laneTexture.wrapT = THREE.RepeatWrapping;

    const laneMat = new THREE.MeshStandardMaterial({
      map: laneTexture,
      roughness: 0.25,
      metalness: 0.1,
    });

    const laneGeo = new THREE.BoxGeometry(this.laneWidth, 0.2, this.laneLength);
    const laneMesh = new THREE.Mesh(laneGeo, laneMat);
    laneMesh.position.set(0, 0.1, this.laneCenterZ);
    laneMesh.receiveShadow = true;
    laneGroup.add(laneMesh);

    // Side Gutters
    const gutterMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const gutterGeo = new THREE.BoxGeometry(0.5, 0.25, this.laneLength);

    const leftGutter = new THREE.Mesh(gutterGeo, gutterMat);
    leftGutter.position.set(-(this.laneWidth / 2 + 0.25), 0.05, this.laneCenterZ);
    laneGroup.add(leftGutter);

    const rightGutter = new THREE.Mesh(gutterGeo, gutterMat);
    rightGutter.position.set(this.laneWidth / 2 + 0.25, 0.05, this.laneCenterZ);
    laneGroup.add(rightGutter);

    // Approach indicator line (foul line)
    const foulMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const foulGeo = new THREE.BoxGeometry(this.laneWidth, 0.02, 0.15);
    const foulLine = new THREE.Mesh(foulGeo, foulMat);
    foulLine.position.set(0, 0.21, 8.5);
    laneGroup.add(foulLine);
  }

  private setup10Pins() {
    // Clean up any existing pin meshes from group to prevent duplicate pin accumulation
    this.pinMeshes.forEach(mesh => {
      this.group.remove(mesh);
    });
    this.pins = [];
    this.pinMeshes = [];

    // Traditional 1-2-3-4 Triangle Formation with balanced, fun pin spacing
    // Row 1 (Pin 1)
    const pinCoords: { x: number; z: number }[] = [
      { x: 0, z: this.pinDeckZ }, // Pin 1 (Headpin)
      // Row 2 (Pins 2, 3)
      { x: -0.38, z: this.pinDeckZ - 0.78 },
      { x: 0.38, z: this.pinDeckZ - 0.78 },
      // Row 3 (Pins 4, 5, 6)
      { x: -0.76, z: this.pinDeckZ - 1.56 },
      { x: 0, z: this.pinDeckZ - 1.56 },
      { x: 0.76, z: this.pinDeckZ - 1.56 },
      // Row 4 (Pins 7, 8, 9, 10)
      { x: -1.14, z: this.pinDeckZ - 2.34 },
      { x: -0.38, z: this.pinDeckZ - 2.34 },
      { x: 0.38, z: this.pinDeckZ - 2.34 },
      { x: 1.14, z: this.pinDeckZ - 2.34 },
    ];

    pinCoords.forEach((coord, idx) => {
      const pinState: PinState = {
        id: idx + 1,
        initialX: coord.x,
        initialZ: coord.z,
        currentX: coord.x,
        currentY: 0.2,
        currentZ: coord.z,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        isFallen: false,
      };
      this.pins.push(pinState);

      const pinMesh = this.createBowlingPinMesh();
      pinMesh.position.set(pinState.currentX, pinState.currentY, pinState.currentZ);
      this.group.add(pinMesh);
      this.pinMeshes.push(pinMesh);
    });
  }

  private createBowlingPinMesh(): THREE.Group {
    const pinGroup = new THREE.Group();

    const whiteMat = new THREE.MeshToonMaterial({ color: 0xfcfcfc });
    const redMat = new THREE.MeshToonMaterial({ color: 0xe74c3c });

    // Base & lower belly
    const baseGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.45, 14);
    const base = new THREE.Mesh(baseGeo, whiteMat);
    base.position.y = 0.22;
    base.castShadow = true;
    pinGroup.add(base);

    // Belly bulge
    const bellyGeo = new THREE.SphereGeometry(0.2, 14, 14);
    bellyGeo.scale(1.0, 1.2, 1.0);
    const belly = new THREE.Mesh(bellyGeo, whiteMat);
    belly.position.y = 0.38;
    belly.castShadow = true;
    pinGroup.add(belly);

    // Slender neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.18, 0.35, 12);
    const neck = new THREE.Mesh(neckGeo, whiteMat);
    neck.position.y = 0.65;
    pinGroup.add(neck);

    // Red stripes on neck
    const stripeGeo = new THREE.CylinderGeometry(0.105, 0.115, 0.05, 12);
    const stripe1 = new THREE.Mesh(stripeGeo, redMat);
    stripe1.position.y = 0.62;
    pinGroup.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, redMat);
    stripe2.position.y = 0.70;
    pinGroup.add(stripe2);

    // Head bulb
    const headGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const head = new THREE.Mesh(headGeo, whiteMat);
    head.position.y = 0.85;
    head.castShadow = true;
    pinGroup.add(head);

    return pinGroup;
  }

  private buildExitArchway() {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -15.5);
    this.group.add(archGroup);

    const stoneMat = new THREE.MeshToonMaterial({ color: 0x34495e });
    const woodDoorMat = new THREE.MeshToonMaterial({ color: 0x54382c });

    // Pillars
    const pillarGeo = new THREE.BoxGeometry(1.6, 8.0, 1.6);
    const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
    leftPillar.position.set(-3.5, 4.0, 0);
    leftPillar.castShadow = true;
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
    rightPillar.position.set(3.5, 4.0, 0);
    rightPillar.castShadow = true;
    archGroup.add(rightPillar);

    // Lintel
    const lintelGeo = new THREE.BoxGeometry(8.6, 1.6, 2.0);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, 8.0, 0);
    lintel.castShadow = true;
    archGroup.add(lintel);

    // Left Door
    const doorGeo = new THREE.BoxGeometry(2.7, 6.5, 0.4);
    this.doorLeft = new THREE.Mesh(doorGeo, woodDoorMat);
    this.doorLeft.position.set(-1.35, 3.25, 0);
    this.doorLeft.castShadow = true;
    archGroup.add(this.doorLeft);

    // Right Door
    this.doorRight = new THREE.Mesh(doorGeo, woodDoorMat);
    this.doorRight.position.set(1.35, 3.25, 0);
    this.doorRight.castShadow = true;
    archGroup.add(this.doorRight);

    // Portal
    const portalGeo = new THREE.PlaneGeometry(5.4, 6.5);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0xa29bfe,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.portalField = new THREE.Mesh(portalGeo, portalMat);
    this.portalField.position.set(0, 3.25, -0.2);
    this.portalField.visible = false;
    archGroup.add(this.portalField);
  }

  private buildScenery() {
    // Hanging party lanterns along the lane
    for (let z = 8; z >= -12; z -= 5) {
      const leftLantern = IslandProps.createLanternPost(0xff7675);
      leftLantern.position.set(-(this.laneWidth / 2 + 2.4), 0, z);
      this.group.add(leftLantern);

      const rightLantern = IslandProps.createLanternPost(0x74b9ff);
      rightLantern.position.set(this.laneWidth / 2 + 2.4, 0, z);
      this.group.add(rightLantern);
    }

    // Trees and flora along borders
    const trees = [
      { x: -10, z: 8, h: 4.6 },
      { x: -11, z: -2, h: 5.2 },
      { x: -10, z: -10, h: 4.8 },
      { x: 10, z: 7, h: 4.5 },
      { x: 11, z: -3, h: 5.0 },
      { x: 10, z: -10, h: 4.9 },
    ];
    trees.forEach(t => {
      const tree = IslandProps.createStylizedTree(0x1e824c, t.h);
      tree.position.set(t.x, 0, t.z);
      this.group.add(tree);
    });

    // Flower patches
    const flowers = [
      { x: -6, z: 12, c: 0xff9ff3 },
      { x: 6, z: 12, c: 0xfeca57 },
      { x: -6, z: -4, c: 0x48dbfb },
      { x: 6, z: -4, c: 0x1dd1a1 },
    ];
    flowers.forEach(f => {
      const patch = IslandProps.createFlowerPatch(f.c, 6);
      patch.position.set(f.x, 0, f.z);
      this.group.add(patch);
    });
  }

  public updatePhysics(psyduck: PsyduckHead, delta: number) {
    const ballRadius = 0.30; // Core collision radius for Psyduck
    const pinRadius = 0.18;
    const ballSpeed = psyduck.velocity.length();

    // 1. Check collision between moving Psyduck head and each standing pin
    if (psyduck.state === PsyduckState.THROWN || psyduck.state === PsyduckState.ROLLING) {
      this.pins.forEach((pin) => {
        if (pin.isFallen) return;

        const dx = psyduck.position.x - pin.currentX;
        const dz = psyduck.position.z - pin.currentZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Hit detected
        if (dist < ballRadius + pinRadius && Math.abs(psyduck.position.y - pin.currentY) < 1.0) {
          const now = performance.now();
          if (now - this.lastPinHitSoundTime > 60) {
            this.lastPinHitSoundTime = now;
            sound.playPinHit();
          }

          // Calculate knockback velocity based on contact normal and ball momentum
          const hitDirX = -dx / (dist || 1);
          const hitDirZ = -dz / (dist || 1);
          const hitPower = Math.min(14.0, Math.max(6.0, ballSpeed * 0.68));

          pin.isFallen = true;
          pin.source = 'ball';

          // If hit is dead center on headpin (small dx), momentum goes mostly backwards, not sideways
          const isCenterHit = Math.abs(dx) < 0.14;
          const sideDeflection = isCenterHit ? (Math.random() - 0.5) * 0.7 : hitDirX * 1.25;

          pin.velocityX = Math.max(-5.0, Math.min(5.0, sideDeflection * hitPower * 0.45));
          pin.velocityZ = -Math.min(6.5, Math.abs(psyduck.velocity.z) * 0.26 + 1.5);
          pin.velocityY = 1.4 + Math.random() * 0.6;

          // Momentum transfer to ball: Psyduck slows down and deflects off each pin
          psyduck.velocity.z *= 0.82;
          psyduck.velocity.x += -hitDirX * 0.50;

          if (this.isThrowInProgress) {
            this.currentThrowFallenCount++;
          }
        }
      });
    }

    // 2. Dynamic cascading domino effect: moving fallen pins knock down nearby standing pins
    this.pins.forEach((fallenPin) => {
      if (!fallenPin.isFallen) return;
      const speed = Math.hypot(fallenPin.velocityX, fallenPin.velocityZ);
      if (speed < 0.85) return;

      this.pins.forEach((standingPin) => {
        if (standingPin.isFallen) return;
        const dx = standingPin.currentX - fallenPin.currentX;
        const dz = standingPin.currentZ - fallenPin.currentZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Corner pins (7 & 10) require direct diagonal impact with sufficient momentum
        const isCornerPin = standingPin.id === 7 || standingPin.id === 10;
        if (isCornerPin && speed < 0.95) return;

        const maxDist = isCornerPin ? 0.52 : 0.62;
        const minDot = isCornerPin ? 0.30 : 0.20;

        // Distance check for domino hit
        if (dist < maxDist) {
          // Verify movement direction is generally towards the standing pin
          const dot = (fallenPin.velocityX * dx + fallenPin.velocityZ * dz) / (speed * dist || 1);
          if (dot > minDot) {
            standingPin.isFallen = true;
            standingPin.source = 'pin_' + fallenPin.id;
            standingPin.velocityX = fallenPin.velocityX * 0.52 + (Math.random() - 0.5) * 0.6;
            standingPin.velocityZ = fallenPin.velocityZ * 0.52 - 0.7;
            standingPin.velocityY = 1.2 + Math.random() * 0.4;

            // Damping so secondary impacts absorb energy
            fallenPin.velocityX *= 0.38;
            fallenPin.velocityZ *= 0.38;

            if (this.isThrowInProgress) {
              this.currentThrowFallenCount++;
            }
          }
        }
      });
    });

    // 3. Animate falling / tumbling pins with natural floor physics
    let newlyFallen = 0;
    this.pins.forEach((pin, idx) => {
      if (pin.isFallen) {
        newlyFallen++;
        pin.currentX += pin.velocityX * delta;
        pin.currentY += pin.velocityY * delta;
        pin.currentZ += pin.velocityZ * delta;

        // Pin gravity & gentle floor bounce on lane
        pin.velocityY -= 20.0 * delta;
        if (pin.currentY < 0.15) {
          pin.currentY = 0.15;
          pin.velocityY = -pin.velocityY * 0.25;
          pin.velocityX *= 0.88;
          pin.velocityZ *= 0.88;
        }

        pin.rotationX += delta * 6.0;
        pin.rotationZ += delta * 4.5;

        const mesh = this.pinMeshes[idx];
        mesh.position.set(pin.currentX, pin.currentY, pin.currentZ);
        mesh.rotation.set(pin.rotationX, pin.rotationY, pin.rotationZ);
      }
    });

    this.fallenCount = newlyFallen;

    // 4. STRIKE: Occurs only when all 10 pins are knocked down by the SAME throw
    if (this.isThrowInProgress && this.currentThrowFallenCount >= 10 && !this.isStrike) {
      this.triggerStrike();
    }

    // Door opening animation
    if (this.isDoorOpen && this.doorProgress < 1.0) {
      this.doorProgress = Math.min(1.0, this.doorProgress + delta * 0.9);
      this.doorLeft.position.x = -1.35 - this.doorProgress * 2.3;
      this.doorRight.position.x = 1.35 + this.doorProgress * 2.3;
      if (this.doorProgress > 0.4) {
        this.portalField.visible = true;
      }
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.strikeBannerMesh) {
        this.strikeBannerMesh.scale.addScalar(delta * 0.4);
      }
    }
  }

  public triggerStrike() {
    this.isStrike = true;
    this.isDoorOpen = true;

    sound.playStrikeFanfare();
    sound.playDoorOpen();

    // Trigger full screen celebratory confetti!
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'],
    });

    // Create 3D floating "STRIKE!" banner above pin deck
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#e67e22';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 82px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("STRIKE!", canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const bannerMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const bannerGeo = new THREE.PlaneGeometry(6.5, 3.2);
    this.strikeBannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    this.strikeBannerMesh.position.set(0, 4.8, this.pinDeckZ - 1.5);
    this.group.add(this.strikeBannerMesh);
    this.bannerTimer = 4.0;
  }

  public resetPins() {
    this.fallenCount = 0;
    this.currentThrowFallenCount = 0;
    this.isThrowInProgress = false;
    this.isStrike = false;
    this.setup10Pins();
  }

  public reset() {
    this.resetPins();
    this.isDoorOpen = false;
    this.doorProgress = 0;
    this.doorLeft.position.x = -1.35;
    this.doorRight.position.x = 1.35;
    this.portalField.visible = false;
    if (this.strikeBannerMesh) {
      this.group.remove(this.strikeBannerMesh);
      this.strikeBannerMesh = null;
    }
  }

  public isPlayerAtDoor(playerPos: THREE.Vector3): boolean {
    if (!this.isDoorOpen) return false;
    return Math.abs(playerPos.x) < 2.8 && playerPos.z <= -15.0 && playerPos.z >= -17.5;
  }

  public getGroundHeight(x: number, z: number): { groundY: number; isValid: boolean } {
    // Bowling lane
    if (Math.abs(x) <= (this.laneWidth / 2 + 0.6) && z >= -12.5 && z <= 12.0) {
      return { groundY: 0.1, isValid: true };
    }

    // Doorway approach
    if (this.isDoorOpen && Math.abs(x) < 3.0 && z < -15.0 && z > -25.0) {
      return { groundY: 0, isValid: true };
    }

    // Island bounds
    const dx = x / 17.5;
    const dz = z / 25.0;
    if (dx * dx + dz * dz <= 1.0) {
      return { groundY: 0, isValid: true };
    }

    return { groundY: -50, isValid: false };
  }
}
