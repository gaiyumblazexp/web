import * as THREE from 'three';
import { CharacterController } from './CharacterController.js';
import { WorldManager } from './WorldManager.js';
import { CreatorStudio } from './CreatorStudio.js';
import { MultiplayerManager } from './Multiplayer.js';

class WorldSyncApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.clock = new THREE.Clock();

    this.initEngine();
    this.initLighting();

    // Module Subsystems
    this.worldManager = new WorldManager(this.scene);
    this.character = new CharacterController(this.scene, this.camera, this.renderer.domElement);
    this.creatorStudio = new CreatorStudio(this.scene, this.camera, this.renderer.domElement);
    this.multiplayer = new MultiplayerManager(this.scene);

    window.addEventListener('resize', () => this.onWindowResize());
    
    this.registerPWA();
    this.animate();
  }

  initEngine() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070f, 0.012);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0x00f2fe, 1.4);
    this.sunLight.position.set(25, 50, 25);
    this.scene.add(this.sunLight);
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Avatar Controller Update
    this.character.update(delta);

    // Sync Avatar to Multiplayer & Check Portals
    if (this.character.mesh) {
      this.multiplayer.syncPosition(this.character.mesh.position, this.character.mesh.rotation.y);

      this.worldManager.checkPortalCollision(this.character.mesh.position, (target, label) => {
        this.worldManager.switchWorld(target, label);
      });
    }

    // World & Portal Animations
    this.worldManager.update(time);

    // Render 3D Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game
new WorldSyncApp();
