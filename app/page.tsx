"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  Environment,
  OrbitControls,
  useGLTF,
  Center,
} from "@react-three/drei";
import * as THREE from "three";

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

/** ---------------- SPEECH ENGINE (voice + timing) ---------------- */
function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function makeUtterance(text: string) {
  const u = new SpeechSynthesisUtterance(text);
  // Tweak these for vibe
  u.rate = 1.0;   // 0.8 slower / 1.1 faster
  u.pitch = 0.85; // lower = more “Ghost-ish”
  u.volume = 1.0;
  return u;
}

/**
 * We want: text types AND disappears while speaking.
 * Simple approach:
 * - We estimate duration from character count
 * - While speaking, we show a “remaining” substring that shrinks from the left
 */
function estimateMs(text: string) {
  // ~14 chars/sec baseline at rate ~1.0 (rough)
  const cps = 14;
  const ms = (text.length / cps) * 1000;
  return clamp(ms, 1200, 9000);
}

/** ---------------- 3D GHOST MODEL ---------------- */
function GhostModel({
  talking,
  intensity,
}: {
  talking: boolean;
  intensity: number; // 0..1
}) {
  const url = useMemo(() => `/Ghost.glb`, []);
  const gltf = useGLTF(url);

  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Idle (always alive)
    const idleBob = Math.sin(t * 1.2) * 0.025;
    const idleTurn = Math.sin(t * 0.5) * 0.10;
    const idleBreath = 1 + Math.sin(t * 2.1) * 0.006;

    // Talking (stronger)
    const talkBob = Math.sin(t * 7.2) * 0.05 * intensity;
    const talkNod = Math.sin(t * 8.7) * 0.20 * intensity;
    const talkTwist = Math.sin(t * 6.1) * 0.14 * intensity;
    const pulse = 1 + (talking ? Math.sin(t * 10.0) * 0.012 * intensity : 0);

    group.current.position.y = idleBob + (talking ? talkBob : 0);
    group.current.rotation.y = idleTurn + (talking ? talkTwist : 0);
    group.current.rotation.x = (talking ? talkNod : 0) * 0.12;

    // Keep him big but not “head-only”
    // (Bounds will frame the full body; this scale is safe)
    const baseScale = 2.2; // <- adjust if needed
    group.current.scale.setScalar(baseScale * idleBreath * pulse);
  });

  return (
    <group ref={group}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </group>
  );
}

/** ---------------- 3D STAGE ---------------- */
function GhostStage({
  talking,
  intensity,
}: {
  talking: boolean;
  intensity: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 4.6], fov: 32 }}
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(1200px 650px at 50% 18%, rgba(140,80,255,0.20), rgba(0,0,0,0))",
        borderRadius: 18,
      }}
    >
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.35} />
      <pointLight position={[-2, 2, 2]} intensity={0.85} />

      <Environment preset="city" />

      <React.Suspense fallback={null}>
        {/* Bounds auto-fits full body to camera (fixes “head-only”) */}
        <Bounds fit clip observe margin={1.2}>
          <GhostModel talking={talking} intensity={intensity} />
        </Bounds>
      </React.Suspense>

      {/* Keep it interactive but controlled */}
      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={6.0}
        minPolarAngle={Math.PI / 3.6}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

/** ---------------- SUBTITLE (types + disappears while speaking) ---------------- */
function SubtitleBar({
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
        bottom: 16,
        transform: "translateX(-50%)",
        width: "min(920px, 92%)",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 16,
          background: "rgba(10,10,16,0.78)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          color: "rgba(255,255,255,0.92)",
          fontSize: 18,
          lineHeight: "26px",
          textAlign: "center",
          minHeight: 58,
        }}
      >
        {text}
        {visible ? <span style={{ marginLeft: 6, opacity: 0.7 }}>▋</span> : null}
      </div>
    </div>
  );
}

/** ---------------- PAGE ---------------- */
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

  // Talking state for 3D
  const [talking, setTalking] = useState(false);
  const [talkIntensity, setTalkIntensity] = useState(0);

  // Subtitle text
  const [subtitle, setSubtitle] = useState("");
  const [subtitleVisible, setSubtitleVisible] = useState(false);

  // prevent overlap
  const typingRef = useRef(false);
  const speakCancelRef = useRef<(() => void) | null>(null);

  function addUser(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker: "You", text, time: nowTime() },
    ]);
  }

  async function addGhost(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), speaker: "Ghost", text, time: nowTime() },
    ]);
    await speak(text);
  }

  async function speak(text: string) {
    if (typingRef.current) return;
    typingRef.current = true;

    // cancel any existing voice
    if (canSpeak()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (speakCancelRef.current) {
      speakCancelRef.current();
      speakCancelRef.current = null;
    }

    // Start “alive talking”
    setTalking(true);
    setTalkIntensity(0.25);
    setSubtitleVisible(true);
    setSubtitle("");

    await new Promise((r) => setTimeout(r, 120));
    setTalkIntensity(0.85);

    const totalMs = estimateMs(text);
    const start = performance.now();

    // Type + disappear while speaking
    // We show the “remaining” substring that shrinks from the left over time.
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = clamp(elapsed / totalMs, 0, 1);
      const idx = Math.floor(p * text.length);

      // Remaining substring (disappears as it’s said)
      const remaining = text.slice(idx);
      setSubtitle(remaining.length ? remaining : "");

      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    speakCancelRef.current = () => cancelAnimationFrame(raf);

    // Voice (optional, but you asked for it)
    let voiceDone = false;
    if (canSpeak()) {
      const u = makeUtterance(text);
      u.onend = () => {
        voiceDone = true;
      };
      u.onerror = () => {
        voiceDone = true;
      };
      try {
        window.speechSynthesis.speak(u);
      } catch {
        voiceDone = true;
      }
    } else {
      // no speech support; just use timer
      voiceDone = true;
    }

    // Wait until estimated duration passes (and voice finishes if possible)
    await new Promise((r) => setTimeout(r, totalMs));

    // clean up subtitle
    setSubtitle("");
    setSubtitleVisible(false);

    // ramp down talking
    setTalkIntensity(0.25);
    await new Promise((r) => setTimeout(r, 160));
    setTalkIntensity(0);
    setTalking(false);

    typingRef.current = false;
  }

  async function onSend() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    addUser(t);

    const lower = t.toLowerCase();

    if (lower.includes("quote")) {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      await addGhost(q);
      return;
    }

    if (lower.includes("botox") || lower.includes("lead")) {
      await addGhost("Objective locked. We sell booked consults first. Prove results. Then scale.");
      await addGhost("Next move: 10 DMs today. Offer 1–2 free booked consults to test quality.");
      return;
    }

    await addGhost("Say the objective in one line. City + offer + what you want done next.");
  }

  // Random quote drip (keeps him alive)
  useEffect(() => {
    const id = setInterval(() => {
      if (typingRef.current) return;
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      addGhost(q);
    }, 28000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "white", padding: 18 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr 340px",
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
              <div style={{ opacity: 0.75 }}>{Math.round(clamp(35 + talkIntensity * 55, 0, 100))}/100</div>
            </div>
            <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(clamp(35 + talkIntensity * 55, 0, 100))}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(140,80,255,0.9), rgba(255,80,140,0.85))",
                }}
              />
            </div>

            <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12, lineHeight: "18px" }}>
              Tips:
              <div>• Model loads from <code>/public/Ghost.glb</code></div>
              <div>• If it doesn’t update on localhost: stop dev → replace file → restart → hard refresh</div>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* STAGE */}
          <div
            style={{
              position: "relative",
              height: 520,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.55)",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 14, top: 12, zIndex: 5 }}>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Ghost (COO)</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Full-body 3D + voice + alive motion</div>
            </div>

            <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 10, zIndex: 5 }}>
              <button onClick={() => addGhost(QUOTES[Math.floor(Math.random() * QUOTES.length)])} style={pillBtn}>
                Random Quote
              </button>
            </div>

            {/* Subtitle that types + disappears as he speaks */}
            <SubtitleBar text={subtitle} visible={subtitleVisible} />

            <div style={{ position: "absolute", inset: 0, paddingTop: 56 }}>
              <GhostStage talking={talking} intensity={talkIntensity} />
            </div>
          </div>

          {/* CHAT */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.70)",
              padding: 14,
              height: 360,
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

        {/* RIGHT */}
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

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75, lineHeight: "18px" }}>
            Voice uses your browser’s speech engine. For “real mouth movement” you’ll need a rigged model
            with visemes/blendshapes (we can hook those up next once your GLB includes them).
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

// Preload
useGLTF.preload("/Ghost.glb");
