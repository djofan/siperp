import type { ComponentProps } from "react";
import { Table as ShadcnTable } from "./table";
export { TableHeader as Thead, TableBody as Tbody, TableRow as Tr, TableHead as Th, TableCell as Td } from "./table";
export function Table(props: ComponentProps<typeof ShadcnTable>) { return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><ShadcnTable {...props} /></div>; }
