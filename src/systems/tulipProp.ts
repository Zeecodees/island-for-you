import * as THREE from 'three';

export enum TulipState {
  DROPPED = 'DROPPED',
  CARRIED = 'CARRIED',
}

/**
 * TulipProp
 * Special post-letter 3D gift given to Aafraa by Psyduck in Level 3.
 *
 * Features:
 * - Beautiful stylized toon tulip blossom with layered crimson/coral petals and golden stamen
 * - Slender curved green stem and elegant arching leaves
 * - Floating warm fairy sparkle light
 * - Ground placement & carrying tracking
 * - Distance proximity check for pickup
 */
export class TulipProp {
  public group: THREE.Group;
  public state: TulipState = TulipState.DROPPED;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  private flowerGroup: THREE.Group;
  private glowLight: THREE.PointLight;
  private animTimer = 0;

  constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(14.8, 0, 12.6)) {
    this.group = new THREE.Group();
    this.group.name = 'Tulip_Gift_Prop';
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3();

    this.flowerGroup = new THREE.Group();
    this.group.add(this.flowerGroup);

    // --- Materials ---
    const stemMat = new THREE.MeshToonMaterial({
      color: 0x27ae60, // Vibrant leafy green
    });
    const leafMat = new THREE.MeshToonMaterial({
      color: 0x2ecc71,
    });
    const petalOuterMat = new THREE.MeshToonMaterial({
      color: 0xff3b5a, // Deep romantic crimson tulip
    });
    const petalInnerMat = new THREE.MeshToonMaterial({
      color: 0xff6b81, // Lighter warm coral pink
    });
    const stamenMat = new THREE.MeshBasicMaterial({
      color: 0xfeca57, // Golden warm stamen
    });

    // 1. Stem (slender, upright with slight elegant curve)
    const stemGeo = new THREE.CylinderGeometry(0.024, 0.03, 0.55, 10);
    stemGeo.translate(0, 0.275, 0);
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = true;
    this.flowerGroup.add(stemMesh);

    // 2. Arching Leaves (2 curved green leaves hugging base)
    const leafGeo1 = new THREE.SphereGeometry(0.09, 8, 8);
    leafGeo1.scale(0.3, 1.8, 0.12);
    leafGeo1.translate(0, 0.18, 0);
    const leaf1 = new THREE.Mesh(leafGeo1, leafMat);
    leaf1.position.set(-0.06, 0.05, 0.02);
    leaf1.rotation.z = 0.42;
    leaf1.rotation.x = -0.15;
    leaf1.castShadow = true;
    this.flowerGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo1.clone(), leafMat);
    leaf2.position.set(0.06, 0.08, -0.02);
    leaf2.rotation.z = -0.38;
    leaf2.rotation.x = 0.2;
    leaf2.castShadow = true;
    this.flowerGroup.add(leaf2);

    // 3. Tulip Bloom Cup (layered petals)
    const bloomGroup = new THREE.Group();
    bloomGroup.position.set(0, 0.55, 0);

    // Outer Petals (4 overlapping curved shields)
    const outerPetalGeo = new THREE.SphereGeometry(0.12, 10, 10);
    outerPetalGeo.scale(0.9, 1.35, 0.6);

    const petalAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    petalAngles.forEach((angle, i) => {
      const petal = new THREE.Mesh(outerPetalGeo, i % 2 === 0 ? petalOuterMat : petalInnerMat);
      const rad = 0.06;
      petal.position.set(Math.sin(angle) * rad, 0.1, Math.cos(angle) * rad);
      petal.rotation.y = angle;
      petal.rotation.x = 0.18; // Flared slightly
      petal.castShadow = true;
      bloomGroup.add(petal);
    });

    // Inner Petals (3 snug central petals)
    const innerPetalGeo = new THREE.SphereGeometry(0.09, 8, 8);
    innerPetalGeo.scale(0.85, 1.25, 0.6);
    for (let j = 0; j < 3; j++) {
      const angle = (j / 3) * Math.PI * 2 + 0.5;
      const innerPetal = new THREE.Mesh(innerPetalGeo, petalInnerMat);
      innerPetal.position.set(Math.sin(angle) * 0.035, 0.11, Math.cos(angle) * 0.035);
      innerPetal.rotation.y = angle;
      innerPetal.rotation.x = 0.08;
      bloomGroup.add(innerPetal);
    }

    // Golden Center Stamen
    const stamenGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const stamen = new THREE.Mesh(stamenGeo, stamenMat);
    stamen.position.set(0, 0.12, 0);
    bloomGroup.add(stamen);

    this.flowerGroup.add(bloomGroup);

    // 4. Warm Fairy Sparkle Point Light
    this.glowLight = new THREE.PointLight(0xff6b81, 0.9, 3.0);
    this.glowLight.position.set(0, 0.6, 0);
    this.group.add(this.glowLight);

    this.group.position.copy(this.position);
  }

  public setCarried(holdPos: THREE.Vector3, playerYaw: number) {
    this.state = TulipState.CARRIED;
    // Hold upright gracefully in Aafraa's hands, facing slightly outward
    this.position.copy(holdPos);
    this.group.position.copy(this.position);
    this.group.rotation.set(0.12, playerYaw, 0.1);
    this.flowerGroup.position.set(0, 0, 0);
  }

  public pickup() {
    this.state = TulipState.CARRIED;
  }

  public drop(dropPos: THREE.Vector3) {
    this.state = TulipState.DROPPED;
    this.position.copy(dropPos);
    this.velocity.set(0, 0, 0);
    this.group.position.copy(this.position);
    this.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
  }

  public updatePhysics(
    delta: number,
    groundCheckFn: (x: number, z: number) => { groundY: number; isValid: boolean }
  ) {
    if (this.state === TulipState.CARRIED) {
      // Carried position is updated directly by gameEngine
      this.glowLight.intensity = 1.0;
      return;
    }

    this.animTimer += delta;

    // Sits peacefully on the ground with gentle fairy hover & soft breathing glow
    const groundInfo = groundCheckFn(this.position.x, this.position.z);
    if (groundInfo.isValid) {
      this.position.y = groundInfo.groundY + 0.04;
    }

    // Gentle floating breathing animation so it looks magical on the grass
    const floatOffset = Math.sin(this.animTimer * 2.5) * 0.035;
    this.flowerGroup.position.y = floatOffset;
    this.flowerGroup.rotation.y = Math.sin(this.animTimer * 1.2) * 0.15;

    this.glowLight.intensity = 0.85 + Math.sin(this.animTimer * 3.0) * 0.35;
    this.group.position.copy(this.position);
  }

  public isNear(playerPos: THREE.Vector3, radius = 2.4): boolean {
    const p = new THREE.Vector2(playerPos.x, playerPos.z);
    const t = new THREE.Vector2(this.position.x, this.position.z);
    return p.distanceTo(t) < radius;
  }
}
