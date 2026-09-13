import * as THREE from 'three';
import { IslandProps } from '../systems/islandProps';
import { PsyduckHead } from '../systems/psyduckModel';
import { sound } from '../systems/audio';
import { MusicBoxProp } from '../systems/musicBoxProp';
import { Level1Critters } from '../systems/level1Critters';
import { WatermelonPlant } from '../systems/watermelonPlant';

export class Level1Tutorial {
  public group: THREE.Group;
  public spawnPoint = new THREE.Vector3(0, 1.2, 11);
  public psyduckSpawn = new THREE.Vector3(0, 1.1, -1.5);
  public musicBox: MusicBoxProp;
  public critters: Level1Critters;
  public watermelonPlant: WatermelonPlant;
  
  // Interactive puzzle elements
  private pressurePlateMesh: THREE.Mesh;
  private plateLight: THREE.PointLight;
  private doorLeft: THREE.Mesh;
  private doorRight: THREE.Mesh;
  private portalField: THREE.Mesh;
  
  public isPlateActivated = false;
  public isDoorOpen = false;
  private doorProgress = 0;
  
  // Island collision bounds
  public islandCenter = new THREE.Vector3(0, 0, 0);
  public islandRadius = 18.0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Level_1_Tutorial";

    this.buildIslandGeometry();
    this.buildScenery();
    this.buildTutorialSign();
    this.buildPuzzleAndDoor();

    // Small, beautiful interactive music player object
    this.musicBox = new MusicBoxProp();
    this.musicBox.group.position.set(3.8, 0, 8.8);
    this.musicBox.group.rotation.y = -0.4;
    this.group.add(this.musicBox.group);

    // Cute alive environment elements (bunnies, butterflies, fireflies, glowing mushrooms, songbird)
    this.critters = new Level1Critters();
    this.group.add(this.critters.group);

    // Cute watermelon plant with 3 fixed spawn watermelons
    this.watermelonPlant = new WatermelonPlant(new THREE.Vector3(-8.0, 0, 5.5));
    this.group.add(this.watermelonPlant.group);
  }

  private buildIslandGeometry() {
    // Lush stylized grass plateau
    const grassMat = new THREE.MeshToonMaterial({
      color: 0x1f663c, // Deep rich night grass
    });

    const rockMat = new THREE.MeshToonMaterial({
      color: 0x222a3d, // Night rock underbelly
    });

    // Main island surface (irregular cylinder)
    const topGeo = new THREE.CylinderGeometry(18, 17, 3, 24);
    const topMesh = new THREE.Mesh(topGeo, grassMat);
    topMesh.position.y = -1.5;
    topMesh.receiveShadow = true;
    this.group.add(topMesh);

    // Conical underbelly
    const underGeo = new THREE.ConeGeometry(17.2, 22, 24);
    underGeo.rotateX(Math.PI);
    const underMesh = new THREE.Mesh(underGeo, rockMat);
    underMesh.position.y = -14;
    underMesh.castShadow = true;
    this.group.add(underMesh);

    // Stone trim border along island perimeter
    const rimMat = new THREE.MeshToonMaterial({ color: 0x3d4963 });
    const rimGeo = new THREE.TorusGeometry(18, 0.4, 8, 32);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0;
    this.group.add(rimMesh);
  }

  private buildScenery() {
    // Trees around the perimeter
    const treePositions = [
      { x: -12, z: 6, h: 4.8 },
      { x: -14, z: -3, h: 5.2 },
      { x: 13, z: 8, h: 4.6 },
      { x: 14, z: -4, h: 5.5 },
      { x: -9, z: -11, h: 4.4 },
      { x: 9, z: -11, h: 4.4 },
    ];

    treePositions.forEach(p => {
      const tree = IslandProps.createStylizedTree(0x1a704c, p.h);
      tree.position.set(p.x, 0, p.z);
      this.group.add(tree);
    });

    // Flower patches
    const flowerPositions = [
      { x: -4, z: 9, color: 0xff7675 },
      { x: 4, z: 8, color: 0x74b9ff },
      { x: -6, z: 2, color: 0xfdcb6e },
      { x: 5, z: 1, color: 0xa29bfe },
      { x: -3, z: -7, color: 0xff7675 },
      { x: 3, z: -7, color: 0x55efc4 },
    ];

    flowerPositions.forEach(fp => {
      const flowers = IslandProps.createFlowerPatch(fp.color, 6);
      flowers.position.set(fp.x, 0, fp.z);
      this.group.add(flowers);
    });

    // Decorative rocks
    const rockPositions = [
      { x: -7, z: 7, s: 1.2 },
      { x: 8, z: 4, s: 1.5 },
      { x: -10, z: 0, s: 1.8 },
      { x: 10, z: -2, s: 1.1 },
      { x: -5, z: -12, s: 1.4 },
      { x: 5, z: -12, s: 1.4 },
    ];

    rockPositions.forEach(rp => {
      const rock = IslandProps.createRock(rp.s);
      rock.position.set(rp.x, 0, rp.z);
      this.group.add(rock);
    });

    // Cozy Lantern Posts
    const lantern1 = IslandProps.createLanternPost(0xffd57e);
    lantern1.position.set(-3.5, 0, 11);
    this.group.add(lantern1);

    const lantern2 = IslandProps.createLanternPost(0xffd57e);
    lantern2.position.set(3.5, 0, 11);
    this.group.add(lantern2);

    const lantern3 = IslandProps.createLanternPost(0x7ed6df);
    lantern3.position.set(-4.5, 0, -12.5);
    this.group.add(lantern3);

    const lantern4 = IslandProps.createLanternPost(0x7ed6df);
    lantern4.position.set(4.5, 0, -12.5);
    this.group.add(lantern4);

    // Pedestal where Psyduck head initially rests
    const pedGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.45, 16);
    const pedMat = new THREE.MeshToonMaterial({ color: 0x4a5568 });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.set(0, 0.22, -1.5);
    pedestal.receiveShadow = true;
    this.group.add(pedestal);

    // Glowing aura circle on pedestal
    const auraGeo = new THREE.RingGeometry(0.2, 0.9, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffea79,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.46, -1.5);
    this.group.add(aura);
  }

  private buildTutorialSign() {
    const sign = IslandProps.createSignpost([
      "WASD — Move",
      "Mouse — Look Around",
      "SPACE — Jump",
      "SPACE x2 — Double Jump",
      "E — Pick up / Drop",
      "Run + E — Throw",
    ]);
    sign.position.set(-4.2, 0, 8.5);
    sign.rotation.y = 0.35;
    this.group.add(sign);
  }

  private buildPuzzleAndDoor() {
    // --- Glowing Pressure Plate ---
    const plateGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.2, 24);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.pressurePlateMesh = new THREE.Mesh(plateGeo, plateMat);
    this.pressurePlateMesh.position.set(0, 0.1, -7.5);
    this.pressurePlateMesh.receiveShadow = true;
    this.group.add(this.pressurePlateMesh);

    // Plate runes / ring
    const ringGeo = new THREE.RingGeometry(0.7, 1.4, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38ada9, // Cyan rune glow
      side: THREE.DoubleSide,
    });
    const runeRing = new THREE.Mesh(ringGeo, ringMat);
    runeRing.position.set(0, 0.21, -7.5);
    this.group.add(runeRing);

    this.plateLight = new THREE.PointLight(0x38ada9, 2.0, 7);
    this.plateLight.position.set(0, 0.5, -7.5);
    this.group.add(this.plateLight);

    // --- Grand Ancient Archway & Doors ---
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -14);
    this.group.add(archGroup);

    const stoneMat = new THREE.MeshToonMaterial({ color: 0x3d4963 });
    const woodDoorMat = new THREE.MeshToonMaterial({ color: 0x54382c });

    // Left Pillar
    const pillarGeo = new THREE.BoxGeometry(1.4, 7.5, 1.4);
    const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
    leftPillar.position.set(-3.2, 3.75, 0);
    leftPillar.castShadow = true;
    archGroup.add(leftPillar);

    // Right Pillar
    const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
    rightPillar.position.set(3.2, 3.75, 0);
    rightPillar.castShadow = true;
    archGroup.add(rightPillar);

    // Lintel (Top Arch)
    const lintelGeo = new THREE.BoxGeometry(8.0, 1.5, 1.8);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, 7.5, 0);
    lintel.castShadow = true;
    archGroup.add(lintel);

    // Left Sliding Door
    const doorGeo = new THREE.BoxGeometry(2.5, 6.0, 0.4);
    this.doorLeft = new THREE.Mesh(doorGeo, woodDoorMat);
    this.doorLeft.position.set(-1.25, 3.0, 0);
    this.doorLeft.castShadow = true;
    archGroup.add(this.doorLeft);

    // Right Sliding Door
    this.doorRight = new THREE.Mesh(doorGeo, woodDoorMat);
    this.doorRight.position.set(1.25, 3.0, 0);
    this.doorRight.castShadow = true;
    archGroup.add(this.doorRight);

    // Glowing portal field inside doorway once open
    const portalGeo = new THREE.PlaneGeometry(5.0, 6.0);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x81ecec,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    this.portalField = new THREE.Mesh(portalGeo, portalMat);
    this.portalField.position.set(0, 3.0, -0.2);
    this.portalField.visible = false;
    archGroup.add(this.portalField);
  }

  public checkPuzzle(psyduck: PsyduckHead): boolean {
    const platePos = new THREE.Vector3(0, 0.2, -7.5);
    const distToPlate = new THREE.Vector2(psyduck.position.x, psyduck.position.z)
      .distanceTo(new THREE.Vector2(platePos.x, platePos.z));

    const wasActivated = this.isPlateActivated;
    // Psyduck must be on or very close to the pressure plate
    if (distToPlate < 1.7 && Math.abs(psyduck.position.y - platePos.y) < 1.8) {
      this.isPlateActivated = true;
      this.pressurePlateMesh.position.y = 0.02; // pressed down
      this.plateLight.color.setHex(0xf1c40f); // Bright gold when activated
      this.plateLight.intensity = 3.5;

      if (!wasActivated) {
        sound.playDoorOpen();
      }
      this.isDoorOpen = true;
    }

    return this.isDoorOpen;
  }

  public update(delta: number, playerPos?: THREE.Vector3) {
    this.musicBox.update(delta);
    this.watermelonPlant.update(delta);
    if (playerPos) {
      this.critters.update(delta, playerPos);
    }

    if (this.isDoorOpen && this.doorProgress < 1.0) {
      this.doorProgress = Math.min(1.0, this.doorProgress + delta * 0.9);
      // Slide doors outward
      this.doorLeft.position.x = -1.25 - this.doorProgress * 2.1;
      this.doorRight.position.x = 1.25 + this.doorProgress * 2.1;

      if (this.doorProgress > 0.4) {
        this.portalField.visible = true;
      }
    }
  }

  public reset() {
    this.isPlateActivated = false;
    this.isDoorOpen = false;
    this.doorProgress = 0;
    this.doorLeft.position.x = -1.25;
    this.doorRight.position.x = 1.25;
    this.portalField.visible = false;
    this.pressurePlateMesh.position.y = 0.1;
    this.plateLight.color.setHex(0x38ada9);
    this.plateLight.intensity = 1.5;
    this.setMusicBoxActive(false);
    this.critters.reset();
    this.watermelonPlant.reset();
  }

  public isNearMusicBox(playerPos: THREE.Vector3): boolean {
    const boxPos = new THREE.Vector3(3.8, 0, 8.8);
    // Player distance on XZ plane to music box
    const dist = Math.hypot(playerPos.x - boxPos.x, playerPos.z - boxPos.z);
    return dist < 2.4;
  }

  public setMusicBoxActive(active: boolean) {
    this.musicBox.setActive(active);
  }

  public isPlayerAtDoor(playerPos: THREE.Vector3): boolean {
    if (!this.isDoorOpen) return false;
    return Math.abs(playerPos.x) < 2.5 && playerPos.z <= -13.5 && playerPos.z >= -16.0;
  }

  public getGroundHeight(x: number, z: number): { groundY: number; isValid: boolean } {
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    // Near pedestal
    const distToPed = Math.sqrt(x * x + (z + 1.5) * (z + 1.5));
    if (distToPed < 1.1) {
      return { groundY: 0.45, isValid: true };
    }

    // Pathway extending through open door
    if (this.isDoorOpen && Math.abs(x) < 3.0 && z < -14 && z > -24) {
      return { groundY: 0, isValid: true };
    }

    // Main island surface
    if (distFromCenter <= this.islandRadius) {
      return { groundY: 0, isValid: true };
    }

    return { groundY: -50, isValid: false };
  }
}
