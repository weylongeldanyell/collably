const workers=[
{name:"Mia Chen",role:"Video Editor",rate:"$35/hr",rating:"4.9",initials:"MC",tags:["Premiere Pro","YouTube","Short-form"],bio:"I turn long-form streams and podcasts into polished videos and short-form clips."},
{name:"Jay Williams",role:"Clipper",rate:"$18/hr",rating:"5.0",initials:"JW",tags:["Twitch","Gaming","Reels"],bio:"Fast-turnaround gaming and livestream clipping."},
{name:"Ava Patel",role:"Designer",rate:"$30/hr",rating:"4.8",initials:"AP",tags:["Thumbnails","Branding","Figma"],bio:"Thumbnail and visual identity designer for creators."},
{name:"Noah Smith",role:"Social Media",rate:"$25/hr",rating:"4.9",initials:"NS",tags:["TikTok","Strategy","Posting"],bio:"I help creators plan, package and publish consistently."},
{name:"Luca Brown",role:"Developer",rate:"$45/hr",rating:"5.0",initials:"LB",tags:["Web Apps","React","APIs"],bio:"Full-stack developer building creator tools and websites."},
{name:"Sofia Jones",role:"Video Editor",rate:"$28/hr",rating:"4.9",initials:"SJ",tags:["DaVinci","Shorts","Ads"],bio:"Short-form and ad editor focused on clean pacing."}
];
const posts=[["MC","Mia Chen","Video Editor","Stream highlights → short-form"],["JW","Jay Williams","Clipper","Top gaming moments"],["AP","Ava Patel","Designer","YouTube thumbnail set"]];
const jobs=[
["YouTube Shorts Editor","Gaming creator","$300–$500 / project","Video Editor"],
["Need Twitch Clipper","Streamer","$20–$30 / hour","Clipper"],
["10 YouTube Thumbnails","Business creator","$250 fixed","Designer"],
["Social media manager","Podcast","$600 / month","Social Media"]
];
let conversations=[];
function go(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo(0,0)}
function renderFeed(){feed.innerHTML=posts.map(p=>`<article class="post"><div class="post-img">${p[3]}</div><div class="post-info"><div class="creator"><div class="creator-avatar">${p[0]}</div><div><b>${p[1]} <span class="verified">✓</span></b><small>${p[2]}</small></div></div></div></article>`).join("")}
function renderFilters(){filters.innerHTML=["All","Video Editor","Clipper","Designer","Social Media","Developer"].map((x,i)=>`<button class="filter ${i===0?"active":""}" onclick="filterWorkers('${x}',this)">${x}</button>`).join("")}
function renderWorkers(list=workers){workersEl=document.getElementById("workers");workersEl.innerHTML=list.map((w,i)=>`<article class="worker"><div class="worker-top"><div class="worker-avatar">${w.initials}</div><div><h3>${w.name} <span class="verified">✓</span></h3><div class="worker-role">${w.role}</div></div></div><p class="muted">${w.bio}</p><div class="tags">${w.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div><div class="worker-bottom"><span>★ ${w.rating} · ${w.rate}</span><button class="hire" onclick="viewWorker(${i})">View profile</button></div></article>`).join("")}
function filterWorkers(role,el){document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));el.classList.add("active");renderWorkers(role==="All"?workers:workers.filter(w=>w.role===role))}
function globalSearch(){let q=globalSearchEl.value.toLowerCase().trim();if(!q)return;if(document.getElementById("discover").classList.contains("active")||q.length>1){go("discover");renderWorkers(workers.filter(w=>(w.name+" "+w.role+" "+w.tags.join(" ")+" "+w.bio).toLowerCase().includes(q)))}}
function viewWorker(i){let w=workers[i];modal(`<p class="eyebrow">WORKER PROFILE</p><div class="worker-top"><div class="worker-avatar">${w.initials}</div><div><h2>${w.name} <span class="verified">✓</span></h2><div class="worker-role">${w.role} · ★ ${w.rating}</div></div></div><p>${w.bio}</p><div class="tags">${w.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div><p><b>${w.rate}</b></p><button class="primary" onclick="startChat('${w.name}')">Message & hire</button>`)}
function startChat(name){closeModal();conversations.unshift({name,text:"New conversation started",initials:name.split(" ").map(x=>x[0]).join("")});renderMessages();go("messages");toast("Message thread created")}
function renderMessages(){messagesList.innerHTML=conversations.length?conversations.map(c=>`<div class="message"><div class="worker-avatar">${c.initials}</div><div><h3>${c.name}</h3><span class="muted">${c.text}</span></div></div>`).join(""):`<div class="empty-card"><h3>No messages yet</h3><p class="muted">Open a worker profile and start a conversation.</p></div>`}
function renderJobs(){jobList.innerHTML=jobs.map((j,i)=>`<div class="job"><div><h3>${j[0]}</h3><div class="job-meta">${j[1]} · ${j[2]} · ${j[3]}</div></div><button class="apply" onclick="applyJob('${j[0]}')">View job</button></div>`).join("")}
function applyJob(title){modal(`<p class="eyebrow">PROJECT</p><h2>${title}</h2><p class="muted">Send a short introduction to the buyer.</p><div class="form"><textarea placeholder="Tell the buyer about your experience..."></textarea><button class="primary" onclick="closeModal();toast('Application sent')">Send application</button></div>`)}
function openJob(){modal(`<p class="eyebrow">NEW PROJECT</p><h2>Post a job</h2><div class="form"><input id="jobTitle" placeholder="What do you need help with?"><select id="jobRole"><option>Video Editor</option><option>Clipper</option><option>Designer</option><option>Social Media</option><option>Developer</option></select><input placeholder="Budget"><textarea placeholder="Describe the project"></textarea><button class="primary" onclick="addJob()">Publish job</button></div>`)}
function addJob(){let title=document.getElementById("jobTitle").value||"New project";jobs.unshift([title,"Your business","Budget TBD",document.getElementById("jobRole").value]);closeModal();renderJobs();toast("Job published")}
function openSignup(role){modal(`<p class="eyebrow">JOIN COLLABLY</p><h2>Create your account</h2><div class="role-choice"><button class="${role==="buyer"?"selected":""}" onclick="openSignup('buyer')">◈ Buyer</button><button class="${role==="worker"?"selected":""}" onclick="openSignup('worker')">✦ Worker</button></div><div class="form"><input id="signupName" placeholder="Full name"><input type="email" placeholder="Email"><input type="password" placeholder="Password"><button class="primary" onclick="createAccount('${role}')">Create account</button></div>`)}
function createAccount(role){let n=document.getElementById("signupName").value||"New user";profileName.textContent=n;profileRole.textContent=(role==="buyer"?"Buyer":"Worker")+" · Collably member";closeModal();go("profile");toast("Account created — prototype mode")}
function editProfile(){modal(`<p class="eyebrow">EDIT PROFILE</p><h2>Your profile</h2><div class="form"><input value="${profileName.textContent}" id="editName"><input placeholder="Role / headline"><textarea placeholder="Tell people about yourself"></textarea><button class="primary" onclick="saveProfile()">Save changes</button></div>`)}
function saveProfile(){profileName.textContent=document.getElementById("editName").value||profileName.textContent;closeModal();toast("Profile updated")}
function modal(html){modalContent.innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function renderPortfolio(){myPortfolio.innerHTML=["Featured stream edit","Short-form clip pack","Creator thumbnail set"].map(x=>`<div class="portfolio-card">${x}</div>`).join("")}
const globalSearchEl=document.getElementById("globalSearch");
renderFeed();renderFilters();renderWorkers();renderJobs();renderMessages();renderPortfolio();
