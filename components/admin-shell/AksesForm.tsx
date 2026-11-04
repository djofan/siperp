"use client";

import { Check, Layers3 } from "lucide-react";
import styles from "./AccountForm.module.css";

export interface AccountModuleOption {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
}
export type AccountAccess = Record<string, { enabled: boolean; role: string }>;

export function initialAccountAccess(modules: AccountModuleOption[], entries: { moduleId: string; role: string }[] = []): AccountAccess {
  return Object.fromEntries(modules.map(module => {
    const granted = entries.find(entry => entry.moduleId === module.id);
    return [module.id, { enabled: Boolean(granted), role: "admin" }];
  }));
}
export function AksesForm({ modules, access, onChange, disabled }: {
  modules: AccountModuleOption[];
  access: AccountAccess;
  onChange: (access: AccountAccess) => void;
  disabled: boolean;
  editing?: boolean;
}) {
  return (
    <div className={styles.moduleGrid}>
      {modules.map(module => {
        const state = access[module.id];
        return (
          <div key={module.id} className={styles.moduleCard} data-selected={state.enabled}>
            <label className={styles.moduleChoice}>
              <input type="checkbox" name="moduleIds" value={module.id} checked={state.enabled} disabled={disabled}
                className={styles.moduleCheckbox}
                onChange={event => onChange({ ...access, [module.id]: { ...state, enabled: event.target.checked } })} />
              <span className={styles.moduleTop} aria-hidden="true">
                <span className={styles.moduleIcon}><Layers3 size={20} strokeWidth={1.6} /></span>
                <span className={styles.check}>{state.enabled && <Check size={14} strokeWidth={2.5} />}</span>
              </span>
              <span className={styles.moduleName}>{module.name}</span>
              <span className={styles.moduleHint}>{module.isActive === false ? "Modul sedang nonaktif" : state.enabled ? "Akses diaktifkan" : "Klik untuk memberi akses"}</span>
            </label>
            {state.enabled && <span className={styles.adminRole}>Admin modul</span>}
          </div>
        );
      })}
      {modules.length === 0 && <p className={styles.empty}>Belum ada modul terdaftar.</p>}
    </div>
  );
}
