/** An unselected optional file input must not replace the saved profile photo. */
export function prepareProfileForm(form: FormData): FormData {
  const result = new FormData();
  for (const [key, value] of form) {
    if (key === "photo" && (value === "" || (value instanceof Blob && value.size === 0))) continue;
    result.append(key, value);
  }
  return result;
}
