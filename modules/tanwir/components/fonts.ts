import { Instrument_Serif } from "next/font/google";

// Serif display hanya untuk wordmark & judul situs publik (prd-tanwir §4) — UI tetap Geist.
export const tanwirSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-tanwir-serif",
});
