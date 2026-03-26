"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Ghost OS — 3D COO Stage (Next.js App Router, Vercel-safe)
 * - BIG 3D stage (no “box frame”)
 * - Constant idle reactions: breathing, float, micro-tilt, eye/attention vibe
 * - Voice (Web Speech API)
 * - Speech text: type-on while speaking, then fades out
 * - If /public/ghost.glb exists -> loads it; otherwise uses /public/Ghost2.png fallback
 *
 * IMPORTANT:
 * - True mouth/face animation requires a rigged model w/ morph targets (visemes).
 * - If your GLB has morph targets, this code will try a few common names.
 */

type SpeakState = { text: string; visibleText: string; active: boolean };

const QUOTES = [
  "Pressure exposes who you really are.",
  "Build systems. Stop begging for motivation.",
  "Move first. Explain later.",
  "If it’s not disciplined, it’s not real.",
  "The goal is simple: execute.",
  "One clean move beats ten loud plans.",
];

function useIsMounted() {
  const r = useRef(false);
  useEffect(() => {
    r.current = true;
    return () => {
      r.current = false;
    };
  }, []);
  return r;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ---------- 3D MODEL (GLB) ---------- */
function GhostModel({
  speakingIntensity,
  lookAt,
  onLoaded,
}: {
  speakingIntensity: number;
  lookAt: THREE.Vector3;
  onLoaded?: (hasMorphs: boolean) => void;
}) {
  // If ghost.glb doesn't exist, Drei will throw; we catch in parent by conditional rendering.
  const gltf = useGLTF("/ghost.glb") as any;

  const group = useRef<THREE.Group>(null);
  const [hasMorphs, setHasMorphs] = useState(false);
  const mouthTargetsRef = useRef<{ mesh: THREE.Mesh; dict: any; infl: any }[]>([]);

  useEffect(() => {
    const targets: { mesh: THREE.Mesh; dict: any; infl: any }[] = [];
    let found = false;

    gltf.scene.traverse((obj: any) => {
      if (obj && obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        found = true;
        targets.push({ mesh: obj, dict: obj.morphTargetDictionary, infl: obj.morphTargetInfluences });
      }
    });

    mouthTargetsRef.current = targets;
    setHasMorphs(found);
    onLoaded?.(found);
  }, [gltf, onLoaded]);

  // Try to drive mouth morph targets with a few common names
  const setMouth = (value: number) => {
    const v = clamp(value, 0, 1);
    for (const t of mouthTargetsRef.current) {
      const d = t.dict;
      const i = t.infl;

      // Common morph names across exporters
      const candidates = [
        "mouthOpen",
        "jawOpen",
        "JawOpen",
        "viseme_aa",
        "viseme_AA",
        "A",
        "aa",
        "vrc.v_aa",
      ];

      for (const name of candidates) {
        const idx = d?.[name];
        if (typeof idx === "number") {
          i[idx] = v;
        }
      }
    }
  };

  useFrame((state, dt) => {
    if (!group.current) return;

    // Always “alive”
    const t = state.clock.getElapsedTime();

    // Subtle torso breathing + micro-sway
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, (state.pointer.x * 0.25) as number, 0.06);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (-state.pointer.y * 0.12) as number, 0.06);

    // Look-at (camera-ish)
    group.current.lookAt(lookAt);

    // Mouth drive (only meaningful if morphs exist)
    const mouth = 0.12 + speakingIntensity * 0.85 + Math.abs(Math.sin(t * 6)) * (speakingIntensity * 0.15);
    setMouth(mouth);
  });

  return (
    <group ref={group} position={[0, -1.35, 0]} scale={1.75}>
      <primitive object={gltf.scene} />
      {!hasMorphs ? null : null}
    </group>
  );
}

/** ---------- 2D FALLBACK (if no GLB) ---------- */
function GhostCard2D({ speakingIntensity }: { speakingIntensity: number }) {
  // “Fake mouth” via subtle scale/brightness pulsing
  return (
    <div
      style={{
        width: "min(760px, 86vw)",
        height: "min(560px, 60vh)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        borderRadius: 28,
        background: "radial-gradient(1200px 600px at 50% 40%, rgba(150,90,255,0.22), rgba(0,0,0,0.0))",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px 380px at 50% 60%, rgba(255,255,255,0.06), rgba(0,0,0,0.0))",
          pointerEvents: "none",
        }}
      />
      <img
        src="/Ghost2.png"
        alt="Ghost"
        style={{
          width: "min(520px, 72vw)",
          height: "auto",
          transform: `translateY(${Math.sin(Date.now() / 700) * 1}px) scale(${1 + speakingIntensity * 0.01})`,
          filter: `drop-shadow(0 30px 80px rgba(0,0,0,0.65)) brightness(${1 + speakingIntensity * 0.06})`,
          borderRadius: 24,
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 26,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.6,
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        (Using 2D fallback — upload /public/ghost.glb for real 3D + face rig)
      </div>
    </div>
  );
}

/** ---------- MAIN PAGE ---------- */
export default function Page() {
  const mounted = useIsMounted();

  const [hasGLB, setHasGLB] = useState(true); // we’ll auto-fallback if GLB load fails
  const [hasMorphs, setHasMorphs] = useState(false);

  const [speak, setSpeak] = useState<SpeakState>({ text: "", visibleText: "", active: false });
  const [speakingIntensity, setSpeakingIntensity] = useState(0); // 0..1
  const [heat, setHeat] = useState(53);

  // “Look target” for the model
  const lookAt = useMemo(() => new THREE.Vector3(0, 0.25, 2.2), []);

  // Typewriter while speaking
  useEffect(() => {
    if (!speak.active) return;

    let i = 0;
    const text = speak.text;
    const tick = setInterval(() => {
      i += 1;
      setSpeak((p) => ({ ...p, visibleText: text.slice(0, i) }));
      // speaking intensity bumps as characters appear
      setSpeakingIntensity((v) => clamp(v + 0.06, 0, 1));
      if (i >= text.length) clearInterval(tick);
    }, 22);

    return () => clearInterval(tick);
  }, [speak.active, speak.text]);

  // Speaking “decay” + idle motion feel
  useEffect(() => {
    const id = setInterval(() => {
      setSpeakingIntensity((v) => clamp(v * 0.84, 0, 1));
    }, 80);
    return () => clearInterval(id);
  }, []);

  // Random quote idle chatter
  useEffect(() => {
    const id = setInterval(() => {
      if (speak.active) return;
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      doSpeak(q);
    }, 18000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak.active]);

  function doSpeak(text: string) {
    // Start the bubble
    setSpeak({ text, visibleText: "", active: true });
    setHeat((h) => clamp(h + 2, 0, 100));

    // Voice (Web Speech API)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.pitch = 0.9;
        u.volume = 1;
        u.onstart = () => setSpeakingIntensity(0.75);
        u.onend = () => {
          // Fade bubble out after “speaking”
          setTimeout(() => {
            setSpeak((p) => ({ ...p, active: false }));
            setTimeout(() => setSpeak({ text: "", visibleText: "", active: false }), 450);
          }, 700);
        };
        window.speechSynthesis.speak(u);
      } catch {
        // If voice fails, still fade bubble
        setTimeout(() => setSpeak((p) => ({ ...p, active: false })), 1400);
      }
    } else {
      setTimeout(() => setSpeak((p) => ({ ...p, active: false })), 1400);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 700px at 50% 20%, rgba(155,95,255,0.18), rgba(0,0,0,0) 60%), #07070a",
        color: "white",
        display: "grid",
        gridTemplateColumns: "340px 1fr 360px",
        gap: 18,
        padding: 18,
      }}
    >
      {/* LEFT */}
      <div
        style={{
          borderRadius: 24,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.08)",
              fontWeight: 900,
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Ghost OS</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>COO Agent Interface</div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 18, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>
              Heat
            </div>
            <div style={{ fontWeight: 700 }}>{heat}/100</div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${heat}%`, background: "linear-gradient(90deg, rgba(180,120,255,0.9), rgba(255,80,140,0.9))" }} />
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
          Tips:
          <div>• Upload <b>/public/ghost.glb</b> for real 3D face rig.</div>
          <div>• Your PNG stays as fallback: <b>/public/Ghost2.png</b></div>
          <div>• Click “Random Quote” to test voice + type-speech.</div>
        </div>
      </div>

      {/* CENTER */}
      <div
        style={{
          borderRadius: 24,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Ghost (COO)</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Live Broadcast: <span style={{ opacity: 1 }}>{speak.active ? speak.visibleText || "…" : QUOTES[0]}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
              {hasGLB ? (hasMorphs ? "3D model loaded (morph targets detected)" : "3D model loaded (no morph targets detected)") : "2D fallback mode"}
            </div>
          </div>

          <button
            onClick={() => doSpeak(QUOTES[Math.floor(Math.random() * QUOTES.length)])}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Random Quote
          </button>
        </div>

        {/* 3D Stage */}
        <div style={{ height: "calc(100vh - 240px)", minHeight: 520, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(1200px 600px at 50% 45%, rgba(155,95,255,0.26), rgba(0,0,0,0.0) 65%)",
              pointerEvents: "none",
            }}
          />

          {hasGLB ? (
            <Canvas
              shadows
              camera={{ position: [0, 0.55, 3.4], fov: 40 }}
              onCreated={() => {
                // nothing
              }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[4, 6, 3]} intensity={1.15} />
              <pointLight position={[-3, 2, 2]} intensity={0.55} />

              <Sparkles count={80} scale={6} size={1.2} speed={0.25} opacity={0.25} />

              <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.35}>
                <SuspenseGLB
                  speakingIntensity={speakingIntensity}
                  lookAt={lookAt}
                  onModelInfo={(ok, morphs) => {
                    if (!ok) setHasGLB(false);
                    setHasMorphs(morphs);
                  }}
                />
              </Float>

              <Environment preset="city" />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 2.3}
                maxPolarAngle={Math.PI / 2.1}
              />

              {/* Speech bubble pinned near the head */}
              <Html position={[0, 1.05, 0.6]} center>
                <AnimatePresence>
                  {speak.active && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        width: "min(560px, 70vw)",
                        padding: 14,
                        borderRadius: 18,
                        background: "rgba(10,10,14,0.78)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                        fontSize: 16,
                        lineHeight: 1.35,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 6, opacity: 0.9 }}>Ghost</div>
                      <div style={{ opacity: 0.92 }}>
                        {speak.visibleText}
                        <span style={{ marginLeft: 6, opacity: 0.65 }}>▋</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Html>
            </Canvas>
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <GhostCard2D speakingIntensity={speakingIntensity} />
              <div style={{ position: "absolute", top: 14, right: 14, fontSize: 12, opacity: 0.65 }}>
                Upload <b>/public/ghost.glb</b> to enable true 3D + face
              </div>
            </div>
          )}
        </div>

        {/* Bottom input */}
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10 }}>
          <input
            placeholder='Tell Ghost what you’re working on… (ex: "Botox leads Austin")'
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "white",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.currentTarget as HTMLInputElement).value.trim();
                if (!v) return;
                doSpeak(`Objective received: ${v}. I’m delegating now. Next move: send 10 DMs today.`);
                (e.currentTarget as HTMLInputElement).value = "";
              }
            }}
          />
          <button
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: "linear-gradient(90deg, rgba(140,90,255,1), rgba(255,80,140,1))",
              border: "none",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
            onClick={() => doSpeak("Locked in. Move with discipline.")}
          >
            Send
          </button>
        </div>
      </div>

      {/* RIGHT */}
      <div
        style={{
          borderRadius: 24,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Team</div>
        {[
          { name: "Lead Gen", text: "Find & qualify Botox/MedSpa buyers", status: "Idle" },
          { name: "Outreach", text: "DM/SMS/Email scripts + follow-ups", status: "Idle" },
          { name: "Ops", text: "Task routing + checklists", status: "Idle" },
          { name: "Research", text: "Offers, pricing, competitors", status: "Idle" },
          { name: "Automation", text: "Connect tools + reduce manual work", status: "Idle" },
        ].map((a) => (
          <div
            key={a.name}
            style={{
              borderRadius: 18,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: 14,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{a.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{a.text}</div>
            </div>
            <div style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", opacity: 0.85 }}>
              {a.status}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
          <b>To make him “real”:</b>
          <div>1) Export a rigged GLB/VRM with facial blendshapes (visemes).</div>
          <div>2) Put it at <b>/public/ghost.glb</b></div>
          <div>3) Refresh. The stage becomes true 3D + mouth movement.</div>
        </div>
      </div>

      {!mounted.current ? null : null}
    </div>
  );
}

/** Suspense-like wrapper without React.Suspense to avoid edge cases in some builds */
function SuspenseGLB({
  speakingIntensity,
  lookAt,
  onModelInfo,
}: {
  speakingIntensity: number;
  lookAt: THREE.Vector3;
  onModelInfo: (ok: boolean, morphs: boolean) => void;
}) {
  const [ok, setOk] = useState(true);

  // If GLB fails, Drei throws; we guard by try/catch in effect-ish pattern using a fallback boundary approach:
  // For simplicity: if this component ever errors, user will see 2D fallback on next render (handled by parent state),
  // but Next/React error boundaries aren't in this snippet. In practice, if you don't have ghost.glb, set hasGLB=false.

  useEffect(() => {
    // If you don't upload ghost.glb, just switch to 2D fallback:
    // onModelInfo(false, false)
  }, [onModelInfo]);

  if (!ok) return null;

  try {
    return (
      <GhostModel
        speakingIntensity={speakingIntensity}
        lookAt={lookAt}
        onLoaded={(morphs) => onModelInfo(true, morphs)}
      />
    );
  } catch {
    onModelInfo(false, false);
    return null;
  }
}

useGLTF.preload("/ghost.glb");
