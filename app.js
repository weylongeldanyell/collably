(() => {
"use strict";
const cfg = window.COLLABLY_CONFIG || {};
const hasSupabase = !!(window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY);
const demoMode = cfg.DEMO_MODE !== false || !hasSupabase;
const sb = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}) : null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = n => (n||"C").trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const money = n => n == null || n === "" ? "Rate on request" : "$"+Number(n).toLocaleString();
const fmt = d => d ? new Date(d).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "";
const ago = d => { if(!d) return ""; const m=Math.floor((Date.now()-new Date(d))/60000); return m<1?"now":m<60?m+"m":m<1440?Math.floor(m/60)+"h":Math.floor(m/1440)+"d"; };
const toast = (msg,type="") => { const el=document.createElement("div"); el.className="toast "+type; el.textContent=msg; $("#toast").appendChild(el); setTimeout(()=>el.remove(),3200); };
const closeModal = id => $("#"+id)?.classList.add("hidden");
const openModal = id => $("#"+id)?.classList.remove("hidden");

const DEMO = {
 user:{id:"demo-user",email:"demo@collably.local"},
 profile:{id:"demo-user",role:"worker",username:"tkcreator",full_name:"Your Demo Profile",bio:"Creative worker building great content with creators.",skills:["Video Editing","Short-form","YouTube"],tools:["Premiere Pro","CapCut"],hourly_rate:30,rating:5},
 profiles:[
  {id:"d1",role:"worker",username:"miachen",full_name:"Mia Chen",bio:"Video editor focused on clean storytelling and short-form content.",skills:["Video Editing","Short-form","YouTube"],tools:["Premiere Pro","After Effects"],hourly_rate:35,rating:4.9},
  {id:"d2",role:"worker",username:"jayclips",full_name:"Jay Williams",bio:"Twitch clipper turning long streams into punchy moments.",skills:["Clipping","Twitch","Gaming"],tools:["CapCut","Premiere Pro"],hourly_rate:18,rating:5},
  {id:"d3",role:"worker",username:"avapatel",full_name:"Ava Patel",bio:"Designer making thumbnails and brand systems.",skills:["Design","Thumbnails","Branding"],tools:["Figma","Photoshop"],hourly_rate:30,rating:4.8},
  {id:"d4",role:"worker",username:"noahsocial",full_name:"Noah Smith",bio:"Social media strategy, posting and creator growth.",skills:["Social Media","TikTok","Strategy"],tools:["Notion","Canva"],hourly_rate:25,rating:4.9},
  {id:"d5",role:"worker",username:"lucabuilds",full_name:"Luca Brown",bio:"Developer building fast websites and creator tools.",skills:["Development","Web Apps","APIs"],tools:["React","JavaScript"],hourly_rate:45,rating:5}
 ],
 jobs:[
  {id:"dj1",title:"YouTube Shorts Editor",description:"Need someone to turn long gaming videos into high-retention Shorts.",skill:"Video Editing",budget_min:300,budget_max:500,budget_type:"project",status:"open",created_at:new Date().toISOString(),buyer_name:"Gaming creator"},
  {id:"dj2",title:"Twitch Clipper",description:"Looking for someone to clip 3-5 strong moments per stream.",skill:"Clipping",budget_min:20,budget_max:30,budget_type:"hour",status:"open",created_at:new Date().toISOString(),buyer_name:"Streamer"}
 ],
 apps:[],conversations:[],messages:[],portfolio:[]
};

let state={route:"home",user:null,profile:null,profiles:[],jobs:[],applications:[],conversations:[],messages:[],portfolio:[],notifications:[],selectedConversation:null,loading:false};

function currentUser(){ return state.user; }
function isDemo(){ return demoMode; }

async function loadSession(){
  if(isDemo()){
    state.user=DEMO.user; state.profile=DEMO.profile; state.profiles=DEMO.profiles; state.jobs=DEMO.jobs; state.applications=DEMO.apps; state.conversations=DEMO.conversations; state.messages=DEMO.messages; state.portfolio=DEMO.portfolio;
    return;
  }
  const {data:{session}}=await sb.auth.getSession();
  if(session){ state.user=session.user; await loadProfile(); await refreshAll(); }
  sb.auth.onAuthStateChange(async (_event,session)=>{
    state.user=session?.user||null;
    if(state.user){ await loadProfile(); await refreshAll(); showApp(); }
    else { state.profile=null; showAuth(); }
  });
}

async function loadProfile(){
  if(!state.user) return;
  const {data,error}=await sb.from("profiles").select("*").eq("id",state.user.id).single();
  if(error){ toast(error.message,"bad"); return; }
  state.profile=data;
}
async function refreshAll(){
  if(isDemo()) return;
  const uid=state.user.id;
  const [p,j,a,c,m,port,n]=await Promise.all([
    sb.from("profiles").select("*").order("created_at",{ascending:false}),
    sb.from("jobs").select("*,profiles:buyer_id(full_name,username)").eq("status","open").order("created_at",{ascending:false}),
    sb.from("applications").select("*,jobs:job_id(*),worker:worker_id(full_name,username)").order("created_at",{ascending:false}),
    sb.from("conversations").select("*,buyer:buyer_id(full_name,username),worker:worker_id(full_name,username)").or(`buyer_id.eq.${uid},worker_id.eq.${uid}`).order("updated_at",{ascending:false}),
    sb.from("messages").select("*").order("created_at",{ascending:true}),
    sb.from("portfolio_items").select("*").order("created_at",{ascending:false}),
    sb.from("notifications").select("*").eq("user_id",uid).order("created_at",{ascending:false})
  ]);
  if(p.error) toast(p.error.message,"bad"); else state.profiles=p.data||[];
  if(j.error) toast(j.error.message,"bad"); else state.jobs=j.data||[];
  if(a.error) toast(a.error.message,"bad"); else state.applications=a.data||[];
  if(c.error) toast(c.error.message,"bad"); else state.conversations=c.data||[];
  if(m.error) toast(m.error.message,"bad"); else state.messages=m.data||[];
  if(port.error) toast(port.error.message,"bad"); else state.portfolio=port.data||[];
  if(n.error) toast(n.error.message,"bad"); else state.notifications=n.data||[];
}

function showAuth(){ $("#app").classList.add("hidden"); $("#auth").classList.remove("hidden"); $("#loading").classList.add("hidden"); }
function showApp(){ $("#auth").classList.add("hidden"); $("#app").classList.remove("hidden"); $("#loading").classList.add("hidden"); render(); }

function setAuthTab(tab){
  $$(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
  $("#loginForm").classList.toggle("hidden",tab!=="login"); $("#signupForm").classList.toggle("hidden",tab!=="signup");
}
function setRoute(route){
  const valid=["home","discover","jobs","messages","notifications","profile","settings"];
  state.route=valid.includes(route)?route:"home"; location.hash=state.route; render();
}
function render(){
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===state.route));
  renderMiniUser();
  const views={home:renderHome,discover:renderDiscover,jobs:renderJobs,messages:renderMessages,notifications:renderNotifications,profile:renderProfile,settings:renderSettings};
  $("#view").innerHTML=(views[state.route]||renderHome)();
  bindView();
}
function renderMiniUser(){
  const p=state.profile; if(!p) return;
  $("#miniUser").innerHTML=`<div class="mini-user-inner"><div class="avatar avatar-sm">${esc(initials(p.full_name))}</div><div><div class="mini-user-name">${esc(p.full_name)}</div><div class="mini-user-role">${esc(p.role)}</div></div></div>`;
  $("#topProfile").textContent=initials(p.full_name);
  const unread=state.notifications.filter(n=>!n.read_at).length;
  $("#notifBadge").textContent=unread; $("#notifBadge").classList.toggle("hidden",!unread);
}

function workerCard(p){
 return `<article class="card worker-card"><div class="worker-top"><div class="avatar">${esc(initials(p.full_name))}</div><div><div class="worker-name">${esc(p.full_name)}</div><div class="handle">@${esc(p.username||"user")} · ${esc(p.role)}</div></div><div class="rate">${money(p.hourly_rate)}<span class="muted">/hr</span></div></div><p class="muted">${esc(p.bio||"No bio yet.")}</p><div class="chips">${(p.skills||[]).slice(0,4).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><div><span class="stars">★</span> ${p.rating??"New"} <span class="muted"> · ${p.tools?.length||0} tools</span></div><div class="job-actions"><button class="btn secondary" data-view-worker="${esc(p.id)}">View profile</button>${state.profile?.role==="buyer"?`<button class="btn primary" data-message-worker="${esc(p.id)}">Message</button>`:""}</div></article>`;
}
function jobCard(j){
 const buyer=j.profiles?.full_name||j.buyer_name||"Buyer";
 const budget=j.budget_min!=null&&j.budget_max!=null?`${money(j.budget_min)}–${money(j.budget_max)}`:money(j.budget_min||j.budget_max);
 const mine=j.buyer_id===state.user?.id;
 const applied=!mine && state.applications.some(a=>a.job_id===j.id && a.worker_id===state.user?.id);
 return `<article class="card job-card"><div class="job-title">${esc(j.title)}</div><div class="job-meta"><span>${esc(buyer)}</span><span>·</span><span>${esc(j.skill)}</span><span>·</span><span>${fmt(j.created_at)}</span></div><p class="muted">${esc(j.description)}</p><div class="job-budget">${budget} <span class="muted">/ ${esc(j.budget_type||"project")}</span></div><div class="job-actions">${mine?`<button class="btn ghost" data-view-apps="${esc(j.id)}">View applications</button>`:applied?`<button class="btn ghost" disabled>Applied</button>`:`<button class="btn primary" data-apply-job="${esc(j.id)}">Apply</button>`}</div></article>`;
}
function renderHome(){
 const workers=state.profiles.filter(p=>p.role==="worker").slice(0,3);
 const jobs=state.jobs.slice(0,3);
 const apps=state.applications.filter(a=>a.worker_id===state.user?.id).length;
 return `<div class="hero"><div><div class="eyebrow">THE CREATOR WORKFORCE</div><h1>Build your team without the busywork.</h1><p>Collably connects creators, businesses and skilled online workers — from editors and clippers to designers, social media workers and developers.</p><div class="hero-actions"><button class="btn primary" data-route="discover">Find talent</button><button class="btn ghost" data-route="jobs">Browse jobs</button></div></div><div class="hero-mark"><img src="logo.svg" alt="Collably"></div></div>
 <div class="stats-strip"><div><strong>${state.profiles.filter(p=>p.role==='worker').length}</strong><span>workers</span></div><div><strong>${state.jobs.length}</strong><span>open jobs</span></div><div><strong>${state.profile?.role==='worker'?apps:state.conversations.length}</strong><span>${state.profile?.role==='worker'?'applications':'conversations'}</span></div></div>
 <section class="section"><div class="section-title"><h2>People worth discovering</h2><button class="btn ghost" data-route="discover">See all</button></div><div class="grid">${workers.map(workerCard).join("")||`<div class="empty">No workers yet.</div>`}</div></section>
 <section class="section"><div class="section-title"><h2>Latest jobs</h2><button class="btn ghost" data-route="jobs">View jobs</button></div><div class="grid">${jobs.map(jobCard).join("")||`<div class="empty">No jobs yet.</div>`}</div></section>`;
}
function renderDiscover(){
 const q=($("#globalSearch")?.value||"").trim().toLowerCase();
 const workers=state.profiles.filter(p=>p.role==="worker" && (!q || [p.full_name,p.username,p.bio,...(p.skills||[]),...(p.tools||[])].join(" ").toLowerCase().includes(q)));
 return `<div class="page-head"><div><h1>Discover</h1><p>Find people by skill, tool, name or specialty.</p></div></div><div class="grid">${workers.map(workerCard).join("")||`<div class="empty">No workers match “${esc(q)}”.</div>`}</div>`;
}
function renderJobs(){
 const q=($("#globalSearch")?.value||"").trim().toLowerCase();
 const jobs=state.jobs.filter(j=>!q || [j.title,j.description,j.skill,j.profiles?.full_name].join(" ").toLowerCase().includes(q));
 const myApps=state.applications.filter(a=>a.worker_id===state.user?.id);
 const appsBlock=state.profile?.role==='worker'?`<section class="section"><div class="section-title"><h2>Your applications</h2><span class="muted">${myApps.length}</span></div><div class="grid two">${myApps.length?myApps.slice(0,6).map(a=>`<article class="card job-card"><div class="job-title">${esc(a.jobs?.title||'Job')}</div><div class="job-meta"><span>${esc(a.jobs?.skill||'')}</span><span>·</span><span>${fmt(a.created_at)}</span></div><p class="muted">Status: <strong class="status-${esc(a.status)}">${esc(a.status)}</strong></p></article>`).join(''):`<div class="empty">You haven't applied to any jobs yet.</div>`}</div></section>`:'';
 return `<div class="page-head"><div><p class="eyebrow">OPPORTUNITIES</p><h1>Jobs</h1><p>Find work or hire someone for your next project.</p></div>${state.profile?.role==='buyer'?`<button class="btn primary" id="postJobBtn">＋ Post a job</button>`:''}</div><div class="grid">${jobs.map(jobCard).join("")||`<div class="empty">No open jobs match your search.</div>`}</div>${appsBlock}`;
}
function renderNotifications(){
 const ns=state.notifications;
 return `<div class="page-head"><div><h1>Notifications</h1><p>Updates about applications, messages and activity.</p></div>${ns.length?`<button class="btn ghost" id="readAll">Mark all read</button>`:""}</div>${ns.length?`<div class="card">${ns.map(n=>`<div class="setting-row"><div><strong>${esc(n.title||"Collably update")}</strong><small>${esc(n.body||"")} · ${ago(n.created_at)}</small></div>${n.read_at?`<span class="muted">Read</span>`:`<span class="chip">New</span>`}</div>`).join("")}</div>`:`<div class="empty">You're all caught up.</div>`}`;
}
function renderProfile(){
 const p=state.profile, mine=state.portfolio.filter(x=>x.user_id===p?.id);
 return `<div class="profile-head"><div class="avatar profile-avatar">${esc(initials(p?.full_name))}</div><div><h1 style="margin:0">${esc(p?.full_name||"Profile")}</h1><div class="handle">@${esc(p?.username||"user")} · ${esc(p?.role||"")}</div><p class="muted">${esc(p?.bio||"Add a bio in Settings.")}</p><div class="chips">${(p?.skills||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><div class="profile-stats"><div class="stat"><strong>${mine.length}</strong><span>Portfolio</span></div><div class="stat"><strong>${p?.rating??"New"}</strong><span>Rating</span></div><div class="stat"><strong>${money(p?.hourly_rate)}</strong><span>Hourly</span></div></div></div></div>
 <section class="section"><div class="section-title"><h2>Portfolio</h2>${p?.role==="worker"?`<button class="btn primary" id="addPortfolioBtn">＋ Add work</button>`:""}</div>${mine.length?`<div class="portfolio-grid">${mine.map(portfolioThumb).join("")}</div>`:`<div class="empty">Your portfolio is empty. Add your first piece of work.</div>`}</section>`;
}
function portfolioThumb(x){ return `<div class="portfolio-thumb">${x.media_url?(x.media_type==="video"?`<video src="${esc(x.media_url)}" controls></video>`:`<img src="${esc(x.media_url)}" alt="${esc(x.title)}">`):`<span>${esc(x.title)}</span>`}</div>`; }
function renderSettings(){
 const p=state.profile||{};
 return `<div class="page-head"><div><h1>Settings</h1><p>Keep your Collably profile up to date.</p></div></div>
 <div class="card"><form id="profileForm" class="form">
 <div class="two-col"><label>Full name<input id="setName" value="${esc(p.full_name)}" required></label><label>Username<input id="setUsername" value="${esc(p.username)}" pattern="[A-Za-z0-9_]+" required></label></div>
 <label>Bio<textarea id="setBio" maxlength="500">${esc(p.bio||"")}</textarea></label>
 <div class="two-col"><label>Hourly rate<input id="setRate" type="number" min="0" step="1" value="${p.hourly_rate??""}"></label><label>Skills<input id="setSkills" value="${esc((p.skills||[]).join(", "))}" placeholder="Video Editing, YouTube, Shorts"></label></div>
 <label>Tools<input id="setTools" value="${esc((p.tools||[]).join(", "))}" placeholder="Premiere Pro, CapCut"></label>
 <button class="btn primary" type="submit">Save changes</button>
 </form></div>
 <section class="section card"><div class="setting-row"><div><strong>Account type</strong><small>${esc(p.role||"")}</small></div><span class="chip">${demoMode?"Demo mode":"Connected"}</span></div><div class="setting-row"><div><strong>Account email</strong><small>${esc(state.user?.email||"")}</small></div></div></section>`;
}
function renderMessages(){
 const convs=state.conversations;
 const selected=state.selectedConversation;
 const c=convs.find(x=>x.id===selected)||convs[0];
 if(c && !selected) state.selectedConversation=c.id;
 const people=c?(c.buyer_id===state.user?.id?c.worker:c.buyer):null;
 const msgs=c?state.messages.filter(m=>m.conversation_id===c.id):[];
 return `<div class="page-head"><div><h1>Messages</h1><p>Talk directly with people you're working with.</p></div></div>
 <div class="messages-layout"><div class="conversation-list">${convs.length?convs.map(x=>{const person=x.buyer_id===state.user?.id?x.worker:x.buyer;return `<button class="conversation ${x.id===c?.id?"active":""}" data-conversation="${x.id}"><div class="avatar avatar-sm">${esc(initials(person?.full_name||"U"))}</div><div><strong>${esc(person?.full_name||"Conversation")}</strong><small>${esc(x.last_message||"Start a conversation")}</small></div></button>`}).join(""):`<div class="empty" style="margin:14px">No conversations yet.</div>`}</div>
 <div class="chat">${c?`<div class="chat-head">${esc(people?.full_name||"Conversation")}</div><div class="chat-body">${msgs.map(m=>`<div class="bubble ${m.sender_id===state.user?.id?"mine":""}">${esc(m.body)}<small>${ago(m.created_at)}</small></div>`).join("")||`<div class="empty">Send the first message.</div>`}</div><form id="messageForm" class="chat-form"><input id="messageInput" placeholder="Write a message…" autocomplete="off" required><button class="btn primary">Send</button></form>`:`<div class="empty" style="margin:auto">Choose a conversation to start chatting.</div>`}</div></div>`;
}

function bindView(){
 $$("#view [data-route]").forEach(b=>b.addEventListener("click",()=>setRoute(b.dataset.route)));
 $("#postJobBtn")?.addEventListener("click",()=>openModal("jobModal"));
 $("#addPortfolioBtn")?.addEventListener("click",()=>openModal("portfolioModal"));
 $$("#view [data-view-worker]").forEach(b=>b.addEventListener("click",()=>viewWorker(b.dataset.viewWorker)));
 $$("#view [data-message-worker]").forEach(b=>b.addEventListener("click",()=>startConversation(b.dataset.messageWorker)));
 $$("#view [data-apply-job]").forEach(b=>b.addEventListener("click",()=>applyJob(b.dataset.applyJob)));
 $$("#view [data-view-apps]").forEach(b=>b.addEventListener("click",()=>viewApplications(b.dataset.viewApps)));
 $("#readAll")?.addEventListener("click",markNotificationsRead);
 $("#profileForm")?.addEventListener("submit",saveProfile);
 $("#messageForm")?.addEventListener("submit",sendMessage);
 $$("#view [data-conversation]").forEach(b=>b.addEventListener("click",()=>{state.selectedConversation=b.dataset.conversation;render();}));
}
function viewWorker(id){
 const p=state.profiles.find(x=>x.id===id); if(!p) return;
 const items=state.portfolio.filter(x=>x.user_id===id);
 $("#view").innerHTML=`<button class="btn ghost" id="backDiscover">← Back</button><div class="profile-head" style="margin-top:14px"><div class="avatar profile-avatar">${esc(initials(p.full_name))}</div><div><h1 style="margin:0">${esc(p.full_name)}</h1><div class="handle">@${esc(p.username)} · ${esc(p.role)}</div><p class="muted">${esc(p.bio||"")}</p><div class="chips">${(p.skills||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><p><span class="stars">★</span> ${p.rating??"New"} · ${money(p.hourly_rate)}/hr</p>${state.profile?.role==="buyer"?`<button class="btn primary" data-message-worker="${esc(p.id)}">Message ${esc(p.full_name)}</button>`:""}</div></div><section class="section"><div class="section-title"><h2>Portfolio</h2></div>${items.length?`<div class="portfolio-grid">${items.map(portfolioThumb).join("")}</div>`:`<div class="empty">No portfolio items yet.</div>`}</section>`;
 $("#backDiscover").addEventListener("click",()=>setRoute("discover")); $("#view [data-message-worker]")?.addEventListener("click",()=>startConversation(p.id));
}
async function viewApplications(jobId){
 const job=state.jobs.find(x=>x.id===jobId); if(!job)return;
 if(job.buyer_id!==state.user?.id){toast("Only the job owner can view applications.","bad");return;}
 const rows=state.applications.filter(a=>a.job_id===jobId);
 const enriched=[];
 for(const a of rows){ const worker=state.profiles.find(p=>p.id===a.worker_id); enriched.push({...a,worker}); }
 openModal("applicationsModal");
 const box=$("#applicationsContent");
 box.innerHTML=`<h2>Applications</h2><p class="muted">${esc(job.title)} · ${enriched.length} application${enriched.length===1?'':'s'}</p>${enriched.length?enriched.map(a=>`<div class="application-row"><div class="avatar">${esc(initials(a.worker?.full_name||'Worker'))}</div><div class="application-main"><strong>${esc(a.worker?.full_name||'Worker')}</strong><span class="handle">@${esc(a.worker?.username||'')}</span><p>${esc(a.cover_message||'No cover message.')}</p><div class="chips">${(a.worker?.skills||[]).slice(0,4).map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div></div><div class="application-actions"><span class="chip status-${esc(a.status)}">${esc(a.status)}</span><button class="btn ghost" data-app-message="${esc(a.worker_id)}">Message</button>${a.status==='pending'?`<button class="btn primary" data-accept-app="${esc(a.id)}">Accept</button>`:''}</div></div>`).join(''):`<div class="empty">No applications yet. When workers apply, they'll appear here.</div>`}`;
 $$("[data-app-message]").forEach(b=>b.onclick=()=>startConversation(b.dataset.appMessage));
 $$("[data-accept-app]").forEach(b=>b.onclick=()=>acceptApplication(b.dataset.acceptApp,job));
}
async function acceptApplication(appId,job){
 const {error}=await sb.from('applications').update({status:'accepted'}).eq('id',appId);
 if(error){toast(error.message,'bad');return;}
 const a=state.applications.find(x=>x.id===appId); if(a) a.status='accepted';
 if(a) await notifyUser(a.worker_id,'Application accepted',`Your application for “${job.title}” was accepted.`);
 await sb.from('jobs').update({status:'filled'}).eq('id',job.id);
 closeModal('applicationsModal'); await refreshAll(); toast('Application accepted.','good'); render();
}
async function notifyUser(userId,title,body){
 if(isDemo()||!userId||userId===state.user?.id)return;
 const {error}=await sb.from('notifications').insert({user_id:userId,title,body});
 if(error)console.warn('notification:',error.message);
}

async function applyJob(jobId){
 if(state.profile?.role!=="worker"){toast("Only worker accounts can apply to jobs.","bad");return;}
 const existing=state.applications.find(a=>a.job_id===jobId&&a.worker_id===state.user?.id);if(existing){toast("You've already applied to this job.");return;}
 if(isDemo()){toast("Demo application created. Connect Supabase for shared applications.","good");return;}
 const job=state.jobs.find(x=>x.id===jobId);
 openModal("applicationModal");
 $("#applicationJobTitle").textContent=job?.title||"Job application";
 $("#applicationForm").onsubmit=async e=>{e.preventDefault();const cover=$("#applicationCover").value.trim();if(!cover){toast("Add a short message with your application.","bad");return;}const {error}=await sb.from("applications").insert({job_id:jobId,worker_id:state.user.id,cover_message:cover});if(error){toast(error.message,"bad");return;}if(job)await notifyUser(job.buyer_id,'New application',`${state.profile.full_name} applied for “${job.title}”.`);closeModal("applicationModal");toast("Application sent.","good");await refreshAll();render();};
}
async function startConversation(workerId){
 const target=state.profiles.find(p=>p.id===workerId);
 if(!target){toast("That profile could not be found.","bad");return;}
 let buyerId, workerIdFinal;
 if(state.profile?.role==='buyer'){buyerId=state.user.id;workerIdFinal=workerId;} else {buyerId=workerId;workerIdFinal=state.user.id;}
 if(isDemo()){state.conversations.unshift({id:"demo-"+Date.now(),buyer_id:buyerId,worker_id:workerIdFinal,buyer:{full_name:state.profile.full_name},worker:target,last_message:"New conversation"});setRoute("messages");return;}
 let {data,error}=await sb.from("conversations").select("*").eq("buyer_id",buyerId).eq("worker_id",workerIdFinal).maybeSingle();
 if(error){toast(error.message,"bad");return;}
 if(!data){({data,error}=await sb.from("conversations").insert({buyer_id:buyerId,worker_id:workerIdFinal}).select().single());}
 if(error){toast(error.message,"bad");return;}
 state.selectedConversation=data.id; await refreshAll(); setRoute("messages");
}
async function sendMessage(e){
 e.preventDefault(); const input=$("#messageInput"); const body=input.value.trim(); const c=state.conversations.find(x=>x.id===state.selectedConversation); if(!body||!c)return;
 if(isDemo()){state.messages.push({id:"m"+Date.now(),conversation_id:c.id,sender_id:state.user.id,body,created_at:new Date().toISOString()});input.value="";render();return;}
 const {error}=await sb.from("messages").insert({conversation_id:c.id,sender_id:state.user.id,body});
 if(error){toast(error.message,"bad");return;}
 const recipient=c.buyer_id===state.user.id?c.worker_id:c.buyer_id;
 await sb.from('conversations').update({last_message:body,updated_at:new Date().toISOString()}).eq('id',c.id);
 await notifyUser(recipient,`New message from ${state.profile.full_name}`,body);
 input.value=""; await refreshAll(); render();
}
async function saveProfile(e){
 e.preventDefault();
 const payload={full_name:$("#setName").value.trim(),username:$("#setUsername").value.trim(),bio:$("#setBio").value.trim(),hourly_rate:$("#setRate").value?Number($("#setRate").value):null,skills:$("#setSkills").value.split(",").map(x=>x.trim()).filter(Boolean),tools:$("#setTools").value.split(",").map(x=>x.trim()).filter(Boolean),updated_at:new Date().toISOString()};
 if(isDemo()){Object.assign(state.profile,payload);toast("Profile saved in demo mode.","good");render();return;}
 const {data,error}=await sb.from("profiles").update(payload).eq("id",state.user.id).select().single();
 if(error){toast(error.message,"bad");return;} state.profile=data;toast("Profile updated.","good");render();
}
async function createJob(e){
 e.preventDefault(); if(state.profile?.role!=="buyer"){toast("Only buyer accounts can post jobs.","bad");return;}
 const payload={title:$("#jobTitle").value.trim(),description:$("#jobDescription").value.trim(),budget_min:$("#jobMin").value?Number($("#jobMin").value):null,budget_max:$("#jobMax").value?Number($("#jobMax").value):null,budget_type:$("#jobType").value,skill:$("#jobSkill").value.trim()};
 if(payload.budget_min!=null&&payload.budget_max!=null&&payload.budget_max<payload.budget_min){toast("Maximum budget must be at least the minimum.","bad");return;}
 if(isDemo()){state.jobs.unshift({id:"dj"+Date.now(),...payload,status:"open",created_at:new Date().toISOString(),buyer_name:state.profile.full_name});closeModal("jobModal");e.target.reset();toast("Job posted in demo mode.","good");setRoute("jobs");return;}
 const {error}=await sb.from("jobs").insert({buyer_id:state.user.id,...payload});
 if(error){toast(error.message,"bad");return;} closeModal("jobModal");e.target.reset();await refreshAll();toast("Job published.","good");setRoute("jobs");
}
async function addPortfolio(e){
 e.preventDefault(); if(state.profile?.role!=="worker"){toast("Only worker accounts can add portfolio work.","bad");return;}
 const file=$("#portfolioFile").files[0], title=$("#portfolioTitle").value.trim(), description=$("#portfolioDescription").value.trim();
 if(!file){toast("Choose an image or video first.","bad");return;}
 if(file.size>25*1024*1024){toast("Please keep uploads under 25 MB.","bad");return;}
 if(isDemo()){state.portfolio.unshift({id:"dp"+Date.now(),user_id:state.user.id,title,description,media_url:URL.createObjectURL(file),media_type:file.type.startsWith("video/")?"video":"image",created_at:new Date().toISOString()});closeModal("portfolioModal");e.target.reset();toast("Portfolio item added in demo mode.","good");setRoute("profile");return;}
 const path=`${state.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
 const {error:up}=await sb.storage.from("portfolio").upload(path,file,{upsert:false,contentType:file.type});
 if(up){toast(up.message,"bad");return;}
 const {data:urlData}=sb.storage.from("portfolio").getPublicUrl(path);
 const {error}=await sb.from("portfolio_items").insert({user_id:state.user.id,title,description,media_url:urlData.publicUrl,media_type:file.type.startsWith("video/")?"video":"image"});
 if(error){toast(error.message,"bad");return;}
 closeModal("portfolioModal");e.target.reset();await refreshAll();toast("Portfolio item added.","good");setRoute("profile");
}
async function markNotificationsRead(){
 if(isDemo()){state.notifications.forEach(n=>n.read_at=new Date().toISOString());render();return;}
 await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",state.user.id).is("read_at",null);await refreshAll();render();
}

function setup(){
 $$(".auth-tab").forEach(b=>b.addEventListener("click",()=>setAuthTab(b.dataset.authTab)));
 $$(".role-card").forEach(b=>b.addEventListener("click",()=>{$$(".role-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#signupRole").value=b.dataset.role;}));
 $("#closeAuth").addEventListener("click",()=>{ if(state.user) showApp(); });
 $("#demoBtn").addEventListener("click",()=>{state.user=DEMO.user;state.profile=DEMO.profile;state.profiles=DEMO.profiles;state.jobs=DEMO.jobs;state.applications=DEMO.apps;state.conversations=[];state.messages=[];state.portfolio=[];showApp();toast("Demo mode loaded.","good");});
 $("#loginForm").addEventListener("submit",async e=>{e.preventDefault();if(demoMode){toast("Demo mode is active. Connect Supabase in config.js for real accounts.","bad");return;}const {error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value,password:$("#loginPassword").value});if(error)toast(error.message,"bad");});
 $("#signupForm").addEventListener("submit",async e=>{e.preventDefault();if(demoMode){toast("Connect Supabase in config.js to create real accounts.","bad");return;}const name=$("#signupName").value.trim(),username=$("#signupUsername").value.trim(),email=$("#signupEmail").value.trim(),password=$("#signupPassword").value,role=$("#signupRole").value;const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,username,role}}});if(error){toast(error.message,"bad");return;}if(data.session){toast("Account created.","good");}else{toast("Account created. Check your email to confirm it, then log in.","good");setAuthTab("login");}});
 $$("#app [data-route]").forEach(b=>b.addEventListener("click",()=>setRoute(b.dataset.route)));
 $("#topProfile").addEventListener("click",()=>setRoute("profile"));
 $("#logoutBtn").addEventListener("click",async()=>{if(!isDemo())await sb.auth.signOut();else{state.user=null;state.profile=null;showAuth();setAuthTab("login");}});
 $("#openCreate").addEventListener("click",()=>openModal("createModal"));
 $("#createJob").addEventListener("click",()=>{closeModal("createModal");if(state.profile?.role!=="buyer"){toast("Switch to a buyer account to post jobs.","bad");return;}openModal("jobModal");});
 $("#createPortfolio").addEventListener("click",()=>{closeModal("createModal");if(state.profile?.role!=="worker"){toast("Switch to a worker account to add portfolio work.","bad");return;}openModal("portfolioModal");});
 $("#jobForm").addEventListener("submit",createJob);$("#portfolioForm").addEventListener("submit",addPortfolio);
 $$(".close-modal").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
 $$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));
 $("#globalSearch").addEventListener("input",()=>{const q=$("#globalSearch").value.trim();if(q && state.route!=="discover" && state.route!=="jobs"){setRoute("discover");return;}if(state.route==="discover"||state.route==="jobs")render();});
 $("#mobileMenu").addEventListener("click",()=>{$(".sidebar").style.display=$(".sidebar").style.display==="flex"?"none":"flex";});
 window.addEventListener("hashchange",()=>{const r=location.hash.slice(1);if(r)setRoute(r);});
}
async function init(){
 setup();
 if(location.hash.slice(1)) state.route=location.hash.slice(1);
 await loadSession();
 if(state.user) showApp(); else showAuth();
 if(!isDemo()){
   sb.channel("collably-messages").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},async()=>{await refreshAll();if(state.route==="messages")render();}).subscribe();
 }
}
init();
})();