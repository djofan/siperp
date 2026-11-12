import { Card, CardContent } from "../ui/card";

export function InstructorProfile() {
  return <section aria-labelledby="academy-instructor-heading">
    <h2 id="academy-instructor-heading" className="mb-4 text-base font-semibold text-slate-900">Profil pemateri</h2>
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-semibold text-emerald-800">IM</div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-7 text-slate-900">Ustadz Irham Maulana, Lc., M.H.</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Pendakwah, pengajar, dan penuntut ilmu agama Islam asal Indonesia.</p>
          </div>
        </div>
        <div className="grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Latar belakang pendidikan</h4>
            <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
              <li>Belajar ilmu syar&apos;i di Pondok Pesantren Al-Qudwah Al-Islamiyah, Kediri, bersama para ustadz, termasuk Ustadz Aunur Rofiq Gufron.</li>
              <li>Lulus dari Fakultas Syariah LIPIA Jakarta pada tahun 2015.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Aktivitas dan pengajaran</h4>
            <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
              <li>Berperan dalam pengajaran dan kurikulum di Ma&apos;had Tahfizh Al-Qur&apos;an Al-Imam Asy-Syathiby, Bogor.</li>
              <li>Aktif mengisi kajian fikih muamalah, akidah, dan kajian tematik di berbagai daerah, termasuk Jabodetabek.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>;
}
