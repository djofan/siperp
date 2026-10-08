import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";

const heading = Newsreader({ subsets: ["latin"], variable: "--font-tanwir-serif", display: "swap" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-tanwir-ui", display: "swap" });
export const tanwirSerif = { variable: `${heading.variable} ${body.variable}` };
