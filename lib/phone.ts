export function normalizeIndonesianPhone(input: string) {
  const phone = String(input ?? "")
    .trim()
    .replace(/[^0-9+]/g, "")
    .replace(/^\+/, "")
    .replace(/^620/, "62")
    .replace(/^0+/, "0");

  if (!phone) {
    return "";
  }

  if (phone.startsWith("62")) {
    return phone;
  }

  if (phone.startsWith("0")) {
    return `62${phone.slice(1)}`;
  }

  if (phone.startsWith("8")) {
    return `62${phone}`;
  }

  return phone;
}
