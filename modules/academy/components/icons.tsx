import type { SVGProps } from "react";
const paths = {
  Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-6h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1 1-3Z",
  BookOpen: "M12 7c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V5c-3-1-7-1-10 2Zm0 0v15",
  GraduationCap: "m2 9 10-5 10 5-10 5-10-5Zm4 2v6c4 3 8 3 12 0v-6m4-2v8",
  Users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 3a4 4 0 0 1 0 8M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  Menu: "M4 6h16M4 12h16M4 18h16", X: "m6 6 12 12M6 18 18 6",
  PlayCircle: "M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0Zm-12-4 6 4-6 4V8Z",
  Dashboard: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  Progress: "M6 20v-6m6 6V4m6 16V10", Quiz: "M4 2h16v20H4V2Zm4 8 2 2 4-4",
  Trophy: "M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4m-4 2v6m-4 1h8",
};
export function AcademyIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
export const BookOpen = (props: SVGProps<SVGSVGElement>) => <AcademyIcon {...props} name="BookOpen" />;
export const GraduationCap = (props: SVGProps<SVGSVGElement>) => <AcademyIcon {...props} name="GraduationCap" />;
export const Users = (props: SVGProps<SVGSVGElement>) => <AcademyIcon {...props} name="Users" />;
export const Menu = (props: SVGProps<SVGSVGElement>) => <AcademyIcon {...props} name="Menu" />;
export const X = (props: SVGProps<SVGSVGElement>) => <AcademyIcon {...props} name="X" />;
