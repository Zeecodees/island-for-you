import * as THREE from 'three';
import { sound } from './audio';

interface CritterState {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  leftEar: THREE.Mesh;
  rightEar: THREE.Mesh;
  bubbleSprite: THREE.Sprite;
  bubbleTexture: THREE.CanvasTexture;
  bubbleCanvas: HTMLCanvasElement;
  baseX: number;
  baseZ: number;
  currentYaw: number;
  targetYaw: number;
  idleTimer: number;
  hopPhase: number;
  speechCooldown: number;
  bubbleTimer: number;
  bubbleVisible: boolean;
}

interface ButterflyState {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  baseY: number;
  orbitRadius: number;
  orbitSpeed: number;
  flapSpeed: number;
  phase: number;
}

export class Level1Critters {
  public group: THREE.Group;

  private critters: CritterState[] = [];
  private butterflies: ButterflyState[] = [];
  private fireflies: THREE.Points | null = null;
  private fireflyPositions: Float32Array | null = null;
  private fireflyBaseY: number[] = [];
  private fireflyPhases: number[] = [];
  private mushroomMaterials: THREE.MeshStandardMaterial[] = [];
  private songbirdGroup: THREE.Group | null = null;
  private birdHead: THREE.Group | null = null;
  private birdTail: THREE.Mesh | null = null;

  private speechLines = [
    "Go Aafraa!",
    "You got this!",
    "Find the door!",
    "Hehe, keep going!",
  ];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Level1_Critters_Environment";

    this.setupBunnies();
    this.setupButterflies();
    this.setupFireflies();
    this.setupGlowingMushrooms();
    this.setupSongbird();
  }

  // --- 1. Cute Friendly Forest Bunnies ---
  private setupBunnies() {
    const bunnyConfigs = [
      { x: -6.5, z: 4.0, yaw: 0.8 },
      { x: 6.8, z: 2.5, yaw: -1.1 },
    ];

    const bodyGeo = new THREE.SphereGeometry(0.30, 14, 14);
    bodyGeo.scale(1.0, 0.85, 1.15);

    const headGeo = new THREE.SphereGeometry(0.22, 14, 14);
    headGeo.scale(1.0, 0.95, 0.95);

    const earGeo = new THREE.CylinderGeometry(0.04, 0.065, 0.32, 10);
    earGeo.scale(1.0, 1.0, 0.45);

    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const noseGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const tailGeo = new THREE.SphereGeometry(0.09, 8, 8);

    const furMat = new THREE.MeshToonMaterial({ color: 0xfff3e0 }); // warm creamy fur
    const innerEarMat = new THREE.MeshToonMaterial({ color: 0xffab91 }); // soft pastel pink
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
    const noseMat = new THREE.MeshToonMaterial({ color: 0xf48fb1 });
    const tailMat = new THREE.MeshToonMaterial({ color: 0xffffff });

    bunnyConfigs.forEach((cfg) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, 0, cfg.z);
      bGroup.rotation.y = cfg.yaw;

      // Body
      const body = new THREE.Mesh(bodyGeo, furMat);
      body.position.y = 0.24;
      body.castShadow = true;
      bGroup.add(body);

      // Fluffy tail
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, 0.22, -0.32);
      bGroup.add(tail);

      // Head group
      const head = new THREE.Group();
      head.position.set(0, 0.38, 0.18);
      bGroup.add(head);

      const headMesh = new THREE.Mesh(headGeo, furMat);
      headMesh.castShadow = true;
      head.add(headMesh);

      // Nose
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.set(0, -0.02, 0.22);
      head.add(nose);

      // Eyes
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.11, 0.05, 0.17);
      head.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.11, 0.05, 0.17);
      head.add(rightEye);

      // Ears
      const leftEar = new THREE.Mesh(earGeo, furMat);
      leftEar.position.set(-0.08, 0.26, -0.02);
      leftEar.rotation.z = 0.15;
      head.add(leftEar);

      const leftInnerEar = new THREE.Mesh(earGeo, innerEarMat);
      leftInnerEar.scale.set(0.7, 0.8, 0.5);
      leftInnerEar.position.set(0, 0, 0.02);
      leftEar.add(leftInnerEar);

      const rightEar = new THREE.Mesh(earGeo, furMat);
      rightEar.position.set(0.08, 0.26, -0.02);
      rightEar.rotation.z = -0.15;
      head.add(rightEar);

      const rightInnerEar = new THREE.Mesh(earGeo, innerEarMat);
      rightInnerEar.scale.set(0.7, 0.8, 0.5);
      rightInnerEar.position.set(0, 0, 0.02);
      rightEar.add(rightInnerEar);

      // 3D Speech bubble sprite
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 140;
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 0.95, 0);
      sprite.scale.set(1.5, 0.55, 1);
      sprite.visible = false;
      bGroup.add(sprite);

      this.group.add(bGroup);

      this.critters.push({
        group: bGroup,
        body,
        head,
        leftEar,
        rightEar,
        bubbleSprite: sprite,
        bubbleTexture: texture,
        bubbleCanvas: canvas,
        baseX: cfg.x,
        baseZ: cfg.z,
        currentYaw: cfg.yaw,
        targetYaw: cfg.yaw,
        idleTimer: Math.random() * 5,
        hopPhase: Math.random() * Math.PI,
        speechCooldown: 2.0 + Math.random() * 3.0, // initial grace period
        bubbleTimer: 0,
        bubbleVisible: false,
      });
    });
  }

  private drawSpeechBubble(canvas: HTMLCanvasElement, text: string) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width - 24;
    const h = canvas.height - 36;
    const x = 12;
    const y = 8;
    const r = 24;

    // Outer speech bubble shape
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#48dbfb';
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Downward tail
    ctx.lineTo(x + w / 2 + 14, y + h);
    ctx.lineTo(x + w / 2, y + h + 22);
    ctx.lineTo(x + w / 2 - 14, y + h);

    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Cute creature badge + text
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0abde3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐰 Forest Friend', canvas.width / 2, y + 26);

    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#222f3e';
    ctx.fillText(`"${text}"`, canvas.width / 2, y + 62);
  }

  // --- 2. Fluttering Pastel Butterflies ---
  private setupButterflies() {
    const configs = [
      { x: -4.0, z: 9.0, color: 0xff9ff3 },
      { x: 4.0, z: 8.0, color: 0x54a0ff },
      { x: -6.0, z: 2.0, color: 0xfeca57 },
      { x: 5.0, z: 1.0, color: 0x1dd1a1 },
    ];

    configs.forEach((cfg, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, 0.7, cfg.z);

      const wingMat = new THREE.MeshToonMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });

      const wingGeo = new THREE.PlaneGeometry(0.18, 0.14);
      wingGeo.translate(0.09, 0, 0); // pivot on body

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.rotation.y = 0.3;
      bGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.rotation.y = -Math.PI - 0.3;
      bGroup.add(rightWing);

      this.group.add(bGroup);

      this.butterflies.push({
        group: bGroup,
        leftWing,
        rightWing,
        centerX: cfg.x,
        centerZ: cfg.z,
        baseY: 0.65 + idx * 0.15,
        orbitRadius: 0.7 + Math.random() * 0.4,
        orbitSpeed: 0.8 + Math.random() * 0.4,
        flapSpeed: 14.0 + Math.random() * 4.0,
        phase: idx * 1.5,
      });
    });
  }

  // --- 3. Gentle Fireflies Cluster ---
  private setupFireflies() {
    const count = 22;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const tealColor = new THREE.Color(0x7ed6df);
    const goldColor = new THREE.Color(0xfeca57);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4.0 + Math.random() * 11.0;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 0.6 + Math.random() * 2.2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.fireflyBaseY.push(y);
      this.fireflyPhases.push(Math.random() * Math.PI * 2);

      const chosenColor = Math.random() > 0.45 ? goldColor : tealColor;
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.fireflies = new THREE.Points(geometry, material);
    this.fireflyPositions = positions;
    this.group.add(this.fireflies);
  }

  // --- 4. Tiny Bioluminescent Mushrooms ---
  private setupGlowingMushrooms() {
    const clusterPositions = [
      { x: -7.5, z: 6.5, color: 0xff6b81 }, // Coral glow
      { x: 8.5, z: 3.5, color: 0x70a1ff },  // Cyan glow
      { x: -10.5, z: -0.5, color: 0x2ed573 },// Mint glow
    ];

    const stemMat = new THREE.MeshToonMaterial({ color: 0xf1f2f6 });
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.16, 8);

    clusterPositions.forEach((cluster) => {
      const capMat = new THREE.MeshStandardMaterial({
        color: cluster.color,
        emissive: cluster.color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      });
      this.mushroomMaterials.push(capMat);

      for (let m = 0; m < 3; m++) {
        const mGroup = new THREE.Group();
        const offsetX = (m - 1) * 0.18 + (Math.random() - 0.5) * 0.08;
        const offsetZ = ((m % 2) - 0.5) * 0.18;
        const scale = 0.75 + Math.random() * 0.5;

        mGroup.position.set(cluster.x + offsetX, 0, cluster.z + offsetZ);
        mGroup.scale.setScalar(scale);

        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.08;
        mGroup.add(stem);

        const capGeo = new THREE.SphereGeometry(0.1, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.15;
        mGroup.add(cap);

        this.group.add(mGroup);
      }
    });
  }

  // --- 5. Cute Perched Songbird ---
  private setupSongbird() {
    const birdGroup = new THREE.Group();
    birdGroup.position.set(-3.5, 2.25, 11.0); // Perched on lantern arm
    birdGroup.scale.setScalar(0.7);

    const bodyMat = new THREE.MeshToonMaterial({ color: 0x48dbfb }); // Cute light blue
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const beakMat = new THREE.MeshToonMaterial({ color: 0xfeca57 }); // Orange beak
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Round body
    const bodyGeo = new THREE.SphereGeometry(0.18, 12, 12);
    bodyGeo.scale(1.0, 0.9, 1.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    birdGroup.add(body);

    const bellyGeo = new THREE.SphereGeometry(0.13, 10, 10);
    bellyGeo.scale(0.9, 0.8, 1.0);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.04, 0.06);
    birdGroup.add(belly);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.12, 0.14);
    birdGroup.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const head = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.04, 0.11, 6);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, -0.01, 0.14);
    headGroup.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.03, 0.08);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.03, 0.08);
    headGroup.add(rightEye);

    // Tail
    const tailGeo = new THREE.BoxGeometry(0.08, 0.02, 0.18);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 0.02, -0.19);
    tail.rotation.x = 0.25;
    birdGroup.add(tail);

    this.group.add(birdGroup);
    this.songbirdGroup = birdGroup;
    this.birdHead = headGroup;
    this.birdTail = tail;
  }

  // --- Update Loop ---
  public update(delta: number, playerPos: THREE.Vector3) {
    const now = performance.now() * 0.001;

    // 1. Update Bunnies
    this.critters.forEach((critter) => {
      critter.idleTimer += delta;
      critter.speechCooldown -= delta;

      const dx = playerPos.x - critter.baseX;
      const dz = playerPos.z - critter.baseZ;
      const distToPlayer = Math.hypot(dx, dz);

      const isAafraaNear = distToPlayer < 2.8;

      if (isAafraaNear) {
        // Face Aafraa smoothly
        critter.targetYaw = Math.atan2(dx, dz);
        // Happy rapid hop
        critter.hopPhase += delta * 7.0;
        const hopY = Math.abs(Math.sin(critter.hopPhase)) * 0.16;
        critter.group.position.y = hopY;

        // Ear perk up
        critter.leftEar.rotation.z = 0.08 + Math.sin(critter.hopPhase * 2) * 0.08;
        critter.rightEar.rotation.z = -0.08 - Math.sin(critter.hopPhase * 2) * 0.08;

        // Trigger friendly cheer if off cooldown
        if (critter.speechCooldown <= 0 && !critter.bubbleVisible) {
          const line = this.speechLines[Math.floor(Math.random() * this.speechLines.length)];
          this.drawSpeechBubble(critter.bubbleCanvas, line);
          critter.bubbleTexture.needsUpdate = true;
          critter.bubbleSprite.visible = true;
          critter.bubbleVisible = true;
          critter.bubbleTimer = 3.2; // Show for ~3 seconds
          critter.speechCooldown = 15.0; // 15 seconds cooldown between cheers
          sound.playPickup(); // Soft gentle chime
        }
      } else {
        // Subtle idle hopping every couple of seconds
        critter.targetYaw = critter.currentYaw + Math.sin(critter.idleTimer * 0.5) * 0.005;
        critter.hopPhase += delta * 2.5;
        const hopY = Math.max(0, Math.sin(critter.hopPhase)) * 0.06;
        critter.group.position.y = hopY;

        // Gentle ear twitch
        critter.leftEar.rotation.z = 0.15 + Math.sin(critter.idleTimer * 3.0) * 0.05;
        critter.rightEar.rotation.z = -0.15 - Math.cos(critter.idleTimer * 3.0) * 0.05;
      }

      // Smooth yaw rotation
      critter.currentYaw += (critter.targetYaw - critter.currentYaw) * Math.min(1.0, delta * 5.0);
      critter.group.rotation.y = critter.currentYaw;

      // Update speech bubble fade / timer
      if (critter.bubbleVisible) {
        critter.bubbleTimer -= delta;
        if (critter.bubbleTimer <= 0) {
          critter.bubbleVisible = false;
          critter.bubbleSprite.visible = false;
        } else {
          // Scale pop-in
          const scaleProgress = Math.min(1.0, (3.2 - critter.bubbleTimer) * 4.0);
          critter.bubbleSprite.scale.set(1.5 * scaleProgress, 0.55 * scaleProgress, 1);
        }
      }
    });

    // 2. Update Butterflies
    this.butterflies.forEach((b) => {
      const time = now * b.orbitSpeed + b.phase;
      // Figure-8 pattern over flower patch
      b.group.position.x = b.centerX + Math.sin(time) * b.orbitRadius;
      b.group.position.z = b.centerZ + Math.sin(time * 2.0) * (b.orbitRadius * 0.6);
      b.group.position.y = b.baseY + Math.sin(now * 3.0 + b.phase) * 0.15;

      // Face trajectory
      b.group.rotation.y = Math.atan2(Math.cos(time) * b.orbitRadius, Math.cos(time * 2.0) * (b.orbitRadius * 1.2));

      // Fast wing flutter
      const flap = Math.sin(now * b.flapSpeed) * 0.85;
      b.leftWing.rotation.y = flap;
      b.rightWing.rotation.y = -Math.PI - flap;
    });

    // 3. Update Fireflies
    if (this.fireflies && this.fireflyPositions) {
      const count = this.fireflyBaseY.length;
      for (let i = 0; i < count; i++) {
        const phase = this.fireflyPhases[i];
        // Vertical gentle drift
        this.fireflyPositions[i * 3 + 1] = this.fireflyBaseY[i] + Math.sin(now * 1.8 + phase) * 0.35;
      }
      this.fireflies.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Glowing Mushrooms
    this.mushroomMaterials.forEach((mat) => {
      mat.emissiveIntensity = 0.45 + Math.sin(now * 1.6) * 0.25;
    });

    // 5. Update Perched Songbird
    if (this.birdHead && this.birdTail) {
      this.birdHead.rotation.y = Math.sin(now * 1.2) * 0.4;
      this.birdTail.rotation.x = 0.25 + (Math.sin(now * 4.0) > 0.8 ? 0.2 : 0);
    }
  }

  public reset() {
    this.critters.forEach((critter) => {
      critter.group.position.set(critter.baseX, 0, critter.baseZ);
      critter.currentYaw = critter.targetYaw;
      critter.group.rotation.y = critter.currentYaw;
      critter.speechCooldown = 2.0;
      critter.bubbleTimer = 0;
      critter.bubbleVisible = false;
      critter.bubbleSprite.visible = false;
    });
  }
}
