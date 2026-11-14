firebase.initializeApp({apiKey:"AIzaSyCAAxCTT0bK-Ub4grAQ8i9kWMP2UlL4Tj0",authDomain:"zyvora-e880e.firebaseapp.com",projectId:"zyvora-e880e",storageBucket:"zyvora-e880e.firebasestorage.app",messagingSenderId:"986314347955",appId:"1:986314347955:web:1af8b9b4699a73f4dce7c6"});
const auth=firebase.auth(),db=firebase.firestore(),FV=firebase.firestore.FieldValue,TS=FV.serverTimestamp;
const $=s=>document.querySelector(s),v=i=>$('#'+i).value.trim();
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bn=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='on';setTimeout(()=>t.className='',3200)};
const ago=t=>{if(!t)return'এইমাত্র';const m=Math.floor((Date.now()-t.toMillis())/6e4);return m<1?'এইমাত্র':m<60?bn(m)+' মিনিট আগে':m<1440?bn(Math.floor(m/60))+' ঘণ্টা আগে':bn(Math.floor(m/1440))+' দিন আগে'};
const docs=s=>s.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.createdAt?.seconds||1e10)-(a.createdAt?.seconds||1e10));
const modal=h=>{$('#modal').innerHTML='<div>'+h+'</div>';$('#modal').className='on'},close=()=>$('#modal').className='';
$('#modal').onclick=x=>{if(x.target.id=='modal')close()};
const avg=u=>u.ratingCount?(u.ratingSum/u.ratingCount).toFixed(1):'—';
const err=x=>toast(({'auth/invalid-credential':'ইমেইল বা পাসওয়ার্ড ভুল','auth/email-already-in-use':'এই ইমেইলে আগেই অ্যাকাউন্ট আছে','auth/weak-password':'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন','permission-denied':'অনুমতি নেই — Firestore rules দেখুন'}[x.code])||('সমস্যা: '+(x.message||x)));
/* ছবি: ব্রাউজারে ছোট করে Firestore-এ base64 হিসেবে রাখা হয় (পরে Storage-এ সরানো যাবে) */
const shrink=(f,w=800,q=.62)=>new Promise(r=>{const i=new Image;i.onload=()=>{const s=Math.min(1,w/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',q))};i.src=URL.createObjectURL(f)});
const pick=async(id,max,w)=>{const o=[];for(const f of[...$('#'+id).files].slice(0,max))o.push(await shrink(f,w));return o};
const tooBig=a=>a.flat().join('').length>880000?(toast('ছবিগুলো অনেক বড়। কম ছবি দিন'),true):false;
const thumbs=(i,b)=>{$('#'+b).innerHTML=[...i.files].slice(0,4).map(f=>`<img src="${URL.createObjectURL(f)}">`).join('')};
const safe=s=>/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)?s:'';
const gal=a=>a?.length?`<div class=gal>${a.map(s=>`<img src="${safe(s)}" onclick="zoom(this.src)">`).join('')}</div>`:'';
const zoom=s=>modal(`<img src="${s}" style="width:100%;border-radius:12px"><br><br><button class="btn g" onclick="close()">বন্ধ</button>`);
function autoReview(t,d,p){const f=[],a=(t+' '+d).replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c));
 if(/জুয়া|ক্যাসিনো|casino|\bbet\b|lottery|লটারি|অস্ত্র|মাদক|ইয়াবা|গাঁজা|crypto|ক্রিপ্টো|টাকা দ্বিগুণ|ইনভেস্ট|হ্যাক|জাল|নকল|fake|http|www\./i.test(t+' '+d))f.push('নিষিদ্ধ/সন্দেহজনক শব্দ');
 if(/(\+?88)?01[3-9]\d{8}/.test(a))f.push('বর্ণনায় ফোন নম্বর');if(d.length<15)f.push('বর্ণনা খুব ছোট');if(p<=0||p>5e6)f.push('অস্বাভাবিক দাম');if(/(.)\1{5,}/.test(a))f.push('স্প্যাম প্যাটার্ন');return f}
