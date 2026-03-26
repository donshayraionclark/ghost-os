export const metadata = {
  title: "Ghost OS",
  description: "COO Agent Interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#07070a", color: "white" }}>
        {children}
      </body>
    </html>
  );
}
