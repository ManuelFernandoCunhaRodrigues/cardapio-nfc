// O cadastro guarda telefone e WhatsApp com DDI, só em dígitos (ex.: 5585999990000).

export function buildPhoneHref(digits: string): string {
  return `tel:+${digits}`;
}

export function buildWhatsAppHref(digits: string): string {
  return `https://wa.me/${digits}`;
}

export function buildInstagramHref(user: string): string {
  return `https://instagram.com/${user}`;
}
