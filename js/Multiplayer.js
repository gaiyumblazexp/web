import * as THREE from 'three';
import { db, myPlayerId } from './firebase-setup.js';
import { ref, set, onValue, onDisconnect, push } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export class MultiplayerManager {
  constructor(scene) {
    this.scene = scene;
    this.otherPlayers = {};
    this.myPlayerRef = ref(db, `players/${myPlayerId}`);

    onDisconnect(this.myPlayerRef).remove();

    this.listenToPlayers();
    this.initChatSync();
  }

  syncPosition(pos, rotY) {
    set(this.myPlayerRef, {
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2)),
      rot: Number(rotY.toFixed(2)),
      updatedAt: Date.now()
    });
  }

  listenToPlayers() {
    const playersRef = ref(db, 'players');
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const activeIds = Object.keys(data);

      const countEl = document.getElementById('player-count');
      if (countEl) countEl.innerText = `🟢 ${activeIds.length} জন অনলাইন`;

      for (const id in data) {
        if (id === myPlayerId) continue;
        const p = data[id];

        if (!this.otherPlayers[id]) {
          const group = new THREE.Group();

          const bodyGeo = new THREE.CylinderGeometry(0.35, 0.25, 1.2, 16);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8800ff });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.9;
          group.add(body);

          const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
          const headMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 0.5 });
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 1.7;
          group.add(head);

          this.scene.add(group);
          this.otherPlayers[id] = group;
        }

        // Smooth position interpolation
        this.otherPlayers[id].position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.25);
        this.otherPlayers[id].rotation.y = p.rot;
      }

      // Cleanup disconnected players
      for (const id in this.otherPlayers) {
        if (!data[id]) {
          this.scene.remove(this.otherPlayers[id]);
          delete this.otherPlayers[id];
        }
      }
    });
  }

  initChatSync() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-messages');

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      const chatRef = ref(db, 'chats');
      push(chatRef, {
        sender: myPlayerId.substring(0, 6),
        message: text,
        time: Date.now()
      });

      chatInput.value = '';
    });

    const chatRef = ref(db, 'chats');
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      chatBox.innerHTML = '';
      const messages = Object.values(data).slice(-15);
      messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'chat-bubble';
        item.innerHTML = `<b>${msg.sender}:</b> ${msg.message}`;
        chatBox.appendChild(item);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  }
}
