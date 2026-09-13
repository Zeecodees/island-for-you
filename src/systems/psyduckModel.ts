import * as THREE from 'three';
import { PsyduckState } from '../types';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * 3D Interactive Psyduck Head with Rigidbody Physics
 * Features:
 * - Iconic pear-shaped yellow head
 * - Cream-colored duck bill
 * - Wide round eyes with pupils
 * - Three black hair tufts on crown
 * - Physics: velocity, angular velocity, gravity, bounce, friction
 */
export class PsyduckHead {
  public group: THREE.Group;
  public state: PsyduckState = PsyduckState.IDLE;
  
  // Physics parameters
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public angularVelocity: THREE.Vector3;
  public radius = GAME_CONFIG.psyduck.radius;
  public isGrounded = false;
  public customFriction: number | null = null;
  
  // Visual parts for subtle dynamic animation
  private billMesh: THREE.Group;
  private tuftsGroup: THREE.Group;

  constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 1.0, 0)) {
    this.group = new THREE.Group();
    this.group.name = "Psyduck_Head";
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();

    // Stylized Materials
    const yellowSkinMat = new THREE.MeshToonMaterial({
      color: 0xfbd03c, // Warm vibrant Psyduck yellow
    });

    const billMat = new THREE.MeshToonMaterial({
      color: 0xf6e3aa, // Creamy duck bill color
    });

    const eyeWhiteMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
    });

    const eyePupilMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
    });

    const tuftMat = new THREE.MeshToonMaterial({
      color: 0x1a1a1a, // Dark hair tufts
    });

    // --- Main Head Geometry ---
    // Iconic pear shape (wider lower cheek base, tapering gently towards the crown)
    const headGeo = new THREE.SphereGeometry(0.48, 24, 24);
    headGeo.scale(1.0, 1.12, 1.04);
    const headMesh = new THREE.Mesh(headGeo, yellowSkinMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.group.add(headMesh);

    // Cheek fullness
    const cheekGeo = new THREE.SphereGeometry(0.42, 16, 16);
    cheekGeo.scale(1.18, 0.85, 1.0);
    const cheekMesh = new THREE.Mesh(cheekGeo, yellowSkinMat);
    cheekMesh.position.set(0, -0.1, 0.02);
    this.group.add(cheekMesh);

    // --- Iconic Duck Bill ---
    this.billMesh = new THREE.Group();
    this.billMesh.position.set(0, -0.06, 0.42);
    this.group.add(this.billMesh);

    // Upper bill
    const upperBillGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.16, 16);
    upperBillGeo.scale(1.2, 0.7, 1.4);
    upperBillGeo.rotateX(0.12);
    const upperBill = new THREE.Mesh(upperBillGeo, billMat);
    upperBill.castShadow = true;
    this.billMesh.add(upperBill);

    // Lower bill
    const lowerBillGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.12, 14);
    lowerBillGeo.scale(1.1, 0.6, 1.2);
    lowerBillGeo.rotateX(-0.1);
    const lowerBill = new THREE.Mesh(lowerBillGeo, billMat);
    lowerBill.position.set(0, -0.08, -0.02);
    this.billMesh.add(lowerBill);

    // Nostril dots on upper bill
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x7c6d48 });
    const nostrilGeo = new THREE.SphereGeometry(0.02, 6, 6);
    nostrilGeo.scale(0.8, 1, 1.6);
    const leftNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
    leftNostril.position.set(-0.07, 0.08, 0.18);
    this.billMesh.add(leftNostril);

    const rightNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
    rightNostril.position.set(0.07, 0.08, 0.18);
    this.billMesh.add(rightNostril);

    // --- Eyes and Pupils ---
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    eyeGeo.scale(1.0, 1.15, 0.5);

    const pupilGeo = new THREE.SphereGeometry(0.042, 10, 10);
    pupilGeo.scale(1.0, 1.0, 0.4);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.24, 0.16, 0.38);
    leftEye.rotation.y = -0.3;
    leftEye.rotation.x = -0.05;
    this.group.add(leftEye);

    const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    leftPupil.position.set(-0.24, 0.16, 0.44);
    leftPupil.rotation.y = -0.3;
    this.group.add(leftPupil);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.24, 0.16, 0.38);
    rightEye.rotation.y = 0.3;
    rightEye.rotation.x = -0.05;
    this.group.add(rightEye);

    const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    rightPupil.position.set(0.24, 0.16, 0.44);
    rightPupil.rotation.y = 0.3;
    this.group.add(rightPupil);

    // --- Crown Hair Tufts (3 distinct black strands) ---
    this.tuftsGroup = new THREE.Group();
    this.tuftsGroup.position.set(0, 0.54, 0);
    this.group.add(this.tuftsGroup);

    const tuftGeo = new THREE.ConeGeometry(0.045, 0.32, 6);

    // Center tuft
    const centerTuft = new THREE.Mesh(tuftGeo, tuftMat);
    centerTuft.position.set(0, 0.14, 0);
    this.tuftsGroup.add(centerTuft);

    // Left tuft (angled)
    const leftTuft = new THREE.Mesh(tuftGeo, tuftMat);
    leftTuft.position.set(-0.08, 0.12, 0);
    leftTuft.rotation.z = 0.38;
    this.tuftsGroup.add(leftTuft);

    // Right tuft (angled)
    const rightTuft = new THREE.Mesh(tuftGeo, tuftMat);
    rightTuft.position.set(0.08, 0.12, 0);
    rightTuft.rotation.z = -0.38;
    this.tuftsGroup.add(rightTuft);

    // Sync initial position
    this.updateMeshTransform();
  }

  public updatePhysics(
    delta: number,
    groundCheckFn: (x: number, z: number) => { groundY: number; isValid: boolean },
    obstacles: { x: number; z: number; radius: number; height: number; y: number }[] = []
  ) {
    if (this.state === PsyduckState.CARRIED) {
      return;
    }

    const config = GAME_CONFIG.psyduck;

    // Apply gravity
    this.velocity.y -= GAME_CONFIG.player.gravity * delta;

    // Air and ground friction (supports level-specific rolling surfaces like polished bowling lanes)
    const friction = this.customFriction ?? config.friction;
    this.velocity.x *= Math.pow(friction, delta * 60);
    this.velocity.z *= Math.pow(friction, delta * 60);

    // Advance position
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Rotational rolling physics based on horizontal movement
    if (this.state === PsyduckState.THROWN || this.state === PsyduckState.ROLLING) {
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (speed > 0.05) {
        // Roll along moving direction
        const rollAxisX = -this.velocity.z;
        const rollAxisZ = this.velocity.x;
        const rollAngle = (speed / this.radius) * delta;
        this.group.rotateOnWorldAxis(new THREE.Vector3(rollAxisX, 0, rollAxisZ).normalize(), rollAngle);
      }
    }

    // Ground collision detection
    const groundInfo = groundCheckFn(this.position.x, this.position.z);
    const targetY = groundInfo.groundY + this.radius;

    if (this.position.y <= targetY && groundInfo.isValid) {
      this.position.y = targetY;
      
      // Bounce if coming down fast
      if (this.velocity.y < -1.5) {
        this.velocity.y = -this.velocity.y * config.bounceRestitution;
      } else {
        this.velocity.y = 0;
        this.isGrounded = true;
        if (this.state === PsyduckState.THROWN && this.velocity.length() < 1.0) {
          this.state = PsyduckState.IDLE;
        } else if (this.state === PsyduckState.THROWN) {
          this.state = PsyduckState.ROLLING;
        }
      }
    } else {
      this.isGrounded = false;
    }

    // Obstacle sphere/cylinder collisions (e.g. walls, pedestals)
    for (const obs of obstacles) {
      const dx = this.position.x - obs.x;
      const dz = this.position.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = this.radius + obs.radius;

      if (dist < minDist && this.position.y >= obs.y && this.position.y <= obs.y + obs.height) {
        const overlap = minDist - dist;
        const normalX = dx / (dist || 1);
        const normalZ = dz / (dist || 1);

        this.position.x += normalX * overlap;
        this.position.z += normalZ * overlap;

        // Reflect velocity
        const dot = this.velocity.x * normalX + this.velocity.z * normalZ;
        if (dot < 0) {
          this.velocity.x -= 1.6 * dot * normalX;
          this.velocity.z -= 1.6 * dot * normalZ;
        }
      }
    }

    // Gentle tufts wobble when moving
    if (this.velocity.lengthSq() > 0.1) {
      this.tuftsGroup.rotation.z = Math.sin(Date.now() * 0.01) * 0.15;
    }

    this.updateMeshTransform();
  }

  public setCarried(holdPoint: THREE.Vector3, playerYaw: number) {
    this.state = PsyduckState.CARRIED;
    this.position.copy(holdPoint);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.group.position.copy(this.position);
    this.group.rotation.set(0, playerYaw, 0);
  }

  public drop(dropPos: THREE.Vector3, playerForward: THREE.Vector3) {
    this.state = PsyduckState.IDLE;
    this.position.copy(dropPos);
    this.velocity.copy(playerForward).multiplyScalar(1.5);
    this.velocity.y = 1.0;
    this.updateMeshTransform();
  }

  public throw(
    throwPos: THREE.Vector3,
    forward: THREE.Vector3,
    isRunning: boolean,
    customSpeed?: number,
    customUpwardBias?: number
  ) {
    this.state = PsyduckState.THROWN;
    this.position.copy(throwPos);
    
    const baseSpeed = customSpeed ?? GAME_CONFIG.psyduck.throwSpeed;
    const speed = baseSpeed * (isRunning ? GAME_CONFIG.psyduck.runThrowSpeedMultiplier : 1.0);
    this.velocity.copy(forward).multiplyScalar(speed);
    this.velocity.y = customUpwardBias ?? GAME_CONFIG.psyduck.throwUpwardBias;

    this.angularVelocity.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    this.updateMeshTransform();
  }

  public resetTo(position: THREE.Vector3) {
    this.state = PsyduckState.IDLE;
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.customFriction = null;
    this.group.rotation.set(0, 0, 0);
    this.updateMeshTransform();
  }

  private updateMeshTransform() {
    this.group.position.copy(this.position);
  }
}
