import * as THREE from 'three';

/**
 * Reusable stylized 3D environment props:
 * - Bulbous cloud-like trees
 * - Glowing flowers & fairy mushrooms
 * - Stylized rocks and cobblestones
 * - Cozy wooden lanterns on rustic posts
 * - Signposts with readable canvas textures
 */
export class IslandProps {
  public static createStylizedTree(
    color: number = 0x27ae60,
    height: number = 4.5,
    trunkColor: number = 0x5d4037
  ): THREE.Group {
    const tree = new THREE.Group();

    // Wood trunk with slight taper
    const trunkMat = new THREE.MeshToonMaterial({ color: trunkColor });
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.42, height * 0.5, 10);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = height * 0.25;
    trunk.castShadow = true;
    tree.add(trunk);

    // Bulbous layered foliage canopies (indie stylized aesthetic)
    const foliageMat = new THREE.MeshToonMaterial({ color });

    const mainBlobGeo = new THREE.SphereGeometry(height * 0.38, 12, 12);
    mainBlobGeo.scale(1.2, 0.9, 1.1);
    const mainBlob = new THREE.Mesh(mainBlobGeo, foliageMat);
    mainBlob.position.y = height * 0.65;
    mainBlob.castShadow = true;
    tree.add(mainBlob);

    const topBlobGeo = new THREE.SphereGeometry(height * 0.28, 10, 10);
    const topBlob = new THREE.Mesh(topBlobGeo, foliageMat);
    topBlob.position.set(0.2, height * 0.88, -0.1);
    topBlob.castShadow = true;
    tree.add(topBlob);

    const sideBlobGeo = new THREE.SphereGeometry(height * 0.24, 8, 8);
    const sideBlob = new THREE.Mesh(sideBlobGeo, foliageMat);
    sideBlob.position.set(-height * 0.22, height * 0.58, 0.2);
    sideBlob.castShadow = true;
    tree.add(sideBlob);

    return tree;
  }

  public static createFlowerPatch(color: number = 0xff6b81, count: number = 7): THREE.Group {
    const patch = new THREE.Group();
    const stemMat = new THREE.MeshToonMaterial({ color: 0x2ecc71 });
    const petalMat = new THREE.MeshToonMaterial({ color });
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xfeca57 });

    for (let i = 0; i < count; i++) {
      const flower = new THREE.Group();
      const fx = (Math.random() - 0.5) * 1.6;
      const fz = (Math.random() - 0.5) * 1.6;
      const fScale = 0.6 + Math.random() * 0.5;

      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35 * fScale, 5);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = (0.35 * fScale) / 2;
      flower.add(stem);

      const petalGeo = new THREE.SphereGeometry(0.09 * fScale, 8, 8);
      petalGeo.scale(1.2, 0.6, 1.2);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.y = 0.35 * fScale;
      flower.add(petal);

      const centerGeo = new THREE.SphereGeometry(0.04 * fScale, 6, 6);
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 0.37 * fScale;
      flower.add(center);

      flower.position.set(fx, 0, fz);
      patch.add(flower);
    }
    return patch;
  }

  public static createRock(size: number = 1.0): THREE.Mesh {
    const rockGeo = new THREE.DodecahedronGeometry(size, 1);
    // Perturb vertices slightly for organic faceted look
    const posAttr = rockGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const scale = 0.85 + (i % 5) * 0.06;
      posAttr.setXYZ(i, vx * scale, vy * 0.7, vz * scale);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshToonMaterial({
      color: 0x475569,
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  public static createLanternPost(lightColor: number = 0xffeaa7): THREE.Group {
    const postGroup = new THREE.Group();

    // Wooden post
    const postMat = new THREE.MeshToonMaterial({ color: 0x4a3224 });
    const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 2.8, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 1.4;
    post.castShadow = true;
    postGroup.add(post);

    // Cross arm
    const armGeo = new THREE.BoxGeometry(0.65, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, postMat);
    arm.position.set(0.2, 2.65, 0);
    postGroup.add(arm);

    // Lantern housing
    const lanternMat = new THREE.MeshToonMaterial({ color: 0x222222 });
    const lanternFrameGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.35, 6);
    const lanternFrame = new THREE.Mesh(lanternFrameGeo, lanternMat);
    lanternFrame.position.set(0.42, 2.4, 0);
    postGroup.add(lanternFrame);

    // Glowing core
    const coreMat = new THREE.MeshBasicMaterial({ color: lightColor });
    const coreGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0.42, 2.4, 0);
    postGroup.add(core);

    // Real point light
    const pLight = new THREE.PointLight(lightColor, 1.4, 9);
    pLight.position.set(0.42, 2.4, 0);
    postGroup.add(pLight);

    return postGroup;
  }

  public static createSignpost(lines: string[]): THREE.Group {
    const signGroup = new THREE.Group();

    // Post
    const postMat = new THREE.MeshToonMaterial({ color: 0x5c4033 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 0.9;
    post.castShadow = true;
    signGroup.add(post);

    // Board canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    // Wood board background
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#6f4e37';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // Text
    ctx.fillStyle = '#3c2415';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText("📜 TUTORIAL", canvas.width / 2, 45);
    ctx.font = 'bold 22px sans-serif';

    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, 105 + index * 42);
    });

    const texture = new THREE.CanvasTexture(canvas);
    const boardMat = new THREE.MeshBasicMaterial({ map: texture });
    const boardGeo = new THREE.BoxGeometry(2.0, 1.4, 0.12);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 1.8, 0.04);
    board.castShadow = true;
    signGroup.add(board);

    return signGroup;
  }

  public static createScenicBench(): THREE.Group {
    const benchGroup = new THREE.Group();
    benchGroup.name = "ScenicBench";

    const woodMat = new THREE.MeshToonMaterial({ color: 0x8d5524 });
    const darkWoodMat = new THREE.MeshToonMaterial({ color: 0x5c3a21 });
    const ironMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.44, 8);
    const legPositions = [
      { x: -0.9, z: -0.22 },
      { x: 0.9, z: -0.22 },
      { x: -0.9, z: 0.22 },
      { x: 0.9, z: 0.22 },
    ];
    legPositions.forEach(lp => {
      const leg = new THREE.Mesh(legGeo, ironMat);
      leg.position.set(lp.x, 0.22, lp.z);
      leg.castShadow = true;
      benchGroup.add(leg);
    });

    // Seat slats (3 smooth wooden planks)
    const slatGeo = new THREE.BoxGeometry(2.0, 0.05, 0.16);
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(slatGeo, woodMat);
      slat.position.set(0, 0.45, -0.18 + i * 0.18);
      slat.castShadow = true;
      slat.receiveShadow = true;
      benchGroup.add(slat);
    }

    // Backrest posts (side supports)
    const postGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06);
    const leftPost = new THREE.Mesh(postGeo, ironMat);
    leftPost.position.set(-0.9, 0.68, -0.26);
    leftPost.rotation.x = -0.12;
    benchGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, ironMat);
    rightPost.position.set(0.9, 0.68, -0.26);
    rightPost.rotation.x = -0.12;
    benchGroup.add(rightPost);

    // Backrest slats (2 horizontal planks)
    const backSlatGeo = new THREE.BoxGeometry(2.0, 0.14, 0.04);
    for (let j = 0; j < 2; j++) {
      const backSlat = new THREE.Mesh(backSlatGeo, darkWoodMat);
      backSlat.position.set(0, 0.62 + j * 0.18, -0.24 - j * 0.02);
      backSlat.rotation.x = -0.12;
      backSlat.castShadow = true;
      benchGroup.add(backSlat);
    }

    // Armrests
    const armGeo = new THREE.BoxGeometry(0.06, 0.04, 0.5);
    const leftArm = new THREE.Mesh(armGeo, ironMat);
    leftArm.position.set(-0.95, 0.6, 0);
    benchGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, ironMat);
    rightArm.position.set(0.95, 0.6, 0);
    benchGroup.add(rightArm);

    return benchGroup;
  }
}
