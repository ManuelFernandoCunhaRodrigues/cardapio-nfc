// Conferido só no CI (`npm run test:types-db`), depois que a CLI do Supabase gera
// `packages/core/src/database/database.types.local.ts` a partir do banco criado pelas migrations.
// Compara tabelas (Row, Insert, Update, Relationships) e funções (Args, Returns) inteiras: se uma
// migration mudar coluna, tipo, nulidade ou função e o arquivo versionado não acompanhar, este
// arquivo deixa de compilar.
import type { Database as Versioned } from '../../../packages/core/src/database/database.types';
import type { Database as FromMigrations } from '../../../packages/core/src/database/database.types.local';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

/** Achata interseções em um tipo objeto só, para o `Equal` comparar pelo formato. */
type Simplify<T> = { [Key in keyof T]: T[Key] };

type MigrationTables = FromMigrations['public']['Tables'];
type MigrationProducts = MigrationTables['products'];

// Única diferença de propósito: o gatilho `private.assign_product_slug` gera o slug a partir do
// nome quando o INSERT não traz um, então no código o campo é opcional na criação.
type ExpectedTables = Simplify<
  Omit<MigrationTables, 'products'> & {
    products: Simplify<
      Omit<MigrationProducts, 'Insert'> & {
        Insert: Simplify<Omit<MigrationProducts['Insert'], 'slug'> & { slug?: string }>;
      }
    >;
  }
>;

export type SchemaMatchesTypes = Expect<Equal<Versioned['public']['Tables'], ExpectedTables>>;
export type FunctionSignaturesMatch = Expect<
  Equal<Versioned['public']['Functions'], FromMigrations['public']['Functions']>
>;
