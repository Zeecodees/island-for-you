import * as THREE from 'three';

export interface FlowerInstance {
  group: THREE.Group;
  headGroup: THREE.Group;
  stemMesh: THREE.Mesh;
  targetScale: number;
  maxStemHeight: number;
  bloomDuration: number;
  elapsed: number;
  isDone: boolean;
}

interface BloomParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

/**
 * FlowerTrailSystem
 * ONLY active in Level 3.
 *
 * Aafraa loves TULIPS!
 * As Aafraa walks across Level 3, lush, diverse tulips (classic cups, slender buds,
 * open flares, pointed lily-flowered, and ruffled double tulips) naturally sprout
 * and bloom in her wake, appearing in scattered singles, charming clusters, and
 * occasional grand tulip patches, accompanied naturally by companion wildflowers.
 */
export class FlowerTrailSystem {
  public group: THREE.Group;

  // Active blooming flowers being animated
  private activeFlowers: FlowerInstance[] = [];
  // All spawned flower positions for spatial spacing
  private flowerPositions: THREE.Vector3[] = [];

  // Spatial grid of visited 2.2m terrain cells to prevent duplicate spawning when walking back and forth
  private visitedCells = new Set<string>();
  private readonly CELL_SIZE = 2.2;
  private readonly MAX_TOTAL_FLOWERS = 140;

  // Trailing tracker
  private lastSpawnPos = new THREE.Vector3();
  private hasInitializedPos = false;

  // Reusable / Shared Geometries for high performance
  private stemGeo: THREE.CylinderGeometry;
  private tulipLeafGeo: THREE.BufferGeometry;
  private wildflowerLeafGeo: THREE.BufferGeometry;

  // Tulip Petal Geometries (varied shapes & stages)
  private tulipCupPetalGeo: THREE.BufferGeometry;
  private tulipBudPetalGeo: THREE.BufferGeometry;
  private tulipFlaredPetalGeo: THREE.BufferGeometry;
  private tulipLilyPetalGeo: THREE.BufferGeometry;
  private tulipRufflePetalGeo: THREE.BufferGeometry;

  // Companion Flower Geometries
  private daisyPetalGeo: THREE.BufferGeometry;
  private starPetalGeo: THREE.BufferGeometry;
  private rosePetalGeo: THREE.BufferGeometry;
  private bellPetalGeo: THREE.BufferGeometry;
  private centerSphereGeo: THREE.SphereGeometry;
  private budGeo: THREE.SphereGeometry;

  // Shared Materials
  private stemMat: THREE.MeshToonMaterial;
  private tulipLeafMat: THREE.MeshToonMaterial;
  private wildflowerLeafMat: THREE.MeshToonMaterial;
  private centerYellowMat: THREE.MeshBasicMaterial;
  private centerGoldMat: THREE.MeshBasicMaterial;
  private centerDarkMat: THREE.MeshBasicMaterial;
  private centerWhiteMat: THREE.MeshBasicMaterial;

  // Curated Tulip Palette (Aafraa's favorites!)
  private tulipMats: THREE.MeshToonMaterial[] = [];
  // Curated Companion Wildflower Palette
  private wildflowerMats: THREE.MeshToonMaterial[] = [];

  // Subtle Bloom Sparkles Particle System
  private maxParticles = 200;
  private particles: BloomParticle[] = [];
  private particleGeo: THREE.BufferGeometry;
  private particlePoints: THREE.Points;
  private particlePosAttr: THREE.BufferAttribute;
  private particleColAttr: THREE.BufferAttribute;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "FlowerTrailSystem";

    // 1. Initialize Shared Geometries
    this.stemGeo = new THREE.CylinderGeometry(0.018, 0.026, 1.0, 6);
    this.stemGeo.translate(0, 0.5, 0); // Base at origin for simple vertical scaling

    // Broad upright lanceolate tulip leaf (hugs stem, iconic tulip silhouette)
    const tLeaf = new THREE.CylinderGeometry(0.015, 0.07, 0.55, 6, 3);
    tLeaf.scale(0.3, 1.0, 1.3);
    tLeaf.translate(0, 0.25, 0.04);
    this.tulipLeafGeo = tLeaf;

    // Small rounded wildflower leaflet
    const wLeaf = new THREE.SphereGeometry(0.09, 6, 6);
    wLeaf.scale(0.45, 0.15, 1.2);
    this.wildflowerLeafGeo = wLeaf;

    // --- Tulip Petal Variations ---
    // Classic Cup Petal (Smooth chalice curve)
    const cupPetal = new THREE.SphereGeometry(0.16, 8, 8);
    cupPetal.scale(0.55, 1.15, 0.65);
    cupPetal.translate(0, 0.14, 0.07);
    this.tulipCupPetalGeo = cupPetal;

    // Slender Bud Petal (Tapered teardrop)
    const budPetal = new THREE.SphereGeometry(0.13, 7, 7);
    budPetal.scale(0.45, 1.3, 0.5);
    budPetal.translate(0, 0.15, 0.05);
    this.tulipBudPetalGeo = budPetal;

    // Flared / Open Tulip Petal (Wider arc with gentle recurve)
    const flaredPetal = new THREE.SphereGeometry(0.17, 8, 8);
    flaredPetal.scale(0.65, 1.05, 0.7);
    flaredPetal.translate(0, 0.13, 0.1);
    this.tulipFlaredPetalGeo = flaredPetal;

    // Lily-flowered Tulip Petal (Pointed elegant tip)
    const lilyPetal = new THREE.ConeGeometry(0.09, 0.35, 6);
    lilyPetal.rotateX(Math.PI / 2);
    lilyPetal.translate(0, 0.14, 0.12);
    this.tulipLilyPetalGeo = lilyPetal;

    // Ruffled / Double Petal (Wider wavy curve)
    const rufflePetal = new THREE.SphereGeometry(0.15, 8, 8);
    rufflePetal.scale(0.75, 0.95, 0.65);
    rufflePetal.translate(0, 0.11, 0.08);
    this.tulipRufflePetalGeo = rufflePetal;

    // --- Companion Flower Geometries ---
    const daisyPetal = new THREE.SphereGeometry(0.12, 6, 6);
    daisyPetal.scale(0.35, 0.1, 1.0);
    daisyPetal.translate(0, 0, 0.12);
    this.daisyPetalGeo = daisyPetal;

    const starPetal = new THREE.ConeGeometry(0.08, 0.28, 5);
    starPetal.rotateX(Math.PI / 2);
    starPetal.translate(0, 0, 0.14);
    this.starPetalGeo = starPetal;

    const rosePetal = new THREE.SphereGeometry(0.14, 7, 7);
    rosePetal.scale(0.8, 0.45, 0.9);
    rosePetal.translate(0, 0.02, 0.1);
    this.rosePetalGeo = rosePetal;

    const bellPetal = new THREE.ConeGeometry(0.07, 0.16, 6, 1, true);
    bellPetal.rotateX(-Math.PI / 1.4);
    this.bellPetalGeo = bellPetal;

    this.centerSphereGeo = new THREE.SphereGeometry(0.065, 8, 8);
    this.centerSphereGeo.scale(1.0, 0.7, 1.0);

    this.budGeo = new THREE.SphereGeometry(0.055, 6, 6);

    // 2. Initialize Shared Materials
    this.stemMat = new THREE.MeshToonMaterial({ color: 0x27ae60 });
    this.tulipLeafMat = new THREE.MeshToonMaterial({ color: 0x2ecc71 });
    this.wildflowerLeafMat = new THREE.MeshToonMaterial({ color: 0x1abc9c });

    this.centerYellowMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
    this.centerGoldMat = new THREE.MeshBasicMaterial({ color: 0xffa502 });
    this.centerDarkMat = new THREE.MeshBasicMaterial({ color: 0x2f3542 }); // Classic dark tulip stamen
    this.centerWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Curated Tulip Colors: romantic, vibrant, dreamlike
    const tulipHexes = [
      0xff7675, // Romantic coral rose
      0xfd79a8, // Vibrant blush pink
      0xff9ff3, // Soft fairy blossom
      0xf8a5c2, // Delicate sakura pink
      0xe84118, // Royal Dutch crimson
      0xd63031, // Velvet ruby red
      0xe17055, // Sunset peach
      0xe67e22, // Dutch orange
      0xfeca57, // Golden sunshine yellow
      0xfed330, // Bright buttercup yellow
      0xffeaa7, // Warm ivory buttercream
      0xa29bfe, // Dreamy twilight lavender
      0x6c5ce7, // "Queen of Night" deep purple
      0xffffff, // Starlight pure white
    ];
    this.tulipMats = tulipHexes.map(hex => new THREE.MeshToonMaterial({ color: hex }));

    // Curated Companion Wildflower Colors
    const wildflowerHexes = [
      0x74b9ff, // Celestial periwinkle
      0x48dbfb, // Starlight cyan
      0x55efc4, // Mint seafoam
      0x54a0ff, // Forget-me-not blue
      0xffd32a, // Meadow buttercup
      0x9b59b6, // Wild violet
    ];
    this.wildflowerMats = wildflowerHexes.map(hex => new THREE.MeshToonMaterial({ color: hex }));

    // 3. Subtle Bloom Sparkles System
    this.particleGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.maxParticles * 3);
    const colArr = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      posArr[i * 3 + 1] = -999;
    }

    this.particlePosAttr = new THREE.BufferAttribute(posArr, 3);
    this.particleColAttr = new THREE.BufferAttribute(colArr, 3);
    this.particleGeo.setAttribute('position', this.particlePosAttr);
    this.particleGeo.setAttribute('color', this.particleColAttr);

    const particleMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(this.particleGeo, particleMat);
    this.group.add(this.particlePoints);
  }

  /**
   * Called every frame in Level 3.
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isMoving: boolean,
    isGrounded: boolean,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {
    // 1. Process player movement & spawn flowers along path in unvisited areas only
    if (isGrounded) {
      if (!this.hasInitializedPos) {
        this.lastSpawnPos.copy(playerPos);
        this.hasInitializedPos = true;
        // Mark starting position cell
        const startCellKey = `${Math.floor(playerPos.x / this.CELL_SIZE)},${Math.floor(playerPos.z / this.CELL_SIZE)}`;
        this.visitedCells.add(startCellKey);
      } else if (isMoving) {
        const cellX = Math.floor(playerPos.x / this.CELL_SIZE);
        const cellZ = Math.floor(playerPos.z / this.CELL_SIZE);
        const cellKey = `${cellX},${cellZ}`;

        // Only spawn when entering a NEW, unvisited area to avoid lag and duplicates
        if (!this.visitedCells.has(cellKey) && this.flowerPositions.length < this.MAX_TOTAL_FLOWERS) {
          this.visitedCells.add(cellKey);

          const dist = Math.hypot(
            playerPos.x - this.lastSpawnPos.x,
            playerPos.z - this.lastSpawnPos.z
          );
          const dirX = dist > 0.05 ? (playerPos.x - this.lastSpawnPos.x) / dist : 0;
          const dirZ = dist > 0.05 ? (playerPos.z - this.lastSpawnPos.z) / dist : -1;

          // Spawn approximately 2 to 3 flowers only
          this.spawnGentleBatch(playerPos, dirX, dirZ, getGroundHeight);

          this.lastSpawnPos.copy(playerPos);
        }
      }
    }

    // 2. Animate actively blooming flowers
    for (let i = this.activeFlowers.length - 1; i >= 0; i--) {
      const fl = this.activeFlowers[i];
      fl.elapsed += delta;
      const progress = Math.min(1.0, fl.elapsed / fl.bloomDuration);

      // Smooth elastic growth: stem rises up, then tulip cup blooms open
      const stemProgress = Math.min(1.0, progress * 1.25);
      const stemEase = 1 - Math.pow(1 - stemProgress, 3);
      fl.stemMesh.scale.y = Math.max(0.01, fl.maxStemHeight * stemEase);

      // Blossom unfurls and reaches full scale
      const headProgress = Math.max(0, (progress - 0.18) / 0.82);
      const headEase = Math.sin(headProgress * Math.PI * 0.5) * (1 + 0.12 * Math.sin(headProgress * Math.PI));
      const currentScale = fl.targetScale * Math.max(0.001, headEase);
      fl.headGroup.scale.set(currentScale, currentScale, currentScale);
      fl.headGroup.position.y = fl.maxStemHeight * stemEase;

      // Subtle opening sway
      fl.headGroup.rotation.y += delta * 0.4;

      if (progress >= 1.0) {
        // Freeze at final transform
        fl.stemMesh.scale.y = fl.maxStemHeight;
        fl.headGroup.scale.set(fl.targetScale, fl.targetScale, fl.targetScale);
        fl.headGroup.position.y = fl.maxStemHeight;
        fl.isDone = true;
        this.activeFlowers.splice(i, 1);
      }
    }

    // 3. Update bloom particles
    this.updateParticles(delta);
  }

  /**
   * Spawns approximately 2-3 flowers only in newly entered terrain.
   * Tulips are the primary flower (~80%), with occasional companion wildflowers (~20%).
   */
  private spawnGentleBatch(
    playerPos: THREE.Vector3,
    dirX: number,
    dirZ: number,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {
    // Exactly 2-3 flowers
    const count = Math.random() < 0.65 ? 2 : 3;
    const latX = -dirZ;
    const latZ = dirX;

    // Harmonious color for this gentle batch
    const batchColor = this.tulipMats[Math.floor(Math.random() * this.tulipMats.length)];

    for (let i = 0; i < count; i++) {
      // Offset behind and slightly to the sides of Aafraa's path
      const lateralDist = (Math.random() - 0.5) * 1.8;
      const trailDist = -(0.7 + Math.random() * 0.8);

      const fx = playerPos.x + latX * lateralDist + dirX * trailDist;
      const fz = playerPos.z + latZ * lateralDist + dirZ * trailDist;

      // 80% chance tulip, 20% companion wildflower
      const isTulip = Math.random() < 0.8;
      const scaleMult = 0.85 + Math.random() * 0.35;

      this.trySpawnOneFlower(fx, fz, isTulip, scaleMult, getGroundHeight, isTulip ? batchColor : undefined);
    }
  }

  /**
   * Spawns a single flower at (fx, fz) if valid and not too close to existing flowers.
   */
  private trySpawnOneFlower(
    fx: number,
    fz: number,
    isTulip: boolean,
    scaleMult: number,
    getGroundHeight: (x: number, z: number) => { groundY: number; isValid: boolean },
    forcedColor?: THREE.MeshToonMaterial
  ) {
    const groundInfo = getGroundHeight(fx, fz);
    if (!groundInfo.isValid) return;

    // Altar exclusion
    const distToEgg = Math.hypot(fx - 0, fz - (-16));
    if (distToEgg < 2.2) return;

    // Spatial spacing check
    for (let i = this.flowerPositions.length - 1; i >= Math.max(0, this.flowerPositions.length - 60); i--) {
      const p = this.flowerPositions[i];
      if (Math.hypot(p.x - fx, p.z - fz) < 0.28) {
        return;
      }
    }

    const pos = new THREE.Vector3(fx, groundInfo.groundY, fz);
    this.flowerPositions.push(pos);

    if (isTulip) {
      this.createTulip(pos, scaleMult, forcedColor);
    } else {
      this.createCompanionWildflower(pos, scaleMult);
    }
  }

  // --- Tulip Builder ---

  private createTulip(pos: THREE.Vector3, scaleMult: number, forcedColor?: THREE.MeshToonMaterial) {
    const flowerGroup = new THREE.Group();
    flowerGroup.position.copy(pos);

    flowerGroup.rotation.y = Math.random() * Math.PI * 2;
    flowerGroup.rotation.x = (Math.random() - 0.5) * 0.1;
    flowerGroup.rotation.z = (Math.random() - 0.5) * 0.1;

    // Base scale with natural variation
    const baseScale = (0.9 + Math.random() * 0.3) * scaleMult;
    // Tulips have lovely proud, tall stems
    const stemHeight = (0.35 + Math.random() * 0.22) * baseScale;

    // 1. Stem
    const stem = new THREE.Mesh(this.stemGeo, this.stemMat);
    stem.scale.set(baseScale, 0.01, baseScale);
    flowerGroup.add(stem);

    // 2. Iconic Tulip Leaves (broad, lanceolate, curving up the stem base)
    const leafCount = 2;
    for (let l = 0; l < leafCount; l++) {
      const leaf = new THREE.Mesh(this.tulipLeafGeo, this.tulipLeafMat);
      const angle = l * Math.PI + (Math.random() - 0.5) * 0.35;
      leaf.position.set(0, stemHeight * 0.15, 0);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.25 + l * 0.1;
      leaf.scale.set(baseScale, baseScale, baseScale);
      stem.add(leaf);
    }

    // 3. Flower Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 0;
    headGroup.scale.set(0.001, 0.001, 0.001);
    flowerGroup.add(headGroup);

    // Tulip Color
    const colorMat = forcedColor ?? this.tulipMats[Math.floor(Math.random() * this.tulipMats.length)];

    // 5 Distinct Tulip Varieties & Bloom Stages:
    // 0: Classic Cup Tulip (Single Late / Triumph)
    // 1: Slender Teardrop Bud (Early Bloom)
    // 2: Flared / Open Tulip (Full Mid-Bloom)
    // 3: Lily-Flowered Tulip (Elegant Pointed Tips)
    // 4: Double / Peony Tulip (Ruffled Layers)
    const tulipVariety = Math.floor(Math.random() * 5);

    switch (tulipVariety) {
      case 0:
        this.buildClassicCupTulip(headGroup, colorMat);
        break;
      case 1:
        this.buildBudTulip(headGroup, colorMat);
        break;
      case 2:
        this.buildFlaredOpenTulip(headGroup, colorMat);
        break;
      case 3:
        this.buildLilyFloweredTulip(headGroup, colorMat);
        break;
      case 4:
      default:
        this.buildDoublePeonyTulip(headGroup, colorMat);
        break;
    }

    this.group.add(flowerGroup);

    const flowerInst: FlowerInstance = {
      group: flowerGroup,
      headGroup,
      stemMesh: stem,
      targetScale: baseScale,
      maxStemHeight: stemHeight,
      bloomDuration: 0.65 + Math.random() * 0.3,
      elapsed: 0,
      isDone: false,
    };
    this.activeFlowers.push(flowerInst);

    // Subtle sparkles
    this.emitBloomParticles(pos, (colorMat.color as THREE.Color));
  }

  // --- Tulip Variety Builders ---

  private buildClassicCupTulip(head: THREE.Group, petalMat: THREE.Material) {
    // 6 petals in two concentric rings of 3 (classic tulip anatomy)
    // Outer 3 petals
    for (let p = 0; p < 3; p++) {
      const angle = (p / 3) * Math.PI * 2;
      const petal = new THREE.Mesh(this.tulipCupPetalGeo, petalMat);
      petal.rotation.y = angle;
      petal.rotation.x = 0.16;
      head.add(petal);
    }
    // Inner 3 petals staggered
    for (let p = 0; p < 3; p++) {
      const angle = (p / 3) * Math.PI * 2 + Math.PI / 3;
      const petal = new THREE.Mesh(this.tulipCupPetalGeo, petalMat);
      petal.scale.set(0.9, 0.95, 0.9);
      petal.rotation.y = angle;
      petal.rotation.x = 0.12;
      petal.position.y = 0.02;
      head.add(petal);
    }
    // Classic dark stamen base + yellow pistil inside chalice
    const stamen = new THREE.Mesh(this.centerSphereGeo, this.centerDarkMat);
    stamen.scale.set(0.7, 0.7, 0.7);
    stamen.position.y = 0.07;
    head.add(stamen);

    const pistil = new THREE.Mesh(this.budGeo, this.centerGoldMat);
    pistil.scale.set(0.6, 0.8, 0.6);
    pistil.position.y = 0.11;
    head.add(pistil);
  }

  private buildBudTulip(head: THREE.Group, petalMat: THREE.Material) {
    // 3 tapered petals tightly hugging in an elegant slender bud
    for (let p = 0; p < 3; p++) {
      const angle = (p / 3) * Math.PI * 2;
      const petal = new THREE.Mesh(this.tulipBudPetalGeo, petalMat);
      petal.rotation.y = angle;
      petal.rotation.x = 0.05; // almost vertical
      head.add(petal);
    }
  }

  private buildFlaredOpenTulip(head: THREE.Group, petalMat: THREE.Material) {
    // 6 petals opening gently with a wider cup
    for (let p = 0; p < 6; p++) {
      const angle = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(this.tulipFlaredPetalGeo, petalMat);
      petal.rotation.y = angle;
      petal.rotation.x = 0.32; // flared open
      head.add(petal);
    }
    const stamen = new THREE.Mesh(this.centerSphereGeo, this.centerGoldMat);
    stamen.position.y = 0.06;
    head.add(stamen);
  }

  private buildLilyFloweredTulip(head: THREE.Group, petalMat: THREE.Material) {
    // 6 pointed petals with sharp, elegant recurving tips
    for (let p = 0; p < 6; p++) {
      const angle = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(this.tulipLilyPetalGeo, petalMat);
      petal.rotation.y = angle;
      petal.rotation.x = 0.24;
      head.add(petal);
    }
    const center = new THREE.Mesh(this.centerSphereGeo, this.centerYellowMat);
    center.position.y = 0.05;
    head.add(center);
  }

  private buildDoublePeonyTulip(head: THREE.Group, petalMat: THREE.Material) {
    // Multi-layered lush double tulip (outer ring + inner ruffled ring)
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(this.tulipRufflePetalGeo, petalMat);
      petal.rotation.y = angle;
      petal.rotation.x = 0.28;
      head.add(petal);
    }
    for (let p = 0; p < 4; p++) {
      const angle = (p / 4) * Math.PI * 2 + 0.35;
      const petal = new THREE.Mesh(this.tulipRufflePetalGeo, petalMat);
      petal.scale.set(0.8, 0.85, 0.8);
      petal.rotation.y = angle;
      petal.rotation.x = 0.18;
      petal.position.y = 0.03;
      head.add(petal);
    }
    const center = new THREE.Mesh(this.budGeo, this.centerGoldMat);
    center.position.y = 0.07;
    head.add(center);
  }

  // --- Companion Wildflower Builder ---

  private createCompanionWildflower(pos: THREE.Vector3, scaleMult: number) {
    const flowerGroup = new THREE.Group();
    flowerGroup.position.copy(pos);

    flowerGroup.rotation.y = Math.random() * Math.PI * 2;
    flowerGroup.rotation.x = (Math.random() - 0.5) * 0.12;
    flowerGroup.rotation.z = (Math.random() - 0.5) * 0.12;

    const baseScale = (0.75 + Math.random() * 0.3) * scaleMult;
    const stemHeight = (0.24 + Math.random() * 0.18) * baseScale;

    const stem = new THREE.Mesh(this.stemGeo, this.stemMat);
    stem.scale.set(baseScale, 0.01, baseScale);
    flowerGroup.add(stem);

    // Dainty leaflets
    const leaf = new THREE.Mesh(this.wildflowerLeafGeo, this.wildflowerLeafMat);
    leaf.position.set(0, stemHeight * 0.35, 0);
    leaf.rotation.x = 0.4;
    leaf.scale.set(baseScale, baseScale, baseScale);
    stem.add(leaf);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0;
    headGroup.scale.set(0.001, 0.001, 0.001);
    flowerGroup.add(headGroup);

    const colorMat = this.wildflowerMats[Math.floor(Math.random() * this.wildflowerMats.length)];
    const wildType = Math.floor(Math.random() * 4);

    switch (wildType) {
      case 0: // Daisy
        for (let p = 0; p < 8; p++) {
          const petal = new THREE.Mesh(this.daisyPetalGeo, colorMat);
          petal.rotation.y = (p / 8) * Math.PI * 2;
          petal.rotation.x = 0.1;
          headGroup.add(petal);
        }
        const dc = new THREE.Mesh(this.centerSphereGeo, this.centerYellowMat);
        dc.position.y = 0.03;
        headGroup.add(dc);
        break;
      case 1: // Star Lily
        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(this.starPetalGeo, colorMat);
          petal.rotation.y = (p / 5) * Math.PI * 2;
          petal.rotation.x = 0.2;
          headGroup.add(petal);
        }
        const sc = new THREE.Mesh(this.centerSphereGeo, this.centerWhiteMat);
        sc.position.y = 0.03;
        headGroup.add(sc);
        break;
      case 2: // Lavender Spire
        for (let b = 0; b < 5; b++) {
          const bell = new THREE.Mesh(this.bellPetalGeo, colorMat);
          const angle = (b * 1.5) % (Math.PI * 2);
          bell.position.set(Math.cos(angle) * 0.04, b * 0.06, Math.sin(angle) * 0.04);
          bell.rotation.y = angle;
          bell.scale.setScalar(1.0 - b * 0.12);
          headGroup.add(bell);
        }
        break;
      case 3: // Wild Rose
      default:
        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(this.rosePetalGeo, colorMat);
          petal.rotation.y = (p / 5) * Math.PI * 2;
          petal.rotation.x = 0.3;
          headGroup.add(petal);
        }
        const rc = new THREE.Mesh(this.budGeo, this.centerGoldMat);
        rc.position.y = 0.05;
        headGroup.add(rc);
        break;
    }

    this.group.add(flowerGroup);

    const flowerInst: FlowerInstance = {
      group: flowerGroup,
      headGroup,
      stemMesh: stem,
      targetScale: baseScale,
      maxStemHeight: stemHeight,
      bloomDuration: 0.65 + Math.random() * 0.3,
      elapsed: 0,
      isDone: false,
    };
    this.activeFlowers.push(flowerInst);

    this.emitBloomParticles(pos, (colorMat.color as THREE.Color));
  }

  // --- Bloom Sparkles System ---

  private emitBloomParticles(origin: THREE.Vector3, baseColor: THREE.Color) {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spread = 0.22;
      const pos = new THREE.Vector3(
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + 0.1 + Math.random() * 0.2,
        origin.z + (Math.random() - 0.5) * spread
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.5 + Math.random() * 0.55,
        (Math.random() - 0.5) * 0.35
      );

      const col = new THREE.Color(baseColor);
      col.lerp(new THREE.Color(0xffeaa7), 0.5);

      this.particles.push({
        pos,
        vel,
        color: col,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.3,
      });
    }
  }

  private updateParticles(delta: number) {
    const posArr = this.particlePosAttr.array as Float32Array;
    const colArr = this.particleColAttr.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.x *= 0.94;
      p.vel.z *= 0.94;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    const activeCount = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < activeCount) {
        const p = this.particles[i];
        posArr[i * 3] = p.pos.x;
        posArr[i * 3 + 1] = p.pos.y;
        posArr[i * 3 + 2] = p.pos.z;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        colArr[i * 3] = p.color.r * alpha;
        colArr[i * 3 + 1] = p.color.g * alpha;
        colArr[i * 3 + 2] = p.color.b * alpha;
      } else {
        posArr[i * 3 + 1] = -999;
      }
    }

    this.particlePosAttr.needsUpdate = true;
    this.particleColAttr.needsUpdate = true;
  }

  public get flowerCount(): number {
    return this.flowerPositions.length;
  }

  public reset() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.group.add(this.particlePoints);
    this.activeFlowers = [];
    this.flowerPositions = [];
    this.visitedCells.clear();
    this.particles = [];
    this.hasInitializedPos = false;
  }
}
