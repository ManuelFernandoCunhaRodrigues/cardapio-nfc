// O cadastro guarda telefone e WhatsApp só em dígitos, mas não exige o DDI:
// "5585999990000" e "85999990000" são ambos válidos no painel.

const BRAZIL_WITH_COUNTRY_CODE = /^55\d{10,11}$/;
const BRAZIL_AREA_AND_NUMBER = /^\d{10,11}$/;

function withBrazilCountryCode(digits: string): string | null {
  if (BRAZIL_WITH_COUNTRY_CODE.test(digits)) return digits;
  if (BRAZIL_AREA_AND_NUMBER.test(digits)) return `55${digits}`;
  return null;
}

export function buildPhoneHref(digits: string): string {
  const international = withBrazilCountryCode(digits);
  // Sem formato brasileiro reconhecido, disca como foi cadastrado: um "+" errado quebraria a ligação.
  return international ? `tel:+${international}` : `tel:${digits}`;
}

export function buildWhatsAppHref(digits: string): string {
  return `https://wa.me/${withBrazilCountryCode(digits) ?? digits}`;
}

export function buildInstagramHref(user: string): string {
  return `https://instagram.com/${user}`;
}
