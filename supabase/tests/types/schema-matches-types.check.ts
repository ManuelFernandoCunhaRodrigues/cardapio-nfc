// Conferido só no CI (`npm run test:types-db`), depois que a CLI do Supabase gera
// `packages/core/src/database/database.types.local.ts` a partir do banco criado pelas migrations.
// Se uma migration criar, renomear ou remover tabela, coluna ou função e o arquivo versionado
// não acompanhar, este arquivo deixa de compilar.
import type { Database as Versioned } from '../../../packages/core/src/database/database.types';
import type { Database as FromMigrations } from '../../../packages/core/src/database/database.types.local';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type SchemaMatchesTypes = Expect<
  Equal<Versioned['public']['Tables'], FromMigrations['public']['Tables']>
>;
export type FunctionSignaturesMatch = Expect<
  Equal<Versioned['public']['Functions'], FromMigrations['public']['Functions']>
>;
