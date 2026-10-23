// Optional file inputs can arrive as an empty File when no replacement is chosen.
export function prepareMaterialForm(form: FormData): FormData {
  const result = new FormData();
  for (const [key, value] of form) {
    if (key === "file" && (value === "" || (value instanceof Blob && value.size === 0))) continue;
    result.append(key, value);
  }
  return result;
}
