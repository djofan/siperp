import { panelClasses } from "@/components/ui/panel";

// Bar chart satu seri (jumlah penyaluran per tahun). Server component — tooltip cukup
// lewat CSS hover/focus, tidak perlu state client.
export function SipPenyaluranYearChart({ data }: { data: { year: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const showEveryYear = data.length <= 12;

  return (
    <div className={panelClasses("flex min-w-0 flex-col p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Penyaluran bantuan per tahun</h2>
        <span className="text-xs text-white/45">
          {total} penyaluran{data.length > 0 && ` · ${data[0].year}–${data[data.length - 1].year}`}
        </span>
      </div>

      {data.length === 0 ? (
        <p className="mt-6 text-sm text-white/45">Belum ada data penyaluran bantuan.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Jumlah penyaluran per tahun: ${data.map((d) => `${d.year} ${d.count}`).join(", ")}`}
            className="mt-6 flex h-44 items-end gap-0.5"
          >
            {data.map((d) => (
              <div
                key={d.year}
                tabIndex={0}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none"
              >
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-black/85 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block">
                  {d.year}: <strong>{d.count}</strong> penyaluran
                </span>
                {d.count > 0 && <span className="mb-1 text-xs font-semibold text-white/80">{d.count}</span>}
                <div
                  className="w-full max-w-10 rounded-t-[4px] bg-sip-lime transition-opacity group-hover:opacity-80"
                  style={{ height: d.count ? `${(d.count / max) * 80}%` : 0 }}
                />
                {d.count === 0 && <div className="h-1 w-full max-w-10 rounded-full bg-white/10" />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-0.5">
            {data.map((d, i) => (
              <span key={d.year} className="min-w-0 flex-1 text-center text-[11px] text-white/45">
                {showEveryYear || i % 2 === 0 || i === data.length - 1 ? `'${String(d.year).slice(2)}` : ""}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>Jumlah penyaluran bantuan per tahun</caption>
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.year}>
                  <td>{d.year}</td>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
