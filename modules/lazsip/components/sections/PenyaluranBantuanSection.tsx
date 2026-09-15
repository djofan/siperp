import { listBeneficiariesPublic } from "@/modules/lazsip/api/beneficiaries";
import { PenyaluranBantuanClient } from "@/modules/lazsip/components/sections/PenyaluranBantuanClient";

export async function PenyaluranBantuanSection() {
  const items = await listBeneficiariesPublic();
  return <PenyaluranBantuanClient items={items} />;
}
