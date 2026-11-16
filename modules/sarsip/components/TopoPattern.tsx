const lines = Array.from({ length: 9 }, (_, index) => {
  const y = index * 32;
  return `M0 ${y} C60 ${y - 25} 95 ${y + 25} 160 ${y} S260 ${y - 25} 320 ${y}`;
});
export function TopoPattern({ className, id }: { className?: string; id: string }) {
  return <svg aria-hidden="true" className={className}>
    <defs><pattern id={id} width="320" height="288" patternUnits="userSpaceOnUse"><g fill="none" stroke="currentColor" strokeWidth="1">{lines.map((path, index) => <path key={index} d={path}/>)}</g></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`}/>
  </svg>;
}
