import { apiRequest } from "@/lib/api";
import { currency } from "../../api/queries";
export async function FinanceSummary({filters}:{filters:{from?:string;to?:string;outlet?:string}}) {
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(filters)) if(value)query.set(key,value);
  const data=await apiRequest<{from:string;to:string;total:number;revenue:number;capital:number;profit:number}>(`teknisi/service-finance?${query}`);
  return <section className="tech-box"><h2>Pembayaran & keuntungan</h2><form className="tech-dash-filters">{filters.outlet&&<input type="hidden" name="outlet" value={filters.outlet}/>}<label>Dari<input type="date" name="from" defaultValue={data.from}/></label><label>Sampai<input type="date" name="to" defaultValue={data.to}/></label><button className="tech-btn secondary">Tampilkan</button></form><div className="tech-dash-finance"><article className="primary"><span>Omzet diterima</span><strong>{currency(data.revenue)}</strong><small>{data.total} servis Finish pada periode ini</small></article><article><span>Modal servis Finish</span><strong>{currency(data.capital)}</strong><small>Modal yang dicatat saat penyelesaian</small></article><article><span>Keuntungan kotor</span><strong>{currency(data.profit)}</strong><small>Omzet dikurangi modal, belum termasuk beban operasional</small></article></div><p className="tech-dash-footnote">Hanya pembayaran saat pengambilan yang dihitung. Tiket lama tanpa data pembayaran tidak dianggap lunas. Klaim garansi Rp0 tidak menambah omzet.</p></section>;
}
