import * as THREE from 'three';

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.portals = [];
    this.currentWorldKey = 'SYNC_ISLAND';
    this.initSyncIsland();
  }

  initSyncIsland() {
    // Floating Island Ground
    const islandGeo = new THREE.CylinderGeometry(45, 38, 4, 32);
    const islandMat = new THREE.MeshStandardMaterial({ 
      color: 0x161c2e, 
      roughness: 0.6,
      metalness: 0.3 
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -2;
    this.scene.add(island);

    // Glowing Neon Perimeter Ring
    const ringGeo = new THREE.RingGeometry(43, 44.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    // Spinning Center Energy Crystal
    const crystalGeo = new THREE.OctahedronGeometry(2.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({ 
      color: 0xff007f, 
      emissive: 0xff007f, 
      emissiveIntensity: 0.7 
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystal.position.set(0, 4.5, 0);
    this.scene.add(this.crystal);

    // Portals to Other Worlds
    this.createPortal(new THREE.Vector3(18, 2, 0), 0x00f2fe, 'NEO_CITY', 'Neo City');
    this.createPortal(new THREE.Vector3(-18, 2, 0), 0x00ff88, 'DREAM_ISLAND', 'Dream Island');
    this.createPortal(new THREE.Vector3(0, 2, 18), 0x9b51e0, 'ORBIT_SPACE', 'Cosmic Orbit');
  }

  createPortal(pos, color, targetWorld, labelText) {
    const portalGroup = new THREE.Group();

    // Portal Torus Ring
    const torusGeo = new THREE.TorusGeometry(2.2, 0.18, 16, 48);
    const torusMat = new THREE.MeshBasicMaterial({ color: color });
    const portalMesh = new THREE.Mesh(torusGeo, torusMat);
    portalGroup.add(portalMesh);

    // Glowing Inner Energy Disk
    const vortexGeo = new THREE.CircleGeometry(2.0, 32);
    const vortexMat = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.45, 
      side: THREE.DoubleSide 
    });
    const vortex = new THREE.Mesh(vortexGeo, vortexMat);
    portalGroup.add(vortex);

    portalGroup.position.copy(pos);
    this.scene.add(portalGroup);

    this.portals.push({
      target: targetWorld,
      label: labelText,
      position: pos,
      group: portalGroup
    });
  }

  checkPortalCollision(playerPos, onTeleport) {
    for (const portal of this.portals) {
      if (playerPos.distanceTo(portal.position) < 2.5) {
        if (this.currentWorldKey !== portal.target) {
          onTeleport(portal.target, portal.label);
        }
        break;
      }
    }
  }

  switchWorld(targetKey, label) {
    this.currentWorldKey = targetKey;
    document.getElementById('world-name').innerText = label.toUpperCase();

    if (targetKey === 'NEO_CITY') {
      this.scene.fog.color.setHex(0x0a0520);
      this.scene.fog.density = 0.025;
    } else if (targetKey === 'ORBIT_SPACE') {
      this.scene.fog.color.setHex(0x000208);
      this.scene.fog.density = 0.005;
    } else {
      this.scene.fog.color.setHex(0x05070f);
      this.scene.fog.density = 0.012;
    }
  }

  update(time) {
    if (this.crystal) {
      this.crystal.rotation.y += 0.015;
      this.crystal.position.y = 4.5 + Math.sin(time * 2.5) * 0.35;
    }
    for (const portal of this.portals) {
      portal.group.rotation.y += 0.01;
    }
  }
}
