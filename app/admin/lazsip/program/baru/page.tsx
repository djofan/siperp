import { BackLink } from "@/components/lazsip/ui/BackLink";
import { ProgramForm } from "@/components/lazsip/admin/ProgramForm";

export default function TambahProgramPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/program">Semua Program</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Tambah Program</h2>
      <ProgramForm />
    </div>
  );
}
