"use client";

import { AccountForm, type EditableAccount } from "./AccountForm";
import type { AccountModuleOption } from "./AksesForm";

export function EditAkunForm({ account, modules }: { account: EditableAccount; modules: AccountModuleOption[] }) {
  return <AccountForm account={account} modules={modules} />;
}
