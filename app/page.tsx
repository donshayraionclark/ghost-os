"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  useGLTF,
  Html,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * GHOST OS — Full-body 3D Ghost + ALIVE + voice + typewriter bubble
 *
 * REQUIREMENTS (you already have most):
 * 1) public/Ghost.glb  (your Meshy full-body)
 * 2) npm i three @react-three/fiber @react-three/drei
 *
 * Notes:
 * - Real mouth animation requires morph targets (blendshapes) OR a jaw bone.
 * - This file tries morph targets first; if none exist, it uses jaw/head motion fallback.
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

const QUOTES = [
  "Pressure exposes who you really are.",
  "Build systems. Stop begging for motivation.",
  "One objective. One move. Execute.",
  "Talk less. Move cleaner.",
  "Win the hour. Stack the day.",
  "Speed with control.",
  "Discipline is the only real flex.",
  "If it’s not structured, it’s not real.",
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ---------- VOICE (Web Speech API) ---------- */
function speakWithBrowserVoice(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return { stop: () => {} };

    // Stop anything already speaking
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98; // slightly slower, more “operator”
    u.pitch = 0.85;
    u.volume = 1;

    // Pick a voice (best effort)
    const voices = synth.getVoices?.() || [];
    const preferred =
      voices.find((v) => /en-US/i.test(v.lang) && /male|daniel|alex|david|fred/i.test(v.name)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices[0];

    if (preferred) u.voice = preferred;

    synth.speak(u);

    return {
      stop: () => synth.cancel(),
      utterance: u,
    };
  } catch {
    return { stop: () => {} };
  }
}

/** ---------- MORPH TARGET DISCOVERY + DRIVER ---------- */
type MorphHandle = {
  meshes: THREE.Mesh[];
  dicts: Record<string, number>[];
  influences: number[][];
  hasMorphs: boolean;
  // best guess indices for mouth open / visemes
  idxMouthOpen: number[];
};

function findMorphTargets(root: THREE.Object3D): MorphHandle {
  const meshes: THREE.Mesh[] = [];
  const dicts: Record<string, number>[] = [];
  const influences: number[][] = [];
  const idxMouthOpen: number[] = [];

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;

    meshes.push(m);
    dicts.push(m.morphTargetDictionary);
    influences.push(m.morphTargetInfluences);

    // Try to find a “mouth open” style blendshape by name
    const keys = Object.keys(m.morphTargetDictionary);
    const pick =
      keys.find((k) => /mouthopen|jawopen|openmouth|aa|viseme_aa/i.test(k)) ??
      keys.find((k) => /viseme|mouth|jaw/i.test(k));

    if (pick) idxMouthOpen.push(m.morphTargetDictionary[pick]);
    else idxMouthOpen.push(-1);
  });

  return {
    meshes,
    dicts,
    influences,
    hasMorphs: meshes.length > 0,
    idxMouthOpen,
  };
}

function setMouthOpen(mh: MorphHandle, value01: number) {
  const v = clamp(value01, 0, 1);
  for (let i = 0; i < mh.meshes.length; i++) {
    const idx = mh.idxMouthOpen[i];
    if (idx >= 0 && mh.influences[i]) {
      mh.influences[i][idx] = v;
    }
  }
}

/** ---------- GHOST MODEL ---------- */
function GhostModel({
  talking,
  intensity,
  hoverBoost,
  clickBurst,
  bubbleText,
  bubbleVisible,
}: {
  talking: boolean;
  intensity: number; // 0..1
  hoverBoost: number; // 0..1
  clickBurst: number; // 0..1
  bubbleText: string;
  bubbleVisible: boolean;
}) {
  // Cache bust every minute to refresh local changes when you swap Ghost.glb
  const url = useMemo(() => `/Ghost.glb?v=${Math.floor(Date.now() / 60000)}`, []);
  const gltf = useGLTF(url);

  const group = useRef<THREE.Group>(null);
  const root = useRef<THREE.Object3D | null>(null);

  const mhRef = useRef<MorphHandle | null>(null);

  // Find morph targets once
  useEffect(() => {
    root.current = gltf.scene;

    // Improve shading a bit
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.55;
        mat.metalness = 0.05;
      }
    });

    mhRef.current = findMorphTargets(gltf.scene);
    // You can look in browser console if you want:
    // console.log("MORPH TARGETS:", mhRef.current);
  }, [gltf]);

  // Mouse interaction target
  const targetRotY = useRef(0);
  const targetRotX = useRef(0);

  useFrame((state) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();
    const alive = 1 + 0.015 * Math.sin(t * 1.2); // breathing
    const idleBob = 0.045 * Math.sin(t * 1.35);
    const idleSway = 0.10 * Math.sin(t * 0.55);

    // Talking motion
    const talkBob = (talking ? 0.08 * Math.sin(t * 7.5) * intensity : 0);
    const talkNod = (talking ? 0.16 * Math.sin(t * 9.0) * intensity : 0);
    const talkTwist = (talking ? 0.12 * Math.sin(t * 6.2) * intensity : 0);

    // Hover reaction (subtle)
    const hoverWobble = 0.10 * hoverBoost * Math.sin(t * 3.0);

    // Click burst (short, strong “I’m listening” move)
    const burst = clickBurst;

    // Position + rotation
    group.current.position.y = idleBob + talkBob;
    group.current.rotation.y =
      idleSway +
      talkTwist +
      hoverWobble +
      THREE.MathUtils.lerp(group.current.rotation.y, targetRotY.current, 0.05) +
      burst * 0.12;

    group.current.rotation.x =
      talkNod * 0.25 +
      THREE.MathUtils.lerp(group.current.rotation.x, targetRotX.current, 0.05) -
      burst * 0.06;

    // BIG SIZE (3x)
    const baseScale = 3.15; // <= increase/decrease here
    const pulse = talking
      ? 1 + 0.02 * Math.sin(t * 10.0) * intensity
      : 1 + 0.01 * Math.sin(t * 2.0);
    group.current.scale.setScalar(baseScale * alive * pulse * (1 + burst * 0.03));

    // Mouth animation: morph targets if available; otherwise implied movement
    const mh = mhRef.current;
    if (mh?.hasMorphs) {
      // “fake” viseme oscillator while talking
      const mouth = talking ? clamp(0.15 + 0.85 * Math.abs(Math.sin(t * 12.0)) * intensity, 0, 1) : 0;
      setMouthOpen(mh, mouth);
    }
  });

  // Pointer tracking for “alive” reactions
  const onPointerMove = (e: any) => {
    // e.uv is not always present; use movement in screen space
    if (!group.current) return;
    // Convert pointer to a small head turn target
    const px = (e.pointer?.x ?? 0) / window.innerWidth; // 0..1
    const py = (e.pointer?.y ?? 0) / window.innerHeight; // 0..1
    const nx = (px - 0.5) * 2;
    const ny = (py - 0.5) * 2;

    targetRotY.current = clamp(nx * 0.25, -0.35, 0.35);
    targetRotX.current = clamp(-ny * 0.12, -0.20, 0.20);
  };

  return (
    <group ref={group} onPointerMove={onPointerMove}>
      {/* Speech bubble attached in 3D space (near head) */}
      <Html
        position={[0, 1.65, 0.55]} // move bubble higher/lower relative to model
        center
        transform
        distanceFactor={1.25} // keep bubble proportional
        style={{
          pointerEvents: "none",
          opacity: bubbleVisible ? 1 : 0,
          transition: "opacity 320ms ease",
        }}
      >
        <div
          style={{
            width: 520,
            maxWidth: "70vw",
            borderRadius: 18,
            padding: "14px 16px",
            background: "rgba(10,10,16,0.78)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.92)",
            fontSize: 16,
            lineHeight: "24px",
          }}
        >
          {bubbleText}
          <span style={{ marginLeft: 8, opacity: 0.6 }}>▋</span>
        </div>
      </Html>

      <primitive object={gltf.scene} />
    </group>
  );
}

/** ---------- 3D STAGE ---------- */
function GhostStage(props: React.ComponentProps<typeof GhostModel>) {
  return (
    <Canvas
      camera={{ position: [0, 1.35, 3.25], fov: 35 }}
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(1200px 700px at 50% 15%, rgba(140,80,255,0.22), rgba(0,0,0,0))",
      }}
    >
      {/* Lights */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 2]} intensity={1.35} />
      <pointLight position={[-2, 2, 2]} intensity={0.75} />

      <Environment preset="city" />

      <Suspense fallback={null}>
        <GhostModel {...props} />
      </Suspense>

      {/* Ground shadow makes him feel “real” */}
      <ContactShadows
        position={[0, -0.95, 0]}
        opacity={0.55}
        scale={10}
        blur={2.4}
        far={6}
      />

      {/* Orbit (interactive) */}
      <OrbitControls
        enablePan={false}
        minDistance={2.1}
        maxDistance={4.6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

/** ---------- MAIN PAGE ---------- */
export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, speaker: "Ghost", text: "I’m online. Give me the objective. I’ll run the team.", time: nowTime() },
  ]);

  const [input, setInput] = useState("");

  // Talking/bubble system
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const [talking, setTalking] = useState(false);
  const [talkIntensity, setTalkIntensity] = useState(0);

  const [hoverBoost, setHoverBoost] = useState(0);
  const [clickBurst, setClickBurst] = useState(0);

  const typingRef = useRef(false);
  const voiceStopRef = useRef<null | (() => void)>(null);

  // Smooth hover/click state
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setHoverBoost((h) => clamp(h * 0.92, 0, 1));
      setClickBurst((b) => clamp(b * 0.86, 0, 1));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function typeAndSpeak(text: string) {
    if (typingRef.current) return;
    typingRef.current = true;

    // stop any current voice
    if (voiceStopRef.current) voiceStopRef.current();
    voiceStopRef.current = null;

    setTalking(true);
    setBubbleVisible(true);
    setBubbleText("");

    // ramp intensity up quickly
    setTalkIntensity(0.35);
    await wait(120);
    setTalkIntensity(0.85);

    // Start voice immediately (so it feels “alive”)
    const voice = speakWithBrowserVoice(text);
    if (voice?.stop) voiceStopRef.current = voice.stop;

    // Typewriter effect
    for (let i = 1; i <= text.length; i++) {
      setBubbleText(text.slice(0, i));
      await wait(14);
    }

    // Hold briefly
    await wait(650);

    // Fade out bubble while still “talking”
    setBubbleVisible(false);

    // Ramp down
    setTalkIntensity(0.25);
    await wait(220);
    setTalkIntensity(0);
    setTalking(false);

    // Clear after fade
    await wait(420);
    setBubbleText("");

    typingRef.current = false;
  }

  async function addGhost(text: string) {
    setMessages((prev) => [...prev, { id: Date.now(), speaker: "Ghost", text, time: nowTime() }]);
    await typeAndSpeak(text);
  }

  function addUser(text: string) {
    setMessages((prev) => [...prev, { id: Date.now(), speaker: "You", text, time: nowTime() }]);
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

    if (lower.includes("botox") || lower.includes("lead") || lower.includes("med spa")) {
      await addGhost("Objective locked. We sell booked consults first. Prove results. Then scale.");
      await addGhost("Next move: 10 DMs today. Offer 1–2 free booked consults to test quality.");
      return;
    }

    await addGhost("Say the objective in one line. City + offer + what you want done next.");
  }

  // Keep him ALIVE: drop a quote periodically (only if not currently speaking)
  useEffect(() => {
    const id = setInterval(() => {
      if (typingRef.current) return;
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      addGhost(q);
    }, 28000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heat = Math.round(clamp(45 + talkIntensity * 45 + hoverBoost * 10 + clickBurst * 20, 0, 100));

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
          maxWidth: 1480,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr 340px",
          gap: 16,
        }}
      >
        {/* LEFT */}
        <aside style={panelSticky}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={logoBox}>G</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ghost OS</div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>COO Agent Interface</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={navBtn(true)}>Command Chat</div>
            <div style={navBtn(false)}>Agent Team</div>
            <div style={navBtn(false)}>Execution</div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ opacity: 0.8, fontWeight: 800 }}>HEAT</div>
              <div style={{ opacity: 0.8 }}>{heat}/100</div>
            </div>

            <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${heat}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(140,80,255,0.95), rgba(255,80,140,0.88))",
                }}
              />
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75, lineHeight: "18px" }}>
              Tips:
              <br />• Your model loads from <code>/public/Ghost.glb</code>
              <br />• Type <b>quote</b> or <b>botox leads Austin</b>
              <br />• Hover = reaction, Click stage = “lock-in” burst
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <main style={{ display: "grid", gap: 14 }}>
          {/* HERO: 3D */}
          <section
            style={{
              position: "relative",
              height: 520, // bigger stage
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(10,10,14,0.55)",
              overflow: "hidden",
            }}
            onMouseEnter={() => setHoverBoost(1)}
            onMouseMove={() => setHoverBoost(1)}
            onMouseLeave={() => setHoverBoost(0)}
            onClick={() => setClickBurst(1)}
          >
            <div style={{ position: "absolute", left: 14, top: 12, zIndex: 5 }}>
              <div style={{ fontWeight: 950, fontSize: 22 }}>Ghost (COO)</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                Live: 3D + voice + typewriter + reactive motion
              </div>
            </div>

            <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 10, zIndex: 5 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addGhost(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
                }}
                style={pillBtn}
              >
                Random Quote
              </button>
            </div>

            <div style={{ position: "absolute", inset: 0 }}>
              <GhostStage
                talking={talking}
                intensity={talkIntensity}
                hoverBoost={hoverBoost}
                clickBurst={clickBurst}
                bubbleText={bubbleText}
                bubbleVisible={bubbleVisible}
              />
            </div>
          </section>

          {/* CHAT */}
          <section style={{ ...panel, padding: 14, height: 420, overflow: "auto" }}>
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
          </section>

          {/* INPUT */}
          <section style={{ ...panel, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Botox leads Austin" or "quote"'
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button onClick={onSend} style={sendBtn}>
              Send
            </button>
          </section>
        </main>

        {/* RIGHT */}
        <aside style={panelSticky}>
          <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 12 }}>Team</div>

          {[
            ["Lead Gen", "Find & qualify med spa targets"],
            ["Outreach", "DM/SMS/Email scripts + follow-ups"],
            ["Ops", "Task routing + checklists"],
            ["Research", "Offers, pricing, competitors"],
            ["Automation", "Connect tools + reduce manual work"],
          ].map(([title, desc]) => (
            <div key={title} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{title}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Idle</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{desc}</div>
            </div>
          ))}

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.78, lineHeight: "18px" }}>
            <b>File rule:</b> keep your model named exactly <code>Ghost.glb</code> in <code>/public</code>.
            <br />
            If you swap the GLB locally, refresh the page (this code cache-busts every minute).
          </div>
        </aside>
      </div>
    </div>
  );
}

/** ---------- styles ---------- */
const panel: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(10,10,14,0.70)",
};

const panelSticky: React.CSSProperties = {
  ...panel,
  padding: 16,
  height: "calc(100vh - 36px)",
  position: "sticky",
  top: 18,
};

const logoBox: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: "rgba(255,255,255,0.10)",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

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
  background: "linear-gradient(135deg, rgba(140,80,255,0.95), rgba(255,80,140,0.85))",
  color: "white",
  cursor: "pointer",
  fontWeight: 950,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: "12px 12px",
  color: "white",
  outline: "none",
};

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.22)",
  padding: 12,
  marginBottom: 10,
};

function navBtn(active: boolean): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.22)",
    color: active ? "#000" : "rgba(255,255,255,0.9)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

useGLTF.preload("/Ghost.glb");
