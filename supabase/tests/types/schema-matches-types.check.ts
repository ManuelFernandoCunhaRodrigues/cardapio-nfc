// Conferido só no CI (`npm run test:types-db`), depois que a CLI do Supabase gera
// `apps/web/lib/supabase/database.types.local.ts` a partir do banco criado pelas migrations.
// Se uma migration criar, renomear ou remover tabela, coluna ou função e o arquivo versionado
// não acompanhar, este arquivo deixa de compilar.
import type { Database as Versioned } from '../../../apps/web/lib/supabase/database.types';
import type { Database as FromMigrations } from '../../../apps/web/lib/supabase/database.types.local';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type PublicSchema = { Tables: Record<string, { Row: object }>; Functions: object };

type Shape<Schema extends PublicSchema> = {
  columns: { [Table in keyof Schema['Tables']]: keyof Schema['Tables'][Table]['Row'] };
  functions: keyof Schema['Functions'];
};

export type SchemaMatchesTypes = Expect<
  Equal<Shape<Versioned['public']>, Shape<FromMigrations['public']>>
>;
