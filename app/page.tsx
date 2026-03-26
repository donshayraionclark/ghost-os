"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Users,
  Zap,
  Flame,
  SendHorizonal,
} from "lucide-react";

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

const quoteBank = [
  "Pressure exposes who you really are.",
  "If it’s not disciplined, it’s not real.",
  "Move quiet. Execute loud.",
  "No emotions. Just decisions.",
  "If you want momentum, win the next hour.",
  "Don’t negotiate with your goals.",
  "Build systems. Stop begging for motivation.",
  "If it’s important, it gets scheduled.",
  "You don’t need more time. You need more precision.",
];

const initialAgents: Agent[] = [
  { id: "lead", name: "Lead Gen", role: "Find & qualify Botox/MedSpa leads", status: "Idle" },
  { id: "outreach", name: "Outreach", role: "DM/SMS/Email scripts + follow-ups", status: "Idle" },
  { id: "ops", name: "Ops", role: "Task routing + checklists", status: "Idle" },
  { id: "research", name: "Research", role: "Offers, pricing, competitors", status: "Idle" },
  { id: "automation", name: "Automation", role: "Connect tools + reduce manual work", status: "Idle" },
];

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

function localSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Big “3D-ish” Ghost avatar: tilt, glow, breathe, blink, speaking pulse */
function GhostAvatar({
  src = "/Ghost2.png",
  size = 160,
  speaking = false,
  onClick,
}: {
  src?: string;
  size?: number;
  speaking?: boolean;
  onClick?: () => void;
}) {
  const [blink, setBlink] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });

  // random blink
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200 + Math.random() * 2500);
    return () => clearInterval(id);
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    const x = (py - 0.5) * -14; // rotateX
    const y = (px - 0.5) * 18; // rotateY
    setRot({ x, y });
  };

  const reset = () => setRot({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      title="Click Ghost"
      style={{
        width: size,
        height: size,
        borderRadius: 26,
        cursor: "pointer",
        perspective: 900,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
      }}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 26,
          overflow: "hidden",
          position: "relative",
          transformStyle: "preserve-3d",
          boxShadow:
            "0 22px 70px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.10) inset",
          background:
            "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
        }}
        animate={{
          rotateX: rot.x,
          rotateY: rot.y,
          scale: speaking ? 1.03 : 1,
        }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
      >
        {/* glow */}
        <motion.div
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: 34,
            background:
              "radial-gradient(circle at 30% 20%, rgba(140,90,255,0.40), transparent 55%), radial-gradient(circle at 70% 80%, rgba(255,80,80,0.22), transparent 55%)",
            filter: "blur(12px)",
            opacity: speaking ? 1 : 0.75,
          }}
          animate={{ opacity: speaking ? [0.7, 1, 0.7] : 0.75 }}
          transition={{ duration: 0.9, repeat: speaking ? Infinity : 0 }}
        />

        {/* image */}
        <img
          src={src}
          alt="Ghost"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "translateZ(28px)",
            filter: "contrast(1.06) saturate(1.06)",
          }}
        />

        {/* blink */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: blink ? "18%" : "0%",
            background: "rgba(0,0,0,0.55)",
            transition: "height 140ms ease",
            transform: "translateZ(40px)",
          }}
        />

        {/* shine sweep */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.10) 45%, transparent 60%)",
            transform: "translateX(-120%) translateZ(55px)",
          }}
          animate={{
            transform: [
              "translateX(-120%) translateZ(55px)",
              "translateX(120%) translateZ(55px)",
            ],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            repeatDelay: 1.4,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function Page() {
  const [activeNav, setActiveNav] = useState<"chat" | "team" | "execution">("chat");
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

  const [heat, setHeat] = useState<number>(() => localGet("ghost.heat", 22));
  const [speaking, setSpeaking] = useState(false);

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

  const [broadcast, setBroadcast] = useState<string>(() =>
    localGet("ghost.broadcast", quoteBank[0])
  );

  const [input, setInput] = useState("");

  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => localSet("ghost.messages", messages), [messages]);
  useEffect(() => localSet("ghost.heat", heat), [heat]);
  useEffect(() => localSet("ghost.broadcast", broadcast), [broadcast]);

  // auto-scroll
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  // live broadcast rotation
  useEffect(() => {
    const id = setInterval(() => {
      const next = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      setBroadcast(next);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const addMsg = (speaker: "Ghost" | "You", text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker, text, time: nowTime() },
    ]);

    if (speaker === "Ghost") {
      setSpeaking(true);
      window.setTimeout(() => setSpeaking(false), 900);
    }
  };

  const routeGhost = (userText: string) => {
    const t = userText.toLowerCase();

    // quick “delegation” simulation
    if (t.includes("botox") || t.includes("med spa") || t.includes("aesthetics")) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "lead" || a.id === "outreach" ? { ...a, status: "Working" } : a
        )
      );
      setHeat((h) => clamp(h + 8, 0, 100));
      return "Copy. We’re running Botox lead gen. Tell me the city (Austin/Houston/Dallas/San Antonio) and your offer (free consult / booked appts / pay-per-lead).";
    }

    if (t.includes("plan") || t.includes("today")) {
      setHeat((h) => clamp(h + 5, 0, 100));
      return "Here’s the move: 1) pick 1 city, 2) pull 30 clinics, 3) send 30 DMs + 30 emails, 4) follow up at 6 hours. I’ll format scripts if you say the offer.";
    }

    if (t.includes("quote")) {
      const q = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      setBroadcast(q);
      return q;
    }

    setHeat((h) => clamp(h + 2, 0, 100));
    return "Objective received. Be specific: city + offer + goal for the next 48 hours.";
  };

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setInput("");
    addMsg("You", txt);

    // ghost reply (simulate)
    window.setTimeout(() => {
      const reply = routeGhost(txt);
      addMsg("Ghost", reply);
    }, 420);
  };

  const shell = {
    page: {
      height: "100vh",
      display: "grid",
      gridTemplateColumns: "260px 1fr 360px",
      gap: 18,
      padding: 18,
      background:
        "radial-gradient(1200px 700px at 30% 10%, rgba(140,90,255,0.12), transparent 55%), radial-gradient(900px 600px at 70% 20%, rgba(255,80,80,0.08), transparent 55%), #07070a",
    } as React.CSSProperties,
    panel: {
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.03)",
      boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
      overflow: "hidden",
    } as React.CSSProperties,
  };

  const NavItem = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: "chat" | "team" | "execution";
  }) => (
    <button
      onClick={() => setActiveNav(value)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          activeNav === value ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0)",
        color: "white",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div style={shell.page}>
      {/* LEFT NAV */}
      <aside style={{ ...shell.panel, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.08)",
              fontWeight: 900,
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontWeight: 900 }}>Ghost OS</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>COO Agent Interface</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <NavItem icon={<MessageSquare size={18} />} label="Command Chat" value="chat" />
          <NavItem icon={<Users size={18} />} label="Agent Team" value="team" />
          <NavItem icon={<Zap size={18} />} label="Execution" value="execution" />
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Flame size={18} />
            <div style={{ fontWeight: 900 }}>Heat</div>
            <div style={{ marginLeft: "auto", opacity: 0.8, fontWeight: 900 }}>{heat}</div>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                width: `${heat}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(140,90,255,0.9), rgba(255,80,80,0.85))",
              }}
            />
          </div>
        </div>
      </aside>

      {/* CENTER */}
      <main style={{ ...shell.panel, display: "grid", gridTemplateRows: "auto 1fr auto" }}>
        {/* header */}
        <div
          style={{
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <GhostAvatar
            src="/Ghost2.png"
            size={160}
            speaking={speaking}
            onClick={() => addMsg("Ghost", quoteBank[Math.floor(Math.random() * quoteBank.length)])}
          />

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Ghost (COO)</div>
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
              fontWeight: 800,
            }}
          >
            Random Quote
          </button>
        </div>

        {/* chat */}
        <div
          ref={chatRef}
          style={{
            padding: 16,
            overflow: "auto",
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(140,90,255,0.10), transparent 55%)",
          }}
        >
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, opacity: 0.9 }}>
                <div style={{ fontWeight: 900 }}>{m.speaker}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{m.time}</div>
              </div>
              <div
                style={{
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    m.speaker === "Ghost"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(140,90,255,0.10)",
                  maxWidth: 760,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* input */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder={`Tell Ghost what you're working on… (ex: "Botox leads Austin")`}
            style={{
              flex: 1,
              padding: "12px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.35)",
              color: "white",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background:
                "linear-gradient(90deg, rgba(140,90,255,0.9), rgba(120,80,255,0.65))",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SendHorizonal size={18} />
            Send
          </button>
        </div>
      </main>

      {/* RIGHT TEAM */}
      <aside style={{ ...shell.panel, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Team</div>

        <div style={{ display: "grid", gap: 10 }}>
          {agents.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{a.name}</div>
                <div
                  style={{
                    marginLeft: "auto",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: a.status === "Working" ? "rgba(255,80,80,0.10)" : "rgba(255,255,255,0.05)",
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: 0.95,
                  }}
                >
                  {a.status}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{a.role}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Tip: Your Ghost image is loading from <b>/public/Ghost2.png</b>.  
            If you upload a new one later, keep the same filename to swap instantly.
          </div>
        </div>
      </aside>
    </div>
  );
}
