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
      <div style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ margin: 0 }}>Ghost OS</h1>
        <p style={{ opacity: 0.8, marginTop: 12 }}>
          Deploy is live. Next step: wire the Ghost UI.
        </p>
      </div>
    </main>
  );
}
