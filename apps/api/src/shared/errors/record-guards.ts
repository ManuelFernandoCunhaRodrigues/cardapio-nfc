import { ConflictError, NotFoundError } from './domain-errors';
import { UniqueViolationError } from './persistence-errors';

const slugInUseMessage = 'Esse endereço curto já está em uso. Escolha outro.';
const slugInUseField = 'Esse endereço curto já está em uso.';

/**
 * Os repositórios devolvem `null` ou `false` quando o registro não existe; aqui isso vira 404 e,
 * quando há valor, ele volta com o tipo já estreitado.
 */
export function requireFound<T>(value: T | null | false, notFoundMessage: string): T {
  if (value === null || value === false) throw new NotFoundError(notFoundMessage);
  return value;
}

/** Traduz o endereço curto repetido, recusado pelo banco, em 409 com erro no campo `slug`. */
export async function withUniqueSlug<T>(save: () => Promise<T>): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (error instanceof UniqueViolationError) {
      throw new ConflictError(slugInUseMessage, { slug: [slugInUseField] });
    }
    throw error;
  }
}
