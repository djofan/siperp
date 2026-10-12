"use client";
import { useId, useState, type ComponentProps } from "react";

export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return <div className="relative min-w-0">
    <input {...props} id={id} type={visible ? "text" : "password"} className={`${props.className ?? ""} pr-12`} />
    <button type="button" disabled={props.disabled} aria-controls={id} aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-current opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path strokeLinecap="round" d="m3 3 18 18" />}</svg>
    </button>
  </div>;
}
