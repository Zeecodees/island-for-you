import * as THREE from 'three';

/**
 * Nighttime Fantasy Environment
 * Features:
 * - Twinkling star field
 * - Glowing crescent moon with soft halo
 * - Drifting fluffy low-poly clouds
 * - Distant floating islands across the sky
 * - Drifting magical firefly particles
 * - Soft cinematic moonlight and atmospheric fog
 */
export class WorldEnvironment {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private clouds: THREE.Group[] = [];
  private fireflies: THREE.Points;
  private fireflyGeo: THREE.BufferGeometry;
  private fireflyPositions: Float32Array;
  private fireflyCount = 140;
  private moonMesh: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "World_Environment";
    this.scene.add(this.group);

    // Deep starry night fog
    this.scene.fog = new THREE.FogExp2(0x0c142c, 0.007);
    this.scene.background = new THREE.Color(0x090e24);

    this.setupLighting();
    this.createSkyAndStars();
    this.moonMesh = this.createMoon();
    this.createClouds();
    this.createDistantFloatingIslands();
    this.fireflies = this.createFireflies();
  }

  private setupLighting() {
    // Soft cool moonlight ambient
    const ambientLight = new THREE.AmbientLight(0x28385e, 1.2);
    this.group.add(ambientLight);

    // Main moonlight directional
    const moonDirLight = new THREE.DirectionalLight(0xaad3ff, 2.2);
    moonDirLight.position.set(40, 80, 50);
    moonDirLight.castShadow = true;
    moonDirLight.shadow.mapSize.width = 2048;
    moonDirLight.shadow.mapSize.height = 2048;
    moonDirLight.shadow.camera.near = 10;
    moonDirLight.shadow.camera.far = 250;
    const shadowSize = 50;
    moonDirLight.shadow.camera.left = -shadowSize;
    moonDirLight.shadow.camera.right = shadowSize;
    moonDirLight.shadow.camera.top = shadowSize;
    moonDirLight.shadow.camera.bottom = -shadowSize;
    moonDirLight.shadow.bias = -0.001;
    this.group.add(moonDirLight);

    // Warm bounce light from fairy lanterns
    const warmBounceLight = new THREE.HemisphereLight(0x899eff, 0x3d281a, 0.7);
    this.group.add(warmBounceLight);
  }

  private createSkyAndStars() {
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colorChoices = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xdbe7ff),
      new THREE.Color(0xfff3db),
      new THREE.Color(0xebd0ff),
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute along outer sky sphere
      const radius = 240 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.8 - 0.9);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.max(15, radius * Math.cos(phi));
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.group.add(stars);
  }

  private createMoon(): THREE.Group {
    const moonGroup = new THREE.Group();
    moonGroup.position.set(65, 85, 75);

    // Glowing crescent / circular moon body
    const moonGeo = new THREE.SphereGeometry(7, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfffae8,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Soft celestial glow halo
    const haloGeo = new THREE.RingGeometry(7.2, 14, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x90baff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.lookAt(-65, -85, -75);
    moonGroup.add(halo);

    this.group.add(moonGroup);
    return moonGroup;
  }

  private createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x27365c,
      roughness: 0.9,
      transparent: true,
      opacity: 0.65,
    });

    // Spawn 14 soft stylized clouds around the play spaces
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const puffCount = 4 + Math.floor(Math.random() * 3);
      
      for (let p = 0; p < puffCount; p++) {
        const radius = 3 + Math.random() * 2.5;
        const puffGeo = new THREE.SphereGeometry(radius, 8, 8);
        puffGeo.scale(1.4, 0.7, 1.0);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - puffCount / 2) * 2.8 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2
        );
        cloud.add(puff);
      }

      const angle = (i / 14) * Math.PI * 2;
      const dist = 45 + Math.random() * 40;
      cloud.position.set(
        Math.cos(angle) * dist,
        -10 + (Math.random() - 0.5) * 25,
        Math.sin(angle) * dist
      );
      this.group.add(cloud);
      this.clouds.push(cloud);
    }
  }

  private createDistantFloatingIslands() {
    // Distant floating landmasses that give the expansive floating-island feeling from reference
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1f2647,
      roughness: 0.85,
    });
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x253e5e,
      roughness: 0.75,
    });
    const lanternMat = new THREE.MeshBasicMaterial({
      color: 0xffd27d,
    });

    const islandPositions = [
      { x: -70, y: 15, z: -80, scale: 2.2 },
      { x: 90, y: -5, z: -70, scale: 2.8 },
      { x: -110, y: -15, z: 40, scale: 3.2 },
      { x: 120, y: 20, z: 50, scale: 2.5 },
      { x: 0, y: -25, z: -120, scale: 3.5 },
      { x: 60, y: 35, z: -110, scale: 1.8 },
    ];

    for (const data of islandPositions) {
      const island = new THREE.Group();
      island.position.set(data.x, data.y, data.z);
      island.scale.setScalar(data.scale);

      // Conical underside
      const underGeo = new THREE.ConeGeometry(8, 12, 7);
      underGeo.rotateX(Math.PI);
      const underMesh = new THREE.Mesh(underGeo, rockMat);
      underMesh.position.y = -6;
      island.add(underMesh);

      // Plateau top
      const topGeo = new THREE.CylinderGeometry(8.2, 7.8, 1.6, 7);
      const topMesh = new THREE.Mesh(topGeo, grassMat);
      topMesh.position.y = 0.8;
      island.add(topMesh);

      // Distant tree silhouette
      const treeTopGeo = new THREE.ConeGeometry(2.5, 4.5, 5);
      const treeTop = new THREE.Mesh(treeTopGeo, rockMat);
      treeTop.position.set(1.5, 3.8, -1.0);
      island.add(treeTop);

      // Tiny warm lantern beacon
      const lanternGeo = new THREE.SphereGeometry(0.5, 6, 6);
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(-2, 2.2, 2);
      island.add(lantern);

      this.group.add(island);
    }
  }

  private createFireflies(): THREE.Points {
    this.fireflyGeo = new THREE.BufferGeometry();
    this.fireflyPositions = new Float32Array(this.fireflyCount * 3);

    for (let i = 0; i < this.fireflyCount; i++) {
      this.fireflyPositions[i * 3] = (Math.random() - 0.5) * 80;
      this.fireflyPositions[i * 3 + 1] = 0.5 + Math.random() * 8.0;
      this.fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    this.fireflyGeo.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));

    const fireflyMat = new THREE.PointsMaterial({
      color: 0xffebb3,
      size: 0.45,
      transparent: true,
      opacity: 0.85,
    });

    const fireflies = new THREE.Points(this.fireflyGeo, fireflyMat);
    this.group.add(fireflies);
    return fireflies;
  }

  public update(delta: number) {
    // Drift clouds
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].position.x += delta * 0.45;
      if (this.clouds[i].position.x > 110) {
        this.clouds[i].position.x = -110;
      }
    }

    // Animate fireflies
    const time = Date.now() * 0.0015;
    const pos = this.fireflyPositions;
    for (let i = 0; i < this.fireflyCount; i++) {
      pos[i * 3 + 1] += Math.sin(time + i) * 0.012;
      pos[i * 3] += Math.cos(time * 0.5 + i) * 0.008;
    }
    this.fireflyGeo.attributes.position.needsUpdate = true;
  }

  private warmLight: THREE.PointLight | null = null;

  public shiftToBirthdayWarmth() {
    if (this.warmLight) return;
    // Smoothly enrich the atmosphere with warmer fairy lights
    this.warmLight = new THREE.PointLight(0xffaa44, 2.5, 60);
    this.warmLight.position.set(0, 8, 0);
    this.group.add(this.warmLight);
  }

  public reset() {
    if (this.warmLight) {
      this.group.remove(this.warmLight);
      this.warmLight = null;
    }
  }
}
