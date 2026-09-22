"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

interface DestinationAccountRow {
  id: string;
  moduleSource: string;
  fundType: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

const MODULE_SOURCE_LABEL: Record<string, string> = { lazsip: "LAZSIP", sarsip: "SARSIP" };
const FUND_TYPE_LABEL: Record<string, string> = { infak: "Infak/Donasi", zakat: "Zakat", donasi: "Donasi" };

export function DestinationAccountTable({ accounts }: { accounts: DestinationAccountRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string, bankName: string) {
    if (!window.confirm(`Hapus rekening ${bankName}?`)) return;
    setDeletingId(id);
    setError(null);

    const response = await fetch(`/api/payment/destination-accounts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menghapus rekening.");
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    router.refresh();
  }

  if (accounts.length === 0) {
    return <EmptyState>Belum ada rekening tujuan terdaftar.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      <Table>
        <Thead>
          <Tr>
            <Th>Modul</Th>
            <Th>Jenis Dana</Th>
            <Th>Bank</Th>
            <Th>Nomor Rekening</Th>
            <Th>Atas Nama</Th>
            <Th className="text-right">Aksi</Th>
          </Tr>
        </Thead>
        <Tbody>
          {accounts.map((account) => (
            <Tr key={account.id}>
              <Td>{MODULE_SOURCE_LABEL[account.moduleSource] ?? account.moduleSource}</Td>
              <Td>{FUND_TYPE_LABEL[account.fundType] ?? account.fundType}</Td>
              <Td className="font-medium">{account.bankName}</Td>
              <Td className="font-mono">{account.accountNumber}</Td>
              <Td>{account.accountName}</Td>
              <Td className="text-right">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deletingId === account.id}
                  onClick={() => handleDelete(account.id, account.bankName)}
                >
                  {deletingId === account.id ? "..." : "Hapus"}
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
