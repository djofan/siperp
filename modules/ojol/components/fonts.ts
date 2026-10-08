import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";

const heading = Newsreader({ subsets: ["latin"], variable: "--font-ojol-display", display: "swap" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-ojol-ui", display: "swap" });
export const ojolDisplay = { variable: `${heading.variable} ${body.variable}` };
