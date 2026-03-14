import { useState, useMemo, useEffect, useCallback } from "react";

// ── auth config ───────────────────────────────────────────────────────────────
const ADMIN_USER    = "alterra";
const ADMIN_PASS    = "apms2025";
const DISCORD_INVITE = "https://discord.gg/hJVbpZ9quK";
const API = "/.netlify/functions/members";

// ── constants ─────────────────────────────────────────────────────────────────
const CELLS     = ["Alterra"];
const CELL_IDS  = ["A"];
const FIRETEAMS = ["Training","Alpha", "Bravo", "Charlie", "Archeons"];
const FT_IDS    = ["TR","AL", "BO", "CH", "AR"];
const RANKS     = ["Recruit","Operative", "Deputy Commander", "General Operations Commander"];
const STATUSES  = ["Active","Inactive","Suspended","Removed"];

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(method, body) {
  const res = await fetch(API, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Normalise DB row → component shape
function normalise(row) {
  return {
    id:         row.id,
    memberNum:  row.member_num,
    name:       row.name,
    email:      row.email      ?? "",
    phone:      row.phone      ?? "",
    age:        row.age        ?? "",
    cell:       row.cell,
    fireteam:   row.fireteam,
    rank:       row.rank,
    status:     row.status,
    joinDate:   row.join_date  ?? "",
    penalties:  row.penalties  ?? [],
  };
}

// ── tiny modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"1rem"}}>
      <div style={{background:"#0f1117",border:"1px solid #2a2d3a",borderRadius:12,padding:"2rem",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <span style={{fontFamily:"'Courier New',monospace",color:"#e8c96d",fontSize:"1rem",fontWeight:700,letterSpacing:2}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:"1.4rem",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── field / input styles ──────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{marginBottom:"1rem"}}>
      <label style={{display:"block",color:"#888",fontSize:".72rem",letterSpacing:2,textTransform:"uppercase",marginBottom:4,fontFamily:"'Courier New',monospace"}}>{label}</label>
      {children}
    </div>
  );
}
const inp = {width:"100%",boxSizing:"border-box",background:"#1a1d28",border:"1px solid #2a2d3a",borderRadius:6,padding:"8px 12px",color:"#e2e8f0",fontSize:".9rem",fontFamily:"inherit",outline:"none"};
const btn = {background:"#e8c96d",color:"#0a0c10",border:"none",borderRadius:6,padding:"8px 18px",fontWeight:700,fontSize:".82rem",letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Courier New',monospace"};

// ── badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {Active:"#22c55e",Inactive:"#94a3b8",Suspended:"#f59e0b",Removed:"#ef4444"};
  return <span style={{background:colors[status]+"22",color:colors[status],border:`1px solid ${colors[status]}44`,borderRadius:20,padding:"2px 10px",fontSize:".72rem",fontWeight:700,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>{status}</span>;
}
function RankBadge({ rank }) {
  const idx = RANKS.indexOf(rank), hue = 200 + idx * 20;
  return <span style={{background:`hsl(${hue},60%,20%)`,color:`hsl(${hue},80%,75%)`,border:`1px solid hsl(${hue},60%,35%)`,borderRadius:4,padding:"2px 8px",fontSize:".72rem",letterSpacing:.5}}>{rank}</span>;
}

// ── member form ───────────────────────────────────────────────────────────────
function MemberForm({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ?? {name:"",email:"",phone:"",age:"",cell:0,fireteam:0,rank:RANKS[0],status:"Active",joinDate:new Date().toISOString().slice(0,10)});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = () => { if (!form.name.trim()) return alert("Name required"); onSave(form); };
  return (
    <Modal title={isEdit?"EDIT MEMBER":"ADD MEMBER"} onClose={onClose}>
      <Field label="Full Name"><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Jane Smith"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
        <Field label="Email"><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)}/></Field>
        <Field label="Phone"><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)}/></Field>
        <Field label="Age"><input style={inp} type="number" value={form.age} onChange={e=>set("age",e.target.value)}/></Field>
        <Field label="Join Date"><input style={{...inp,colorScheme:"dark"}} type="date" value={form.joinDate} onChange={e=>set("joinDate",e.target.value)}/></Field>
        <Field label="Cell">
          <select style={inp} value={form.cell} onChange={e=>set("cell",Number(e.target.value))}>
            {CELLS.map((c,i)=><option key={i} value={i}>{c}</option>)}
          </select>
        </Field>
        <Field label="Fireteam">
          <select style={inp} value={form.fireteam} onChange={e=>set("fireteam",Number(e.target.value))}>
            {FIRETEAMS.map((f,i)=><option key={i} value={i}>{f}</option>)}
          </select>
        </Field>
        <Field label="Rank">
          <select style={inp} value={form.rank} onChange={e=>set("rank",e.target.value)}>
            {RANKS.map(r=><option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select style={inp} value={form.status} onChange={e=>set("status",e.target.value)}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div style={{display:"flex",gap:"1rem",marginTop:"1.5rem",justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{...btn,background:"transparent",border:"1px solid #2a2d3a",color:"#888"}}>Cancel</button>
        <button onClick={handleSave} style={btn} disabled={saving}>{saving?"Saving…":"Save Member"}</button>
      </div>
    </Modal>
  );
}

// ── penalty form ──────────────────────────────────────────────────────────────
function PenaltyForm({ member, onSave, onClose, saving }) {
  const [type, setType] = useState("Warning");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  return (
    <Modal title={`ADD PENALTY — ${member.id}`} onClose={onClose}>
      <p style={{color:"#94a3b8",fontSize:".85rem",marginBottom:"1.2rem"}}>{member.name}</p>
      <Field label="Type">
        <select style={inp} value={type} onChange={e=>setType(e.target.value)}>
          {["Warning","Suspension","Formal Reprimand","Demotion","Other"].map(t=><option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Date"><input style={{...inp,colorScheme:"dark"}} type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      <Field label="Notes"><textarea style={{...inp,minHeight:80,resize:"vertical"}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the incident…"/></Field>
      <div style={{display:"flex",gap:"1rem",marginTop:"1.5rem",justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{...btn,background:"transparent",border:"1px solid #2a2d3a",color:"#888"}}>Cancel</button>
        <button onClick={()=>{if(!note.trim())return alert("Add a note");onSave({type,date,note});}} style={{...btn,background:"#dc2626"}} disabled={saving}>{saving?"Saving…":"Record Penalty"}</button>
      </div>
    </Modal>
  );
}

// ── member detail ─────────────────────────────────────────────────────────────
function MemberDetail({ member, onClose, onEdit, onAddPenalty }) {
  return (
    <Modal title={`MEMBER — ${member.id}`} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}>
        {[["Name",member.name],["ID",member.id],["Email",member.email],["Phone",member.phone],["Age",member.age],["Join Date",member.joinDate],["Cell",CELLS[member.cell]],["Fireteam",FIRETEAMS[member.fireteam]]].map(([l,v])=>(
          <div key={l}>
            <div style={{color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:2}}>{l}</div>
            <div style={{color:"#e2e8f0",fontSize:".9rem"}}>{v}</div>
          </div>
        ))}
        <div><div style={{color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:4}}>Rank</div><RankBadge rank={member.rank}/></div>
        <div><div style={{color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:4}}>Status</div><StatusBadge status={member.status}/></div>
      </div>
      <div style={{borderTop:"1px solid #1e2130",paddingTop:"1.2rem",marginBottom:"1.2rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.8rem"}}>
          <span style={{color:"#888",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace"}}>Penalties ({member.penalties.length})</span>
          <button onClick={onAddPenalty} style={{...btn,padding:"4px 12px",fontSize:".75rem",background:"#7c2d2d"}}>+ Add</button>
        </div>
        {member.penalties.length === 0
          ? <p style={{color:"#444",fontSize:".85rem",fontStyle:"italic"}}>No penalties on record.</p>
          : member.penalties.map((p,i)=>(
            <div key={i} style={{background:"#1a0d0d",border:"1px solid #3d1515",borderRadius:6,padding:"10px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#ef4444",fontSize:".8rem",fontWeight:700}}>{p.type}</span>
                <span style={{color:"#555",fontSize:".75rem"}}>{p.date}</span>
              </div>
              <p style={{color:"#94a3b8",fontSize:".82rem",margin:0}}>{p.note}</p>
            </div>
          ))
        }
      </div>
      <div style={{display:"flex",gap:"1rem",justifyContent:"flex-end"}}>
        <button onClick={onEdit} style={btn}>Edit Member</button>
      </div>
    </Modal>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onLoginClick }) {
  return (
    <div style={{minHeight:"100vh",background:"#080a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(#1a1d2a22 1px,transparent 1px),linear-gradient(90deg,#1a1d2a22 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,background:"radial-gradient(circle,#e8c96d0a 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",textAlign:"center",maxWidth:560}}>
        <div style={{width:72,height:72,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.5rem"}}>
        <img src="/planet.png" alt="Alterra Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
        </div>   
        <div style={{fontFamily:"'Courier New',monospace",fontSize:".8rem",letterSpacing:6,color:"#e8c96d",textTransform:"uppercase",marginBottom:"0.5rem"}}>Welcome to</div>
        <h1 style={{fontSize:"clamp(2.2rem,6vw,3.5rem)",fontWeight:900,color:"#e2e8f0",margin:"0 0 0.5rem",letterSpacing:-1,lineHeight:1.1}}>ALTERRA</h1>
        <p style={{color:"#555",fontFamily:"monospace",letterSpacing:3,fontSize:".75rem",textTransform:"uppercase",marginBottom:"2rem"}}>Personnel Management System</p>
        <p style={{color:"#94a3b8",fontSize:"1rem",lineHeight:1.7,marginBottom:"2.5rem"}}>
          Alterra is a structured, cell-based organization built on accountability, coordination, and shared purpose. Join our Discord to connect with members, learn about recruitment, and find your cell.
        </p>
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:"0.75rem",background:"#5865F2",color:"#fff",borderRadius:10,padding:"14px 32px",fontWeight:700,fontSize:"1rem",textDecoration:"none",letterSpacing:.5,boxShadow:"0 4px 24px #5865F244",transition:"transform .15s,box-shadow .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px #5865F266";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 24px #5865F244";}}>
          <svg width="24" height="18" viewBox="0 0 24 18" fill="none"><path d="M20.317 1.492a19.84 19.84 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.026 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03z" fill="currentColor"/></svg>
          Join our Discord
        </a>
        <div style={{display:"flex",alignItems:"center",gap:"1rem",margin:"2.5rem 0",opacity:.3}}>
          <div style={{flex:1,height:1,background:"#2a2d3a"}}/>
          <span style={{color:"#555",fontSize:".7rem",fontFamily:"monospace",letterSpacing:2}}>STAFF ACCESS</span>
          <div style={{flex:1,height:1,background:"#2a2d3a"}}/>
        </div>
        <button onClick={onLoginClick}
          style={{background:"transparent",border:"1px solid #2a2d3a",color:"#555",borderRadius:8,padding:"10px 24px",fontFamily:"'Courier New',monospace",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",cursor:"pointer",transition:"all .2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#e8c96d55";e.currentTarget.style.color="#e8c96d";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2d3a";e.currentTarget.style.color="#555";}}>
          Staff Login
        </button>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onBack }) {
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const attempt = () => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) { onLogin(); }
    else { setError("Invalid credentials."); setShake(true); setTimeout(()=>setShake(false),500); }
  };
  return (
    <div style={{minHeight:"100vh",background:"#080a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(#1a1d2a22 1px,transparent 1px),linear-gradient(90deg,#1a1d2a22 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:380,animation:shake?"shake 0.4s ease":"none"}}>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontFamily:"monospace",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",marginBottom:"2rem",padding:0,display:"flex",alignItems:"center",gap:6}}>← Back</button>
        <div style={{background:"#0f1117",border:"1px solid #1e2130",borderRadius:14,padding:"2.5rem"}}>
          <div style={{textAlign:"center",marginBottom:"2rem"}}>
            <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#e8c96d,#b8952d)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"1.2rem",color:"#0a0c10",fontFamily:"monospace",margin:"0 auto 1rem"}}>A</div>
            <div style={{fontFamily:"'Courier New',monospace",color:"#e8c96d",letterSpacing:3,fontSize:".8rem",textTransform:"uppercase"}}>APMS Staff Access</div>
            <p style={{color:"#555",fontSize:".78rem",marginTop:6}}>Authorized personnel only</p>
          </div>
          <div style={{marginBottom:"1rem"}}>
            <label style={{display:"block",color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:6}}>Username</label>
            <input value={user} onChange={e=>{setUser(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&attempt()}
              style={{width:"100%",boxSizing:"border-box",background:"#1a1d28",border:`1px solid ${error?"#ef4444":"#2a2d3a"}`,borderRadius:7,padding:"10px 14px",color:"#e2e8f0",fontSize:".9rem",fontFamily:"inherit",outline:"none"}}
              placeholder="username" autoComplete="username"/>
          </div>
          <div style={{marginBottom:"1.5rem"}}>
            <label style={{display:"block",color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:6}}>Password</label>
            <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&attempt()}
              style={{width:"100%",boxSizing:"border-box",background:"#1a1d28",border:`1px solid ${error?"#ef4444":"#2a2d3a"}`,borderRadius:7,padding:"10px 14px",color:"#e2e8f0",fontSize:".9rem",fontFamily:"inherit",outline:"none"}}
              placeholder="••••••••" autoComplete="current-password"/>
          </div>
          {error && <p style={{color:"#ef4444",fontSize:".8rem",marginBottom:"1rem",textAlign:"center",fontFamily:"monospace"}}>{error}</p>}
          <button onClick={attempt} style={{width:"100%",background:"#e8c96d",color:"#0a0c10",border:"none",borderRadius:7,padding:"11px",fontWeight:700,fontSize:".85rem",letterSpacing:1,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Courier New',monospace"}}>Authenticate</button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function APMSDashboard({ onLogout }) {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [apiError, setApiError] = useState(null);

  const [search,       setSearch]       = useState("");
  const [filterCell,   setFilterCell]   = useState("All");
  const [filterFT,     setFilterFT]     = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sort,         setSort]         = useState({key:"memberNum",dir:1});
  const [view,         setView]         = useState("table");
  const [modal,        setModal]        = useState(null);
  const [activeTab,    setActiveTab]    = useState("members");

  // ── load members from DB ───────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const rows = await apiFetch("GET");
      setMembers(rows.map(normalise));
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // ── mutations ──────────────────────────────────────────────────────────────
  const addMember = async (form) => {
    try { setSaving(true); const row = await apiFetch("POST", form); setMembers(ms=>[...ms, normalise(row)]); setModal(null); }
    catch (e) { alert("Error: " + e.message); } finally { setSaving(false); }
  };

  const editMember = async (form) => {
    try { setSaving(true); const row = await apiFetch("PUT", {...form, id: modal.data.id}); setMembers(ms=>ms.map(m=>m.id===modal.data.id ? normalise(row) : m)); setModal(null); }
    catch (e) { alert("Error: " + e.message); } finally { setSaving(false); }
  };

  const addPenalty = async (penalty) => {
    const member = members.find(m=>m.id===modal.data.id);
    const updated = [...member.penalties, penalty];
    try { setSaving(true); const row = await apiFetch("PUT", {...member, joinDate: member.joinDate, penalties: updated, id: member.id}); setMembers(ms=>ms.map(m=>m.id===member.id ? normalise(row) : m)); setModal(null); }
    catch (e) { alert("Error: " + e.message); } finally { setSaving(false); }
  };

  const removeMember = async (id) => {
    if (!confirm("Mark this member as Removed?")) return;
    try { await apiFetch("DELETE", {id}); setMembers(ms=>ms.map(m=>m.id===id ? {...m,status:"Removed"} : m)); }
    catch (e) { alert("Error: " + e.message); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const visible = useMemo(()=>{
    let list = members.filter(m=>{
      const q = search.toLowerCase();
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      if (filterCell   !== "All" && CELLS[m.cell]       !== filterCell)   return false;
      if (filterFT     !== "All" && FIRETEAMS[m.fireteam] !== filterFT)   return false;
      if (filterStatus !== "All" && m.status             !== filterStatus) return false;
      return true;
    });
    list.sort((a,b)=>{ const av=a[sort.key],bv=b[sort.key]; return (av<bv?-1:av>bv?1:0)*sort.dir; });
    return list;
  },[members,search,filterCell,filterFT,filterStatus,sort]);

  const stats = useMemo(()=>({
    total:     members.length,
    active:    members.filter(m=>m.status==="Active").length,
    cells:     [...new Set(members.map(m=>m.cell))].length,
    penalized: members.filter(m=>m.penalties.length>0).length,
  }),[members]);

  const orgMap = useMemo(()=>{
    const map = {};
    members.forEach(m=>{
      if(!map[m.cell]) map[m.cell]={};
      if(!map[m.cell][m.fireteam]) map[m.cell][m.fireteam]=[];
      map[m.cell][m.fireteam].push(m);
    });
    return map;
  },[members]);

  function sortBy(k) { setSort(s=>({key:k,dir:s.key===k?-s.dir:1})); }

  const thStyle = (k) => ({padding:"10px 14px",textAlign:"left",color:"#555",fontSize:".7rem",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",cursor:"pointer",whiteSpace:"nowrap",background:sort.key===k?"#15182200":"transparent",borderBottom:"1px solid #1e2130",userSelect:"none"});
  const tdStyle = {padding:"11px 14px",borderBottom:"1px solid #13151f",fontSize:".85rem",color:"#c8d0e0",verticalAlign:"middle"};

  return (
    <div style={{minHeight:"100vh",background:"#080a0f",color:"#e2e8f0",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{position:"fixed",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E\")",pointerEvents:"none",zIndex:0}}/>

      {/* header */}
      <header style={{position:"sticky",top:0,zIndex:50,background:"#0a0c12ee",borderBottom:"1px solid #1a1d2a",backdropFilter:"blur(12px)",padding:"0 2rem"}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <div style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#e8c96d,#b8952d)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:".9rem",color:"#0a0c10",fontFamily:"monospace"}}>A</div>
            <div>
              <div style={{fontFamily:"'Courier New',monospace",fontSize:".95rem",fontWeight:700,letterSpacing:3,color:"#e8c96d"}}>ALTERRA</div>
              <div style={{fontSize:".65rem",color:"#555",letterSpacing:2,textTransform:"uppercase"}}>Personnel Management System</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {["members","org"].map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)}
                style={{background:activeTab===t?"#e8c96d":"transparent",color:activeTab===t?"#0a0c10":"#888",border:activeTab===t?"none":"1px solid #2a2d3a",borderRadius:6,padding:"6px 16px",fontFamily:"'Courier New',monospace",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontWeight:700}}>
                {t==="members"?"Members":"Org Chart"}
              </button>
            ))}
            <button onClick={onLogout}
              style={{background:"transparent",border:"1px solid #2a2d3a",color:"#555",borderRadius:6,padding:"6px 14px",fontFamily:"'Courier New',monospace",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",cursor:"pointer",marginLeft:8}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#ef444466";e.currentTarget.style.color="#ef4444";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2d3a";e.currentTarget.style.color="#555";}}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1400,margin:"0 auto",padding:"2rem",position:"relative",zIndex:1}}>

        {/* loading / error states */}
        {loading && <div style={{textAlign:"center",padding:"4rem",color:"#555",fontFamily:"monospace",letterSpacing:2}}>LOADING PERSONNEL DATA…</div>}
        {apiError && (
          <div style={{background:"#1a0d0d",border:"1px solid #451515",borderRadius:8,padding:"1rem 1.5rem",marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#ef4444",fontFamily:"monospace",fontSize:".85rem"}}>⚠ API Error: {apiError}</span>
            <button onClick={loadMembers} style={{...btn,background:"#dc2626",padding:"5px 14px",fontSize:".75rem"}}>Retry</button>
          </div>
        )}

        {!loading && <>
          {/* stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
            {[{label:"Total Members",value:stats.total,color:"#e8c96d"},{label:"Active",value:stats.active,color:"#22c55e"},{label:"Cells Active",value:stats.cells,color:"#60a5fa"},{label:"With Penalties",value:stats.penalized,color:"#ef4444"}].map(s=>(
              <div key={s.label} style={{background:"#0f1117",border:"1px solid #1e2130",borderRadius:10,padding:"1.2rem 1.4rem"}}>
                <div style={{color:s.color,fontSize:"1.8rem",fontWeight:900,fontFamily:"'Courier New',monospace",lineHeight:1}}>{s.value}</div>
                <div style={{color:"#555",fontSize:".72rem",letterSpacing:2,textTransform:"uppercase",marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── MEMBERS TAB ── */}
          {activeTab==="members" && <>
            <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap",alignItems:"center"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, email…" style={{...inp,width:220,flex:"0 0 auto"}}/>
              {[{label:"Cell",opts:["All",...CELLS],val:filterCell,set:setFilterCell},{label:"Fireteam",opts:["All",...FIRETEAMS],val:filterFT,set:setFilterFT},{label:"Status",opts:["All",...STATUSES],val:filterStatus,set:setFilterStatus}].map(f=>(
                <select key={f.label} value={f.val} onChange={e=>f.set(e.target.value)} style={{...inp,width:"auto",flex:"0 0 auto"}}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
              ))}
              <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                {["table","grid"].map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#1e2130":"transparent",border:"1px solid #2a2d3a",color:view===v?"#e2e8f0":"#555",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:".75rem",letterSpacing:1,textTransform:"uppercase"}}>{v}</button>
                ))}
                <button onClick={()=>setModal({type:"add"})} style={btn}>+ New Member</button>
              </div>
            </div>

            <div style={{color:"#444",fontSize:".75rem",letterSpacing:1,marginBottom:"0.8rem"}}>{visible.length} record{visible.length!==1?"s":""} found</div>

            {view==="table" && (
              <div style={{background:"#0f1117",border:"1px solid #1e2130",borderRadius:10,overflow:"hidden"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr>
                        {[["id","ID"],["name","Name"],["email","Email"],["age","Age"],["cell","Cell"],["fireteam","Fireteam"],["rank","Rank"],["status","Status"],["joinDate","Joined"]].map(([k,l])=>(
                          <th key={k} style={thStyle(k)} onClick={()=>sortBy(k)}>{l}{sort.key===k?(sort.dir===1?" ↑":" ↓"):""}</th>
                        ))}
                        <th style={{...thStyle(""),cursor:"default"}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length===0 && <tr><td colSpan={10} style={{...tdStyle,textAlign:"center",color:"#444",padding:"3rem"}}>No members match the current filters.</td></tr>}
                      {visible.map(m=>(
                        <tr key={m.id} onMouseEnter={e=>e.currentTarget.style.background="#13162099"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{...tdStyle,fontFamily:"monospace",color:"#e8c96d",fontWeight:700,letterSpacing:1}}>{m.id}</td>
                          <td style={tdStyle}>{m.name}</td>
                          <td style={{...tdStyle,color:"#94a3b8",fontSize:".8rem"}}>{m.email}</td>
                          <td style={tdStyle}>{m.age}</td>
                          <td style={{...tdStyle,color:"#94a3b8"}}>{CELLS[m.cell]}</td>
                          <td style={{...tdStyle,color:"#94a3b8"}}>{FIRETEAMS[m.fireteam]}</td>
                          <td style={tdStyle}><RankBadge rank={m.rank}/></td>
                          <td style={tdStyle}><StatusBadge status={m.status}/></td>
                          <td style={{...tdStyle,color:"#94a3b8",fontSize:".8rem"}}>{m.joinDate}</td>
                          <td style={tdStyle}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>setModal({type:"detail",data:m})} style={{background:"#1a2030",border:"1px solid #2a3545",color:"#60a5fa",borderRadius:5,padding:"4px 10px",fontSize:".72rem",cursor:"pointer",letterSpacing:.5}}>View</button>
                              <button onClick={()=>setModal({type:"edit",data:m})} style={{background:"#1a2010",border:"1px solid #2a3515",color:"#86efac",borderRadius:5,padding:"4px 10px",fontSize:".72rem",cursor:"pointer",letterSpacing:.5}}>Edit</button>
                              {m.status!=="Removed"&&<button onClick={()=>removeMember(m.id)} style={{background:"#200f0f",border:"1px solid #451515",color:"#f87171",borderRadius:5,padding:"4px 8px",fontSize:".72rem",cursor:"pointer"}}>✕</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view==="grid" && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"1rem"}}>
                {visible.length===0&&<p style={{color:"#444",gridColumn:"1/-1",textAlign:"center",padding:"3rem"}}>No members match.</p>}
                {visible.map(m=>(
                  <div key={m.id} style={{background:"#0f1117",border:"1px solid #1e2130",borderRadius:10,padding:"1.2rem",cursor:"pointer",transition:"border-color .2s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="#e8c96d44"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e2130"}
                    onClick={()=>setModal({type:"detail",data:m})}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <span style={{fontFamily:"monospace",color:"#e8c96d",fontWeight:700,letterSpacing:1,fontSize:".9rem"}}>{m.id}</span>
                      <StatusBadge status={m.status}/>
                    </div>
                    <div style={{fontWeight:600,fontSize:"1rem",marginBottom:4}}>{m.name}</div>
                    <div style={{color:"#94a3b8",fontSize:".78rem",marginBottom:8}}>{m.email}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <RankBadge rank={m.rank}/>
                      <span style={{background:"#1a1d28",color:"#64748b",borderRadius:4,padding:"2px 8px",fontSize:".72rem"}}>{CELLS[m.cell]} · {FIRETEAMS[m.fireteam]}</span>
                      {m.penalties.length>0&&<span style={{background:"#2d1010",color:"#f87171",borderRadius:4,padding:"2px 8px",fontSize:".72rem"}}>⚠ {m.penalties.length}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* ── ORG CHART TAB ── */}
          {activeTab==="org" && (
            <div>
              <h2 style={{fontFamily:"monospace",color:"#e8c96d",letterSpacing:3,fontSize:"1rem",textTransform:"uppercase",marginBottom:"1.5rem"}}>Organizational Structure</h2>
              {Object.entries(orgMap).map(([cellIdx,fireteams])=>(
                <div key={cellIdx} style={{marginBottom:"2rem",background:"#0f1117",border:"1px solid #1e2130",borderRadius:12,overflow:"hidden"}}>
                  <div style={{background:"#13162a",borderBottom:"1px solid #1e2130",padding:"1rem 1.4rem",display:"flex",alignItems:"center",gap:"1rem"}}>
                    <div style={{width:36,height:36,borderRadius:8,background:"#e8c96d22",border:"1px solid #e8c96d44",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:"#e8c96d",fontWeight:700,fontSize:"1rem"}}>{CELL_IDS[cellIdx]}</div>
                    <div>
                      <div style={{color:"#e8c96d",fontFamily:"monospace",fontWeight:700,letterSpacing:2}}>CELL {CELLS[cellIdx]?.toUpperCase()}</div>
                      <div style={{color:"#555",fontSize:".72rem",letterSpacing:1}}>{Object.values(fireteams).flat().length} members · {Object.keys(fireteams).length} fireteams</div>
                    </div>
                  </div>
                  <div style={{padding:"1rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"1rem"}}>
                    {Object.entries(fireteams).map(([ftIdx,ftMembers])=>(
                      <div key={ftIdx} style={{background:"#0a0c12",border:"1px solid #1e2130",borderRadius:8,padding:"0.8rem"}}>
                        <div style={{fontFamily:"monospace",color:"#60a5fa",fontSize:".75rem",letterSpacing:2,textTransform:"uppercase",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                          <span>{FIRETEAMS[ftIdx]}</span><span style={{color:"#555"}}>{FT_IDS[ftIdx]}</span>
                        </div>
                        {ftMembers.map(m=>(
                          <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #13151f",cursor:"pointer"}} onClick={()=>setModal({type:"detail",data:m})}>
                            <div>
                              <div style={{fontSize:".8rem",color:"#c8d0e0"}}>{m.name}</div>
                              <div style={{fontSize:".68rem",color:"#555",fontFamily:"monospace"}}>{m.id}</div>
                            </div>
                            <StatusBadge status={m.status}/>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}
      </main>

      {/* modals */}
      {modal?.type==="add"    && <MemberForm onSave={addMember} onClose={()=>setModal(null)} saving={saving}/>}
      {modal?.type==="edit"   && <MemberForm initial={modal.data} onSave={editMember} onClose={()=>setModal(null)} saving={saving}/>}
      {modal?.type==="detail" && <MemberDetail member={members.find(m=>m.id===modal.data.id)} onClose={()=>setModal(null)} onEdit={()=>setModal({type:"edit",data:members.find(m=>m.id===modal.data.id)})} onAddPenalty={()=>setModal({type:"penalty",data:modal.data})}/>}
      {modal?.type==="penalty"&& <PenaltyForm member={members.find(m=>m.id===modal.data.id)} onSave={addPenalty} onClose={()=>setModal(null)} saving={saving}/>}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function APMS() {
  const [page, setPage] = useState("landing");
  if (page==="landing") return <LandingPage onLoginClick={()=>setPage("login")}/>;
  if (page==="login")   return <LoginPage onLogin={()=>setPage("dashboard")} onBack={()=>setPage("landing")}/>;
  return <APMSDashboard onLogout={()=>setPage("landing")}/>;
}