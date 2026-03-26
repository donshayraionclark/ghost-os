export const metadata = {
  title: "Ghost OS",
  description: "Ghost OS — Interactive COO Agent UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0b0f", color: "#fff" }}>
        {children}
      </body>
    </html>
  );
}
