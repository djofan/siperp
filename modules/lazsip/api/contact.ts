/** Convert the saved contact number to the international format required by wa.me. */
export function getWhatsAppNumber(phone?: string | null): string | undefined {
  let number = (phone ?? "").trim().replace(/[\s()+.-]/g, "");
  if (number.startsWith("00")) number = number.slice(2);
  if (number.startsWith("0")) number = `62${number.slice(1)}`;
  else if (number.startsWith("8")) number = `62${number}`;
  return /^[1-9]\d{7,14}$/.test(number) ? number : undefined;
}
