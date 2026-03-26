"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Users, Zap, Flame, SendHorizonal } from "lucide-react";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Sparkles, useTexture } from "@react-three/drei";
import * as THREE from "three";

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

/**
 * 3D Ghost:
 * - Uses your /public/Ghost2.png as texture
 * - "3D" box (front face = image, sides dark)
 * - Constant idle: float + breathe + glow pulse + blink (scaleY micro-dip)
 * - Reacts to mouse (look/tilt)
 * - Speaking pulse
 */
function Ghost3D({
  speaking,
  mood,
  onClick,
}: {
  speaking: boolean;
  mood: number; // 0..100 heat
  onClick?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const face = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);

  const tex = useTexture("/Ghost2.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current = { x, y };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // blink (brief squash)
  const blinkT = useRef(0);
  const nextBlink = useRef(1.8 + Math.random() * 2.2);

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    const g = group.current;
    if (!g) return;

    // Idle float/breathe
    const float = Math.sin(t * 1.2) * 0.08;
    const breathe = 1 + Math.sin(t * 1.6) * 0.02;

    // Look/tilt toward mouse
    const targetRotY = mouse.current.x * 0.35;
    const targetRotX = -mouse.current.y * 0.18;

    g.position.y = float;
    g.rotation.y += (targetRotY - g.rotation.y) * 0.08;
    g.rotation.x += (targetRotX - g.rotation.x) * 0.08;

    // speaking pulse (stronger)
    const talk = speaking ? 1 + Math.sin(t * 9) * 0.05 : 1;

    // heat affects glow intensity
    const heatBoost = 0.35 + (mood / 100) * 0.75;

    g.scale.setScalar(breathe * talk);

    // blink timing
    blinkT.current += dt;
    if (blinkT.current > nextBlink.current) {
      // start blink
      nextBlink.current = blinkT.current + (1.8 + Math.random() * 2.2);
      // blink animation: quick squash
      if (face.current) {
        face.current.scale.y = 0.82;
        setTimeout(() => {
          if (face.current) face.current.scale.y = 1;
        }, 120);
      }
    }

    // glow pulse
    if (glow.current) {
      const mat = glow.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.20 + Math.sin(t * 2.3) * 0.05 + (speaking ? 0.10 : 0);
      mat.emissiveIntensity = heatBoost + (speaking ? 0.6 : 0);
    }
  });

  return (
    <group
      ref={group}
      onClick={onClick}
      // Position + scale makes him feel BIG in frame
      position={[0, -0.15, 0]}
    >
      {/* halo glow plane behind */}
      <mesh ref={glow} position={[0, 0, -0.26]}>
        <planeGeometry args={[2.7, 2.7]} />
        <meshStandardMaterial
          transparent
          opacity={0.28}
          color={"#8c5aff"}
          emissive={"#ff5050"}
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* 3D “card” body */}
      <mesh ref={face} castShadow receiveShadow>
        <boxGeometry args={[1.85, 1.85, 0.22]} />
        {/* right */}
        <meshStandardMaterial attach="material-0" color={"#0d0d12"} />
        {/* left */}
        <meshStandardMaterial attach="material-1" color={"#0d0d12"} />
        {/* top */}
        <meshStandardMaterial attach="material-2" color={"#101018"} />
        {/* bottom */}
        <meshStandardMaterial attach="material-3" color={"#101018"} />
        {/* front (your image) */}
        <meshStandardMaterial
          attach="material-4"
          map={tex}
          roughness={0.35}
          metalness={0.15}
          emissive={new THREE.Color("#111114")}
          emissiveIntensity={0.35}
        />
        {/* back */}
        <meshStandardMaterial attach="material-5" color={"#0b0b10"} />
      </mesh>

      {/* subtle rim light feel */}
      <mesh position={[0, 0, 0.13]}>
        <planeGeometry args={[1.92, 1.92]} />
        <meshStandardMaterial
          transparent
          opacity={0.10}
          color={"white"}
          emissive={"#8c5aff"}
          emissiveIntensity={0.6}
        />
      </mesh>

      <Sparkles
        count={speaking ? 120 : 70}
        scale={[4, 4, 2]}
        size={speaking ? 2.0 : 1.2}
        speed={speaking ? 0.9 : 0.6}
        opacity={0.7}
        color={"#bfa6ff"}
      />
    </group>
  );
}

/**
 * Subtitle bubble (big, proportional to avatar):
 * - Types in as Ghost speaks
 * - Then fades out and clears
 */
function SpeakingBubble({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 14, scale: visible ? 1 : 0.98 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        bottom: 18,
        padding: "18px 18px",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.40))",
        boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontWeight: 900, opacity: 0.8, marginBottom: 6, letterSpacing: 0.3 }}>
        Ghost
      </div>
      <div
        style={{
          fontSize: 22, // big + readable
          lineHeight: 1.25,
          fontWeight: 800,
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

export default function Page() {
  const [activeNav, setActiveNav] = useState<"chat" | "team" | "execution">("chat");
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

  const [heat, setHeat] = useState<number>(() => localGet("ghost.heat", 22));

  const [messages, setMessages] = useState<Msg[]>(() =>
    localGet("ghost.messages", [
      { id: 1, speaker: "Ghost", text: "I’m online. Give me the objective. I’ll run the team.", time: nowTime() },
    ])
  );

  const [broadcast, setBroadcast] = useState<string>(() =>
    localGet("ghost.broadcast", quoteBank[0])
  );

  const [input, setInput] = useState("");

  // speaking bubble state
  const [speaking, setSpeaking] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState("");

  const chatRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

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
    setMessages((prev) => [...prev, { id: Date.now(), speaker, text, time: nowTime() }]);
  };

  /** Ghost "talking" effect:
   * - Bubble appears
   * - Typewriter fills bubble
   * - After finished, bubble fades away
   * - Message still logged in chat
   */
  const speak = (full: string) => {
    // cleanup any previous timers
    if (typingTimer.current) window.clearInterval(typingTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);

    setSpeaking(true);
    setBubbleVisible(true);
    setBubbleText("");

    let i = 0;
    const speed = 18; // fast enough to feel real
    typingTimer.current = window.setInterval(() => {
      i++;
      setBubbleText(full.slice(0, i));
      if (i >= full.length) {
        if (typingTimer.current) window.clearInterval(typingTimer.current);
        typingTimer.current = null;

        // finish speaking shortly after
        setSpeaking(false);

        // bubble disappears after a moment
        hideTimer.current = window.setTimeout(() => {
          setBubbleVisible(false);
          setBubbleText("");
          hideTimer.current = null;
        }, 1200);
      }
    }, speed);

    // also log to chat immediately (so it’s always recorded)
    addMsg("Ghost", full);
  };

  const routeGhost = (userText: string) => {
    const t = userText.toLowerCase();

    if (t.includes("botox") || t.includes("med spa") || t.includes("aesthetics")) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "lead" || a.id === "outreach" ? { ...a, status: "Working" } : a
        )
      );
      setHeat((h) => clamp(h + 10, 0, 100));
      return "Copy. We’re running Botox lead gen. Pick ONE city right now: Austin, Houston, Dallas, or San Antonio. Then tell me your offer: free consult, booked appointments, or pay-per-lead.";
    }

    if (t.includes("plan") || t.includes("today") || t.includes("48")) {
      setHeat((h) => clamp(h + 7, 0, 100));
      return "48-hour plan: 1) pick one city, 2) list 30 clinics, 3) send 30 DMs + 30 emails, 4) follow up in 6 hours, 5) close 1 clinic on a trial. Tell me city + offer and I’ll generate the exact scripts.";
    }

    if (t.includes("quote")) {
      const q = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      setBroadcast(q);
      setHeat((h) => clamp(h + 3, 0, 100));
      return q;
    }

    setHeat((h) => clamp(h + 2, 0, 100));
    return "Objective received. Be specific: city + offer + money target for the next 48 hours.";
  };

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setInput("");
    addMsg("You", txt);

    // ghost responds
    window.setTimeout(() => {
      const reply = routeGhost(txt);
      speak(reply);
    }, 380);
  };

  const shell = {
    page: {
      height: "100vh",
      display: "grid",
      gridTemplateColumns: "260px 1fr 380px",
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
        {/* header with BIG 3D Ghost */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.16)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ghost (COO)</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Live Broadcast: <span style={{ opacity: 1 }}>{broadcast}</span>
              </div>
            </div>

            <button
              onClick={() => speak(quoteBank[Math.floor(Math.random() * quoteBank.length)])}
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

          {/* HUGE 3D stage */}
          <div
            style={{
              marginTop: 14,
              height: 420, // BIG stage
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                "radial-gradient(900px 420px at 30% 10%, rgba(140,90,255,0.18), transparent 60%), radial-gradient(700px 360px at 70% 30%, rgba(255,80,80,0.10), transparent 60%), rgba(255,255,255,0.02)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* speaking subtitle bubble (big, proportional) */}
            <SpeakingBubble text={bubbleText} visible={bubbleVisible} />

            <Canvas
              shadows
              camera={{ position: [0, 0.2, 3.2], fov: 40 }}
              style={{ width: "100%", height: "100%" }}
            >
              <color attach="background" args={["#05050a"]} />
              <ambientLight intensity={0.35} />
              <directionalLight position={[3, 3, 2]} intensity={1.15} castShadow />
              <pointLight position={[-3, 1, 2]} intensity={0.8} color={"#8c5aff"} />
              <pointLight position={[2, -1, 2]} intensity={0.6} color={"#ff5050"} />

              <Ghost3D
                speaking={speaking}
                mood={heat}
                onClick={() => speak(quoteBank[Math.floor(Math.random() * quoteBank.length)])}
              />

              {/* subtle floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow>
                <planeGeometry args={[12, 12]} />
                <meshStandardMaterial color={"#07070a"} roughness={1} metalness={0} />
              </mesh>

              {/* optional environment (no network fetch) */}
              <Environment preset="city" />
            </Canvas>
          </div>
        </div>

        {/* chat log */}
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
                  background: m.speaker === "Ghost" ? "rgba(255,255,255,0.06)" : "rgba(140,90,255,0.10)",
                  maxWidth: 920,
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
              background: "linear-gradient(90deg, rgba(140,90,255,0.9), rgba(120,80,255,0.65))",
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
            Ghost is loaded from <b>/public/Ghost2.png</b>.
            <br />
            Keep the same filename to swap art instantly later.
          </div>
        </div>
      </aside>
    </div>
  );
}
