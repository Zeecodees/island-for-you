import * as THREE from 'three';
import { sound } from './audio';

export interface WatermelonSocket {
  index: number;
  localPos: THREE.Vector3;
  worldPos: THREE.Vector3;
  hasMelon: boolean;
  isRespawning: boolean;
  respawnTimer: number;
  growthScale: number;
  melonGroup: THREE.Group | null;
}

/**
 * WatermelonProp
 * Represents an individual cute stylized 3D watermelon.
 */
export class WatermelonProp {
  public group: THREE.Group;
  public socketIndex: number;
  public isCarried = false;
  public isLooseOnGround = false;
  public position = new THREE.Vector3();

  constructor(socketIndex: number) {
    this.socketIndex = socketIndex;
    this.group = new THREE.Group();
    this.group.name = `Watermelon_${socketIndex}`;
    this.buildMesh();
  }

  private buildMesh() {
    // Generate high-contrast striped watermelon canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base rind color (bright fresh lime-emerald)
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dark forest-green jagged/wavy stripes
    ctx.fillStyle = '#1b693e';
    const stripeCount = 7;
    const stripeWidth = canvas.width / stripeCount;

    for (let i = 0; i < stripeCount; i++) {
      const centerX = i * stripeWidth + stripeWidth * 0.5;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);

      // Wavy path downwards
      for (let y = 0; y <= canvas.height; y += 16) {
        const wave = Math.sin((y / canvas.height) * Math.PI * 4 + i) * 8;
        ctx.lineTo(centerX + wave - 7, y);
      }
      for (let y = canvas.height; y >= 0; y -= 16) {
        const wave = Math.sin((y / canvas.height) * Math.PI * 4 + i) * 8;
        ctx.lineTo(centerX + wave + 7, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const melonMat = new THREE.MeshToonMaterial({
      map: texture,
    });

    // 1. Oval Melon Body
    const melonGeo = new THREE.SphereGeometry(0.24, 16, 14);
    melonGeo.scale(1.0, 0.92, 1.22);
    const melonMesh = new THREE.Mesh(melonGeo, melonMat);
    melonMesh.castShadow = true;
    melonMesh.receiveShadow = true;
    this.group.add(melonMesh);

    // 2. Curled Vine Stem at top
    const stemMat = new THREE.MeshToonMaterial({ color: 0x145a32 });
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.026, 0.12, 8);
    stemGeo.translate(0, 0.06, 0);
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.set(0, 0.21, 0.02);
    stemMesh.rotation.z = 0.35;
    stemMesh.rotation.x = -0.2;
    this.group.add(stemMesh);

    // Curly vine tendril
    const curlGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI * 1.3);
    const curlMesh = new THREE.Mesh(curlGeo, stemMat);
    curlMesh.position.set(0.05, 0.28, 0.01);
    curlMesh.rotation.x = Math.PI / 2;
    this.group.add(curlMesh);

    // 3. Tiny attached green leaf
    const leafMat = new THREE.MeshToonMaterial({ color: 0x27ae60 });
    const leafGeo = new THREE.SphereGeometry(0.06, 8, 6);
    leafGeo.scale(1.2, 0.2, 0.6);
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(-0.06, 0.22, 0.04);
    leafMesh.rotation.z = -0.4;
    leafMesh.rotation.y = 0.5;
    this.group.add(leafMesh);
  }

  public setCarried(holdPos: THREE.Vector3, playerYaw: number) {
    this.isCarried = true;
    this.isLooseOnGround = false;
    this.position.copy(holdPos);
    this.group.position.copy(this.position);
    this.group.rotation.set(0.2, playerYaw, 0.0);
    this.group.scale.set(1, 1, 1);
  }

  public drop(dropPos: THREE.Vector3) {
    this.isCarried = false;
    this.isLooseOnGround = true;
    this.position.copy(dropPos);
    this.position.y = Math.max(0.18, dropPos.y);
    this.group.position.copy(this.position);
    this.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
    this.group.scale.set(1, 1, 1);
  }
}

/**
 * WatermelonPlant
 * A natural, cute watermelon vine patch situated on Level 1.
 * Features 3 fixed watermelon spawn sockets that refill when eaten.
 */
export class WatermelonPlant {
  public group: THREE.Group;
  public position: THREE.Vector3;
  public sockets: WatermelonSocket[] = [];

  // Active watermelon props
  public carriedMelon: WatermelonProp | null = null;
  public looseMelons: WatermelonProp[] = [];

  // Eating particle effect
  private particleGroup: THREE.Group;
  private activeParticles: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  // Visual breathing
  private animTimer = 0;

  constructor(position = new THREE.Vector3(-8.0, 0, 5.5)) {
    this.position = position.clone();
    this.group = new THREE.Group();
    this.group.name = 'Watermelon_Plant_Patch';
    this.group.position.copy(this.position);

    this.buildGardenPatch();
    this.initSockets();

    this.particleGroup = new THREE.Group();
    this.group.add(this.particleGroup);
  }

  private buildGardenPatch() {
    // 1. Soft darker soil patch underbelly
    const soilMat = new THREE.MeshToonMaterial({
      color: 0x1a4329, // Rich dark earth with mossy tint
    });
    const soilGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.08, 14);
    soilGeo.scale(1.2, 1.0, 1.0);
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.position.set(0, 0.02, 0);
    soilMesh.receiveShadow = true;
    this.group.add(soilMesh);

    // 2. Curving runner vine stems connecting the patch
    const vineMat = new THREE.MeshToonMaterial({ color: 0x1e824c });
    const vinePoints1 = [
      new THREE.Vector3(-0.95, 0.05, 0.35),
      new THREE.Vector3(-0.4, 0.08, 0.1),
      new THREE.Vector3(0.0, 0.06, 0.0),
      new THREE.Vector3(0.4, 0.07, 0.9),
    ];
    const curve1 = new THREE.CatmullRomCurve3(vinePoints1);
    const vineGeo1 = new THREE.TubeGeometry(curve1, 16, 0.035, 6, false);
    const vine1 = new THREE.Mesh(vineGeo1, vineMat);
    vine1.receiveShadow = true;
    this.group.add(vine1);

    const vinePoints2 = [
      new THREE.Vector3(0.0, 0.06, 0.0),
      new THREE.Vector3(0.5, 0.08, -0.2),
      new THREE.Vector3(0.85, 0.05, -0.45),
    ];
    const curve2 = new THREE.CatmullRomCurve3(vinePoints2);
    const vineGeo2 = new THREE.TubeGeometry(curve2, 12, 0.032, 6, false);
    const vine2 = new THREE.Mesh(vineGeo2, vineMat);
    vine2.receiveShadow = true;
    this.group.add(vine2);

    // 3. Cute broad notched watermelon leaves
    const leafMat = new THREE.MeshToonMaterial({
      color: 0x27ae60,
      side: THREE.DoubleSide,
    });

    const leafPositions = [
      { x: -0.5, z: 0.3, rotY: 0.4, scale: 0.9 },
      { x: -0.2, z: -0.3, rotY: -0.6, scale: 1.1 },
      { x: 0.2, z: 0.4, rotY: 1.2, scale: 1.0 },
      { x: 0.6, z: 0.2, rotY: -1.0, scale: 0.85 },
      { x: -0.8, z: -0.1, rotY: 2.1, scale: 0.95 },
      { x: 0.4, z: -0.5, rotY: -0.2, scale: 1.05 },
    ];

    leafPositions.forEach((lp) => {
      const leafGroup = new THREE.Group();
      leafGroup.position.set(lp.x, 0.08, lp.z);
      leafGroup.rotation.y = lp.rotY;
      leafGroup.scale.setScalar(lp.scale);

      // Stylized triple-lobed leaf
      const centerLobe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), leafMat);
      centerLobe.scale.set(0.9, 0.15, 1.4);
      centerLobe.position.set(0, 0, 0.12);
      leafGroup.add(centerLobe);

      const leftLobe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), leafMat);
      leftLobe.scale.set(0.8, 0.15, 1.1);
      leftLobe.position.set(-0.1, 0, 0.06);
      leftLobe.rotation.y = 0.5;
      leafGroup.add(leftLobe);

      const rightLobe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), leafMat);
      rightLobe.scale.set(0.8, 0.15, 1.1);
      rightLobe.position.set(0.1, 0, 0.06);
      rightLobe.rotation.y = -0.5;
      leafGroup.add(rightLobe);

      leafGroup.rotation.x = 0.12;
      this.group.add(leafGroup);
    });

    // 4. Little yellow star blossom flowers
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xfeca57 });
    const flowerGeo = new THREE.ConeGeometry(0.04, 0.04, 5);
    flowerGeo.rotateX(Math.PI);

    const flowerPositions = [
      { x: -0.3, z: 0.6 },
      { x: 0.3, z: -0.1 },
      { x: -0.6, z: -0.3 },
    ];

    flowerPositions.forEach((fp) => {
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(fp.x, 0.1, fp.z);
      this.group.add(flower);
    });
  }

  private initSockets() {
    // 3 Fixed Spawn Sockets on the Vine Patch
    const localCoords = [
      new THREE.Vector3(-0.95, 0.20, 0.35),
      new THREE.Vector3(0.40, 0.20, 0.90),
      new THREE.Vector3(0.85, 0.20, -0.45),
    ];

    this.sockets = localCoords.map((localPos, idx) => {
      const worldPos = localPos.clone().add(this.position);
      const melon = new WatermelonProp(idx);
      melon.position.copy(worldPos);
      melon.group.position.copy(localPos);
      melon.group.rotation.y = (idx * Math.PI) / 1.5 + 0.3;
      this.group.add(melon.group);

      return {
        index: idx,
        localPos,
        worldPos,
        hasMelon: true,
        isRespawning: false,
        respawnTimer: 0,
        growthScale: 1.0,
        melonGroup: melon.group,
      };
    });
  }

  /**
   * Checks if player is near any available watermelon on the plant or on the ground.
   */
  public getNearestAvailableMelon(
    playerPos: THREE.Vector3,
    radius = 2.2
  ): { type: 'plant' | 'loose'; index?: number; melon?: WatermelonProp; distance: number } | null {
    let nearest: { type: 'plant' | 'loose'; index?: number; melon?: WatermelonProp; distance: number } | null = null;
    let minDist = radius;

    // Check plant sockets
    this.sockets.forEach((s) => {
      if (s.hasMelon && !s.isRespawning) {
        const d = playerPos.distanceTo(s.worldPos);
        if (d < minDist) {
          minDist = d;
          nearest = { type: 'plant', index: s.index, distance: d };
        }
      }
    });

    // Check loose dropped melons
    this.looseMelons.forEach((m) => {
      if (m.isLooseOnGround) {
        const d = playerPos.distanceTo(m.position);
        if (d < minDist) {
          minDist = d;
          nearest = { type: 'loose', melon: m, distance: d };
        }
      }
    });

    return nearest;
  }

  /**
   * Pick up a watermelon from a plant socket.
   */
  public pickupFromSocket(socketIndex: number): WatermelonProp | null {
    const socket = this.sockets[socketIndex];
    if (!socket || !socket.hasMelon || socket.isRespawning) return null;

    socket.hasMelon = false;
    if (socket.melonGroup) {
      socket.melonGroup.visible = false;
    }

    const melon = new WatermelonProp(socketIndex);
    this.carriedMelon = melon;
    return melon;
  }

  /**
   * Pick up a loose melon from the ground.
   */
  public pickupLoose(melon: WatermelonProp): WatermelonProp {
    const idx = this.looseMelons.indexOf(melon);
    if (idx !== -1) {
      this.looseMelons.splice(idx, 1);
    }
    this.group.remove(melon.group);
    this.carriedMelon = melon;
    return melon;
  }

  /**
   * Drop currently carried watermelon onto the ground as a pickupable object.
   */
  public dropCarried(dropPos: THREE.Vector3): WatermelonProp | null {
    if (!this.carriedMelon) return null;
    const melon = this.carriedMelon;
    this.carriedMelon = null;

    melon.drop(dropPos);
    // Add mesh to plant group with world-to-local coordinates
    const localDrop = dropPos.clone().sub(this.position);
    melon.group.position.copy(localDrop);
    melon.group.visible = true;
    this.group.add(melon.group);

    this.looseMelons.push(melon);
    sound.playPickup();
    return melon;
  }

  /**
   * Eat the currently carried watermelon.
   * Plays eating sound, spawns cute sparkles, and starts respawn timer for original socket.
   */
  public eatCarried(mouthPos: THREE.Vector3): number {
    if (!this.carriedMelon) return -1;
    const socketIndex = this.carriedMelon.socketIndex;

    this.carriedMelon = null;
    sound.playEat();
    this.spawnEatParticles(mouthPos);

    this.startRespawn(socketIndex);
    return socketIndex;
  }

  /**
   * Eat a loose dropped watermelon.
   */
  public eatLoose(melon: WatermelonProp, mouthPos: THREE.Vector3): number {
    const socketIndex = melon.socketIndex;
    const idx = this.looseMelons.indexOf(melon);
    if (idx !== -1) {
      this.looseMelons.splice(idx, 1);
    }
    this.group.remove(melon.group);

    sound.playEat();
    this.spawnEatParticles(mouthPos);

    this.startRespawn(socketIndex);
    return socketIndex;
  }

  /**
   * Begins the timed respawn for a specific socket.
   * Replacement appears at the EXACT SAME original position.
   */
  public startRespawn(socketIndex: number) {
    const socket = this.sockets[socketIndex];
    if (!socket) return;

    socket.hasMelon = false;
    socket.isRespawning = true;
    socket.respawnTimer = 3.5; // ~3.5 seconds to grow a fresh watermelon
    socket.growthScale = 0.01;
    if (socket.melonGroup) {
      socket.melonGroup.visible = false;
      socket.melonGroup.scale.setScalar(0.01);
    }
  }

  /**
   * Cute little burst of fresh watermelon sparkles when eaten.
   */
  private spawnEatParticles(pos: THREE.Vector3) {
    const localPos = pos.clone().sub(this.position);
    const colors = [0xff4757, 0x2ed573, 0xff6b81, 0xf1c40f];
    const particleCount = 14;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[i % colors.length];
      const geo = i % 2 === 0 ? new THREE.SphereGeometry(0.04, 6, 6) : new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.copy(localPos);
      this.particleGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 1.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.2 + Math.random() * 1.8,
        Math.sin(angle) * speed
      );

      this.activeParticles.push({
        mesh,
        vel,
        rotVel: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        life: 0,
        maxLife: 0.75 + Math.random() * 0.25,
      });
    }
  }

  /**
   * Per-frame animation: respawn growth, eating particles, subtle idle sway.
   */
  public update(delta: number) {
    this.animTimer += delta;

    // 1. Update socket respawns
    this.sockets.forEach((socket) => {
      if (socket.isRespawning) {
        socket.respawnTimer -= delta;
        if (socket.respawnTimer <= 0) {
          // Finished delay, begin smooth growth
          socket.isRespawning = false;
          socket.hasMelon = true;
          socket.growthScale = 0.05;
          if (socket.melonGroup) {
            socket.melonGroup.visible = true;
            socket.melonGroup.scale.setScalar(0.05);
          }
        }
      } else if (socket.hasMelon && socket.growthScale < 1.0) {
        // Smooth popping growth animation
        socket.growthScale = Math.min(1.0, socket.growthScale + delta * 1.8);
        const easeScale = THREE.MathUtils.lerp(socket.growthScale, 1.0, 0.1);
        if (socket.melonGroup) {
          socket.melonGroup.scale.setScalar(easeScale);
        }
      }
    });

    // 2. Update active eat particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += p.rotVel.x * delta;
      p.mesh.rotation.y += p.rotVel.y * delta;
      p.vel.y -= 4.5 * delta; // Gravity

      const progress = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1.0 - progress);

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.activeParticles.splice(i, 1);
      }
    }
  }

  /**
   * Reset all sockets and clear loose watermelons.
   */
  public reset() {
    this.carriedMelon = null;

    // Clean up loose melons
    this.looseMelons.forEach((m) => {
      this.group.remove(m.group);
    });
    this.looseMelons = [];

    // Reset sockets to full 3 watermelons
    this.sockets.forEach((s) => {
      s.hasMelon = true;
      s.isRespawning = false;
      s.respawnTimer = 0;
      s.growthScale = 1.0;
      if (s.melonGroup) {
        s.melonGroup.visible = true;
        s.melonGroup.scale.setScalar(1.0);
      }
    });

    // Clear particles
    this.activeParticles.forEach((p) => {
      this.particleGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.activeParticles = [];
  }
}
