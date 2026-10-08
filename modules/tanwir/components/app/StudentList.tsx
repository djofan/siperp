import Link from "next/link";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { Icon } from "@/modules/tanwir/components/icons";
import { Empty, formatDate } from "@/modules/tanwir/components/ui";
import { ConfirmDelete } from "./ConfirmDelete";

export interface StudentRow {
  id: string;
  name: string;
  age: number | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  progress: string | null;
  updatedAt: Date;
  member: { user: { name: string }; code: string; group: { name: string } | null };
}

export function StudentList({
  students,
  basePath,
  showOwner,
  onDelete,
}: {
  students: StudentRow[];
  basePath: string;
  showOwner: boolean;
  onDelete: (id: string) => Promise<ActionState>;
}) {
  if (!students.length) {
    return <Empty title="Belum ada anak didik.">Catat santri yang Anda ajar beserta progres hafalannya agar perkembangan mudah dipantau.</Empty>;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {students.map((student) => (
        <li key={student.id} className="flex flex-col rounded-2xl bg-tanwir-surface p-5 ring-1 ring-tanwir-line">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{student.name}</p>
              <p className="mt-0.5 text-sm text-tanwir-muted">
                {[student.age ? `${student.age} tahun` : null, student.className].filter(Boolean).join(" · ") || "Data belum lengkap"}
              </p>
            </div>
            <Link href={`${basePath}/${student.id}`} aria-label={`Ubah ${student.name}`} className="rounded-full p-2 text-tanwir-muted hover:bg-tanwir-paper hover:text-tanwir-ink">
              <Icon name="edit" className="h-4 w-4" />
            </Link>
          </div>
          {student.progress && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed">{student.progress}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-tanwir-muted">Orang tua / wali</dt>
              <dd className="mt-0.5 font-medium">{student.parentName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-tanwir-muted">No. HP</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{student.parentPhone ?? "—"}</dd>
            </div>
            {showOwner && (
              <div className="col-span-2">
                <dt className="text-tanwir-muted">Guru ngaji</dt>
                <dd className="mt-0.5 font-medium">
                  {student.member.user.name}
                  {student.member.group ? ` · ${student.member.group.name}` : ""}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-tanwir-muted">Diperbarui {formatDate(student.updatedAt)}</span>
            <ConfirmDelete action={onDelete.bind(null, student.id)} confirmText={`Hapus ${student.name}?`} />
          </div>
        </li>
      ))}
    </ul>
  );
}
