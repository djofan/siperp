import { listBeneficiariesPublic } from "@/modules/lazsip/beneficiaries";
import { PenyaluranBantuanClient } from "@/components/lazsip/sections/PenyaluranBantuanClient";

export async function PenyaluranBantuanSection() {
  const items = await listBeneficiariesPublic();
  return <PenyaluranBantuanClient items={items} />;
}
