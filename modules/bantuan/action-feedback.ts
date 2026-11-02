export type ActionErrors = Record<string, string[]>;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function nativeActionErrors(form: HTMLFormElement): ActionErrors {
  const errors: ActionErrors = {};
  for (const item of Array.from(form.elements)) {
    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(item.tagName)) continue;
    const control = item as Control;
    if (!control.willValidate || control.validity.valid) continue;
    const key = control.getAttribute('data-validation-key') || control.name || control.id || 'form';
    const validity = control.validity;
    const message = validity.valueMissing ? 'Kolom ini wajib diisi.'
      : validity.tooShort ? `Isi minimal ${(control as HTMLInputElement).minLength} karakter.`
      : validity.rangeUnderflow ? `Nilai minimal ${(control as HTMLInputElement).min}.`
      : validity.rangeOverflow ? `Nilai maksimal ${(control as HTMLInputElement).max}.`
      : validity.badInput || validity.typeMismatch ? 'Periksa format isian ini.'
      : control.validationMessage || 'Periksa kembali isian ini.';
    errors[key] = [message];
  }
  return errors;
}

export function actionControl(form: HTMLFormElement, key: string): HTMLElement | undefined {
  const field = key.replace(/^survey\./, 'survey-').replace(/^applicant\./, 'correction-');
  const controls = Array.from(form.elements).filter(element => {
    const control = element as HTMLInputElement;
    return !control.disabled && control.type !== 'hidden' && (['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName) || control.getAttribute('role') === 'radio');
  }) as Control[];
  return controls.find(control => control.getAttribute('data-validation-key') === key)
    ?? controls.find(control => control.name === key || control.name === field || control.name === key.replace(/^handover\./, '') || control.id === key || control.id === field || control.id === field + '-0');
}

export function focusActionProblem(form: HTMLFormElement, errors: ActionErrors, summary: HTMLElement | null): void {
  const target = Object.keys(errors).map(key => actionControl(form, key)).find(Boolean) ?? summary;
  if (target) revealActionTarget(target, 'center');
}

export function revealActionTarget(target: HTMLElement, block: ScrollLogicalPosition = 'start'): void {
  const reduced = target.ownerDocument?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block, behavior: reduced ? 'instant' : 'smooth' });
  target.focus({ preventScroll: true });
}
