"use client";

import { AccountForm } from "./AccountForm";
import type { AccountModuleOption } from "./AksesForm";

export function AkunForm({ modules }: { modules: AccountModuleOption[] }) {
  return <AccountForm modules={modules} />;
}
