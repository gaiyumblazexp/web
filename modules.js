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

export const hasPhone = x => /[0-9০-৯][0-9০-৯\s.\-]{7,}[0-9০-৯]/.test(x || "");
// Smaller, faster images: Cloudinary resizes on delivery.
export const tr = (u, w) => safeImg(u).replace("/upload/", `/upload/q_auto,f_auto,w_${w}/`);
async function shrink(file) {
  if (file.type === "image/gif") return file;
  const b = await createImageBitmap(file), k = Math.min(1, 1280 / Math.max(b.width, b.height));
  const c = document.createElement("canvas"); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
  c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/jpeg", 0.82));
}
export const safeImg = u => (typeof u === "string" && u.startsWith("https://res.cloudinary.com/")) ? u : "";
export async function uploadImage(file) {
  if (!CLOUDINARY.cloud || !CLOUDINARY.preset) throw new Error("Image upload is not configured (see firebase.js)");
  if (!file.type.startsWith("image/") || file.size > 12e6) throw new Error("Choose an image under 12 MB");
  const f = new FormData(); f.append("file", await shrink(file), "photo.jpg"); f.append("upload_preset", CLOUDINARY.preset);
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
    render({ S, esc, pcard, pfilter, fbar }) {
      const ct = cart(), total = ct.reduce((s, i) => s + i.price * i.qty, 0);
      const sold = M.orders.filter(o => o.sellerIds.includes(uid()));
      const rev = sold.filter(o => o.status === "delivered").reduce((s, o) => s + o.items.filter(i => i.seller === uid()).reduce((a, i) => a + i.price * i.qty, 0), 0);
      const prods = pfilter(S.items.filter(i => i.type === "product"));
      return `<div class="hero"><h1>${esc(S.lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace")}</h1></div><div class="sec">
      <h2>🛒 Cart</h2>${ct.length ? ct.map(i => `<div class="card"><b>${esc(i.title)}</b><br>৳${i.price} × ${i.qty} <button class="btn alt" style="width:auto;padding:4px 12px" data-a="x:market:rm" data-id="${esc(i.id)}">Remove</button></div>`).join("") +
        `<label for="addr">Delivery address</label><input id="addr" maxlength="200"><p><b>Total ৳${total}</b> · Cash on delivery</p><button class="btn" data-a="x:market:checkout">Place order</button>` : `<div class="empty">Your cart is empty.</div>`}
      ${sold.length ? `<div class="card"><b>📊 Sales</b><br>${sold.length} orders · ৳${rev} delivered</div>` : ""}<h2>Orders</h2>${M.orders.length ? M.orders.map(o => `<div class="card"><span class="tag">${esc(o.status)}</span><div>${["placed", "confirmed", "shipped", "delivered"].map((x, k) => `<small>${k <= ["placed", "confirmed", "shipped", "delivered"].indexOf(o.status) ? "●" : "○"} ${x}</small>`).join(" — ")}</div> <small>${o.buyer === uid() ? "You bought" : "You sold"}</small>${o.items.map(i => `<div>${esc(i.title)} × ${i.qty}</div>`).join("")}<small>৳${o.total} · ${esc(o.address)}</small>${o.buyer === uid() && o.status === "delivered" ? [...new Map(o.items.map(i => [i.seller, i.sellerName])).entries()].map(([sl, n]) => `<div style="margin-top:8px"><button class="btn alt" data-a="x:market:rate" data-o="${o.id}" data-s="${esc(sl)}" data-n="${esc(n || "")}">⭐ Rate ${esc(n || "seller")}</button></div>`).join("") : ""}${o.sellerIds.includes(uid()) && !["delivered", "cancelled"].includes(o.status) ? `<div style="margin-top:8px"><button class="btn alt" data-a="x:market:st" data-id="${o.id}" data-s="${o.status === "placed" ? "confirmed" : o.status === "confirmed" ? "shipped" : "delivered"}">Mark ${o.status === "placed" ? "confirmed" : o.status === "confirmed" ? "shipped" : "delivered"}</button></div>` : ""}</div>`).join("") : `<div class="empty">No orders yet.</div>`}
      <h2>Products</h2>${fbar()}${prods.length ? `<div class="pg">${prods.map(pcard).join("")}</div>` : `<div class="empty">No products yet.</div>`}</div>`;
    },
    async on(a, el, c) {
      let ct = cart();
      if (a === "add") {
        const p = c.S.items.find(i => i.id === el.dataset.id); if (!p) return;
        const e = ct.find(i => i.id === p.id); e ? e.qty++ : ct.push({ id: p.id, title: p.title, price: num(p.price), qty: 1, seller: p.owner, sellerName: p.ownerName || "" });
        localStorage.cart = JSON.stringify(ct); c.toast("Added to cart");
      } else if (a === "rm") { localStorage.cart = JSON.stringify(ct.filter(i => i.id !== el.dataset.id)); }
      else if (a === "checkout") {
        const address = val("addr"); if (!address) throw new Error("Enter a delivery address");
        if (!ct.length) return;
        await addDoc(collection(db, "orders"), { buyer: uid(), buyerName: auth.currentUser.displayName || "", items: ct, sellerIds: [...new Set(ct.map(i => i.seller))], total: ct.reduce((s, i) => s + i.price * i.qty, 0), status: "placed", payment: "cash_on_delivery", address, createdAt: serverTimestamp() });
        localStorage.cart = "[]"; await this.init(); c.toast("Order placed");
      } else if (a === "rate") {
        const r = parseInt(prompt("Rating 1 to 5"), 10); if (!(r >= 1 && r <= 5)) return "skip";
        const text = (prompt("Short review (optional, no phone numbers)") || "").slice(0, 300);
        if (hasPhone(text)) throw new Error("Please don't put phone numbers in reviews");
        await setDoc(doc(db, "reviews", el.dataset.o + "_" + el.dataset.s), { order: el.dataset.o, seller: el.dataset.s, buyer: uid(), buyerName: auth.currentUser.displayName || "", rating: r, text, createdAt: serverTimestamp() });
        c.toast("Thanks for your review"); return "skip";
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

  /* ---------------- Chat (marketplace style, one thread per listing) ---------------- */
  chat: {
    icon: "💬", label: ["Chats", "চ্যাট"],
    full: () => !!M.cur,
    async init() { M.chats = ids(await getDocs(query(collection(db, "chats"), where("members", "array-contains", uid())))).sort(byNew); },
    render({ S, esc }) {
      const u = uid();
      const av = (n, z = 46) => `<span style="width:${z}px;height:${z}px;border-radius:50%;background:var(--grad);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex:none">${esc((n || "?")[0].toUpperCase())}</span>`;
      const who = ch => ch.names?.[ch.members.find(m => m !== u)] || "User";
      const tm = ts => ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const thumb = l => safeImg(l?.img) ? `<img src="${esc(tr(l.img, 120))}" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover">` : `<span style="width:44px;height:44px;border-radius:10px;background:var(--line);display:inline-flex;align-items:center;justify-content:center">🛍</span>`;
      if (!M.cur) return `<div class="hero"><h1>${S.lang === "bn" ? "চ্যাট" : "Chats"}</h1></div><div style="margin-top:8px">${M.chats.length ? M.chats.map(ch => `<button data-a="x:chat:open" data-id="${ch.id}" style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;padding:12px 16px;border-bottom:1px solid var(--line)">${av(who(ch))}<span style="flex:1;min-width:0"><b>${esc(who(ch))}</b>${ch.listing ? ` <small style="color:var(--mut)">· ${esc(ch.listing.title)}</small>` : ""}<small style="display:block;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ch.last || "Say hello 👋")}</small></span><small style="color:var(--mut)">${tm(ch.updatedAt)}</small></button>`).join("") : `<div class="empty">No chats yet.<br>Open any listing and tap Message.</div>`}</div>`;
      const ch = M.chats.find(x => x.id === M.cur) || { members: [u], names: {} }, blocked = (ch.blockedBy || []).length > 0;
      const quick = ["Is this still available?", "What's your lowest price?", "Where can we meet?"];
      return `<div style="position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:calc(8px + env(safe-area-inset-top)) 12px 8px">
        <div class="bar"><button data-a="x:chat:back" aria-label="Back" style="font-size:24px">←</button>${av(who(ch), 38)}<b style="flex:1">${esc(who(ch))}</b><button data-a="x:chat:report" aria-label="Report" style="font-size:20px">⚑</button><button data-a="x:chat:block" aria-label="Block" style="font-size:20px">🚫</button></div>
        ${ch.listing ? `<div style="display:flex;gap:10px;align-items:center;margin-top:8px">${thumb(ch.listing)}<span><b>${esc(ch.listing.title)}</b><br><small style="color:var(--mut)">${ch.listing.price ? "৳" + esc(ch.listing.price) : ""}</small></span></div>` : ""}</div>
      <div style="padding:12px 14px 110px">${M.msgs.map(m => `<div class="bub ${m.from === u ? "me" : "th"}">${m.img && safeImg(m.img) ? `<img src="${esc(tr(m.img, 800))}" alt="">` : ""}${esc(m.text)}</div>`).join("") || (blocked ? "" : `<div class="empty">Start the conversation</div>${quick.map(q => `<button class="qk" data-a="x:chat:quick" data-m="${esc(q)}">${esc(q)}</button>`).join("")}`)}</div>
      ${blocked ? `<div class="empty" style="position:fixed;bottom:0;left:0;right:0">This chat is blocked.</div>` : `<div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--card);border-top:1px solid var(--line);padding:8px 10px calc(8px + env(safe-area-inset-bottom));display:flex;gap:8px;align-items:center"><label style="font-size:26px;cursor:pointer" aria-label="Photo">📷<input id="mi" type="file" accept="image/*" hidden></label><input id="msg" placeholder="Message…" maxlength="1000" autocomplete="off" value="${esc(M.draft)}" style="border-radius:99px"><button data-a="x:chat:send" aria-label="Send" style="width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;font-size:18px;flex:none">➤</button></div>`}`;
    },
    after(c) {
      const go = () => views.chat.on("send", null, c).then(r => { if (r !== "skip") c.render(); }).catch(x => c.toast(x.message || x.code));
      const i = document.getElementById("msg"); if (i) { i.oninput = e => M.draft = e.target.value; i.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); go(); } }; }
      const f = document.getElementById("mi"); if (f) f.onchange = go;
      if (M.cur) window.scrollTo(0, document.body.scrollHeight);
    },
    async send(text, img) {
      await addDoc(collection(db, "chats", M.cur, "messages"), { from: uid(), text, img: img || "", at: serverTimestamp() });
      await updateDoc(doc(db, "chats", M.cur), { last: text || "📷 Photo", updatedAt: serverTimestamp() });
    },
    async on(a, el, c) {
      const u = uid();
      if (a === "start") {
        const o = el.dataset.o; if (!o || o === u) return;
        const l = el.dataset.l || "direct", id = [u, o].sort().join("_") + "_" + l, ref = doc(db, "chats", id);
        const ex = await getDoc(ref);
        await setDoc(ref, { members: [u, o].sort(), names: { [u]: auth.currentUser.displayName || "", [o]: el.dataset.n || "" }, ...(el.dataset.l ? { listing: { id: l, title: el.dataset.lt || "", img: el.dataset.li || "", price: el.dataset.lp || "" } } : {}), updatedAt: serverTimestamp() }, { merge: true });
        c.S.tab = "chat"; c.S.ov = null; await this.init(); await this.on("open", { dataset: { id } }, c);
        if (!ex.exists() && el.dataset.m) { M.cur = id; await this.send(el.dataset.m); }
        return;
      }
      if (a === "open") {
        M.cur = el.dataset.id; M.msgs = []; M.draft = ""; M.unsub?.();
        M.unsub = onSnapshot(query(collection(db, "chats", M.cur, "messages"), orderBy("at"), limit(100)), s => { M.msgs = ids(s); if (c.S.tab === "chat") c.render(); }, e => c.toast(e.code));
      } else if (a === "back") { M.unsub?.(); M.cur = null; await this.init(); }
      else if (a === "quick") await this.send(el.dataset.m);
      else if (a === "send") {
        const text = val("msg"), f = document.getElementById("mi")?.files[0]; if (!text && !f) return "skip";
        const img = f ? await uploadImage(f) : ""; M.draft = ""; await this.send(text, img);
      } else if (a === "block") { await updateDoc(doc(db, "chats", M.cur), { blockedBy: arrayUnion(u) }); await this.init(); c.toast("Blocked"); }
      else if (a === "report") { const r = prompt("What is the problem?"); if (r) { await addDoc(collection(db, "reports"), { by: u, kind: "chat", target: M.cur, targetUser: M.chats.find(x => x.id === M.cur)?.members.find(m => m !== u) || "", reason: r.slice(0, 300), status: "open", createdAt: serverTimestamp() }); c.toast("Report sent"); } }
    }
  },

  /* ---------------- Blood network (consent-based) ---------------- */
  blood: {
    icon: "🩸", label: ["Blood network", "রক্তদান"],
    async init() {
      const u = uid();
      const [d, r, m] = await Promise.all([getDocs(query(collection(db, "donors"), where("available", "==", true))), getDocs(query(collection(db, "bloodRequests"), where("status", "==", "open"))), getDoc(doc(db, "donors", u))]);
      M.donors = ids(d); M.reqs = ids(r).sort(byNew); M.mine = m.exists() ? m.data() : null; M.resp = {};
    },
    render({ S, esc }) {
      const u = uid(), opt = g => GROUPS.map(x => `<option ${x === g ? "selected" : ""}>${x}</option>`).join("");
      return `<div class="hero"><h1>${S.lang === "bn" ? "রক্তদান" : "Blood network"}</h1></div><div class="sec">
      <div class="card"><small>MAVYQO only connects people. Medical compatibility and eligibility must be confirmed by a qualified professional.</small></div>
      <h2>Request blood</h2><div class="card"><label for="bg">Blood group</label><select id="bg">${opt()}</select><label for="ba">Area</label><input id="ba" value="${esc(S.area)}" maxlength="80"><label for="bn">Note</label><input id="bn" maxlength="200"><br><br><button class="btn" data-a="x:blood:req">Post request</button></div>
      <h2>Open requests</h2>${M.reqs.length ? M.reqs.map(r => `<div class="card"><span class="tag">🩸 ${esc(r.group)}</span> <b>${esc(r.area)}</b><div>${esc(r.note)}</div>${r.requester === u ? `<small>Donors will message you in Chats.</small><br><br><button class="btn alt" data-a="x:blood:close" data-id="${r.id}">Close request</button>` : (M.mine?.available ? `<button class="btn" data-a="x:chat:start" data-o="${esc(r.requester)}" data-n="${esc(r.name)}" data-m="Hi, I may be able to donate ${esc(r.group)} blood. Is it still needed?">💬 I can help — message</button>` : "")}</div>`).join("") : `<div class="empty">No open requests.</div>`}
      <h2>Donor registration</h2><div class="card"><label for="dg">Blood group</label><select id="dg">${opt(M.mine?.group)}</select><label for="da">Area</label><input id="da" value="${esc(M.mine?.area || S.area)}" maxlength="80">
      <label><input type="checkbox" id="dav" style="width:auto" ${M.mine?.available ? "checked" : ""}> Available to donate</label>
      <label><input type="checkbox" id="dco" style="width:auto" ${M.mine?.consent ? "checked" : ""}> I agree to show my blood group, area and availability to signed-in members. My phone number is never shown; people reach me only through chat.</label><br><button class="btn" data-a="x:blood:save">Save donor profile</button></div>
      <h2>Available donors</h2>${M.donors.length ? M.donors.map(d => `<div class="card"><span class="tag">🩸 ${esc(d.group)}</span> ${esc(d.name)} · ${esc(d.area)}</div>`).join("") : `<div class="empty">No donors listed yet.</div>`}</div>`;
    },
    async on(a, el, c) {
      const u = uid();
      if (a === "save") {
        if (!document.getElementById("dco").checked) throw new Error("Consent is required to be listed");
        await setDoc(doc(db, "donors", u), { name: auth.currentUser.displayName || "", group: val("dg"), area: val("da"), available: document.getElementById("dav").checked, consent: true, updatedAt: serverTimestamp() }); c.toast("Saved");
      } else if (a === "req") {
        if (!val("ba")) throw new Error("Enter an area");
        if (hasPhone(val("bn"))) throw new Error("Phone numbers can't be posted. Use chat.");
        await addDoc(collection(db, "bloodRequests"), { requester: u, name: auth.currentUser.displayName || "", group: val("bg"), area: val("ba"), note: val("bn"), status: "open", createdAt: serverTimestamp() }); c.toast("Request posted");
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
