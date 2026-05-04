// lib/whatsapp.ts
export function buildWALink(phone: string, message: string): string {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}
export function openWhatsApp(phone: string, message: string) {
  window.location.href = buildWALink(phone, message);
}
