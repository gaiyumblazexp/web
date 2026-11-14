// MAVYQO feature modules. Each view: {icon,label,[init],render,[on],[after]}.
// index.html calls init() when the view opens, render() on every paint,
// on(action) for clicks "x:<module>:<action>", after() once the HTML is in the DOM.
import { db, auth, CLOUDINARY } from "./firebase.js";
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, runTransaction, serverTimestamp, onSnapshot, orderBy, limit, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const M = { orders: [], tasks: { mine: [], work: [], open: [] }, me: {}, chats: [], msgs: [], cur: null, unsub: null, draft: "", donors: [], reqs: [], resp: {}, mine: null, map: null };
const uid = () => auth.currentUser.uid;
const ids = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
const byNew = (a, b) => (b.createdAt?.seconds || b.updatedAt?.seconds || 0) - (a.createdAt?.seconds || a.updatedAt?.seconds || 0);
const cart = () => { try { return JSON.parse(localStorage.cart || "[]"); } catch { return []; } };
const num = v => parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
const val = id => document.getElementById(id)?.value.trim() || "";
const FEES = { grocery: 80, parcel: 70, document: 60, queue: 100, errand: 80, food: 60, shop: 50 };
const GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const safeImg = u => (typeof u === "string" && u.startsWith("https://res.cloudinary.com/")) ? u : "";
export async function uploadImage(file) {
  if (!CLOUDINARY.cloud || !CLOUDINARY.preset) throw new Error("Image upload is not configured (see firebase.js)");
  if (!file.type.startsWith("image/") || file.size > 5e6) throw new Error("Choose an image under 5 MB");
  const f = new FormData(); f.append("file", file); f.append("upload_preset", CLOUDINARY.preset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/image/upload`, { method: "POST", body: f });
  if (!r.ok) throw new Error("Upload failed");
  return (await r.json()).secure_url;
}

export const views = {
  /* ---------------- Marketplace: cart, checkout, orders ---------------- */
  market: {
    icon: "🛒", label: ["Marketplace", "মার্কেটপ্লেস"],
    async init() {
      const u = uid();
      const [a, b] = await Promise.all([
        getDocs(query(collection(db, "orders"), where("buyer", "==", u))),
        getDocs(query(collection(db, "orders"), where("sellerIds", "array-contains", u)))]);
      const m = new Map(); [...ids(a), ...ids(b)].forEach(o => m.set(o.id, o));
      M.orders = [...m.values()].sort(byNew);
    },
    render({ S, esc }) {
      const ct = cart(), total = ct.reduce((s, i) => s + i.price * i.qty, 0);
      const prods = S.items.filter(i => i.type === "product");
      return `<div class="hero"><h1>${esc(S.lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace")}</h1></div><div class="sec">
      <h2>🛒 Cart</h2>${ct.length ? ct.map(i => `<div class="card"><b>${esc(i.title)}</b><br>৳${i.price} × ${i.qty} <button class="btn alt" style="width:auto;padding:4px 12px" data-a="x:market:rm" data-id="${esc(i.id)}">Remove</button></div>`).join("") +
        `<label for="addr">Delivery address</label><input id="addr" maxlength="200"><p><b>Total ৳${total}</b> · Cash on delivery</p><button class="btn" data-a="x:market:checkout">Place order</button>` : `<div class="empty">Your cart is empty.</div>`}
      <h2>Orders</h2>${M.orders.length ? M.orders.map(o => `<div class="card"><span class="tag">${esc(o.status)}</span> <small>${o.buyer === uid() ? "You bought" : "You sold"}</small>${o.items.map(i => `<div>${esc(i.title)} × ${i.qty}</div>`).join("")}<small>৳${o.total} · ${esc(o.address)}</small>${o.sellerIds.includes(uid()) && !["delivered", "cancelled"].includes(o.status) ? `<div style="margin-top:8px"><button class="btn alt" data-a="x:market:st" data-id="${o.id}" data-s="${o.status === "placed" ? "confirmed" : o.status === "confirmed" ? "shipped" : "delivered"}">Mark ${o.status === "placed" ? "confirmed" : o.status === "confirmed" ? "shipped" : "delivered"}</button></div>` : ""}</div>`).join("") : `<div class="empty">No orders yet.</div>`}
      <h2>Products</h2>${prods.length ? prods.map(i => `<div class="card">${safeImg(i.img) ? `<img src="${esc(i.img)}" alt="" style="width:100%;border-radius:12px;margin-bottom:8px">` : ""}<b>${esc(i.title)}</b><div>${esc(i.desc)}</div><small>৳${esc(i.price || "—")} · ${esc(i.area)}</small>${i.owner !== uid() && num(i.price) > 0 ? `<div style="margin-top:8px"><button class="btn" data-a="x:market:add" data-id="${i.id}">Add to cart</button></div>` : ""}</div>`).join("") : `<div class="empty">No products yet.</div>`}</div>`;
    },
    async on(a, el, c) {
      let ct = cart();
      if (a === "add") {
        const p = c.S.items.find(i => i.id === el.dataset.id); if (!p) return;
        const e = ct.find(i => i.id === p.id); e ? e.qty++ : ct.push({ id: p.id, title: p.title, price: num(p.price), qty: 1, seller: p.owner });
        localStorage.cart = JSON.stringify(ct); c.toast("Added to cart");
      } else if (a === "rm") { localStorage.cart = JSON.stringify(ct.filter(i => i.id !== el.dataset.id)); }
      else if (a === "checkout") {
        const address = val("addr"); if (!address) throw new Error("Enter a delivery address");
        if (!ct.length) return;
        await addDoc(collection(db, "orders"), { buyer: uid(), buyerName: auth.currentUser.displayName || "", items: ct, sellerIds: [...new Set(ct.map(i => i.seller))], total: ct.reduce((s, i) => s + i.price * i.qty, 0), status: "placed", payment: "cash_on_delivery", address, createdAt: serverTimestamp() });
        localStorage.cart = "[]"; await this.init(); c.toast("Order placed");
      } else if (a === "st") { await updateDoc(doc(db, "orders", el.dataset.id), { status: el.dataset.s }); await this.init(); }
    }
  },

  /* ---------------- Helpers & delivery tasks ---------------- */
  helper: {
    icon: "🤝", label: ["Helpers & delivery", "হেল্পার ও ডেলিভারি"],
    async init({ S }) {
      const u = uid(); M.me = (await getDoc(doc(db, "users", u))).data() || {};
      const ok = ["helper", "delivery", "admin"].includes(M.me.role);
      const [a, b, o] = await Promise.all([
        getDocs(query(collection(db, "tasks"), where("requester", "==", u))),
        getDocs(query(collection(db, "tasks"), where("helper", "==", u))),
        ok ? getDocs(query(collection(db, "tasks"), where("status", "==", "open"))) : null]);
      M.tasks = { mine: ids(a).sort(byNew), work: ids(b).sort(byNew), open: o ? ids(o).filter(t => t.requester !== u && t.area?.toLowerCase() === S.area.toLowerCase()) : [] };
    },
    render({ S, esc }) {
      const me = M.me || {}, ok = ["helper", "delivery", "admin"].includes(me.role), T = M.tasks;
      const row = (t, btns) => `<div class="card"><span class="tag">${esc(t.kind)}</span> <small>${esc(t.status)}</small><div><b>${esc(t.pickup)} → ${esc(t.drop)}</b></div><div>${esc(t.details)}</div><small>৳${esc(t.fee)} · ${esc(t.area)}${t.helperName ? " · " + esc(t.helperName) : ""}</small>${btns ? `<div style="margin-top:8px">${btns}</div>` : ""}</div>`;
      const nxt = { accepted: ["picked_up", "Mark picked up"], picked_up: ["delivered", "Mark delivered"] };
      return `<div class="hero"><h1>${S.lang === "bn" ? "হেল্পার ও ডেলিভারি" : "Helpers & delivery"}</h1></div><div class="sec">
      <h2>Request help or delivery</h2><div class="card">
      <label for="tk">Type</label><select id="tk">${Object.keys(FEES).map(k => `<option>${k}</option>`).join("")}</select>
      <label for="pu">Pickup address</label><input id="pu" maxlength="160"><label for="dr">Delivery address</label><input id="dr" maxlength="160">
      <label for="dt">Details</label><input id="dt" maxlength="300"><label for="ar2">Area</label><input id="ar2" value="${esc(S.area)}" maxlength="80">
      <label for="fe">Fee offered (৳) — typical: parcel 70, grocery 80, queue 100</label><input id="fe" type="number" min="20" max="5000" value="80"><br><br>
      <button class="btn" data-a="x:helper:task">Send request</button></div>
      <h2>My requests</h2>${T.mine.length ? T.mine.map(t => row(t, t.status === "open" ? `<button class="btn alt" data-a="x:helper:cancel" data-id="${t.id}">Cancel</button>` : t.status === "delivered" ? `<button class="btn" data-a="x:helper:done" data-id="${t.id}">Confirm received</button>` : "")).join("") : `<div class="empty">No requests yet.</div>`}
      ${ok ? `<h2>Helper desk</h2><div class="card"><b>${me.available ? "🟢 Available" : "⚪ Offline"}</b>${me.busy ? " · 🟠 Busy" : ""}<br><br><button class="btn alt" data-a="x:helper:avail">${me.available ? "Go offline" : "Go available"}</button></div>
      ${T.work.length ? "<h2>My tasks</h2>" + T.work.map(t => row(t, nxt[t.status] ? `<button class="btn" data-a="x:helper:step" data-id="${t.id}" data-s="${nxt[t.status][0]}">${nxt[t.status][1]}</button>` : "")).join("") : ""}
      <h2>Open tasks in ${esc(S.area)}</h2>${T.open.length ? T.open.map(t => row(t, `<button class="btn" data-a="x:helper:accept" data-id="${t.id}" ${me.busy || !me.available ? "disabled" : ""}>Accept</button>`)).join("") : `<div class="empty">No open tasks in your area.</div>`}`
        : `<div class="card"><small>Helper and delivery roles are for verified adults (18+) only. An admin assigns the role after verification.</small></div>`}</div>`;
    },
    async on(a, el, c) {
      const u = uid(), id = el.dataset.id;
      if (a === "task") {
        const d = { requester: u, requesterName: auth.currentUser.displayName || "", kind: val("tk"), pickup: val("pu"), drop: val("dr"), details: val("dt"), area: val("ar2"), fee: Math.round(num(val("fe"))), status: "open", createdAt: serverTimestamp() };
        if (!d.pickup || !d.drop || !d.area || !(d.fee >= 20)) throw new Error("Fill pickup, delivery, area and a fee of at least ৳20");
        await addDoc(collection(db, "tasks"), d); c.toast("Request sent");
      } else if (a === "cancel") await updateDoc(doc(db, "tasks", id), { status: "cancelled" });
      else if (a === "done") await updateDoc(doc(db, "tasks", id), { status: "done" });
      else if (a === "avail") await updateDoc(doc(db, "users", u), { available: !M.me.available });
      else if (a === "step") {
        await updateDoc(doc(db, "tasks", id), { status: el.dataset.s });
        if (el.dataset.s === "delivered") await updateDoc(doc(db, "users", u), { busy: false });
      } else if (a === "accept") {
        // Transaction = the lock: only one helper can move a task from open to accepted.
        await runTransaction(db, async tx => {
          const tr = doc(db, "tasks", id), ur = doc(db, "users", u);
          const [t, me] = await Promise.all([tx.get(tr), tx.get(ur)]);
          if (t.data().status !== "open") throw new Error("Another helper already took this task");
          if (me.data().busy) throw new Error("Finish your current task first");
          tx.update(tr, { status: "accepted", helper: u, helperName: auth.currentUser.displayName || "" });
          tx.update(ur, { busy: true });
        });
        c.toast("Task accepted");
      }
      await this.init(c);
    }
  },

  /* ---------------- Chat with text + images ---------------- */
  chat: {
    icon: "💬", label: ["Chats", "চ্যাট"],
    async init() { M.chats = ids(await getDocs(query(collection(db, "chats"), where("members", "array-contains", uid())))).sort(byNew); },
    render({ S, esc }) {
      const u = uid();
      if (!M.cur) return `<div class="hero"><h1>${S.lang === "bn" ? "চ্যাট" : "Chats"}</h1></div><div class="sec" style="margin-top:12px">${M.chats.length ? M.chats.map(ch => { const other = ch.members.find(m => m !== u); return `<button class="card" style="width:100%;text-align:left" data-a="x:chat:open" data-id="${ch.id}"><b>${esc(ch.names?.[other] || "User")}</b><br><small>${esc(ch.last || "")}</small></button>`; }).join("") : `<div class="empty">No chats yet. Open a listing and tap Message.</div>`}</div>`;
      const ch = M.chats.find(x => x.id === M.cur) || {}, blocked = (ch.blockedBy || []).length > 0;
      return `<div class="hero"><div class="bar"><button class="ib" data-a="x:chat:back" aria-label="Back">←</button><h1 style="margin:0">${esc(ch.names?.[ch.members?.find(m => m !== u)] || "Chat")}</h1><span class="sp"></span><button class="chip" data-a="x:chat:report">Report</button><button class="chip" data-a="x:chat:block">Block</button></div></div>
      <div class="sec" style="margin-top:12px">${M.msgs.map(m => `<div class="card" style="margin-left:${m.from === u ? "36px" : "0"};margin-right:${m.from === u ? "0" : "36px"}">${m.img && safeImg(m.img) ? `<img src="${esc(m.img)}" alt="" style="width:100%;border-radius:12px">` : ""}${esc(m.text)}</div>`).join("") || `<div class="empty">Say hello.</div>`}
      ${blocked ? `<div class="empty">This chat is blocked.</div>` : `<input id="msg" placeholder="Message" maxlength="1000" value="${esc(M.draft)}"><br><br><input id="mi" type="file" accept="image/*"><br><br><button class="btn" data-a="x:chat:send">Send</button>`}</div>`;
    },
    after() { const i = document.getElementById("msg"); if (i) i.oninput = e => M.draft = e.target.value; },
    async on(a, el, c) {
      const u = uid();
      if (a === "start") {
        const o = el.dataset.o; if (!o || o === u) return;
        const id = [u, o].sort().join("_");
        await setDoc(doc(db, "chats", id), { members: [u, o].sort(), names: { [u]: auth.currentUser.displayName || "", [o]: el.dataset.n || "" }, updatedAt: serverTimestamp() }, { merge: true });
        c.S.tab = "chat"; await this.init(); return this.on("open", { dataset: { id } }, c);
      }
      if (a === "open") {
        M.cur = el.dataset.id; M.msgs = []; M.unsub?.();
        M.unsub = onSnapshot(query(collection(db, "chats", M.cur, "messages"), orderBy("at"), limit(100)), s => { M.msgs = ids(s); if (c.S.tab === "chat") c.render(); });
      } else if (a === "back") { M.unsub?.(); M.cur = null; await this.init(); }
      else if (a === "send") {
        const text = val("msg"), f = document.getElementById("mi")?.files[0]; if (!text && !f) return "skip";
        const img = f ? await uploadImage(f) : "";
        await addDoc(collection(db, "chats", M.cur, "messages"), { from: u, text, img, at: serverTimestamp() });
        await updateDoc(doc(db, "chats", M.cur), { last: text || "📷", updatedAt: serverTimestamp() }); M.draft = "";
      } else if (a === "block") { await updateDoc(doc(db, "chats", M.cur), { blockedBy: arrayUnion(u) }); await this.init(); c.toast("Blocked"); }
      else if (a === "report") { const r = prompt("What is the problem?"); if (r) { await addDoc(collection(db, "reports"), { by: u, kind: "chat", target: M.cur, reason: r.slice(0, 300), status: "open", createdAt: serverTimestamp() }); c.toast("Report sent"); } }
    }
  },

  /* ---------------- Blood network (consent-based) ---------------- */
  blood: {
    icon: "🩸", label: ["Blood network", "রক্তদান"],
    async init() {
      const u = uid();
      const [d, r, m] = await Promise.all([getDocs(query(collection(db, "donors"), where("available", "==", true))), getDocs(query(collection(db, "bloodRequests"), where("status", "==", "open"))), getDoc(doc(db, "donors", u))]);
      M.donors = ids(d); M.reqs = ids(r).sort(byNew); M.mine = m.exists() ? m.data() : null; M.resp = {};
      for (const q of M.reqs.filter(x => x.requester === u)) M.resp[q.id] = ids(await getDocs(collection(db, "bloodRequests", q.id, "responses")));
    },
    render({ S, esc }) {
      const u = uid(), opt = g => GROUPS.map(x => `<option ${x === g ? "selected" : ""}>${x}</option>`).join("");
      return `<div class="hero"><h1>${S.lang === "bn" ? "রক্তদান" : "Blood network"}</h1></div><div class="sec">
      <div class="card"><small>MAVYQO only connects people. Medical compatibility and eligibility must be confirmed by a qualified professional.</small></div>
      <h2>Request blood</h2><div class="card"><label for="bg">Blood group</label><select id="bg">${opt()}</select><label for="ba">Area</label><input id="ba" value="${esc(S.area)}" maxlength="80"><label for="bn">Note</label><input id="bn" maxlength="200"><br><br><button class="btn" data-a="x:blood:req">Post request</button></div>
      <h2>Open requests</h2>${M.reqs.length ? M.reqs.map(r => `<div class="card"><span class="tag">🩸 ${esc(r.group)}</span> <b>${esc(r.area)}</b><div>${esc(r.note)}</div>${r.requester === u ? `${(M.resp[r.id] || []).map(x => `<div>✅ ${esc(x.name)} — ${esc(x.contact)}</div>`).join("") || "<small>No responses yet.</small>"}<br><button class="btn alt" data-a="x:blood:close" data-id="${r.id}">Close request</button>` : (M.mine?.available ? `<button class="btn" data-a="x:blood:help" data-id="${r.id}">I can help</button>` : "")}</div>`).join("") : `<div class="empty">No open requests.</div>`}
      <h2>Donor registration</h2><div class="card"><label for="dg">Blood group</label><select id="dg">${opt(M.mine?.group)}</select><label for="da">Area</label><input id="da" value="${esc(M.mine?.area || S.area)}" maxlength="80">
      <label><input type="checkbox" id="dav" style="width:auto" ${M.mine?.available ? "checked" : ""}> Available to donate</label>
      <label><input type="checkbox" id="dco" style="width:auto" ${M.mine?.consent ? "checked" : ""}> I agree to show my blood group, area and availability to signed-in members. My contact is never shown unless I choose to reply to a request.</label><br><button class="btn" data-a="x:blood:save">Save donor profile</button></div>
      <h2>Available donors</h2>${M.donors.length ? M.donors.map(d => `<div class="card"><span class="tag">🩸 ${esc(d.group)}</span> ${esc(d.name)} · ${esc(d.area)}</div>`).join("") : `<div class="empty">No donors listed yet.</div>`}</div>`;
    },
    async on(a, el, c) {
      const u = uid();
      if (a === "save") {
        if (!document.getElementById("dco").checked) throw new Error("Consent is required to be listed");
        await setDoc(doc(db, "donors", u), { name: auth.currentUser.displayName || "", group: val("dg"), area: val("da"), available: document.getElementById("dav").checked, consent: true, updatedAt: serverTimestamp() }); c.toast("Saved");
      } else if (a === "req") {
        if (!val("ba")) throw new Error("Enter an area");
        await addDoc(collection(db, "bloodRequests"), { requester: u, name: auth.currentUser.displayName || "", group: val("bg"), area: val("ba"), note: val("bn"), status: "open", createdAt: serverTimestamp() }); c.toast("Request posted");
      } else if (a === "help") {
        const contact = prompt("Phone or contact to share with the requester (only they will see it)"); if (!contact) return "skip";
        await setDoc(doc(db, "bloodRequests", el.dataset.id, "responses", u), { donor: u, name: auth.currentUser.displayName || "", contact: contact.slice(0, 60), createdAt: serverTimestamp() }); c.toast("Sent to requester");
      } else if (a === "close") await updateDoc(doc(db, "bloodRequests", el.dataset.id), { status: "closed" });
      await this.init(c);
    }
  },

  /* ---------------- Map (OpenStreetMap via Leaflet) ---------------- */
  map: {
    icon: "🗺", label: ["Map", "ম্যাপ"],
    render({ S }) { return `<div class="hero"><h1>${S.lang === "bn" ? "ম্যাপ" : "Map"}</h1></div><div id="map" style="height:66vh;margin:12px;border-radius:18px"></div><div class="sec"><button class="btn alt" data-a="x:map:me">📍 Center on me</button><p class="empty">Only listings whose owners chose to pin an approximate location appear here.</p></div>`; },
    async after({ S }) {
      if (!window.L) await new Promise((ok, no) => {
        const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.append(l);
        const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = ok; s.onerror = no; document.head.append(s);
      });
      M.map?.remove(); M.map = L.map("map").setView([25.7439, 89.2752], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(M.map);
      S.items.filter(i => typeof i.lat === "number" && typeof i.lng === "number").forEach(i => {
        const d = document.createElement("div"); const b = document.createElement("b"); b.textContent = i.title; d.append(b, document.createElement("br"), document.createTextNode(`${i.type} · ${i.area}`));
        L.marker([i.lat, i.lng]).addTo(M.map).bindPopup(d);
      });
    },
    on(a) { if (a === "me") { navigator.geolocation.getCurrentPosition(p => M.map.setView([p.coords.latitude, p.coords.longitude], 15)); return "skip"; } }
  }
};
