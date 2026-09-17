import Link from "next/link";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { ActiveToggle } from "@/components/admin-shell/ActiveToggle";
import { getModuleBadgeColor } from "@/components/admin-shell/moduleColors";
import { EmptyState } from "@/components/ui/EmptyState";

interface ModuleOption {
  id: string;
  slug: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  isActive: boolean;
  moduleAccess: { id: string; module: ModuleOption }[];
}

export function AkunTable({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return <EmptyState>Belum ada akun.</EmptyState>;
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Nama</Th>
          <Th>Email</Th>
          <Th>Akses Modul</Th>
          <Th>Status</Th>
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        {users.map((user) => (
          <Tr key={user.id}>
            <Td className="font-medium">
              <Link href={`/admin/super/akun/${user.id}`} className="hover:text-accent">
                {user.name}
              </Link>
            </Td>
            <Td className="text-foreground/60">{user.email}</Td>
            <Td>
              {user.isSuperadmin ? (
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  Superadmin
                </span>
              ) : user.moduleAccess.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {user.moduleAccess.map((access) => {
                    const color = getModuleBadgeColor(access.module.slug);
                    return (
                      <span
                        key={access.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${color.bg} ${color.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                        {access.module.name}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="text-xs text-foreground/30">Belum ada akses</span>
              )}
            </Td>
            <Td>
              <ActiveToggle userId={user.id} initialActive={user.isActive} />
            </Td>
            <Td className="text-right">
              <Link
                href={`/admin/super/akun/${user.id}`}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Kelola
              </Link>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
