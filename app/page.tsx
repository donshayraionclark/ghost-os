"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Users, Zap, Flame } from "lucide-react";

type Msg = {
  id: number;
  speaker: "Ghost" | "You";
  text: string;
  time: string;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  status: "Idle" | "Working";
};

type Task = {
  id: string;
  title: string;
  owner: string;
  status: "Queued" | "In Progress" | "Done";
  priority: "High" | "Medium" | "Low";
};

type Lead = {
  id: string;
  clinic: string;
  city: string;
  contact: string;
  channel: "IG" | "Email" | "Phone";
  status: "New" | "Contacted" | "Interested" | "No Reply" | "Closed";
};

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function localGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function localSet<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const quoteBank = [
  "Pressure exposes who you really are.",
  "Move quiet. Execute loud.",
  "If it’s not disciplined, it’s not real.",
  "You don’t need motivation. You need a plan.",
  "Control the tempo. Control the outcome.",
  "No excuses. Only execution.",
  "We don’t guess. We verify.",
];

const agentSeed: Agent[] = [
  { id: "leadgen", name: "Lead Gen", role: "Find & qualify Botox/MedSpa leads", status: "Idle" },
  { id: "outreach", name: "Outreach", role: "DM/SMS/Email scripts + follow-ups", status: "Idle" },
  { id: "ops", name: "Ops", role: "Task routing + checklists", status: "Idle" },
  { id: "research", name: "Research", role: "Offers, pricing, competitors", status: "Idle" },
  { id: "auto", name: "Automation", role: "Connect tools + reduce manual work", status: "Idle" },
];

const taskSeed: Task[] = [
  {
    id: "t-1",
    title: "Build lead list: 30 med spas (Austin)",
    owner: "Lead Gen",
    status: "Queued",
    priority: "High",
  },
  {
    id: "t-2",
    title: "Write outreach: DM + email + text (3 variants)",
    owner: "Outreach",
    status: "Queued",
    priority: "High",
  },
  {
    id: "t-3",
    title: "Offer: 3 booked consults as trial (no risk) – define terms",
    owner: "Ops",
    status: "Queued",
    priority: "High",
  },
];

const leadSeed: Lead[] = [
  { id: "l-1", clinic: "Pearl Med Spa", city: "Austin", contact: "@pearldaustin", channel: "IG", status: "New" },
  { id: "l-2", clinic: "The Botanica Med Spa", city: "Austin", contact: "(512) 551-6606", channel: "Phone", status: "New" },
  { id: "l-3", clinic: "Austin-Weston Center", city: "Austin", contact: "austinweston.com", channel: "Email", status: "New" },
];

function pillBg(status: string) {
  const s = status.toLowerCase();
  if (s.includes("done")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  if (s.includes("progress")) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (s.includes("working")) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (s.includes("idle")) return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  if (s.includes("new")) return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  if (s.includes("contacted")) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (s.includes("interested")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  if (s.includes("no reply")) return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
  return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
}

export default function Page() {
  const [activeNav, setActiveNav] = useState<"command" | "team" | "execution">("command");

  const [agents, setAgents] = useState<Agent[]>(agentSeed);
  const [tasks, setTasks] = useState<Task[]>(taskSeed);
  const [leads, setLeads] = useState<Lead[]>(leadSeed);

  const [heat, setHeat] = useState<number>(() => localGet("ghost.heat", 22));

  const [broadcast, setBroadcast] = useState<string>(() => localGet("ghost.broadcast", quoteBank[0]));
  const [messages, setMessages] = useState<Msg[]>(() =>
    localGet("ghost.messages", [
      {
        id: 1,
        speaker: "Ghost",
        text: "I’m online. Give me the objective. I’ll run the team.",
        time: nowTime(),
      },
    ])
  );

  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  // used to "pulse" the avatar when Ghost speaks
  const [ghostPulse, setGhostPulse] = useState(0);

  useEffect(() => localSet("ghost.messages", messages), [messages]);
  useEffect(() => localSet("ghost.heat", heat), [heat]);
  useEffect(() => localSet("ghost.broadcast", broadcast), [broadcast]);

  // autoscroll
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  // live broadcast
  useEffect(() => {
    const id = setInterval(() => {
      const next = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      setBroadcast(next);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const addMsg = (speaker: "Ghost" | "You", text: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), speaker, text, time: nowTime() }]);
    if (speaker === "Ghost") setGhostPulse((p) => p + 1);
  };

  const setAgentStatus = (id: string, status: Agent["status"]) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const routeSim = (userText: string) => {
    const t = userText.toLowerCase();

    // Heat logic (gamey)
    if (t.includes("urgent") || t.includes("today") || t.includes("48")) setHeat((h) => clamp(h + 8, 0, 100));
    if (t.includes("calm") || t.includes("slow")) setHeat((h) => clamp(h - 5, 0, 100));

    // Simple task routing for Botox lead gen
    if (t.includes("botox") || t.includes("med spa") || t.includes("leads")) {
      setAgentStatus("leadgen", "Working");
      setAgentStatus("outreach", "Working");
      setTasks((prev) => [
        {
          id: `t-${Date.now()}`,
          title: "Pull 25 more med spas (Houston) + contact channels",
          owner: "Lead Gen",
          status: "In Progress",
          priority: "High",
        },
        {
          id: `t-${Date.now() + 1}`,
          title: "Create 3-step follow-up schedule (DM → SMS → Email)",
          owner: "Outreach",
          status: "In Progress",
          priority: "High",
        },
        ...prev,
      ]);

      return "Objective locked. Lead Gen is pulling targets. Outreach is writing sequences. Give me the city (Austin/Houston/Dallas/San Antonio) and your offer (trial bookings or pay-per-lead).";
    }

    if (t.includes("pricing") || t.includes("offer")) {
      setAgentStatus("research", "Working");
      setTasks((prev) => [
        {
          id: `t-${Date.now()}`,
          title: "Draft pricing: pay-per-lead + pay-per-booked + retainer options",
          owner: "Research",
          status: "In Progress",
          priority: "High",
        },
        ...prev,
      ]);
      return "Research is pricing the offer now. Tell me: do you want to sell *leads* or *booked consults*?";
    }

    if (t.includes("automation") || t.includes("zapier") || t.includes("sheet")) {
      setAgentStatus("auto", "Working");
      setTasks((prev) => [
        {
          id: `t-${Date.now()}`,
          title: "Set up lead tracker schema (CSV/Sheet) + follow-up reminders",
          owner: "Automation",
          status: "In Progress",
          priority: "Medium",
        },
        ...prev,
      ]);
      return "Automation is on it. We’ll track leads → outreach → replies → booked. Confirm your tracker: Google Sheets or Airtable?";
    }

    return "Say the objective in one line. Example: “Get 10 med spas to reply YES in Austin this week.”";
  };

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addMsg("You", text);

    // Simulated response (you can wire an API later)
    const reply = routeSim(text);
    setTimeout(() => addMsg("Ghost", reply), 450);
  };

  const summary = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "Done").length;
    const newLeads = leads.filter((l) => l.status === "New").length;
    const interested = leads.filter((l) => l.status === "Interested").length;
    return { open, newLeads, interested };
  }, [tasks, leads]);

  return (
    <div className="ghostShell">
      {/* Left nav */}
      <aside className="sideNav">
        <div className="brand">
          <div className="brandIcon">G</div>
          <div>
            <div className="brandTitle">Ghost OS</div>
            <div className="brandSub">COO Agent Interface</div>
          </div>
        </div>

        <button className={`navBtn ${activeNav === "command" ? "active" : ""}`} onClick={() => setActiveNav("command")}>
          <MessageSquare size={18} /> <span>Command Chat</span>
        </button>
        <button className={`navBtn ${activeNav === "team" ? "active" : ""}`} onClick={() => setActiveNav("team")}>
          <Users size={18} /> <span>Agent Team</span>
        </button>
        <button
          className={`navBtn ${activeNav === "execution" ? "active" : ""}`}
          onClick={() => setActiveNav("execution")}
        >
          <Zap size={18} /> <span>Execution</span>
        </button>

        <div className="divider" />

        <div className="heatWrap">
          <div className="heatRow">
            <div className="heatLabel">
              <Flame size={16} /> Heat
            </div>
            <div className="heatVal">{heat}</div>
          </div>
          <div className="heatBar">
            <div className="heatFill" style={{ width: `${heat}%` }} />
          </div>
        </div>
      </aside>

      {/* Center */}
      <main className="center">
        {/* Header / Character */}
        <motion.div
          className="heroCard"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="heroLeft">
            <motion.div
              key={ghostPulse}
              className="avatarFrame"
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: [1, 1.03, 1], rotate: [0, -0.5, 0.5, 0] }}
              transition={{ duration: 0.35 }}
            >
              {/* Uses /public/Ghost2.png */}
              <img className="avatarImg" src="/Ghost2.png" alt="Ghost" />
              <span className="blinkDot" />
            </motion.div>

            <div className="heroText">
              <div className="heroName">Ghost (COO)</div>
              <div className="heroBroadcast">
                Live Broadcast: <span className="broadcastText">{broadcast}</span>
              </div>
            </div>
          </div>

          <button
            className="btn"
            onClick={() => {
              const q = quoteBank[Math.floor(Math.random() * quoteBank.length)];
              addMsg("Ghost", q);
              setBroadcast(q);
            }}
          >
            Random Quote
          </button>
        </motion.div>

        {/* Content */}
        {activeNav === "command" && (
          <div className="panel">
            <div className="chat" ref={chatRef}>
              {messages.map((m) => (
                <div key={m.id} className={`bubbleRow ${m.speaker === "You" ? "right" : "left"}`}>
                  <div className="bubbleMeta">
                    <span className="bubbleName">{m.speaker}</span>
                    <span className="bubbleTime">{m.time}</span>
                  </div>
                  <div className={`bubble ${m.speaker === "You" ? "you" : "ghost"}`}>{m.text}</div>
                </div>
              ))}
            </div>

            <div className="composer">
              <input
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Tell Ghost what you're working on… (ex: "Botox leads Austin")`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
              />
              <button className="btnPrimary" onClick={onSend}>
                Send
              </button>
            </div>
          </div>
        )}

        {activeNav === "team" && (
          <div className="panel">
            <div className="panelTitle">Agent Team</div>
            <div className="grid2">
              {agents.map((a) => (
                <div key={a.id} className="card">
                  <div className="cardTop">
                    <div className="cardName">{a.name}</div>
                    <span className={`pill ${pillBg(a.status)}`}>{a.status}</span>
                  </div>
                  <div className="cardSub">{a.role}</div>
                  <div className="cardActions">
                    <button className="btnSmall" onClick={() => setAgentStatus(a.id, "Working")}>
                      Set Working
                    </button>
                    <button className="btnSmall" onClick={() => setAgentStatus(a.id, "Idle")}>
                      Set Idle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeNav === "execution" && (
          <div className="panel">
            <div className="panelTitle">Execution Board</div>

            <div className="kpis">
              <div className="kpi">
                <div className="kpiLabel">Open Tasks</div>
                <div className="kpiVal">{summary.open}</div>
              </div>
              <div className="kpi">
                <div className="kpiLabel">New Leads</div>
                <div className="kpiVal">{summary.newLeads}</div>
              </div>
              <div className="kpi">
                <div className="kpiLabel">Interested</div>
                <div className="kpiVal">{summary.interested}</div>
              </div>
            </div>

            <div className="split">
              <div>
                <div className="subTitle">Tasks</div>
                <div className="list">
                  {tasks.map((t) => (
                    <div key={t.id} className="listRow">
                      <div className="listMain">
                        <div className="listTitle">{t.title}</div>
                        <div className="listMeta">
                          <span className="muted">{t.owner}</span> •{" "}
                          <span className={`pill ${pillBg(t.status)}`}>{t.status}</span> •{" "}
                          <span className={`pill ${pillBg(t.priority)}`}>{t.priority}</span>
                        </div>
                      </div>
                      <div className="listBtns">
                        <button
                          className="btnSmall"
                          onClick={() =>
                            setTasks((prev) =>
                              prev.map((x) => (x.id === t.id ? { ...x, status: "In Progress" } : x))
                            )
                          }
                        >
                          Start
                        </button>
                        <button
                          className="btnSmall"
                          onClick={() => setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: "Done" } : x)))}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="quickAdd">
                  <button
                    className="btn"
                    onClick={() => {
                      setTasks((prev) => [
                        {
                          id: `t-${Date.now()}`,
                          title: "Find 15 med spas (Dallas) + IG handles",
                          owner: "Lead Gen",
                          status: "Queued",
                          priority: "High",
                        },
                        ...prev,
                      ]);
                      addMsg("Ghost", "Added: Dallas targets. Keep momentum.");
                    }}
                  >
                    Add Dallas Targets
                  </button>
                </div>
              </div>

              <div>
                <div className="subTitle">Leads</div>
                <div className="list">
                  {leads.map((l) => (
                    <div key={l.id} className="listRow">
                      <div className="listMain">
                        <div className="listTitle">{l.clinic}</div>
                        <div className="listMeta">
                          <span className="muted">{l.city}</span> • <span className="muted">{l.channel}</span> •{" "}
                          <span className={`pill ${pillBg(l.status)}`}>{l.status}</span>
                        </div>
                        <div className="mutedSmall">{l.contact}</div>
                      </div>
                      <div className="listBtns">
                        <button
                          className="btnSmall"
                          onClick={() =>
                            setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "Contacted" } : x)))
                          }
                        >
                          Mark Contacted
                        </button>
                        <button
                          className="btnSmall"
                          onClick={() =>
                            setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "Interested" } : x)))
                          }
                        >
                          Interested
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="quickAdd">
                  <button
                    className="btn"
                    onClick={() => {
                      setLeads((prev) => [
                        {
                          id: `l-${Date.now()}`,
                          clinic: "New Med Spa Target",
                          city: "Houston",
                          contact: "add contact…",
                          channel: "IG",
                          status: "New",
                        },
                        ...prev,
                      ]);
                      addMsg("Ghost", "New lead slot created. Fill it fast.");
                    }}
                  >
                    Add Lead Slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right rail */}
      <aside className="rightRail">
        <div className="railTitle">Team</div>
        <div className="railCards">
          {agents.map((a) => (
            <div key={a.id} className="railCard">
              <div className="railTop">
                <div className="railName">{a.name}</div>
                <span className={`pill ${pillBg(a.status)}`}>{a.status}</span>
              </div>
              <div className="railSub">{a.role}</div>
            </div>
          ))}
        </div>

        <div className="railHint">
          Tip: Your Ghost image is loading from <code>/public/Ghost2.png</code>. If you upload a new one later, just keep the
          same filename to swap instantly.
        </div>
      </aside>

      <style>{`
        :root{
          --bg:#05060a;
          --panel: rgba(255,255,255,0.03);
          --border: rgba(255,255,255,0.08);
          --text: rgba(255,255,255,0.92);
          --muted: rgba(255,255,255,0.62);
        }
        *{ box-sizing:border-box; }
        body{ margin:0; background:var(--bg); color:var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
        .ghostShell{
          min-height:100vh;
          display:grid;
          grid-template-columns: 280px 1fr 320px;
          gap:18px;
          padding:18px;
          background:
            radial-gradient(900px 500px at 25% 10%, rgba(255,255,255,0.06), transparent 60%),
            radial-gradient(800px 600px at 70% 35%, rgba(120,80,255,0.08), transparent 60%),
            radial-gradient(700px 500px at 40% 85%, rgba(0,200,255,0.06), transparent 55%),
            var(--bg);
        }
        .sideNav, .rightRail{
          border:1px solid var(--border);
          background:var(--panel);
          border-radius:18px;
          padding:16px;
          backdrop-filter: blur(10px);
        }
        .center{
          border-radius:18px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }
        .brand{
          display:flex; gap:10px; align-items:center; margin-bottom:14px;
        }
        .brandIcon{
          width:40px; height:40px; border-radius:12px;
          display:grid; place-items:center;
          background:rgba(255,255,255,0.06);
          border:1px solid var(--border);
          font-weight:800;
        }
        .brandTitle{ font-weight:800; letter-spacing:0.3px; }
        .brandSub{ font-size:12px; color:var(--muted); margin-top:2px; }

        .navBtn{
          width:100%;
          display:flex; align-items:center; gap:10px;
          padding:10px 10px;
          border-radius:12px;
          border:1px solid transparent;
          background:transparent;
          color:var(--text);
          cursor:pointer;
          text-align:left;
          margin-bottom:8px;
        }
        .navBtn:hover{
          background:rgba(255,255,255,0.05);
          border-color:rgba(255,255,255,0.08);
        }
        .navBtn.active{
          background:rgba(255,255,255,0.07);
          border-color:rgba(255,255,255,0.12);
        }
        .divider{
          height:1px; background:rgba(255,255,255,0.08);
          margin:14px 0;
        }
        .heatWrap{ margin-top:4px; }
        .heatRow{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .heatLabel{ display:flex; gap:8px; align-items:center; color:var(--muted); font-weight:700; }
        .heatVal{ font-weight:800; }
        .heatBar{ height:10px; border-radius:999px; overflow:hidden; background:rgba(255,255,255,0.08); }
        .heatFill{ height:100%; background:linear-gradient(90deg, rgba(255,120,0,0.55), rgba(255,0,90,0.55)); }

        .heroCard{
          border:1px solid var(--border);
          background:rgba(255,255,255,0.03);
          border-radius:18px;
          padding:14px;
          display:flex; align-items:center; justify-content:space-between;
          backdrop-filter: blur(10px);
        }
        .heroLeft{ display:flex; gap:12px; align-items:center; }
        .avatarFrame{
          width:56px; height:56px; border-radius:18px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.06);
          overflow:hidden;
          position:relative;
        }
        .avatarImg{
          width:100%; height:100%; object-fit:cover; display:block;
          filter: contrast(1.05) saturate(1.02);
        }
        .blinkDot{
          position:absolute;
          width:10px; height:10px; border-radius:999px;
          right:8px; bottom:8px;
          background:rgba(0,255,170,0.9);
          box-shadow: 0 0 18px rgba(0,255,170,0.55);
          animation: blink 2.6s infinite;
        }
        @keyframes blink{
          0%, 84% { transform: scale(1); opacity: 1; }
          86% { transform: scale(0.2); opacity: 0.3; }
          88% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .heroName{ font-weight:900; letter-spacing:0.2px; }
        .heroBroadcast{ font-size:12px; color:var(--muted); margin-top:2px; }
        .broadcastText{ color:rgba(255,255,255,0.92); }

        .panel{
          border:1px solid var(--border);
          background:rgba(255,255,255,0.03);
          border-radius:18px;
          padding:14px;
          backdrop-filter: blur(10px);
          min-height: calc(100vh - 18px*2 - 14px - 90px);
          display:flex;
          flex-direction:column;
        }
        .panelTitle{ font-weight:900; margin-bottom:12px; }
        .chat{
          flex:1;
          overflow:auto;
          padding:6px 4px 10px 4px;
        }
        .bubbleRow{ margin-bottom:14px; }
        .bubbleRow.right{ display:flex; flex-direction:column; align-items:flex-end; }
        .bubbleRow.left{ display:flex; flex-direction:column; align-items:flex-start; }
        .bubbleMeta{
          display:flex; gap:10px; align-items:center;
          font-size:12px; color:var(--muted); margin-bottom:6px;
        }
        .bubbleName{ font-weight:800; color:rgba(255,255,255,0.78); }
        .bubbleTime{ color:rgba(255,255,255,0.45); }
        .bubble{
          max-width: 720px;
          padding:12px 12px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.35);
          line-height:1.35;
        }
        .bubble.you{
          background:rgba(120,80,255,0.10);
          border-color:rgba(120,80,255,0.25);
        }
        .bubble.ghost{
          background:rgba(255,255,255,0.04);
          border-color:rgba(255,255,255,0.12);
        }

        .composer{
          display:flex; gap:10px;
          border-top:1px solid rgba(255,255,255,0.08);
          padding-top:12px;
        }
        .input{
          flex:1;
          padding:12px 12px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.35);
          color:var(--text);
          outline:none;
        }
        .input:focus{ border-color:rgba(255,255,255,0.22); }
        .btn, .btnPrimary{
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.06);
          color:var(--text);
          padding:10px 12px;
          cursor:pointer;
          font-weight:800;
        }
        .btn:hover{ background:rgba(255,255,255,0.09); }
        .btnPrimary{
          background:linear-gradient(180deg, rgba(120,80,255,0.35), rgba(120,80,255,0.18));
          border-color:rgba(120,80,255,0.35);
        }
        .btnPrimary:hover{ filter:brightness(1.05); }

        .grid2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:12px;
        }
        .card{
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          border-radius:14px;
          padding:12px;
        }
        .cardTop{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .cardName{ font-weight:900; }
        .cardSub{ color:var(--muted); font-size:12px; }
        .cardActions{ display:flex; gap:8px; margin-top:10px; }
        .btnSmall{
          padding:8px 10px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.06);
          color:var(--text);
          cursor:pointer;
          font-weight:800;
          font-size:12px;
        }
        .btnSmall:hover{ background:rgba(255,255,255,0.09); }

        .pill{
          padding:4px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,0.16);
          font-size:12px;
          font-weight:900;
          letter-spacing:0.2px;
        }

        .kpis{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap:12px;
          margin-bottom:14px;
        }
        .kpi{
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          border-radius:14px;
          padding:12px;
        }
        .kpiLabel{ color:var(--muted); font-size:12px; font-weight:800; }
        .kpiVal{ font-size:28px; font-weight:1000; margin-top:4px; }

        .split{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }
        .subTitle{ font-weight:900; margin:6px 0 10px; }
        .list{ display:flex; flex-direction:column; gap:10px; }
        .listRow{
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          border-radius:14px;
          padding:12px;
          display:flex;
          justify-content:space-between;
          gap:12px;
        }
        .listTitle{ font-weight:900; }
        .listMeta{ color:var(--muted); font-size:12px; margin-top:4px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .muted{ color:var(--muted); font-weight:800; }
        .mutedSmall{ color:rgba(255,255,255,0.48); font-size:12px; margin-top:6px; }
        .listBtns{ display:flex; flex-direction:column; gap:8px; }
        .quickAdd{ margin-top:12px; }

        .rightRail .railTitle{ font-weight:1000; margin-bottom:12px; }
        .railCards{ display:flex; flex-direction:column; gap:10px; }
        .railCard{
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          border-radius:14px;
          padding:12px;
        }
        .railTop{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .railName{ font-weight:1000; }
        .railSub{ color:var(--muted); font-size:12px; }

        .railHint{
          margin-top:14px;
          color:rgba(255,255,255,0.55);
          font-size:12px;
          line-height:1.4;
          border-top:1px solid rgba(255,255,255,0.08);
          padding-top:12px;
        }
        .railHint code{
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.12);
          padding:2px 6px;
          border-radius:8px;
          color:rgba(255,255,255,0.85);
        }

        @media (max-width: 1100px){
          .ghostShell{ grid-template-columns: 260px 1fr; }
          .rightRail{ display:none; }
          .split{ grid-template-columns: 1fr; }
          .grid2{ grid-template-columns: 1fr; }
        }
        @media (max-width: 760px){
          .ghostShell{ grid-template-columns: 1fr; }
          .sideNav{ display:none; }
        }
      `}</style>
    </div>
  );
}
