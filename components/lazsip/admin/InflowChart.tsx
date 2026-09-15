const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatShortDate = (isoDate: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(isoDate));

export function InflowChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const totalPeriod = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs text-lazsip-primary-800/50">Total {data.length} hari terakhir</p>
        <p className="text-sm font-bold text-lazsip-primary-900">{formatRupiah(totalPeriod)}</p>
      </div>
      <div className="flex h-32 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.date} className="group relative flex-1">
            <div
              className="w-full rounded-t-sm bg-lazsip-primary-200 transition-colors group-hover:bg-lazsip-primary-700"
              style={{ height: `${Math.max(2, Math.round((d.total / max) * 100))}%` }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-lazsip-primary-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {formatShortDate(d.date)} · {formatRupiah(d.total)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-lazsip-primary-800/40">
        <span>{formatShortDate(data[0]?.date ?? "")}</span>
        <span>{formatShortDate(data[data.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}
