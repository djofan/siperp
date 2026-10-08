import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { listModules } from "@/modules/core/modules";
import { ActiveToggle } from "@/components/admin-shell/ActiveToggle";

export default async function ModulTerdaftarPage() {
  const modules = await listModules();

  return (
    <div>
      <PageHeader
        title="Modul Terdaftar"
        description="Modul baru ditambahkan lewat migrasi/seed. Modul nonaktif tidak tampil di sidebar dan halaman publiknya 404, tapi tetap bisa dibuka superadmin untuk pengujian."
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
                  <ActiveToggle
                    endpoint={`/api/super/modul/${module.id}/status`}
                    initialActive={module.isActive}
                    subject="modul"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
