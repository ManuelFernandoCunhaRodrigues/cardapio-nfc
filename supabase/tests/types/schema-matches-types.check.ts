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

// DIAGNÓSTICO TEMPORÁRIO: mostra no log do CI qual propriedade difere.
type VT = Versioned['public']['Tables'];
type Keys = keyof VT | keyof ExpectedTables;
export type DiagRow = { [K in Keys]: Equal<VT[K & keyof VT]['Row'], ExpectedTables[K & keyof ExpectedTables]['Row']> };
export type DiagInsert = { [K in Keys]: Equal<VT[K & keyof VT]['Insert'], ExpectedTables[K & keyof ExpectedTables]['Insert']> };
export type DiagUpdate = { [K in Keys]: Equal<VT[K & keyof VT]['Update'], ExpectedTables[K & keyof ExpectedTables]['Update']> };
export type DiagRel = { [K in Keys]: Equal<VT[K & keyof VT]['Relationships'], ExpectedTables[K & keyof ExpectedTables]['Relationships']> };
export const diagRow: { [K in Keys]: true } = null as unknown as DiagRow;
export const diagInsert: { [K in Keys]: true } = null as unknown as DiagInsert;
export const diagUpdate: { [K in Keys]: true } = null as unknown as DiagUpdate;
export const diagRel: { [K in Keys]: true } = null as unknown as DiagRel;
export const diagVtoE: ExpectedTables = null as unknown as VT;
export const diagEtoV: VT = null as unknown as ExpectedTables;
