import "./globals.css";

export const metadata = {
  title: "School Tracking & Monitoring",
  description:
    "Vercel-ready tracking and monitoring dashboard for BGE learner progress, professional dialogue and timely intervention.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
