import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { ProgramForm } from "@/modules/lazsip/components/admin/ProgramForm";
import { getProgramById } from "@/modules/lazsip/api/programs";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramById(id);

  if (!program) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/program">Semua Program</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Edit Program</h2>
      <ProgramForm
        programId={program.id}
        initialValues={{
          title: program.title,
          description: program.description,
          requirements: program.requirements ?? "",
          image: program.image ?? "",
          category: program.category,
          type: program.type,
          formUrl: program.formUrl ?? "",
          isPinned: program.isPinned,
        }}
      />
    </div>
  );
}
