"use client";

import { useState, type ComponentProps } from "react";

export function PasswordField(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
      <input {...props} type={visible ? "text" : "password"} />
    </div>
    <button
      type="button"
      disabled={props.disabled}
      aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={visible}
      onClick={() => setVisible(previous => !previous)}
      className="mt-2 shrink-0 rounded-lg border border-lazsip-primary-200 px-3 py-3 text-xs font-semibold text-lazsip-primary-700 hover:bg-lazsip-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lazsip-primary-700 disabled:opacity-50"
    >
      {visible ? "Sembunyikan" : "Tampilkan"}
    </button>
  </div>;
}
