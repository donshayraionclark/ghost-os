"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Ghost OS — 3D Ghost (GLB) + reactive talking bubble + typewriter speech
 *
 * Requirements:
 * 1) public/Ghost.glb exists
 * 2) npm install three @react-three/fiber @react-three/drei
 *
 * Notes:
 * - “Mouth animation” depends on whether your GLB has face/jaw bones or morph targets.
 * - This code provides:
 *   - Always-on idle motion (alive)
 *   - Talking motion synced to speaking (head/body + pulse)
 *   - Speech bubble with typewriter + fade out
 */

type Msg = {
  id: number;
  speaker: "Ghost" | "You";
  text: string;
  time: string;
};

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Tight, “operator” quote bank (you can expand)
const QUOTES = [
  "Pressure exposes who you really are.",
  "Build systems. Stop begging for motivation.",
  "One objective. One move. Execute.",
  "Talk less. Move cleaner.",
  "Win the hour. Stack the day.",
  "Speed with control.",
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ===== 3D GHOST MODEL ===== */
function GhostModel({
  talking,
  intensity,
}: {
  talking: boolean;
  intensity: number; // 0..1
}) {
  // Cache-bust trick (optional): add ?v= timestamp
  const url = useMemo(() => `/Ghost.glb?v=${Math.floor(Date.now() / 60000)}`, []);
  const gltf = useGLTF(url);

  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();

    // Always-on "alive" idle motion
    const idleBob = Math.sin(t * 1.2) * 0.03;
    const idleTurn = Math.sin(t * 0.6) * 0.12;

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

    // Subtle scale “breathing/pulse”
    const pulse = 1 + (talking ? Math.sin(t * 10.0) * 0.01 * intensity : Math.sin(t * 2.0) * 0.005);
    group.current.scale.setScalar(2.8 * pulse); // << 3x-ish size here
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

/** ===== 3D SCENE WRAPPER ===== */
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
        background: "radial-gradient(1200px 600px at 50% 20%, rgba(140,80,255,0.18), rgba(0,0,0,0))",
        borderRadius: 18,
      }}
    >
      {/* Lights */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.25} />
      <pointLight position={[-2, 2, 2]} intensity={0.75} />

      {/* Environment reflections */}
      <Environment preset="city" />

      {/* Ghost */}
      <React.Suspense fallback={null}>
        <GhostModel talking={talking} intensity={intensity} />
      </React.Suspense>

      {/* Controls: keeps him interactive without letting the camera get lost */}
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
  large,
}: {
  text: string;
  visible: boolean;
  large?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: large ? 36 : 22,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 350ms ease",
        width: "min(820px, 92%)",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          borderRadius: 18,
          padding: large ? "18px 18px" : "14px 16px",
          background: "rgba(10,10,16,0.78)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          fontSize: large ? 18 : 14,
          lineHeight: large ? "28px" : "22px",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {text}
        <span style={{ marginLeft: 6, opacity: 0.7 }} className={visible ? "animate-pulse" : ""}>
          ▋
        </span>
      </div>
    </div>
  );
}

/** ===== MAIN PAGE ===== */
export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, speaker: "Ghost", text: "I’m online. Give me the objective. I’ll run the team.", time: nowTime() },
  ]);

  const [input, setInput] = useState("");

  // Speech bubble control
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);

  // Talking animation intensity 0..1
  const [talking, setTalking] = useState(false);
  const [talkIntensity, setTalkIntensity] = useState(0);

  // Typewriter lock
  const typingRef = useRef(false);

  async function speak(text: string) {
    // If already typing, ignore to prevent overlap
    if (typingRef.current) return;
    typingRef.current = true;

    setTalking(true);
    setBubbleVisible(true);
    setBubbleText("");

    // ramp up intensity
    setTalkIntensity(0.2);
    await new Promise((r) => setTimeout(r, 120));
    setTalkIntensity(0.7);

    // typewriter
    for (let i = 1; i <= text.length; i++) {
      setBubbleText(text.slice(0, i));
      await new Promise((r) => setTimeout(r, 14));
    }

    // hold, then fade bubble
    await new Promise((r) => setTimeout(r, 650));
    setBubbleVisible(false);

    // ramp down talking
    setTalkIntensity(0.25);
    await new Promise((r) => setTimeout(r, 180));
    setTalkIntensity(0);
    setTalking(false);

    // clear bubble after fade
    await new Promise((r) => setTimeout(r, 380));
    setBubbleText("");

    typingRef.current = false;
  }

  async function addGhost(text: string) {
    setMessages((prev) => [...prev, { id: Date.now(), speaker: "Ghost", text, time: nowTime() }]);
    await speak(text);
  }

  function addUser(text: string) {
    setMessages((prev) => [...prev, { id: Date.now(), speaker: "You", text, time: nowTime() }]);
  }

  async function onSend() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    addUser(t);

    // Simple “operator router” (you can expand later)
    const lower = t.toLowerCase();
    if (lower.includes("quote")) {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      await addGhost(q);
      return;
    }

    if (lower.includes("botox") || lower.includes("lead")) {
      await addGhost("Objective locked. We sell booked consults first. Prove results. Then scale.");
      await addGhost("Next move: send 10 DMs today. Offer 1–2 free booked consults to test quality.");
      return;
    }

    await addGhost("Say the objective in one line. City + offer + what you want done next.");
  }

  // Auto “random quote” every ~25s to keep him alive
  useEffect(() => {
    const id = setInterval(() => {
      if (typingRef.current) return;
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      addGhost(q);
    }, 25000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr 340px",
          gap: 16,
        }}
      >
        {/* LEFT NAV */}
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
                fontWeight: 800,
              }}
            >
              G
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Ghost OS</div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>COO Agent Interface</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={navBtnStyle(true)}>Command Chat</div>
            <div style={navBtnStyle(false)}>Agent Team</div>
            <div style={navBtnStyle(false)}>Execution</div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ opacity: 0.8, fontWeight: 700 }}>Heat</div>
              <div style={{ opacity: 0.75 }}>{Math.round(clamp(35 + talkIntensity * 30, 0, 100))}</div>
            </div>
            <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(clamp(35 + talkIntensity * 30, 0, 100))}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(140,80,255,0.9), rgba(255,80,140,0.85))",
                }}
              />
            </div>
          </div>
        </div>

        {/* CENTER: 3D + CHAT */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* 3D STAGE */}
          <div
            style={{
              position: "relative",
              height: 420, // large hero area
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.55)",
              overflow: "hidden",
            }}
          >
            {/* Speech bubble sits OVER the 3D scene */}
            <SpeechBubble text={bubbleText} visible={bubbleVisible} large />

            <div style={{ position: "absolute", left: 14, top: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Ghost (COO)</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Live: reactive 3D operator</div>
            </div>

            <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => addGhost(QUOTES[Math.floor(Math.random() * QUOTES.length)])}
                style={pillBtn}
              >
                Random Quote
              </button>
            </div>

            <div style={{ position: "absolute", inset: 0, paddingTop: 56 }}>
              <GhostStage talking={talking} intensity={talkIntensity} />
            </div>

            <div style={{ position: "absolute", bottom: 12, left: 14, opacity: 0.7, fontSize: 12 }}>
              Model loaded from <code>/public/Ghost.glb</code>
            </div>
          </div>

          {/* CHAT LOG */}
          <div
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
                  <div style={{ opacity: 0.65, fontSize: 11, marginBottom: 6, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontWeight: 800 }}>{m.speaker}</span>
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
              placeholder='Try: "Botox leads Austin" or "quote"'
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

        {/* RIGHT TEAM */}
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
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Team</div>

          {[
            ["Lead Gen", "Find & qualify med spa targets"],
            ["Outreach", "DM/SMS/Email scripts + follow-ups"],
            ["Ops", "Task routing + checklists"],
            ["Research", "Offers, pricing, competitors"],
            ["Automation", "Connect tools + reduce manual work"],
          ].map(([title, desc]) => (
            <div
              key={title}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.22)",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{title}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Idle</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{desc}</div>
            </div>
          ))}

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
            Tip: Keep your model file named exactly <code>Ghost.glb</code> inside <code>/public</code>.
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
  fontWeight: 800,
};

const sendBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(140,80,255,0.35)",
  background: "linear-gradient(135deg, rgba(140,80,255,0.9), rgba(180,80,255,0.75))",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.22)",
    color: active ? "#000" : "rgba(255,255,255,0.9)",
    fontWeight: 800,
    cursor: "pointer",
  };
}

// Needed for drei GLTF loader types
useGLTF.preload("/Ghost.glb");
