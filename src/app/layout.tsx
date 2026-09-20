import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { getLang } from "@/lib/current-user";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "tidy",
  description: "Our weekly chore checklist",
};

export const viewport: Viewport = {
  themeColor: "#0B0B08",
  // the on-screen keyboard shrinks the page instead of pushing it up
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={await getLang()} className={bricolage.variable}>
      <body>{children}</body>
    </html>
  );
}
