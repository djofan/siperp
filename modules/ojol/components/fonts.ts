import { Bricolage_Grotesque } from "next/font/google";

// Font display untuk wordmark & judul situs publik Ojol — tegas & energik, UI tetap Geist.
export const ojolDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-ojol-display",
});
