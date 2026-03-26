export const metadata = {
  title: "Ghost OS",
  description: "Ghost OS — COO Command Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#07070a" }}>{children}</body>
    </html>
  );
}
