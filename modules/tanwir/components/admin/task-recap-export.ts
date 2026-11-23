import type { RecapMeta, RecapTask, TaskRecapDetail, TaskRecapIndex } from "../../api/task-recaps";

export type ExportTask = { task: RecapTask; participants: TaskRecapDetail["participants"] };
export type RecapExport = { startedAt: string; tasks: ExportTask[] };
type Load = <T>(path: string) => Promise<T>;
const base = "/api/tanwir/admin/task-recaps";

async function allPages<T>(load: (page: number) => Promise<{items:T[]; meta:RecapMeta}>, key: (item:T) => string) {
  const rows:T[] = []; const ids = new Set<string>();
  let expected:number | undefined, last = 1;
  for (let page = 1; page <= last; page++) {
    const result = await load(page);
    if (result.meta.current_page !== page || !Number.isSafeInteger(result.meta.last_page) || result.meta.last_page < page || !Number.isSafeInteger(result.meta.total) || result.meta.total < 0) throw new Error("Data halaman laporan tidak valid. Silakan ulangi unduhan.");
    if (expected !== undefined && (expected !== result.meta.total || last !== result.meta.last_page)) throw new Error("Data berubah saat diunduh. Silakan ulangi agar laporan lengkap.");
    expected = result.meta.total; last = result.meta.last_page;
    for (const row of result.items) {
      if (ids.has(key(row))) throw new Error("Data berubah saat diunduh. Silakan ulangi agar laporan lengkap.");
      ids.add(key(row)); rows.push(row);
    }
  }
  if (rows.length !== expected) throw new Error("Data belum lengkap. Silakan ulangi unduhan.");
  return rows;
}

export async function collectTaskRecapExport(load:Load, progress:(text:string)=>void = ()=>{}):Promise<RecapExport> {
  const startedAt = new Date().toISOString();
  progress("Mengambil seluruh daftar tugas…");
  const tasks = await allPages(async page => {
    const result = await load<TaskRecapIndex>(`${base}?per_page=50&page=${page}`);
    return {items:result.tasks, meta:result.meta};
  }, task => task.id);
  const result:ExportTask[] = [];
  for (const [index, task] of tasks.entries()) {
    progress(`Mengambil progres tugas ${index + 1} dari ${tasks.length}…`);
    const participants = await allPages(async page => {
      const detail = await load<TaskRecapDetail>(`${base}/${encodeURIComponent(task.id)}?per_page=50&page=${page}`);
      return {items:detail.participants, meta:detail.meta};
    }, member => member.id);
    result.push({task, participants});
  }
  return {startedAt, tasks:result};
}
