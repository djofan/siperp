import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { listModules } from "@/modules/core/modules";

export default async function ModulTerdaftarPage() {
  const modules = await listModules();

  return (
    <div>
      <PageHeader
        title="Modul Terdaftar"
        description="Modul baru ditambahkan lewat migrasi/seed saat modul tersebut mulai dikerjakan."
      />
      {modules.length === 0 ? (
        <EmptyState>Belum ada modul terdaftar.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nama</Th>
              <Th>Slug</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {modules.map((module) => (
              <Tr key={module.id}>
                <Td className="font-medium">{module.name}</Td>
                <Td className="text-foreground/60">{module.slug}</Td>
                <Td>
                  <span
                    className={
                      module.isActive
                        ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
                        : "rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger"
                    }
                  >
                    {module.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
