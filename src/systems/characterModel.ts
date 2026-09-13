import * as THREE from 'three';

/**
 * Procedural 3D Character Model: Aafraa
 * Aesthetic: Stylized, polished 3D indie figurine with 2.8-heads-tall proportions.
 * Constraint: Completely BLANK face (no eyes, mouth, nose, eyebrows, lips, blush).
 * Features: Rich sculpted layered hair, cozy stylish clothing, boots, and rigged joints.
 */
export class AafraaCharacter {
  public group: THREE.Group;
  
  // Bone / joint references for animation
  private torso: THREE.Group;
  private headGroup: THREE.Group;
  private hairGroup: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftForearm: THREE.Group;
  private rightForearm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  
  // Animation timing
  private walkTime = 0;
  private isCarryingPsyduck = false;
  private isSitting = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Aafraa_Player";

    // Common stylized materials
    const skinMaterial = new THREE.MeshToonMaterial({
      color: 0xfdfaf7, // Clean, smooth, porcelain light surface (Completely blank face)
    });

    const hairMaterial = new THREE.MeshToonMaterial({
      color: 0x241715, // Rich dark espresso / chestnut stylized hair
    });

    const ribbonMaterial = new THREE.MeshToonMaterial({
      color: 0xe06d87, // Soft rose / blush pink hair accessory
    });

    const sweaterMaterial = new THREE.MeshToonMaterial({
      color: 0x6c5ce7, // Elegant soft lavender-violet cozy sweater
    });

    const collarMaterial = new THREE.MeshToonMaterial({
      color: 0xf8f9fa, // Warm cream ribbed collar
    });

    const skirtMaterial = new THREE.MeshToonMaterial({
      color: 0x2d3436, // Deep charcoal pleated skirt
    });

    const tightsMaterial = new THREE.MeshToonMaterial({
      color: 0x1e272e, // Dark sheer tights
    });

    const bootMaterial = new THREE.MeshToonMaterial({
      color: 0x533527, // Cute warm brown leather ankle boots
    });

    const bootTrimMaterial = new THREE.MeshToonMaterial({
      color: 0xffffff, // White boot cuffs
    });

    // --- Torso & Pelvis ---
    this.torso = new THREE.Group();
    this.torso.position.y = 0.85;
    this.group.add(this.torso);

    // Main Sweater Body
    const sweaterGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.52, 16);
    const sweaterMesh = new THREE.Mesh(sweaterGeo, sweaterMaterial);
    sweaterMesh.castShadow = true;
    this.torso.add(sweaterMesh);

    // Collar / Scarf ring
    const collarGeo = new THREE.TorusGeometry(0.22, 0.08, 10, 20);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, collarMaterial);
    collarMesh.position.y = 0.26;
    this.torso.add(collarMesh);

    // Skirt
    const skirtGeo = new THREE.ConeGeometry(0.42, 0.3, 16, 1, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMaterial);
    skirtMesh.position.y = -0.25;
    skirtMesh.castShadow = true;
    this.torso.add(skirtMesh);

    // --- Head Group ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.42;
    this.torso.add(this.headGroup);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.16, 12);
    const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
    neckMesh.position.y = -0.06;
    this.headGroup.add(neckMesh);

    // BLANK FACE & HEAD SHAPE:
    // Polished, smooth stylized head (spherical with slight jaw taper)
    // Strictly NO eyes, pupils, eyebrows, eyelashes, nose, mouth, lips, blush, or facial marks.
    const headGeo = new THREE.SphereGeometry(0.34, 24, 24);
    headGeo.scale(1.0, 1.15, 1.05); // slight stylized oval
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // --- Sculpted Detailed Hair ---
    this.hairGroup = new THREE.Group();
    this.headGroup.add(this.hairGroup);

    // Hair base cap (volume at crown and back)
    const hairCapGeo = new THREE.SphereGeometry(0.36, 18, 18);
    hairCapGeo.scale(1.04, 1.14, 1.08);
    const hairCapMesh = new THREE.Mesh(hairCapGeo, hairMaterial);
    hairCapMesh.position.set(0, 0.06, -0.04);
    this.hairGroup.add(hairCapMesh);

    // Side bangs / hair locks framing face
    const leftBangGeo = new THREE.CylinderGeometry(0.06, 0.14, 0.48, 8);
    leftBangGeo.rotateZ(0.2);
    const leftBang = new THREE.Mesh(leftBangGeo, hairMaterial);
    leftBang.position.set(-0.28, -0.08, 0.16);
    this.hairGroup.add(leftBang);

    const rightBangGeo = new THREE.CylinderGeometry(0.06, 0.14, 0.52, 8);
    rightBangGeo.rotateZ(-0.2);
    const rightBang = new THREE.Mesh(rightBangGeo, hairMaterial);
    rightBang.position.set(0.28, -0.09, 0.16);
    this.hairGroup.add(rightBang);

    // Flowing hair strands at the back / shoulders
    const backHairGeo = new THREE.CylinderGeometry(0.22, 0.38, 0.65, 12);
    const backHair = new THREE.Mesh(backHairGeo, hairMaterial);
    backHair.position.set(0, -0.22, -0.16);
    backHair.rotation.x = -0.18;
    this.hairGroup.add(backHair);

    // Cute hair ribbon / accessory on side
    const ribbonBowGeo = new THREE.SphereGeometry(0.09, 10, 10);
    ribbonBowGeo.scale(1.5, 0.8, 0.8);
    const ribbonBow = new THREE.Mesh(ribbonBowGeo, ribbonMaterial);
    ribbonBow.position.set(-0.32, 0.22, 0.12);
    ribbonBow.rotation.z = 0.4;
    this.hairGroup.add(ribbonBow);

    // --- Arms ---
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.16, 0);
    this.torso.add(this.leftArm);

    const upperArmGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10);
    const upperArmLeftMesh = new THREE.Mesh(upperArmGeo, sweaterMaterial);
    upperArmLeftMesh.position.y = -0.13;
    upperArmLeftMesh.castShadow = true;
    this.leftArm.add(upperArmLeftMesh);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.y = -0.26;
    this.leftArm.add(this.leftForearm);

    const forearmLeftMesh = new THREE.Mesh(upperArmGeo, sweaterMaterial);
    forearmLeftMesh.position.y = -0.12;
    this.leftForearm.add(forearmLeftMesh);

    const handGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const leftHand = new THREE.Mesh(handGeo, skinMaterial);
    leftHand.position.y = -0.26;
    this.leftForearm.add(leftHand);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.16, 0);
    this.torso.add(this.rightArm);

    const upperArmRightMesh = new THREE.Mesh(upperArmGeo, sweaterMaterial);
    upperArmRightMesh.position.y = -0.13;
    upperArmRightMesh.castShadow = true;
    this.rightArm.add(upperArmRightMesh);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.y = -0.26;
    this.rightArm.add(this.rightForearm);

    const forearmRightMesh = new THREE.Mesh(upperArmGeo, sweaterMaterial);
    forearmRightMesh.position.y = -0.12;
    this.rightForearm.add(forearmRightMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMaterial);
    rightHand.position.y = -0.26;
    this.rightForearm.add(rightHand);

    // --- Legs ---
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, -0.32, 0);
    this.torso.add(this.leftLeg);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.38, 10);
    const leftLegMesh = new THREE.Mesh(legGeo, tightsMaterial);
    leftLegMesh.position.y = -0.18;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Left Boot
    const bootGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.22, 12);
    const leftBoot = new THREE.Mesh(bootGeo, bootMaterial);
    leftBoot.position.set(0, -0.36, 0.04);
    this.leftLeg.add(leftBoot);

    const bootToeGeo = new THREE.SphereGeometry(0.1, 10, 10);
    bootToeGeo.scale(1, 0.6, 1.4);
    const leftToe = new THREE.Mesh(bootToeGeo, bootMaterial);
    leftToe.position.set(0, -0.42, 0.08);
    this.leftLeg.add(leftToe);

    const leftCuffGeo = new THREE.TorusGeometry(0.1, 0.03, 8, 14);
    leftCuffGeo.rotateX(Math.PI / 2);
    const leftCuff = new THREE.Mesh(leftCuffGeo, bootTrimMaterial);
    leftCuff.position.set(0, -0.27, 0.04);
    this.leftLeg.add(leftCuff);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, -0.32, 0);
    this.torso.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(legGeo, tightsMaterial);
    rightLegMesh.position.y = -0.18;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    // Right Boot
    const rightBoot = new THREE.Mesh(bootGeo, bootMaterial);
    rightBoot.position.set(0, -0.36, 0.04);
    this.rightLeg.add(rightBoot);

    const rightToe = new THREE.Mesh(bootToeGeo, bootMaterial);
    rightToe.position.set(0, -0.42, 0.08);
    this.rightLeg.add(rightToe);

    const rightCuff = new THREE.Mesh(leftCuffGeo, bootTrimMaterial);
    rightCuff.position.set(0, -0.27, 0.04);
    this.rightLeg.add(rightCuff);
  }

  public setCarrying(carrying: boolean) {
    this.isCarryingPsyduck = carrying;
  }

  public setSitting(sitting: boolean) {
    this.isSitting = sitting;
  }

  public updateAnimation(
    params: {
      isMoving: boolean;
      isRunning: boolean;
      isGrounded: boolean;
      verticalVelocity: number;
    },
    delta: number
  ) {
    const { isMoving, isRunning, isGrounded } = params;
    const animSpeed = isRunning ? 16 : 10;

    if (this.isSitting) {
      // Relaxed seated pose on scenic bench
      this.walkTime += delta * 2.0;
      const breath = Math.sin(this.walkTime) * 0.015;
      this.torso.position.y = 0.58 + breath;
      this.headGroup.rotation.y = Math.sin(this.walkTime * 0.4) * 0.05;
      this.headGroup.rotation.x = -0.04; // slight tilt up toward the moon/stars

      // Legs bent at hips forward onto bench
      this.leftLeg.rotation.x = -1.25;
      this.rightLeg.rotation.x = -1.25;

      if (this.isCarryingPsyduck) {
        // Cradling flower or object gently while seated
        this.leftArm.rotation.x = -0.95;
        this.rightArm.rotation.x = -0.95;
        this.leftArm.rotation.z = -0.15;
        this.rightArm.rotation.z = 0.15;
        this.leftForearm.rotation.x = -0.65;
        this.rightForearm.rotation.x = -0.65;
        this.leftForearm.rotation.y = 0.3;
        this.rightForearm.rotation.y = -0.3;
      } else {
        // Arms resting comfortably in lap
        this.leftArm.rotation.x = -0.55;
        this.rightArm.rotation.x = -0.55;
        this.leftArm.rotation.z = 0.18;
        this.rightArm.rotation.z = -0.18;
        this.leftForearm.rotation.x = -0.45;
        this.rightForearm.rotation.x = -0.45;
      }
      return;
    }

    if (isMoving && isGrounded) {
      this.walkTime += delta * animSpeed;
      const legAngle = Math.sin(this.walkTime) * (isRunning ? 0.75 : 0.55);
      
      // Swing legs
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Vertical bounce
      this.torso.position.y = 0.85 + Math.abs(Math.sin(this.walkTime * 2)) * 0.06;
      this.hairGroup.rotation.x = Math.sin(this.walkTime) * 0.06;

      if (!this.isCarryingPsyduck) {
        // Swing arms naturally
        this.leftArm.rotation.x = -legAngle * 0.9;
        this.rightArm.rotation.x = legAngle * 0.9;
        this.leftArm.rotation.z = 0.1;
        this.rightArm.rotation.z = -0.1;
        this.leftForearm.rotation.x = -0.2;
        this.rightForearm.rotation.x = -0.2;
      }
    } else if (!isGrounded) {
      // In air / jumping
      this.leftLeg.rotation.x = 0.35;
      this.rightLeg.rotation.x = 0.25;
      this.torso.position.y = 0.88;

      if (!this.isCarryingPsyduck) {
        this.leftArm.rotation.x = -0.8;
        this.rightArm.rotation.x = -0.8;
        this.leftArm.rotation.z = 0.4;
        this.rightArm.rotation.z = -0.4;
      }
    } else {
      // Idle breathing
      this.walkTime += delta * 2.5;
      const breath = Math.sin(this.walkTime) * 0.02;
      this.torso.position.y = 0.85 + breath;
      this.headGroup.rotation.y = Math.sin(this.walkTime * 0.5) * 0.04;

      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;

      if (!this.isCarryingPsyduck) {
        this.leftArm.rotation.x = Math.sin(this.walkTime) * 0.05;
        this.rightArm.rotation.x = -Math.sin(this.walkTime) * 0.05;
        this.leftArm.rotation.z = 0.12;
        this.rightArm.rotation.z = -0.12;
        this.leftForearm.rotation.x = -0.15;
        this.rightForearm.rotation.x = -0.15;
      }
    }

    // Carry pose: Arms cradled forward holding the Psyduck head
    if (this.isCarryingPsyduck) {
      this.leftArm.rotation.x = -1.15;
      this.rightArm.rotation.x = -1.15;
      this.leftArm.rotation.z = -0.28;
      this.rightArm.rotation.z = 0.28;
      this.leftForearm.rotation.x = -0.7;
      this.rightForearm.rotation.x = -0.7;
      this.leftForearm.rotation.y = 0.35;
      this.rightForearm.rotation.y = -0.35;
    }
  }

  public getHoldPointWorldPosition(targetVec: THREE.Vector3) {
    if (this.isSitting) {
      // In front of lap while seated on the bench
      targetVec.set(0, 0.72, 0.52);
    } else {
      // In front of chest while standing
      targetVec.set(0, 0.88, 0.65);
    }
    this.group.localToWorld(targetVec);
  }
}
