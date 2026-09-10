import "./globals.css";

export const metadata = {
  title: "SSO",
  description: "Central login for personal apps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
