const workers = [
  {name:"Mia Chen", role:"Video Editor", rate:"$35/hr", rating:"4.9", initials:"MC", tags:["Premiere Pro","YouTube","Short-form"]},
  {name:"Jay Williams", role:"Clipper", rate:"$18/hr", rating:"5.0", initials:"JW", tags:["Twitch","Gaming","Reels"]},
  {name:"Ava Patel", role:"Designer", rate:"$30/hr", rating:"4.8", initials:"AP", tags:["Thumbnails","Branding","Figma"]},
  {name:"Noah Smith", role:"Social Media", rate:"$25/hr", rating:"4.9", initials:"NS", tags:["TikTok","Strategy","Posting"]},
  {name:"Luca Brown", role:"Developer", rate:"$45/hr", rating:"5.0", initials:"LB", tags:["Web Apps","React","APIs"]},
  {name:"Sofia Jones", role:"Video Editor", rate:"$28/hr", rating:"4.9", initials:"SJ", tags:["DaVinci","Shorts","Ads"]}
];

const posts = [
  ["MC","Mia Chen","Video Editor","Stream highlights → short-form"],
  ["JW","Jay Williams","Clipper","Top 5 gaming moments"],
  ["AP","Ava Patel","Designer","YouTube thumbnail set"]
];

function renderFeed(){
  document.getElementById("feed").innerHTML = posts.map(p => `
    <article class="post">
      <div class="post-media"><span class="media-label">${p[3]}</span></div>
      <div class="post-info">
        <div class="creator"><div class="creator-avatar">${p[0]}</div><div><b>${p[1]} ✓</b><small>${p[2]}</small></div></div>
      </div>
    </article>`).join("");
}
function renderWorkers(list=workers){
  document.getElementById("workers").innerHTML = list.map(w => `
    <article class="worker">
      <div class="worker-top"><div class="worker-avatar">${w.initials}</div><div><h3>${w.name} <span class="verified">✓</span></h3><div class="worker-role">${w.role}</div></div></div>
      <div class="tags">${w.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
      <div class="worker-bottom"><span>★ ${w.rating} · ${w.rate}</span><button class="hire" onclick="hire('${w.name}')">View profile</button></div>
    </article>`).join("");
}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
function filterWorkers(role, el){
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active")); el.classList.add("active");
  renderWorkers(role==="All"?workers:workers.filter(w=>w.role===role));
}
function searchWorkers(){
  const q=document.getElementById("search").value.toLowerCase().trim();
  if(q){showPage("discover"); renderWorkers(workers.filter(w=>(w.name+" "+w.role+" "+w.tags.join(" ")).toLowerCase().includes(q)));}
  else renderWorkers();
}
function hire(name){
  document.getElementById("modal-content").innerHTML=`<p class="eyebrow">START A PROJECT</p><h2>Message ${name}</h2><p class="muted">Tell them what you need help with.</p><div class="form"><input placeholder="Project title"><input placeholder="Budget (optional)"><input placeholder="Write a message..."><button class="primary" onclick="closeModal();showPage('messages')">Send message</button></div>`;
  document.getElementById("modal").classList.remove("hidden");
}
function openSignup(role){
  document.getElementById("modal-content").innerHTML=`<p class="eyebrow">JOIN COLLABLY</p><h2>Create your account</h2><p class="muted">Choose how you'll use the platform.</p><div class="role-choice"><button class="${role==='buyer'?'selected':''}" onclick="openSignup('buyer')">◈ Buyer</button><button class="${role==='worker'?'selected':''}" onclick="openSignup('worker')">✦ Worker</button></div><div class="form" style="margin-top:14px"><input placeholder="Full name"><input type="email" placeholder="Email"><input type="password" placeholder="Password"><button class="primary" onclick="closeModal()">Create account</button></div>`;
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
renderFeed(); renderWorkers();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
