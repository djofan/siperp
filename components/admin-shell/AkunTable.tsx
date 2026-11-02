import Link from "next/link";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { ActiveToggle } from "@/components/admin-shell/ActiveToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import styles from "./AccountForm.module.css";

interface ModuleOption {
  id: string;
  slug: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  code: string;
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
          <Th>Kode login</Th>
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
            <Td className="font-mono text-accent">{user.code}</Td>
            <Td>
              {user.isSuperadmin ? (
                <span className={`${styles.pill} ${styles.superPill}`}>
                  <ShieldCheck size={14} /> Semua modul
                </span>
              ) : user.moduleAccess.length > 0 ? (
                <span className={styles.pills}>
                  {user.moduleAccess.map((access) => {
                    return (
                      <span
                        key={access.id}
                        className={styles.pill}
                      >
                        <span className={styles.pillDot} aria-hidden="true" />
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
              <ActiveToggle endpoint={`/api/super/akun/${user.id}/status`} initialActive={user.isActive} />
            </Td>
            <Td className="text-right">
              <Link
                href={`/admin/super/akun/${user.id}`}
                className={styles.manage}
              >
                Kelola <ArrowUpRight size={14} />
              </Link>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
