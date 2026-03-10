
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model ahs_data
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type ahs_data = $Result.DefaultSelection<Prisma.$ahs_dataPayload>
/**
 * Model lilies
 * This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type lilies = $Result.DefaultSelection<Prisma.$liliesPayload>
/**
 * Model lists
 * This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type lists = $Result.DefaultSelection<Prisma.$listsPayload>
/**
 * Model stripe_customers
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type stripe_customers = $Result.DefaultSelection<Prisma.$stripe_customersPayload>
/**
 * Model stripe_subscriptions
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type stripe_subscriptions = $Result.DefaultSelection<Prisma.$stripe_subscriptionsPayload>
/**
 * Model user_authentications
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type user_authentications = $Result.DefaultSelection<Prisma.$user_authenticationsPayload>
/**
 * Model user_emails
 * This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type user_emails = $Result.DefaultSelection<Prisma.$user_emailsPayload>
/**
 * Model users
 * This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
 * This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
 * This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
 */
export type users = $Result.DefaultSelection<Prisma.$usersPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Ahs_data
 * const ahs_data = await prisma.ahs_data.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Ahs_data
   * const ahs_data = await prisma.ahs_data.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.ahs_data`: Exposes CRUD operations for the **ahs_data** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Ahs_data
    * const ahs_data = await prisma.ahs_data.findMany()
    * ```
    */
  get ahs_data(): Prisma.ahs_dataDelegate<ExtArgs>;

  /**
   * `prisma.lilies`: Exposes CRUD operations for the **lilies** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Lilies
    * const lilies = await prisma.lilies.findMany()
    * ```
    */
  get lilies(): Prisma.liliesDelegate<ExtArgs>;

  /**
   * `prisma.lists`: Exposes CRUD operations for the **lists** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Lists
    * const lists = await prisma.lists.findMany()
    * ```
    */
  get lists(): Prisma.listsDelegate<ExtArgs>;

  /**
   * `prisma.stripe_customers`: Exposes CRUD operations for the **stripe_customers** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Stripe_customers
    * const stripe_customers = await prisma.stripe_customers.findMany()
    * ```
    */
  get stripe_customers(): Prisma.stripe_customersDelegate<ExtArgs>;

  /**
   * `prisma.stripe_subscriptions`: Exposes CRUD operations for the **stripe_subscriptions** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Stripe_subscriptions
    * const stripe_subscriptions = await prisma.stripe_subscriptions.findMany()
    * ```
    */
  get stripe_subscriptions(): Prisma.stripe_subscriptionsDelegate<ExtArgs>;

  /**
   * `prisma.user_authentications`: Exposes CRUD operations for the **user_authentications** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more User_authentications
    * const user_authentications = await prisma.user_authentications.findMany()
    * ```
    */
  get user_authentications(): Prisma.user_authenticationsDelegate<ExtArgs>;

  /**
   * `prisma.user_emails`: Exposes CRUD operations for the **user_emails** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more User_emails
    * const user_emails = await prisma.user_emails.findMany()
    * ```
    */
  get user_emails(): Prisma.user_emailsDelegate<ExtArgs>;

  /**
   * `prisma.users`: Exposes CRUD operations for the **users** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.users.findMany()
    * ```
    */
  get users(): Prisma.usersDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.20.0
   * Query Engine version: 06fc58a368dc7be9fbbbe894adf8d445d208c284
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    ahs_data: 'ahs_data',
    lilies: 'lilies',
    lists: 'lists',
    stripe_customers: 'stripe_customers',
    stripe_subscriptions: 'stripe_subscriptions',
    user_authentications: 'user_authentications',
    user_emails: 'user_emails',
    users: 'users'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "ahs_data" | "lilies" | "lists" | "stripe_customers" | "stripe_subscriptions" | "user_authentications" | "user_emails" | "users"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      ahs_data: {
        payload: Prisma.$ahs_dataPayload<ExtArgs>
        fields: Prisma.ahs_dataFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ahs_dataFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ahs_dataFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          findFirst: {
            args: Prisma.ahs_dataFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ahs_dataFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          findMany: {
            args: Prisma.ahs_dataFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>[]
          }
          create: {
            args: Prisma.ahs_dataCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          createMany: {
            args: Prisma.ahs_dataCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ahs_dataCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>[]
          }
          delete: {
            args: Prisma.ahs_dataDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          update: {
            args: Prisma.ahs_dataUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          deleteMany: {
            args: Prisma.ahs_dataDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ahs_dataUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ahs_dataUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ahs_dataPayload>
          }
          aggregate: {
            args: Prisma.Ahs_dataAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAhs_data>
          }
          groupBy: {
            args: Prisma.ahs_dataGroupByArgs<ExtArgs>
            result: $Utils.Optional<Ahs_dataGroupByOutputType>[]
          }
          count: {
            args: Prisma.ahs_dataCountArgs<ExtArgs>
            result: $Utils.Optional<Ahs_dataCountAggregateOutputType> | number
          }
        }
      }
      lilies: {
        payload: Prisma.$liliesPayload<ExtArgs>
        fields: Prisma.liliesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.liliesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.liliesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          findFirst: {
            args: Prisma.liliesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.liliesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          findMany: {
            args: Prisma.liliesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>[]
          }
          create: {
            args: Prisma.liliesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          createMany: {
            args: Prisma.liliesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.liliesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>[]
          }
          delete: {
            args: Prisma.liliesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          update: {
            args: Prisma.liliesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          deleteMany: {
            args: Prisma.liliesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.liliesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.liliesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$liliesPayload>
          }
          aggregate: {
            args: Prisma.LiliesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLilies>
          }
          groupBy: {
            args: Prisma.liliesGroupByArgs<ExtArgs>
            result: $Utils.Optional<LiliesGroupByOutputType>[]
          }
          count: {
            args: Prisma.liliesCountArgs<ExtArgs>
            result: $Utils.Optional<LiliesCountAggregateOutputType> | number
          }
        }
      }
      lists: {
        payload: Prisma.$listsPayload<ExtArgs>
        fields: Prisma.listsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.listsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.listsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          findFirst: {
            args: Prisma.listsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.listsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          findMany: {
            args: Prisma.listsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>[]
          }
          create: {
            args: Prisma.listsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          createMany: {
            args: Prisma.listsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.listsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>[]
          }
          delete: {
            args: Prisma.listsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          update: {
            args: Prisma.listsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          deleteMany: {
            args: Prisma.listsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.listsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.listsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$listsPayload>
          }
          aggregate: {
            args: Prisma.ListsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLists>
          }
          groupBy: {
            args: Prisma.listsGroupByArgs<ExtArgs>
            result: $Utils.Optional<ListsGroupByOutputType>[]
          }
          count: {
            args: Prisma.listsCountArgs<ExtArgs>
            result: $Utils.Optional<ListsCountAggregateOutputType> | number
          }
        }
      }
      stripe_customers: {
        payload: Prisma.$stripe_customersPayload<ExtArgs>
        fields: Prisma.stripe_customersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.stripe_customersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.stripe_customersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          findFirst: {
            args: Prisma.stripe_customersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.stripe_customersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          findMany: {
            args: Prisma.stripe_customersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>[]
          }
          create: {
            args: Prisma.stripe_customersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          createMany: {
            args: Prisma.stripe_customersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.stripe_customersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>[]
          }
          delete: {
            args: Prisma.stripe_customersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          update: {
            args: Prisma.stripe_customersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          deleteMany: {
            args: Prisma.stripe_customersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.stripe_customersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.stripe_customersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_customersPayload>
          }
          aggregate: {
            args: Prisma.Stripe_customersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStripe_customers>
          }
          groupBy: {
            args: Prisma.stripe_customersGroupByArgs<ExtArgs>
            result: $Utils.Optional<Stripe_customersGroupByOutputType>[]
          }
          count: {
            args: Prisma.stripe_customersCountArgs<ExtArgs>
            result: $Utils.Optional<Stripe_customersCountAggregateOutputType> | number
          }
        }
      }
      stripe_subscriptions: {
        payload: Prisma.$stripe_subscriptionsPayload<ExtArgs>
        fields: Prisma.stripe_subscriptionsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.stripe_subscriptionsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.stripe_subscriptionsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          findFirst: {
            args: Prisma.stripe_subscriptionsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.stripe_subscriptionsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          findMany: {
            args: Prisma.stripe_subscriptionsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>[]
          }
          create: {
            args: Prisma.stripe_subscriptionsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          createMany: {
            args: Prisma.stripe_subscriptionsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.stripe_subscriptionsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>[]
          }
          delete: {
            args: Prisma.stripe_subscriptionsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          update: {
            args: Prisma.stripe_subscriptionsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          deleteMany: {
            args: Prisma.stripe_subscriptionsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.stripe_subscriptionsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.stripe_subscriptionsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$stripe_subscriptionsPayload>
          }
          aggregate: {
            args: Prisma.Stripe_subscriptionsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStripe_subscriptions>
          }
          groupBy: {
            args: Prisma.stripe_subscriptionsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Stripe_subscriptionsGroupByOutputType>[]
          }
          count: {
            args: Prisma.stripe_subscriptionsCountArgs<ExtArgs>
            result: $Utils.Optional<Stripe_subscriptionsCountAggregateOutputType> | number
          }
        }
      }
      user_authentications: {
        payload: Prisma.$user_authenticationsPayload<ExtArgs>
        fields: Prisma.user_authenticationsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.user_authenticationsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.user_authenticationsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          findFirst: {
            args: Prisma.user_authenticationsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.user_authenticationsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          findMany: {
            args: Prisma.user_authenticationsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>[]
          }
          create: {
            args: Prisma.user_authenticationsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          createMany: {
            args: Prisma.user_authenticationsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.user_authenticationsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>[]
          }
          delete: {
            args: Prisma.user_authenticationsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          update: {
            args: Prisma.user_authenticationsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          deleteMany: {
            args: Prisma.user_authenticationsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.user_authenticationsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.user_authenticationsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_authenticationsPayload>
          }
          aggregate: {
            args: Prisma.User_authenticationsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser_authentications>
          }
          groupBy: {
            args: Prisma.user_authenticationsGroupByArgs<ExtArgs>
            result: $Utils.Optional<User_authenticationsGroupByOutputType>[]
          }
          count: {
            args: Prisma.user_authenticationsCountArgs<ExtArgs>
            result: $Utils.Optional<User_authenticationsCountAggregateOutputType> | number
          }
        }
      }
      user_emails: {
        payload: Prisma.$user_emailsPayload<ExtArgs>
        fields: Prisma.user_emailsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.user_emailsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.user_emailsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          findFirst: {
            args: Prisma.user_emailsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.user_emailsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          findMany: {
            args: Prisma.user_emailsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>[]
          }
          create: {
            args: Prisma.user_emailsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          createMany: {
            args: Prisma.user_emailsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.user_emailsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>[]
          }
          delete: {
            args: Prisma.user_emailsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          update: {
            args: Prisma.user_emailsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          deleteMany: {
            args: Prisma.user_emailsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.user_emailsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.user_emailsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$user_emailsPayload>
          }
          aggregate: {
            args: Prisma.User_emailsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser_emails>
          }
          groupBy: {
            args: Prisma.user_emailsGroupByArgs<ExtArgs>
            result: $Utils.Optional<User_emailsGroupByOutputType>[]
          }
          count: {
            args: Prisma.user_emailsCountArgs<ExtArgs>
            result: $Utils.Optional<User_emailsCountAggregateOutputType> | number
          }
        }
      }
      users: {
        payload: Prisma.$usersPayload<ExtArgs>
        fields: Prisma.usersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.usersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.usersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findFirst: {
            args: Prisma.usersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.usersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findMany: {
            args: Prisma.usersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          create: {
            args: Prisma.usersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          createMany: {
            args: Prisma.usersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.usersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          delete: {
            args: Prisma.usersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          update: {
            args: Prisma.usersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          deleteMany: {
            args: Prisma.usersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.usersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.usersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          aggregate: {
            args: Prisma.UsersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsers>
          }
          groupBy: {
            args: Prisma.usersGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsersGroupByOutputType>[]
          }
          count: {
            args: Prisma.usersCountArgs<ExtArgs>
            result: $Utils.Optional<UsersCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type Ahs_dataCountOutputType
   */

  export type Ahs_dataCountOutputType = {
    lilies: number
  }

  export type Ahs_dataCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | Ahs_dataCountOutputTypeCountLiliesArgs
  }

  // Custom InputTypes
  /**
   * Ahs_dataCountOutputType without action
   */
  export type Ahs_dataCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ahs_dataCountOutputType
     */
    select?: Ahs_dataCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Ahs_dataCountOutputType without action
   */
  export type Ahs_dataCountOutputTypeCountLiliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: liliesWhereInput
  }


  /**
   * Count Type ListsCountOutputType
   */

  export type ListsCountOutputType = {
    lilies: number
  }

  export type ListsCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | ListsCountOutputTypeCountLiliesArgs
  }

  // Custom InputTypes
  /**
   * ListsCountOutputType without action
   */
  export type ListsCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListsCountOutputType
     */
    select?: ListsCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ListsCountOutputType without action
   */
  export type ListsCountOutputTypeCountLiliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: liliesWhereInput
  }


  /**
   * Count Type UsersCountOutputType
   */

  export type UsersCountOutputType = {
    lilies: number
    lists: number
    user_authentications: number
    user_emails: number
  }

  export type UsersCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | UsersCountOutputTypeCountLiliesArgs
    lists?: boolean | UsersCountOutputTypeCountListsArgs
    user_authentications?: boolean | UsersCountOutputTypeCountUser_authenticationsArgs
    user_emails?: boolean | UsersCountOutputTypeCountUser_emailsArgs
  }

  // Custom InputTypes
  /**
   * UsersCountOutputType without action
   */
  export type UsersCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsersCountOutputType
     */
    select?: UsersCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UsersCountOutputType without action
   */
  export type UsersCountOutputTypeCountLiliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: liliesWhereInput
  }

  /**
   * UsersCountOutputType without action
   */
  export type UsersCountOutputTypeCountListsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: listsWhereInput
  }

  /**
   * UsersCountOutputType without action
   */
  export type UsersCountOutputTypeCountUser_authenticationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: user_authenticationsWhereInput
  }

  /**
   * UsersCountOutputType without action
   */
  export type UsersCountOutputTypeCountUser_emailsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: user_emailsWhereInput
  }


  /**
   * Models
   */

  /**
   * Model ahs_data
   */

  export type AggregateAhs_data = {
    _count: Ahs_dataCountAggregateOutputType | null
    _avg: Ahs_dataAvgAggregateOutputType | null
    _sum: Ahs_dataSumAggregateOutputType | null
    _min: Ahs_dataMinAggregateOutputType | null
    _max: Ahs_dataMaxAggregateOutputType | null
  }

  export type Ahs_dataAvgAggregateOutputType = {
    id: number | null
    ahs_id: number | null
  }

  export type Ahs_dataSumAggregateOutputType = {
    id: number | null
    ahs_id: number | null
  }

  export type Ahs_dataMinAggregateOutputType = {
    id: number | null
    ahs_id: number | null
    name: string | null
    hybridizer: string | null
    year: string | null
    scape_height: string | null
    bloom_size: string | null
    bloom_season: string | null
    ploidy: string | null
    foliage_type: string | null
    bloom_habit: string | null
    seedling_num: string | null
    color: string | null
    form: string | null
    parentage: string | null
    image: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Ahs_dataMaxAggregateOutputType = {
    id: number | null
    ahs_id: number | null
    name: string | null
    hybridizer: string | null
    year: string | null
    scape_height: string | null
    bloom_size: string | null
    bloom_season: string | null
    ploidy: string | null
    foliage_type: string | null
    bloom_habit: string | null
    seedling_num: string | null
    color: string | null
    form: string | null
    parentage: string | null
    image: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Ahs_dataCountAggregateOutputType = {
    id: number
    ahs_id: number
    name: number
    hybridizer: number
    year: number
    scape_height: number
    bloom_size: number
    bloom_season: number
    ploidy: number
    foliage_type: number
    bloom_habit: number
    seedling_num: number
    color: number
    form: number
    parentage: number
    image: number
    fragrance: number
    budcount: number
    branches: number
    sculpting: number
    foliage: number
    flower: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Ahs_dataAvgAggregateInputType = {
    id?: true
    ahs_id?: true
  }

  export type Ahs_dataSumAggregateInputType = {
    id?: true
    ahs_id?: true
  }

  export type Ahs_dataMinAggregateInputType = {
    id?: true
    ahs_id?: true
    name?: true
    hybridizer?: true
    year?: true
    scape_height?: true
    bloom_size?: true
    bloom_season?: true
    ploidy?: true
    foliage_type?: true
    bloom_habit?: true
    seedling_num?: true
    color?: true
    form?: true
    parentage?: true
    image?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    created_at?: true
    updated_at?: true
  }

  export type Ahs_dataMaxAggregateInputType = {
    id?: true
    ahs_id?: true
    name?: true
    hybridizer?: true
    year?: true
    scape_height?: true
    bloom_size?: true
    bloom_season?: true
    ploidy?: true
    foliage_type?: true
    bloom_habit?: true
    seedling_num?: true
    color?: true
    form?: true
    parentage?: true
    image?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    created_at?: true
    updated_at?: true
  }

  export type Ahs_dataCountAggregateInputType = {
    id?: true
    ahs_id?: true
    name?: true
    hybridizer?: true
    year?: true
    scape_height?: true
    bloom_size?: true
    bloom_season?: true
    ploidy?: true
    foliage_type?: true
    bloom_habit?: true
    seedling_num?: true
    color?: true
    form?: true
    parentage?: true
    image?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Ahs_dataAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ahs_data to aggregate.
     */
    where?: ahs_dataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ahs_data to fetch.
     */
    orderBy?: ahs_dataOrderByWithRelationInput | ahs_dataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ahs_dataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ahs_data from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ahs_data.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ahs_data
    **/
    _count?: true | Ahs_dataCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Ahs_dataAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Ahs_dataSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Ahs_dataMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Ahs_dataMaxAggregateInputType
  }

  export type GetAhs_dataAggregateType<T extends Ahs_dataAggregateArgs> = {
        [P in keyof T & keyof AggregateAhs_data]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAhs_data[P]>
      : GetScalarType<T[P], AggregateAhs_data[P]>
  }




  export type ahs_dataGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ahs_dataWhereInput
    orderBy?: ahs_dataOrderByWithAggregationInput | ahs_dataOrderByWithAggregationInput[]
    by: Ahs_dataScalarFieldEnum[] | Ahs_dataScalarFieldEnum
    having?: ahs_dataScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Ahs_dataCountAggregateInputType | true
    _avg?: Ahs_dataAvgAggregateInputType
    _sum?: Ahs_dataSumAggregateInputType
    _min?: Ahs_dataMinAggregateInputType
    _max?: Ahs_dataMaxAggregateInputType
  }

  export type Ahs_dataGroupByOutputType = {
    id: number
    ahs_id: number
    name: string | null
    hybridizer: string | null
    year: string | null
    scape_height: string | null
    bloom_size: string | null
    bloom_season: string | null
    ploidy: string | null
    foliage_type: string | null
    bloom_habit: string | null
    seedling_num: string | null
    color: string | null
    form: string | null
    parentage: string | null
    image: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    created_at: Date
    updated_at: Date
    _count: Ahs_dataCountAggregateOutputType | null
    _avg: Ahs_dataAvgAggregateOutputType | null
    _sum: Ahs_dataSumAggregateOutputType | null
    _min: Ahs_dataMinAggregateOutputType | null
    _max: Ahs_dataMaxAggregateOutputType | null
  }

  type GetAhs_dataGroupByPayload<T extends ahs_dataGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Ahs_dataGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Ahs_dataGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Ahs_dataGroupByOutputType[P]>
            : GetScalarType<T[P], Ahs_dataGroupByOutputType[P]>
        }
      >
    >


  export type ahs_dataSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ahs_id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scape_height?: boolean
    bloom_size?: boolean
    bloom_season?: boolean
    ploidy?: boolean
    foliage_type?: boolean
    bloom_habit?: boolean
    seedling_num?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    image?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    created_at?: boolean
    updated_at?: boolean
    lilies?: boolean | ahs_data$liliesArgs<ExtArgs>
    _count?: boolean | Ahs_dataCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ahs_data"]>

  export type ahs_dataSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ahs_id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scape_height?: boolean
    bloom_size?: boolean
    bloom_season?: boolean
    ploidy?: boolean
    foliage_type?: boolean
    bloom_habit?: boolean
    seedling_num?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    image?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["ahs_data"]>

  export type ahs_dataSelectScalar = {
    id?: boolean
    ahs_id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scape_height?: boolean
    bloom_size?: boolean
    bloom_season?: boolean
    ploidy?: boolean
    foliage_type?: boolean
    bloom_habit?: boolean
    seedling_num?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    image?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type ahs_dataInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | ahs_data$liliesArgs<ExtArgs>
    _count?: boolean | Ahs_dataCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ahs_dataIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ahs_dataPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ahs_data"
    objects: {
      lilies: Prisma.$liliesPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      ahs_id: number
      name: string | null
      hybridizer: string | null
      year: string | null
      scape_height: string | null
      bloom_size: string | null
      bloom_season: string | null
      ploidy: string | null
      foliage_type: string | null
      bloom_habit: string | null
      seedling_num: string | null
      color: string | null
      form: string | null
      parentage: string | null
      image: string | null
      fragrance: string | null
      budcount: string | null
      branches: string | null
      sculpting: string | null
      foliage: string | null
      flower: string | null
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["ahs_data"]>
    composites: {}
  }

  type ahs_dataGetPayload<S extends boolean | null | undefined | ahs_dataDefaultArgs> = $Result.GetResult<Prisma.$ahs_dataPayload, S>

  type ahs_dataCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ahs_dataFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: Ahs_dataCountAggregateInputType | true
    }

  export interface ahs_dataDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ahs_data'], meta: { name: 'ahs_data' } }
    /**
     * Find zero or one Ahs_data that matches the filter.
     * @param {ahs_dataFindUniqueArgs} args - Arguments to find a Ahs_data
     * @example
     * // Get one Ahs_data
     * const ahs_data = await prisma.ahs_data.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ahs_dataFindUniqueArgs>(args: SelectSubset<T, ahs_dataFindUniqueArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Ahs_data that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ahs_dataFindUniqueOrThrowArgs} args - Arguments to find a Ahs_data
     * @example
     * // Get one Ahs_data
     * const ahs_data = await prisma.ahs_data.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ahs_dataFindUniqueOrThrowArgs>(args: SelectSubset<T, ahs_dataFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Ahs_data that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataFindFirstArgs} args - Arguments to find a Ahs_data
     * @example
     * // Get one Ahs_data
     * const ahs_data = await prisma.ahs_data.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ahs_dataFindFirstArgs>(args?: SelectSubset<T, ahs_dataFindFirstArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Ahs_data that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataFindFirstOrThrowArgs} args - Arguments to find a Ahs_data
     * @example
     * // Get one Ahs_data
     * const ahs_data = await prisma.ahs_data.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ahs_dataFindFirstOrThrowArgs>(args?: SelectSubset<T, ahs_dataFindFirstOrThrowArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Ahs_data that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Ahs_data
     * const ahs_data = await prisma.ahs_data.findMany()
     * 
     * // Get first 10 Ahs_data
     * const ahs_data = await prisma.ahs_data.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ahs_dataWithIdOnly = await prisma.ahs_data.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ahs_dataFindManyArgs>(args?: SelectSubset<T, ahs_dataFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Ahs_data.
     * @param {ahs_dataCreateArgs} args - Arguments to create a Ahs_data.
     * @example
     * // Create one Ahs_data
     * const Ahs_data = await prisma.ahs_data.create({
     *   data: {
     *     // ... data to create a Ahs_data
     *   }
     * })
     * 
     */
    create<T extends ahs_dataCreateArgs>(args: SelectSubset<T, ahs_dataCreateArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Ahs_data.
     * @param {ahs_dataCreateManyArgs} args - Arguments to create many Ahs_data.
     * @example
     * // Create many Ahs_data
     * const ahs_data = await prisma.ahs_data.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ahs_dataCreateManyArgs>(args?: SelectSubset<T, ahs_dataCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Ahs_data and returns the data saved in the database.
     * @param {ahs_dataCreateManyAndReturnArgs} args - Arguments to create many Ahs_data.
     * @example
     * // Create many Ahs_data
     * const ahs_data = await prisma.ahs_data.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Ahs_data and only return the `id`
     * const ahs_dataWithIdOnly = await prisma.ahs_data.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ahs_dataCreateManyAndReturnArgs>(args?: SelectSubset<T, ahs_dataCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Ahs_data.
     * @param {ahs_dataDeleteArgs} args - Arguments to delete one Ahs_data.
     * @example
     * // Delete one Ahs_data
     * const Ahs_data = await prisma.ahs_data.delete({
     *   where: {
     *     // ... filter to delete one Ahs_data
     *   }
     * })
     * 
     */
    delete<T extends ahs_dataDeleteArgs>(args: SelectSubset<T, ahs_dataDeleteArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Ahs_data.
     * @param {ahs_dataUpdateArgs} args - Arguments to update one Ahs_data.
     * @example
     * // Update one Ahs_data
     * const ahs_data = await prisma.ahs_data.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ahs_dataUpdateArgs>(args: SelectSubset<T, ahs_dataUpdateArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Ahs_data.
     * @param {ahs_dataDeleteManyArgs} args - Arguments to filter Ahs_data to delete.
     * @example
     * // Delete a few Ahs_data
     * const { count } = await prisma.ahs_data.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ahs_dataDeleteManyArgs>(args?: SelectSubset<T, ahs_dataDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Ahs_data.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Ahs_data
     * const ahs_data = await prisma.ahs_data.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ahs_dataUpdateManyArgs>(args: SelectSubset<T, ahs_dataUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Ahs_data.
     * @param {ahs_dataUpsertArgs} args - Arguments to update or create a Ahs_data.
     * @example
     * // Update or create a Ahs_data
     * const ahs_data = await prisma.ahs_data.upsert({
     *   create: {
     *     // ... data to create a Ahs_data
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Ahs_data we want to update
     *   }
     * })
     */
    upsert<T extends ahs_dataUpsertArgs>(args: SelectSubset<T, ahs_dataUpsertArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Ahs_data.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataCountArgs} args - Arguments to filter Ahs_data to count.
     * @example
     * // Count the number of Ahs_data
     * const count = await prisma.ahs_data.count({
     *   where: {
     *     // ... the filter for the Ahs_data we want to count
     *   }
     * })
    **/
    count<T extends ahs_dataCountArgs>(
      args?: Subset<T, ahs_dataCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Ahs_dataCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Ahs_data.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Ahs_dataAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Ahs_dataAggregateArgs>(args: Subset<T, Ahs_dataAggregateArgs>): Prisma.PrismaPromise<GetAhs_dataAggregateType<T>>

    /**
     * Group by Ahs_data.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ahs_dataGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ahs_dataGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ahs_dataGroupByArgs['orderBy'] }
        : { orderBy?: ahs_dataGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ahs_dataGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAhs_dataGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ahs_data model
   */
  readonly fields: ahs_dataFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ahs_data.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ahs_dataClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lilies<T extends ahs_data$liliesArgs<ExtArgs> = {}>(args?: Subset<T, ahs_data$liliesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ahs_data model
   */ 
  interface ahs_dataFieldRefs {
    readonly id: FieldRef<"ahs_data", 'Int'>
    readonly ahs_id: FieldRef<"ahs_data", 'Int'>
    readonly name: FieldRef<"ahs_data", 'String'>
    readonly hybridizer: FieldRef<"ahs_data", 'String'>
    readonly year: FieldRef<"ahs_data", 'String'>
    readonly scape_height: FieldRef<"ahs_data", 'String'>
    readonly bloom_size: FieldRef<"ahs_data", 'String'>
    readonly bloom_season: FieldRef<"ahs_data", 'String'>
    readonly ploidy: FieldRef<"ahs_data", 'String'>
    readonly foliage_type: FieldRef<"ahs_data", 'String'>
    readonly bloom_habit: FieldRef<"ahs_data", 'String'>
    readonly seedling_num: FieldRef<"ahs_data", 'String'>
    readonly color: FieldRef<"ahs_data", 'String'>
    readonly form: FieldRef<"ahs_data", 'String'>
    readonly parentage: FieldRef<"ahs_data", 'String'>
    readonly image: FieldRef<"ahs_data", 'String'>
    readonly fragrance: FieldRef<"ahs_data", 'String'>
    readonly budcount: FieldRef<"ahs_data", 'String'>
    readonly branches: FieldRef<"ahs_data", 'String'>
    readonly sculpting: FieldRef<"ahs_data", 'String'>
    readonly foliage: FieldRef<"ahs_data", 'String'>
    readonly flower: FieldRef<"ahs_data", 'String'>
    readonly created_at: FieldRef<"ahs_data", 'DateTime'>
    readonly updated_at: FieldRef<"ahs_data", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ahs_data findUnique
   */
  export type ahs_dataFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter, which ahs_data to fetch.
     */
    where: ahs_dataWhereUniqueInput
  }

  /**
   * ahs_data findUniqueOrThrow
   */
  export type ahs_dataFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter, which ahs_data to fetch.
     */
    where: ahs_dataWhereUniqueInput
  }

  /**
   * ahs_data findFirst
   */
  export type ahs_dataFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter, which ahs_data to fetch.
     */
    where?: ahs_dataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ahs_data to fetch.
     */
    orderBy?: ahs_dataOrderByWithRelationInput | ahs_dataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ahs_data.
     */
    cursor?: ahs_dataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ahs_data from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ahs_data.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ahs_data.
     */
    distinct?: Ahs_dataScalarFieldEnum | Ahs_dataScalarFieldEnum[]
  }

  /**
   * ahs_data findFirstOrThrow
   */
  export type ahs_dataFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter, which ahs_data to fetch.
     */
    where?: ahs_dataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ahs_data to fetch.
     */
    orderBy?: ahs_dataOrderByWithRelationInput | ahs_dataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ahs_data.
     */
    cursor?: ahs_dataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ahs_data from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ahs_data.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ahs_data.
     */
    distinct?: Ahs_dataScalarFieldEnum | Ahs_dataScalarFieldEnum[]
  }

  /**
   * ahs_data findMany
   */
  export type ahs_dataFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter, which ahs_data to fetch.
     */
    where?: ahs_dataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ahs_data to fetch.
     */
    orderBy?: ahs_dataOrderByWithRelationInput | ahs_dataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ahs_data.
     */
    cursor?: ahs_dataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ahs_data from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ahs_data.
     */
    skip?: number
    distinct?: Ahs_dataScalarFieldEnum | Ahs_dataScalarFieldEnum[]
  }

  /**
   * ahs_data create
   */
  export type ahs_dataCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * The data needed to create a ahs_data.
     */
    data: XOR<ahs_dataCreateInput, ahs_dataUncheckedCreateInput>
  }

  /**
   * ahs_data createMany
   */
  export type ahs_dataCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ahs_data.
     */
    data: ahs_dataCreateManyInput | ahs_dataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ahs_data createManyAndReturn
   */
  export type ahs_dataCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ahs_data.
     */
    data: ahs_dataCreateManyInput | ahs_dataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ahs_data update
   */
  export type ahs_dataUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * The data needed to update a ahs_data.
     */
    data: XOR<ahs_dataUpdateInput, ahs_dataUncheckedUpdateInput>
    /**
     * Choose, which ahs_data to update.
     */
    where: ahs_dataWhereUniqueInput
  }

  /**
   * ahs_data updateMany
   */
  export type ahs_dataUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ahs_data.
     */
    data: XOR<ahs_dataUpdateManyMutationInput, ahs_dataUncheckedUpdateManyInput>
    /**
     * Filter which ahs_data to update
     */
    where?: ahs_dataWhereInput
  }

  /**
   * ahs_data upsert
   */
  export type ahs_dataUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * The filter to search for the ahs_data to update in case it exists.
     */
    where: ahs_dataWhereUniqueInput
    /**
     * In case the ahs_data found by the `where` argument doesn't exist, create a new ahs_data with this data.
     */
    create: XOR<ahs_dataCreateInput, ahs_dataUncheckedCreateInput>
    /**
     * In case the ahs_data was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ahs_dataUpdateInput, ahs_dataUncheckedUpdateInput>
  }

  /**
   * ahs_data delete
   */
  export type ahs_dataDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    /**
     * Filter which ahs_data to delete.
     */
    where: ahs_dataWhereUniqueInput
  }

  /**
   * ahs_data deleteMany
   */
  export type ahs_dataDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ahs_data to delete
     */
    where?: ahs_dataWhereInput
  }

  /**
   * ahs_data.lilies
   */
  export type ahs_data$liliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    where?: liliesWhereInput
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    cursor?: liliesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * ahs_data without action
   */
  export type ahs_dataDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
  }


  /**
   * Model lilies
   */

  export type AggregateLilies = {
    _count: LiliesCountAggregateOutputType | null
    _avg: LiliesAvgAggregateOutputType | null
    _sum: LiliesSumAggregateOutputType | null
    _min: LiliesMinAggregateOutputType | null
    _max: LiliesMaxAggregateOutputType | null
  }

  export type LiliesAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
    price: Decimal | null
    list_id: number | null
    ahs_ref: number | null
  }

  export type LiliesSumAggregateOutputType = {
    id: number | null
    user_id: number | null
    price: Decimal | null
    list_id: number | null
    ahs_ref: number | null
  }

  export type LiliesMinAggregateOutputType = {
    id: number | null
    user_id: number | null
    name: string | null
    price: Decimal | null
    public_note: string | null
    private_note: string | null
    ahs_id: string | null
    created_at: Date | null
    updated_at: Date | null
    list_id: number | null
    ahs_ref: number | null
  }

  export type LiliesMaxAggregateOutputType = {
    id: number | null
    user_id: number | null
    name: string | null
    price: Decimal | null
    public_note: string | null
    private_note: string | null
    ahs_id: string | null
    created_at: Date | null
    updated_at: Date | null
    list_id: number | null
    ahs_ref: number | null
  }

  export type LiliesCountAggregateOutputType = {
    id: number
    user_id: number
    name: number
    img_url: number
    price: number
    public_note: number
    private_note: number
    ahs_id: number
    created_at: number
    updated_at: number
    list_id: number
    ahs_ref: number
    _all: number
  }


  export type LiliesAvgAggregateInputType = {
    id?: true
    user_id?: true
    price?: true
    list_id?: true
    ahs_ref?: true
  }

  export type LiliesSumAggregateInputType = {
    id?: true
    user_id?: true
    price?: true
    list_id?: true
    ahs_ref?: true
  }

  export type LiliesMinAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    price?: true
    public_note?: true
    private_note?: true
    ahs_id?: true
    created_at?: true
    updated_at?: true
    list_id?: true
    ahs_ref?: true
  }

  export type LiliesMaxAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    price?: true
    public_note?: true
    private_note?: true
    ahs_id?: true
    created_at?: true
    updated_at?: true
    list_id?: true
    ahs_ref?: true
  }

  export type LiliesCountAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    img_url?: true
    price?: true
    public_note?: true
    private_note?: true
    ahs_id?: true
    created_at?: true
    updated_at?: true
    list_id?: true
    ahs_ref?: true
    _all?: true
  }

  export type LiliesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which lilies to aggregate.
     */
    where?: liliesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lilies to fetch.
     */
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: liliesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lilies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lilies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned lilies
    **/
    _count?: true | LiliesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LiliesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LiliesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LiliesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LiliesMaxAggregateInputType
  }

  export type GetLiliesAggregateType<T extends LiliesAggregateArgs> = {
        [P in keyof T & keyof AggregateLilies]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLilies[P]>
      : GetScalarType<T[P], AggregateLilies[P]>
  }




  export type liliesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: liliesWhereInput
    orderBy?: liliesOrderByWithAggregationInput | liliesOrderByWithAggregationInput[]
    by: LiliesScalarFieldEnum[] | LiliesScalarFieldEnum
    having?: liliesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LiliesCountAggregateInputType | true
    _avg?: LiliesAvgAggregateInputType
    _sum?: LiliesSumAggregateInputType
    _min?: LiliesMinAggregateInputType
    _max?: LiliesMaxAggregateInputType
  }

  export type LiliesGroupByOutputType = {
    id: number
    user_id: number
    name: string
    img_url: string[]
    price: Decimal | null
    public_note: string | null
    private_note: string | null
    ahs_id: string | null
    created_at: Date
    updated_at: Date
    list_id: number | null
    ahs_ref: number | null
    _count: LiliesCountAggregateOutputType | null
    _avg: LiliesAvgAggregateOutputType | null
    _sum: LiliesSumAggregateOutputType | null
    _min: LiliesMinAggregateOutputType | null
    _max: LiliesMaxAggregateOutputType | null
  }

  type GetLiliesGroupByPayload<T extends liliesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LiliesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LiliesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LiliesGroupByOutputType[P]>
            : GetScalarType<T[P], LiliesGroupByOutputType[P]>
        }
      >
    >


  export type liliesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    img_url?: boolean
    price?: boolean
    public_note?: boolean
    private_note?: boolean
    ahs_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    list_id?: boolean
    ahs_ref?: boolean
    ahs_data?: boolean | lilies$ahs_dataArgs<ExtArgs>
    lists?: boolean | lilies$listsArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["lilies"]>

  export type liliesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    img_url?: boolean
    price?: boolean
    public_note?: boolean
    private_note?: boolean
    ahs_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    list_id?: boolean
    ahs_ref?: boolean
    ahs_data?: boolean | lilies$ahs_dataArgs<ExtArgs>
    lists?: boolean | lilies$listsArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["lilies"]>

  export type liliesSelectScalar = {
    id?: boolean
    user_id?: boolean
    name?: boolean
    img_url?: boolean
    price?: boolean
    public_note?: boolean
    private_note?: boolean
    ahs_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    list_id?: boolean
    ahs_ref?: boolean
  }

  export type liliesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ahs_data?: boolean | lilies$ahs_dataArgs<ExtArgs>
    lists?: boolean | lilies$listsArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }
  export type liliesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ahs_data?: boolean | lilies$ahs_dataArgs<ExtArgs>
    lists?: boolean | lilies$listsArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $liliesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "lilies"
    objects: {
      ahs_data: Prisma.$ahs_dataPayload<ExtArgs> | null
      lists: Prisma.$listsPayload<ExtArgs> | null
      users: Prisma.$usersPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      user_id: number
      name: string
      img_url: string[]
      price: Prisma.Decimal | null
      public_note: string | null
      private_note: string | null
      ahs_id: string | null
      created_at: Date
      updated_at: Date
      list_id: number | null
      ahs_ref: number | null
    }, ExtArgs["result"]["lilies"]>
    composites: {}
  }

  type liliesGetPayload<S extends boolean | null | undefined | liliesDefaultArgs> = $Result.GetResult<Prisma.$liliesPayload, S>

  type liliesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<liliesFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LiliesCountAggregateInputType | true
    }

  export interface liliesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['lilies'], meta: { name: 'lilies' } }
    /**
     * Find zero or one Lilies that matches the filter.
     * @param {liliesFindUniqueArgs} args - Arguments to find a Lilies
     * @example
     * // Get one Lilies
     * const lilies = await prisma.lilies.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends liliesFindUniqueArgs>(args: SelectSubset<T, liliesFindUniqueArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Lilies that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {liliesFindUniqueOrThrowArgs} args - Arguments to find a Lilies
     * @example
     * // Get one Lilies
     * const lilies = await prisma.lilies.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends liliesFindUniqueOrThrowArgs>(args: SelectSubset<T, liliesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Lilies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesFindFirstArgs} args - Arguments to find a Lilies
     * @example
     * // Get one Lilies
     * const lilies = await prisma.lilies.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends liliesFindFirstArgs>(args?: SelectSubset<T, liliesFindFirstArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Lilies that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesFindFirstOrThrowArgs} args - Arguments to find a Lilies
     * @example
     * // Get one Lilies
     * const lilies = await prisma.lilies.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends liliesFindFirstOrThrowArgs>(args?: SelectSubset<T, liliesFindFirstOrThrowArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Lilies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Lilies
     * const lilies = await prisma.lilies.findMany()
     * 
     * // Get first 10 Lilies
     * const lilies = await prisma.lilies.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const liliesWithIdOnly = await prisma.lilies.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends liliesFindManyArgs>(args?: SelectSubset<T, liliesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Lilies.
     * @param {liliesCreateArgs} args - Arguments to create a Lilies.
     * @example
     * // Create one Lilies
     * const Lilies = await prisma.lilies.create({
     *   data: {
     *     // ... data to create a Lilies
     *   }
     * })
     * 
     */
    create<T extends liliesCreateArgs>(args: SelectSubset<T, liliesCreateArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Lilies.
     * @param {liliesCreateManyArgs} args - Arguments to create many Lilies.
     * @example
     * // Create many Lilies
     * const lilies = await prisma.lilies.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends liliesCreateManyArgs>(args?: SelectSubset<T, liliesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Lilies and returns the data saved in the database.
     * @param {liliesCreateManyAndReturnArgs} args - Arguments to create many Lilies.
     * @example
     * // Create many Lilies
     * const lilies = await prisma.lilies.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Lilies and only return the `id`
     * const liliesWithIdOnly = await prisma.lilies.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends liliesCreateManyAndReturnArgs>(args?: SelectSubset<T, liliesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Lilies.
     * @param {liliesDeleteArgs} args - Arguments to delete one Lilies.
     * @example
     * // Delete one Lilies
     * const Lilies = await prisma.lilies.delete({
     *   where: {
     *     // ... filter to delete one Lilies
     *   }
     * })
     * 
     */
    delete<T extends liliesDeleteArgs>(args: SelectSubset<T, liliesDeleteArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Lilies.
     * @param {liliesUpdateArgs} args - Arguments to update one Lilies.
     * @example
     * // Update one Lilies
     * const lilies = await prisma.lilies.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends liliesUpdateArgs>(args: SelectSubset<T, liliesUpdateArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Lilies.
     * @param {liliesDeleteManyArgs} args - Arguments to filter Lilies to delete.
     * @example
     * // Delete a few Lilies
     * const { count } = await prisma.lilies.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends liliesDeleteManyArgs>(args?: SelectSubset<T, liliesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Lilies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Lilies
     * const lilies = await prisma.lilies.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends liliesUpdateManyArgs>(args: SelectSubset<T, liliesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Lilies.
     * @param {liliesUpsertArgs} args - Arguments to update or create a Lilies.
     * @example
     * // Update or create a Lilies
     * const lilies = await prisma.lilies.upsert({
     *   create: {
     *     // ... data to create a Lilies
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Lilies we want to update
     *   }
     * })
     */
    upsert<T extends liliesUpsertArgs>(args: SelectSubset<T, liliesUpsertArgs<ExtArgs>>): Prisma__liliesClient<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Lilies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesCountArgs} args - Arguments to filter Lilies to count.
     * @example
     * // Count the number of Lilies
     * const count = await prisma.lilies.count({
     *   where: {
     *     // ... the filter for the Lilies we want to count
     *   }
     * })
    **/
    count<T extends liliesCountArgs>(
      args?: Subset<T, liliesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LiliesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Lilies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiliesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LiliesAggregateArgs>(args: Subset<T, LiliesAggregateArgs>): Prisma.PrismaPromise<GetLiliesAggregateType<T>>

    /**
     * Group by Lilies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {liliesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends liliesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: liliesGroupByArgs['orderBy'] }
        : { orderBy?: liliesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, liliesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLiliesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the lilies model
   */
  readonly fields: liliesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for lilies.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__liliesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ahs_data<T extends lilies$ahs_dataArgs<ExtArgs> = {}>(args?: Subset<T, lilies$ahs_dataArgs<ExtArgs>>): Prisma__ahs_dataClient<$Result.GetResult<Prisma.$ahs_dataPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    lists<T extends lilies$listsArgs<ExtArgs> = {}>(args?: Subset<T, lilies$listsArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the lilies model
   */ 
  interface liliesFieldRefs {
    readonly id: FieldRef<"lilies", 'Int'>
    readonly user_id: FieldRef<"lilies", 'Int'>
    readonly name: FieldRef<"lilies", 'String'>
    readonly img_url: FieldRef<"lilies", 'String[]'>
    readonly price: FieldRef<"lilies", 'Decimal'>
    readonly public_note: FieldRef<"lilies", 'String'>
    readonly private_note: FieldRef<"lilies", 'String'>
    readonly ahs_id: FieldRef<"lilies", 'String'>
    readonly created_at: FieldRef<"lilies", 'DateTime'>
    readonly updated_at: FieldRef<"lilies", 'DateTime'>
    readonly list_id: FieldRef<"lilies", 'Int'>
    readonly ahs_ref: FieldRef<"lilies", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * lilies findUnique
   */
  export type liliesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter, which lilies to fetch.
     */
    where: liliesWhereUniqueInput
  }

  /**
   * lilies findUniqueOrThrow
   */
  export type liliesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter, which lilies to fetch.
     */
    where: liliesWhereUniqueInput
  }

  /**
   * lilies findFirst
   */
  export type liliesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter, which lilies to fetch.
     */
    where?: liliesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lilies to fetch.
     */
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for lilies.
     */
    cursor?: liliesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lilies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lilies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of lilies.
     */
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * lilies findFirstOrThrow
   */
  export type liliesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter, which lilies to fetch.
     */
    where?: liliesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lilies to fetch.
     */
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for lilies.
     */
    cursor?: liliesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lilies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lilies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of lilies.
     */
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * lilies findMany
   */
  export type liliesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter, which lilies to fetch.
     */
    where?: liliesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lilies to fetch.
     */
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing lilies.
     */
    cursor?: liliesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lilies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lilies.
     */
    skip?: number
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * lilies create
   */
  export type liliesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * The data needed to create a lilies.
     */
    data: XOR<liliesCreateInput, liliesUncheckedCreateInput>
  }

  /**
   * lilies createMany
   */
  export type liliesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many lilies.
     */
    data: liliesCreateManyInput | liliesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * lilies createManyAndReturn
   */
  export type liliesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many lilies.
     */
    data: liliesCreateManyInput | liliesCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * lilies update
   */
  export type liliesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * The data needed to update a lilies.
     */
    data: XOR<liliesUpdateInput, liliesUncheckedUpdateInput>
    /**
     * Choose, which lilies to update.
     */
    where: liliesWhereUniqueInput
  }

  /**
   * lilies updateMany
   */
  export type liliesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update lilies.
     */
    data: XOR<liliesUpdateManyMutationInput, liliesUncheckedUpdateManyInput>
    /**
     * Filter which lilies to update
     */
    where?: liliesWhereInput
  }

  /**
   * lilies upsert
   */
  export type liliesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * The filter to search for the lilies to update in case it exists.
     */
    where: liliesWhereUniqueInput
    /**
     * In case the lilies found by the `where` argument doesn't exist, create a new lilies with this data.
     */
    create: XOR<liliesCreateInput, liliesUncheckedCreateInput>
    /**
     * In case the lilies was found with the provided `where` argument, update it with this data.
     */
    update: XOR<liliesUpdateInput, liliesUncheckedUpdateInput>
  }

  /**
   * lilies delete
   */
  export type liliesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    /**
     * Filter which lilies to delete.
     */
    where: liliesWhereUniqueInput
  }

  /**
   * lilies deleteMany
   */
  export type liliesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which lilies to delete
     */
    where?: liliesWhereInput
  }

  /**
   * lilies.ahs_data
   */
  export type lilies$ahs_dataArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ahs_data
     */
    select?: ahs_dataSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ahs_dataInclude<ExtArgs> | null
    where?: ahs_dataWhereInput
  }

  /**
   * lilies.lists
   */
  export type lilies$listsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    where?: listsWhereInput
  }

  /**
   * lilies without action
   */
  export type liliesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
  }


  /**
   * Model lists
   */

  export type AggregateLists = {
    _count: ListsCountAggregateOutputType | null
    _avg: ListsAvgAggregateOutputType | null
    _sum: ListsSumAggregateOutputType | null
    _min: ListsMinAggregateOutputType | null
    _max: ListsMaxAggregateOutputType | null
  }

  export type ListsAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type ListsSumAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type ListsMinAggregateOutputType = {
    id: number | null
    user_id: number | null
    name: string | null
    intro: string | null
    bio: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ListsMaxAggregateOutputType = {
    id: number | null
    user_id: number | null
    name: string | null
    intro: string | null
    bio: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ListsCountAggregateOutputType = {
    id: number
    user_id: number
    name: number
    intro: number
    bio: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type ListsAvgAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type ListsSumAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type ListsMinAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    intro?: true
    bio?: true
    created_at?: true
    updated_at?: true
  }

  export type ListsMaxAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    intro?: true
    bio?: true
    created_at?: true
    updated_at?: true
  }

  export type ListsCountAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    intro?: true
    bio?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type ListsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which lists to aggregate.
     */
    where?: listsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lists to fetch.
     */
    orderBy?: listsOrderByWithRelationInput | listsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: listsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned lists
    **/
    _count?: true | ListsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ListsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ListsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ListsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ListsMaxAggregateInputType
  }

  export type GetListsAggregateType<T extends ListsAggregateArgs> = {
        [P in keyof T & keyof AggregateLists]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLists[P]>
      : GetScalarType<T[P], AggregateLists[P]>
  }




  export type listsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: listsWhereInput
    orderBy?: listsOrderByWithAggregationInput | listsOrderByWithAggregationInput[]
    by: ListsScalarFieldEnum[] | ListsScalarFieldEnum
    having?: listsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ListsCountAggregateInputType | true
    _avg?: ListsAvgAggregateInputType
    _sum?: ListsSumAggregateInputType
    _min?: ListsMinAggregateInputType
    _max?: ListsMaxAggregateInputType
  }

  export type ListsGroupByOutputType = {
    id: number
    user_id: number
    name: string
    intro: string | null
    bio: string | null
    created_at: Date
    updated_at: Date
    _count: ListsCountAggregateOutputType | null
    _avg: ListsAvgAggregateOutputType | null
    _sum: ListsSumAggregateOutputType | null
    _min: ListsMinAggregateOutputType | null
    _max: ListsMaxAggregateOutputType | null
  }

  type GetListsGroupByPayload<T extends listsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ListsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ListsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ListsGroupByOutputType[P]>
            : GetScalarType<T[P], ListsGroupByOutputType[P]>
        }
      >
    >


  export type listsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    intro?: boolean
    bio?: boolean
    created_at?: boolean
    updated_at?: boolean
    lilies?: boolean | lists$liliesArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
    _count?: boolean | ListsCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["lists"]>

  export type listsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    intro?: boolean
    bio?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["lists"]>

  export type listsSelectScalar = {
    id?: boolean
    user_id?: boolean
    name?: boolean
    intro?: boolean
    bio?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type listsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | lists$liliesArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
    _count?: boolean | ListsCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type listsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $listsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "lists"
    objects: {
      lilies: Prisma.$liliesPayload<ExtArgs>[]
      users: Prisma.$usersPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      user_id: number
      name: string
      intro: string | null
      bio: string | null
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["lists"]>
    composites: {}
  }

  type listsGetPayload<S extends boolean | null | undefined | listsDefaultArgs> = $Result.GetResult<Prisma.$listsPayload, S>

  type listsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<listsFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ListsCountAggregateInputType | true
    }

  export interface listsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['lists'], meta: { name: 'lists' } }
    /**
     * Find zero or one Lists that matches the filter.
     * @param {listsFindUniqueArgs} args - Arguments to find a Lists
     * @example
     * // Get one Lists
     * const lists = await prisma.lists.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends listsFindUniqueArgs>(args: SelectSubset<T, listsFindUniqueArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Lists that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {listsFindUniqueOrThrowArgs} args - Arguments to find a Lists
     * @example
     * // Get one Lists
     * const lists = await prisma.lists.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends listsFindUniqueOrThrowArgs>(args: SelectSubset<T, listsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Lists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsFindFirstArgs} args - Arguments to find a Lists
     * @example
     * // Get one Lists
     * const lists = await prisma.lists.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends listsFindFirstArgs>(args?: SelectSubset<T, listsFindFirstArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Lists that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsFindFirstOrThrowArgs} args - Arguments to find a Lists
     * @example
     * // Get one Lists
     * const lists = await prisma.lists.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends listsFindFirstOrThrowArgs>(args?: SelectSubset<T, listsFindFirstOrThrowArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Lists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Lists
     * const lists = await prisma.lists.findMany()
     * 
     * // Get first 10 Lists
     * const lists = await prisma.lists.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const listsWithIdOnly = await prisma.lists.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends listsFindManyArgs>(args?: SelectSubset<T, listsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Lists.
     * @param {listsCreateArgs} args - Arguments to create a Lists.
     * @example
     * // Create one Lists
     * const Lists = await prisma.lists.create({
     *   data: {
     *     // ... data to create a Lists
     *   }
     * })
     * 
     */
    create<T extends listsCreateArgs>(args: SelectSubset<T, listsCreateArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Lists.
     * @param {listsCreateManyArgs} args - Arguments to create many Lists.
     * @example
     * // Create many Lists
     * const lists = await prisma.lists.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends listsCreateManyArgs>(args?: SelectSubset<T, listsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Lists and returns the data saved in the database.
     * @param {listsCreateManyAndReturnArgs} args - Arguments to create many Lists.
     * @example
     * // Create many Lists
     * const lists = await prisma.lists.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Lists and only return the `id`
     * const listsWithIdOnly = await prisma.lists.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends listsCreateManyAndReturnArgs>(args?: SelectSubset<T, listsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Lists.
     * @param {listsDeleteArgs} args - Arguments to delete one Lists.
     * @example
     * // Delete one Lists
     * const Lists = await prisma.lists.delete({
     *   where: {
     *     // ... filter to delete one Lists
     *   }
     * })
     * 
     */
    delete<T extends listsDeleteArgs>(args: SelectSubset<T, listsDeleteArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Lists.
     * @param {listsUpdateArgs} args - Arguments to update one Lists.
     * @example
     * // Update one Lists
     * const lists = await prisma.lists.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends listsUpdateArgs>(args: SelectSubset<T, listsUpdateArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Lists.
     * @param {listsDeleteManyArgs} args - Arguments to filter Lists to delete.
     * @example
     * // Delete a few Lists
     * const { count } = await prisma.lists.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends listsDeleteManyArgs>(args?: SelectSubset<T, listsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Lists
     * const lists = await prisma.lists.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends listsUpdateManyArgs>(args: SelectSubset<T, listsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Lists.
     * @param {listsUpsertArgs} args - Arguments to update or create a Lists.
     * @example
     * // Update or create a Lists
     * const lists = await prisma.lists.upsert({
     *   create: {
     *     // ... data to create a Lists
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Lists we want to update
     *   }
     * })
     */
    upsert<T extends listsUpsertArgs>(args: SelectSubset<T, listsUpsertArgs<ExtArgs>>): Prisma__listsClient<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsCountArgs} args - Arguments to filter Lists to count.
     * @example
     * // Count the number of Lists
     * const count = await prisma.lists.count({
     *   where: {
     *     // ... the filter for the Lists we want to count
     *   }
     * })
    **/
    count<T extends listsCountArgs>(
      args?: Subset<T, listsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ListsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ListsAggregateArgs>(args: Subset<T, ListsAggregateArgs>): Prisma.PrismaPromise<GetListsAggregateType<T>>

    /**
     * Group by Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {listsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends listsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: listsGroupByArgs['orderBy'] }
        : { orderBy?: listsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, listsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetListsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the lists model
   */
  readonly fields: listsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for lists.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__listsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lilies<T extends lists$liliesArgs<ExtArgs> = {}>(args?: Subset<T, lists$liliesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findMany"> | Null>
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the lists model
   */ 
  interface listsFieldRefs {
    readonly id: FieldRef<"lists", 'Int'>
    readonly user_id: FieldRef<"lists", 'Int'>
    readonly name: FieldRef<"lists", 'String'>
    readonly intro: FieldRef<"lists", 'String'>
    readonly bio: FieldRef<"lists", 'String'>
    readonly created_at: FieldRef<"lists", 'DateTime'>
    readonly updated_at: FieldRef<"lists", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * lists findUnique
   */
  export type listsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter, which lists to fetch.
     */
    where: listsWhereUniqueInput
  }

  /**
   * lists findUniqueOrThrow
   */
  export type listsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter, which lists to fetch.
     */
    where: listsWhereUniqueInput
  }

  /**
   * lists findFirst
   */
  export type listsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter, which lists to fetch.
     */
    where?: listsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lists to fetch.
     */
    orderBy?: listsOrderByWithRelationInput | listsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for lists.
     */
    cursor?: listsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of lists.
     */
    distinct?: ListsScalarFieldEnum | ListsScalarFieldEnum[]
  }

  /**
   * lists findFirstOrThrow
   */
  export type listsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter, which lists to fetch.
     */
    where?: listsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lists to fetch.
     */
    orderBy?: listsOrderByWithRelationInput | listsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for lists.
     */
    cursor?: listsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of lists.
     */
    distinct?: ListsScalarFieldEnum | ListsScalarFieldEnum[]
  }

  /**
   * lists findMany
   */
  export type listsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter, which lists to fetch.
     */
    where?: listsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of lists to fetch.
     */
    orderBy?: listsOrderByWithRelationInput | listsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing lists.
     */
    cursor?: listsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` lists.
     */
    skip?: number
    distinct?: ListsScalarFieldEnum | ListsScalarFieldEnum[]
  }

  /**
   * lists create
   */
  export type listsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * The data needed to create a lists.
     */
    data: XOR<listsCreateInput, listsUncheckedCreateInput>
  }

  /**
   * lists createMany
   */
  export type listsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many lists.
     */
    data: listsCreateManyInput | listsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * lists createManyAndReturn
   */
  export type listsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many lists.
     */
    data: listsCreateManyInput | listsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * lists update
   */
  export type listsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * The data needed to update a lists.
     */
    data: XOR<listsUpdateInput, listsUncheckedUpdateInput>
    /**
     * Choose, which lists to update.
     */
    where: listsWhereUniqueInput
  }

  /**
   * lists updateMany
   */
  export type listsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update lists.
     */
    data: XOR<listsUpdateManyMutationInput, listsUncheckedUpdateManyInput>
    /**
     * Filter which lists to update
     */
    where?: listsWhereInput
  }

  /**
   * lists upsert
   */
  export type listsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * The filter to search for the lists to update in case it exists.
     */
    where: listsWhereUniqueInput
    /**
     * In case the lists found by the `where` argument doesn't exist, create a new lists with this data.
     */
    create: XOR<listsCreateInput, listsUncheckedCreateInput>
    /**
     * In case the lists was found with the provided `where` argument, update it with this data.
     */
    update: XOR<listsUpdateInput, listsUncheckedUpdateInput>
  }

  /**
   * lists delete
   */
  export type listsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    /**
     * Filter which lists to delete.
     */
    where: listsWhereUniqueInput
  }

  /**
   * lists deleteMany
   */
  export type listsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which lists to delete
     */
    where?: listsWhereInput
  }

  /**
   * lists.lilies
   */
  export type lists$liliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    where?: liliesWhereInput
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    cursor?: liliesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * lists without action
   */
  export type listsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
  }


  /**
   * Model stripe_customers
   */

  export type AggregateStripe_customers = {
    _count: Stripe_customersCountAggregateOutputType | null
    _avg: Stripe_customersAvgAggregateOutputType | null
    _sum: Stripe_customersSumAggregateOutputType | null
    _min: Stripe_customersMinAggregateOutputType | null
    _max: Stripe_customersMaxAggregateOutputType | null
  }

  export type Stripe_customersAvgAggregateOutputType = {
    user_id: number | null
  }

  export type Stripe_customersSumAggregateOutputType = {
    user_id: number | null
  }

  export type Stripe_customersMinAggregateOutputType = {
    id: string | null
    user_id: number | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Stripe_customersMaxAggregateOutputType = {
    id: string | null
    user_id: number | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Stripe_customersCountAggregateOutputType = {
    id: number
    user_id: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Stripe_customersAvgAggregateInputType = {
    user_id?: true
  }

  export type Stripe_customersSumAggregateInputType = {
    user_id?: true
  }

  export type Stripe_customersMinAggregateInputType = {
    id?: true
    user_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Stripe_customersMaxAggregateInputType = {
    id?: true
    user_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Stripe_customersCountAggregateInputType = {
    id?: true
    user_id?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Stripe_customersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which stripe_customers to aggregate.
     */
    where?: stripe_customersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_customers to fetch.
     */
    orderBy?: stripe_customersOrderByWithRelationInput | stripe_customersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: stripe_customersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned stripe_customers
    **/
    _count?: true | Stripe_customersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Stripe_customersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Stripe_customersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Stripe_customersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Stripe_customersMaxAggregateInputType
  }

  export type GetStripe_customersAggregateType<T extends Stripe_customersAggregateArgs> = {
        [P in keyof T & keyof AggregateStripe_customers]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStripe_customers[P]>
      : GetScalarType<T[P], AggregateStripe_customers[P]>
  }




  export type stripe_customersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: stripe_customersWhereInput
    orderBy?: stripe_customersOrderByWithAggregationInput | stripe_customersOrderByWithAggregationInput[]
    by: Stripe_customersScalarFieldEnum[] | Stripe_customersScalarFieldEnum
    having?: stripe_customersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Stripe_customersCountAggregateInputType | true
    _avg?: Stripe_customersAvgAggregateInputType
    _sum?: Stripe_customersSumAggregateInputType
    _min?: Stripe_customersMinAggregateInputType
    _max?: Stripe_customersMaxAggregateInputType
  }

  export type Stripe_customersGroupByOutputType = {
    id: string
    user_id: number
    created_at: Date
    updated_at: Date
    _count: Stripe_customersCountAggregateOutputType | null
    _avg: Stripe_customersAvgAggregateOutputType | null
    _sum: Stripe_customersSumAggregateOutputType | null
    _min: Stripe_customersMinAggregateOutputType | null
    _max: Stripe_customersMaxAggregateOutputType | null
  }

  type GetStripe_customersGroupByPayload<T extends stripe_customersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Stripe_customersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Stripe_customersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Stripe_customersGroupByOutputType[P]>
            : GetScalarType<T[P], Stripe_customersGroupByOutputType[P]>
        }
      >
    >


  export type stripe_customersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
    stripe_subscriptions?: boolean | stripe_customers$stripe_subscriptionsArgs<ExtArgs>
  }, ExtArgs["result"]["stripe_customers"]>

  export type stripe_customersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["stripe_customers"]>

  export type stripe_customersSelectScalar = {
    id?: boolean
    user_id?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type stripe_customersInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
    stripe_subscriptions?: boolean | stripe_customers$stripe_subscriptionsArgs<ExtArgs>
  }
  export type stripe_customersIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $stripe_customersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "stripe_customers"
    objects: {
      users: Prisma.$usersPayload<ExtArgs>
      stripe_subscriptions: Prisma.$stripe_subscriptionsPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      user_id: number
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["stripe_customers"]>
    composites: {}
  }

  type stripe_customersGetPayload<S extends boolean | null | undefined | stripe_customersDefaultArgs> = $Result.GetResult<Prisma.$stripe_customersPayload, S>

  type stripe_customersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<stripe_customersFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: Stripe_customersCountAggregateInputType | true
    }

  export interface stripe_customersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['stripe_customers'], meta: { name: 'stripe_customers' } }
    /**
     * Find zero or one Stripe_customers that matches the filter.
     * @param {stripe_customersFindUniqueArgs} args - Arguments to find a Stripe_customers
     * @example
     * // Get one Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends stripe_customersFindUniqueArgs>(args: SelectSubset<T, stripe_customersFindUniqueArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Stripe_customers that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {stripe_customersFindUniqueOrThrowArgs} args - Arguments to find a Stripe_customers
     * @example
     * // Get one Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends stripe_customersFindUniqueOrThrowArgs>(args: SelectSubset<T, stripe_customersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Stripe_customers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersFindFirstArgs} args - Arguments to find a Stripe_customers
     * @example
     * // Get one Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends stripe_customersFindFirstArgs>(args?: SelectSubset<T, stripe_customersFindFirstArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Stripe_customers that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersFindFirstOrThrowArgs} args - Arguments to find a Stripe_customers
     * @example
     * // Get one Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends stripe_customersFindFirstOrThrowArgs>(args?: SelectSubset<T, stripe_customersFindFirstOrThrowArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Stripe_customers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findMany()
     * 
     * // Get first 10 Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const stripe_customersWithIdOnly = await prisma.stripe_customers.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends stripe_customersFindManyArgs>(args?: SelectSubset<T, stripe_customersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Stripe_customers.
     * @param {stripe_customersCreateArgs} args - Arguments to create a Stripe_customers.
     * @example
     * // Create one Stripe_customers
     * const Stripe_customers = await prisma.stripe_customers.create({
     *   data: {
     *     // ... data to create a Stripe_customers
     *   }
     * })
     * 
     */
    create<T extends stripe_customersCreateArgs>(args: SelectSubset<T, stripe_customersCreateArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Stripe_customers.
     * @param {stripe_customersCreateManyArgs} args - Arguments to create many Stripe_customers.
     * @example
     * // Create many Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends stripe_customersCreateManyArgs>(args?: SelectSubset<T, stripe_customersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Stripe_customers and returns the data saved in the database.
     * @param {stripe_customersCreateManyAndReturnArgs} args - Arguments to create many Stripe_customers.
     * @example
     * // Create many Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Stripe_customers and only return the `id`
     * const stripe_customersWithIdOnly = await prisma.stripe_customers.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends stripe_customersCreateManyAndReturnArgs>(args?: SelectSubset<T, stripe_customersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Stripe_customers.
     * @param {stripe_customersDeleteArgs} args - Arguments to delete one Stripe_customers.
     * @example
     * // Delete one Stripe_customers
     * const Stripe_customers = await prisma.stripe_customers.delete({
     *   where: {
     *     // ... filter to delete one Stripe_customers
     *   }
     * })
     * 
     */
    delete<T extends stripe_customersDeleteArgs>(args: SelectSubset<T, stripe_customersDeleteArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Stripe_customers.
     * @param {stripe_customersUpdateArgs} args - Arguments to update one Stripe_customers.
     * @example
     * // Update one Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends stripe_customersUpdateArgs>(args: SelectSubset<T, stripe_customersUpdateArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Stripe_customers.
     * @param {stripe_customersDeleteManyArgs} args - Arguments to filter Stripe_customers to delete.
     * @example
     * // Delete a few Stripe_customers
     * const { count } = await prisma.stripe_customers.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends stripe_customersDeleteManyArgs>(args?: SelectSubset<T, stripe_customersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Stripe_customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends stripe_customersUpdateManyArgs>(args: SelectSubset<T, stripe_customersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Stripe_customers.
     * @param {stripe_customersUpsertArgs} args - Arguments to update or create a Stripe_customers.
     * @example
     * // Update or create a Stripe_customers
     * const stripe_customers = await prisma.stripe_customers.upsert({
     *   create: {
     *     // ... data to create a Stripe_customers
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Stripe_customers we want to update
     *   }
     * })
     */
    upsert<T extends stripe_customersUpsertArgs>(args: SelectSubset<T, stripe_customersUpsertArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Stripe_customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersCountArgs} args - Arguments to filter Stripe_customers to count.
     * @example
     * // Count the number of Stripe_customers
     * const count = await prisma.stripe_customers.count({
     *   where: {
     *     // ... the filter for the Stripe_customers we want to count
     *   }
     * })
    **/
    count<T extends stripe_customersCountArgs>(
      args?: Subset<T, stripe_customersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Stripe_customersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Stripe_customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Stripe_customersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Stripe_customersAggregateArgs>(args: Subset<T, Stripe_customersAggregateArgs>): Prisma.PrismaPromise<GetStripe_customersAggregateType<T>>

    /**
     * Group by Stripe_customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_customersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends stripe_customersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: stripe_customersGroupByArgs['orderBy'] }
        : { orderBy?: stripe_customersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, stripe_customersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStripe_customersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the stripe_customers model
   */
  readonly fields: stripe_customersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for stripe_customers.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__stripe_customersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    stripe_subscriptions<T extends stripe_customers$stripe_subscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, stripe_customers$stripe_subscriptionsArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the stripe_customers model
   */ 
  interface stripe_customersFieldRefs {
    readonly id: FieldRef<"stripe_customers", 'String'>
    readonly user_id: FieldRef<"stripe_customers", 'Int'>
    readonly created_at: FieldRef<"stripe_customers", 'DateTime'>
    readonly updated_at: FieldRef<"stripe_customers", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * stripe_customers findUnique
   */
  export type stripe_customersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter, which stripe_customers to fetch.
     */
    where: stripe_customersWhereUniqueInput
  }

  /**
   * stripe_customers findUniqueOrThrow
   */
  export type stripe_customersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter, which stripe_customers to fetch.
     */
    where: stripe_customersWhereUniqueInput
  }

  /**
   * stripe_customers findFirst
   */
  export type stripe_customersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter, which stripe_customers to fetch.
     */
    where?: stripe_customersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_customers to fetch.
     */
    orderBy?: stripe_customersOrderByWithRelationInput | stripe_customersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for stripe_customers.
     */
    cursor?: stripe_customersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of stripe_customers.
     */
    distinct?: Stripe_customersScalarFieldEnum | Stripe_customersScalarFieldEnum[]
  }

  /**
   * stripe_customers findFirstOrThrow
   */
  export type stripe_customersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter, which stripe_customers to fetch.
     */
    where?: stripe_customersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_customers to fetch.
     */
    orderBy?: stripe_customersOrderByWithRelationInput | stripe_customersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for stripe_customers.
     */
    cursor?: stripe_customersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of stripe_customers.
     */
    distinct?: Stripe_customersScalarFieldEnum | Stripe_customersScalarFieldEnum[]
  }

  /**
   * stripe_customers findMany
   */
  export type stripe_customersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter, which stripe_customers to fetch.
     */
    where?: stripe_customersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_customers to fetch.
     */
    orderBy?: stripe_customersOrderByWithRelationInput | stripe_customersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing stripe_customers.
     */
    cursor?: stripe_customersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_customers.
     */
    skip?: number
    distinct?: Stripe_customersScalarFieldEnum | Stripe_customersScalarFieldEnum[]
  }

  /**
   * stripe_customers create
   */
  export type stripe_customersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * The data needed to create a stripe_customers.
     */
    data: XOR<stripe_customersCreateInput, stripe_customersUncheckedCreateInput>
  }

  /**
   * stripe_customers createMany
   */
  export type stripe_customersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many stripe_customers.
     */
    data: stripe_customersCreateManyInput | stripe_customersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * stripe_customers createManyAndReturn
   */
  export type stripe_customersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many stripe_customers.
     */
    data: stripe_customersCreateManyInput | stripe_customersCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * stripe_customers update
   */
  export type stripe_customersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * The data needed to update a stripe_customers.
     */
    data: XOR<stripe_customersUpdateInput, stripe_customersUncheckedUpdateInput>
    /**
     * Choose, which stripe_customers to update.
     */
    where: stripe_customersWhereUniqueInput
  }

  /**
   * stripe_customers updateMany
   */
  export type stripe_customersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update stripe_customers.
     */
    data: XOR<stripe_customersUpdateManyMutationInput, stripe_customersUncheckedUpdateManyInput>
    /**
     * Filter which stripe_customers to update
     */
    where?: stripe_customersWhereInput
  }

  /**
   * stripe_customers upsert
   */
  export type stripe_customersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * The filter to search for the stripe_customers to update in case it exists.
     */
    where: stripe_customersWhereUniqueInput
    /**
     * In case the stripe_customers found by the `where` argument doesn't exist, create a new stripe_customers with this data.
     */
    create: XOR<stripe_customersCreateInput, stripe_customersUncheckedCreateInput>
    /**
     * In case the stripe_customers was found with the provided `where` argument, update it with this data.
     */
    update: XOR<stripe_customersUpdateInput, stripe_customersUncheckedUpdateInput>
  }

  /**
   * stripe_customers delete
   */
  export type stripe_customersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    /**
     * Filter which stripe_customers to delete.
     */
    where: stripe_customersWhereUniqueInput
  }

  /**
   * stripe_customers deleteMany
   */
  export type stripe_customersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which stripe_customers to delete
     */
    where?: stripe_customersWhereInput
  }

  /**
   * stripe_customers.stripe_subscriptions
   */
  export type stripe_customers$stripe_subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    where?: stripe_subscriptionsWhereInput
  }

  /**
   * stripe_customers without action
   */
  export type stripe_customersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
  }


  /**
   * Model stripe_subscriptions
   */

  export type AggregateStripe_subscriptions = {
    _count: Stripe_subscriptionsCountAggregateOutputType | null
    _avg: Stripe_subscriptionsAvgAggregateOutputType | null
    _sum: Stripe_subscriptionsSumAggregateOutputType | null
    _min: Stripe_subscriptionsMinAggregateOutputType | null
    _max: Stripe_subscriptionsMaxAggregateOutputType | null
  }

  export type Stripe_subscriptionsAvgAggregateOutputType = {
    user_id: number | null
  }

  export type Stripe_subscriptionsSumAggregateOutputType = {
    user_id: number | null
  }

  export type Stripe_subscriptionsMinAggregateOutputType = {
    id: string | null
    user_id: number | null
    customer_id: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Stripe_subscriptionsMaxAggregateOutputType = {
    id: string | null
    user_id: number | null
    customer_id: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Stripe_subscriptionsCountAggregateOutputType = {
    id: number
    user_id: number
    customer_id: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Stripe_subscriptionsAvgAggregateInputType = {
    user_id?: true
  }

  export type Stripe_subscriptionsSumAggregateInputType = {
    user_id?: true
  }

  export type Stripe_subscriptionsMinAggregateInputType = {
    id?: true
    user_id?: true
    customer_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Stripe_subscriptionsMaxAggregateInputType = {
    id?: true
    user_id?: true
    customer_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Stripe_subscriptionsCountAggregateInputType = {
    id?: true
    user_id?: true
    customer_id?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Stripe_subscriptionsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which stripe_subscriptions to aggregate.
     */
    where?: stripe_subscriptionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_subscriptions to fetch.
     */
    orderBy?: stripe_subscriptionsOrderByWithRelationInput | stripe_subscriptionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: stripe_subscriptionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned stripe_subscriptions
    **/
    _count?: true | Stripe_subscriptionsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Stripe_subscriptionsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Stripe_subscriptionsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Stripe_subscriptionsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Stripe_subscriptionsMaxAggregateInputType
  }

  export type GetStripe_subscriptionsAggregateType<T extends Stripe_subscriptionsAggregateArgs> = {
        [P in keyof T & keyof AggregateStripe_subscriptions]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStripe_subscriptions[P]>
      : GetScalarType<T[P], AggregateStripe_subscriptions[P]>
  }




  export type stripe_subscriptionsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: stripe_subscriptionsWhereInput
    orderBy?: stripe_subscriptionsOrderByWithAggregationInput | stripe_subscriptionsOrderByWithAggregationInput[]
    by: Stripe_subscriptionsScalarFieldEnum[] | Stripe_subscriptionsScalarFieldEnum
    having?: stripe_subscriptionsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Stripe_subscriptionsCountAggregateInputType | true
    _avg?: Stripe_subscriptionsAvgAggregateInputType
    _sum?: Stripe_subscriptionsSumAggregateInputType
    _min?: Stripe_subscriptionsMinAggregateInputType
    _max?: Stripe_subscriptionsMaxAggregateInputType
  }

  export type Stripe_subscriptionsGroupByOutputType = {
    id: string
    user_id: number
    customer_id: string
    created_at: Date
    updated_at: Date
    _count: Stripe_subscriptionsCountAggregateOutputType | null
    _avg: Stripe_subscriptionsAvgAggregateOutputType | null
    _sum: Stripe_subscriptionsSumAggregateOutputType | null
    _min: Stripe_subscriptionsMinAggregateOutputType | null
    _max: Stripe_subscriptionsMaxAggregateOutputType | null
  }

  type GetStripe_subscriptionsGroupByPayload<T extends stripe_subscriptionsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Stripe_subscriptionsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Stripe_subscriptionsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Stripe_subscriptionsGroupByOutputType[P]>
            : GetScalarType<T[P], Stripe_subscriptionsGroupByOutputType[P]>
        }
      >
    >


  export type stripe_subscriptionsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    customer_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    stripe_customers?: boolean | stripe_customersDefaultArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["stripe_subscriptions"]>

  export type stripe_subscriptionsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    customer_id?: boolean
    created_at?: boolean
    updated_at?: boolean
    stripe_customers?: boolean | stripe_customersDefaultArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["stripe_subscriptions"]>

  export type stripe_subscriptionsSelectScalar = {
    id?: boolean
    user_id?: boolean
    customer_id?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type stripe_subscriptionsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    stripe_customers?: boolean | stripe_customersDefaultArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }
  export type stripe_subscriptionsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    stripe_customers?: boolean | stripe_customersDefaultArgs<ExtArgs>
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $stripe_subscriptionsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "stripe_subscriptions"
    objects: {
      stripe_customers: Prisma.$stripe_customersPayload<ExtArgs>
      users: Prisma.$usersPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      user_id: number
      customer_id: string
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["stripe_subscriptions"]>
    composites: {}
  }

  type stripe_subscriptionsGetPayload<S extends boolean | null | undefined | stripe_subscriptionsDefaultArgs> = $Result.GetResult<Prisma.$stripe_subscriptionsPayload, S>

  type stripe_subscriptionsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<stripe_subscriptionsFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: Stripe_subscriptionsCountAggregateInputType | true
    }

  export interface stripe_subscriptionsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['stripe_subscriptions'], meta: { name: 'stripe_subscriptions' } }
    /**
     * Find zero or one Stripe_subscriptions that matches the filter.
     * @param {stripe_subscriptionsFindUniqueArgs} args - Arguments to find a Stripe_subscriptions
     * @example
     * // Get one Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends stripe_subscriptionsFindUniqueArgs>(args: SelectSubset<T, stripe_subscriptionsFindUniqueArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Stripe_subscriptions that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {stripe_subscriptionsFindUniqueOrThrowArgs} args - Arguments to find a Stripe_subscriptions
     * @example
     * // Get one Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends stripe_subscriptionsFindUniqueOrThrowArgs>(args: SelectSubset<T, stripe_subscriptionsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Stripe_subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsFindFirstArgs} args - Arguments to find a Stripe_subscriptions
     * @example
     * // Get one Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends stripe_subscriptionsFindFirstArgs>(args?: SelectSubset<T, stripe_subscriptionsFindFirstArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Stripe_subscriptions that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsFindFirstOrThrowArgs} args - Arguments to find a Stripe_subscriptions
     * @example
     * // Get one Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends stripe_subscriptionsFindFirstOrThrowArgs>(args?: SelectSubset<T, stripe_subscriptionsFindFirstOrThrowArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Stripe_subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findMany()
     * 
     * // Get first 10 Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const stripe_subscriptionsWithIdOnly = await prisma.stripe_subscriptions.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends stripe_subscriptionsFindManyArgs>(args?: SelectSubset<T, stripe_subscriptionsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Stripe_subscriptions.
     * @param {stripe_subscriptionsCreateArgs} args - Arguments to create a Stripe_subscriptions.
     * @example
     * // Create one Stripe_subscriptions
     * const Stripe_subscriptions = await prisma.stripe_subscriptions.create({
     *   data: {
     *     // ... data to create a Stripe_subscriptions
     *   }
     * })
     * 
     */
    create<T extends stripe_subscriptionsCreateArgs>(args: SelectSubset<T, stripe_subscriptionsCreateArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Stripe_subscriptions.
     * @param {stripe_subscriptionsCreateManyArgs} args - Arguments to create many Stripe_subscriptions.
     * @example
     * // Create many Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends stripe_subscriptionsCreateManyArgs>(args?: SelectSubset<T, stripe_subscriptionsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Stripe_subscriptions and returns the data saved in the database.
     * @param {stripe_subscriptionsCreateManyAndReturnArgs} args - Arguments to create many Stripe_subscriptions.
     * @example
     * // Create many Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Stripe_subscriptions and only return the `id`
     * const stripe_subscriptionsWithIdOnly = await prisma.stripe_subscriptions.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends stripe_subscriptionsCreateManyAndReturnArgs>(args?: SelectSubset<T, stripe_subscriptionsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Stripe_subscriptions.
     * @param {stripe_subscriptionsDeleteArgs} args - Arguments to delete one Stripe_subscriptions.
     * @example
     * // Delete one Stripe_subscriptions
     * const Stripe_subscriptions = await prisma.stripe_subscriptions.delete({
     *   where: {
     *     // ... filter to delete one Stripe_subscriptions
     *   }
     * })
     * 
     */
    delete<T extends stripe_subscriptionsDeleteArgs>(args: SelectSubset<T, stripe_subscriptionsDeleteArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Stripe_subscriptions.
     * @param {stripe_subscriptionsUpdateArgs} args - Arguments to update one Stripe_subscriptions.
     * @example
     * // Update one Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends stripe_subscriptionsUpdateArgs>(args: SelectSubset<T, stripe_subscriptionsUpdateArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Stripe_subscriptions.
     * @param {stripe_subscriptionsDeleteManyArgs} args - Arguments to filter Stripe_subscriptions to delete.
     * @example
     * // Delete a few Stripe_subscriptions
     * const { count } = await prisma.stripe_subscriptions.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends stripe_subscriptionsDeleteManyArgs>(args?: SelectSubset<T, stripe_subscriptionsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Stripe_subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends stripe_subscriptionsUpdateManyArgs>(args: SelectSubset<T, stripe_subscriptionsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Stripe_subscriptions.
     * @param {stripe_subscriptionsUpsertArgs} args - Arguments to update or create a Stripe_subscriptions.
     * @example
     * // Update or create a Stripe_subscriptions
     * const stripe_subscriptions = await prisma.stripe_subscriptions.upsert({
     *   create: {
     *     // ... data to create a Stripe_subscriptions
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Stripe_subscriptions we want to update
     *   }
     * })
     */
    upsert<T extends stripe_subscriptionsUpsertArgs>(args: SelectSubset<T, stripe_subscriptionsUpsertArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Stripe_subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsCountArgs} args - Arguments to filter Stripe_subscriptions to count.
     * @example
     * // Count the number of Stripe_subscriptions
     * const count = await prisma.stripe_subscriptions.count({
     *   where: {
     *     // ... the filter for the Stripe_subscriptions we want to count
     *   }
     * })
    **/
    count<T extends stripe_subscriptionsCountArgs>(
      args?: Subset<T, stripe_subscriptionsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Stripe_subscriptionsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Stripe_subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Stripe_subscriptionsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Stripe_subscriptionsAggregateArgs>(args: Subset<T, Stripe_subscriptionsAggregateArgs>): Prisma.PrismaPromise<GetStripe_subscriptionsAggregateType<T>>

    /**
     * Group by Stripe_subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {stripe_subscriptionsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends stripe_subscriptionsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: stripe_subscriptionsGroupByArgs['orderBy'] }
        : { orderBy?: stripe_subscriptionsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, stripe_subscriptionsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStripe_subscriptionsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the stripe_subscriptions model
   */
  readonly fields: stripe_subscriptionsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for stripe_subscriptions.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__stripe_subscriptionsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    stripe_customers<T extends stripe_customersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, stripe_customersDefaultArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the stripe_subscriptions model
   */ 
  interface stripe_subscriptionsFieldRefs {
    readonly id: FieldRef<"stripe_subscriptions", 'String'>
    readonly user_id: FieldRef<"stripe_subscriptions", 'Int'>
    readonly customer_id: FieldRef<"stripe_subscriptions", 'String'>
    readonly created_at: FieldRef<"stripe_subscriptions", 'DateTime'>
    readonly updated_at: FieldRef<"stripe_subscriptions", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * stripe_subscriptions findUnique
   */
  export type stripe_subscriptionsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter, which stripe_subscriptions to fetch.
     */
    where: stripe_subscriptionsWhereUniqueInput
  }

  /**
   * stripe_subscriptions findUniqueOrThrow
   */
  export type stripe_subscriptionsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter, which stripe_subscriptions to fetch.
     */
    where: stripe_subscriptionsWhereUniqueInput
  }

  /**
   * stripe_subscriptions findFirst
   */
  export type stripe_subscriptionsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter, which stripe_subscriptions to fetch.
     */
    where?: stripe_subscriptionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_subscriptions to fetch.
     */
    orderBy?: stripe_subscriptionsOrderByWithRelationInput | stripe_subscriptionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for stripe_subscriptions.
     */
    cursor?: stripe_subscriptionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of stripe_subscriptions.
     */
    distinct?: Stripe_subscriptionsScalarFieldEnum | Stripe_subscriptionsScalarFieldEnum[]
  }

  /**
   * stripe_subscriptions findFirstOrThrow
   */
  export type stripe_subscriptionsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter, which stripe_subscriptions to fetch.
     */
    where?: stripe_subscriptionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_subscriptions to fetch.
     */
    orderBy?: stripe_subscriptionsOrderByWithRelationInput | stripe_subscriptionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for stripe_subscriptions.
     */
    cursor?: stripe_subscriptionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of stripe_subscriptions.
     */
    distinct?: Stripe_subscriptionsScalarFieldEnum | Stripe_subscriptionsScalarFieldEnum[]
  }

  /**
   * stripe_subscriptions findMany
   */
  export type stripe_subscriptionsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter, which stripe_subscriptions to fetch.
     */
    where?: stripe_subscriptionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of stripe_subscriptions to fetch.
     */
    orderBy?: stripe_subscriptionsOrderByWithRelationInput | stripe_subscriptionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing stripe_subscriptions.
     */
    cursor?: stripe_subscriptionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` stripe_subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` stripe_subscriptions.
     */
    skip?: number
    distinct?: Stripe_subscriptionsScalarFieldEnum | Stripe_subscriptionsScalarFieldEnum[]
  }

  /**
   * stripe_subscriptions create
   */
  export type stripe_subscriptionsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * The data needed to create a stripe_subscriptions.
     */
    data: XOR<stripe_subscriptionsCreateInput, stripe_subscriptionsUncheckedCreateInput>
  }

  /**
   * stripe_subscriptions createMany
   */
  export type stripe_subscriptionsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many stripe_subscriptions.
     */
    data: stripe_subscriptionsCreateManyInput | stripe_subscriptionsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * stripe_subscriptions createManyAndReturn
   */
  export type stripe_subscriptionsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many stripe_subscriptions.
     */
    data: stripe_subscriptionsCreateManyInput | stripe_subscriptionsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * stripe_subscriptions update
   */
  export type stripe_subscriptionsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * The data needed to update a stripe_subscriptions.
     */
    data: XOR<stripe_subscriptionsUpdateInput, stripe_subscriptionsUncheckedUpdateInput>
    /**
     * Choose, which stripe_subscriptions to update.
     */
    where: stripe_subscriptionsWhereUniqueInput
  }

  /**
   * stripe_subscriptions updateMany
   */
  export type stripe_subscriptionsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update stripe_subscriptions.
     */
    data: XOR<stripe_subscriptionsUpdateManyMutationInput, stripe_subscriptionsUncheckedUpdateManyInput>
    /**
     * Filter which stripe_subscriptions to update
     */
    where?: stripe_subscriptionsWhereInput
  }

  /**
   * stripe_subscriptions upsert
   */
  export type stripe_subscriptionsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * The filter to search for the stripe_subscriptions to update in case it exists.
     */
    where: stripe_subscriptionsWhereUniqueInput
    /**
     * In case the stripe_subscriptions found by the `where` argument doesn't exist, create a new stripe_subscriptions with this data.
     */
    create: XOR<stripe_subscriptionsCreateInput, stripe_subscriptionsUncheckedCreateInput>
    /**
     * In case the stripe_subscriptions was found with the provided `where` argument, update it with this data.
     */
    update: XOR<stripe_subscriptionsUpdateInput, stripe_subscriptionsUncheckedUpdateInput>
  }

  /**
   * stripe_subscriptions delete
   */
  export type stripe_subscriptionsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    /**
     * Filter which stripe_subscriptions to delete.
     */
    where: stripe_subscriptionsWhereUniqueInput
  }

  /**
   * stripe_subscriptions deleteMany
   */
  export type stripe_subscriptionsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which stripe_subscriptions to delete
     */
    where?: stripe_subscriptionsWhereInput
  }

  /**
   * stripe_subscriptions without action
   */
  export type stripe_subscriptionsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
  }


  /**
   * Model user_authentications
   */

  export type AggregateUser_authentications = {
    _count: User_authenticationsCountAggregateOutputType | null
    _avg: User_authenticationsAvgAggregateOutputType | null
    _sum: User_authenticationsSumAggregateOutputType | null
    _min: User_authenticationsMinAggregateOutputType | null
    _max: User_authenticationsMaxAggregateOutputType | null
  }

  export type User_authenticationsAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type User_authenticationsSumAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type User_authenticationsMinAggregateOutputType = {
    id: number | null
    user_id: number | null
    service: string | null
    identifier: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type User_authenticationsMaxAggregateOutputType = {
    id: number | null
    user_id: number | null
    service: string | null
    identifier: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type User_authenticationsCountAggregateOutputType = {
    id: number
    user_id: number
    service: number
    identifier: number
    details: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type User_authenticationsAvgAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type User_authenticationsSumAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type User_authenticationsMinAggregateInputType = {
    id?: true
    user_id?: true
    service?: true
    identifier?: true
    created_at?: true
    updated_at?: true
  }

  export type User_authenticationsMaxAggregateInputType = {
    id?: true
    user_id?: true
    service?: true
    identifier?: true
    created_at?: true
    updated_at?: true
  }

  export type User_authenticationsCountAggregateInputType = {
    id?: true
    user_id?: true
    service?: true
    identifier?: true
    details?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type User_authenticationsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which user_authentications to aggregate.
     */
    where?: user_authenticationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_authentications to fetch.
     */
    orderBy?: user_authenticationsOrderByWithRelationInput | user_authenticationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: user_authenticationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_authentications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_authentications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned user_authentications
    **/
    _count?: true | User_authenticationsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: User_authenticationsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: User_authenticationsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: User_authenticationsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: User_authenticationsMaxAggregateInputType
  }

  export type GetUser_authenticationsAggregateType<T extends User_authenticationsAggregateArgs> = {
        [P in keyof T & keyof AggregateUser_authentications]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser_authentications[P]>
      : GetScalarType<T[P], AggregateUser_authentications[P]>
  }




  export type user_authenticationsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: user_authenticationsWhereInput
    orderBy?: user_authenticationsOrderByWithAggregationInput | user_authenticationsOrderByWithAggregationInput[]
    by: User_authenticationsScalarFieldEnum[] | User_authenticationsScalarFieldEnum
    having?: user_authenticationsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: User_authenticationsCountAggregateInputType | true
    _avg?: User_authenticationsAvgAggregateInputType
    _sum?: User_authenticationsSumAggregateInputType
    _min?: User_authenticationsMinAggregateInputType
    _max?: User_authenticationsMaxAggregateInputType
  }

  export type User_authenticationsGroupByOutputType = {
    id: number
    user_id: number
    service: string
    identifier: string
    details: JsonValue
    created_at: Date
    updated_at: Date
    _count: User_authenticationsCountAggregateOutputType | null
    _avg: User_authenticationsAvgAggregateOutputType | null
    _sum: User_authenticationsSumAggregateOutputType | null
    _min: User_authenticationsMinAggregateOutputType | null
    _max: User_authenticationsMaxAggregateOutputType | null
  }

  type GetUser_authenticationsGroupByPayload<T extends user_authenticationsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<User_authenticationsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof User_authenticationsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], User_authenticationsGroupByOutputType[P]>
            : GetScalarType<T[P], User_authenticationsGroupByOutputType[P]>
        }
      >
    >


  export type user_authenticationsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    service?: boolean
    identifier?: boolean
    details?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user_authentications"]>

  export type user_authenticationsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    service?: boolean
    identifier?: boolean
    details?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user_authentications"]>

  export type user_authenticationsSelectScalar = {
    id?: boolean
    user_id?: boolean
    service?: boolean
    identifier?: boolean
    details?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type user_authenticationsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }
  export type user_authenticationsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $user_authenticationsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "user_authentications"
    objects: {
      users: Prisma.$usersPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      user_id: number
      service: string
      identifier: string
      details: Prisma.JsonValue
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["user_authentications"]>
    composites: {}
  }

  type user_authenticationsGetPayload<S extends boolean | null | undefined | user_authenticationsDefaultArgs> = $Result.GetResult<Prisma.$user_authenticationsPayload, S>

  type user_authenticationsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<user_authenticationsFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: User_authenticationsCountAggregateInputType | true
    }

  export interface user_authenticationsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['user_authentications'], meta: { name: 'user_authentications' } }
    /**
     * Find zero or one User_authentications that matches the filter.
     * @param {user_authenticationsFindUniqueArgs} args - Arguments to find a User_authentications
     * @example
     * // Get one User_authentications
     * const user_authentications = await prisma.user_authentications.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends user_authenticationsFindUniqueArgs>(args: SelectSubset<T, user_authenticationsFindUniqueArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User_authentications that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {user_authenticationsFindUniqueOrThrowArgs} args - Arguments to find a User_authentications
     * @example
     * // Get one User_authentications
     * const user_authentications = await prisma.user_authentications.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends user_authenticationsFindUniqueOrThrowArgs>(args: SelectSubset<T, user_authenticationsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User_authentications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsFindFirstArgs} args - Arguments to find a User_authentications
     * @example
     * // Get one User_authentications
     * const user_authentications = await prisma.user_authentications.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends user_authenticationsFindFirstArgs>(args?: SelectSubset<T, user_authenticationsFindFirstArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User_authentications that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsFindFirstOrThrowArgs} args - Arguments to find a User_authentications
     * @example
     * // Get one User_authentications
     * const user_authentications = await prisma.user_authentications.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends user_authenticationsFindFirstOrThrowArgs>(args?: SelectSubset<T, user_authenticationsFindFirstOrThrowArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more User_authentications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all User_authentications
     * const user_authentications = await prisma.user_authentications.findMany()
     * 
     * // Get first 10 User_authentications
     * const user_authentications = await prisma.user_authentications.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const user_authenticationsWithIdOnly = await prisma.user_authentications.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends user_authenticationsFindManyArgs>(args?: SelectSubset<T, user_authenticationsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User_authentications.
     * @param {user_authenticationsCreateArgs} args - Arguments to create a User_authentications.
     * @example
     * // Create one User_authentications
     * const User_authentications = await prisma.user_authentications.create({
     *   data: {
     *     // ... data to create a User_authentications
     *   }
     * })
     * 
     */
    create<T extends user_authenticationsCreateArgs>(args: SelectSubset<T, user_authenticationsCreateArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many User_authentications.
     * @param {user_authenticationsCreateManyArgs} args - Arguments to create many User_authentications.
     * @example
     * // Create many User_authentications
     * const user_authentications = await prisma.user_authentications.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends user_authenticationsCreateManyArgs>(args?: SelectSubset<T, user_authenticationsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many User_authentications and returns the data saved in the database.
     * @param {user_authenticationsCreateManyAndReturnArgs} args - Arguments to create many User_authentications.
     * @example
     * // Create many User_authentications
     * const user_authentications = await prisma.user_authentications.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many User_authentications and only return the `id`
     * const user_authenticationsWithIdOnly = await prisma.user_authentications.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends user_authenticationsCreateManyAndReturnArgs>(args?: SelectSubset<T, user_authenticationsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User_authentications.
     * @param {user_authenticationsDeleteArgs} args - Arguments to delete one User_authentications.
     * @example
     * // Delete one User_authentications
     * const User_authentications = await prisma.user_authentications.delete({
     *   where: {
     *     // ... filter to delete one User_authentications
     *   }
     * })
     * 
     */
    delete<T extends user_authenticationsDeleteArgs>(args: SelectSubset<T, user_authenticationsDeleteArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User_authentications.
     * @param {user_authenticationsUpdateArgs} args - Arguments to update one User_authentications.
     * @example
     * // Update one User_authentications
     * const user_authentications = await prisma.user_authentications.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends user_authenticationsUpdateArgs>(args: SelectSubset<T, user_authenticationsUpdateArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more User_authentications.
     * @param {user_authenticationsDeleteManyArgs} args - Arguments to filter User_authentications to delete.
     * @example
     * // Delete a few User_authentications
     * const { count } = await prisma.user_authentications.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends user_authenticationsDeleteManyArgs>(args?: SelectSubset<T, user_authenticationsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more User_authentications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many User_authentications
     * const user_authentications = await prisma.user_authentications.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends user_authenticationsUpdateManyArgs>(args: SelectSubset<T, user_authenticationsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User_authentications.
     * @param {user_authenticationsUpsertArgs} args - Arguments to update or create a User_authentications.
     * @example
     * // Update or create a User_authentications
     * const user_authentications = await prisma.user_authentications.upsert({
     *   create: {
     *     // ... data to create a User_authentications
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User_authentications we want to update
     *   }
     * })
     */
    upsert<T extends user_authenticationsUpsertArgs>(args: SelectSubset<T, user_authenticationsUpsertArgs<ExtArgs>>): Prisma__user_authenticationsClient<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of User_authentications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsCountArgs} args - Arguments to filter User_authentications to count.
     * @example
     * // Count the number of User_authentications
     * const count = await prisma.user_authentications.count({
     *   where: {
     *     // ... the filter for the User_authentications we want to count
     *   }
     * })
    **/
    count<T extends user_authenticationsCountArgs>(
      args?: Subset<T, user_authenticationsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], User_authenticationsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User_authentications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {User_authenticationsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends User_authenticationsAggregateArgs>(args: Subset<T, User_authenticationsAggregateArgs>): Prisma.PrismaPromise<GetUser_authenticationsAggregateType<T>>

    /**
     * Group by User_authentications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_authenticationsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends user_authenticationsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: user_authenticationsGroupByArgs['orderBy'] }
        : { orderBy?: user_authenticationsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, user_authenticationsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUser_authenticationsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the user_authentications model
   */
  readonly fields: user_authenticationsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for user_authentications.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__user_authenticationsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the user_authentications model
   */ 
  interface user_authenticationsFieldRefs {
    readonly id: FieldRef<"user_authentications", 'Int'>
    readonly user_id: FieldRef<"user_authentications", 'Int'>
    readonly service: FieldRef<"user_authentications", 'String'>
    readonly identifier: FieldRef<"user_authentications", 'String'>
    readonly details: FieldRef<"user_authentications", 'Json'>
    readonly created_at: FieldRef<"user_authentications", 'DateTime'>
    readonly updated_at: FieldRef<"user_authentications", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * user_authentications findUnique
   */
  export type user_authenticationsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter, which user_authentications to fetch.
     */
    where: user_authenticationsWhereUniqueInput
  }

  /**
   * user_authentications findUniqueOrThrow
   */
  export type user_authenticationsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter, which user_authentications to fetch.
     */
    where: user_authenticationsWhereUniqueInput
  }

  /**
   * user_authentications findFirst
   */
  export type user_authenticationsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter, which user_authentications to fetch.
     */
    where?: user_authenticationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_authentications to fetch.
     */
    orderBy?: user_authenticationsOrderByWithRelationInput | user_authenticationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for user_authentications.
     */
    cursor?: user_authenticationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_authentications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_authentications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of user_authentications.
     */
    distinct?: User_authenticationsScalarFieldEnum | User_authenticationsScalarFieldEnum[]
  }

  /**
   * user_authentications findFirstOrThrow
   */
  export type user_authenticationsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter, which user_authentications to fetch.
     */
    where?: user_authenticationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_authentications to fetch.
     */
    orderBy?: user_authenticationsOrderByWithRelationInput | user_authenticationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for user_authentications.
     */
    cursor?: user_authenticationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_authentications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_authentications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of user_authentications.
     */
    distinct?: User_authenticationsScalarFieldEnum | User_authenticationsScalarFieldEnum[]
  }

  /**
   * user_authentications findMany
   */
  export type user_authenticationsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter, which user_authentications to fetch.
     */
    where?: user_authenticationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_authentications to fetch.
     */
    orderBy?: user_authenticationsOrderByWithRelationInput | user_authenticationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing user_authentications.
     */
    cursor?: user_authenticationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_authentications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_authentications.
     */
    skip?: number
    distinct?: User_authenticationsScalarFieldEnum | User_authenticationsScalarFieldEnum[]
  }

  /**
   * user_authentications create
   */
  export type user_authenticationsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * The data needed to create a user_authentications.
     */
    data: XOR<user_authenticationsCreateInput, user_authenticationsUncheckedCreateInput>
  }

  /**
   * user_authentications createMany
   */
  export type user_authenticationsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many user_authentications.
     */
    data: user_authenticationsCreateManyInput | user_authenticationsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * user_authentications createManyAndReturn
   */
  export type user_authenticationsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many user_authentications.
     */
    data: user_authenticationsCreateManyInput | user_authenticationsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * user_authentications update
   */
  export type user_authenticationsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * The data needed to update a user_authentications.
     */
    data: XOR<user_authenticationsUpdateInput, user_authenticationsUncheckedUpdateInput>
    /**
     * Choose, which user_authentications to update.
     */
    where: user_authenticationsWhereUniqueInput
  }

  /**
   * user_authentications updateMany
   */
  export type user_authenticationsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update user_authentications.
     */
    data: XOR<user_authenticationsUpdateManyMutationInput, user_authenticationsUncheckedUpdateManyInput>
    /**
     * Filter which user_authentications to update
     */
    where?: user_authenticationsWhereInput
  }

  /**
   * user_authentications upsert
   */
  export type user_authenticationsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * The filter to search for the user_authentications to update in case it exists.
     */
    where: user_authenticationsWhereUniqueInput
    /**
     * In case the user_authentications found by the `where` argument doesn't exist, create a new user_authentications with this data.
     */
    create: XOR<user_authenticationsCreateInput, user_authenticationsUncheckedCreateInput>
    /**
     * In case the user_authentications was found with the provided `where` argument, update it with this data.
     */
    update: XOR<user_authenticationsUpdateInput, user_authenticationsUncheckedUpdateInput>
  }

  /**
   * user_authentications delete
   */
  export type user_authenticationsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    /**
     * Filter which user_authentications to delete.
     */
    where: user_authenticationsWhereUniqueInput
  }

  /**
   * user_authentications deleteMany
   */
  export type user_authenticationsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which user_authentications to delete
     */
    where?: user_authenticationsWhereInput
  }

  /**
   * user_authentications without action
   */
  export type user_authenticationsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
  }


  /**
   * Model user_emails
   */

  export type AggregateUser_emails = {
    _count: User_emailsCountAggregateOutputType | null
    _avg: User_emailsAvgAggregateOutputType | null
    _sum: User_emailsSumAggregateOutputType | null
    _min: User_emailsMinAggregateOutputType | null
    _max: User_emailsMaxAggregateOutputType | null
  }

  export type User_emailsAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type User_emailsSumAggregateOutputType = {
    id: number | null
    user_id: number | null
  }

  export type User_emailsMinAggregateOutputType = {
    id: number | null
    user_id: number | null
    email: string | null
    is_verified: boolean | null
    is_primary: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type User_emailsMaxAggregateOutputType = {
    id: number | null
    user_id: number | null
    email: string | null
    is_verified: boolean | null
    is_primary: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type User_emailsCountAggregateOutputType = {
    id: number
    user_id: number
    email: number
    is_verified: number
    is_primary: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type User_emailsAvgAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type User_emailsSumAggregateInputType = {
    id?: true
    user_id?: true
  }

  export type User_emailsMinAggregateInputType = {
    id?: true
    user_id?: true
    email?: true
    is_verified?: true
    is_primary?: true
    created_at?: true
    updated_at?: true
  }

  export type User_emailsMaxAggregateInputType = {
    id?: true
    user_id?: true
    email?: true
    is_verified?: true
    is_primary?: true
    created_at?: true
    updated_at?: true
  }

  export type User_emailsCountAggregateInputType = {
    id?: true
    user_id?: true
    email?: true
    is_verified?: true
    is_primary?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type User_emailsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which user_emails to aggregate.
     */
    where?: user_emailsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_emails to fetch.
     */
    orderBy?: user_emailsOrderByWithRelationInput | user_emailsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: user_emailsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_emails from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_emails.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned user_emails
    **/
    _count?: true | User_emailsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: User_emailsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: User_emailsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: User_emailsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: User_emailsMaxAggregateInputType
  }

  export type GetUser_emailsAggregateType<T extends User_emailsAggregateArgs> = {
        [P in keyof T & keyof AggregateUser_emails]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser_emails[P]>
      : GetScalarType<T[P], AggregateUser_emails[P]>
  }




  export type user_emailsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: user_emailsWhereInput
    orderBy?: user_emailsOrderByWithAggregationInput | user_emailsOrderByWithAggregationInput[]
    by: User_emailsScalarFieldEnum[] | User_emailsScalarFieldEnum
    having?: user_emailsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: User_emailsCountAggregateInputType | true
    _avg?: User_emailsAvgAggregateInputType
    _sum?: User_emailsSumAggregateInputType
    _min?: User_emailsMinAggregateInputType
    _max?: User_emailsMaxAggregateInputType
  }

  export type User_emailsGroupByOutputType = {
    id: number
    user_id: number
    email: string
    is_verified: boolean
    is_primary: boolean
    created_at: Date
    updated_at: Date
    _count: User_emailsCountAggregateOutputType | null
    _avg: User_emailsAvgAggregateOutputType | null
    _sum: User_emailsSumAggregateOutputType | null
    _min: User_emailsMinAggregateOutputType | null
    _max: User_emailsMaxAggregateOutputType | null
  }

  type GetUser_emailsGroupByPayload<T extends user_emailsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<User_emailsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof User_emailsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], User_emailsGroupByOutputType[P]>
            : GetScalarType<T[P], User_emailsGroupByOutputType[P]>
        }
      >
    >


  export type user_emailsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    email?: boolean
    is_verified?: boolean
    is_primary?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user_emails"]>

  export type user_emailsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    email?: boolean
    is_verified?: boolean
    is_primary?: boolean
    created_at?: boolean
    updated_at?: boolean
    users?: boolean | usersDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user_emails"]>

  export type user_emailsSelectScalar = {
    id?: boolean
    user_id?: boolean
    email?: boolean
    is_verified?: boolean
    is_primary?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type user_emailsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }
  export type user_emailsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | usersDefaultArgs<ExtArgs>
  }

  export type $user_emailsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "user_emails"
    objects: {
      users: Prisma.$usersPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      user_id: number
      email: string
      is_verified: boolean
      is_primary: boolean
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["user_emails"]>
    composites: {}
  }

  type user_emailsGetPayload<S extends boolean | null | undefined | user_emailsDefaultArgs> = $Result.GetResult<Prisma.$user_emailsPayload, S>

  type user_emailsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<user_emailsFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: User_emailsCountAggregateInputType | true
    }

  export interface user_emailsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['user_emails'], meta: { name: 'user_emails' } }
    /**
     * Find zero or one User_emails that matches the filter.
     * @param {user_emailsFindUniqueArgs} args - Arguments to find a User_emails
     * @example
     * // Get one User_emails
     * const user_emails = await prisma.user_emails.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends user_emailsFindUniqueArgs>(args: SelectSubset<T, user_emailsFindUniqueArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User_emails that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {user_emailsFindUniqueOrThrowArgs} args - Arguments to find a User_emails
     * @example
     * // Get one User_emails
     * const user_emails = await prisma.user_emails.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends user_emailsFindUniqueOrThrowArgs>(args: SelectSubset<T, user_emailsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User_emails that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsFindFirstArgs} args - Arguments to find a User_emails
     * @example
     * // Get one User_emails
     * const user_emails = await prisma.user_emails.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends user_emailsFindFirstArgs>(args?: SelectSubset<T, user_emailsFindFirstArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User_emails that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsFindFirstOrThrowArgs} args - Arguments to find a User_emails
     * @example
     * // Get one User_emails
     * const user_emails = await prisma.user_emails.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends user_emailsFindFirstOrThrowArgs>(args?: SelectSubset<T, user_emailsFindFirstOrThrowArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more User_emails that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all User_emails
     * const user_emails = await prisma.user_emails.findMany()
     * 
     * // Get first 10 User_emails
     * const user_emails = await prisma.user_emails.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const user_emailsWithIdOnly = await prisma.user_emails.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends user_emailsFindManyArgs>(args?: SelectSubset<T, user_emailsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User_emails.
     * @param {user_emailsCreateArgs} args - Arguments to create a User_emails.
     * @example
     * // Create one User_emails
     * const User_emails = await prisma.user_emails.create({
     *   data: {
     *     // ... data to create a User_emails
     *   }
     * })
     * 
     */
    create<T extends user_emailsCreateArgs>(args: SelectSubset<T, user_emailsCreateArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many User_emails.
     * @param {user_emailsCreateManyArgs} args - Arguments to create many User_emails.
     * @example
     * // Create many User_emails
     * const user_emails = await prisma.user_emails.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends user_emailsCreateManyArgs>(args?: SelectSubset<T, user_emailsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many User_emails and returns the data saved in the database.
     * @param {user_emailsCreateManyAndReturnArgs} args - Arguments to create many User_emails.
     * @example
     * // Create many User_emails
     * const user_emails = await prisma.user_emails.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many User_emails and only return the `id`
     * const user_emailsWithIdOnly = await prisma.user_emails.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends user_emailsCreateManyAndReturnArgs>(args?: SelectSubset<T, user_emailsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User_emails.
     * @param {user_emailsDeleteArgs} args - Arguments to delete one User_emails.
     * @example
     * // Delete one User_emails
     * const User_emails = await prisma.user_emails.delete({
     *   where: {
     *     // ... filter to delete one User_emails
     *   }
     * })
     * 
     */
    delete<T extends user_emailsDeleteArgs>(args: SelectSubset<T, user_emailsDeleteArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User_emails.
     * @param {user_emailsUpdateArgs} args - Arguments to update one User_emails.
     * @example
     * // Update one User_emails
     * const user_emails = await prisma.user_emails.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends user_emailsUpdateArgs>(args: SelectSubset<T, user_emailsUpdateArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more User_emails.
     * @param {user_emailsDeleteManyArgs} args - Arguments to filter User_emails to delete.
     * @example
     * // Delete a few User_emails
     * const { count } = await prisma.user_emails.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends user_emailsDeleteManyArgs>(args?: SelectSubset<T, user_emailsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more User_emails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many User_emails
     * const user_emails = await prisma.user_emails.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends user_emailsUpdateManyArgs>(args: SelectSubset<T, user_emailsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User_emails.
     * @param {user_emailsUpsertArgs} args - Arguments to update or create a User_emails.
     * @example
     * // Update or create a User_emails
     * const user_emails = await prisma.user_emails.upsert({
     *   create: {
     *     // ... data to create a User_emails
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User_emails we want to update
     *   }
     * })
     */
    upsert<T extends user_emailsUpsertArgs>(args: SelectSubset<T, user_emailsUpsertArgs<ExtArgs>>): Prisma__user_emailsClient<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of User_emails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsCountArgs} args - Arguments to filter User_emails to count.
     * @example
     * // Count the number of User_emails
     * const count = await prisma.user_emails.count({
     *   where: {
     *     // ... the filter for the User_emails we want to count
     *   }
     * })
    **/
    count<T extends user_emailsCountArgs>(
      args?: Subset<T, user_emailsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], User_emailsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User_emails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {User_emailsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends User_emailsAggregateArgs>(args: Subset<T, User_emailsAggregateArgs>): Prisma.PrismaPromise<GetUser_emailsAggregateType<T>>

    /**
     * Group by User_emails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {user_emailsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends user_emailsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: user_emailsGroupByArgs['orderBy'] }
        : { orderBy?: user_emailsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, user_emailsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUser_emailsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the user_emails model
   */
  readonly fields: user_emailsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for user_emails.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__user_emailsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    users<T extends usersDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usersDefaultArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the user_emails model
   */ 
  interface user_emailsFieldRefs {
    readonly id: FieldRef<"user_emails", 'Int'>
    readonly user_id: FieldRef<"user_emails", 'Int'>
    readonly email: FieldRef<"user_emails", 'String'>
    readonly is_verified: FieldRef<"user_emails", 'Boolean'>
    readonly is_primary: FieldRef<"user_emails", 'Boolean'>
    readonly created_at: FieldRef<"user_emails", 'DateTime'>
    readonly updated_at: FieldRef<"user_emails", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * user_emails findUnique
   */
  export type user_emailsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter, which user_emails to fetch.
     */
    where: user_emailsWhereUniqueInput
  }

  /**
   * user_emails findUniqueOrThrow
   */
  export type user_emailsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter, which user_emails to fetch.
     */
    where: user_emailsWhereUniqueInput
  }

  /**
   * user_emails findFirst
   */
  export type user_emailsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter, which user_emails to fetch.
     */
    where?: user_emailsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_emails to fetch.
     */
    orderBy?: user_emailsOrderByWithRelationInput | user_emailsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for user_emails.
     */
    cursor?: user_emailsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_emails from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_emails.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of user_emails.
     */
    distinct?: User_emailsScalarFieldEnum | User_emailsScalarFieldEnum[]
  }

  /**
   * user_emails findFirstOrThrow
   */
  export type user_emailsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter, which user_emails to fetch.
     */
    where?: user_emailsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_emails to fetch.
     */
    orderBy?: user_emailsOrderByWithRelationInput | user_emailsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for user_emails.
     */
    cursor?: user_emailsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_emails from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_emails.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of user_emails.
     */
    distinct?: User_emailsScalarFieldEnum | User_emailsScalarFieldEnum[]
  }

  /**
   * user_emails findMany
   */
  export type user_emailsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter, which user_emails to fetch.
     */
    where?: user_emailsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of user_emails to fetch.
     */
    orderBy?: user_emailsOrderByWithRelationInput | user_emailsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing user_emails.
     */
    cursor?: user_emailsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` user_emails from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` user_emails.
     */
    skip?: number
    distinct?: User_emailsScalarFieldEnum | User_emailsScalarFieldEnum[]
  }

  /**
   * user_emails create
   */
  export type user_emailsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * The data needed to create a user_emails.
     */
    data: XOR<user_emailsCreateInput, user_emailsUncheckedCreateInput>
  }

  /**
   * user_emails createMany
   */
  export type user_emailsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many user_emails.
     */
    data: user_emailsCreateManyInput | user_emailsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * user_emails createManyAndReturn
   */
  export type user_emailsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many user_emails.
     */
    data: user_emailsCreateManyInput | user_emailsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * user_emails update
   */
  export type user_emailsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * The data needed to update a user_emails.
     */
    data: XOR<user_emailsUpdateInput, user_emailsUncheckedUpdateInput>
    /**
     * Choose, which user_emails to update.
     */
    where: user_emailsWhereUniqueInput
  }

  /**
   * user_emails updateMany
   */
  export type user_emailsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update user_emails.
     */
    data: XOR<user_emailsUpdateManyMutationInput, user_emailsUncheckedUpdateManyInput>
    /**
     * Filter which user_emails to update
     */
    where?: user_emailsWhereInput
  }

  /**
   * user_emails upsert
   */
  export type user_emailsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * The filter to search for the user_emails to update in case it exists.
     */
    where: user_emailsWhereUniqueInput
    /**
     * In case the user_emails found by the `where` argument doesn't exist, create a new user_emails with this data.
     */
    create: XOR<user_emailsCreateInput, user_emailsUncheckedCreateInput>
    /**
     * In case the user_emails was found with the provided `where` argument, update it with this data.
     */
    update: XOR<user_emailsUpdateInput, user_emailsUncheckedUpdateInput>
  }

  /**
   * user_emails delete
   */
  export type user_emailsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    /**
     * Filter which user_emails to delete.
     */
    where: user_emailsWhereUniqueInput
  }

  /**
   * user_emails deleteMany
   */
  export type user_emailsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which user_emails to delete
     */
    where?: user_emailsWhereInput
  }

  /**
   * user_emails without action
   */
  export type user_emailsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
  }


  /**
   * Model users
   */

  export type AggregateUsers = {
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  export type UsersAvgAggregateOutputType = {
    id: number | null
  }

  export type UsersSumAggregateOutputType = {
    id: number | null
  }

  export type UsersMinAggregateOutputType = {
    id: number | null
    username: string | null
    name: string | null
    avatar_url: string | null
    is_admin: boolean | null
    is_verified: boolean | null
    created_at: Date | null
    updated_at: Date | null
    intro: string | null
    bio: string | null
    user_location: string | null
    free_until: Date | null
  }

  export type UsersMaxAggregateOutputType = {
    id: number | null
    username: string | null
    name: string | null
    avatar_url: string | null
    is_admin: boolean | null
    is_verified: boolean | null
    created_at: Date | null
    updated_at: Date | null
    intro: string | null
    bio: string | null
    user_location: string | null
    free_until: Date | null
  }

  export type UsersCountAggregateOutputType = {
    id: number
    username: number
    name: number
    avatar_url: number
    is_admin: number
    is_verified: number
    created_at: number
    updated_at: number
    intro: number
    bio: number
    user_location: number
    img_urls: number
    free_until: number
    _all: number
  }


  export type UsersAvgAggregateInputType = {
    id?: true
  }

  export type UsersSumAggregateInputType = {
    id?: true
  }

  export type UsersMinAggregateInputType = {
    id?: true
    username?: true
    name?: true
    avatar_url?: true
    is_admin?: true
    is_verified?: true
    created_at?: true
    updated_at?: true
    intro?: true
    bio?: true
    user_location?: true
    free_until?: true
  }

  export type UsersMaxAggregateInputType = {
    id?: true
    username?: true
    name?: true
    avatar_url?: true
    is_admin?: true
    is_verified?: true
    created_at?: true
    updated_at?: true
    intro?: true
    bio?: true
    user_location?: true
    free_until?: true
  }

  export type UsersCountAggregateInputType = {
    id?: true
    username?: true
    name?: true
    avatar_url?: true
    is_admin?: true
    is_verified?: true
    created_at?: true
    updated_at?: true
    intro?: true
    bio?: true
    user_location?: true
    img_urls?: true
    free_until?: true
    _all?: true
  }

  export type UsersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to aggregate.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned users
    **/
    _count?: true | UsersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsersMaxAggregateInputType
  }

  export type GetUsersAggregateType<T extends UsersAggregateArgs> = {
        [P in keyof T & keyof AggregateUsers]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsers[P]>
      : GetScalarType<T[P], AggregateUsers[P]>
  }




  export type usersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: usersWhereInput
    orderBy?: usersOrderByWithAggregationInput | usersOrderByWithAggregationInput[]
    by: UsersScalarFieldEnum[] | UsersScalarFieldEnum
    having?: usersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsersCountAggregateInputType | true
    _avg?: UsersAvgAggregateInputType
    _sum?: UsersSumAggregateInputType
    _min?: UsersMinAggregateInputType
    _max?: UsersMaxAggregateInputType
  }

  export type UsersGroupByOutputType = {
    id: number
    username: string
    name: string | null
    avatar_url: string | null
    is_admin: boolean
    is_verified: boolean
    created_at: Date
    updated_at: Date
    intro: string | null
    bio: string | null
    user_location: string | null
    img_urls: string[]
    free_until: Date | null
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  type GetUsersGroupByPayload<T extends usersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsersGroupByOutputType[P]>
            : GetScalarType<T[P], UsersGroupByOutputType[P]>
        }
      >
    >


  export type usersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    name?: boolean
    avatar_url?: boolean
    is_admin?: boolean
    is_verified?: boolean
    created_at?: boolean
    updated_at?: boolean
    intro?: boolean
    bio?: boolean
    user_location?: boolean
    img_urls?: boolean
    free_until?: boolean
    lilies?: boolean | users$liliesArgs<ExtArgs>
    lists?: boolean | users$listsArgs<ExtArgs>
    stripe_customers?: boolean | users$stripe_customersArgs<ExtArgs>
    stripe_subscriptions?: boolean | users$stripe_subscriptionsArgs<ExtArgs>
    user_authentications?: boolean | users$user_authenticationsArgs<ExtArgs>
    user_emails?: boolean | users$user_emailsArgs<ExtArgs>
    _count?: boolean | UsersCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["users"]>

  export type usersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    name?: boolean
    avatar_url?: boolean
    is_admin?: boolean
    is_verified?: boolean
    created_at?: boolean
    updated_at?: boolean
    intro?: boolean
    bio?: boolean
    user_location?: boolean
    img_urls?: boolean
    free_until?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectScalar = {
    id?: boolean
    username?: boolean
    name?: boolean
    avatar_url?: boolean
    is_admin?: boolean
    is_verified?: boolean
    created_at?: boolean
    updated_at?: boolean
    intro?: boolean
    bio?: boolean
    user_location?: boolean
    img_urls?: boolean
    free_until?: boolean
  }

  export type usersInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | users$liliesArgs<ExtArgs>
    lists?: boolean | users$listsArgs<ExtArgs>
    stripe_customers?: boolean | users$stripe_customersArgs<ExtArgs>
    stripe_subscriptions?: boolean | users$stripe_subscriptionsArgs<ExtArgs>
    user_authentications?: boolean | users$user_authenticationsArgs<ExtArgs>
    user_emails?: boolean | users$user_emailsArgs<ExtArgs>
    _count?: boolean | UsersCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type usersIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $usersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "users"
    objects: {
      lilies: Prisma.$liliesPayload<ExtArgs>[]
      lists: Prisma.$listsPayload<ExtArgs>[]
      stripe_customers: Prisma.$stripe_customersPayload<ExtArgs> | null
      stripe_subscriptions: Prisma.$stripe_subscriptionsPayload<ExtArgs> | null
      user_authentications: Prisma.$user_authenticationsPayload<ExtArgs>[]
      user_emails: Prisma.$user_emailsPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      username: string
      name: string | null
      avatar_url: string | null
      is_admin: boolean
      is_verified: boolean
      created_at: Date
      updated_at: Date
      intro: string | null
      bio: string | null
      user_location: string | null
      img_urls: string[]
      free_until: Date | null
    }, ExtArgs["result"]["users"]>
    composites: {}
  }

  type usersGetPayload<S extends boolean | null | undefined | usersDefaultArgs> = $Result.GetResult<Prisma.$usersPayload, S>

  type usersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<usersFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UsersCountAggregateInputType | true
    }

  export interface usersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['users'], meta: { name: 'users' } }
    /**
     * Find zero or one Users that matches the filter.
     * @param {usersFindUniqueArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends usersFindUniqueArgs>(args: SelectSubset<T, usersFindUniqueArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Users that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {usersFindUniqueOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends usersFindUniqueOrThrowArgs>(args: SelectSubset<T, usersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends usersFindFirstArgs>(args?: SelectSubset<T, usersFindFirstArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Users that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends usersFindFirstOrThrowArgs>(args?: SelectSubset<T, usersFindFirstOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.users.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.users.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usersWithIdOnly = await prisma.users.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends usersFindManyArgs>(args?: SelectSubset<T, usersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Users.
     * @param {usersCreateArgs} args - Arguments to create a Users.
     * @example
     * // Create one Users
     * const Users = await prisma.users.create({
     *   data: {
     *     // ... data to create a Users
     *   }
     * })
     * 
     */
    create<T extends usersCreateArgs>(args: SelectSubset<T, usersCreateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {usersCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends usersCreateManyArgs>(args?: SelectSubset<T, usersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {usersCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const usersWithIdOnly = await prisma.users.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends usersCreateManyAndReturnArgs>(args?: SelectSubset<T, usersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Users.
     * @param {usersDeleteArgs} args - Arguments to delete one Users.
     * @example
     * // Delete one Users
     * const Users = await prisma.users.delete({
     *   where: {
     *     // ... filter to delete one Users
     *   }
     * })
     * 
     */
    delete<T extends usersDeleteArgs>(args: SelectSubset<T, usersDeleteArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Users.
     * @param {usersUpdateArgs} args - Arguments to update one Users.
     * @example
     * // Update one Users
     * const users = await prisma.users.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends usersUpdateArgs>(args: SelectSubset<T, usersUpdateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {usersDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.users.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends usersDeleteManyArgs>(args?: SelectSubset<T, usersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const users = await prisma.users.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends usersUpdateManyArgs>(args: SelectSubset<T, usersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Users.
     * @param {usersUpsertArgs} args - Arguments to update or create a Users.
     * @example
     * // Update or create a Users
     * const users = await prisma.users.upsert({
     *   create: {
     *     // ... data to create a Users
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Users we want to update
     *   }
     * })
     */
    upsert<T extends usersUpsertArgs>(args: SelectSubset<T, usersUpsertArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.users.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends usersCountArgs>(
      args?: Subset<T, usersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsersAggregateArgs>(args: Subset<T, UsersAggregateArgs>): Prisma.PrismaPromise<GetUsersAggregateType<T>>

    /**
     * Group by Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends usersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: usersGroupByArgs['orderBy'] }
        : { orderBy?: usersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, usersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the users model
   */
  readonly fields: usersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for users.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__usersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lilies<T extends users$liliesArgs<ExtArgs> = {}>(args?: Subset<T, users$liliesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$liliesPayload<ExtArgs>, T, "findMany"> | Null>
    lists<T extends users$listsArgs<ExtArgs> = {}>(args?: Subset<T, users$listsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$listsPayload<ExtArgs>, T, "findMany"> | Null>
    stripe_customers<T extends users$stripe_customersArgs<ExtArgs> = {}>(args?: Subset<T, users$stripe_customersArgs<ExtArgs>>): Prisma__stripe_customersClient<$Result.GetResult<Prisma.$stripe_customersPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    stripe_subscriptions<T extends users$stripe_subscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, users$stripe_subscriptionsArgs<ExtArgs>>): Prisma__stripe_subscriptionsClient<$Result.GetResult<Prisma.$stripe_subscriptionsPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    user_authentications<T extends users$user_authenticationsArgs<ExtArgs> = {}>(args?: Subset<T, users$user_authenticationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_authenticationsPayload<ExtArgs>, T, "findMany"> | Null>
    user_emails<T extends users$user_emailsArgs<ExtArgs> = {}>(args?: Subset<T, users$user_emailsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$user_emailsPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the users model
   */ 
  interface usersFieldRefs {
    readonly id: FieldRef<"users", 'Int'>
    readonly username: FieldRef<"users", 'String'>
    readonly name: FieldRef<"users", 'String'>
    readonly avatar_url: FieldRef<"users", 'String'>
    readonly is_admin: FieldRef<"users", 'Boolean'>
    readonly is_verified: FieldRef<"users", 'Boolean'>
    readonly created_at: FieldRef<"users", 'DateTime'>
    readonly updated_at: FieldRef<"users", 'DateTime'>
    readonly intro: FieldRef<"users", 'String'>
    readonly bio: FieldRef<"users", 'String'>
    readonly user_location: FieldRef<"users", 'String'>
    readonly img_urls: FieldRef<"users", 'String[]'>
    readonly free_until: FieldRef<"users", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * users findUnique
   */
  export type usersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findUniqueOrThrow
   */
  export type usersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findFirst
   */
  export type usersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findFirstOrThrow
   */
  export type usersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findMany
   */
  export type usersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users create
   */
  export type usersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * The data needed to create a users.
     */
    data: XOR<usersCreateInput, usersUncheckedCreateInput>
  }

  /**
   * users createMany
   */
  export type usersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * users createManyAndReturn
   */
  export type usersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * users update
   */
  export type usersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * The data needed to update a users.
     */
    data: XOR<usersUpdateInput, usersUncheckedUpdateInput>
    /**
     * Choose, which users to update.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users updateMany
   */
  export type usersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update users.
     */
    data: XOR<usersUpdateManyMutationInput, usersUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: usersWhereInput
  }

  /**
   * users upsert
   */
  export type usersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * The filter to search for the users to update in case it exists.
     */
    where: usersWhereUniqueInput
    /**
     * In case the users found by the `where` argument doesn't exist, create a new users with this data.
     */
    create: XOR<usersCreateInput, usersUncheckedCreateInput>
    /**
     * In case the users was found with the provided `where` argument, update it with this data.
     */
    update: XOR<usersUpdateInput, usersUncheckedUpdateInput>
  }

  /**
   * users delete
   */
  export type usersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
    /**
     * Filter which users to delete.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users deleteMany
   */
  export type usersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to delete
     */
    where?: usersWhereInput
  }

  /**
   * users.lilies
   */
  export type users$liliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lilies
     */
    select?: liliesSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: liliesInclude<ExtArgs> | null
    where?: liliesWhereInput
    orderBy?: liliesOrderByWithRelationInput | liliesOrderByWithRelationInput[]
    cursor?: liliesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LiliesScalarFieldEnum | LiliesScalarFieldEnum[]
  }

  /**
   * users.lists
   */
  export type users$listsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the lists
     */
    select?: listsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: listsInclude<ExtArgs> | null
    where?: listsWhereInput
    orderBy?: listsOrderByWithRelationInput | listsOrderByWithRelationInput[]
    cursor?: listsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListsScalarFieldEnum | ListsScalarFieldEnum[]
  }

  /**
   * users.stripe_customers
   */
  export type users$stripe_customersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_customers
     */
    select?: stripe_customersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_customersInclude<ExtArgs> | null
    where?: stripe_customersWhereInput
  }

  /**
   * users.stripe_subscriptions
   */
  export type users$stripe_subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the stripe_subscriptions
     */
    select?: stripe_subscriptionsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: stripe_subscriptionsInclude<ExtArgs> | null
    where?: stripe_subscriptionsWhereInput
  }

  /**
   * users.user_authentications
   */
  export type users$user_authenticationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_authentications
     */
    select?: user_authenticationsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_authenticationsInclude<ExtArgs> | null
    where?: user_authenticationsWhereInput
    orderBy?: user_authenticationsOrderByWithRelationInput | user_authenticationsOrderByWithRelationInput[]
    cursor?: user_authenticationsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: User_authenticationsScalarFieldEnum | User_authenticationsScalarFieldEnum[]
  }

  /**
   * users.user_emails
   */
  export type users$user_emailsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user_emails
     */
    select?: user_emailsSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: user_emailsInclude<ExtArgs> | null
    where?: user_emailsWhereInput
    orderBy?: user_emailsOrderByWithRelationInput | user_emailsOrderByWithRelationInput[]
    cursor?: user_emailsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: User_emailsScalarFieldEnum | User_emailsScalarFieldEnum[]
  }

  /**
   * users without action
   */
  export type usersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usersInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const Ahs_dataScalarFieldEnum: {
    id: 'id',
    ahs_id: 'ahs_id',
    name: 'name',
    hybridizer: 'hybridizer',
    year: 'year',
    scape_height: 'scape_height',
    bloom_size: 'bloom_size',
    bloom_season: 'bloom_season',
    ploidy: 'ploidy',
    foliage_type: 'foliage_type',
    bloom_habit: 'bloom_habit',
    seedling_num: 'seedling_num',
    color: 'color',
    form: 'form',
    parentage: 'parentage',
    image: 'image',
    fragrance: 'fragrance',
    budcount: 'budcount',
    branches: 'branches',
    sculpting: 'sculpting',
    foliage: 'foliage',
    flower: 'flower',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Ahs_dataScalarFieldEnum = (typeof Ahs_dataScalarFieldEnum)[keyof typeof Ahs_dataScalarFieldEnum]


  export const LiliesScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    name: 'name',
    img_url: 'img_url',
    price: 'price',
    public_note: 'public_note',
    private_note: 'private_note',
    ahs_id: 'ahs_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    list_id: 'list_id',
    ahs_ref: 'ahs_ref'
  };

  export type LiliesScalarFieldEnum = (typeof LiliesScalarFieldEnum)[keyof typeof LiliesScalarFieldEnum]


  export const ListsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    name: 'name',
    intro: 'intro',
    bio: 'bio',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type ListsScalarFieldEnum = (typeof ListsScalarFieldEnum)[keyof typeof ListsScalarFieldEnum]


  export const Stripe_customersScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Stripe_customersScalarFieldEnum = (typeof Stripe_customersScalarFieldEnum)[keyof typeof Stripe_customersScalarFieldEnum]


  export const Stripe_subscriptionsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    customer_id: 'customer_id',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Stripe_subscriptionsScalarFieldEnum = (typeof Stripe_subscriptionsScalarFieldEnum)[keyof typeof Stripe_subscriptionsScalarFieldEnum]


  export const User_authenticationsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    service: 'service',
    identifier: 'identifier',
    details: 'details',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type User_authenticationsScalarFieldEnum = (typeof User_authenticationsScalarFieldEnum)[keyof typeof User_authenticationsScalarFieldEnum]


  export const User_emailsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    email: 'email',
    is_verified: 'is_verified',
    is_primary: 'is_primary',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type User_emailsScalarFieldEnum = (typeof User_emailsScalarFieldEnum)[keyof typeof User_emailsScalarFieldEnum]


  export const UsersScalarFieldEnum: {
    id: 'id',
    username: 'username',
    name: 'name',
    avatar_url: 'avatar_url',
    is_admin: 'is_admin',
    is_verified: 'is_verified',
    created_at: 'created_at',
    updated_at: 'updated_at',
    intro: 'intro',
    bio: 'bio',
    user_location: 'user_location',
    img_urls: 'img_urls',
    free_until: 'free_until'
  };

  export type UsersScalarFieldEnum = (typeof UsersScalarFieldEnum)[keyof typeof UsersScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type ahs_dataWhereInput = {
    AND?: ahs_dataWhereInput | ahs_dataWhereInput[]
    OR?: ahs_dataWhereInput[]
    NOT?: ahs_dataWhereInput | ahs_dataWhereInput[]
    id?: IntFilter<"ahs_data"> | number
    ahs_id?: IntFilter<"ahs_data"> | number
    name?: StringNullableFilter<"ahs_data"> | string | null
    hybridizer?: StringNullableFilter<"ahs_data"> | string | null
    year?: StringNullableFilter<"ahs_data"> | string | null
    scape_height?: StringNullableFilter<"ahs_data"> | string | null
    bloom_size?: StringNullableFilter<"ahs_data"> | string | null
    bloom_season?: StringNullableFilter<"ahs_data"> | string | null
    ploidy?: StringNullableFilter<"ahs_data"> | string | null
    foliage_type?: StringNullableFilter<"ahs_data"> | string | null
    bloom_habit?: StringNullableFilter<"ahs_data"> | string | null
    seedling_num?: StringNullableFilter<"ahs_data"> | string | null
    color?: StringNullableFilter<"ahs_data"> | string | null
    form?: StringNullableFilter<"ahs_data"> | string | null
    parentage?: StringNullableFilter<"ahs_data"> | string | null
    image?: StringNullableFilter<"ahs_data"> | string | null
    fragrance?: StringNullableFilter<"ahs_data"> | string | null
    budcount?: StringNullableFilter<"ahs_data"> | string | null
    branches?: StringNullableFilter<"ahs_data"> | string | null
    sculpting?: StringNullableFilter<"ahs_data"> | string | null
    foliage?: StringNullableFilter<"ahs_data"> | string | null
    flower?: StringNullableFilter<"ahs_data"> | string | null
    created_at?: DateTimeFilter<"ahs_data"> | Date | string
    updated_at?: DateTimeFilter<"ahs_data"> | Date | string
    lilies?: LiliesListRelationFilter
  }

  export type ahs_dataOrderByWithRelationInput = {
    id?: SortOrder
    ahs_id?: SortOrder
    name?: SortOrderInput | SortOrder
    hybridizer?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    scape_height?: SortOrderInput | SortOrder
    bloom_size?: SortOrderInput | SortOrder
    bloom_season?: SortOrderInput | SortOrder
    ploidy?: SortOrderInput | SortOrder
    foliage_type?: SortOrderInput | SortOrder
    bloom_habit?: SortOrderInput | SortOrder
    seedling_num?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    form?: SortOrderInput | SortOrder
    parentage?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    fragrance?: SortOrderInput | SortOrder
    budcount?: SortOrderInput | SortOrder
    branches?: SortOrderInput | SortOrder
    sculpting?: SortOrderInput | SortOrder
    foliage?: SortOrderInput | SortOrder
    flower?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lilies?: liliesOrderByRelationAggregateInput
  }

  export type ahs_dataWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    ahs_id?: number
    AND?: ahs_dataWhereInput | ahs_dataWhereInput[]
    OR?: ahs_dataWhereInput[]
    NOT?: ahs_dataWhereInput | ahs_dataWhereInput[]
    name?: StringNullableFilter<"ahs_data"> | string | null
    hybridizer?: StringNullableFilter<"ahs_data"> | string | null
    year?: StringNullableFilter<"ahs_data"> | string | null
    scape_height?: StringNullableFilter<"ahs_data"> | string | null
    bloom_size?: StringNullableFilter<"ahs_data"> | string | null
    bloom_season?: StringNullableFilter<"ahs_data"> | string | null
    ploidy?: StringNullableFilter<"ahs_data"> | string | null
    foliage_type?: StringNullableFilter<"ahs_data"> | string | null
    bloom_habit?: StringNullableFilter<"ahs_data"> | string | null
    seedling_num?: StringNullableFilter<"ahs_data"> | string | null
    color?: StringNullableFilter<"ahs_data"> | string | null
    form?: StringNullableFilter<"ahs_data"> | string | null
    parentage?: StringNullableFilter<"ahs_data"> | string | null
    image?: StringNullableFilter<"ahs_data"> | string | null
    fragrance?: StringNullableFilter<"ahs_data"> | string | null
    budcount?: StringNullableFilter<"ahs_data"> | string | null
    branches?: StringNullableFilter<"ahs_data"> | string | null
    sculpting?: StringNullableFilter<"ahs_data"> | string | null
    foliage?: StringNullableFilter<"ahs_data"> | string | null
    flower?: StringNullableFilter<"ahs_data"> | string | null
    created_at?: DateTimeFilter<"ahs_data"> | Date | string
    updated_at?: DateTimeFilter<"ahs_data"> | Date | string
    lilies?: LiliesListRelationFilter
  }, "id" | "ahs_id">

  export type ahs_dataOrderByWithAggregationInput = {
    id?: SortOrder
    ahs_id?: SortOrder
    name?: SortOrderInput | SortOrder
    hybridizer?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    scape_height?: SortOrderInput | SortOrder
    bloom_size?: SortOrderInput | SortOrder
    bloom_season?: SortOrderInput | SortOrder
    ploidy?: SortOrderInput | SortOrder
    foliage_type?: SortOrderInput | SortOrder
    bloom_habit?: SortOrderInput | SortOrder
    seedling_num?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    form?: SortOrderInput | SortOrder
    parentage?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    fragrance?: SortOrderInput | SortOrder
    budcount?: SortOrderInput | SortOrder
    branches?: SortOrderInput | SortOrder
    sculpting?: SortOrderInput | SortOrder
    foliage?: SortOrderInput | SortOrder
    flower?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: ahs_dataCountOrderByAggregateInput
    _avg?: ahs_dataAvgOrderByAggregateInput
    _max?: ahs_dataMaxOrderByAggregateInput
    _min?: ahs_dataMinOrderByAggregateInput
    _sum?: ahs_dataSumOrderByAggregateInput
  }

  export type ahs_dataScalarWhereWithAggregatesInput = {
    AND?: ahs_dataScalarWhereWithAggregatesInput | ahs_dataScalarWhereWithAggregatesInput[]
    OR?: ahs_dataScalarWhereWithAggregatesInput[]
    NOT?: ahs_dataScalarWhereWithAggregatesInput | ahs_dataScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ahs_data"> | number
    ahs_id?: IntWithAggregatesFilter<"ahs_data"> | number
    name?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    hybridizer?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    year?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    scape_height?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    bloom_size?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    bloom_season?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    ploidy?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    foliage_type?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    bloom_habit?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    seedling_num?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    color?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    form?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    parentage?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    image?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    fragrance?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    budcount?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    branches?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    sculpting?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    foliage?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    flower?: StringNullableWithAggregatesFilter<"ahs_data"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"ahs_data"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"ahs_data"> | Date | string
  }

  export type liliesWhereInput = {
    AND?: liliesWhereInput | liliesWhereInput[]
    OR?: liliesWhereInput[]
    NOT?: liliesWhereInput | liliesWhereInput[]
    id?: IntFilter<"lilies"> | number
    user_id?: IntFilter<"lilies"> | number
    name?: StringFilter<"lilies"> | string
    img_url?: StringNullableListFilter<"lilies">
    price?: DecimalNullableFilter<"lilies"> | Decimal | DecimalJsLike | number | string | null
    public_note?: StringNullableFilter<"lilies"> | string | null
    private_note?: StringNullableFilter<"lilies"> | string | null
    ahs_id?: StringNullableFilter<"lilies"> | string | null
    created_at?: DateTimeFilter<"lilies"> | Date | string
    updated_at?: DateTimeFilter<"lilies"> | Date | string
    list_id?: IntNullableFilter<"lilies"> | number | null
    ahs_ref?: IntNullableFilter<"lilies"> | number | null
    ahs_data?: XOR<Ahs_dataNullableRelationFilter, ahs_dataWhereInput> | null
    lists?: XOR<ListsNullableRelationFilter, listsWhereInput> | null
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }

  export type liliesOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    img_url?: SortOrder
    price?: SortOrderInput | SortOrder
    public_note?: SortOrderInput | SortOrder
    private_note?: SortOrderInput | SortOrder
    ahs_id?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    list_id?: SortOrderInput | SortOrder
    ahs_ref?: SortOrderInput | SortOrder
    ahs_data?: ahs_dataOrderByWithRelationInput
    lists?: listsOrderByWithRelationInput
    users?: usersOrderByWithRelationInput
  }

  export type liliesWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: liliesWhereInput | liliesWhereInput[]
    OR?: liliesWhereInput[]
    NOT?: liliesWhereInput | liliesWhereInput[]
    user_id?: IntFilter<"lilies"> | number
    name?: StringFilter<"lilies"> | string
    img_url?: StringNullableListFilter<"lilies">
    price?: DecimalNullableFilter<"lilies"> | Decimal | DecimalJsLike | number | string | null
    public_note?: StringNullableFilter<"lilies"> | string | null
    private_note?: StringNullableFilter<"lilies"> | string | null
    ahs_id?: StringNullableFilter<"lilies"> | string | null
    created_at?: DateTimeFilter<"lilies"> | Date | string
    updated_at?: DateTimeFilter<"lilies"> | Date | string
    list_id?: IntNullableFilter<"lilies"> | number | null
    ahs_ref?: IntNullableFilter<"lilies"> | number | null
    ahs_data?: XOR<Ahs_dataNullableRelationFilter, ahs_dataWhereInput> | null
    lists?: XOR<ListsNullableRelationFilter, listsWhereInput> | null
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }, "id">

  export type liliesOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    img_url?: SortOrder
    price?: SortOrderInput | SortOrder
    public_note?: SortOrderInput | SortOrder
    private_note?: SortOrderInput | SortOrder
    ahs_id?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    list_id?: SortOrderInput | SortOrder
    ahs_ref?: SortOrderInput | SortOrder
    _count?: liliesCountOrderByAggregateInput
    _avg?: liliesAvgOrderByAggregateInput
    _max?: liliesMaxOrderByAggregateInput
    _min?: liliesMinOrderByAggregateInput
    _sum?: liliesSumOrderByAggregateInput
  }

  export type liliesScalarWhereWithAggregatesInput = {
    AND?: liliesScalarWhereWithAggregatesInput | liliesScalarWhereWithAggregatesInput[]
    OR?: liliesScalarWhereWithAggregatesInput[]
    NOT?: liliesScalarWhereWithAggregatesInput | liliesScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"lilies"> | number
    user_id?: IntWithAggregatesFilter<"lilies"> | number
    name?: StringWithAggregatesFilter<"lilies"> | string
    img_url?: StringNullableListFilter<"lilies">
    price?: DecimalNullableWithAggregatesFilter<"lilies"> | Decimal | DecimalJsLike | number | string | null
    public_note?: StringNullableWithAggregatesFilter<"lilies"> | string | null
    private_note?: StringNullableWithAggregatesFilter<"lilies"> | string | null
    ahs_id?: StringNullableWithAggregatesFilter<"lilies"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"lilies"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"lilies"> | Date | string
    list_id?: IntNullableWithAggregatesFilter<"lilies"> | number | null
    ahs_ref?: IntNullableWithAggregatesFilter<"lilies"> | number | null
  }

  export type listsWhereInput = {
    AND?: listsWhereInput | listsWhereInput[]
    OR?: listsWhereInput[]
    NOT?: listsWhereInput | listsWhereInput[]
    id?: IntFilter<"lists"> | number
    user_id?: IntFilter<"lists"> | number
    name?: StringFilter<"lists"> | string
    intro?: StringNullableFilter<"lists"> | string | null
    bio?: StringNullableFilter<"lists"> | string | null
    created_at?: DateTimeFilter<"lists"> | Date | string
    updated_at?: DateTimeFilter<"lists"> | Date | string
    lilies?: LiliesListRelationFilter
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }

  export type listsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    intro?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lilies?: liliesOrderByRelationAggregateInput
    users?: usersOrderByWithRelationInput
  }

  export type listsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: listsWhereInput | listsWhereInput[]
    OR?: listsWhereInput[]
    NOT?: listsWhereInput | listsWhereInput[]
    user_id?: IntFilter<"lists"> | number
    name?: StringFilter<"lists"> | string
    intro?: StringNullableFilter<"lists"> | string | null
    bio?: StringNullableFilter<"lists"> | string | null
    created_at?: DateTimeFilter<"lists"> | Date | string
    updated_at?: DateTimeFilter<"lists"> | Date | string
    lilies?: LiliesListRelationFilter
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }, "id">

  export type listsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    intro?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: listsCountOrderByAggregateInput
    _avg?: listsAvgOrderByAggregateInput
    _max?: listsMaxOrderByAggregateInput
    _min?: listsMinOrderByAggregateInput
    _sum?: listsSumOrderByAggregateInput
  }

  export type listsScalarWhereWithAggregatesInput = {
    AND?: listsScalarWhereWithAggregatesInput | listsScalarWhereWithAggregatesInput[]
    OR?: listsScalarWhereWithAggregatesInput[]
    NOT?: listsScalarWhereWithAggregatesInput | listsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"lists"> | number
    user_id?: IntWithAggregatesFilter<"lists"> | number
    name?: StringWithAggregatesFilter<"lists"> | string
    intro?: StringNullableWithAggregatesFilter<"lists"> | string | null
    bio?: StringNullableWithAggregatesFilter<"lists"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"lists"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"lists"> | Date | string
  }

  export type stripe_customersWhereInput = {
    AND?: stripe_customersWhereInput | stripe_customersWhereInput[]
    OR?: stripe_customersWhereInput[]
    NOT?: stripe_customersWhereInput | stripe_customersWhereInput[]
    id?: StringFilter<"stripe_customers"> | string
    user_id?: IntFilter<"stripe_customers"> | number
    created_at?: DateTimeFilter<"stripe_customers"> | Date | string
    updated_at?: DateTimeFilter<"stripe_customers"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
    stripe_subscriptions?: XOR<Stripe_subscriptionsNullableRelationFilter, stripe_subscriptionsWhereInput> | null
  }

  export type stripe_customersOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    users?: usersOrderByWithRelationInput
    stripe_subscriptions?: stripe_subscriptionsOrderByWithRelationInput
  }

  export type stripe_customersWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    user_id?: number
    AND?: stripe_customersWhereInput | stripe_customersWhereInput[]
    OR?: stripe_customersWhereInput[]
    NOT?: stripe_customersWhereInput | stripe_customersWhereInput[]
    created_at?: DateTimeFilter<"stripe_customers"> | Date | string
    updated_at?: DateTimeFilter<"stripe_customers"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
    stripe_subscriptions?: XOR<Stripe_subscriptionsNullableRelationFilter, stripe_subscriptionsWhereInput> | null
  }, "id" | "user_id">

  export type stripe_customersOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: stripe_customersCountOrderByAggregateInput
    _avg?: stripe_customersAvgOrderByAggregateInput
    _max?: stripe_customersMaxOrderByAggregateInput
    _min?: stripe_customersMinOrderByAggregateInput
    _sum?: stripe_customersSumOrderByAggregateInput
  }

  export type stripe_customersScalarWhereWithAggregatesInput = {
    AND?: stripe_customersScalarWhereWithAggregatesInput | stripe_customersScalarWhereWithAggregatesInput[]
    OR?: stripe_customersScalarWhereWithAggregatesInput[]
    NOT?: stripe_customersScalarWhereWithAggregatesInput | stripe_customersScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"stripe_customers"> | string
    user_id?: IntWithAggregatesFilter<"stripe_customers"> | number
    created_at?: DateTimeWithAggregatesFilter<"stripe_customers"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"stripe_customers"> | Date | string
  }

  export type stripe_subscriptionsWhereInput = {
    AND?: stripe_subscriptionsWhereInput | stripe_subscriptionsWhereInput[]
    OR?: stripe_subscriptionsWhereInput[]
    NOT?: stripe_subscriptionsWhereInput | stripe_subscriptionsWhereInput[]
    id?: StringFilter<"stripe_subscriptions"> | string
    user_id?: IntFilter<"stripe_subscriptions"> | number
    customer_id?: StringFilter<"stripe_subscriptions"> | string
    created_at?: DateTimeFilter<"stripe_subscriptions"> | Date | string
    updated_at?: DateTimeFilter<"stripe_subscriptions"> | Date | string
    stripe_customers?: XOR<Stripe_customersRelationFilter, stripe_customersWhereInput>
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }

  export type stripe_subscriptionsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    customer_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    stripe_customers?: stripe_customersOrderByWithRelationInput
    users?: usersOrderByWithRelationInput
  }

  export type stripe_subscriptionsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    user_id?: number
    customer_id?: string
    AND?: stripe_subscriptionsWhereInput | stripe_subscriptionsWhereInput[]
    OR?: stripe_subscriptionsWhereInput[]
    NOT?: stripe_subscriptionsWhereInput | stripe_subscriptionsWhereInput[]
    created_at?: DateTimeFilter<"stripe_subscriptions"> | Date | string
    updated_at?: DateTimeFilter<"stripe_subscriptions"> | Date | string
    stripe_customers?: XOR<Stripe_customersRelationFilter, stripe_customersWhereInput>
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }, "id" | "user_id" | "customer_id">

  export type stripe_subscriptionsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    customer_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: stripe_subscriptionsCountOrderByAggregateInput
    _avg?: stripe_subscriptionsAvgOrderByAggregateInput
    _max?: stripe_subscriptionsMaxOrderByAggregateInput
    _min?: stripe_subscriptionsMinOrderByAggregateInput
    _sum?: stripe_subscriptionsSumOrderByAggregateInput
  }

  export type stripe_subscriptionsScalarWhereWithAggregatesInput = {
    AND?: stripe_subscriptionsScalarWhereWithAggregatesInput | stripe_subscriptionsScalarWhereWithAggregatesInput[]
    OR?: stripe_subscriptionsScalarWhereWithAggregatesInput[]
    NOT?: stripe_subscriptionsScalarWhereWithAggregatesInput | stripe_subscriptionsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"stripe_subscriptions"> | string
    user_id?: IntWithAggregatesFilter<"stripe_subscriptions"> | number
    customer_id?: StringWithAggregatesFilter<"stripe_subscriptions"> | string
    created_at?: DateTimeWithAggregatesFilter<"stripe_subscriptions"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"stripe_subscriptions"> | Date | string
  }

  export type user_authenticationsWhereInput = {
    AND?: user_authenticationsWhereInput | user_authenticationsWhereInput[]
    OR?: user_authenticationsWhereInput[]
    NOT?: user_authenticationsWhereInput | user_authenticationsWhereInput[]
    id?: IntFilter<"user_authentications"> | number
    user_id?: IntFilter<"user_authentications"> | number
    service?: StringFilter<"user_authentications"> | string
    identifier?: StringFilter<"user_authentications"> | string
    details?: JsonFilter<"user_authentications">
    created_at?: DateTimeFilter<"user_authentications"> | Date | string
    updated_at?: DateTimeFilter<"user_authentications"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }

  export type user_authenticationsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    service?: SortOrder
    identifier?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    users?: usersOrderByWithRelationInput
  }

  export type user_authenticationsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    service_identifier?: user_authenticationsServiceIdentifierCompoundUniqueInput
    AND?: user_authenticationsWhereInput | user_authenticationsWhereInput[]
    OR?: user_authenticationsWhereInput[]
    NOT?: user_authenticationsWhereInput | user_authenticationsWhereInput[]
    user_id?: IntFilter<"user_authentications"> | number
    service?: StringFilter<"user_authentications"> | string
    identifier?: StringFilter<"user_authentications"> | string
    details?: JsonFilter<"user_authentications">
    created_at?: DateTimeFilter<"user_authentications"> | Date | string
    updated_at?: DateTimeFilter<"user_authentications"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }, "id" | "service_identifier">

  export type user_authenticationsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    service?: SortOrder
    identifier?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: user_authenticationsCountOrderByAggregateInput
    _avg?: user_authenticationsAvgOrderByAggregateInput
    _max?: user_authenticationsMaxOrderByAggregateInput
    _min?: user_authenticationsMinOrderByAggregateInput
    _sum?: user_authenticationsSumOrderByAggregateInput
  }

  export type user_authenticationsScalarWhereWithAggregatesInput = {
    AND?: user_authenticationsScalarWhereWithAggregatesInput | user_authenticationsScalarWhereWithAggregatesInput[]
    OR?: user_authenticationsScalarWhereWithAggregatesInput[]
    NOT?: user_authenticationsScalarWhereWithAggregatesInput | user_authenticationsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"user_authentications"> | number
    user_id?: IntWithAggregatesFilter<"user_authentications"> | number
    service?: StringWithAggregatesFilter<"user_authentications"> | string
    identifier?: StringWithAggregatesFilter<"user_authentications"> | string
    details?: JsonWithAggregatesFilter<"user_authentications">
    created_at?: DateTimeWithAggregatesFilter<"user_authentications"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"user_authentications"> | Date | string
  }

  export type user_emailsWhereInput = {
    AND?: user_emailsWhereInput | user_emailsWhereInput[]
    OR?: user_emailsWhereInput[]
    NOT?: user_emailsWhereInput | user_emailsWhereInput[]
    id?: IntFilter<"user_emails"> | number
    user_id?: IntFilter<"user_emails"> | number
    email?: StringFilter<"user_emails"> | string
    is_verified?: BoolFilter<"user_emails"> | boolean
    is_primary?: BoolFilter<"user_emails"> | boolean
    created_at?: DateTimeFilter<"user_emails"> | Date | string
    updated_at?: DateTimeFilter<"user_emails"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }

  export type user_emailsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    email?: SortOrder
    is_verified?: SortOrder
    is_primary?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    users?: usersOrderByWithRelationInput
  }

  export type user_emailsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    user_id_email?: user_emailsUser_idEmailCompoundUniqueInput
    AND?: user_emailsWhereInput | user_emailsWhereInput[]
    OR?: user_emailsWhereInput[]
    NOT?: user_emailsWhereInput | user_emailsWhereInput[]
    user_id?: IntFilter<"user_emails"> | number
    email?: StringFilter<"user_emails"> | string
    is_verified?: BoolFilter<"user_emails"> | boolean
    is_primary?: BoolFilter<"user_emails"> | boolean
    created_at?: DateTimeFilter<"user_emails"> | Date | string
    updated_at?: DateTimeFilter<"user_emails"> | Date | string
    users?: XOR<UsersRelationFilter, usersWhereInput>
  }, "id" | "user_id_email">

  export type user_emailsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    email?: SortOrder
    is_verified?: SortOrder
    is_primary?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: user_emailsCountOrderByAggregateInput
    _avg?: user_emailsAvgOrderByAggregateInput
    _max?: user_emailsMaxOrderByAggregateInput
    _min?: user_emailsMinOrderByAggregateInput
    _sum?: user_emailsSumOrderByAggregateInput
  }

  export type user_emailsScalarWhereWithAggregatesInput = {
    AND?: user_emailsScalarWhereWithAggregatesInput | user_emailsScalarWhereWithAggregatesInput[]
    OR?: user_emailsScalarWhereWithAggregatesInput[]
    NOT?: user_emailsScalarWhereWithAggregatesInput | user_emailsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"user_emails"> | number
    user_id?: IntWithAggregatesFilter<"user_emails"> | number
    email?: StringWithAggregatesFilter<"user_emails"> | string
    is_verified?: BoolWithAggregatesFilter<"user_emails"> | boolean
    is_primary?: BoolWithAggregatesFilter<"user_emails"> | boolean
    created_at?: DateTimeWithAggregatesFilter<"user_emails"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"user_emails"> | Date | string
  }

  export type usersWhereInput = {
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    id?: IntFilter<"users"> | number
    username?: StringFilter<"users"> | string
    name?: StringNullableFilter<"users"> | string | null
    avatar_url?: StringNullableFilter<"users"> | string | null
    is_admin?: BoolFilter<"users"> | boolean
    is_verified?: BoolFilter<"users"> | boolean
    created_at?: DateTimeFilter<"users"> | Date | string
    updated_at?: DateTimeFilter<"users"> | Date | string
    intro?: StringNullableFilter<"users"> | string | null
    bio?: StringNullableFilter<"users"> | string | null
    user_location?: StringNullableFilter<"users"> | string | null
    img_urls?: StringNullableListFilter<"users">
    free_until?: DateTimeNullableFilter<"users"> | Date | string | null
    lilies?: LiliesListRelationFilter
    lists?: ListsListRelationFilter
    stripe_customers?: XOR<Stripe_customersNullableRelationFilter, stripe_customersWhereInput> | null
    stripe_subscriptions?: XOR<Stripe_subscriptionsNullableRelationFilter, stripe_subscriptionsWhereInput> | null
    user_authentications?: User_authenticationsListRelationFilter
    user_emails?: User_emailsListRelationFilter
  }

  export type usersOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrderInput | SortOrder
    avatar_url?: SortOrderInput | SortOrder
    is_admin?: SortOrder
    is_verified?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    intro?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    user_location?: SortOrderInput | SortOrder
    img_urls?: SortOrder
    free_until?: SortOrderInput | SortOrder
    lilies?: liliesOrderByRelationAggregateInput
    lists?: listsOrderByRelationAggregateInput
    stripe_customers?: stripe_customersOrderByWithRelationInput
    stripe_subscriptions?: stripe_subscriptionsOrderByWithRelationInput
    user_authentications?: user_authenticationsOrderByRelationAggregateInput
    user_emails?: user_emailsOrderByRelationAggregateInput
  }

  export type usersWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    username?: string
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    name?: StringNullableFilter<"users"> | string | null
    avatar_url?: StringNullableFilter<"users"> | string | null
    is_admin?: BoolFilter<"users"> | boolean
    is_verified?: BoolFilter<"users"> | boolean
    created_at?: DateTimeFilter<"users"> | Date | string
    updated_at?: DateTimeFilter<"users"> | Date | string
    intro?: StringNullableFilter<"users"> | string | null
    bio?: StringNullableFilter<"users"> | string | null
    user_location?: StringNullableFilter<"users"> | string | null
    img_urls?: StringNullableListFilter<"users">
    free_until?: DateTimeNullableFilter<"users"> | Date | string | null
    lilies?: LiliesListRelationFilter
    lists?: ListsListRelationFilter
    stripe_customers?: XOR<Stripe_customersNullableRelationFilter, stripe_customersWhereInput> | null
    stripe_subscriptions?: XOR<Stripe_subscriptionsNullableRelationFilter, stripe_subscriptionsWhereInput> | null
    user_authentications?: User_authenticationsListRelationFilter
    user_emails?: User_emailsListRelationFilter
  }, "id" | "username">

  export type usersOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrderInput | SortOrder
    avatar_url?: SortOrderInput | SortOrder
    is_admin?: SortOrder
    is_verified?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    intro?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    user_location?: SortOrderInput | SortOrder
    img_urls?: SortOrder
    free_until?: SortOrderInput | SortOrder
    _count?: usersCountOrderByAggregateInput
    _avg?: usersAvgOrderByAggregateInput
    _max?: usersMaxOrderByAggregateInput
    _min?: usersMinOrderByAggregateInput
    _sum?: usersSumOrderByAggregateInput
  }

  export type usersScalarWhereWithAggregatesInput = {
    AND?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    OR?: usersScalarWhereWithAggregatesInput[]
    NOT?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"users"> | number
    username?: StringWithAggregatesFilter<"users"> | string
    name?: StringNullableWithAggregatesFilter<"users"> | string | null
    avatar_url?: StringNullableWithAggregatesFilter<"users"> | string | null
    is_admin?: BoolWithAggregatesFilter<"users"> | boolean
    is_verified?: BoolWithAggregatesFilter<"users"> | boolean
    created_at?: DateTimeWithAggregatesFilter<"users"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"users"> | Date | string
    intro?: StringNullableWithAggregatesFilter<"users"> | string | null
    bio?: StringNullableWithAggregatesFilter<"users"> | string | null
    user_location?: StringNullableWithAggregatesFilter<"users"> | string | null
    img_urls?: StringNullableListFilter<"users">
    free_until?: DateTimeNullableWithAggregatesFilter<"users"> | Date | string | null
  }

  export type ahs_dataCreateInput = {
    ahs_id: number
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scape_height?: string | null
    bloom_size?: string | null
    bloom_season?: string | null
    ploidy?: string | null
    foliage_type?: string | null
    bloom_habit?: string | null
    seedling_num?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    image?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesCreateNestedManyWithoutAhs_dataInput
  }

  export type ahs_dataUncheckedCreateInput = {
    id?: number
    ahs_id: number
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scape_height?: string | null
    bloom_size?: string | null
    bloom_season?: string | null
    ploidy?: string | null
    foliage_type?: string | null
    bloom_habit?: string | null
    seedling_num?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    image?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesUncheckedCreateNestedManyWithoutAhs_dataInput
  }

  export type ahs_dataUpdateInput = {
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUpdateManyWithoutAhs_dataNestedInput
  }

  export type ahs_dataUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUncheckedUpdateManyWithoutAhs_dataNestedInput
  }

  export type ahs_dataCreateManyInput = {
    id?: number
    ahs_id: number
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scape_height?: string | null
    bloom_size?: string | null
    bloom_season?: string | null
    ploidy?: string | null
    foliage_type?: string | null
    bloom_habit?: string | null
    seedling_num?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    image?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ahs_dataUpdateManyMutationInput = {
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ahs_dataUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type liliesCreateInput = {
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    ahs_data?: ahs_dataCreateNestedOneWithoutLiliesInput
    lists?: listsCreateNestedOneWithoutLiliesInput
    users?: usersCreateNestedOneWithoutLiliesInput
  }

  export type liliesUncheckedCreateInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
    ahs_ref?: number | null
  }

  export type liliesUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ahs_data?: ahs_dataUpdateOneWithoutLiliesNestedInput
    lists?: listsUpdateOneWithoutLiliesNestedInput
    users?: usersUpdateOneRequiredWithoutLiliesNestedInput
  }

  export type liliesUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesCreateManyInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
    ahs_ref?: number | null
  }

  export type liliesUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type liliesUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type listsCreateInput = {
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesCreateNestedManyWithoutListsInput
    users?: usersCreateNestedOneWithoutListsInput
  }

  export type listsUncheckedCreateInput = {
    id?: number
    user_id?: number
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesUncheckedCreateNestedManyWithoutListsInput
  }

  export type listsUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUpdateManyWithoutListsNestedInput
    users?: usersUpdateOneRequiredWithoutListsNestedInput
  }

  export type listsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUncheckedUpdateManyWithoutListsNestedInput
  }

  export type listsCreateManyInput = {
    id?: number
    user_id?: number
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type listsUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type listsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_customersCreateInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    users?: usersCreateNestedOneWithoutStripe_customersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutStripe_customersInput
  }

  export type stripe_customersUncheckedCreateInput = {
    id: string
    user_id?: number
    created_at?: Date | string
    updated_at?: Date | string
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutStripe_customersInput
  }

  export type stripe_customersUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutStripe_customersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutStripe_customersNestedInput
  }

  export type stripe_customersUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutStripe_customersNestedInput
  }

  export type stripe_customersCreateManyInput = {
    id: string
    user_id?: number
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_customersUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_customersUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_subscriptionsCreateInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    stripe_customers: stripe_customersCreateNestedOneWithoutStripe_subscriptionsInput
    users?: usersCreateNestedOneWithoutStripe_subscriptionsInput
  }

  export type stripe_subscriptionsUncheckedCreateInput = {
    id: string
    user_id?: number
    customer_id: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_subscriptionsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    stripe_customers?: stripe_customersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput
    users?: usersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput
  }

  export type stripe_subscriptionsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    customer_id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_subscriptionsCreateManyInput = {
    id: string
    user_id?: number
    customer_id: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_subscriptionsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_subscriptionsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    customer_id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsCreateInput = {
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    users: usersCreateNestedOneWithoutUser_authenticationsInput
  }

  export type user_authenticationsUncheckedCreateInput = {
    id?: number
    user_id: number
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_authenticationsUpdateInput = {
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutUser_authenticationsNestedInput
  }

  export type user_authenticationsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsCreateManyInput = {
    id?: number
    user_id: number
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_authenticationsUpdateManyMutationInput = {
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsCreateInput = {
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    users?: usersCreateNestedOneWithoutUser_emailsInput
  }

  export type user_emailsUncheckedCreateInput = {
    id?: number
    user_id?: number
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_emailsUpdateInput = {
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutUser_emailsNestedInput
  }

  export type user_emailsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsCreateManyInput = {
    id?: number
    user_id?: number
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_emailsUpdateManyMutationInput = {
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type usersCreateInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type usersCreateManyInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
  }

  export type usersUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type usersUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type LiliesListRelationFilter = {
    every?: liliesWhereInput
    some?: liliesWhereInput
    none?: liliesWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type liliesOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ahs_dataCountOrderByAggregateInput = {
    id?: SortOrder
    ahs_id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scape_height?: SortOrder
    bloom_size?: SortOrder
    bloom_season?: SortOrder
    ploidy?: SortOrder
    foliage_type?: SortOrder
    bloom_habit?: SortOrder
    seedling_num?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    image?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ahs_dataAvgOrderByAggregateInput = {
    id?: SortOrder
    ahs_id?: SortOrder
  }

  export type ahs_dataMaxOrderByAggregateInput = {
    id?: SortOrder
    ahs_id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scape_height?: SortOrder
    bloom_size?: SortOrder
    bloom_season?: SortOrder
    ploidy?: SortOrder
    foliage_type?: SortOrder
    bloom_habit?: SortOrder
    seedling_num?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    image?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ahs_dataMinOrderByAggregateInput = {
    id?: SortOrder
    ahs_id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scape_height?: SortOrder
    bloom_size?: SortOrder
    bloom_season?: SortOrder
    ploidy?: SortOrder
    foliage_type?: SortOrder
    bloom_habit?: SortOrder
    seedling_num?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    image?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ahs_dataSumOrderByAggregateInput = {
    id?: SortOrder
    ahs_id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type Ahs_dataNullableRelationFilter = {
    is?: ahs_dataWhereInput | null
    isNot?: ahs_dataWhereInput | null
  }

  export type ListsNullableRelationFilter = {
    is?: listsWhereInput | null
    isNot?: listsWhereInput | null
  }

  export type UsersRelationFilter = {
    is?: usersWhereInput
    isNot?: usersWhereInput
  }

  export type liliesCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    img_url?: SortOrder
    price?: SortOrder
    public_note?: SortOrder
    private_note?: SortOrder
    ahs_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    list_id?: SortOrder
    ahs_ref?: SortOrder
  }

  export type liliesAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    price?: SortOrder
    list_id?: SortOrder
    ahs_ref?: SortOrder
  }

  export type liliesMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    price?: SortOrder
    public_note?: SortOrder
    private_note?: SortOrder
    ahs_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    list_id?: SortOrder
    ahs_ref?: SortOrder
  }

  export type liliesMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    price?: SortOrder
    public_note?: SortOrder
    private_note?: SortOrder
    ahs_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    list_id?: SortOrder
    ahs_ref?: SortOrder
  }

  export type liliesSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    price?: SortOrder
    list_id?: SortOrder
    ahs_ref?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type listsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type listsAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }

  export type listsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type listsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type listsSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }

  export type Stripe_subscriptionsNullableRelationFilter = {
    is?: stripe_subscriptionsWhereInput | null
    isNot?: stripe_subscriptionsWhereInput | null
  }

  export type stripe_customersCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_customersAvgOrderByAggregateInput = {
    user_id?: SortOrder
  }

  export type stripe_customersMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_customersMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_customersSumOrderByAggregateInput = {
    user_id?: SortOrder
  }

  export type Stripe_customersRelationFilter = {
    is?: stripe_customersWhereInput
    isNot?: stripe_customersWhereInput
  }

  export type stripe_subscriptionsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    customer_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_subscriptionsAvgOrderByAggregateInput = {
    user_id?: SortOrder
  }

  export type stripe_subscriptionsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    customer_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_subscriptionsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    customer_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type stripe_subscriptionsSumOrderByAggregateInput = {
    user_id?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type user_authenticationsServiceIdentifierCompoundUniqueInput = {
    service: string
    identifier: string
  }

  export type user_authenticationsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    service?: SortOrder
    identifier?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_authenticationsAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }

  export type user_authenticationsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    service?: SortOrder
    identifier?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_authenticationsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    service?: SortOrder
    identifier?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_authenticationsSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type user_emailsUser_idEmailCompoundUniqueInput = {
    user_id: number
    email: string
  }

  export type user_emailsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    email?: SortOrder
    is_verified?: SortOrder
    is_primary?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_emailsAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }

  export type user_emailsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    email?: SortOrder
    is_verified?: SortOrder
    is_primary?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_emailsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    email?: SortOrder
    is_verified?: SortOrder
    is_primary?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type user_emailsSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type ListsListRelationFilter = {
    every?: listsWhereInput
    some?: listsWhereInput
    none?: listsWhereInput
  }

  export type Stripe_customersNullableRelationFilter = {
    is?: stripe_customersWhereInput | null
    isNot?: stripe_customersWhereInput | null
  }

  export type User_authenticationsListRelationFilter = {
    every?: user_authenticationsWhereInput
    some?: user_authenticationsWhereInput
    none?: user_authenticationsWhereInput
  }

  export type User_emailsListRelationFilter = {
    every?: user_emailsWhereInput
    some?: user_emailsWhereInput
    none?: user_emailsWhereInput
  }

  export type listsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type user_authenticationsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type user_emailsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type usersCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    is_admin?: SortOrder
    is_verified?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    user_location?: SortOrder
    img_urls?: SortOrder
    free_until?: SortOrder
  }

  export type usersAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type usersMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    is_admin?: SortOrder
    is_verified?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    user_location?: SortOrder
    free_until?: SortOrder
  }

  export type usersMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    is_admin?: SortOrder
    is_verified?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    intro?: SortOrder
    bio?: SortOrder
    user_location?: SortOrder
    free_until?: SortOrder
  }

  export type usersSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type liliesCreateNestedManyWithoutAhs_dataInput = {
    create?: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput> | liliesCreateWithoutAhs_dataInput[] | liliesUncheckedCreateWithoutAhs_dataInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutAhs_dataInput | liliesCreateOrConnectWithoutAhs_dataInput[]
    createMany?: liliesCreateManyAhs_dataInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type liliesUncheckedCreateNestedManyWithoutAhs_dataInput = {
    create?: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput> | liliesCreateWithoutAhs_dataInput[] | liliesUncheckedCreateWithoutAhs_dataInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutAhs_dataInput | liliesCreateOrConnectWithoutAhs_dataInput[]
    createMany?: liliesCreateManyAhs_dataInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type liliesUpdateManyWithoutAhs_dataNestedInput = {
    create?: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput> | liliesCreateWithoutAhs_dataInput[] | liliesUncheckedCreateWithoutAhs_dataInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutAhs_dataInput | liliesCreateOrConnectWithoutAhs_dataInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutAhs_dataInput | liliesUpsertWithWhereUniqueWithoutAhs_dataInput[]
    createMany?: liliesCreateManyAhs_dataInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutAhs_dataInput | liliesUpdateWithWhereUniqueWithoutAhs_dataInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutAhs_dataInput | liliesUpdateManyWithWhereWithoutAhs_dataInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type liliesUncheckedUpdateManyWithoutAhs_dataNestedInput = {
    create?: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput> | liliesCreateWithoutAhs_dataInput[] | liliesUncheckedCreateWithoutAhs_dataInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutAhs_dataInput | liliesCreateOrConnectWithoutAhs_dataInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutAhs_dataInput | liliesUpsertWithWhereUniqueWithoutAhs_dataInput[]
    createMany?: liliesCreateManyAhs_dataInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutAhs_dataInput | liliesUpdateWithWhereUniqueWithoutAhs_dataInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutAhs_dataInput | liliesUpdateManyWithWhereWithoutAhs_dataInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type liliesCreateimg_urlInput = {
    set: string[]
  }

  export type ahs_dataCreateNestedOneWithoutLiliesInput = {
    create?: XOR<ahs_dataCreateWithoutLiliesInput, ahs_dataUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: ahs_dataCreateOrConnectWithoutLiliesInput
    connect?: ahs_dataWhereUniqueInput
  }

  export type listsCreateNestedOneWithoutLiliesInput = {
    create?: XOR<listsCreateWithoutLiliesInput, listsUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: listsCreateOrConnectWithoutLiliesInput
    connect?: listsWhereUniqueInput
  }

  export type usersCreateNestedOneWithoutLiliesInput = {
    create?: XOR<usersCreateWithoutLiliesInput, usersUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: usersCreateOrConnectWithoutLiliesInput
    connect?: usersWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type liliesUpdateimg_urlInput = {
    set?: string[]
    push?: string | string[]
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type ahs_dataUpdateOneWithoutLiliesNestedInput = {
    create?: XOR<ahs_dataCreateWithoutLiliesInput, ahs_dataUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: ahs_dataCreateOrConnectWithoutLiliesInput
    upsert?: ahs_dataUpsertWithoutLiliesInput
    disconnect?: ahs_dataWhereInput | boolean
    delete?: ahs_dataWhereInput | boolean
    connect?: ahs_dataWhereUniqueInput
    update?: XOR<XOR<ahs_dataUpdateToOneWithWhereWithoutLiliesInput, ahs_dataUpdateWithoutLiliesInput>, ahs_dataUncheckedUpdateWithoutLiliesInput>
  }

  export type listsUpdateOneWithoutLiliesNestedInput = {
    create?: XOR<listsCreateWithoutLiliesInput, listsUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: listsCreateOrConnectWithoutLiliesInput
    upsert?: listsUpsertWithoutLiliesInput
    disconnect?: listsWhereInput | boolean
    delete?: listsWhereInput | boolean
    connect?: listsWhereUniqueInput
    update?: XOR<XOR<listsUpdateToOneWithWhereWithoutLiliesInput, listsUpdateWithoutLiliesInput>, listsUncheckedUpdateWithoutLiliesInput>
  }

  export type usersUpdateOneRequiredWithoutLiliesNestedInput = {
    create?: XOR<usersCreateWithoutLiliesInput, usersUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: usersCreateOrConnectWithoutLiliesInput
    upsert?: usersUpsertWithoutLiliesInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutLiliesInput, usersUpdateWithoutLiliesInput>, usersUncheckedUpdateWithoutLiliesInput>
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type liliesCreateNestedManyWithoutListsInput = {
    create?: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput> | liliesCreateWithoutListsInput[] | liliesUncheckedCreateWithoutListsInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutListsInput | liliesCreateOrConnectWithoutListsInput[]
    createMany?: liliesCreateManyListsInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type usersCreateNestedOneWithoutListsInput = {
    create?: XOR<usersCreateWithoutListsInput, usersUncheckedCreateWithoutListsInput>
    connectOrCreate?: usersCreateOrConnectWithoutListsInput
    connect?: usersWhereUniqueInput
  }

  export type liliesUncheckedCreateNestedManyWithoutListsInput = {
    create?: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput> | liliesCreateWithoutListsInput[] | liliesUncheckedCreateWithoutListsInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutListsInput | liliesCreateOrConnectWithoutListsInput[]
    createMany?: liliesCreateManyListsInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type liliesUpdateManyWithoutListsNestedInput = {
    create?: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput> | liliesCreateWithoutListsInput[] | liliesUncheckedCreateWithoutListsInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutListsInput | liliesCreateOrConnectWithoutListsInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutListsInput | liliesUpsertWithWhereUniqueWithoutListsInput[]
    createMany?: liliesCreateManyListsInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutListsInput | liliesUpdateWithWhereUniqueWithoutListsInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutListsInput | liliesUpdateManyWithWhereWithoutListsInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type usersUpdateOneRequiredWithoutListsNestedInput = {
    create?: XOR<usersCreateWithoutListsInput, usersUncheckedCreateWithoutListsInput>
    connectOrCreate?: usersCreateOrConnectWithoutListsInput
    upsert?: usersUpsertWithoutListsInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutListsInput, usersUpdateWithoutListsInput>, usersUncheckedUpdateWithoutListsInput>
  }

  export type liliesUncheckedUpdateManyWithoutListsNestedInput = {
    create?: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput> | liliesCreateWithoutListsInput[] | liliesUncheckedCreateWithoutListsInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutListsInput | liliesCreateOrConnectWithoutListsInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutListsInput | liliesUpsertWithWhereUniqueWithoutListsInput[]
    createMany?: liliesCreateManyListsInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutListsInput | liliesUpdateWithWhereUniqueWithoutListsInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutListsInput | liliesUpdateManyWithWhereWithoutListsInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type usersCreateNestedOneWithoutStripe_customersInput = {
    create?: XOR<usersCreateWithoutStripe_customersInput, usersUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: usersCreateOrConnectWithoutStripe_customersInput
    connect?: usersWhereUniqueInput
  }

  export type stripe_subscriptionsCreateNestedOneWithoutStripe_customersInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutStripe_customersInput
    connect?: stripe_subscriptionsWhereUniqueInput
  }

  export type stripe_subscriptionsUncheckedCreateNestedOneWithoutStripe_customersInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutStripe_customersInput
    connect?: stripe_subscriptionsWhereUniqueInput
  }

  export type usersUpdateOneRequiredWithoutStripe_customersNestedInput = {
    create?: XOR<usersCreateWithoutStripe_customersInput, usersUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: usersCreateOrConnectWithoutStripe_customersInput
    upsert?: usersUpsertWithoutStripe_customersInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutStripe_customersInput, usersUpdateWithoutStripe_customersInput>, usersUncheckedUpdateWithoutStripe_customersInput>
  }

  export type stripe_subscriptionsUpdateOneWithoutStripe_customersNestedInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutStripe_customersInput
    upsert?: stripe_subscriptionsUpsertWithoutStripe_customersInput
    disconnect?: stripe_subscriptionsWhereInput | boolean
    delete?: stripe_subscriptionsWhereInput | boolean
    connect?: stripe_subscriptionsWhereUniqueInput
    update?: XOR<XOR<stripe_subscriptionsUpdateToOneWithWhereWithoutStripe_customersInput, stripe_subscriptionsUpdateWithoutStripe_customersInput>, stripe_subscriptionsUncheckedUpdateWithoutStripe_customersInput>
  }

  export type stripe_subscriptionsUncheckedUpdateOneWithoutStripe_customersNestedInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutStripe_customersInput
    upsert?: stripe_subscriptionsUpsertWithoutStripe_customersInput
    disconnect?: stripe_subscriptionsWhereInput | boolean
    delete?: stripe_subscriptionsWhereInput | boolean
    connect?: stripe_subscriptionsWhereUniqueInput
    update?: XOR<XOR<stripe_subscriptionsUpdateToOneWithWhereWithoutStripe_customersInput, stripe_subscriptionsUpdateWithoutStripe_customersInput>, stripe_subscriptionsUncheckedUpdateWithoutStripe_customersInput>
  }

  export type stripe_customersCreateNestedOneWithoutStripe_subscriptionsInput = {
    create?: XOR<stripe_customersCreateWithoutStripe_subscriptionsInput, stripe_customersUncheckedCreateWithoutStripe_subscriptionsInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutStripe_subscriptionsInput
    connect?: stripe_customersWhereUniqueInput
  }

  export type usersCreateNestedOneWithoutStripe_subscriptionsInput = {
    create?: XOR<usersCreateWithoutStripe_subscriptionsInput, usersUncheckedCreateWithoutStripe_subscriptionsInput>
    connectOrCreate?: usersCreateOrConnectWithoutStripe_subscriptionsInput
    connect?: usersWhereUniqueInput
  }

  export type stripe_customersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput = {
    create?: XOR<stripe_customersCreateWithoutStripe_subscriptionsInput, stripe_customersUncheckedCreateWithoutStripe_subscriptionsInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutStripe_subscriptionsInput
    upsert?: stripe_customersUpsertWithoutStripe_subscriptionsInput
    connect?: stripe_customersWhereUniqueInput
    update?: XOR<XOR<stripe_customersUpdateToOneWithWhereWithoutStripe_subscriptionsInput, stripe_customersUpdateWithoutStripe_subscriptionsInput>, stripe_customersUncheckedUpdateWithoutStripe_subscriptionsInput>
  }

  export type usersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput = {
    create?: XOR<usersCreateWithoutStripe_subscriptionsInput, usersUncheckedCreateWithoutStripe_subscriptionsInput>
    connectOrCreate?: usersCreateOrConnectWithoutStripe_subscriptionsInput
    upsert?: usersUpsertWithoutStripe_subscriptionsInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutStripe_subscriptionsInput, usersUpdateWithoutStripe_subscriptionsInput>, usersUncheckedUpdateWithoutStripe_subscriptionsInput>
  }

  export type usersCreateNestedOneWithoutUser_authenticationsInput = {
    create?: XOR<usersCreateWithoutUser_authenticationsInput, usersUncheckedCreateWithoutUser_authenticationsInput>
    connectOrCreate?: usersCreateOrConnectWithoutUser_authenticationsInput
    connect?: usersWhereUniqueInput
  }

  export type usersUpdateOneRequiredWithoutUser_authenticationsNestedInput = {
    create?: XOR<usersCreateWithoutUser_authenticationsInput, usersUncheckedCreateWithoutUser_authenticationsInput>
    connectOrCreate?: usersCreateOrConnectWithoutUser_authenticationsInput
    upsert?: usersUpsertWithoutUser_authenticationsInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutUser_authenticationsInput, usersUpdateWithoutUser_authenticationsInput>, usersUncheckedUpdateWithoutUser_authenticationsInput>
  }

  export type usersCreateNestedOneWithoutUser_emailsInput = {
    create?: XOR<usersCreateWithoutUser_emailsInput, usersUncheckedCreateWithoutUser_emailsInput>
    connectOrCreate?: usersCreateOrConnectWithoutUser_emailsInput
    connect?: usersWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type usersUpdateOneRequiredWithoutUser_emailsNestedInput = {
    create?: XOR<usersCreateWithoutUser_emailsInput, usersUncheckedCreateWithoutUser_emailsInput>
    connectOrCreate?: usersCreateOrConnectWithoutUser_emailsInput
    upsert?: usersUpsertWithoutUser_emailsInput
    connect?: usersWhereUniqueInput
    update?: XOR<XOR<usersUpdateToOneWithWhereWithoutUser_emailsInput, usersUpdateWithoutUser_emailsInput>, usersUncheckedUpdateWithoutUser_emailsInput>
  }

  export type usersCreateimg_urlsInput = {
    set: string[]
  }

  export type liliesCreateNestedManyWithoutUsersInput = {
    create?: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput> | liliesCreateWithoutUsersInput[] | liliesUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutUsersInput | liliesCreateOrConnectWithoutUsersInput[]
    createMany?: liliesCreateManyUsersInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type listsCreateNestedManyWithoutUsersInput = {
    create?: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput> | listsCreateWithoutUsersInput[] | listsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: listsCreateOrConnectWithoutUsersInput | listsCreateOrConnectWithoutUsersInput[]
    createMany?: listsCreateManyUsersInputEnvelope
    connect?: listsWhereUniqueInput | listsWhereUniqueInput[]
  }

  export type stripe_customersCreateNestedOneWithoutUsersInput = {
    create?: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutUsersInput
    connect?: stripe_customersWhereUniqueInput
  }

  export type stripe_subscriptionsCreateNestedOneWithoutUsersInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutUsersInput
    connect?: stripe_subscriptionsWhereUniqueInput
  }

  export type user_authenticationsCreateNestedManyWithoutUsersInput = {
    create?: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput> | user_authenticationsCreateWithoutUsersInput[] | user_authenticationsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_authenticationsCreateOrConnectWithoutUsersInput | user_authenticationsCreateOrConnectWithoutUsersInput[]
    createMany?: user_authenticationsCreateManyUsersInputEnvelope
    connect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
  }

  export type user_emailsCreateNestedManyWithoutUsersInput = {
    create?: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput> | user_emailsCreateWithoutUsersInput[] | user_emailsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_emailsCreateOrConnectWithoutUsersInput | user_emailsCreateOrConnectWithoutUsersInput[]
    createMany?: user_emailsCreateManyUsersInputEnvelope
    connect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
  }

  export type liliesUncheckedCreateNestedManyWithoutUsersInput = {
    create?: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput> | liliesCreateWithoutUsersInput[] | liliesUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutUsersInput | liliesCreateOrConnectWithoutUsersInput[]
    createMany?: liliesCreateManyUsersInputEnvelope
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
  }

  export type listsUncheckedCreateNestedManyWithoutUsersInput = {
    create?: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput> | listsCreateWithoutUsersInput[] | listsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: listsCreateOrConnectWithoutUsersInput | listsCreateOrConnectWithoutUsersInput[]
    createMany?: listsCreateManyUsersInputEnvelope
    connect?: listsWhereUniqueInput | listsWhereUniqueInput[]
  }

  export type stripe_customersUncheckedCreateNestedOneWithoutUsersInput = {
    create?: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutUsersInput
    connect?: stripe_customersWhereUniqueInput
  }

  export type stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutUsersInput
    connect?: stripe_subscriptionsWhereUniqueInput
  }

  export type user_authenticationsUncheckedCreateNestedManyWithoutUsersInput = {
    create?: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput> | user_authenticationsCreateWithoutUsersInput[] | user_authenticationsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_authenticationsCreateOrConnectWithoutUsersInput | user_authenticationsCreateOrConnectWithoutUsersInput[]
    createMany?: user_authenticationsCreateManyUsersInputEnvelope
    connect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
  }

  export type user_emailsUncheckedCreateNestedManyWithoutUsersInput = {
    create?: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput> | user_emailsCreateWithoutUsersInput[] | user_emailsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_emailsCreateOrConnectWithoutUsersInput | user_emailsCreateOrConnectWithoutUsersInput[]
    createMany?: user_emailsCreateManyUsersInputEnvelope
    connect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
  }

  export type usersUpdateimg_urlsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type liliesUpdateManyWithoutUsersNestedInput = {
    create?: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput> | liliesCreateWithoutUsersInput[] | liliesUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutUsersInput | liliesCreateOrConnectWithoutUsersInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutUsersInput | liliesUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: liliesCreateManyUsersInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutUsersInput | liliesUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutUsersInput | liliesUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type listsUpdateManyWithoutUsersNestedInput = {
    create?: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput> | listsCreateWithoutUsersInput[] | listsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: listsCreateOrConnectWithoutUsersInput | listsCreateOrConnectWithoutUsersInput[]
    upsert?: listsUpsertWithWhereUniqueWithoutUsersInput | listsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: listsCreateManyUsersInputEnvelope
    set?: listsWhereUniqueInput | listsWhereUniqueInput[]
    disconnect?: listsWhereUniqueInput | listsWhereUniqueInput[]
    delete?: listsWhereUniqueInput | listsWhereUniqueInput[]
    connect?: listsWhereUniqueInput | listsWhereUniqueInput[]
    update?: listsUpdateWithWhereUniqueWithoutUsersInput | listsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: listsUpdateManyWithWhereWithoutUsersInput | listsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: listsScalarWhereInput | listsScalarWhereInput[]
  }

  export type stripe_customersUpdateOneWithoutUsersNestedInput = {
    create?: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutUsersInput
    upsert?: stripe_customersUpsertWithoutUsersInput
    disconnect?: stripe_customersWhereInput | boolean
    delete?: stripe_customersWhereInput | boolean
    connect?: stripe_customersWhereUniqueInput
    update?: XOR<XOR<stripe_customersUpdateToOneWithWhereWithoutUsersInput, stripe_customersUpdateWithoutUsersInput>, stripe_customersUncheckedUpdateWithoutUsersInput>
  }

  export type stripe_subscriptionsUpdateOneWithoutUsersNestedInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutUsersInput
    upsert?: stripe_subscriptionsUpsertWithoutUsersInput
    disconnect?: stripe_subscriptionsWhereInput | boolean
    delete?: stripe_subscriptionsWhereInput | boolean
    connect?: stripe_subscriptionsWhereUniqueInput
    update?: XOR<XOR<stripe_subscriptionsUpdateToOneWithWhereWithoutUsersInput, stripe_subscriptionsUpdateWithoutUsersInput>, stripe_subscriptionsUncheckedUpdateWithoutUsersInput>
  }

  export type user_authenticationsUpdateManyWithoutUsersNestedInput = {
    create?: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput> | user_authenticationsCreateWithoutUsersInput[] | user_authenticationsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_authenticationsCreateOrConnectWithoutUsersInput | user_authenticationsCreateOrConnectWithoutUsersInput[]
    upsert?: user_authenticationsUpsertWithWhereUniqueWithoutUsersInput | user_authenticationsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: user_authenticationsCreateManyUsersInputEnvelope
    set?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    disconnect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    delete?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    connect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    update?: user_authenticationsUpdateWithWhereUniqueWithoutUsersInput | user_authenticationsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: user_authenticationsUpdateManyWithWhereWithoutUsersInput | user_authenticationsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: user_authenticationsScalarWhereInput | user_authenticationsScalarWhereInput[]
  }

  export type user_emailsUpdateManyWithoutUsersNestedInput = {
    create?: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput> | user_emailsCreateWithoutUsersInput[] | user_emailsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_emailsCreateOrConnectWithoutUsersInput | user_emailsCreateOrConnectWithoutUsersInput[]
    upsert?: user_emailsUpsertWithWhereUniqueWithoutUsersInput | user_emailsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: user_emailsCreateManyUsersInputEnvelope
    set?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    disconnect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    delete?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    connect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    update?: user_emailsUpdateWithWhereUniqueWithoutUsersInput | user_emailsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: user_emailsUpdateManyWithWhereWithoutUsersInput | user_emailsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: user_emailsScalarWhereInput | user_emailsScalarWhereInput[]
  }

  export type liliesUncheckedUpdateManyWithoutUsersNestedInput = {
    create?: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput> | liliesCreateWithoutUsersInput[] | liliesUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: liliesCreateOrConnectWithoutUsersInput | liliesCreateOrConnectWithoutUsersInput[]
    upsert?: liliesUpsertWithWhereUniqueWithoutUsersInput | liliesUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: liliesCreateManyUsersInputEnvelope
    set?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    disconnect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    delete?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    connect?: liliesWhereUniqueInput | liliesWhereUniqueInput[]
    update?: liliesUpdateWithWhereUniqueWithoutUsersInput | liliesUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: liliesUpdateManyWithWhereWithoutUsersInput | liliesUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: liliesScalarWhereInput | liliesScalarWhereInput[]
  }

  export type listsUncheckedUpdateManyWithoutUsersNestedInput = {
    create?: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput> | listsCreateWithoutUsersInput[] | listsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: listsCreateOrConnectWithoutUsersInput | listsCreateOrConnectWithoutUsersInput[]
    upsert?: listsUpsertWithWhereUniqueWithoutUsersInput | listsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: listsCreateManyUsersInputEnvelope
    set?: listsWhereUniqueInput | listsWhereUniqueInput[]
    disconnect?: listsWhereUniqueInput | listsWhereUniqueInput[]
    delete?: listsWhereUniqueInput | listsWhereUniqueInput[]
    connect?: listsWhereUniqueInput | listsWhereUniqueInput[]
    update?: listsUpdateWithWhereUniqueWithoutUsersInput | listsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: listsUpdateManyWithWhereWithoutUsersInput | listsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: listsScalarWhereInput | listsScalarWhereInput[]
  }

  export type stripe_customersUncheckedUpdateOneWithoutUsersNestedInput = {
    create?: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_customersCreateOrConnectWithoutUsersInput
    upsert?: stripe_customersUpsertWithoutUsersInput
    disconnect?: stripe_customersWhereInput | boolean
    delete?: stripe_customersWhereInput | boolean
    connect?: stripe_customersWhereUniqueInput
    update?: XOR<XOR<stripe_customersUpdateToOneWithWhereWithoutUsersInput, stripe_customersUpdateWithoutUsersInput>, stripe_customersUncheckedUpdateWithoutUsersInput>
  }

  export type stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput = {
    create?: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
    connectOrCreate?: stripe_subscriptionsCreateOrConnectWithoutUsersInput
    upsert?: stripe_subscriptionsUpsertWithoutUsersInput
    disconnect?: stripe_subscriptionsWhereInput | boolean
    delete?: stripe_subscriptionsWhereInput | boolean
    connect?: stripe_subscriptionsWhereUniqueInput
    update?: XOR<XOR<stripe_subscriptionsUpdateToOneWithWhereWithoutUsersInput, stripe_subscriptionsUpdateWithoutUsersInput>, stripe_subscriptionsUncheckedUpdateWithoutUsersInput>
  }

  export type user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput = {
    create?: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput> | user_authenticationsCreateWithoutUsersInput[] | user_authenticationsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_authenticationsCreateOrConnectWithoutUsersInput | user_authenticationsCreateOrConnectWithoutUsersInput[]
    upsert?: user_authenticationsUpsertWithWhereUniqueWithoutUsersInput | user_authenticationsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: user_authenticationsCreateManyUsersInputEnvelope
    set?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    disconnect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    delete?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    connect?: user_authenticationsWhereUniqueInput | user_authenticationsWhereUniqueInput[]
    update?: user_authenticationsUpdateWithWhereUniqueWithoutUsersInput | user_authenticationsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: user_authenticationsUpdateManyWithWhereWithoutUsersInput | user_authenticationsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: user_authenticationsScalarWhereInput | user_authenticationsScalarWhereInput[]
  }

  export type user_emailsUncheckedUpdateManyWithoutUsersNestedInput = {
    create?: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput> | user_emailsCreateWithoutUsersInput[] | user_emailsUncheckedCreateWithoutUsersInput[]
    connectOrCreate?: user_emailsCreateOrConnectWithoutUsersInput | user_emailsCreateOrConnectWithoutUsersInput[]
    upsert?: user_emailsUpsertWithWhereUniqueWithoutUsersInput | user_emailsUpsertWithWhereUniqueWithoutUsersInput[]
    createMany?: user_emailsCreateManyUsersInputEnvelope
    set?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    disconnect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    delete?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    connect?: user_emailsWhereUniqueInput | user_emailsWhereUniqueInput[]
    update?: user_emailsUpdateWithWhereUniqueWithoutUsersInput | user_emailsUpdateWithWhereUniqueWithoutUsersInput[]
    updateMany?: user_emailsUpdateManyWithWhereWithoutUsersInput | user_emailsUpdateManyWithWhereWithoutUsersInput[]
    deleteMany?: user_emailsScalarWhereInput | user_emailsScalarWhereInput[]
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type liliesCreateWithoutAhs_dataInput = {
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lists?: listsCreateNestedOneWithoutLiliesInput
    users?: usersCreateNestedOneWithoutLiliesInput
  }

  export type liliesUncheckedCreateWithoutAhs_dataInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
  }

  export type liliesCreateOrConnectWithoutAhs_dataInput = {
    where: liliesWhereUniqueInput
    create: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput>
  }

  export type liliesCreateManyAhs_dataInputEnvelope = {
    data: liliesCreateManyAhs_dataInput | liliesCreateManyAhs_dataInput[]
    skipDuplicates?: boolean
  }

  export type liliesUpsertWithWhereUniqueWithoutAhs_dataInput = {
    where: liliesWhereUniqueInput
    update: XOR<liliesUpdateWithoutAhs_dataInput, liliesUncheckedUpdateWithoutAhs_dataInput>
    create: XOR<liliesCreateWithoutAhs_dataInput, liliesUncheckedCreateWithoutAhs_dataInput>
  }

  export type liliesUpdateWithWhereUniqueWithoutAhs_dataInput = {
    where: liliesWhereUniqueInput
    data: XOR<liliesUpdateWithoutAhs_dataInput, liliesUncheckedUpdateWithoutAhs_dataInput>
  }

  export type liliesUpdateManyWithWhereWithoutAhs_dataInput = {
    where: liliesScalarWhereInput
    data: XOR<liliesUpdateManyMutationInput, liliesUncheckedUpdateManyWithoutAhs_dataInput>
  }

  export type liliesScalarWhereInput = {
    AND?: liliesScalarWhereInput | liliesScalarWhereInput[]
    OR?: liliesScalarWhereInput[]
    NOT?: liliesScalarWhereInput | liliesScalarWhereInput[]
    id?: IntFilter<"lilies"> | number
    user_id?: IntFilter<"lilies"> | number
    name?: StringFilter<"lilies"> | string
    img_url?: StringNullableListFilter<"lilies">
    price?: DecimalNullableFilter<"lilies"> | Decimal | DecimalJsLike | number | string | null
    public_note?: StringNullableFilter<"lilies"> | string | null
    private_note?: StringNullableFilter<"lilies"> | string | null
    ahs_id?: StringNullableFilter<"lilies"> | string | null
    created_at?: DateTimeFilter<"lilies"> | Date | string
    updated_at?: DateTimeFilter<"lilies"> | Date | string
    list_id?: IntNullableFilter<"lilies"> | number | null
    ahs_ref?: IntNullableFilter<"lilies"> | number | null
  }

  export type ahs_dataCreateWithoutLiliesInput = {
    ahs_id: number
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scape_height?: string | null
    bloom_size?: string | null
    bloom_season?: string | null
    ploidy?: string | null
    foliage_type?: string | null
    bloom_habit?: string | null
    seedling_num?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    image?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ahs_dataUncheckedCreateWithoutLiliesInput = {
    id?: number
    ahs_id: number
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scape_height?: string | null
    bloom_size?: string | null
    bloom_season?: string | null
    ploidy?: string | null
    foliage_type?: string | null
    bloom_habit?: string | null
    seedling_num?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    image?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ahs_dataCreateOrConnectWithoutLiliesInput = {
    where: ahs_dataWhereUniqueInput
    create: XOR<ahs_dataCreateWithoutLiliesInput, ahs_dataUncheckedCreateWithoutLiliesInput>
  }

  export type listsCreateWithoutLiliesInput = {
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    users?: usersCreateNestedOneWithoutListsInput
  }

  export type listsUncheckedCreateWithoutLiliesInput = {
    id?: number
    user_id?: number
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type listsCreateOrConnectWithoutLiliesInput = {
    where: listsWhereUniqueInput
    create: XOR<listsCreateWithoutLiliesInput, listsUncheckedCreateWithoutLiliesInput>
  }

  export type usersCreateWithoutLiliesInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutLiliesInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutLiliesInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutLiliesInput, usersUncheckedCreateWithoutLiliesInput>
  }

  export type ahs_dataUpsertWithoutLiliesInput = {
    update: XOR<ahs_dataUpdateWithoutLiliesInput, ahs_dataUncheckedUpdateWithoutLiliesInput>
    create: XOR<ahs_dataCreateWithoutLiliesInput, ahs_dataUncheckedCreateWithoutLiliesInput>
    where?: ahs_dataWhereInput
  }

  export type ahs_dataUpdateToOneWithWhereWithoutLiliesInput = {
    where?: ahs_dataWhereInput
    data: XOR<ahs_dataUpdateWithoutLiliesInput, ahs_dataUncheckedUpdateWithoutLiliesInput>
  }

  export type ahs_dataUpdateWithoutLiliesInput = {
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ahs_dataUncheckedUpdateWithoutLiliesInput = {
    id?: IntFieldUpdateOperationsInput | number
    ahs_id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scape_height?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_size?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_season?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliage_type?: NullableStringFieldUpdateOperationsInput | string | null
    bloom_habit?: NullableStringFieldUpdateOperationsInput | string | null
    seedling_num?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type listsUpsertWithoutLiliesInput = {
    update: XOR<listsUpdateWithoutLiliesInput, listsUncheckedUpdateWithoutLiliesInput>
    create: XOR<listsCreateWithoutLiliesInput, listsUncheckedCreateWithoutLiliesInput>
    where?: listsWhereInput
  }

  export type listsUpdateToOneWithWhereWithoutLiliesInput = {
    where?: listsWhereInput
    data: XOR<listsUpdateWithoutLiliesInput, listsUncheckedUpdateWithoutLiliesInput>
  }

  export type listsUpdateWithoutLiliesInput = {
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutListsNestedInput
  }

  export type listsUncheckedUpdateWithoutLiliesInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type usersUpsertWithoutLiliesInput = {
    update: XOR<usersUpdateWithoutLiliesInput, usersUncheckedUpdateWithoutLiliesInput>
    create: XOR<usersCreateWithoutLiliesInput, usersUncheckedCreateWithoutLiliesInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutLiliesInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutLiliesInput, usersUncheckedUpdateWithoutLiliesInput>
  }

  export type usersUpdateWithoutLiliesInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutLiliesInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type liliesCreateWithoutListsInput = {
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    ahs_data?: ahs_dataCreateNestedOneWithoutLiliesInput
    users?: usersCreateNestedOneWithoutLiliesInput
  }

  export type liliesUncheckedCreateWithoutListsInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    ahs_ref?: number | null
  }

  export type liliesCreateOrConnectWithoutListsInput = {
    where: liliesWhereUniqueInput
    create: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput>
  }

  export type liliesCreateManyListsInputEnvelope = {
    data: liliesCreateManyListsInput | liliesCreateManyListsInput[]
    skipDuplicates?: boolean
  }

  export type usersCreateWithoutListsInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutListsInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutListsInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutListsInput, usersUncheckedCreateWithoutListsInput>
  }

  export type liliesUpsertWithWhereUniqueWithoutListsInput = {
    where: liliesWhereUniqueInput
    update: XOR<liliesUpdateWithoutListsInput, liliesUncheckedUpdateWithoutListsInput>
    create: XOR<liliesCreateWithoutListsInput, liliesUncheckedCreateWithoutListsInput>
  }

  export type liliesUpdateWithWhereUniqueWithoutListsInput = {
    where: liliesWhereUniqueInput
    data: XOR<liliesUpdateWithoutListsInput, liliesUncheckedUpdateWithoutListsInput>
  }

  export type liliesUpdateManyWithWhereWithoutListsInput = {
    where: liliesScalarWhereInput
    data: XOR<liliesUpdateManyMutationInput, liliesUncheckedUpdateManyWithoutListsInput>
  }

  export type usersUpsertWithoutListsInput = {
    update: XOR<usersUpdateWithoutListsInput, usersUncheckedUpdateWithoutListsInput>
    create: XOR<usersCreateWithoutListsInput, usersUncheckedCreateWithoutListsInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutListsInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutListsInput, usersUncheckedUpdateWithoutListsInput>
  }

  export type usersUpdateWithoutListsInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutListsInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type usersCreateWithoutStripe_customersInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutStripe_customersInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutStripe_customersInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutStripe_customersInput, usersUncheckedCreateWithoutStripe_customersInput>
  }

  export type stripe_subscriptionsCreateWithoutStripe_customersInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    users?: usersCreateNestedOneWithoutStripe_subscriptionsInput
  }

  export type stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput = {
    id: string
    user_id?: number
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_subscriptionsCreateOrConnectWithoutStripe_customersInput = {
    where: stripe_subscriptionsWhereUniqueInput
    create: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
  }

  export type usersUpsertWithoutStripe_customersInput = {
    update: XOR<usersUpdateWithoutStripe_customersInput, usersUncheckedUpdateWithoutStripe_customersInput>
    create: XOR<usersCreateWithoutStripe_customersInput, usersUncheckedCreateWithoutStripe_customersInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutStripe_customersInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutStripe_customersInput, usersUncheckedUpdateWithoutStripe_customersInput>
  }

  export type usersUpdateWithoutStripe_customersInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutStripe_customersInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type stripe_subscriptionsUpsertWithoutStripe_customersInput = {
    update: XOR<stripe_subscriptionsUpdateWithoutStripe_customersInput, stripe_subscriptionsUncheckedUpdateWithoutStripe_customersInput>
    create: XOR<stripe_subscriptionsCreateWithoutStripe_customersInput, stripe_subscriptionsUncheckedCreateWithoutStripe_customersInput>
    where?: stripe_subscriptionsWhereInput
  }

  export type stripe_subscriptionsUpdateToOneWithWhereWithoutStripe_customersInput = {
    where?: stripe_subscriptionsWhereInput
    data: XOR<stripe_subscriptionsUpdateWithoutStripe_customersInput, stripe_subscriptionsUncheckedUpdateWithoutStripe_customersInput>
  }

  export type stripe_subscriptionsUpdateWithoutStripe_customersInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput
  }

  export type stripe_subscriptionsUncheckedUpdateWithoutStripe_customersInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type stripe_customersCreateWithoutStripe_subscriptionsInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    users?: usersCreateNestedOneWithoutStripe_customersInput
  }

  export type stripe_customersUncheckedCreateWithoutStripe_subscriptionsInput = {
    id: string
    user_id?: number
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_customersCreateOrConnectWithoutStripe_subscriptionsInput = {
    where: stripe_customersWhereUniqueInput
    create: XOR<stripe_customersCreateWithoutStripe_subscriptionsInput, stripe_customersUncheckedCreateWithoutStripe_subscriptionsInput>
  }

  export type usersCreateWithoutStripe_subscriptionsInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutStripe_subscriptionsInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutStripe_subscriptionsInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutStripe_subscriptionsInput, usersUncheckedCreateWithoutStripe_subscriptionsInput>
  }

  export type stripe_customersUpsertWithoutStripe_subscriptionsInput = {
    update: XOR<stripe_customersUpdateWithoutStripe_subscriptionsInput, stripe_customersUncheckedUpdateWithoutStripe_subscriptionsInput>
    create: XOR<stripe_customersCreateWithoutStripe_subscriptionsInput, stripe_customersUncheckedCreateWithoutStripe_subscriptionsInput>
    where?: stripe_customersWhereInput
  }

  export type stripe_customersUpdateToOneWithWhereWithoutStripe_subscriptionsInput = {
    where?: stripe_customersWhereInput
    data: XOR<stripe_customersUpdateWithoutStripe_subscriptionsInput, stripe_customersUncheckedUpdateWithoutStripe_subscriptionsInput>
  }

  export type stripe_customersUpdateWithoutStripe_subscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: usersUpdateOneRequiredWithoutStripe_customersNestedInput
  }

  export type stripe_customersUncheckedUpdateWithoutStripe_subscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: IntFieldUpdateOperationsInput | number
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type usersUpsertWithoutStripe_subscriptionsInput = {
    update: XOR<usersUpdateWithoutStripe_subscriptionsInput, usersUncheckedUpdateWithoutStripe_subscriptionsInput>
    create: XOR<usersCreateWithoutStripe_subscriptionsInput, usersUncheckedCreateWithoutStripe_subscriptionsInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutStripe_subscriptionsInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutStripe_subscriptionsInput, usersUncheckedUpdateWithoutStripe_subscriptionsInput>
  }

  export type usersUpdateWithoutStripe_subscriptionsInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutStripe_subscriptionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type usersCreateWithoutUser_authenticationsInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_emails?: user_emailsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutUser_authenticationsInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_emails?: user_emailsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutUser_authenticationsInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutUser_authenticationsInput, usersUncheckedCreateWithoutUser_authenticationsInput>
  }

  export type usersUpsertWithoutUser_authenticationsInput = {
    update: XOR<usersUpdateWithoutUser_authenticationsInput, usersUncheckedUpdateWithoutUser_authenticationsInput>
    create: XOR<usersCreateWithoutUser_authenticationsInput, usersUncheckedCreateWithoutUser_authenticationsInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutUser_authenticationsInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutUser_authenticationsInput, usersUncheckedUpdateWithoutUser_authenticationsInput>
  }

  export type usersUpdateWithoutUser_authenticationsInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_emails?: user_emailsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutUser_authenticationsInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_emails?: user_emailsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type usersCreateWithoutUser_emailsInput = {
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesCreateNestedManyWithoutUsersInput
    lists?: listsCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsCreateNestedManyWithoutUsersInput
  }

  export type usersUncheckedCreateWithoutUser_emailsInput = {
    id?: number
    username: string
    name?: string | null
    avatar_url?: string | null
    is_admin?: boolean
    is_verified?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    intro?: string | null
    bio?: string | null
    user_location?: string | null
    img_urls?: usersCreateimg_urlsInput | string[]
    free_until?: Date | string | null
    lilies?: liliesUncheckedCreateNestedManyWithoutUsersInput
    lists?: listsUncheckedCreateNestedManyWithoutUsersInput
    stripe_customers?: stripe_customersUncheckedCreateNestedOneWithoutUsersInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutUsersInput
    user_authentications?: user_authenticationsUncheckedCreateNestedManyWithoutUsersInput
  }

  export type usersCreateOrConnectWithoutUser_emailsInput = {
    where: usersWhereUniqueInput
    create: XOR<usersCreateWithoutUser_emailsInput, usersUncheckedCreateWithoutUser_emailsInput>
  }

  export type usersUpsertWithoutUser_emailsInput = {
    update: XOR<usersUpdateWithoutUser_emailsInput, usersUncheckedUpdateWithoutUser_emailsInput>
    create: XOR<usersCreateWithoutUser_emailsInput, usersUncheckedCreateWithoutUser_emailsInput>
    where?: usersWhereInput
  }

  export type usersUpdateToOneWithWhereWithoutUser_emailsInput = {
    where?: usersWhereInput
    data: XOR<usersUpdateWithoutUser_emailsInput, usersUncheckedUpdateWithoutUser_emailsInput>
  }

  export type usersUpdateWithoutUser_emailsInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUpdateManyWithoutUsersNestedInput
    lists?: listsUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUpdateManyWithoutUsersNestedInput
  }

  export type usersUncheckedUpdateWithoutUser_emailsInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    is_admin?: BoolFieldUpdateOperationsInput | boolean
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    user_location?: NullableStringFieldUpdateOperationsInput | string | null
    img_urls?: usersUpdateimg_urlsInput | string[]
    free_until?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lilies?: liliesUncheckedUpdateManyWithoutUsersNestedInput
    lists?: listsUncheckedUpdateManyWithoutUsersNestedInput
    stripe_customers?: stripe_customersUncheckedUpdateOneWithoutUsersNestedInput
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutUsersNestedInput
    user_authentications?: user_authenticationsUncheckedUpdateManyWithoutUsersNestedInput
  }

  export type liliesCreateWithoutUsersInput = {
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    ahs_data?: ahs_dataCreateNestedOneWithoutLiliesInput
    lists?: listsCreateNestedOneWithoutLiliesInput
  }

  export type liliesUncheckedCreateWithoutUsersInput = {
    id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
    ahs_ref?: number | null
  }

  export type liliesCreateOrConnectWithoutUsersInput = {
    where: liliesWhereUniqueInput
    create: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput>
  }

  export type liliesCreateManyUsersInputEnvelope = {
    data: liliesCreateManyUsersInput | liliesCreateManyUsersInput[]
    skipDuplicates?: boolean
  }

  export type listsCreateWithoutUsersInput = {
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesCreateNestedManyWithoutListsInput
  }

  export type listsUncheckedCreateWithoutUsersInput = {
    id?: number
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    lilies?: liliesUncheckedCreateNestedManyWithoutListsInput
  }

  export type listsCreateOrConnectWithoutUsersInput = {
    where: listsWhereUniqueInput
    create: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput>
  }

  export type listsCreateManyUsersInputEnvelope = {
    data: listsCreateManyUsersInput | listsCreateManyUsersInput[]
    skipDuplicates?: boolean
  }

  export type stripe_customersCreateWithoutUsersInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    stripe_subscriptions?: stripe_subscriptionsCreateNestedOneWithoutStripe_customersInput
  }

  export type stripe_customersUncheckedCreateWithoutUsersInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    stripe_subscriptions?: stripe_subscriptionsUncheckedCreateNestedOneWithoutStripe_customersInput
  }

  export type stripe_customersCreateOrConnectWithoutUsersInput = {
    where: stripe_customersWhereUniqueInput
    create: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
  }

  export type stripe_subscriptionsCreateWithoutUsersInput = {
    id: string
    created_at?: Date | string
    updated_at?: Date | string
    stripe_customers: stripe_customersCreateNestedOneWithoutStripe_subscriptionsInput
  }

  export type stripe_subscriptionsUncheckedCreateWithoutUsersInput = {
    id: string
    customer_id: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type stripe_subscriptionsCreateOrConnectWithoutUsersInput = {
    where: stripe_subscriptionsWhereUniqueInput
    create: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
  }

  export type user_authenticationsCreateWithoutUsersInput = {
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_authenticationsUncheckedCreateWithoutUsersInput = {
    id?: number
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_authenticationsCreateOrConnectWithoutUsersInput = {
    where: user_authenticationsWhereUniqueInput
    create: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput>
  }

  export type user_authenticationsCreateManyUsersInputEnvelope = {
    data: user_authenticationsCreateManyUsersInput | user_authenticationsCreateManyUsersInput[]
    skipDuplicates?: boolean
  }

  export type user_emailsCreateWithoutUsersInput = {
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_emailsUncheckedCreateWithoutUsersInput = {
    id?: number
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_emailsCreateOrConnectWithoutUsersInput = {
    where: user_emailsWhereUniqueInput
    create: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput>
  }

  export type user_emailsCreateManyUsersInputEnvelope = {
    data: user_emailsCreateManyUsersInput | user_emailsCreateManyUsersInput[]
    skipDuplicates?: boolean
  }

  export type liliesUpsertWithWhereUniqueWithoutUsersInput = {
    where: liliesWhereUniqueInput
    update: XOR<liliesUpdateWithoutUsersInput, liliesUncheckedUpdateWithoutUsersInput>
    create: XOR<liliesCreateWithoutUsersInput, liliesUncheckedCreateWithoutUsersInput>
  }

  export type liliesUpdateWithWhereUniqueWithoutUsersInput = {
    where: liliesWhereUniqueInput
    data: XOR<liliesUpdateWithoutUsersInput, liliesUncheckedUpdateWithoutUsersInput>
  }

  export type liliesUpdateManyWithWhereWithoutUsersInput = {
    where: liliesScalarWhereInput
    data: XOR<liliesUpdateManyMutationInput, liliesUncheckedUpdateManyWithoutUsersInput>
  }

  export type listsUpsertWithWhereUniqueWithoutUsersInput = {
    where: listsWhereUniqueInput
    update: XOR<listsUpdateWithoutUsersInput, listsUncheckedUpdateWithoutUsersInput>
    create: XOR<listsCreateWithoutUsersInput, listsUncheckedCreateWithoutUsersInput>
  }

  export type listsUpdateWithWhereUniqueWithoutUsersInput = {
    where: listsWhereUniqueInput
    data: XOR<listsUpdateWithoutUsersInput, listsUncheckedUpdateWithoutUsersInput>
  }

  export type listsUpdateManyWithWhereWithoutUsersInput = {
    where: listsScalarWhereInput
    data: XOR<listsUpdateManyMutationInput, listsUncheckedUpdateManyWithoutUsersInput>
  }

  export type listsScalarWhereInput = {
    AND?: listsScalarWhereInput | listsScalarWhereInput[]
    OR?: listsScalarWhereInput[]
    NOT?: listsScalarWhereInput | listsScalarWhereInput[]
    id?: IntFilter<"lists"> | number
    user_id?: IntFilter<"lists"> | number
    name?: StringFilter<"lists"> | string
    intro?: StringNullableFilter<"lists"> | string | null
    bio?: StringNullableFilter<"lists"> | string | null
    created_at?: DateTimeFilter<"lists"> | Date | string
    updated_at?: DateTimeFilter<"lists"> | Date | string
  }

  export type stripe_customersUpsertWithoutUsersInput = {
    update: XOR<stripe_customersUpdateWithoutUsersInput, stripe_customersUncheckedUpdateWithoutUsersInput>
    create: XOR<stripe_customersCreateWithoutUsersInput, stripe_customersUncheckedCreateWithoutUsersInput>
    where?: stripe_customersWhereInput
  }

  export type stripe_customersUpdateToOneWithWhereWithoutUsersInput = {
    where?: stripe_customersWhereInput
    data: XOR<stripe_customersUpdateWithoutUsersInput, stripe_customersUncheckedUpdateWithoutUsersInput>
  }

  export type stripe_customersUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    stripe_subscriptions?: stripe_subscriptionsUpdateOneWithoutStripe_customersNestedInput
  }

  export type stripe_customersUncheckedUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    stripe_subscriptions?: stripe_subscriptionsUncheckedUpdateOneWithoutStripe_customersNestedInput
  }

  export type stripe_subscriptionsUpsertWithoutUsersInput = {
    update: XOR<stripe_subscriptionsUpdateWithoutUsersInput, stripe_subscriptionsUncheckedUpdateWithoutUsersInput>
    create: XOR<stripe_subscriptionsCreateWithoutUsersInput, stripe_subscriptionsUncheckedCreateWithoutUsersInput>
    where?: stripe_subscriptionsWhereInput
  }

  export type stripe_subscriptionsUpdateToOneWithWhereWithoutUsersInput = {
    where?: stripe_subscriptionsWhereInput
    data: XOR<stripe_subscriptionsUpdateWithoutUsersInput, stripe_subscriptionsUncheckedUpdateWithoutUsersInput>
  }

  export type stripe_subscriptionsUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    stripe_customers?: stripe_customersUpdateOneRequiredWithoutStripe_subscriptionsNestedInput
  }

  export type stripe_subscriptionsUncheckedUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    customer_id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsUpsertWithWhereUniqueWithoutUsersInput = {
    where: user_authenticationsWhereUniqueInput
    update: XOR<user_authenticationsUpdateWithoutUsersInput, user_authenticationsUncheckedUpdateWithoutUsersInput>
    create: XOR<user_authenticationsCreateWithoutUsersInput, user_authenticationsUncheckedCreateWithoutUsersInput>
  }

  export type user_authenticationsUpdateWithWhereUniqueWithoutUsersInput = {
    where: user_authenticationsWhereUniqueInput
    data: XOR<user_authenticationsUpdateWithoutUsersInput, user_authenticationsUncheckedUpdateWithoutUsersInput>
  }

  export type user_authenticationsUpdateManyWithWhereWithoutUsersInput = {
    where: user_authenticationsScalarWhereInput
    data: XOR<user_authenticationsUpdateManyMutationInput, user_authenticationsUncheckedUpdateManyWithoutUsersInput>
  }

  export type user_authenticationsScalarWhereInput = {
    AND?: user_authenticationsScalarWhereInput | user_authenticationsScalarWhereInput[]
    OR?: user_authenticationsScalarWhereInput[]
    NOT?: user_authenticationsScalarWhereInput | user_authenticationsScalarWhereInput[]
    id?: IntFilter<"user_authentications"> | number
    user_id?: IntFilter<"user_authentications"> | number
    service?: StringFilter<"user_authentications"> | string
    identifier?: StringFilter<"user_authentications"> | string
    details?: JsonFilter<"user_authentications">
    created_at?: DateTimeFilter<"user_authentications"> | Date | string
    updated_at?: DateTimeFilter<"user_authentications"> | Date | string
  }

  export type user_emailsUpsertWithWhereUniqueWithoutUsersInput = {
    where: user_emailsWhereUniqueInput
    update: XOR<user_emailsUpdateWithoutUsersInput, user_emailsUncheckedUpdateWithoutUsersInput>
    create: XOR<user_emailsCreateWithoutUsersInput, user_emailsUncheckedCreateWithoutUsersInput>
  }

  export type user_emailsUpdateWithWhereUniqueWithoutUsersInput = {
    where: user_emailsWhereUniqueInput
    data: XOR<user_emailsUpdateWithoutUsersInput, user_emailsUncheckedUpdateWithoutUsersInput>
  }

  export type user_emailsUpdateManyWithWhereWithoutUsersInput = {
    where: user_emailsScalarWhereInput
    data: XOR<user_emailsUpdateManyMutationInput, user_emailsUncheckedUpdateManyWithoutUsersInput>
  }

  export type user_emailsScalarWhereInput = {
    AND?: user_emailsScalarWhereInput | user_emailsScalarWhereInput[]
    OR?: user_emailsScalarWhereInput[]
    NOT?: user_emailsScalarWhereInput | user_emailsScalarWhereInput[]
    id?: IntFilter<"user_emails"> | number
    user_id?: IntFilter<"user_emails"> | number
    email?: StringFilter<"user_emails"> | string
    is_verified?: BoolFilter<"user_emails"> | boolean
    is_primary?: BoolFilter<"user_emails"> | boolean
    created_at?: DateTimeFilter<"user_emails"> | Date | string
    updated_at?: DateTimeFilter<"user_emails"> | Date | string
  }

  export type liliesCreateManyAhs_dataInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
  }

  export type liliesUpdateWithoutAhs_dataInput = {
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lists?: listsUpdateOneWithoutLiliesNestedInput
    users?: usersUpdateOneRequiredWithoutLiliesNestedInput
  }

  export type liliesUncheckedUpdateWithoutAhs_dataInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesUncheckedUpdateManyWithoutAhs_dataInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesCreateManyListsInput = {
    id?: number
    user_id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    ahs_ref?: number | null
  }

  export type liliesUpdateWithoutListsInput = {
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ahs_data?: ahs_dataUpdateOneWithoutLiliesNestedInput
    users?: usersUpdateOneRequiredWithoutLiliesNestedInput
  }

  export type liliesUncheckedUpdateWithoutListsInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesUncheckedUpdateManyWithoutListsInput = {
    id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesCreateManyUsersInput = {
    id?: number
    name: string
    img_url?: liliesCreateimg_urlInput | string[]
    price?: Decimal | DecimalJsLike | number | string | null
    public_note?: string | null
    private_note?: string | null
    ahs_id?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    list_id?: number | null
    ahs_ref?: number | null
  }

  export type listsCreateManyUsersInput = {
    id?: number
    name: string
    intro?: string | null
    bio?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_authenticationsCreateManyUsersInput = {
    id?: number
    service: string
    identifier: string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type user_emailsCreateManyUsersInput = {
    id?: number
    email: string
    is_verified?: boolean
    is_primary?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type liliesUpdateWithoutUsersInput = {
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ahs_data?: ahs_dataUpdateOneWithoutLiliesNestedInput
    lists?: listsUpdateOneWithoutLiliesNestedInput
  }

  export type liliesUncheckedUpdateWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type liliesUncheckedUpdateManyWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    img_url?: liliesUpdateimg_urlInput | string[]
    price?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    public_note?: NullableStringFieldUpdateOperationsInput | string | null
    private_note?: NullableStringFieldUpdateOperationsInput | string | null
    ahs_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    list_id?: NullableIntFieldUpdateOperationsInput | number | null
    ahs_ref?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type listsUpdateWithoutUsersInput = {
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUpdateManyWithoutListsNestedInput
  }

  export type listsUncheckedUpdateWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: liliesUncheckedUpdateManyWithoutListsNestedInput
  }

  export type listsUncheckedUpdateManyWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    intro?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsUpdateWithoutUsersInput = {
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsUncheckedUpdateWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_authenticationsUncheckedUpdateManyWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    service?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    details?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsUpdateWithoutUsersInput = {
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsUncheckedUpdateWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type user_emailsUncheckedUpdateManyWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    is_verified?: BoolFieldUpdateOperationsInput | boolean
    is_primary?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use Ahs_dataCountOutputTypeDefaultArgs instead
     */
    export type Ahs_dataCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Ahs_dataCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ListsCountOutputTypeDefaultArgs instead
     */
    export type ListsCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ListsCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UsersCountOutputTypeDefaultArgs instead
     */
    export type UsersCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UsersCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ahs_dataDefaultArgs instead
     */
    export type ahs_dataArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ahs_dataDefaultArgs<ExtArgs>
    /**
     * @deprecated Use liliesDefaultArgs instead
     */
    export type liliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = liliesDefaultArgs<ExtArgs>
    /**
     * @deprecated Use listsDefaultArgs instead
     */
    export type listsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = listsDefaultArgs<ExtArgs>
    /**
     * @deprecated Use stripe_customersDefaultArgs instead
     */
    export type stripe_customersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = stripe_customersDefaultArgs<ExtArgs>
    /**
     * @deprecated Use stripe_subscriptionsDefaultArgs instead
     */
    export type stripe_subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = stripe_subscriptionsDefaultArgs<ExtArgs>
    /**
     * @deprecated Use user_authenticationsDefaultArgs instead
     */
    export type user_authenticationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = user_authenticationsDefaultArgs<ExtArgs>
    /**
     * @deprecated Use user_emailsDefaultArgs instead
     */
    export type user_emailsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = user_emailsDefaultArgs<ExtArgs>
    /**
     * @deprecated Use usersDefaultArgs instead
     */
    export type usersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = usersDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}