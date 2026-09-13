import * as THREE from 'three';

/**
 * Interactive 3D Music Player / Magical Music Box for Level 1.
 * Designed to naturally blend into the nighttime fantasy floating island:
 * - Carved stone plinth base with celestial brass ring
 * - Stylized dark mahogany music box cabinet with gilded brass trims
 * - Rotating vinyl / brass turntable on top
 * - Glowing celestial crystal resonator hovering above
 * - Stylized brass acoustic gramophone horn
 * - Floating golden 3D musical notes that dance and swirl when music is playing
 * - Dynamic warm glowing point light with gentle pulse animation
 */
export class MusicBoxProp {
  public group: THREE.Group;
  public isActive = false;

  private turntable: THREE.Mesh;
  private crystal: THREE.Mesh;
  private glowLight: THREE.PointLight;
  private notesGroup: THREE.Group;
  private musicalNotes: THREE.Mesh[] = [];
  private auraRing: THREE.Mesh;
  private time = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Carved stone plinth base
    const plinthMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
    const plinthGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.65, 16);
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.325;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    this.group.add(plinth);

    // Brass accent ring at plinth top
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ringGeo = new THREE.TorusGeometry(0.72, 0.04, 12, 24);
    ringGeo.rotateX(Math.PI / 2);
    const brassRing = new THREE.Mesh(ringGeo, ringMat);
    brassRing.position.y = 0.65;
    this.group.add(brassRing);

    // Glowing ground aura circle
    const auraGeo = new THREE.RingGeometry(0.3, 1.2, 32);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x64b5f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    this.auraRing = new THREE.Mesh(auraGeo, auraMat);
    this.auraRing.position.y = 0.02;
    this.group.add(this.auraRing);

    // 2. Music Box Body (Ornate dark polished wood cabinet)
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x3d1c06,
      roughness: 0.4,
      metalness: 0.2,
    });
    const boxGeo = new THREE.BoxGeometry(0.65, 0.32, 0.52);
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.81;
    box.castShadow = true;
    this.group.add(box);

    // Golden corner plates
    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      roughness: 0.2,
      metalness: 0.85,
    });
    const corners = [
      { x: -0.32, z: -0.25 },
      { x: 0.32, z: -0.25 },
      { x: -0.32, z: 0.25 },
      { x: 0.32, z: 0.25 },
    ];
    corners.forEach(c => {
      const cGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.33, 8);
      const cMesh = new THREE.Mesh(cGeo, cornerMat);
      cMesh.position.set(c.x, 0.81, c.z);
      this.group.add(cMesh);
    });

    // 3. Rotating Turntable / Vinyl Record on top
    const turntableGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.25,
      metalness: 0.7,
    });
    this.turntable = new THREE.Mesh(turntableGeo, turntableMat);
    this.turntable.position.set(-0.06, 0.985, 0);
    this.group.add(this.turntable);

    // Golden center label of the record
    const labelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.035, 16);
    const labelMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    this.turntable.add(labelMesh);

    // 4. Stylized Brass Gramophone Horn
    const hornGroup = new THREE.Group();
    hornGroup.position.set(0.18, 0.98, -0.1);

    // Arm
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
    const armMesh = new THREE.Mesh(armGeo, cornerMat);
    armMesh.position.set(0, 0.12, 0);
    hornGroup.add(armMesh);

    // Flared cone/bell
    const bellGeo = new THREE.ConeGeometry(0.18, 0.35, 16, 1, true);
    bellGeo.rotateX(Math.PI / 3);
    const bellMesh = new THREE.Mesh(bellGeo, cornerMat);
    bellMesh.position.set(0, 0.26, 0.1);
    hornGroup.add(bellMesh);
    this.group.add(hornGroup);

    // 5. Floating Celestial Crystal Resonator (hovering slightly above the center)
    const crystalGeo = new THREE.OctahedronGeometry(0.12, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x74b9ff,
      emissive: 0x0984e3,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystal.position.set(-0.06, 1.25, 0);
    this.group.add(this.crystal);

    // 6. Floating 3D Musical Notes Group
    this.notesGroup = new THREE.Group();
    this.notesGroup.position.set(-0.06, 1.35, 0);
    this.notesGroup.visible = false;
    this.group.add(this.notesGroup);

    // Create stylized musical note meshes
    const noteCount = 4;
    const noteMat = new THREE.MeshBasicMaterial({ color: 0xffeaa7 });
    for (let i = 0; i < noteCount; i++) {
      const noteObj = this.createStylizedMusicalNote(noteMat);
      const angle = (i / noteCount) * Math.PI * 2;
      noteObj.position.set(Math.cos(angle) * 0.45, (i % 2) * 0.18, Math.sin(angle) * 0.45);
      noteObj.scale.set(0.65, 0.65, 0.65);
      this.notesGroup.add(noteObj);
      this.musicalNotes.push(noteObj);
    }

    // 7. Ambient / Interaction Point Light
    this.glowLight = new THREE.PointLight(0x74b9ff, 0.8, 5);
    this.glowLight.position.set(-0.06, 1.3, 0);
    this.group.add(this.glowLight);
  }

  private createStylizedMusicalNote(material: THREE.Material): THREE.Mesh {
    // A stylized eighth note (head + stem + flag)
    const noteGroup = new THREE.Group();

    // Head (tilted oval)
    const headGeo = new THREE.SphereGeometry(0.08, 8, 8);
    headGeo.scale(1.2, 0.8, 0.5);
    headGeo.rotateZ(0.4);
    const head = new THREE.Mesh(headGeo, material);
    noteGroup.add(head);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6);
    const stem = new THREE.Mesh(stemGeo, material);
    stem.position.set(0.07, 0.14, 0);
    noteGroup.add(stem);

    // Flag
    const flagGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const flag = new THREE.Mesh(flagGeo, material);
    flag.position.set(0.11, 0.25, 0);
    flag.rotation.z = -0.3;
    noteGroup.add(flag);

    // Combine into single wrapper
    const wrapper = new THREE.Mesh();
    wrapper.add(noteGroup);
    return wrapper;
  }

  public setActive(active: boolean) {
    this.isActive = active;
    if (active) {
      this.notesGroup.visible = true;
      this.glowLight.color.setHex(0xffd166);
      this.glowLight.intensity = 1.6;
      this.glowLight.distance = 7;
      (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(0xffd166);
      (this.crystal.material as THREE.MeshStandardMaterial).emissive.setHex(0xffb142);
      (this.crystal.material as THREE.MeshStandardMaterial).color.setHex(0xffd32a);
    } else {
      this.notesGroup.visible = false;
      this.glowLight.color.setHex(0x74b9ff);
      this.glowLight.intensity = 0.8;
      this.glowLight.distance = 5;
      (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(0x64b5f6);
      (this.crystal.material as THREE.MeshStandardMaterial).emissive.setHex(0x0984e3);
      (this.crystal.material as THREE.MeshStandardMaterial).color.setHex(0x74b9ff);
    }
  }

  public update(delta: number) {
    this.time += delta;

    // Floating crystal bob & spin
    this.crystal.position.y = 1.25 + Math.sin(this.time * 2.5) * 0.04;
    this.crystal.rotation.y += delta * 1.2;

    if (this.isActive) {
      // Rotate turntable record
      this.turntable.rotation.y += delta * 3.5;

      // Swirl floating musical notes around the player
      this.notesGroup.rotation.y += delta * 1.5;
      this.musicalNotes.forEach((note, idx) => {
        note.position.y = (idx % 2 === 0 ? 0.0 : 0.18) + Math.sin(this.time * 3.0 + idx) * 0.08;
        note.rotation.z = Math.sin(this.time * 2.0 + idx) * 0.2;
      });

      // Warm pulsing starlight
      this.glowLight.intensity = 1.5 + Math.sin(this.time * 4.0) * 0.4;
      this.auraRing.scale.setScalar(1.0 + Math.sin(this.time * 3.0) * 0.06);
    } else {
      // Gentle idle breath
      this.glowLight.intensity = 0.75 + Math.sin(this.time * 2.0) * 0.25;
      this.auraRing.scale.setScalar(1.0 + Math.sin(this.time * 1.5) * 0.03);
    }
  }
}
