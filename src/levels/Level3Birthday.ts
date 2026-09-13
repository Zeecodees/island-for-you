import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { IslandProps } from '../systems/islandProps';
import { PsyduckHead } from '../systems/psyduckModel';
import { FetchToy } from '../systems/fetchToy';
import { sound } from '../systems/audio';
import { FlowerTrailSystem } from '../systems/flowerTrailSystem';
import { PsyduckCompanion } from '../systems/psyduckCompanion';
import { MusicBoxProp } from '../systems/musicBoxProp';
import { TulipProp } from '../systems/tulipProp';
import { PsyduckState } from '../types';

interface FireworkParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

export interface EggHitResult {
  hit: boolean;
  hitCount: number;
  broken: boolean;
}

export class Level3Birthday {
  public group: THREE.Group;
  public spawnPoint = new THREE.Vector3(0, 1.2, 22);
  public psyduckSpawn = new THREE.Vector3(0, 1.0, 19);

  // Shrine & Egg
  public eggPosition = new THREE.Vector3(0, 1.6, -16);
  private eggMesh: THREE.Group;
  private eggAuraLight: THREE.PointLight;
  public isEggBroken = false;
  public eggHitCount = 0;
  private lastEggHitTime = 0;
  private eggCrackStage1: THREE.Group;
  private eggCrackStage2: THREE.Group;
  private eggShakeTimer = 0;
  private eggShakeIntensity = 0;
  private eggPieces: THREE.Mesh[] = [];
  private eggPieceVelocities: THREE.Vector3[] = [];

  // Birthday Reveal Assets
  public isBirthdayRevealed = false;
  private cakeGroup: THREE.Group;
  private candleFlames: THREE.Mesh[] = [];
  private candleLights: THREE.PointLight[] = [];
  public candlesBlown = false;
  private balloons: THREE.Group[] = [];
  private fairyLights: THREE.Group[] = [];
  
  // Fireworks particle system
  private fireworks: FireworkParticle[] = [];
  private fireworksPoints: THREE.Points;
  private fireworksGeo: THREE.BufferGeometry;
  private maxFireworksParticles = 600;
  private fireworkLaunchTimer = 0;

  // Level 3 Exclusive: Dynamic Walking Flower Growth Trail
  public flowerTrail: FlowerTrailSystem;

  // Psyduck Companion & Dedicated Fetch Toy Prop
  public companion: PsyduckCompanion;
  public playHead: FetchToy | null = null;
  public tulip: TulipProp | null = null;

  // Scenic Bench & Music Box
  public benchGroup: THREE.Group;
  public benchPosition = new THREE.Vector3(15.5, 0, 11.5);
  public benchYaw = 0.65; // Orient toward moon and starry sky
  public musicBox: MusicBoxProp;
  public musicBoxPosition = new THREE.Vector3(13.8, 0, 12.8);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Level_3_Birthday";

    this.buildGrandIsland();
    this.buildMysteriousEgg();
    this.buildBirthdayCake();
    this.buildFireworksSystem();
    this.buildBalloonsAndDecorations();
    this.buildScenery();

    // Flowers grow dynamically where Aafraa walks in Level 3
    this.flowerTrail = new FlowerTrailSystem();
    this.group.add(this.flowerTrail.group);

    // Psyduck Body waiting on the right side of the cake
    this.companion = new PsyduckCompanion(new THREE.Vector3(3.2, 1.0, -15.5));
    this.group.add(this.companion.group);

    // Scenic Bench placed on the beautiful island rim overlooking moon, stars & clouds
    this.benchGroup = IslandProps.createScenicBench();
    this.benchGroup.position.copy(this.benchPosition);
    this.benchGroup.rotation.y = this.benchYaw;
    this.group.add(this.benchGroup);

    // Scenic Music Player placed beside the scenic bench
    this.musicBox = new MusicBoxProp();
    this.musicBox.group.position.copy(this.musicBoxPosition);
    this.musicBox.group.rotation.y = this.benchYaw + 0.3;
    this.group.add(this.musicBox.group);

    // Warm lantern beside the scenic bench
    const benchLantern = IslandProps.createLanternPost(0xffeaa7);
    benchLantern.position.set(13.8, 0, 9.8);
    this.group.add(benchLantern);

    // Romantic flower patch near the bench
    const benchFlowers = IslandProps.createFlowerPatch(0xff7675, 8);
    benchFlowers.position.set(16.8, 0, 13.0);
    this.group.add(benchFlowers);
  }

  public spawnPlayHead() {
    if (this.playHead) return;
    this.playHead = new FetchToy(new THREE.Vector3(1.6, 1.2, -14.8));
    this.group.add(this.playHead.group);
  }

  public spawnTulip(pos: THREE.Vector3 = new THREE.Vector3(14.8, 0, 12.6)) {
    if (this.tulip) {
      this.group.remove(this.tulip.group);
    }
    this.tulip = new TulipProp(pos);
    this.group.add(this.tulip.group);
  }

  private buildGrandIsland() {
    const grassMat = new THREE.MeshToonMaterial({
      color: 0x184e38, // Lush night emerald grass
    });

    const rockMat = new THREE.MeshToonMaterial({
      color: 0x1e2738,
    });

    // Multi-tiered grand archipelago
    // Main lower garden plateau
    const mainGeo = new THREE.CylinderGeometry(26, 24, 4, 32);
    const mainIsland = new THREE.Mesh(mainGeo, grassMat);
    mainIsland.position.set(0, -2, 4);
    mainIsland.receiveShadow = true;
    this.group.add(mainIsland);

    // Conical underbelly
    const underGeo = new THREE.ConeGeometry(24, 32, 32);
    underGeo.rotateX(Math.PI);
    const underMesh = new THREE.Mesh(underGeo, rockMat);
    underMesh.position.set(0, -20, 4);
    underMesh.castShadow = true;
    this.group.add(underMesh);

    // Upper Shrine Dais (Elevated sacred terrace at back)
    const daisGeo = new THREE.CylinderGeometry(12, 13, 2, 24);
    const daisMat = new THREE.MeshToonMaterial({ color: 0x225540 });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.set(0, 0, -16);
    dais.receiveShadow = true;
    this.group.add(dais);

    // Stone steps leading up to dais
    const stepMat = new THREE.MeshToonMaterial({ color: 0x475569 });
    for (let s = 0; s < 4; s++) {
      const stepGeo = new THREE.BoxGeometry(7 - s * 0.4, 0.25, 1.2);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(0, s * 0.25, -5 - s * 1.0);
      step.receiveShadow = true;
      this.group.add(step);
    }

    // Sacred stone pillars around dais
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x3d4b64 });
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 5.5, 10);
    const pillarAngles = [0.2, 0.9, 1.8, 2.7, 3.6, 4.5, 5.4, 6.1];

    pillarAngles.forEach(ang => {
      const px = Math.cos(ang) * 9.5;
      const pz = -16 + Math.sin(ang) * 9.5;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 3.5, pz);
      pillar.castShadow = true;
      this.group.add(pillar);

      // Top glowing runic cap
      const capGeo = new THREE.ConeGeometry(0.8, 1.2, 8);
      const capMat = new THREE.MeshBasicMaterial({ color: 0x686de0 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(px, 6.6, pz);
      this.group.add(cap);
    });
  }

  private buildMysteriousEgg() {
    this.eggMesh = new THREE.Group();
    this.eggMesh.position.copy(this.eggPosition);
    this.group.add(this.eggMesh);

    // Pearlescent glowing egg
    const eggGeo = new THREE.SphereGeometry(1.6, 24, 24);
    eggGeo.scale(1.0, 1.45, 1.0); // Iconic egg proportions

    const eggMat = new THREE.MeshStandardMaterial({
      color: 0xecf0f1,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x546de5,
      emissiveIntensity: 0.45,
    });

    const mainEgg = new THREE.Mesh(eggGeo, eggMat);
    mainEgg.castShadow = true;
    mainEgg.receiveShadow = true;
    this.eggMesh.add(mainEgg);

    // Golden decorative bands around the egg
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      roughness: 0.3,
      metalness: 0.8,
    });
    const bandGeo = new THREE.TorusGeometry(1.62, 0.08, 12, 32);
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, goldMat);
    band.position.y = 0.1;
    this.eggMesh.add(band);

    const band2 = new THREE.Mesh(bandGeo, goldMat);
    band2.position.y = 0.65;
    band2.scale.setScalar(0.85);
    this.eggMesh.add(band2);

    // Glowing aura light
    this.eggAuraLight = new THREE.PointLight(0x70a1ff, 3.0, 12);
    this.eggAuraLight.position.set(0, 0.5, 0);
    this.eggMesh.add(this.eggAuraLight);

    // Crack Stages (glowing fractures that appear upon hit 1 and hit 2)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
    const glowCrackMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });

    const createCrackSegment = (start: THREE.Vector3, end: THREE.Vector3, thickness = 0.025, glow = false) => {
      const dir = end.clone().sub(start);
      const len = dir.length();
      const geom = new THREE.CylinderGeometry(thickness, thickness, len, 6);
      geom.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geom, glow ? glowCrackMat : crackMat);
      mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
      mesh.lookAt(end);
      return mesh;
    };

    // Stage 1: Initial crack fracture on front
    this.eggCrackStage1 = new THREE.Group();
    this.eggCrackStage1.visible = false;
    this.eggCrackStage1.add(createCrackSegment(new THREE.Vector3(0, 0.5, 1.61), new THREE.Vector3(0.16, 0.22, 1.62), 0.03, true));
    this.eggCrackStage1.add(createCrackSegment(new THREE.Vector3(0.16, 0.22, 1.62), new THREE.Vector3(-0.12, -0.05, 1.62), 0.028));
    this.eggCrackStage1.add(createCrackSegment(new THREE.Vector3(-0.12, -0.05, 1.62), new THREE.Vector3(0.06, -0.32, 1.61), 0.025));
    this.eggMesh.add(this.eggCrackStage1);

    // Stage 2: Deeper, wider branching cracks spreading around the egg
    this.eggCrackStage2 = new THREE.Group();
    this.eggCrackStage2.visible = false;
    this.eggCrackStage2.add(createCrackSegment(new THREE.Vector3(0.16, 0.22, 1.62), new THREE.Vector3(0.48, 0.38, 1.56), 0.03, true));
    this.eggCrackStage2.add(createCrackSegment(new THREE.Vector3(0.48, 0.38, 1.56), new THREE.Vector3(0.72, 0.24, 1.48), 0.025));
    this.eggCrackStage2.add(createCrackSegment(new THREE.Vector3(-0.12, -0.05, 1.62), new THREE.Vector3(-0.45, 0.08, 1.56), 0.03, true));
    this.eggCrackStage2.add(createCrackSegment(new THREE.Vector3(-0.45, 0.08, 1.56), new THREE.Vector3(-0.68, -0.16, 1.48), 0.025));
    this.eggCrackStage2.add(createCrackSegment(new THREE.Vector3(0, 0.5, 1.61), new THREE.Vector3(-0.25, 0.82, 1.45), 0.028, true));
    this.eggMesh.add(this.eggCrackStage2);
  }

  private buildBirthdayCake() {
    this.cakeGroup = new THREE.Group();
    this.cakeGroup.position.set(0, 1.0, -16);
    this.cakeGroup.visible = false; // Appears when egg breaks!
    this.group.add(this.cakeGroup);

    // Cream & frosting materials
    const spongeMat = new THREE.MeshToonMaterial({ color: 0xffeaa7 });
    const pinkCreamMat = new THREE.MeshToonMaterial({ color: 0xff9ff3 });
    const whiteFrostingMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const strawberryMat = new THREE.MeshToonMaterial({ color: 0xee5253 });

    // Tier 1 (Bottom Tier)
    const t1Geo = new THREE.CylinderGeometry(2.4, 2.5, 1.0, 24);
    const tier1 = new THREE.Mesh(t1Geo, spongeMat);
    tier1.position.y = 0.5;
    tier1.castShadow = true;
    this.cakeGroup.add(tier1);

    const r1Geo = new THREE.TorusGeometry(2.45, 0.15, 8, 24);
    r1Geo.rotateX(Math.PI / 2);
    const rim1 = new THREE.Mesh(r1Geo, pinkCreamMat);
    rim1.position.y = 1.0;
    this.cakeGroup.add(rim1);

    // Tier 2 (Middle Tier)
    const t2Geo = new THREE.CylinderGeometry(1.7, 1.8, 0.9, 20);
    const tier2 = new THREE.Mesh(t2Geo, whiteFrostingMat);
    tier2.position.y = 1.45;
    tier2.castShadow = true;
    this.cakeGroup.add(tier2);

    const r2Geo = new THREE.TorusGeometry(1.75, 0.12, 8, 20);
    r2Geo.rotateX(Math.PI / 2);
    const rim2 = new THREE.Mesh(r2Geo, pinkCreamMat);
    rim2.position.y = 1.9;
    this.cakeGroup.add(rim2);

    // Tier 3 (Top Tier)
    const t3Geo = new THREE.CylinderGeometry(1.0, 1.1, 0.7, 18);
    const tier3 = new THREE.Mesh(t3Geo, spongeMat);
    tier3.position.y = 2.25;
    tier3.castShadow = true;
    this.cakeGroup.add(tier3);

    // Strawberries on top
    for (let sb = 0; sb < 6; sb++) {
      const ang = (sb / 6) * Math.PI * 2;
      const sx = Math.cos(ang) * 0.7;
      const sz = Math.sin(ang) * 0.7;
      const strawbGeo = new THREE.ConeGeometry(0.12, 0.22, 8);
      const strawb = new THREE.Mesh(strawbGeo, strawberryMat);
      strawb.position.set(sx, 2.65, sz);
      this.cakeGroup.add(strawb);
    }

    // 3 Birthday Candles
    const candleCoords = [
      { x: 0, z: 0 },
      { x: -0.32, z: 0.15 },
      { x: 0.32, z: 0.15 },
    ];

    const candleMat = new THREE.MeshToonMaterial({ color: 0x74b9ff });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

    candleCoords.forEach((coord) => {
      // Candle stick
      const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10);
      const stick = new THREE.Mesh(stickGeo, candleMat);
      stick.position.set(coord.x, 2.85, coord.z);
      this.cakeGroup.add(stick);

      // Flickering Flame
      const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
      flameGeo.scale(1.0, 1.8, 1.0);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(coord.x, 3.2, coord.z);
      this.cakeGroup.add(flame);
      this.candleFlames.push(flame);

      // Warm candle light
      const cLight = new THREE.PointLight(0xffaa00, 1.2, 5);
      cLight.position.set(coord.x, 3.25, coord.z);
      this.cakeGroup.add(cLight);
      this.candleLights.push(cLight);
    });
  }

  private buildBalloonsAndDecorations() {
    // Colorful pastel birthday balloons
    const balloonColors = [0xff7675, 0x74b9ff, 0x55efc4, 0xfdcb6e, 0xa29bfe, 0xff9ff3];
    const balloonPositions = [
      { x: -4, z: -13, c: 0 },
      { x: 4, z: -13, c: 1 },
      { x: -6, z: -19, c: 2 },
      { x: 6, z: -19, c: 3 },
      { x: -2, z: -21, c: 4 },
      { x: 2, z: -21, c: 5 },
    ];

    balloonPositions.forEach(bp => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bp.x, 0.5, bp.z);
      bGroup.visible = false;

      const bMat = new THREE.MeshStandardMaterial({
        color: balloonColors[bp.c],
        roughness: 0.2,
        metalness: 0.1,
      });

      // Balloon body (egg shape)
      const bGeo = new THREE.SphereGeometry(0.65, 16, 16);
      bGeo.scale(1.0, 1.25, 1.0);
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.y = 3.5;
      bGroup.add(bMesh);

      // String
      const stringMat = new THREE.LineBasicMaterial({ color: 0xecf0f1 });
      const stringPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3.2, 0)];
      const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPoints);
      const stringLine = new THREE.Line(stringGeo, stringMat);
      bGroup.add(stringLine);

      this.group.add(bGroup);
      this.balloons.push(bGroup);
    });

    // Fairy light garlands between pillars
    for (let f = 0; f < 8; f++) {
      const garland = new THREE.Group();
      garland.visible = false;
      const pColor = balloonColors[f % balloonColors.length];
      const pLight = new THREE.PointLight(pColor, 1.5, 7);
      pLight.position.set((Math.random() - 0.5) * 14, 4 + Math.random() * 2, -16 + (Math.random() - 0.5) * 10);
      garland.add(pLight);

      const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: pColor });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.copy(pLight.position);
      garland.add(bulb);

      this.group.add(garland);
      this.fairyLights.push(garland);
    }
  }

  private buildFireworksSystem() {
    this.fireworksGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxFireworksParticles * 3);
    const colors = new Float32Array(this.maxFireworksParticles * 3);

    this.fireworksGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireworksGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.fireworksPoints = new THREE.Points(this.fireworksGeo, particleMat);
    this.group.add(this.fireworksPoints);
  }

  private buildScenery() {
    // Magnificent glowing trees
    const treeCoords = [
      { x: -16, z: 12, h: 5.5, c: 0x2ed573 },
      { x: 17, z: 14, h: 5.8, c: 0x1e90ff },
      { x: -19, z: -2, h: 6.2, c: 0xff4757 },
      { x: 19, z: -4, h: 6.0, c: 0xffa502 },
      { x: -14, z: -18, h: 5.2, c: 0x9b59b6 },
      { x: 15, z: -18, h: 5.4, c: 0x2ed573 },
    ];

    treeCoords.forEach(t => {
      const tree = IslandProps.createStylizedTree(t.c, t.h);
      tree.position.set(t.x, 0, t.z);
      this.group.add(tree);
    });

    // Lantern posts guiding the path
    const lanternCoords = [
      { x: -4, z: 20 },
      { x: 4, z: 20 },
      { x: -5, z: 8 },
      { x: 5, z: 8 },
      { x: -5, z: -4 },
      { x: 5, z: -4 },
    ];

    lanternCoords.forEach(lp => {
      const lantern = IslandProps.createLanternPost(0xffd32a);
      lantern.position.set(lp.x, 0, lp.z);
      this.group.add(lantern);
    });
  }

  public checkEggHit(throwable: FetchToy | null): EggHitResult {
    if (!throwable || this.isEggBroken) {
      return { hit: false, hitCount: this.eggHitCount, broken: this.isEggBroken };
    }

    // Must be in active THROWN or ROLLING state from a throw (not CARRIED or IDLE)
    if (throwable.state !== PsyduckState.THROWN && throwable.state !== PsyduckState.ROLLING) {
      return { hit: false, hitCount: this.eggHitCount, broken: false };
    }

    const now = performance.now();
    // Cooldown between hits (1.1s) so a single throw produces exactly one registered hit
    if (now - this.lastEggHitTime < 1100) {
      return { hit: false, hitCount: this.eggHitCount, broken: false };
    }

    // Must have movement velocity
    const speed = throwable.velocity.length();
    if (speed < 1.4) {
      return { hit: false, hitCount: this.eggHitCount, broken: false };
    }

    // Physical bounds collision with egg volume
    const dx = throwable.position.x - this.eggPosition.x;
    const dz = throwable.position.z - this.eggPosition.z;
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    const vertDist = Math.abs(throwable.position.y - this.eggPosition.y);

    if (horizDist <= 2.5 && vertDist <= 2.5) {
      this.lastEggHitTime = now;
      this.eggHitCount++;

      // Energetically bounce the pink ball away from the egg
      const bounceDir = new THREE.Vector3(dx || 0.1, 0.4, dz || 1.0).normalize();
      throwable.velocity.copy(bounceDir.multiplyScalar(6.5));
      throwable.state = PsyduckState.ROLLING;

      if (this.eggHitCount === 1) {
        sound.playEggCrack();
        if (this.eggCrackStage1) this.eggCrackStage1.visible = true;
        this.eggShakeTimer = 0.4;
        this.eggShakeIntensity = 0.14;
        return { hit: true, hitCount: 1, broken: false };
      } else if (this.eggHitCount === 2) {
        sound.playEggCrack();
        if (this.eggCrackStage1) this.eggCrackStage1.visible = true;
        if (this.eggCrackStage2) this.eggCrackStage2.visible = true;
        this.eggShakeTimer = 0.55;
        this.eggShakeIntensity = 0.26;
        return { hit: true, hitCount: 2, broken: false };
      } else {
        // Hit 3: Break completely
        this.triggerBirthdayReveal();
        return { hit: true, hitCount: 3, broken: true };
      }
    }
    return { hit: false, hitCount: this.eggHitCount, broken: false };
  }

  public triggerBirthdayReveal() {
    if (this.isEggBroken) return;
    this.isEggBroken = true;
    this.isBirthdayRevealed = true;

    sound.playEggCrack();
    sound.transitionToBirthdayCelebration();

    // Shatter egg into pieces
    this.eggMesh.visible = false;
    this.createShatteredEggShards();

    // Reveal cake
    this.cakeGroup.visible = true;
    this.cakeGroup.scale.set(0.01, 0.01, 0.01);

    // Reveal balloons and fairy lights
    this.balloons.forEach(b => { b.visible = true; });
    this.fairyLights.forEach(f => { f.visible = true; });

    // Celebration confetti blast
    confetti({
      particleCount: 150,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#ff9ff3', '#feca57', '#54a0ff', '#5f27cd', '#48dbfb'],
    });

    // Launch initial fireworks volley
    for (let f = 0; f < 4; f++) {
      this.launchFireworkRocket();
    }
  }

  private createShatteredEggShards() {
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xecf0f1,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x70a1ff,
      emissiveIntensity: 0.5,
    });

    for (let i = 0; i < 14; i++) {
      const shardGeo = new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.4, 0);
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.copy(this.eggPosition);
      this.group.add(shard);
      this.eggPieces.push(shard);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        4 + Math.random() * 6,
        (Math.random() - 0.5) * 8
      );
      this.eggPieceVelocities.push(vel);
    }
  }

  public blowOutCandles() {
    if (this.candlesBlown) return;
    this.candlesBlown = true;

    sound.playCandleBlow();

    // Extinguish flames and lights
    this.candleFlames.forEach(f => { f.visible = false; });
    this.candleLights.forEach(l => { l.intensity = 0; });

    // Celebration burst
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ffd32a', '#ff3838', '#c56cf0', '#17c0eb'],
    });
  }

  public launchFireworkRocket() {
    const colors = [
      new THREE.Color(0xff4757),
      new THREE.Color(0x2ed573),
      new THREE.Color(0x1e90ff),
      new THREE.Color(0xffa502),
      new THREE.Color(0x9b59b6),
      new THREE.Color(0xff6b81),
    ];
    const burstColor = colors[Math.floor(Math.random() * colors.length)];

    const burstOrigin = new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      25 + Math.random() * 20,
      -10 + (Math.random() - 0.5) * 50
    );

    const particlesInBurst = 40;
    for (let p = 0; p < particlesInBurst; p++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 4 + Math.random() * 9;

      const vel = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.cos(phi),
        speed * Math.sin(phi) * Math.sin(theta)
      );

      this.fireworks.push({
        pos: burstOrigin.clone(),
        vel,
        color: burstColor,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
      });
    }
  }

  public update(delta: number, playerPos?: THREE.Vector3, isMoving?: boolean, isGrounded?: boolean) {
    // 0. Update Level 3 exclusive flower walking trail
    if (playerPos) {
      this.flowerTrail.update(
        delta,
        playerPos,
        isMoving ?? false,
        isGrounded ?? false,
        (x, z) => this.getGroundHeight(x, z)
      );

      // Update Psyduck companion (body reunion, following, or catch play)
      this.companion.update(
        delta,
        playerPos,
        isMoving ?? false,
        (x, z) => this.getGroundHeight(x, z)
      );
    }

    // Update play-head physics if active
    if (this.playHead) {
      this.playHead.updatePhysics(delta, (x, z) => this.getGroundHeight(x, z));
    }

    // Update gift tulip if spawned
    if (this.tulip) {
      this.tulip.updatePhysics(delta, (x, z) => this.getGroundHeight(x, z));
    }

    // Update scenic bench music box
    this.musicBox.update(delta);

    // Pulse mysterious egg aura before being broken
    if (!this.isEggBroken) {
      const time = Date.now() * 0.003;
      this.eggAuraLight.intensity = 2.5 + Math.sin(time) * 1.5;
      let shakeOffsetX = 0;
      let shakeOffsetZ = 0;
      if (this.eggShakeTimer > 0) {
        this.eggShakeTimer -= delta;
        const progress = Math.max(0, this.eggShakeTimer / 0.55);
        shakeOffsetX = Math.sin(this.eggShakeTimer * 45) * this.eggShakeIntensity * progress;
        shakeOffsetZ = Math.cos(this.eggShakeTimer * 40) * (this.eggShakeIntensity * 0.6) * progress;
      }
      this.eggMesh.position.x = this.eggPosition.x + shakeOffsetX;
      this.eggMesh.position.z = this.eggPosition.z + shakeOffsetZ;
      this.eggMesh.position.y = this.eggPosition.y + Math.sin(time * 0.7) * 0.08;
    } else {
      // Animate shattering egg shards
      for (let i = 0; i < this.eggPieces.length; i++) {
        const piece = this.eggPieces[i];
        const vel = this.eggPieceVelocities[i];
        vel.y -= 14.0 * delta;
        piece.position.addScaledVector(vel, delta);
        piece.rotation.x += delta * 6;
        piece.rotation.y += delta * 4;

        if (piece.position.y < 0.2) {
          piece.position.y = 0.2;
          vel.set(0, 0, 0);
        }
      }

      // Smooth cake scale-in reveal
      if (this.cakeGroup.scale.x < 1.0) {
        const nextScale = Math.min(1.0, this.cakeGroup.scale.x + delta * 1.8);
        this.cakeGroup.scale.set(nextScale, nextScale, nextScale);
      }

      // Gentle floating balloon sway
      const time = Date.now() * 0.002;
      this.balloons.forEach((b, idx) => {
        b.position.y = 0.5 + Math.sin(time + idx) * 0.25;
        b.rotation.z = Math.sin(time * 0.8 + idx) * 0.08;
      });

      // Flickering candle flames
      if (!this.candlesBlown) {
        this.candleFlames.forEach((flame, idx) => {
          flame.scale.y = 1.6 + Math.sin(Date.now() * 0.02 + idx) * 0.35;
        });
      }

      // Continuous fireworks sequence
      this.fireworkLaunchTimer += delta;
      if (this.fireworkLaunchTimer > 1.4) {
        this.fireworkLaunchTimer = 0;
        this.launchFireworkRocket();
      }
    }

    // Update fireworks particle simulation
    const posAttr = this.fireworksGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = this.fireworksGeo.attributes.color as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const p = this.fireworks[i];
      p.life += delta;
      p.vel.y -= 4.0 * delta; // slight gravity
      p.pos.addScaledVector(p.vel, delta);

      if (p.life >= p.maxLife) {
        this.fireworks.splice(i, 1);
      }
    }

    // Render active particles to buffer
    const activeCount = Math.min(this.fireworks.length, this.maxFireworksParticles);
    for (let i = 0; i < this.maxFireworksParticles; i++) {
      if (i < activeCount) {
        const p = this.fireworks[i];
        posArray[i * 3] = p.pos.x;
        posArray[i * 3 + 1] = p.pos.y;
        posArray[i * 3 + 2] = p.pos.z;

        const fade = Math.max(0, 1 - p.life / p.maxLife);
        colArray[i * 3] = p.color.r * fade;
        colArray[i * 3 + 1] = p.color.g * fade;
        colArray[i * 3 + 2] = p.color.b * fade;
      } else {
        posArray[i * 3 + 1] = -999;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public isNearCake(playerPos: THREE.Vector3): boolean {
    if (!this.isBirthdayRevealed) return false;
    const cakePos = new THREE.Vector2(0, -16);
    const pPos = new THREE.Vector2(playerPos.x, playerPos.z);
    return pPos.distanceTo(cakePos) < 4.2;
  }

  public isNearBench(playerPos: THREE.Vector3): boolean {
    const p = new THREE.Vector2(playerPos.x, playerPos.z);
    const b = new THREE.Vector2(this.benchPosition.x, this.benchPosition.z);
    return p.distanceTo(b) < 2.5;
  }

  public getBenchSeatPosition(): THREE.Vector3 {
    // Aafraa's seat on left half of bench
    const localOffset = new THREE.Vector3(-0.35, 0.45, 0.05);
    localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.benchYaw);
    return this.benchPosition.clone().add(localOffset);
  }

  public getBenchCompanionPosition(): THREE.Vector3 {
    // Psyduck's seat on right half of bench
    const localOffset = new THREE.Vector3(0.35, 0.45, 0.05);
    localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.benchYaw);
    return this.benchPosition.clone().add(localOffset);
  }

  public getBenchFacingYaw(): number {
    return this.benchYaw;
  }

  public isNearMusicBox(playerPos: THREE.Vector3): boolean {
    const p = new THREE.Vector2(playerPos.x, playerPos.z);
    const m = new THREE.Vector2(this.musicBoxPosition.x, this.musicBoxPosition.z);
    return p.distanceTo(m) < 2.8;
  }

  public isNearBenchArea(playerPos: THREE.Vector3): boolean {
    return this.isNearBench(playerPos) || this.isNearMusicBox(playerPos);
  }

  public setMusicBoxActive(active: boolean) {
    this.musicBox.setActive(active);
  }

  public reset() {
    this.setMusicBoxActive(false);

    // Clear egg debris
    this.eggPieces.forEach(p => {
      this.group.remove(p);
    });
    this.eggPieces = [];
    this.eggPieceVelocities = [];

    // Restore egg
    this.eggMesh.visible = true;
    this.eggMesh.position.copy(this.eggPosition);
    this.eggAuraLight.intensity = 3.0;
    this.isEggBroken = false;
    this.eggHitCount = 0;
    this.lastEggHitTime = 0;
    this.eggShakeTimer = 0;
    if (this.eggCrackStage1) this.eggCrackStage1.visible = false;
    if (this.eggCrackStage2) this.eggCrackStage2.visible = false;

    // Reset birthday reveal elements
    this.isBirthdayRevealed = false;
    this.cakeGroup.visible = false;
    this.cakeGroup.scale.set(0.01, 0.01, 0.01);
    this.candlesBlown = false;
    this.candleFlames.forEach(f => { f.visible = true; });
    this.candleLights.forEach(l => { l.intensity = 1.2; });
    this.balloons.forEach(b => { b.visible = false; });
    this.fireworks = [];

    // Clear fireworks buffer
    const posAttr = this.fireworksGeo.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < this.maxFireworksParticles; i++) {
      posArray[i * 3 + 1] = -999;
    }
    posAttr.needsUpdate = true;

    // Reset flower trail
    this.flowerTrail.reset();

    // Reset companion
    this.companion.reset(new THREE.Vector3(3.2, 1.0, -15.5));

    // Remove play head if active
    if (this.playHead) {
      this.group.remove(this.playHead.group);
      this.playHead = null;
    }

    // Remove gift tulip if active
    if (this.tulip) {
      this.group.remove(this.tulip.group);
      this.tulip = null;
    }
  }

  public getGroundHeight(x: number, z: number): { groundY: number; isValid: boolean } {
    // Upper shrine dais
    const daisDist = Math.sqrt(x * x + (z + 16) * (z + 16));
    if (daisDist <= 12.0) {
      return { groundY: 1.0, isValid: true };
    }

    // Steps to dais
    if (Math.abs(x) <= 3.8 && z >= -9 && z <= -4) {
      const stepIdx = Math.floor((-z - 4) / 1.25);
      return { groundY: Math.min(1.0, 0.25 + stepIdx * 0.25), isValid: true };
    }

    // Main garden plateau
    const mainDist = Math.sqrt(x * x + (z - 4) * (z - 4));
    if (mainDist <= 25.5) {
      return { groundY: 0, isValid: true };
    }

    return { groundY: -50, isValid: false };
  }
}
