import * as THREE from 'three';
import { PsyduckState } from '../types';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * FetchToy
 * Dedicated throwable play object for Level 3 fetch interaction.
 * Living Psyduck's actual head remains permanently attached to his body.
 *
 * Features:
 * - Playful spherical toy with colorful panels and starry details
 * - Physics: velocity, angular velocity, rolling, bounce, friction, ground clamping
 * - Carried, thrown, rolling, and grounded states
 * - Distance tracking to detect weak or bad throws
 */
export class FetchToy {
  public group: THREE.Group;
  public state: PsyduckState = PsyduckState.IDLE;

  // Physics parameters
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public angularVelocity: THREE.Vector3;
  public radius = 0.32;
  public isGrounded = false;

  // Throw stats
  public throwOrigin = new THREE.Vector3();
  public throwDistance = 0;

  // Visuals
  private ballMesh: THREE.Mesh;
  private starMeshes: THREE.Mesh[] = [];
  private glowLight: THREE.PointLight;

  constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(1.6, 1.2, -14.8)) {
    this.group = new THREE.Group();
    this.group.name = 'Fetch_Toy_Ball';
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();

    // Stylized toon materials
    const ballMat = new THREE.MeshToonMaterial({
      color: 0xff6b81, // Vibrant coral pink
    });
    const stripeMat = new THREE.MeshToonMaterial({
      color: 0xffd32a, // Bright cheerful yellow
    });
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Base Sphere
    const ballGeo = new THREE.SphereGeometry(this.radius, 20, 20);
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.receiveShadow = true;
    this.group.add(this.ballMesh);

    // Decorative equatorial stripe band
    const stripeGeo = new THREE.TorusGeometry(this.radius + 0.005, 0.04, 8, 24);
    stripeGeo.rotateX(Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    this.group.add(stripe);

    // Star badges on opposite sides
    const starGeo = new THREE.ConeGeometry(0.09, 0.04, 5);
    starGeo.rotateX(Math.PI / 2);
    const star1 = new THREE.Mesh(starGeo, starMat);
    star1.position.set(0, 0, this.radius + 0.01);
    this.group.add(star1);
    this.starMeshes.push(star1);

    const star2 = new THREE.Mesh(starGeo, starMat);
    star2.position.set(0, 0, -(this.radius + 0.01));
    star2.rotateY(Math.PI);
    this.group.add(star2);
    this.starMeshes.push(star2);

    // Subtle gentle glow so ball is always easy to spot on the island grass
    this.glowLight = new THREE.PointLight(0xff6b81, 0.8, 2.5);
    this.glowLight.position.set(0, 0, 0);
    this.group.add(this.glowLight);

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

    // Gravity
    this.velocity.y -= GAME_CONFIG.player.gravity * delta;

    // Friction
    this.velocity.x *= Math.pow(config.friction, delta * 60);
    this.velocity.z *= Math.pow(config.friction, delta * 60);

    // Advance position
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Track distance from throw origin
    if (this.state === PsyduckState.THROWN || this.state === PsyduckState.ROLLING) {
      const dx = this.position.x - this.throwOrigin.x;
      const dz = this.position.z - this.throwOrigin.z;
      this.throwDistance = Math.sqrt(dx * dx + dz * dz);

      // Rolling rotation
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (speed > 0.05) {
        const rollAxisX = -this.velocity.z;
        const rollAxisZ = this.velocity.x;
        const rollAngle = (speed / this.radius) * delta;
        this.group.rotateOnWorldAxis(new THREE.Vector3(rollAxisX, 0, rollAxisZ).normalize(), rollAngle);
      }
    }

    // Ground collision
    const groundInfo = groundCheckFn(this.position.x, this.position.z);
    const targetY = groundInfo.groundY + this.radius;

    if (this.position.y <= targetY && groundInfo.isValid) {
      this.position.y = targetY;

      // Bounce
      if (this.velocity.y < -1.5) {
        this.velocity.y = -this.velocity.y * (config.bounceRestitution * 0.9);
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

    // Obstacle collisions
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

        const dot = this.velocity.x * normalX + this.velocity.z * normalZ;
        if (dot < 0) {
          this.velocity.x -= 1.6 * dot * normalX;
          this.velocity.z -= 1.6 * dot * normalZ;
        }
      }
    }

    // Gentle pulse
    const pulse = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
    this.glowLight.intensity = pulse;

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

  public drop(dropPos: THREE.Vector3, playerForward: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.state = PsyduckState.IDLE;
    this.position.copy(dropPos);
    this.velocity.copy(playerForward).multiplyScalar(1.5);
    this.velocity.y = 1.0;
    this.updateMeshTransform();
  }

  public throw(throwPos: THREE.Vector3, forward: THREE.Vector3, isRunning: boolean) {
    this.state = PsyduckState.THROWN;
    this.position.copy(throwPos);
    this.throwOrigin.copy(throwPos);
    this.throwDistance = 0;

    const speed = GAME_CONFIG.psyduck.throwSpeed * (isRunning ? GAME_CONFIG.psyduck.runThrowSpeedMultiplier : 1.0);
    this.velocity.copy(forward).multiplyScalar(speed);
    this.velocity.y = GAME_CONFIG.psyduck.throwUpwardBias;

    this.angularVelocity.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 5
    );

    this.updateMeshTransform();
  }

  public resetTo(pos: THREE.Vector3) {
    this.state = PsyduckState.IDLE;
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.isGrounded = false;
    this.throwDistance = 0;
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
  }

  private updateMeshTransform() {
    this.group.position.copy(this.position);
  }
}
