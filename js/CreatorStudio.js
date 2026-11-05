import * as THREE from 'three';
import { db } from './firebase-setup.js';
import { ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export class CreatorStudio {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.selectedType = 'block';
    this.active = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initUI();
    this.listenToCloudObjects();
  }

  initUI() {
    const toggleBtn = document.getElementById('toggle-studio-btn');
    const toolbar = document.getElementById('creator-toolbar');

    toggleBtn.addEventListener('click', () => {
      this.active = !this.active;
      toolbar.classList.toggle('hidden', !this.active);
      toggleBtn.innerText = this.active ? '❌ বন্ধ করুন' : '🛠️ ক্রিয়েটর স্টুডিও';
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedType = e.target.dataset.type;
      });
    });

    // Object placement trigger on click/tap
    window.addEventListener('pointerdown', (e) => {
      if (!this.active || (e.target.tagName !== 'CANVAS' && e.target.id !== 'webgl-container')) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();

      if (this.raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        this.saveObjectToCloud(this.selectedType, hitPoint);
      }
    });
  }

  saveObjectToCloud(type, pos) {
    const worldRef = ref(db, 'world_objects/sync_island');
    push(worldRef, {
      type: type,
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2))
    });
  }

  listenToCloudObjects() {
    const worldRef = ref(db, 'world_objects/sync_island');
    onChildAdded(worldRef, (snapshot) => {
      const data = snapshot.val();
      this.createMesh(data.type, new THREE.Vector3(data.x, data.y, data.z));
    });
  }

  createMesh(type, pos) {
    let mesh;
    if (type === 'block') {
      const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.2, metalness: 0.8 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + 0.8, pos.z);
    } else if (type === 'pylon') {
      const geo = new THREE.ConeGeometry(0.8, 4.5, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.6 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + 2.25, pos.z);
    } else if (type === 'tree') {
      mesh = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.75;
      mesh.add(trunk);

      const leafGeo = new THREE.DodecahedronGeometry(1.4);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.5 });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.y = 2.4;
      mesh.add(leaves);

      mesh.position.set(pos.x, pos.y, pos.z);
    } else {
      mesh = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.5, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const bulb = new THREE.Mesh(geo, mat);
      bulb.position.y = 1.0;
      mesh.add(bulb);

      const light = new THREE.PointLight(0xffea00, 2, 8);
      light.position.y = 1.0;
      mesh.add(light);

      mesh.position.set(pos.x, pos.y, pos.z);
    }

    this.scene.add(mesh);
  }
}
