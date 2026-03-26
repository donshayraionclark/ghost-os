"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Ghost OS — Command Center
 * - 3D Ghost model from /public/Ghost.glb
 * - Typewriter "speech" bubble synced to Ghost messages
 * - Routes ALL user commands to /api/command
 * - Team panel updates (Idle -> Working -> Done) based on returned plan
 *
 * Requirements:
 * 1) public/Ghost.glb exists
 * 2) npm install three @react-three/fiber @react-three/drei
 * 3) app/api/command/route.ts exists (you just created it)
 */

type Msg = {
  id: number;
  speaker: "Ghost" | "You";
  text: string;
  time: string;
};

type TeamName = "Lead Gen" | "Outreach" | "Ops" | "Research" | "Automation";

type TeamStatus = "Idle" | "Working" | "Done" | "Blocked";

type PlanItem = {
  owner: string;
  task: string;
};

type ApiResponse = {
  ok: boolean;
  ghostReply?: string;
  plan?: PlanItem[];
  error?: string;
};

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const TEAM: { name: TeamName; desc: string }[] = [
  { name: "Lead Gen", desc: "Find & qualify targets" },
  { name: "Outreach", desc: "DM/SMS/Email scripts + follow-ups" },
  { name: "Ops", desc: "Breakdown, checklists, task routing" },
  { name: "Research", desc: "Options, risks, best path" },
  { name: "Automation", desc: "Trackers, workflows, integrations" },
];

const QUOTES = [
  "Pressure exposes who you really are.",
  "Build systems. Stop begging for motivation.",
  "One objective. One move. Execute.",
  "Talk less. Move cleaner.",
  "Win the hour. Stack the day.",
  "Speed with control.",
];

/** ===== 3D MODEL ===== */
function GhostModel({
  talking,
  intensity,
}: {
  talking: boolean;
  intensity: number; // 0..1
}) {
  // cache-bust every minute so swapping Ghost.glb shows up quickly
  const url = useMemo(() => `/Ghost.glb?v=${Math.floor(Date.now() / 60000)}`, []);
  const gltf = useGLTF(url);

  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();

    // Alive idle motion
    const idleBob = Math.sin(t * 1.2) * 0.03;
    const idleTurn = Math.sin(t * 0.6) * 0.10;

    // Talking motion (stronger)
    const talkBob = Math.sin(t * 7.5) * 0.06 * intensity;
    const talkNod = Math.sin(t * 9.0) * 0.18 * intensity;
    const talkTwist = Math.sin(t * 6.2) * 0.12 * intensity;

    const bob = idleBob + (talking ? talkBob : 0);
    const turn = idleTurn + (talking ? talkTwist : 0);
    const nod = talking ? talkNod : 0;

    group.current.position.y = bob;
    group.current.rotation.y = turn;
    group.current.rotation.x = nod * 0.15;

    // BIGGER model (3x-ish)
    const pulse =
      1 +
      (talking
        ? Math.sin(t * 10.0) * 0.012 * intensity
        : Math.sin(t * 2.0) * 0.005);

    group.current.scale.setScalar(2.9 * pulse);
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

/** ===== 3D STAGE ===== */
function GhostStage({
  talking,
  intensity,
}: {
  talking: boolean;
  intensity: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.1], fov: 35 }}
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(1200px 700px at 50% 15%, rgba(140,80,255,0.20), rgba(0,0,0,0))",
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.25} />
      <pointLight position={[-2, 2, 2]} intensity={0.75} />

      <Environment preset="city" />

      <React.Suspense fallback={null}>
        <GhostModel talking={talking} intensity={intensity} />
      </React.Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={4.2}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}

/** ===== SPEECH BUBBLE (typewriter + fade) ===== */
function SpeechBubble({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 26,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 350ms ease",
        width: "min(900px, 92%)",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          borderRadius: 18,
          padding: "18px 18px",
          background: "rgba(10,10,16,0.78)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          fontSize: 18,
          lineHeight: "28px",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {text}
        <span style={{ marginLeft: 6, opacity: 0.7 }}>▋</span>
      </div>
    </div>
  );
}

/** ===== UI HELPERS ===== */
function pill(label: string, onClick: () => void) {
  return (
    <button onClick={onClick} style={pillBtn}>
      {label}
    </button>
  );
}

function statusPill(status: TeamStatus) {
  const map: Record<TeamStatus, React.CSSProperties> = {
    Idle: {
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.82)",
    },
    Working: {
      border: "1px solid rgba(140,80,255,0.40)",
      background: "rgba(140,80,255,0.16)",
      color: "rgba(255,255,255,0.92)",
    },
    Done: {
      border: "1px solid rgba(80,255,160,0.35)",
      background: "rgba(80,255,160,0.12)",
      color: "rgba(255,255,255,0.92)",
    },
    Blocked: {
      border: "1px solid rgba(255,120,120,0.35)",
      background: "rgba(255,120,120,0.12)",
      color: "rgba(255,255,255,0.92)",
    },
  };

  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 800,
        ...map[status],
      }}
    >
      {status}
    </span>
  );
}

/** ===== MAIN PAGE ===== */
export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      speaker: "Ghost",
      text: "I’m online. Give me the objective. I’ll run the team.",
      time: nowTime(),
    },
  ]);

  const [input, setInput] = useState("");

  // Speech bubble
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);

  // Talking animation
  const [talking, setTalking] = useState(false);
  const [talkIntensity, setTalkIntensity] = useState(0);

  // Team statuses
  const [teamStatus, setTeamStatus] = useState<Record<TeamName, TeamStatus>>({
    "Lead Gen": "Idle",
    Outreach: "Idle",
    Ops: "Idle",
    Research: "Idle",
    Automation: "Idle",
  });

  // Latest plan list (displayable / “working memory”)
  const [plan, setPlan] = useState<PlanItem[]>([]);

  // Prevent overlapping typewriters
  const typingRef = useRef(false);

  // auto scroll
  const chatRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  function setAllIdle() {
    setTeamStatus({
      "Lead Gen": "Idle",
      Outreach: "Idle",
      Ops: "Idle",
      Research: "Idle",
      Automation: "Idle",
    });
  }

  function normalizeOwner(owner: string): TeamName | null {
    const o = owner.toLowerCase();
    if (o.includes("lead")) return "Lead Gen";
    if (o.includes("outreach")) return "Outreach";
    if (o.includes("ops")) return "Ops";
    if (o.includes("research")) return "Research";
    if (o.includes("automation")) return "Automation";
    return null;
  }

  async function speak(text: string) {
    if (typingRef.current) return;
    typingRef.current = true;

    setTalking(true);
    setBubbleVisible(true);
    setBubbleText("");

    setTalkIntensity(0.2);
    await new Promise((r) => setTimeout(r, 120));
    setTalkIntensity(0.85);

    // Typewriter
    for (let i = 1; i <= text.length; i++) {
      setBubbleText(text.slice(0, i));
      await new Promise((r) => setTimeout(r, 14));
    }

    // Hold then fade
    await new Promise((r) => setTimeout(r, 650));
    setBubbleVisible(false);

    setTalkIntensity(0.25);
    await new Promise((r) => setTimeout(r, 180));
    setTalkIntensity(0);
    setTalking(false);

    await new Promise((r) => setTimeout(r, 380));
    setBubbleText("");

    typingRef.current = false;
  }

  async function addGhost(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker: "Ghost", text, time: nowTime() },
    ]);
    await speak(text);
  }

  function addUser(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker: "You", text, time: nowTime() },
    ]);
  }

  async function runTeam(planItems: PlanItem[]) {
    // Reset -> Working -> Done animation
    setAllIdle();
    setPlan(planItems);

    // Mark relevant teams "Working"
    const owners = new Set<TeamName>();
    for (const p of planItems) {
      const team = normalizeOwner(p.owner);
      if (team) owners.add(team);
    }

    if (owners.size === 0) return;

    // Step 1: Working
    setTeamStatus((prev) => {
      const next = { ...prev };
      owners.forEach((t) => (next[t] = "Working"));
      return next;
    });

    // Step 2: Done (stagger)
    let delay = 900;
    owners.forEach((t) => {
      window.setTimeout(() => {
        setTeamStatus((prev) => ({ ...prev, [t]: "Done" }));
      }, delay);
      delay += 700;
    });
  }

  async function callCommandApi(userText: string) {
    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userText }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!data.ok) {
        await addGhost(`Blocked. API error: ${data.error || "Unknown error"}`);
        setAllIdle();
        return;
      }

      const reply = data.ghostReply || "Objective received.";
      await addGhost(reply);

      if (Array.isArray(data.plan) && data.plan.length > 0) {
        await runTeam(data.plan);
        // Add a second “COO” style action prompt
        await addGhost("Approve the plan or tell me what to change.");
      } else {
        setAllIdle();
      }
    } catch (e: any) {
      await addGhost(`Blocked. Network error: ${e?.message || "Unknown error"}`);
      setAllIdle();
    }
  }

  async function onSend() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    addUser(t);

    // Local shortcuts (still go through Ghost voice/bubble)
    const lower = t.toLowerCase();
    if (lower === "quote") {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      await addGhost(q);
      return;
    }

    // Route to API (this is what makes him “COO-like”)
    await callCommandApi(t);
  }

  // Keep him "alive" but not annoying: only if idle and not typing
  useEffect(() => {
    const id = window.setInterval(() => {
      if (typingRef.current) return;
      const anyWorking = Object.values(teamStatus).some((s) => s === "Working");
      if (anyWorking) return;
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      addGhost(q);
    }, 45000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamStatus]);

  const heat = Math.round(clamp(35 + talkIntensity * 55, 0, 100));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070a",
        color: "white",
        padding: 18,
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr 360px",
          gap: 16,
        }}
      >
        {/* LEFT */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(10,10,14,0.70)",
            padding: 16,
            height: "calc(100vh - 36px)",
            position: "sticky",
            top: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "rgba(255,255,255,0.10)",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              G
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ghost OS</div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>COO Command Center</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={navBtnStyle(true)}>Command Chat</div>
            <div style={navBtnStyle(false)}>Agent Team</div>
            <div style={navBtnStyle(false)}>Execution</div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ opacity: 0.85, fontWeight: 900 }}>Heat</div>
              <div style={{ opacity: 0.85, fontWeight: 900 }}>{heat}/100</div>
            </div>

            <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${heat}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(140,80,255,0.9), rgba(255,80,140,0.85))",
                }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.70, lineHeight: "18px" }}>
              This UI is your command center. The “Team” updates when Ghost produces a plan from{" "}
              <code>/api/command</code>.
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* 3D STAGE */}
          <div
            style={{
              position: "relative",
              height: 460,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.55)",
              overflow: "hidden",
            }}
          >
            <SpeechBubble text={bubbleText} visible={bubbleVisible} />

            <div style={{ position: "absolute", left: 14, top: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 22 }}>Ghost (COO)</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                Live Broadcast: {bubbleVisible ? "Speaking…" : "Listening."}
              </div>
            </div>

            <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 10 }}>
              {pill("Random Quote", () => addGhost(QUOTES[Math.floor(Math.random() * QUOTES.length)]))}
              {pill("Reset Team", () => {
                setPlan([]);
                setAllIdle();
              })}
            </div>

            <div style={{ position: "absolute", inset: 0, paddingTop: 56 }}>
              <GhostStage talking={talking} intensity={talkIntensity} />
            </div>

            <div style={{ position: "absolute", bottom: 12, left: 14, opacity: 0.7, fontSize: 12 }}>
              Model: <code>/public/Ghost.glb</code>
            </div>
          </div>

          {/* CHAT */}
          <div
            ref={chatRef}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.70)",
              padding: 14,
              height: 420,
              overflow: "auto",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: m.speaker === "You" ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    maxWidth: "86%",
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: m.speaker === "You" ? "white" : "rgba(255,255,255,0.08)",
                    color: m.speaker === "You" ? "#000" : "rgba(255,255,255,0.92)",
                    border: m.speaker === "You" ? "none" : "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <div
                    style={{
                      opacity: 0.65,
                      fontSize: 11,
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>{m.speaker}</span>
                    <span>{m.time}</span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: "22px" }}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.70)",
              padding: 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Build me a 7/1/6 X content plan for today"'
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: "12px 12px",
                color: "white",
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button onClick={onSend} style={sendBtn}>
              Send
            </button>
          </div>
        </div>

        {/* RIGHT: TEAM + PLAN */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(10,10,14,0.70)",
            padding: 16,
            height: "calc(100vh - 36px)",
            position: "sticky",
            top: 18,
            overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 12 }}>Team</div>

          {TEAM.map((t) => (
            <div
              key={t.name}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.22)",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{t.name}</div>
                {statusPill(teamStatus[t.name])}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{t.desc}</div>
            </div>
          ))}

          <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Current Plan</div>

            {plan.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                No plan yet. Send a command and Ghost will generate a plan via <code>/api/command</code>.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {plan.map((p, i) => (
                  <div
                    key={`${p.owner}-${i}`}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.06)",
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>{p.owner}</div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>Step {i + 1}</div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, lineHeight: "20px" }}>
                      {p.task}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.70, lineHeight: "18px" }}>
            Next: we’ll upgrade <code>/api/command</code> to return structured “actions” that Ghost can run
            (and require your approval for high-risk stuff like sending emails or trades).
          </div>
        </div>
      </div>
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.22)",
  color: "rgba(255,255,255,0.92)",
  cursor: "pointer",
  fontWeight: 900,
};

const sendBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(140,80,255,0.35)",
  background: "linear-gradient(135deg, rgba(140,80,255,0.9), rgba(180,80,255,0.75))",
  color: "white",
  cursor: "pointer",
  fontWeight: 950,
};

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: active
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.22)",
    color: active ? "#000" : "rgba(255,255,255,0.9)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

useGLTF.preload("/Ghost.glb");
