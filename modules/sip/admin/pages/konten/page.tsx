import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { SipSiteContentSectionForm } from "@/modules/sip/components/admin/SipSiteContentSectionForm";
import { getSiteContent } from "@/modules/sip/api/siteContent";

export default async function SipKontenUmumPage() {
  const [hero, berita, program, penyaluranBantuan, tentang, jangkauanBantuan, kontak] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("berita"),
    getSiteContent("program"),
    getSiteContent("penyaluranBantuan"),
    getSiteContent("tentang"),
    getSiteContent("jangkauanBantuan"),
    getSiteContent("kontak"),
  ]);

  return (
    <div>
      <SipAdminPageHeader
        title="Konten Umum"
        description="Semua teks judul & deskripsi section yang tampil di landing page SIP."
      />
      <div className="flex flex-col gap-6">
        <SipSiteContentSectionForm
          sectionKey="hero"
          title="Hero (Beranda)"
          fields={[
            { key: "title", label: "Judul" },
            { key: "subtitle", label: "Subjudul", multiline: true },
            { key: "whatsappUrl", label: "Link WhatsApp Pengajuan Bantuan (wa.me/...)" },
            { key: "infaqUrl", label: "Link Infaq Sekarang (campaign LAZSIP)" },
          ]}
          initialValue={hero ?? {}}
        />
        <SipSiteContentSectionForm
          sectionKey="berita"
          title="Section Berita"
          fields={[
            { key: "eyebrow", label: "Label Kecil (eyebrow)" },
            { key: "title", label: "Judul Section" },
            { key: "description", label: "Deskripsi", multiline: true },
          ]}
          initialValue={berita ?? {}}
        />
        <SipSiteContentSectionForm
          sectionKey="program"
          title="Section Program"
          fields={[
            { key: "eyebrow", label: "Label Kecil (eyebrow)" },
            { key: "title", label: "Judul Section" },
            { key: "description", label: "Deskripsi", multiline: true },
          ]}
          initialValue={program ?? {}}
        />
        <SipSiteContentSectionForm
          sectionKey="penyaluranBantuan"
          title="Section Penyaluran Bantuan"
          fields={[
            { key: "eyebrow", label: "Label Kecil (eyebrow)" },
            { key: "title", label: "Judul Section" },
            { key: "description", label: "Deskripsi", multiline: true },
          ]}
          initialValue={penyaluranBantuan ?? {}}
        />
        <SipSiteContentSectionForm
          sectionKey="tentang"
          title="Tentang SIP"
          fields={[
            { key: "body", label: "Sejarah", multiline: true },
            { key: "visi", label: "Visi", multiline: true },
            { key: "misi", label: "Misi (satu poin per baris)", multiline: true },
            { key: "legalitas", label: "Legalitas (akta, izin LAZ, dll — satu poin per baris)", multiline: true },
          ]}
          initialValue={tentang ?? {}}
        />
        <SipSiteContentSectionForm
          sectionKey="jangkauanBantuan"
          title="Jangkauan Bantuan"
          fields={[
            { key: "verifikatorCount", label: "Jumlah Verifikator" },
            { key: "kotaCount", label: "Jumlah Kota/Kabupaten" },
            { key: "provinsiCount", label: "Jumlah Provinsi" },
            { key: "kotaList", label: "Daftar Kota (satu per baris)", multiline: true },
          ]}
          initialValue={jangkauanBantuan ?? {}}
        />
        <SipSiteContentSectionForm
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
          initialValue={kontak ?? {}}
        />
      </div>
    </div>
  );
}
