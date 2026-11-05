import * as THREE from 'three';

export class CharacterController {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    // Movement & Physics
    this.keys = { w: false, a: false, s: false, d: false, space: false };
    this.velocity = new THREE.Vector3();
    this.speed = 12.0;
    this.jumpForce = 15.0;
    this.gravity = 35.0;
    this.isGrounded = true;

    // Camera Orbit Variables
    this.yaw = 0;
    this.pitch = 0.2;
    this.isMouseDown = false;

    this.createAvatarMesh();
    this.initKeyboardInputs();
    this.initMouseInputs();
    this.initMobileTouchInputs();
  }

  createAvatarMesh() {
    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.25, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.3, metalness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    this.mesh.add(body);

    // Glowing Visor Head
    const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ 
      color: 0x00f2fe, 
      emissive: 0x00f2fe, 
      emissiveIntensity: 0.6 
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    this.mesh.add(head);

    // Cyber Backpack
    const packGeo = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const packMat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.3 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 1.0, -0.3);
    this.mesh.add(pack);

    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }

  initKeyboardInputs() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
      if (e.code === 'Space') this.keys.space = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
      if (e.code === 'Space') this.keys.space = false;
    });
  }

  initMouseInputs() {
    window.addEventListener('mousedown', (e) => {
      if (e.target.id === 'webgl-container' || e.target.tagName === 'CANVAS') {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.yaw -= e.movementX * 0.005;
        this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch + e.movementY * 0.005));
      }
    });
  }

  initMobileTouchInputs() {
    // Jump Button
    const jumpBtn = document.getElementById('mobile-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.space = true;
      });
      jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.space = false;
      });
    }

    // Virtual Joystick Handling
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    let joyTouchId = null;
    let joyCenter = { x: 0, y: 0 };

    if (joyZone && joyKnob) {
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joyTouchId = touch.identifier;
        const rect = joyZone.getBoundingClientRect();
        joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });

      window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === joyTouchId) {
            const touch = e.touches[i];
            const dx = touch.clientX - joyCenter.x;
            const dy = touch.clientY - joyCenter.y;
            const dist = Math.min(40, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);

            joyKnob.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;

            this.keys.w = dy < -12;
            this.keys.s = dy > 12;
            this.keys.a = dx < -12;
            this.keys.d = dx > 12;
            break;
          }
        }
      });

      const resetJoystick = () => {
        joyKnob.style.transform = 'translate(-50%, -50%)';
        this.keys.w = false;
        this.keys.s = false;
        this.keys.a = false;
        this.keys.d = false;
        joyTouchId = null;
      };

      window.addEventListener('touchend', resetJoystick);
      window.addEventListener('touchcancel', resetJoystick);
    }

    // Touch Drag on Right Screen for Camera Look
    let cameraTouchId = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX > window.innerWidth / 2 && cameraTouchId === null) {
          cameraTouchId = touch.identifier;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          break;
        }
      }
    });

    window.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === cameraTouchId) {
          const dx = touch.clientX - lastTouchX;
          const dy = touch.clientY - lastTouchY;
          this.yaw -= dx * 0.007;
          this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch + dy * 0.007));
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          break;
        }
      }
    });

    const resetCamTouch = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
          cameraTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('touchend', resetCamTouch);
    window.addEventListener('touchcancel', resetCamTouch);
  }

  update(delta) {
    // Direction calculation based on camera yaw
    const moveDir = new THREE.Vector3();
    if (this.keys.w) moveDir.z += 1;
    if (this.keys.s) moveDir.z -= 1;
    if (this.keys.a) moveDir.x += 1;
    if (this.keys.d) moveDir.x -= 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.mesh.position.x += moveDir.x * this.speed * delta;
      this.mesh.position.z += moveDir.z * this.speed * delta;

      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = targetRotation;
    }

    // Gravity and Jumping
    if (this.isGrounded && this.keys.space) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    this.velocity.y -= this.gravity * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // Ground plane clamp
    if (this.mesh.position.y <= 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Smooth Third-Person Camera Tracking
    const camDistance = 8.5;
    const cx = this.mesh.position.x - Math.sin(this.yaw) * Math.cos(this.pitch) * camDistance;
    const cy = this.mesh.position.y + Math.sin(this.pitch) * camDistance + 2.8;
    const cz = this.mesh.position.z - Math.cos(this.yaw) * Math.cos(this.pitch) * camDistance;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.mesh.position.x, this.mesh.position.y + 1.2, this.mesh.position.z);
  }
}
