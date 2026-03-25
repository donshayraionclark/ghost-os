export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          padding: 32,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr 360px",
            gap: 24,
          }}
        >
          <aside
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 28 }}>Ghost OS</h1>
            <p style={{ color: "#a1a1aa", marginTop: 8 }}>Execution command center</p>

            <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
              <div style={navStyle}>Dashboard</div>
              <div style={navStyle}>Tasks</div>
              <div style={navStyle}>Locations</div>
              <div style={navStyle}>Finance</div>
              <div style={navStyle}>Operations</div>
              <div style={navStyle}>Settings</div>
            </div>
          </aside>

          <section
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <p style={{ color: "#71717a", textTransform: "uppercase", fontSize: 12, letterSpacing: 1.5 }}>
              Active Objective
            </p>
            <h2 style={{ marginTop: 8, fontSize: 32 }}>Secure Location #1</h2>

            <div
              style={{
                marginTop: 24,
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <p style={{ color: "#fca5a5", fontWeight: 700, marginTop: 0 }}>Force Move</p>
              <p style={{ marginBottom: 0 }}>
                Call 5 Burnet/N Lamar listings and book 2 walkthroughs today.
              </p>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3>Active Tasks</h3>

              <div style={taskCardStyle}>
                <div>
                  <strong>Secure Location #1</strong>
                  <p style={subText}>Research · Burnet Rd</p>
                </div>
                <span style={badgeRed}>Critical</span>
              </div>

              <div style={taskCardStyle}>
                <div>
                  <strong>Optimize Drive-Thru Layout</strong>
                  <p style={subText}>Build · Prime Pour Unit 1</p>
                </div>
                <span style={badgeAmber}>High</span>
              </div>

              <div style={taskCardStyle}>
                <div>
                  <strong>Startup Cost Model</strong>
                  <p style={subText}>Finance · Austin</p>
                </div>
                <span style={badgeBlue}>High</span>
              </div>
            </div>
          </section>

          <aside
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Ghost Output</h3>

            <div style={panelBlock}>
              <p style={labelStyle}>Problem</p>
              <p style={textStyle}>No signed location means no launch timeline and no realistic cost model.</p>
            </div>

            <div style={panelBlock}>
              <p style={labelStyle}>Decision</p>
              <p style={textStyle}>Prioritize existing second-generation drive-thru spaces over raw retail.</p>
            </div>

            <div style={panelBlock}>
              <p style={labelStyle}>Force Move</p>
              <p style={textStyle}>Drive Burnet tomorrow morning and contact 5 property leads before noon.</p>
            </div>

            <div style={panelBlock}>
              <p style={labelStyle}>Next Action</p>
              <p style={textStyle}>Log every viable address and rank by visibility, access, and conversion cost.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const navStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#18181b",
  border: "1px solid #27272a",
  color: "white",
};

const taskCardStyle = {
  marginTop: 12,
  padding: 16,
  borderRadius: 18,
  background: "#18181b",
  border: "1px solid #27272a",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const subText = {
  color: "#a1a1aa",
  margin: "6px 0 0 0",
  fontSize: 14,
};

const badgeRed = {
  background: "rgba(239,68,68,.15)",
  color: "#fca5a5",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(239,68,68,.25)",
};

const badgeAmber = {
  background: "rgba(245,158,11,.15)",
  color: "#fcd34d",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(245,158,11,.25)",
};

const badgeBlue = {
  background: "rgba(59,130,246,.15)",
  color: "#93c5fd",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(59,130,246,.25)",
};

const panelBlock = {
  marginTop: 14,
  padding: 16,
  borderRadius: 18,
  background: "#18181b",
  border: "1px solid #27272a",
};

const labelStyle = {
  margin: 0,
  color: "#71717a",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: 1.2,
};

const textStyle = {
  marginBottom: 0,
  lineHeight: 1.5,
};
