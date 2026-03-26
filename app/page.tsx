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

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function localGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function localSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const quoteBank = [
  "Move quiet. Execute loud.",
  "Pressure exposes who you really are.",
  "If it’s not aligned, it’s a distraction.",
  "You don’t need motivation. You need structure.",
  "We don’t chase. We position.",
  "No feelings. Just finished tasks.",
  "Every day: money, motion, momentum.",
];

const agentSeed: Agent[] = [
  { id: "leadgen", name: "Lead Gen", role: "Find & qualify Botox/MedSpa leads", status: "Idle" },
  { id: "outreach", name: "Outreach", role: "DM/SMS/Email scripts + follow-ups", status: "Idle" },
  { id: "ops", name: "Ops", role: "Task routing + checklists", status: "Idle" },
  { id: "research", name: "Research", role: "Offers, pricing, competitors", status: "Idle" },
  { id: "automation", name: "Automation", role: "Connect tools + reduce manual work", status: "Idle" },
];

export default function Page() {
  const [heat, setHeat] = useState<number>(() => localGet("ghost.heat", 22));

  const [agents, setAgents] = useState<Agent[]>(() => localGet("ghost.agents", agentSeed));

  const [messages, setMessages] = useState<Msg[]>(
    () =>
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

  const liveQuote = useMemo(() => quoteBank[Math.floor(Math.random() * quoteBank.length)], []);
  const [broadcast, setBroadcast] = useState(liveQuote);

  useEffect(() => localSet("ghost.messages", messages), [messages]);
  useEffect(() => localSet("ghost.heat", heat), [heat]);
  useEffect(() => localSet("ghost.agents", agents), [agents]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  // Random “Ghost broadcast”
  useEffect(() => {
    const id = setInterval(() => {
      const next = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      setBroadcast(next);
      setHeat((h) => Math.max(0, Math.min(100, h + (Math.random() > 0.5 ? 2 : -1))));
    }, 12000);
    return () => clearInterval(id);
  }, []);

  function addMsg(speaker: Msg["speaker"], text: string) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker, text, time: nowTime() },
    ]);
  }

  function setAgentWorking(agentId: string, working: boolean) {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, status: working ? "Working" : "Idle" } : a
      )
    );
  }

  function ghostReply(userText: string) {
    const t = userText.toLowerCase();

    // simple routing for Botox lead gen
    if (t.includes("botox") || t.includes("med spa") || t.includes("medspa")) {
      setAgentWorking("research", true);
      setAgentWorking("leadgen", true);
      setAgentWorking("outreach", true);

      setTimeout(() => setAgentWorking("research", false), 1200);
      setTimeout(() => setAgentWorking("leadgen", false), 1600);
      setTimeout(() => setAgentWorking("outreach", false), 2000);

      setHeat((h) => Math.min(100, h + 8));

      return (
        "Locked. Objective: Botox consult bookings.\n\n" +
        "Next moves (fast money):\n" +
        "1) Pick 1 city (Austin or Houston) + 1 offer (3 FREE booked consults).\n" +
        "2) I’ll generate 20 target clinics + outreach scripts (DM/SMS/email).\n" +
        "3) You send 20 messages today, follow up in 6 hours.\n\n" +
        "Tell me: CITY + your phone/email to put in the scripts."
      );
    }

    if (t.includes("quote")) {
      setHeat((h) => Math.min(100, h + 3));
      return quoteBank[Math.floor(Math.random() * quoteBank.length)];
    }

    if (t.includes("next move") || t.includes("what now") || t.includes("plan")) {
      return (
        "Say the objective in one line.\n" +
        "Example: 'Get 3 med spa clients in Austin for Botox leads.'\n" +
        "I’ll convert it into tasks, scripts, and a 48-hour execution plan."
      );
    }

    return "Objective received. Give me the target (city + offer) and I’ll route the team.";
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;

    addMsg("You", text);
    setInput("");

    // simulated “real-time” Ghost response
    setTimeout(() => {
      const reply = ghostReply(text);
      addMsg("Ghost", reply);
    }, 350);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "260px 1fr 360px" }}>
      {/* Left Nav */}
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: 18,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Ghost OS</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>COO Agent Interface</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.9 }}>
            <MessageSquare size={18} /> Command Chat
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.7 }}>
            <Users size={18} /> Agent Team
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.7 }}>
            <Zap size={18} /> Execution
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Flame size={18} />
              <span style={{ fontWeight: 700 }}>Heat</span>
            </div>
            <span style={{ opacity: 0.8 }}>{heat}</span>
          </div>

          <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, marginTop: 10 }}>
            <div
              style={{
                width: `${heat}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.85))",
              }}
            />
          </div>
        </div>
      </aside>

      {/* Center: Chat */}
      <main style={{ padding: 18 }}>
        {/* “Character” / Avatar placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            marginBottom: 14,
          }}
        >
          <img
  src="/Ghost2.png"
  alt="Ghost"
  title="Ghost (COO)"
  style={{
    width: 56,
    height: 56,
    borderRadius: 18,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  }}
/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 0.2 }}>Ghost (COO)</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              Live Broadcast: <span style={{ opacity: 1 }}>{broadcast}</span>
            </div>
          </div>
          <button
            onClick={() => addMsg("Ghost", quoteBank[Math.floor(Math.random() * quoteBank.length)])}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Random Quote
          </button>
        </motion.div>

        <div
          ref={chatRef}
          style={{
            height: "calc(100vh - 210px)",
            overflow: "auto",
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.75, fontSize: 12 }}>
                <span style={{ fontWeight: 800 }}>{m.speaker}</span>
                <span>{m.time}</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: m.speaker === "Ghost" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.35,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? onSend() : null)}
            placeholder="Tell Ghost what you’re working on… (ex: 'Botox leads Austin')"
            style={{
              flex: 1,
              padding: "12px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              outline: "none",
            }}
          />
          <button
            onClick={onSend}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.12)",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Send
          </button>
        </div>
      </main>

      {/* Right: Agent Team */}
      <aside
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          padding: 18,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Team</div>
        <div style={{ display: "grid", gap: 10 }}>
          {agents.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800 }}>{a.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    opacity: 0.9,
                  }}
                >
                  {a.status}
                </div>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>{a.role}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
          Tip: Replace the 👤 box with your **original character image** later (SVG/PNG) and we’ll animate it (blink, talk, react).
        </div>
      </aside>
    </div>
  );
}
