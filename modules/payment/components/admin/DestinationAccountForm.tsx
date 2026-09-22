"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";

const MODULE_SOURCE_OPTIONS = [
  { value: "lazsip", label: "LAZSIP" },
  { value: "sarsip", label: "SARSIP" },
];

const FUND_TYPE_OPTIONS = [
  { value: "infak", label: "Infak/Donasi" },
  { value: "zakat", label: "Zakat" },
  { value: "donasi", label: "Donasi" },
];

export function DestinationAccountForm() {
  const router = useRouter();
  const [moduleSource, setModuleSource] = useState("lazsip");
  const [fundType, setFundType] = useState("infak");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/payment/destination-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleSource, fundType, bankName, accountNumber, accountName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan rekening.");
      setIsSubmitting(false);
      return;
    }

    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={panelClasses("flex flex-col gap-4 p-6")}>
      <h2 className="text-sm font-semibold text-foreground">Tambah Rekening Tujuan</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Modul" htmlFor="destination-module">
          <Select id="destination-module" value={moduleSource} onChange={(e) => setModuleSource(e.target.value)}>
            {MODULE_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Jenis Dana" htmlFor="destination-fund-type">
          <Select id="destination-fund-type" value={fundType} onChange={(e) => setFundType(e.target.value)}>
            {FUND_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Nama Bank" htmlFor="destination-bank">
          <Input id="destination-bank" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="mis. BSI" />
        </FormField>

        <FormField label="Nomor Rekening" htmlFor="destination-number">
          <Input id="destination-number" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </FormField>

        <FormField label="Atas Nama" htmlFor="destination-name">
          <Input id="destination-name" required value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </FormField>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Rekening"}
        </Button>
      </div>
    </form>
  );
}
