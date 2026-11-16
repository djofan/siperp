import styles from "./TopoPattern.module.css";

const width = 960;
const height = 640;
// A periodic mixture of curves keeps both position and slope continuous at tile edges.
// Different phases, spacing and amplitudes avoid evenly stacked sine waves.
const contours = [
  { base: 26, a: 33, b: 14, phase: .2 },
  { base: 92, a: 21, b: 20, phase: 1.4 },
  { base: 174, a: 46, b: 11, phase: 2.1 },
  { base: 228, a: 29, b: 22, phase: .7 },
  { base: 318, a: 48, b: 17, phase: 2.8 },
  { base: 381, a: 23, b: 13, phase: 4.1 },
  { base: 466, a: 39, b: 23, phase: 3.2 },
  { base: 548, a: 49, b: 14, phase: 5.3 },
  { base: 602, a: 26, b: 19, phase: 1.1 },
];
function contourPath(line: typeof contours[number], offset: number) {
  const value = (x: number) => {
    const t = x / width * Math.PI * 2;
    return line.base + offset + line.a * Math.sin(t + line.phase) + line.b * Math.sin(2 * t - line.phase * .7);
  };
  const slope = (x: number) => {
    const t = x / width * Math.PI * 2;
    return (Math.PI * 2 / width) * (line.a * Math.cos(t + line.phase) + 2 * line.b * Math.cos(2 * t - line.phase * .7));
  };
  const step = width / 32;
  let path = `M0 ${value(0)}`;
  for (let x = 0; x < width; x += step) {
    const end = x + step;
    path += ` C${x + step / 3} ${value(x) + slope(x) * step / 3} ${end - step / 3} ${value(end) - slope(end) * step / 3} ${end} ${value(end)}`;
  }
  return path;
}
export function TopoPattern({ className, id }: { className?: string; id: string }) {
  return <div aria-hidden="true" className={`${className ?? ""} ${styles.frame}`}>
    <svg className={styles.canvas}>
      <defs><pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse"><g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">{[-height, 0, height].flatMap(offset => contours.map((line, index) => <path key={`${offset}-${index}`} d={contourPath(line, offset)} opacity={index % 3 === 0 ? .9 : .65}/>))}</g></pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  </div>;
}
