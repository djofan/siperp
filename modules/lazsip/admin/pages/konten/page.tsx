import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { SiteContentSectionForm } from "@/modules/lazsip/components/admin/SiteContentSectionForm";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";

export default async function KontenUmumPage() {
  const [hero, tentang, legalitas, kontak, zakatFitrah, transparansi] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("tentang"),
    getSiteContent("legalitas"),
    getSiteContent("kontak"),
    getSiteContent("zakatFitrah"),
    getSiteContent("transparansi"),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Konten Umum"
        description="Hero, tentang, dan legalitas yang tampil di halaman publik LAZSIP — editable tanpa deploy ulang. Field di bawah sudah terisi teks yang sekarang tampil di landing page."
      />
      <div className="flex flex-col gap-6">
        <SiteContentSectionForm
          sectionKey="hero"
          title="Hero (Beranda)"
          fields={[
            { key: "title", label: "Judul" },
            { key: "subtitle", label: "Subjudul", multiline: true },
          ]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.hero, ...(hero ?? {}) }}
        />
        <SiteContentSectionForm
          sectionKey="tentang"
          title="Tentang LAZSIP"
          fields={[
            { key: "body", label: "Isi", multiline: true },
            { key: "visi", label: "Visi", multiline: true },
            { key: "misi", label: "Misi (satu poin per baris)", multiline: true },
            { key: "totalVerifikator", label: "Jumlah Verifikator Lapangan Terlatih (angka saja)" },
            { key: "totalMitra", label: "Jumlah Mitra Kerja Sama (angka saja)" },
          ]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.tentang, ...(tentang ?? {}) }}
        />
        <SiteContentSectionForm
          sectionKey="legalitas"
          title="Legalitas"
          fields={[{ key: "body", label: "Isi (satu poin per baris)", multiline: true }]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.legalitas, ...(legalitas ?? {}) }}
        />
        <SiteContentSectionForm
          sectionKey="kontak"
          title="Kontak"
          fields={[
            { key: "address", label: "Alamat", multiline: true },
            { key: "phone", label: "Telepon / WhatsApp" },
            { key: "email", label: "Email" },
            { key: "instagram", label: "URL Instagram" },
            { key: "facebook", label: "URL Facebook" },
            { key: "youtube", label: "URL YouTube" },
          ]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.kontak, ...(kontak ?? {}) }}
        />
        <SiteContentSectionForm
          sectionKey="zakatFitrah"
          title="Zakat Fitrah"
          fields={[
            {
              key: "pricePerJiwa",
              label: "Nominal per Jiwa (Rp) — sesuaikan dengan harga makanan pokok setempat",
            },
          ]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.zakatFitrah, ...(zakatFitrah ?? {}) }}
        />
        <SiteContentSectionForm
          sectionKey="transparansi"
          title="Transparansi (Beranda)"
          fields={[
            { key: "totalDana", label: "Total Dana Terkumpul (Rp, angka saja)" },
            { key: "totalDonatur", label: "Jumlah Donatur & Muzakki (angka saja)" },
            { key: "totalPenerima", label: "Jumlah Penerima Manfaat Terbantu (angka saja)" },
          ]}
          initialValue={{ ...LAZSIP_SITE_CONTENT_DEFAULTS.transparansi, ...(transparansi ?? {}) }}
        />
      </div>
    </div>
  );
}
