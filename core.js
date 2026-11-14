import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import*as A from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import*as F from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app=initializeApp({apiKey:"AIzaSyCAAxCTT0bK-Ub4grAQ8i9kWMP2UlL4Tj0",authDomain:"zyvora-e880e.firebaseapp.com",projectId:"zyvora-e880e",storageBucket:"zyvora-e880e.firebasestorage.app",messagingSenderId:"986314347955",appId:"1:986314347955:web:1af8b9b4699a73f4dce7c6"});
export const auth=A.getAuth(app),db=F.getFirestore(app);export{A,F};
export const L=localStorage.lang||'bn';
export const setLang=l=>{localStorage.lang=l;location.reload()};
const D={};`shop|কেনাকাটা|Shop
job|চাকরি|Jobs
community|কমিউনিটি|Community
donate|দান|Donate
blood|রক্তদান|Blood
helper|সহায়তা|Helper
delivery|ডেলিভারি|Delivery
service|সেবা|Services
guide|গাইড|Guide
explore|এলাকা|Explore
home|হোম|Home
create|তৈরি|Create
inbox|ইনবক্স|Inbox
profile|প্রোফাইল|Profile
search|এলাকার সবকিছু খুঁজুন…|Search anything near you…
login|লগইন|Log in
signup|রেজিস্টার|Sign up
name|পুরো নাম|Full name
email|ইমেইল|Email
pass|পাসওয়ার্ড (৬+)|Password (6+)
area|এলাকা|Area
logout|লগআউট|Log out
lang|ভাষা|Language
settings|সেটিংস|Settings
title|শিরোনাম|Title
desc|বিবরণ|Description
price|দাম (৳)|Price (৳)
phone|ফোন নম্বর|Phone
images|ছবি (একাধিক)|Photos (multiple)
submit|জমা দিন|Submit
verify|ইমেইল ভেরিফাই করুন, তারপর আবার চেষ্টা করুন|Verify your email first, then try again
resend|লিংক আবার পাঠান|Resend link
empty|এখনো কিছু নেই — প্রথম পোস্টটি আপনার হোক|Nothing here yet — be the first to post
request|অনুরোধ|Request
rate|রেটিং|Rate
report|অভিযোগ|Report
free|ফ্রি|Free
busy|ব্যস্ত|Busy
workreg|কাজের জন্য আবেদন|Apply to work
nid|NID নম্বর|NID number
nidphoto|NID এর ছবি|NID photo
selfie|নিজের ছবি|Your photo
bio|নিজের সম্পর্কে|About you
install|অ্যাপ ইনস্টল করুন|Install app
hello|স্বাগতম|Welcome
accept|গ্রহণ|Accept
decline|বাতিল|Decline
banned|আপনার অ্যাকাউন্ট নিষিদ্ধ|Your account is banned
needimg|কমপক্ষে একটি ছবি দিন|Add at least one photo
rejected|এই লেখা নীতিমালা পূরণ করে না|This content breaks our rules
pending|রিভিউয়ের জন্য পাঠানো হয়েছে|Sent for review
posted|প্রকাশিত হয়েছে|Published
wstatus|আবেদনের অবস্থা|Application status
tag|আপনার এলাকার সবকিছু এখন এক জায়গায়|Everything in your area, in one place
updates|এলাকার আপডেট|Local updates
need|কী লাগবে লিখুন|What do you need?
sent|অনুরোধ পাঠানো হয়েছে|Request sent
why|কারণ লিখুন|Reason
thanks|ধন্যবাদ|Thanks
by|পোস্ট|by`.split('\n').forEach(l=>{const[k,b,e]=l.split('|');D[k]=[b,e]});
export const t=k=>D[k]?D[k][L=='bn'?0:1]:k;
export const $=(s,e=document)=>e.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bad=/(scam|fake|casino|porn|gambling|প্রতারণা|জুয়া|ভুয়া|পর্ন)/i;
export const img=(f,m=800,q=.6,cap=200000)=>new Promise(r=>{const i=new Image;i.onload=()=>{let k=Math.min(1,m/Math.max(i.width,i.height)),o;for(;;){const c=document.createElement('canvas');c.width=Math.max(1,i.width*k);c.height=Math.max(1,i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);o=c.toDataURL('image/jpeg',q);if(o.length<=cap||k<.2)break;k*=.8;q=Math.max(.4,q-.05)}r(o)};i.src=URL.createObjectURL(f)});
