
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
 * Model AhsListing
 * 
 */
export type AhsListing = $Result.DefaultSelection<Prisma.$AhsListingPayload>
/**
 * Model Listing
 * 
 */
export type Listing = $Result.DefaultSelection<Prisma.$ListingPayload>
/**
 * Model List
 * 
 */
export type List = $Result.DefaultSelection<Prisma.$ListPayload>
/**
 * Model UserProfile
 * 
 */
export type UserProfile = $Result.DefaultSelection<Prisma.$UserProfilePayload>
/**
 * Model Image
 * 
 */
export type Image = $Result.DefaultSelection<Prisma.$ImagePayload>
/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model KeyValue
 * 
 */
export type KeyValue = $Result.DefaultSelection<Prisma.$KeyValuePayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more AhsListings
 * const ahsListings = await prisma.ahsListing.findMany()
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
   * // Fetch zero or more AhsListings
   * const ahsListings = await prisma.ahsListing.findMany()
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
   * `prisma.ahsListing`: Exposes CRUD operations for the **AhsListing** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AhsListings
    * const ahsListings = await prisma.ahsListing.findMany()
    * ```
    */
  get ahsListing(): Prisma.AhsListingDelegate<ExtArgs>;

  /**
   * `prisma.listing`: Exposes CRUD operations for the **Listing** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Listings
    * const listings = await prisma.listing.findMany()
    * ```
    */
  get listing(): Prisma.ListingDelegate<ExtArgs>;

  /**
   * `prisma.list`: Exposes CRUD operations for the **List** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Lists
    * const lists = await prisma.list.findMany()
    * ```
    */
  get list(): Prisma.ListDelegate<ExtArgs>;

  /**
   * `prisma.userProfile`: Exposes CRUD operations for the **UserProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserProfiles
    * const userProfiles = await prisma.userProfile.findMany()
    * ```
    */
  get userProfile(): Prisma.UserProfileDelegate<ExtArgs>;

  /**
   * `prisma.image`: Exposes CRUD operations for the **Image** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Images
    * const images = await prisma.image.findMany()
    * ```
    */
  get image(): Prisma.ImageDelegate<ExtArgs>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.keyValue`: Exposes CRUD operations for the **KeyValue** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more KeyValues
    * const keyValues = await prisma.keyValue.findMany()
    * ```
    */
  get keyValue(): Prisma.KeyValueDelegate<ExtArgs>;
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
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
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
    AhsListing: 'AhsListing',
    Listing: 'Listing',
    List: 'List',
    UserProfile: 'UserProfile',
    Image: 'Image',
    User: 'User',
    KeyValue: 'KeyValue'
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
      modelProps: "ahsListing" | "listing" | "list" | "userProfile" | "image" | "user" | "keyValue"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      AhsListing: {
        payload: Prisma.$AhsListingPayload<ExtArgs>
        fields: Prisma.AhsListingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AhsListingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AhsListingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          findFirst: {
            args: Prisma.AhsListingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AhsListingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          findMany: {
            args: Prisma.AhsListingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>[]
          }
          create: {
            args: Prisma.AhsListingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          createMany: {
            args: Prisma.AhsListingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AhsListingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>[]
          }
          delete: {
            args: Prisma.AhsListingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          update: {
            args: Prisma.AhsListingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          deleteMany: {
            args: Prisma.AhsListingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AhsListingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AhsListingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AhsListingPayload>
          }
          aggregate: {
            args: Prisma.AhsListingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAhsListing>
          }
          groupBy: {
            args: Prisma.AhsListingGroupByArgs<ExtArgs>
            result: $Utils.Optional<AhsListingGroupByOutputType>[]
          }
          count: {
            args: Prisma.AhsListingCountArgs<ExtArgs>
            result: $Utils.Optional<AhsListingCountAggregateOutputType> | number
          }
        }
      }
      Listing: {
        payload: Prisma.$ListingPayload<ExtArgs>
        fields: Prisma.ListingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ListingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ListingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          findFirst: {
            args: Prisma.ListingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ListingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          findMany: {
            args: Prisma.ListingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>[]
          }
          create: {
            args: Prisma.ListingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          createMany: {
            args: Prisma.ListingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ListingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>[]
          }
          delete: {
            args: Prisma.ListingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          update: {
            args: Prisma.ListingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          deleteMany: {
            args: Prisma.ListingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ListingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ListingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListingPayload>
          }
          aggregate: {
            args: Prisma.ListingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateListing>
          }
          groupBy: {
            args: Prisma.ListingGroupByArgs<ExtArgs>
            result: $Utils.Optional<ListingGroupByOutputType>[]
          }
          count: {
            args: Prisma.ListingCountArgs<ExtArgs>
            result: $Utils.Optional<ListingCountAggregateOutputType> | number
          }
        }
      }
      List: {
        payload: Prisma.$ListPayload<ExtArgs>
        fields: Prisma.ListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ListFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ListFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          findFirst: {
            args: Prisma.ListFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ListFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          findMany: {
            args: Prisma.ListFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>[]
          }
          create: {
            args: Prisma.ListCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          createMany: {
            args: Prisma.ListCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ListCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>[]
          }
          delete: {
            args: Prisma.ListDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          update: {
            args: Prisma.ListUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          deleteMany: {
            args: Prisma.ListDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ListUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ListUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListPayload>
          }
          aggregate: {
            args: Prisma.ListAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateList>
          }
          groupBy: {
            args: Prisma.ListGroupByArgs<ExtArgs>
            result: $Utils.Optional<ListGroupByOutputType>[]
          }
          count: {
            args: Prisma.ListCountArgs<ExtArgs>
            result: $Utils.Optional<ListCountAggregateOutputType> | number
          }
        }
      }
      UserProfile: {
        payload: Prisma.$UserProfilePayload<ExtArgs>
        fields: Prisma.UserProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          findFirst: {
            args: Prisma.UserProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          findMany: {
            args: Prisma.UserProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>[]
          }
          create: {
            args: Prisma.UserProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          createMany: {
            args: Prisma.UserProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>[]
          }
          delete: {
            args: Prisma.UserProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          update: {
            args: Prisma.UserProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          deleteMany: {
            args: Prisma.UserProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          aggregate: {
            args: Prisma.UserProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserProfile>
          }
          groupBy: {
            args: Prisma.UserProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserProfileCountArgs<ExtArgs>
            result: $Utils.Optional<UserProfileCountAggregateOutputType> | number
          }
        }
      }
      Image: {
        payload: Prisma.$ImagePayload<ExtArgs>
        fields: Prisma.ImageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ImageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ImageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          findFirst: {
            args: Prisma.ImageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ImageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          findMany: {
            args: Prisma.ImageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>[]
          }
          create: {
            args: Prisma.ImageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          createMany: {
            args: Prisma.ImageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ImageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>[]
          }
          delete: {
            args: Prisma.ImageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          update: {
            args: Prisma.ImageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          deleteMany: {
            args: Prisma.ImageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ImageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ImageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ImagePayload>
          }
          aggregate: {
            args: Prisma.ImageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateImage>
          }
          groupBy: {
            args: Prisma.ImageGroupByArgs<ExtArgs>
            result: $Utils.Optional<ImageGroupByOutputType>[]
          }
          count: {
            args: Prisma.ImageCountArgs<ExtArgs>
            result: $Utils.Optional<ImageCountAggregateOutputType> | number
          }
        }
      }
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      KeyValue: {
        payload: Prisma.$KeyValuePayload<ExtArgs>
        fields: Prisma.KeyValueFieldRefs
        operations: {
          findUnique: {
            args: Prisma.KeyValueFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.KeyValueFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          findFirst: {
            args: Prisma.KeyValueFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.KeyValueFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          findMany: {
            args: Prisma.KeyValueFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>[]
          }
          create: {
            args: Prisma.KeyValueCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          createMany: {
            args: Prisma.KeyValueCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.KeyValueCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>[]
          }
          delete: {
            args: Prisma.KeyValueDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          update: {
            args: Prisma.KeyValueUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          deleteMany: {
            args: Prisma.KeyValueDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.KeyValueUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.KeyValueUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KeyValuePayload>
          }
          aggregate: {
            args: Prisma.KeyValueAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateKeyValue>
          }
          groupBy: {
            args: Prisma.KeyValueGroupByArgs<ExtArgs>
            result: $Utils.Optional<KeyValueGroupByOutputType>[]
          }
          count: {
            args: Prisma.KeyValueCountArgs<ExtArgs>
            result: $Utils.Optional<KeyValueCountAggregateOutputType> | number
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
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.DriverAdapter | null
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
   * Count Type AhsListingCountOutputType
   */

  export type AhsListingCountOutputType = {
    lilies: number
  }

  export type AhsListingCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | AhsListingCountOutputTypeCountLiliesArgs
  }

  // Custom InputTypes
  /**
   * AhsListingCountOutputType without action
   */
  export type AhsListingCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListingCountOutputType
     */
    select?: AhsListingCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AhsListingCountOutputType without action
   */
  export type AhsListingCountOutputTypeCountLiliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListingWhereInput
  }


  /**
   * Count Type ListingCountOutputType
   */

  export type ListingCountOutputType = {
    images: number
    lists: number
  }

  export type ListingCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    images?: boolean | ListingCountOutputTypeCountImagesArgs
    lists?: boolean | ListingCountOutputTypeCountListsArgs
  }

  // Custom InputTypes
  /**
   * ListingCountOutputType without action
   */
  export type ListingCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListingCountOutputType
     */
    select?: ListingCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ListingCountOutputType without action
   */
  export type ListingCountOutputTypeCountImagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ImageWhereInput
  }

  /**
   * ListingCountOutputType without action
   */
  export type ListingCountOutputTypeCountListsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListWhereInput
  }


  /**
   * Count Type ListCountOutputType
   */

  export type ListCountOutputType = {
    listings: number
  }

  export type ListCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listings?: boolean | ListCountOutputTypeCountListingsArgs
  }

  // Custom InputTypes
  /**
   * ListCountOutputType without action
   */
  export type ListCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListCountOutputType
     */
    select?: ListCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ListCountOutputType without action
   */
  export type ListCountOutputTypeCountListingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListingWhereInput
  }


  /**
   * Count Type UserProfileCountOutputType
   */

  export type UserProfileCountOutputType = {
    images: number
  }

  export type UserProfileCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    images?: boolean | UserProfileCountOutputTypeCountImagesArgs
  }

  // Custom InputTypes
  /**
   * UserProfileCountOutputType without action
   */
  export type UserProfileCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfileCountOutputType
     */
    select?: UserProfileCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserProfileCountOutputType without action
   */
  export type UserProfileCountOutputTypeCountImagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ImageWhereInput
  }


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    listings: number
    lists: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listings?: boolean | UserCountOutputTypeCountListingsArgs
    lists?: boolean | UserCountOutputTypeCountListsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountListingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListingWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountListsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListWhereInput
  }


  /**
   * Models
   */

  /**
   * Model AhsListing
   */

  export type AggregateAhsListing = {
    _count: AhsListingCountAggregateOutputType | null
    _min: AhsListingMinAggregateOutputType | null
    _max: AhsListingMaxAggregateOutputType | null
  }

  export type AhsListingMinAggregateOutputType = {
    id: string | null
    name: string | null
    hybridizer: string | null
    year: string | null
    scapeHeight: string | null
    bloomSize: string | null
    bloomSeason: string | null
    ploidy: string | null
    foliageType: string | null
    bloomHabit: string | null
    seedlingNum: string | null
    color: string | null
    form: string | null
    parentage: string | null
    ahsImageUrl: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AhsListingMaxAggregateOutputType = {
    id: string | null
    name: string | null
    hybridizer: string | null
    year: string | null
    scapeHeight: string | null
    bloomSize: string | null
    bloomSeason: string | null
    ploidy: string | null
    foliageType: string | null
    bloomHabit: string | null
    seedlingNum: string | null
    color: string | null
    form: string | null
    parentage: string | null
    ahsImageUrl: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AhsListingCountAggregateOutputType = {
    id: number
    name: number
    hybridizer: number
    year: number
    scapeHeight: number
    bloomSize: number
    bloomSeason: number
    ploidy: number
    foliageType: number
    bloomHabit: number
    seedlingNum: number
    color: number
    form: number
    parentage: number
    ahsImageUrl: number
    fragrance: number
    budcount: number
    branches: number
    sculpting: number
    foliage: number
    flower: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AhsListingMinAggregateInputType = {
    id?: true
    name?: true
    hybridizer?: true
    year?: true
    scapeHeight?: true
    bloomSize?: true
    bloomSeason?: true
    ploidy?: true
    foliageType?: true
    bloomHabit?: true
    seedlingNum?: true
    color?: true
    form?: true
    parentage?: true
    ahsImageUrl?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AhsListingMaxAggregateInputType = {
    id?: true
    name?: true
    hybridizer?: true
    year?: true
    scapeHeight?: true
    bloomSize?: true
    bloomSeason?: true
    ploidy?: true
    foliageType?: true
    bloomHabit?: true
    seedlingNum?: true
    color?: true
    form?: true
    parentage?: true
    ahsImageUrl?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AhsListingCountAggregateInputType = {
    id?: true
    name?: true
    hybridizer?: true
    year?: true
    scapeHeight?: true
    bloomSize?: true
    bloomSeason?: true
    ploidy?: true
    foliageType?: true
    bloomHabit?: true
    seedlingNum?: true
    color?: true
    form?: true
    parentage?: true
    ahsImageUrl?: true
    fragrance?: true
    budcount?: true
    branches?: true
    sculpting?: true
    foliage?: true
    flower?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AhsListingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AhsListing to aggregate.
     */
    where?: AhsListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AhsListings to fetch.
     */
    orderBy?: AhsListingOrderByWithRelationInput | AhsListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AhsListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AhsListings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AhsListings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AhsListings
    **/
    _count?: true | AhsListingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AhsListingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AhsListingMaxAggregateInputType
  }

  export type GetAhsListingAggregateType<T extends AhsListingAggregateArgs> = {
        [P in keyof T & keyof AggregateAhsListing]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAhsListing[P]>
      : GetScalarType<T[P], AggregateAhsListing[P]>
  }




  export type AhsListingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AhsListingWhereInput
    orderBy?: AhsListingOrderByWithAggregationInput | AhsListingOrderByWithAggregationInput[]
    by: AhsListingScalarFieldEnum[] | AhsListingScalarFieldEnum
    having?: AhsListingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AhsListingCountAggregateInputType | true
    _min?: AhsListingMinAggregateInputType
    _max?: AhsListingMaxAggregateInputType
  }

  export type AhsListingGroupByOutputType = {
    id: string
    name: string | null
    hybridizer: string | null
    year: string | null
    scapeHeight: string | null
    bloomSize: string | null
    bloomSeason: string | null
    ploidy: string | null
    foliageType: string | null
    bloomHabit: string | null
    seedlingNum: string | null
    color: string | null
    form: string | null
    parentage: string | null
    ahsImageUrl: string | null
    fragrance: string | null
    budcount: string | null
    branches: string | null
    sculpting: string | null
    foliage: string | null
    flower: string | null
    createdAt: Date
    updatedAt: Date
    _count: AhsListingCountAggregateOutputType | null
    _min: AhsListingMinAggregateOutputType | null
    _max: AhsListingMaxAggregateOutputType | null
  }

  type GetAhsListingGroupByPayload<T extends AhsListingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AhsListingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AhsListingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AhsListingGroupByOutputType[P]>
            : GetScalarType<T[P], AhsListingGroupByOutputType[P]>
        }
      >
    >


  export type AhsListingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scapeHeight?: boolean
    bloomSize?: boolean
    bloomSeason?: boolean
    ploidy?: boolean
    foliageType?: boolean
    bloomHabit?: boolean
    seedlingNum?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    ahsImageUrl?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lilies?: boolean | AhsListing$liliesArgs<ExtArgs>
    _count?: boolean | AhsListingCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ahsListing"]>

  export type AhsListingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scapeHeight?: boolean
    bloomSize?: boolean
    bloomSeason?: boolean
    ploidy?: boolean
    foliageType?: boolean
    bloomHabit?: boolean
    seedlingNum?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    ahsImageUrl?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ahsListing"]>

  export type AhsListingSelectScalar = {
    id?: boolean
    name?: boolean
    hybridizer?: boolean
    year?: boolean
    scapeHeight?: boolean
    bloomSize?: boolean
    bloomSeason?: boolean
    ploidy?: boolean
    foliageType?: boolean
    bloomHabit?: boolean
    seedlingNum?: boolean
    color?: boolean
    form?: boolean
    parentage?: boolean
    ahsImageUrl?: boolean
    fragrance?: boolean
    budcount?: boolean
    branches?: boolean
    sculpting?: boolean
    foliage?: boolean
    flower?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AhsListingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lilies?: boolean | AhsListing$liliesArgs<ExtArgs>
    _count?: boolean | AhsListingCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AhsListingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $AhsListingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AhsListing"
    objects: {
      lilies: Prisma.$ListingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string | null
      hybridizer: string | null
      year: string | null
      scapeHeight: string | null
      bloomSize: string | null
      bloomSeason: string | null
      ploidy: string | null
      foliageType: string | null
      bloomHabit: string | null
      seedlingNum: string | null
      color: string | null
      form: string | null
      parentage: string | null
      ahsImageUrl: string | null
      fragrance: string | null
      budcount: string | null
      branches: string | null
      sculpting: string | null
      foliage: string | null
      flower: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["ahsListing"]>
    composites: {}
  }

  type AhsListingGetPayload<S extends boolean | null | undefined | AhsListingDefaultArgs> = $Result.GetResult<Prisma.$AhsListingPayload, S>

  type AhsListingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AhsListingFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AhsListingCountAggregateInputType | true
    }

  export interface AhsListingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AhsListing'], meta: { name: 'AhsListing' } }
    /**
     * Find zero or one AhsListing that matches the filter.
     * @param {AhsListingFindUniqueArgs} args - Arguments to find a AhsListing
     * @example
     * // Get one AhsListing
     * const ahsListing = await prisma.ahsListing.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AhsListingFindUniqueArgs>(args: SelectSubset<T, AhsListingFindUniqueArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AhsListing that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AhsListingFindUniqueOrThrowArgs} args - Arguments to find a AhsListing
     * @example
     * // Get one AhsListing
     * const ahsListing = await prisma.ahsListing.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AhsListingFindUniqueOrThrowArgs>(args: SelectSubset<T, AhsListingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AhsListing that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingFindFirstArgs} args - Arguments to find a AhsListing
     * @example
     * // Get one AhsListing
     * const ahsListing = await prisma.ahsListing.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AhsListingFindFirstArgs>(args?: SelectSubset<T, AhsListingFindFirstArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AhsListing that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingFindFirstOrThrowArgs} args - Arguments to find a AhsListing
     * @example
     * // Get one AhsListing
     * const ahsListing = await prisma.ahsListing.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AhsListingFindFirstOrThrowArgs>(args?: SelectSubset<T, AhsListingFindFirstOrThrowArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AhsListings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AhsListings
     * const ahsListings = await prisma.ahsListing.findMany()
     * 
     * // Get first 10 AhsListings
     * const ahsListings = await prisma.ahsListing.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ahsListingWithIdOnly = await prisma.ahsListing.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AhsListingFindManyArgs>(args?: SelectSubset<T, AhsListingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AhsListing.
     * @param {AhsListingCreateArgs} args - Arguments to create a AhsListing.
     * @example
     * // Create one AhsListing
     * const AhsListing = await prisma.ahsListing.create({
     *   data: {
     *     // ... data to create a AhsListing
     *   }
     * })
     * 
     */
    create<T extends AhsListingCreateArgs>(args: SelectSubset<T, AhsListingCreateArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AhsListings.
     * @param {AhsListingCreateManyArgs} args - Arguments to create many AhsListings.
     * @example
     * // Create many AhsListings
     * const ahsListing = await prisma.ahsListing.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AhsListingCreateManyArgs>(args?: SelectSubset<T, AhsListingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AhsListings and returns the data saved in the database.
     * @param {AhsListingCreateManyAndReturnArgs} args - Arguments to create many AhsListings.
     * @example
     * // Create many AhsListings
     * const ahsListing = await prisma.ahsListing.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AhsListings and only return the `id`
     * const ahsListingWithIdOnly = await prisma.ahsListing.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AhsListingCreateManyAndReturnArgs>(args?: SelectSubset<T, AhsListingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AhsListing.
     * @param {AhsListingDeleteArgs} args - Arguments to delete one AhsListing.
     * @example
     * // Delete one AhsListing
     * const AhsListing = await prisma.ahsListing.delete({
     *   where: {
     *     // ... filter to delete one AhsListing
     *   }
     * })
     * 
     */
    delete<T extends AhsListingDeleteArgs>(args: SelectSubset<T, AhsListingDeleteArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AhsListing.
     * @param {AhsListingUpdateArgs} args - Arguments to update one AhsListing.
     * @example
     * // Update one AhsListing
     * const ahsListing = await prisma.ahsListing.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AhsListingUpdateArgs>(args: SelectSubset<T, AhsListingUpdateArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AhsListings.
     * @param {AhsListingDeleteManyArgs} args - Arguments to filter AhsListings to delete.
     * @example
     * // Delete a few AhsListings
     * const { count } = await prisma.ahsListing.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AhsListingDeleteManyArgs>(args?: SelectSubset<T, AhsListingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AhsListings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AhsListings
     * const ahsListing = await prisma.ahsListing.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AhsListingUpdateManyArgs>(args: SelectSubset<T, AhsListingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AhsListing.
     * @param {AhsListingUpsertArgs} args - Arguments to update or create a AhsListing.
     * @example
     * // Update or create a AhsListing
     * const ahsListing = await prisma.ahsListing.upsert({
     *   create: {
     *     // ... data to create a AhsListing
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AhsListing we want to update
     *   }
     * })
     */
    upsert<T extends AhsListingUpsertArgs>(args: SelectSubset<T, AhsListingUpsertArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AhsListings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingCountArgs} args - Arguments to filter AhsListings to count.
     * @example
     * // Count the number of AhsListings
     * const count = await prisma.ahsListing.count({
     *   where: {
     *     // ... the filter for the AhsListings we want to count
     *   }
     * })
    **/
    count<T extends AhsListingCountArgs>(
      args?: Subset<T, AhsListingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AhsListingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AhsListing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AhsListingAggregateArgs>(args: Subset<T, AhsListingAggregateArgs>): Prisma.PrismaPromise<GetAhsListingAggregateType<T>>

    /**
     * Group by AhsListing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AhsListingGroupByArgs} args - Group by arguments.
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
      T extends AhsListingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AhsListingGroupByArgs['orderBy'] }
        : { orderBy?: AhsListingGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AhsListingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAhsListingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AhsListing model
   */
  readonly fields: AhsListingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AhsListing.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AhsListingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lilies<T extends AhsListing$liliesArgs<ExtArgs> = {}>(args?: Subset<T, AhsListing$liliesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the AhsListing model
   */ 
  interface AhsListingFieldRefs {
    readonly id: FieldRef<"AhsListing", 'String'>
    readonly name: FieldRef<"AhsListing", 'String'>
    readonly hybridizer: FieldRef<"AhsListing", 'String'>
    readonly year: FieldRef<"AhsListing", 'String'>
    readonly scapeHeight: FieldRef<"AhsListing", 'String'>
    readonly bloomSize: FieldRef<"AhsListing", 'String'>
    readonly bloomSeason: FieldRef<"AhsListing", 'String'>
    readonly ploidy: FieldRef<"AhsListing", 'String'>
    readonly foliageType: FieldRef<"AhsListing", 'String'>
    readonly bloomHabit: FieldRef<"AhsListing", 'String'>
    readonly seedlingNum: FieldRef<"AhsListing", 'String'>
    readonly color: FieldRef<"AhsListing", 'String'>
    readonly form: FieldRef<"AhsListing", 'String'>
    readonly parentage: FieldRef<"AhsListing", 'String'>
    readonly ahsImageUrl: FieldRef<"AhsListing", 'String'>
    readonly fragrance: FieldRef<"AhsListing", 'String'>
    readonly budcount: FieldRef<"AhsListing", 'String'>
    readonly branches: FieldRef<"AhsListing", 'String'>
    readonly sculpting: FieldRef<"AhsListing", 'String'>
    readonly foliage: FieldRef<"AhsListing", 'String'>
    readonly flower: FieldRef<"AhsListing", 'String'>
    readonly createdAt: FieldRef<"AhsListing", 'DateTime'>
    readonly updatedAt: FieldRef<"AhsListing", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AhsListing findUnique
   */
  export type AhsListingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter, which AhsListing to fetch.
     */
    where: AhsListingWhereUniqueInput
  }

  /**
   * AhsListing findUniqueOrThrow
   */
  export type AhsListingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter, which AhsListing to fetch.
     */
    where: AhsListingWhereUniqueInput
  }

  /**
   * AhsListing findFirst
   */
  export type AhsListingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter, which AhsListing to fetch.
     */
    where?: AhsListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AhsListings to fetch.
     */
    orderBy?: AhsListingOrderByWithRelationInput | AhsListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AhsListings.
     */
    cursor?: AhsListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AhsListings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AhsListings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AhsListings.
     */
    distinct?: AhsListingScalarFieldEnum | AhsListingScalarFieldEnum[]
  }

  /**
   * AhsListing findFirstOrThrow
   */
  export type AhsListingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter, which AhsListing to fetch.
     */
    where?: AhsListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AhsListings to fetch.
     */
    orderBy?: AhsListingOrderByWithRelationInput | AhsListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AhsListings.
     */
    cursor?: AhsListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AhsListings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AhsListings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AhsListings.
     */
    distinct?: AhsListingScalarFieldEnum | AhsListingScalarFieldEnum[]
  }

  /**
   * AhsListing findMany
   */
  export type AhsListingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter, which AhsListings to fetch.
     */
    where?: AhsListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AhsListings to fetch.
     */
    orderBy?: AhsListingOrderByWithRelationInput | AhsListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AhsListings.
     */
    cursor?: AhsListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AhsListings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AhsListings.
     */
    skip?: number
    distinct?: AhsListingScalarFieldEnum | AhsListingScalarFieldEnum[]
  }

  /**
   * AhsListing create
   */
  export type AhsListingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * The data needed to create a AhsListing.
     */
    data: XOR<AhsListingCreateInput, AhsListingUncheckedCreateInput>
  }

  /**
   * AhsListing createMany
   */
  export type AhsListingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AhsListings.
     */
    data: AhsListingCreateManyInput | AhsListingCreateManyInput[]
  }

  /**
   * AhsListing createManyAndReturn
   */
  export type AhsListingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AhsListings.
     */
    data: AhsListingCreateManyInput | AhsListingCreateManyInput[]
  }

  /**
   * AhsListing update
   */
  export type AhsListingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * The data needed to update a AhsListing.
     */
    data: XOR<AhsListingUpdateInput, AhsListingUncheckedUpdateInput>
    /**
     * Choose, which AhsListing to update.
     */
    where: AhsListingWhereUniqueInput
  }

  /**
   * AhsListing updateMany
   */
  export type AhsListingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AhsListings.
     */
    data: XOR<AhsListingUpdateManyMutationInput, AhsListingUncheckedUpdateManyInput>
    /**
     * Filter which AhsListings to update
     */
    where?: AhsListingWhereInput
  }

  /**
   * AhsListing upsert
   */
  export type AhsListingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * The filter to search for the AhsListing to update in case it exists.
     */
    where: AhsListingWhereUniqueInput
    /**
     * In case the AhsListing found by the `where` argument doesn't exist, create a new AhsListing with this data.
     */
    create: XOR<AhsListingCreateInput, AhsListingUncheckedCreateInput>
    /**
     * In case the AhsListing was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AhsListingUpdateInput, AhsListingUncheckedUpdateInput>
  }

  /**
   * AhsListing delete
   */
  export type AhsListingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    /**
     * Filter which AhsListing to delete.
     */
    where: AhsListingWhereUniqueInput
  }

  /**
   * AhsListing deleteMany
   */
  export type AhsListingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AhsListings to delete
     */
    where?: AhsListingWhereInput
  }

  /**
   * AhsListing.lilies
   */
  export type AhsListing$liliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    where?: ListingWhereInput
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    cursor?: ListingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * AhsListing without action
   */
  export type AhsListingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
  }


  /**
   * Model Listing
   */

  export type AggregateListing = {
    _count: ListingCountAggregateOutputType | null
    _avg: ListingAvgAggregateOutputType | null
    _sum: ListingSumAggregateOutputType | null
    _min: ListingMinAggregateOutputType | null
    _max: ListingMaxAggregateOutputType | null
  }

  export type ListingAvgAggregateOutputType = {
    price: number | null
  }

  export type ListingSumAggregateOutputType = {
    price: number | null
  }

  export type ListingMinAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    slug: string | null
    price: number | null
    description: string | null
    privateNote: string | null
    ahsId: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListingMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    slug: string | null
    price: number | null
    description: string | null
    privateNote: string | null
    ahsId: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListingCountAggregateOutputType = {
    id: number
    userId: number
    title: number
    slug: number
    price: number
    description: number
    privateNote: number
    ahsId: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ListingAvgAggregateInputType = {
    price?: true
  }

  export type ListingSumAggregateInputType = {
    price?: true
  }

  export type ListingMinAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    price?: true
    description?: true
    privateNote?: true
    ahsId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListingMaxAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    price?: true
    description?: true
    privateNote?: true
    ahsId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListingCountAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    price?: true
    description?: true
    privateNote?: true
    ahsId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ListingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Listing to aggregate.
     */
    where?: ListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Listings to fetch.
     */
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Listings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Listings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Listings
    **/
    _count?: true | ListingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ListingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ListingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ListingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ListingMaxAggregateInputType
  }

  export type GetListingAggregateType<T extends ListingAggregateArgs> = {
        [P in keyof T & keyof AggregateListing]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateListing[P]>
      : GetScalarType<T[P], AggregateListing[P]>
  }




  export type ListingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListingWhereInput
    orderBy?: ListingOrderByWithAggregationInput | ListingOrderByWithAggregationInput[]
    by: ListingScalarFieldEnum[] | ListingScalarFieldEnum
    having?: ListingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ListingCountAggregateInputType | true
    _avg?: ListingAvgAggregateInputType
    _sum?: ListingSumAggregateInputType
    _min?: ListingMinAggregateInputType
    _max?: ListingMaxAggregateInputType
  }

  export type ListingGroupByOutputType = {
    id: string
    userId: string
    title: string
    slug: string
    price: number | null
    description: string | null
    privateNote: string | null
    ahsId: string | null
    status: string | null
    createdAt: Date
    updatedAt: Date
    _count: ListingCountAggregateOutputType | null
    _avg: ListingAvgAggregateOutputType | null
    _sum: ListingSumAggregateOutputType | null
    _min: ListingMinAggregateOutputType | null
    _max: ListingMaxAggregateOutputType | null
  }

  type GetListingGroupByPayload<T extends ListingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ListingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ListingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ListingGroupByOutputType[P]>
            : GetScalarType<T[P], ListingGroupByOutputType[P]>
        }
      >
    >


  export type ListingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    price?: boolean
    description?: boolean
    privateNote?: boolean
    ahsId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    images?: boolean | Listing$imagesArgs<ExtArgs>
    ahsListing?: boolean | Listing$ahsListingArgs<ExtArgs>
    lists?: boolean | Listing$listsArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ListingCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["listing"]>

  export type ListingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    price?: boolean
    description?: boolean
    privateNote?: boolean
    ahsId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ahsListing?: boolean | Listing$ahsListingArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["listing"]>

  export type ListingSelectScalar = {
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    price?: boolean
    description?: boolean
    privateNote?: boolean
    ahsId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ListingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    images?: boolean | Listing$imagesArgs<ExtArgs>
    ahsListing?: boolean | Listing$ahsListingArgs<ExtArgs>
    lists?: boolean | Listing$listsArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ListingCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ListingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ahsListing?: boolean | Listing$ahsListingArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ListingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Listing"
    objects: {
      images: Prisma.$ImagePayload<ExtArgs>[]
      ahsListing: Prisma.$AhsListingPayload<ExtArgs> | null
      lists: Prisma.$ListPayload<ExtArgs>[]
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      title: string
      slug: string
      price: number | null
      description: string | null
      privateNote: string | null
      ahsId: string | null
      status: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["listing"]>
    composites: {}
  }

  type ListingGetPayload<S extends boolean | null | undefined | ListingDefaultArgs> = $Result.GetResult<Prisma.$ListingPayload, S>

  type ListingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ListingFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ListingCountAggregateInputType | true
    }

  export interface ListingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Listing'], meta: { name: 'Listing' } }
    /**
     * Find zero or one Listing that matches the filter.
     * @param {ListingFindUniqueArgs} args - Arguments to find a Listing
     * @example
     * // Get one Listing
     * const listing = await prisma.listing.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ListingFindUniqueArgs>(args: SelectSubset<T, ListingFindUniqueArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Listing that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ListingFindUniqueOrThrowArgs} args - Arguments to find a Listing
     * @example
     * // Get one Listing
     * const listing = await prisma.listing.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ListingFindUniqueOrThrowArgs>(args: SelectSubset<T, ListingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Listing that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingFindFirstArgs} args - Arguments to find a Listing
     * @example
     * // Get one Listing
     * const listing = await prisma.listing.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ListingFindFirstArgs>(args?: SelectSubset<T, ListingFindFirstArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Listing that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingFindFirstOrThrowArgs} args - Arguments to find a Listing
     * @example
     * // Get one Listing
     * const listing = await prisma.listing.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ListingFindFirstOrThrowArgs>(args?: SelectSubset<T, ListingFindFirstOrThrowArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Listings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Listings
     * const listings = await prisma.listing.findMany()
     * 
     * // Get first 10 Listings
     * const listings = await prisma.listing.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const listingWithIdOnly = await prisma.listing.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ListingFindManyArgs>(args?: SelectSubset<T, ListingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Listing.
     * @param {ListingCreateArgs} args - Arguments to create a Listing.
     * @example
     * // Create one Listing
     * const Listing = await prisma.listing.create({
     *   data: {
     *     // ... data to create a Listing
     *   }
     * })
     * 
     */
    create<T extends ListingCreateArgs>(args: SelectSubset<T, ListingCreateArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Listings.
     * @param {ListingCreateManyArgs} args - Arguments to create many Listings.
     * @example
     * // Create many Listings
     * const listing = await prisma.listing.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ListingCreateManyArgs>(args?: SelectSubset<T, ListingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Listings and returns the data saved in the database.
     * @param {ListingCreateManyAndReturnArgs} args - Arguments to create many Listings.
     * @example
     * // Create many Listings
     * const listing = await prisma.listing.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Listings and only return the `id`
     * const listingWithIdOnly = await prisma.listing.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ListingCreateManyAndReturnArgs>(args?: SelectSubset<T, ListingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Listing.
     * @param {ListingDeleteArgs} args - Arguments to delete one Listing.
     * @example
     * // Delete one Listing
     * const Listing = await prisma.listing.delete({
     *   where: {
     *     // ... filter to delete one Listing
     *   }
     * })
     * 
     */
    delete<T extends ListingDeleteArgs>(args: SelectSubset<T, ListingDeleteArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Listing.
     * @param {ListingUpdateArgs} args - Arguments to update one Listing.
     * @example
     * // Update one Listing
     * const listing = await prisma.listing.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ListingUpdateArgs>(args: SelectSubset<T, ListingUpdateArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Listings.
     * @param {ListingDeleteManyArgs} args - Arguments to filter Listings to delete.
     * @example
     * // Delete a few Listings
     * const { count } = await prisma.listing.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ListingDeleteManyArgs>(args?: SelectSubset<T, ListingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Listings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Listings
     * const listing = await prisma.listing.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ListingUpdateManyArgs>(args: SelectSubset<T, ListingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Listing.
     * @param {ListingUpsertArgs} args - Arguments to update or create a Listing.
     * @example
     * // Update or create a Listing
     * const listing = await prisma.listing.upsert({
     *   create: {
     *     // ... data to create a Listing
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Listing we want to update
     *   }
     * })
     */
    upsert<T extends ListingUpsertArgs>(args: SelectSubset<T, ListingUpsertArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Listings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingCountArgs} args - Arguments to filter Listings to count.
     * @example
     * // Count the number of Listings
     * const count = await prisma.listing.count({
     *   where: {
     *     // ... the filter for the Listings we want to count
     *   }
     * })
    **/
    count<T extends ListingCountArgs>(
      args?: Subset<T, ListingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ListingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Listing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ListingAggregateArgs>(args: Subset<T, ListingAggregateArgs>): Prisma.PrismaPromise<GetListingAggregateType<T>>

    /**
     * Group by Listing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListingGroupByArgs} args - Group by arguments.
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
      T extends ListingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ListingGroupByArgs['orderBy'] }
        : { orderBy?: ListingGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ListingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetListingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Listing model
   */
  readonly fields: ListingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Listing.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ListingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    images<T extends Listing$imagesArgs<ExtArgs> = {}>(args?: Subset<T, Listing$imagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findMany"> | Null>
    ahsListing<T extends Listing$ahsListingArgs<ExtArgs> = {}>(args?: Subset<T, Listing$ahsListingArgs<ExtArgs>>): Prisma__AhsListingClient<$Result.GetResult<Prisma.$AhsListingPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    lists<T extends Listing$listsArgs<ExtArgs> = {}>(args?: Subset<T, Listing$listsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findMany"> | Null>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the Listing model
   */ 
  interface ListingFieldRefs {
    readonly id: FieldRef<"Listing", 'String'>
    readonly userId: FieldRef<"Listing", 'String'>
    readonly title: FieldRef<"Listing", 'String'>
    readonly slug: FieldRef<"Listing", 'String'>
    readonly price: FieldRef<"Listing", 'Float'>
    readonly description: FieldRef<"Listing", 'String'>
    readonly privateNote: FieldRef<"Listing", 'String'>
    readonly ahsId: FieldRef<"Listing", 'String'>
    readonly status: FieldRef<"Listing", 'String'>
    readonly createdAt: FieldRef<"Listing", 'DateTime'>
    readonly updatedAt: FieldRef<"Listing", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Listing findUnique
   */
  export type ListingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter, which Listing to fetch.
     */
    where: ListingWhereUniqueInput
  }

  /**
   * Listing findUniqueOrThrow
   */
  export type ListingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter, which Listing to fetch.
     */
    where: ListingWhereUniqueInput
  }

  /**
   * Listing findFirst
   */
  export type ListingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter, which Listing to fetch.
     */
    where?: ListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Listings to fetch.
     */
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Listings.
     */
    cursor?: ListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Listings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Listings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Listings.
     */
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * Listing findFirstOrThrow
   */
  export type ListingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter, which Listing to fetch.
     */
    where?: ListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Listings to fetch.
     */
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Listings.
     */
    cursor?: ListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Listings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Listings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Listings.
     */
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * Listing findMany
   */
  export type ListingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter, which Listings to fetch.
     */
    where?: ListingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Listings to fetch.
     */
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Listings.
     */
    cursor?: ListingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Listings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Listings.
     */
    skip?: number
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * Listing create
   */
  export type ListingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * The data needed to create a Listing.
     */
    data: XOR<ListingCreateInput, ListingUncheckedCreateInput>
  }

  /**
   * Listing createMany
   */
  export type ListingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Listings.
     */
    data: ListingCreateManyInput | ListingCreateManyInput[]
  }

  /**
   * Listing createManyAndReturn
   */
  export type ListingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Listings.
     */
    data: ListingCreateManyInput | ListingCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Listing update
   */
  export type ListingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * The data needed to update a Listing.
     */
    data: XOR<ListingUpdateInput, ListingUncheckedUpdateInput>
    /**
     * Choose, which Listing to update.
     */
    where: ListingWhereUniqueInput
  }

  /**
   * Listing updateMany
   */
  export type ListingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Listings.
     */
    data: XOR<ListingUpdateManyMutationInput, ListingUncheckedUpdateManyInput>
    /**
     * Filter which Listings to update
     */
    where?: ListingWhereInput
  }

  /**
   * Listing upsert
   */
  export type ListingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * The filter to search for the Listing to update in case it exists.
     */
    where: ListingWhereUniqueInput
    /**
     * In case the Listing found by the `where` argument doesn't exist, create a new Listing with this data.
     */
    create: XOR<ListingCreateInput, ListingUncheckedCreateInput>
    /**
     * In case the Listing was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ListingUpdateInput, ListingUncheckedUpdateInput>
  }

  /**
   * Listing delete
   */
  export type ListingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    /**
     * Filter which Listing to delete.
     */
    where: ListingWhereUniqueInput
  }

  /**
   * Listing deleteMany
   */
  export type ListingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Listings to delete
     */
    where?: ListingWhereInput
  }

  /**
   * Listing.images
   */
  export type Listing$imagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    where?: ImageWhereInput
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    cursor?: ImageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ImageScalarFieldEnum | ImageScalarFieldEnum[]
  }

  /**
   * Listing.ahsListing
   */
  export type Listing$ahsListingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AhsListing
     */
    select?: AhsListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AhsListingInclude<ExtArgs> | null
    where?: AhsListingWhereInput
  }

  /**
   * Listing.lists
   */
  export type Listing$listsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    where?: ListWhereInput
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    cursor?: ListWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListScalarFieldEnum | ListScalarFieldEnum[]
  }

  /**
   * Listing without action
   */
  export type ListingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
  }


  /**
   * Model List
   */

  export type AggregateList = {
    _count: ListCountAggregateOutputType | null
    _min: ListMinAggregateOutputType | null
    _max: ListMaxAggregateOutputType | null
  }

  export type ListMinAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    description: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    description: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListCountAggregateOutputType = {
    id: number
    userId: number
    title: number
    description: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ListMinAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListMaxAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListCountAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ListAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which List to aggregate.
     */
    where?: ListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lists to fetch.
     */
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Lists
    **/
    _count?: true | ListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ListMaxAggregateInputType
  }

  export type GetListAggregateType<T extends ListAggregateArgs> = {
        [P in keyof T & keyof AggregateList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateList[P]>
      : GetScalarType<T[P], AggregateList[P]>
  }




  export type ListGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListWhereInput
    orderBy?: ListOrderByWithAggregationInput | ListOrderByWithAggregationInput[]
    by: ListScalarFieldEnum[] | ListScalarFieldEnum
    having?: ListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ListCountAggregateInputType | true
    _min?: ListMinAggregateInputType
    _max?: ListMaxAggregateInputType
  }

  export type ListGroupByOutputType = {
    id: string
    userId: string
    title: string
    description: string | null
    status: string | null
    createdAt: Date
    updatedAt: Date
    _count: ListCountAggregateOutputType | null
    _min: ListMinAggregateOutputType | null
    _max: ListMaxAggregateOutputType | null
  }

  type GetListGroupByPayload<T extends ListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ListGroupByOutputType[P]>
            : GetScalarType<T[P], ListGroupByOutputType[P]>
        }
      >
    >


  export type ListSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    listings?: boolean | List$listingsArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ListCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["list"]>

  export type ListSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["list"]>

  export type ListSelectScalar = {
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ListInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listings?: boolean | List$listingsArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ListCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ListIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ListPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "List"
    objects: {
      listings: Prisma.$ListingPayload<ExtArgs>[]
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      title: string
      description: string | null
      status: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["list"]>
    composites: {}
  }

  type ListGetPayload<S extends boolean | null | undefined | ListDefaultArgs> = $Result.GetResult<Prisma.$ListPayload, S>

  type ListCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ListFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ListCountAggregateInputType | true
    }

  export interface ListDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['List'], meta: { name: 'List' } }
    /**
     * Find zero or one List that matches the filter.
     * @param {ListFindUniqueArgs} args - Arguments to find a List
     * @example
     * // Get one List
     * const list = await prisma.list.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ListFindUniqueArgs>(args: SelectSubset<T, ListFindUniqueArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one List that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ListFindUniqueOrThrowArgs} args - Arguments to find a List
     * @example
     * // Get one List
     * const list = await prisma.list.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ListFindUniqueOrThrowArgs>(args: SelectSubset<T, ListFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first List that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListFindFirstArgs} args - Arguments to find a List
     * @example
     * // Get one List
     * const list = await prisma.list.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ListFindFirstArgs>(args?: SelectSubset<T, ListFindFirstArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first List that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListFindFirstOrThrowArgs} args - Arguments to find a List
     * @example
     * // Get one List
     * const list = await prisma.list.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ListFindFirstOrThrowArgs>(args?: SelectSubset<T, ListFindFirstOrThrowArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Lists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Lists
     * const lists = await prisma.list.findMany()
     * 
     * // Get first 10 Lists
     * const lists = await prisma.list.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const listWithIdOnly = await prisma.list.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ListFindManyArgs>(args?: SelectSubset<T, ListFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a List.
     * @param {ListCreateArgs} args - Arguments to create a List.
     * @example
     * // Create one List
     * const List = await prisma.list.create({
     *   data: {
     *     // ... data to create a List
     *   }
     * })
     * 
     */
    create<T extends ListCreateArgs>(args: SelectSubset<T, ListCreateArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Lists.
     * @param {ListCreateManyArgs} args - Arguments to create many Lists.
     * @example
     * // Create many Lists
     * const list = await prisma.list.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ListCreateManyArgs>(args?: SelectSubset<T, ListCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Lists and returns the data saved in the database.
     * @param {ListCreateManyAndReturnArgs} args - Arguments to create many Lists.
     * @example
     * // Create many Lists
     * const list = await prisma.list.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Lists and only return the `id`
     * const listWithIdOnly = await prisma.list.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ListCreateManyAndReturnArgs>(args?: SelectSubset<T, ListCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a List.
     * @param {ListDeleteArgs} args - Arguments to delete one List.
     * @example
     * // Delete one List
     * const List = await prisma.list.delete({
     *   where: {
     *     // ... filter to delete one List
     *   }
     * })
     * 
     */
    delete<T extends ListDeleteArgs>(args: SelectSubset<T, ListDeleteArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one List.
     * @param {ListUpdateArgs} args - Arguments to update one List.
     * @example
     * // Update one List
     * const list = await prisma.list.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ListUpdateArgs>(args: SelectSubset<T, ListUpdateArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Lists.
     * @param {ListDeleteManyArgs} args - Arguments to filter Lists to delete.
     * @example
     * // Delete a few Lists
     * const { count } = await prisma.list.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ListDeleteManyArgs>(args?: SelectSubset<T, ListDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Lists
     * const list = await prisma.list.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ListUpdateManyArgs>(args: SelectSubset<T, ListUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one List.
     * @param {ListUpsertArgs} args - Arguments to update or create a List.
     * @example
     * // Update or create a List
     * const list = await prisma.list.upsert({
     *   create: {
     *     // ... data to create a List
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the List we want to update
     *   }
     * })
     */
    upsert<T extends ListUpsertArgs>(args: SelectSubset<T, ListUpsertArgs<ExtArgs>>): Prisma__ListClient<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Lists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListCountArgs} args - Arguments to filter Lists to count.
     * @example
     * // Count the number of Lists
     * const count = await prisma.list.count({
     *   where: {
     *     // ... the filter for the Lists we want to count
     *   }
     * })
    **/
    count<T extends ListCountArgs>(
      args?: Subset<T, ListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a List.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ListAggregateArgs>(args: Subset<T, ListAggregateArgs>): Prisma.PrismaPromise<GetListAggregateType<T>>

    /**
     * Group by List.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListGroupByArgs} args - Group by arguments.
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
      T extends ListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ListGroupByArgs['orderBy'] }
        : { orderBy?: ListGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the List model
   */
  readonly fields: ListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for List.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ListClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    listings<T extends List$listingsArgs<ExtArgs> = {}>(args?: Subset<T, List$listingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findMany"> | Null>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the List model
   */ 
  interface ListFieldRefs {
    readonly id: FieldRef<"List", 'String'>
    readonly userId: FieldRef<"List", 'String'>
    readonly title: FieldRef<"List", 'String'>
    readonly description: FieldRef<"List", 'String'>
    readonly status: FieldRef<"List", 'String'>
    readonly createdAt: FieldRef<"List", 'DateTime'>
    readonly updatedAt: FieldRef<"List", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * List findUnique
   */
  export type ListFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter, which List to fetch.
     */
    where: ListWhereUniqueInput
  }

  /**
   * List findUniqueOrThrow
   */
  export type ListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter, which List to fetch.
     */
    where: ListWhereUniqueInput
  }

  /**
   * List findFirst
   */
  export type ListFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter, which List to fetch.
     */
    where?: ListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lists to fetch.
     */
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Lists.
     */
    cursor?: ListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Lists.
     */
    distinct?: ListScalarFieldEnum | ListScalarFieldEnum[]
  }

  /**
   * List findFirstOrThrow
   */
  export type ListFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter, which List to fetch.
     */
    where?: ListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lists to fetch.
     */
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Lists.
     */
    cursor?: ListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Lists.
     */
    distinct?: ListScalarFieldEnum | ListScalarFieldEnum[]
  }

  /**
   * List findMany
   */
  export type ListFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter, which Lists to fetch.
     */
    where?: ListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lists to fetch.
     */
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Lists.
     */
    cursor?: ListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lists.
     */
    skip?: number
    distinct?: ListScalarFieldEnum | ListScalarFieldEnum[]
  }

  /**
   * List create
   */
  export type ListCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * The data needed to create a List.
     */
    data: XOR<ListCreateInput, ListUncheckedCreateInput>
  }

  /**
   * List createMany
   */
  export type ListCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Lists.
     */
    data: ListCreateManyInput | ListCreateManyInput[]
  }

  /**
   * List createManyAndReturn
   */
  export type ListCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Lists.
     */
    data: ListCreateManyInput | ListCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * List update
   */
  export type ListUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * The data needed to update a List.
     */
    data: XOR<ListUpdateInput, ListUncheckedUpdateInput>
    /**
     * Choose, which List to update.
     */
    where: ListWhereUniqueInput
  }

  /**
   * List updateMany
   */
  export type ListUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Lists.
     */
    data: XOR<ListUpdateManyMutationInput, ListUncheckedUpdateManyInput>
    /**
     * Filter which Lists to update
     */
    where?: ListWhereInput
  }

  /**
   * List upsert
   */
  export type ListUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * The filter to search for the List to update in case it exists.
     */
    where: ListWhereUniqueInput
    /**
     * In case the List found by the `where` argument doesn't exist, create a new List with this data.
     */
    create: XOR<ListCreateInput, ListUncheckedCreateInput>
    /**
     * In case the List was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ListUpdateInput, ListUncheckedUpdateInput>
  }

  /**
   * List delete
   */
  export type ListDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    /**
     * Filter which List to delete.
     */
    where: ListWhereUniqueInput
  }

  /**
   * List deleteMany
   */
  export type ListDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Lists to delete
     */
    where?: ListWhereInput
  }

  /**
   * List.listings
   */
  export type List$listingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    where?: ListingWhereInput
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    cursor?: ListingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * List without action
   */
  export type ListDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
  }


  /**
   * Model UserProfile
   */

  export type AggregateUserProfile = {
    _count: UserProfileCountAggregateOutputType | null
    _min: UserProfileMinAggregateOutputType | null
    _max: UserProfileMaxAggregateOutputType | null
  }

  export type UserProfileMinAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    slug: string | null
    logoUrl: string | null
    description: string | null
    content: string | null
    location: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserProfileMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    slug: string | null
    logoUrl: string | null
    description: string | null
    content: string | null
    location: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserProfileCountAggregateOutputType = {
    id: number
    userId: number
    title: number
    slug: number
    logoUrl: number
    description: number
    content: number
    location: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserProfileMinAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    logoUrl?: true
    description?: true
    content?: true
    location?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserProfileMaxAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    logoUrl?: true
    description?: true
    content?: true
    location?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserProfileCountAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    slug?: true
    logoUrl?: true
    description?: true
    content?: true
    location?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserProfile to aggregate.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserProfiles
    **/
    _count?: true | UserProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserProfileMaxAggregateInputType
  }

  export type GetUserProfileAggregateType<T extends UserProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateUserProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserProfile[P]>
      : GetScalarType<T[P], AggregateUserProfile[P]>
  }




  export type UserProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserProfileWhereInput
    orderBy?: UserProfileOrderByWithAggregationInput | UserProfileOrderByWithAggregationInput[]
    by: UserProfileScalarFieldEnum[] | UserProfileScalarFieldEnum
    having?: UserProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserProfileCountAggregateInputType | true
    _min?: UserProfileMinAggregateInputType
    _max?: UserProfileMaxAggregateInputType
  }

  export type UserProfileGroupByOutputType = {
    id: string
    userId: string
    title: string | null
    slug: string | null
    logoUrl: string | null
    description: string | null
    content: string | null
    location: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserProfileCountAggregateOutputType | null
    _min: UserProfileMinAggregateOutputType | null
    _max: UserProfileMaxAggregateOutputType | null
  }

  type GetUserProfileGroupByPayload<T extends UserProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserProfileGroupByOutputType[P]>
            : GetScalarType<T[P], UserProfileGroupByOutputType[P]>
        }
      >
    >


  export type UserProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    logoUrl?: boolean
    description?: boolean
    content?: boolean
    location?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    images?: boolean | UserProfile$imagesArgs<ExtArgs>
    _count?: boolean | UserProfileCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userProfile"]>

  export type UserProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    logoUrl?: boolean
    description?: boolean
    content?: boolean
    location?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userProfile"]>

  export type UserProfileSelectScalar = {
    id?: boolean
    userId?: boolean
    title?: boolean
    slug?: boolean
    logoUrl?: boolean
    description?: boolean
    content?: boolean
    location?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    images?: boolean | UserProfile$imagesArgs<ExtArgs>
    _count?: boolean | UserProfileCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserProfileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserProfile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      images: Prisma.$ImagePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      title: string | null
      slug: string | null
      logoUrl: string | null
      description: string | null
      content: string | null
      location: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userProfile"]>
    composites: {}
  }

  type UserProfileGetPayload<S extends boolean | null | undefined | UserProfileDefaultArgs> = $Result.GetResult<Prisma.$UserProfilePayload, S>

  type UserProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserProfileFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserProfileCountAggregateInputType | true
    }

  export interface UserProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserProfile'], meta: { name: 'UserProfile' } }
    /**
     * Find zero or one UserProfile that matches the filter.
     * @param {UserProfileFindUniqueArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserProfileFindUniqueArgs>(args: SelectSubset<T, UserProfileFindUniqueArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one UserProfile that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserProfileFindUniqueOrThrowArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, UserProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first UserProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindFirstArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserProfileFindFirstArgs>(args?: SelectSubset<T, UserProfileFindFirstArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first UserProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindFirstOrThrowArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, UserProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more UserProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserProfiles
     * const userProfiles = await prisma.userProfile.findMany()
     * 
     * // Get first 10 UserProfiles
     * const userProfiles = await prisma.userProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userProfileWithIdOnly = await prisma.userProfile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserProfileFindManyArgs>(args?: SelectSubset<T, UserProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a UserProfile.
     * @param {UserProfileCreateArgs} args - Arguments to create a UserProfile.
     * @example
     * // Create one UserProfile
     * const UserProfile = await prisma.userProfile.create({
     *   data: {
     *     // ... data to create a UserProfile
     *   }
     * })
     * 
     */
    create<T extends UserProfileCreateArgs>(args: SelectSubset<T, UserProfileCreateArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many UserProfiles.
     * @param {UserProfileCreateManyArgs} args - Arguments to create many UserProfiles.
     * @example
     * // Create many UserProfiles
     * const userProfile = await prisma.userProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserProfileCreateManyArgs>(args?: SelectSubset<T, UserProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserProfiles and returns the data saved in the database.
     * @param {UserProfileCreateManyAndReturnArgs} args - Arguments to create many UserProfiles.
     * @example
     * // Create many UserProfiles
     * const userProfile = await prisma.userProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserProfiles and only return the `id`
     * const userProfileWithIdOnly = await prisma.userProfile.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, UserProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a UserProfile.
     * @param {UserProfileDeleteArgs} args - Arguments to delete one UserProfile.
     * @example
     * // Delete one UserProfile
     * const UserProfile = await prisma.userProfile.delete({
     *   where: {
     *     // ... filter to delete one UserProfile
     *   }
     * })
     * 
     */
    delete<T extends UserProfileDeleteArgs>(args: SelectSubset<T, UserProfileDeleteArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one UserProfile.
     * @param {UserProfileUpdateArgs} args - Arguments to update one UserProfile.
     * @example
     * // Update one UserProfile
     * const userProfile = await prisma.userProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserProfileUpdateArgs>(args: SelectSubset<T, UserProfileUpdateArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more UserProfiles.
     * @param {UserProfileDeleteManyArgs} args - Arguments to filter UserProfiles to delete.
     * @example
     * // Delete a few UserProfiles
     * const { count } = await prisma.userProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserProfileDeleteManyArgs>(args?: SelectSubset<T, UserProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserProfiles
     * const userProfile = await prisma.userProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserProfileUpdateManyArgs>(args: SelectSubset<T, UserProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one UserProfile.
     * @param {UserProfileUpsertArgs} args - Arguments to update or create a UserProfile.
     * @example
     * // Update or create a UserProfile
     * const userProfile = await prisma.userProfile.upsert({
     *   create: {
     *     // ... data to create a UserProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserProfile we want to update
     *   }
     * })
     */
    upsert<T extends UserProfileUpsertArgs>(args: SelectSubset<T, UserProfileUpsertArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of UserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileCountArgs} args - Arguments to filter UserProfiles to count.
     * @example
     * // Count the number of UserProfiles
     * const count = await prisma.userProfile.count({
     *   where: {
     *     // ... the filter for the UserProfiles we want to count
     *   }
     * })
    **/
    count<T extends UserProfileCountArgs>(
      args?: Subset<T, UserProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends UserProfileAggregateArgs>(args: Subset<T, UserProfileAggregateArgs>): Prisma.PrismaPromise<GetUserProfileAggregateType<T>>

    /**
     * Group by UserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileGroupByArgs} args - Group by arguments.
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
      T extends UserProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserProfileGroupByArgs['orderBy'] }
        : { orderBy?: UserProfileGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, UserProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserProfile model
   */
  readonly fields: UserProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    images<T extends UserProfile$imagesArgs<ExtArgs> = {}>(args?: Subset<T, UserProfile$imagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the UserProfile model
   */ 
  interface UserProfileFieldRefs {
    readonly id: FieldRef<"UserProfile", 'String'>
    readonly userId: FieldRef<"UserProfile", 'String'>
    readonly title: FieldRef<"UserProfile", 'String'>
    readonly slug: FieldRef<"UserProfile", 'String'>
    readonly logoUrl: FieldRef<"UserProfile", 'String'>
    readonly description: FieldRef<"UserProfile", 'String'>
    readonly content: FieldRef<"UserProfile", 'String'>
    readonly location: FieldRef<"UserProfile", 'String'>
    readonly createdAt: FieldRef<"UserProfile", 'DateTime'>
    readonly updatedAt: FieldRef<"UserProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserProfile findUnique
   */
  export type UserProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile findUniqueOrThrow
   */
  export type UserProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile findFirst
   */
  export type UserProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserProfiles.
     */
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile findFirstOrThrow
   */
  export type UserProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserProfiles.
     */
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile findMany
   */
  export type UserProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfiles to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile create
   */
  export type UserProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a UserProfile.
     */
    data: XOR<UserProfileCreateInput, UserProfileUncheckedCreateInput>
  }

  /**
   * UserProfile createMany
   */
  export type UserProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserProfiles.
     */
    data: UserProfileCreateManyInput | UserProfileCreateManyInput[]
  }

  /**
   * UserProfile createManyAndReturn
   */
  export type UserProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many UserProfiles.
     */
    data: UserProfileCreateManyInput | UserProfileCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserProfile update
   */
  export type UserProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a UserProfile.
     */
    data: XOR<UserProfileUpdateInput, UserProfileUncheckedUpdateInput>
    /**
     * Choose, which UserProfile to update.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile updateMany
   */
  export type UserProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserProfiles.
     */
    data: XOR<UserProfileUpdateManyMutationInput, UserProfileUncheckedUpdateManyInput>
    /**
     * Filter which UserProfiles to update
     */
    where?: UserProfileWhereInput
  }

  /**
   * UserProfile upsert
   */
  export type UserProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the UserProfile to update in case it exists.
     */
    where: UserProfileWhereUniqueInput
    /**
     * In case the UserProfile found by the `where` argument doesn't exist, create a new UserProfile with this data.
     */
    create: XOR<UserProfileCreateInput, UserProfileUncheckedCreateInput>
    /**
     * In case the UserProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserProfileUpdateInput, UserProfileUncheckedUpdateInput>
  }

  /**
   * UserProfile delete
   */
  export type UserProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter which UserProfile to delete.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile deleteMany
   */
  export type UserProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserProfiles to delete
     */
    where?: UserProfileWhereInput
  }

  /**
   * UserProfile.images
   */
  export type UserProfile$imagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    where?: ImageWhereInput
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    cursor?: ImageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ImageScalarFieldEnum | ImageScalarFieldEnum[]
  }

  /**
   * UserProfile without action
   */
  export type UserProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
  }


  /**
   * Model Image
   */

  export type AggregateImage = {
    _count: ImageCountAggregateOutputType | null
    _avg: ImageAvgAggregateOutputType | null
    _sum: ImageSumAggregateOutputType | null
    _min: ImageMinAggregateOutputType | null
    _max: ImageMaxAggregateOutputType | null
  }

  export type ImageAvgAggregateOutputType = {
    order: number | null
  }

  export type ImageSumAggregateOutputType = {
    order: number | null
  }

  export type ImageMinAggregateOutputType = {
    id: string | null
    url: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
    status: string | null
    userProfileId: string | null
    listingId: string | null
  }

  export type ImageMaxAggregateOutputType = {
    id: string | null
    url: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
    status: string | null
    userProfileId: string | null
    listingId: string | null
  }

  export type ImageCountAggregateOutputType = {
    id: number
    url: number
    order: number
    createdAt: number
    updatedAt: number
    status: number
    userProfileId: number
    listingId: number
    _all: number
  }


  export type ImageAvgAggregateInputType = {
    order?: true
  }

  export type ImageSumAggregateInputType = {
    order?: true
  }

  export type ImageMinAggregateInputType = {
    id?: true
    url?: true
    order?: true
    createdAt?: true
    updatedAt?: true
    status?: true
    userProfileId?: true
    listingId?: true
  }

  export type ImageMaxAggregateInputType = {
    id?: true
    url?: true
    order?: true
    createdAt?: true
    updatedAt?: true
    status?: true
    userProfileId?: true
    listingId?: true
  }

  export type ImageCountAggregateInputType = {
    id?: true
    url?: true
    order?: true
    createdAt?: true
    updatedAt?: true
    status?: true
    userProfileId?: true
    listingId?: true
    _all?: true
  }

  export type ImageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Image to aggregate.
     */
    where?: ImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Images to fetch.
     */
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Images from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Images.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Images
    **/
    _count?: true | ImageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ImageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ImageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ImageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ImageMaxAggregateInputType
  }

  export type GetImageAggregateType<T extends ImageAggregateArgs> = {
        [P in keyof T & keyof AggregateImage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateImage[P]>
      : GetScalarType<T[P], AggregateImage[P]>
  }




  export type ImageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ImageWhereInput
    orderBy?: ImageOrderByWithAggregationInput | ImageOrderByWithAggregationInput[]
    by: ImageScalarFieldEnum[] | ImageScalarFieldEnum
    having?: ImageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ImageCountAggregateInputType | true
    _avg?: ImageAvgAggregateInputType
    _sum?: ImageSumAggregateInputType
    _min?: ImageMinAggregateInputType
    _max?: ImageMaxAggregateInputType
  }

  export type ImageGroupByOutputType = {
    id: string
    url: string
    order: number
    createdAt: Date
    updatedAt: Date
    status: string | null
    userProfileId: string | null
    listingId: string | null
    _count: ImageCountAggregateOutputType | null
    _avg: ImageAvgAggregateOutputType | null
    _sum: ImageSumAggregateOutputType | null
    _min: ImageMinAggregateOutputType | null
    _max: ImageMaxAggregateOutputType | null
  }

  type GetImageGroupByPayload<T extends ImageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ImageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ImageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ImageGroupByOutputType[P]>
            : GetScalarType<T[P], ImageGroupByOutputType[P]>
        }
      >
    >


  export type ImageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    status?: boolean
    userProfileId?: boolean
    listingId?: boolean
    userProfile?: boolean | Image$userProfileArgs<ExtArgs>
    listing?: boolean | Image$listingArgs<ExtArgs>
  }, ExtArgs["result"]["image"]>

  export type ImageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    status?: boolean
    userProfileId?: boolean
    listingId?: boolean
    userProfile?: boolean | Image$userProfileArgs<ExtArgs>
    listing?: boolean | Image$listingArgs<ExtArgs>
  }, ExtArgs["result"]["image"]>

  export type ImageSelectScalar = {
    id?: boolean
    url?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    status?: boolean
    userProfileId?: boolean
    listingId?: boolean
  }

  export type ImageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userProfile?: boolean | Image$userProfileArgs<ExtArgs>
    listing?: boolean | Image$listingArgs<ExtArgs>
  }
  export type ImageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userProfile?: boolean | Image$userProfileArgs<ExtArgs>
    listing?: boolean | Image$listingArgs<ExtArgs>
  }

  export type $ImagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Image"
    objects: {
      userProfile: Prisma.$UserProfilePayload<ExtArgs> | null
      listing: Prisma.$ListingPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      url: string
      order: number
      createdAt: Date
      updatedAt: Date
      status: string | null
      userProfileId: string | null
      listingId: string | null
    }, ExtArgs["result"]["image"]>
    composites: {}
  }

  type ImageGetPayload<S extends boolean | null | undefined | ImageDefaultArgs> = $Result.GetResult<Prisma.$ImagePayload, S>

  type ImageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ImageFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ImageCountAggregateInputType | true
    }

  export interface ImageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Image'], meta: { name: 'Image' } }
    /**
     * Find zero or one Image that matches the filter.
     * @param {ImageFindUniqueArgs} args - Arguments to find a Image
     * @example
     * // Get one Image
     * const image = await prisma.image.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ImageFindUniqueArgs>(args: SelectSubset<T, ImageFindUniqueArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Image that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ImageFindUniqueOrThrowArgs} args - Arguments to find a Image
     * @example
     * // Get one Image
     * const image = await prisma.image.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ImageFindUniqueOrThrowArgs>(args: SelectSubset<T, ImageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Image that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageFindFirstArgs} args - Arguments to find a Image
     * @example
     * // Get one Image
     * const image = await prisma.image.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ImageFindFirstArgs>(args?: SelectSubset<T, ImageFindFirstArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Image that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageFindFirstOrThrowArgs} args - Arguments to find a Image
     * @example
     * // Get one Image
     * const image = await prisma.image.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ImageFindFirstOrThrowArgs>(args?: SelectSubset<T, ImageFindFirstOrThrowArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Images that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Images
     * const images = await prisma.image.findMany()
     * 
     * // Get first 10 Images
     * const images = await prisma.image.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const imageWithIdOnly = await prisma.image.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ImageFindManyArgs>(args?: SelectSubset<T, ImageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Image.
     * @param {ImageCreateArgs} args - Arguments to create a Image.
     * @example
     * // Create one Image
     * const Image = await prisma.image.create({
     *   data: {
     *     // ... data to create a Image
     *   }
     * })
     * 
     */
    create<T extends ImageCreateArgs>(args: SelectSubset<T, ImageCreateArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Images.
     * @param {ImageCreateManyArgs} args - Arguments to create many Images.
     * @example
     * // Create many Images
     * const image = await prisma.image.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ImageCreateManyArgs>(args?: SelectSubset<T, ImageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Images and returns the data saved in the database.
     * @param {ImageCreateManyAndReturnArgs} args - Arguments to create many Images.
     * @example
     * // Create many Images
     * const image = await prisma.image.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Images and only return the `id`
     * const imageWithIdOnly = await prisma.image.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ImageCreateManyAndReturnArgs>(args?: SelectSubset<T, ImageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Image.
     * @param {ImageDeleteArgs} args - Arguments to delete one Image.
     * @example
     * // Delete one Image
     * const Image = await prisma.image.delete({
     *   where: {
     *     // ... filter to delete one Image
     *   }
     * })
     * 
     */
    delete<T extends ImageDeleteArgs>(args: SelectSubset<T, ImageDeleteArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Image.
     * @param {ImageUpdateArgs} args - Arguments to update one Image.
     * @example
     * // Update one Image
     * const image = await prisma.image.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ImageUpdateArgs>(args: SelectSubset<T, ImageUpdateArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Images.
     * @param {ImageDeleteManyArgs} args - Arguments to filter Images to delete.
     * @example
     * // Delete a few Images
     * const { count } = await prisma.image.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ImageDeleteManyArgs>(args?: SelectSubset<T, ImageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Images.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Images
     * const image = await prisma.image.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ImageUpdateManyArgs>(args: SelectSubset<T, ImageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Image.
     * @param {ImageUpsertArgs} args - Arguments to update or create a Image.
     * @example
     * // Update or create a Image
     * const image = await prisma.image.upsert({
     *   create: {
     *     // ... data to create a Image
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Image we want to update
     *   }
     * })
     */
    upsert<T extends ImageUpsertArgs>(args: SelectSubset<T, ImageUpsertArgs<ExtArgs>>): Prisma__ImageClient<$Result.GetResult<Prisma.$ImagePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Images.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageCountArgs} args - Arguments to filter Images to count.
     * @example
     * // Count the number of Images
     * const count = await prisma.image.count({
     *   where: {
     *     // ... the filter for the Images we want to count
     *   }
     * })
    **/
    count<T extends ImageCountArgs>(
      args?: Subset<T, ImageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ImageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Image.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ImageAggregateArgs>(args: Subset<T, ImageAggregateArgs>): Prisma.PrismaPromise<GetImageAggregateType<T>>

    /**
     * Group by Image.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ImageGroupByArgs} args - Group by arguments.
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
      T extends ImageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ImageGroupByArgs['orderBy'] }
        : { orderBy?: ImageGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ImageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetImageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Image model
   */
  readonly fields: ImageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Image.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ImageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    userProfile<T extends Image$userProfileArgs<ExtArgs> = {}>(args?: Subset<T, Image$userProfileArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    listing<T extends Image$listingArgs<ExtArgs> = {}>(args?: Subset<T, Image$listingArgs<ExtArgs>>): Prisma__ListingClient<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
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
   * Fields of the Image model
   */ 
  interface ImageFieldRefs {
    readonly id: FieldRef<"Image", 'String'>
    readonly url: FieldRef<"Image", 'String'>
    readonly order: FieldRef<"Image", 'Int'>
    readonly createdAt: FieldRef<"Image", 'DateTime'>
    readonly updatedAt: FieldRef<"Image", 'DateTime'>
    readonly status: FieldRef<"Image", 'String'>
    readonly userProfileId: FieldRef<"Image", 'String'>
    readonly listingId: FieldRef<"Image", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Image findUnique
   */
  export type ImageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter, which Image to fetch.
     */
    where: ImageWhereUniqueInput
  }

  /**
   * Image findUniqueOrThrow
   */
  export type ImageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter, which Image to fetch.
     */
    where: ImageWhereUniqueInput
  }

  /**
   * Image findFirst
   */
  export type ImageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter, which Image to fetch.
     */
    where?: ImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Images to fetch.
     */
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Images.
     */
    cursor?: ImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Images from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Images.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Images.
     */
    distinct?: ImageScalarFieldEnum | ImageScalarFieldEnum[]
  }

  /**
   * Image findFirstOrThrow
   */
  export type ImageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter, which Image to fetch.
     */
    where?: ImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Images to fetch.
     */
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Images.
     */
    cursor?: ImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Images from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Images.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Images.
     */
    distinct?: ImageScalarFieldEnum | ImageScalarFieldEnum[]
  }

  /**
   * Image findMany
   */
  export type ImageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter, which Images to fetch.
     */
    where?: ImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Images to fetch.
     */
    orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Images.
     */
    cursor?: ImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Images from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Images.
     */
    skip?: number
    distinct?: ImageScalarFieldEnum | ImageScalarFieldEnum[]
  }

  /**
   * Image create
   */
  export type ImageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * The data needed to create a Image.
     */
    data: XOR<ImageCreateInput, ImageUncheckedCreateInput>
  }

  /**
   * Image createMany
   */
  export type ImageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Images.
     */
    data: ImageCreateManyInput | ImageCreateManyInput[]
  }

  /**
   * Image createManyAndReturn
   */
  export type ImageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Images.
     */
    data: ImageCreateManyInput | ImageCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Image update
   */
  export type ImageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * The data needed to update a Image.
     */
    data: XOR<ImageUpdateInput, ImageUncheckedUpdateInput>
    /**
     * Choose, which Image to update.
     */
    where: ImageWhereUniqueInput
  }

  /**
   * Image updateMany
   */
  export type ImageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Images.
     */
    data: XOR<ImageUpdateManyMutationInput, ImageUncheckedUpdateManyInput>
    /**
     * Filter which Images to update
     */
    where?: ImageWhereInput
  }

  /**
   * Image upsert
   */
  export type ImageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * The filter to search for the Image to update in case it exists.
     */
    where: ImageWhereUniqueInput
    /**
     * In case the Image found by the `where` argument doesn't exist, create a new Image with this data.
     */
    create: XOR<ImageCreateInput, ImageUncheckedCreateInput>
    /**
     * In case the Image was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ImageUpdateInput, ImageUncheckedUpdateInput>
  }

  /**
   * Image delete
   */
  export type ImageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
    /**
     * Filter which Image to delete.
     */
    where: ImageWhereUniqueInput
  }

  /**
   * Image deleteMany
   */
  export type ImageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Images to delete
     */
    where?: ImageWhereInput
  }

  /**
   * Image.userProfile
   */
  export type Image$userProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    where?: UserProfileWhereInput
  }

  /**
   * Image.listing
   */
  export type Image$listingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    where?: ListingWhereInput
  }

  /**
   * Image without action
   */
  export type ImageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Image
     */
    select?: ImageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ImageInclude<ExtArgs> | null
  }


  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    stripeCustomerId: string | null
    role: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    stripeCustomerId: string | null
    role: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    clerkUserId: number
    stripeCustomerId: number
    role: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    clerkUserId?: true
    stripeCustomerId?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    clerkUserId?: true
    stripeCustomerId?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    clerkUserId?: true
    stripeCustomerId?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    clerkUserId: string | null
    stripeCustomerId: string | null
    role: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    stripeCustomerId?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    listings?: boolean | User$listingsArgs<ExtArgs>
    lists?: boolean | User$listsArgs<ExtArgs>
    profile?: boolean | User$profileArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    stripeCustomerId?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    clerkUserId?: boolean
    stripeCustomerId?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listings?: boolean | User$listingsArgs<ExtArgs>
    lists?: boolean | User$listsArgs<ExtArgs>
    profile?: boolean | User$profileArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      listings: Prisma.$ListingPayload<ExtArgs>[]
      lists: Prisma.$ListPayload<ExtArgs>[]
      profile: Prisma.$UserProfilePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clerkUserId: string | null
      stripeCustomerId: string | null
      role: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
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
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    listings<T extends User$listingsArgs<ExtArgs> = {}>(args?: Subset<T, User$listingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListingPayload<ExtArgs>, T, "findMany"> | Null>
    lists<T extends User$listsArgs<ExtArgs> = {}>(args?: Subset<T, User$listsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListPayload<ExtArgs>, T, "findMany"> | Null>
    profile<T extends User$profileArgs<ExtArgs> = {}>(args?: Subset<T, User$profileArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
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
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly clerkUserId: FieldRef<"User", 'String'>
    readonly stripeCustomerId: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.listings
   */
  export type User$listingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Listing
     */
    select?: ListingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListingInclude<ExtArgs> | null
    where?: ListingWhereInput
    orderBy?: ListingOrderByWithRelationInput | ListingOrderByWithRelationInput[]
    cursor?: ListingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListingScalarFieldEnum | ListingScalarFieldEnum[]
  }

  /**
   * User.lists
   */
  export type User$listsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the List
     */
    select?: ListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListInclude<ExtArgs> | null
    where?: ListWhereInput
    orderBy?: ListOrderByWithRelationInput | ListOrderByWithRelationInput[]
    cursor?: ListWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListScalarFieldEnum | ListScalarFieldEnum[]
  }

  /**
   * User.profile
   */
  export type User$profileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    where?: UserProfileWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model KeyValue
   */

  export type AggregateKeyValue = {
    _count: KeyValueCountAggregateOutputType | null
    _min: KeyValueMinAggregateOutputType | null
    _max: KeyValueMaxAggregateOutputType | null
  }

  export type KeyValueMinAggregateOutputType = {
    key: string | null
    value: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type KeyValueMaxAggregateOutputType = {
    key: string | null
    value: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type KeyValueCountAggregateOutputType = {
    key: number
    value: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type KeyValueMinAggregateInputType = {
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
  }

  export type KeyValueMaxAggregateInputType = {
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
  }

  export type KeyValueCountAggregateInputType = {
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type KeyValueAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KeyValue to aggregate.
     */
    where?: KeyValueWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KeyValues to fetch.
     */
    orderBy?: KeyValueOrderByWithRelationInput | KeyValueOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: KeyValueWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KeyValues from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KeyValues.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned KeyValues
    **/
    _count?: true | KeyValueCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: KeyValueMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: KeyValueMaxAggregateInputType
  }

  export type GetKeyValueAggregateType<T extends KeyValueAggregateArgs> = {
        [P in keyof T & keyof AggregateKeyValue]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateKeyValue[P]>
      : GetScalarType<T[P], AggregateKeyValue[P]>
  }




  export type KeyValueGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: KeyValueWhereInput
    orderBy?: KeyValueOrderByWithAggregationInput | KeyValueOrderByWithAggregationInput[]
    by: KeyValueScalarFieldEnum[] | KeyValueScalarFieldEnum
    having?: KeyValueScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: KeyValueCountAggregateInputType | true
    _min?: KeyValueMinAggregateInputType
    _max?: KeyValueMaxAggregateInputType
  }

  export type KeyValueGroupByOutputType = {
    key: string
    value: string
    createdAt: Date
    updatedAt: Date
    _count: KeyValueCountAggregateOutputType | null
    _min: KeyValueMinAggregateOutputType | null
    _max: KeyValueMaxAggregateOutputType | null
  }

  type GetKeyValueGroupByPayload<T extends KeyValueGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<KeyValueGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof KeyValueGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], KeyValueGroupByOutputType[P]>
            : GetScalarType<T[P], KeyValueGroupByOutputType[P]>
        }
      >
    >


  export type KeyValueSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["keyValue"]>

  export type KeyValueSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["keyValue"]>

  export type KeyValueSelectScalar = {
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $KeyValuePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "KeyValue"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["keyValue"]>
    composites: {}
  }

  type KeyValueGetPayload<S extends boolean | null | undefined | KeyValueDefaultArgs> = $Result.GetResult<Prisma.$KeyValuePayload, S>

  type KeyValueCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<KeyValueFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: KeyValueCountAggregateInputType | true
    }

  export interface KeyValueDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['KeyValue'], meta: { name: 'KeyValue' } }
    /**
     * Find zero or one KeyValue that matches the filter.
     * @param {KeyValueFindUniqueArgs} args - Arguments to find a KeyValue
     * @example
     * // Get one KeyValue
     * const keyValue = await prisma.keyValue.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends KeyValueFindUniqueArgs>(args: SelectSubset<T, KeyValueFindUniqueArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one KeyValue that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {KeyValueFindUniqueOrThrowArgs} args - Arguments to find a KeyValue
     * @example
     * // Get one KeyValue
     * const keyValue = await prisma.keyValue.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends KeyValueFindUniqueOrThrowArgs>(args: SelectSubset<T, KeyValueFindUniqueOrThrowArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first KeyValue that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueFindFirstArgs} args - Arguments to find a KeyValue
     * @example
     * // Get one KeyValue
     * const keyValue = await prisma.keyValue.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends KeyValueFindFirstArgs>(args?: SelectSubset<T, KeyValueFindFirstArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first KeyValue that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueFindFirstOrThrowArgs} args - Arguments to find a KeyValue
     * @example
     * // Get one KeyValue
     * const keyValue = await prisma.keyValue.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends KeyValueFindFirstOrThrowArgs>(args?: SelectSubset<T, KeyValueFindFirstOrThrowArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more KeyValues that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all KeyValues
     * const keyValues = await prisma.keyValue.findMany()
     * 
     * // Get first 10 KeyValues
     * const keyValues = await prisma.keyValue.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const keyValueWithKeyOnly = await prisma.keyValue.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends KeyValueFindManyArgs>(args?: SelectSubset<T, KeyValueFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a KeyValue.
     * @param {KeyValueCreateArgs} args - Arguments to create a KeyValue.
     * @example
     * // Create one KeyValue
     * const KeyValue = await prisma.keyValue.create({
     *   data: {
     *     // ... data to create a KeyValue
     *   }
     * })
     * 
     */
    create<T extends KeyValueCreateArgs>(args: SelectSubset<T, KeyValueCreateArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many KeyValues.
     * @param {KeyValueCreateManyArgs} args - Arguments to create many KeyValues.
     * @example
     * // Create many KeyValues
     * const keyValue = await prisma.keyValue.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends KeyValueCreateManyArgs>(args?: SelectSubset<T, KeyValueCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many KeyValues and returns the data saved in the database.
     * @param {KeyValueCreateManyAndReturnArgs} args - Arguments to create many KeyValues.
     * @example
     * // Create many KeyValues
     * const keyValue = await prisma.keyValue.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many KeyValues and only return the `key`
     * const keyValueWithKeyOnly = await prisma.keyValue.createManyAndReturn({ 
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends KeyValueCreateManyAndReturnArgs>(args?: SelectSubset<T, KeyValueCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a KeyValue.
     * @param {KeyValueDeleteArgs} args - Arguments to delete one KeyValue.
     * @example
     * // Delete one KeyValue
     * const KeyValue = await prisma.keyValue.delete({
     *   where: {
     *     // ... filter to delete one KeyValue
     *   }
     * })
     * 
     */
    delete<T extends KeyValueDeleteArgs>(args: SelectSubset<T, KeyValueDeleteArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one KeyValue.
     * @param {KeyValueUpdateArgs} args - Arguments to update one KeyValue.
     * @example
     * // Update one KeyValue
     * const keyValue = await prisma.keyValue.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends KeyValueUpdateArgs>(args: SelectSubset<T, KeyValueUpdateArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more KeyValues.
     * @param {KeyValueDeleteManyArgs} args - Arguments to filter KeyValues to delete.
     * @example
     * // Delete a few KeyValues
     * const { count } = await prisma.keyValue.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends KeyValueDeleteManyArgs>(args?: SelectSubset<T, KeyValueDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more KeyValues.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many KeyValues
     * const keyValue = await prisma.keyValue.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends KeyValueUpdateManyArgs>(args: SelectSubset<T, KeyValueUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one KeyValue.
     * @param {KeyValueUpsertArgs} args - Arguments to update or create a KeyValue.
     * @example
     * // Update or create a KeyValue
     * const keyValue = await prisma.keyValue.upsert({
     *   create: {
     *     // ... data to create a KeyValue
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the KeyValue we want to update
     *   }
     * })
     */
    upsert<T extends KeyValueUpsertArgs>(args: SelectSubset<T, KeyValueUpsertArgs<ExtArgs>>): Prisma__KeyValueClient<$Result.GetResult<Prisma.$KeyValuePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of KeyValues.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueCountArgs} args - Arguments to filter KeyValues to count.
     * @example
     * // Count the number of KeyValues
     * const count = await prisma.keyValue.count({
     *   where: {
     *     // ... the filter for the KeyValues we want to count
     *   }
     * })
    **/
    count<T extends KeyValueCountArgs>(
      args?: Subset<T, KeyValueCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], KeyValueCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a KeyValue.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends KeyValueAggregateArgs>(args: Subset<T, KeyValueAggregateArgs>): Prisma.PrismaPromise<GetKeyValueAggregateType<T>>

    /**
     * Group by KeyValue.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KeyValueGroupByArgs} args - Group by arguments.
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
      T extends KeyValueGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: KeyValueGroupByArgs['orderBy'] }
        : { orderBy?: KeyValueGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, KeyValueGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetKeyValueGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the KeyValue model
   */
  readonly fields: KeyValueFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for KeyValue.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__KeyValueClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
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
   * Fields of the KeyValue model
   */ 
  interface KeyValueFieldRefs {
    readonly key: FieldRef<"KeyValue", 'String'>
    readonly value: FieldRef<"KeyValue", 'String'>
    readonly createdAt: FieldRef<"KeyValue", 'DateTime'>
    readonly updatedAt: FieldRef<"KeyValue", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * KeyValue findUnique
   */
  export type KeyValueFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter, which KeyValue to fetch.
     */
    where: KeyValueWhereUniqueInput
  }

  /**
   * KeyValue findUniqueOrThrow
   */
  export type KeyValueFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter, which KeyValue to fetch.
     */
    where: KeyValueWhereUniqueInput
  }

  /**
   * KeyValue findFirst
   */
  export type KeyValueFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter, which KeyValue to fetch.
     */
    where?: KeyValueWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KeyValues to fetch.
     */
    orderBy?: KeyValueOrderByWithRelationInput | KeyValueOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KeyValues.
     */
    cursor?: KeyValueWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KeyValues from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KeyValues.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KeyValues.
     */
    distinct?: KeyValueScalarFieldEnum | KeyValueScalarFieldEnum[]
  }

  /**
   * KeyValue findFirstOrThrow
   */
  export type KeyValueFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter, which KeyValue to fetch.
     */
    where?: KeyValueWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KeyValues to fetch.
     */
    orderBy?: KeyValueOrderByWithRelationInput | KeyValueOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KeyValues.
     */
    cursor?: KeyValueWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KeyValues from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KeyValues.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KeyValues.
     */
    distinct?: KeyValueScalarFieldEnum | KeyValueScalarFieldEnum[]
  }

  /**
   * KeyValue findMany
   */
  export type KeyValueFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter, which KeyValues to fetch.
     */
    where?: KeyValueWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KeyValues to fetch.
     */
    orderBy?: KeyValueOrderByWithRelationInput | KeyValueOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing KeyValues.
     */
    cursor?: KeyValueWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KeyValues from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KeyValues.
     */
    skip?: number
    distinct?: KeyValueScalarFieldEnum | KeyValueScalarFieldEnum[]
  }

  /**
   * KeyValue create
   */
  export type KeyValueCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * The data needed to create a KeyValue.
     */
    data: XOR<KeyValueCreateInput, KeyValueUncheckedCreateInput>
  }

  /**
   * KeyValue createMany
   */
  export type KeyValueCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many KeyValues.
     */
    data: KeyValueCreateManyInput | KeyValueCreateManyInput[]
  }

  /**
   * KeyValue createManyAndReturn
   */
  export type KeyValueCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many KeyValues.
     */
    data: KeyValueCreateManyInput | KeyValueCreateManyInput[]
  }

  /**
   * KeyValue update
   */
  export type KeyValueUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * The data needed to update a KeyValue.
     */
    data: XOR<KeyValueUpdateInput, KeyValueUncheckedUpdateInput>
    /**
     * Choose, which KeyValue to update.
     */
    where: KeyValueWhereUniqueInput
  }

  /**
   * KeyValue updateMany
   */
  export type KeyValueUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update KeyValues.
     */
    data: XOR<KeyValueUpdateManyMutationInput, KeyValueUncheckedUpdateManyInput>
    /**
     * Filter which KeyValues to update
     */
    where?: KeyValueWhereInput
  }

  /**
   * KeyValue upsert
   */
  export type KeyValueUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * The filter to search for the KeyValue to update in case it exists.
     */
    where: KeyValueWhereUniqueInput
    /**
     * In case the KeyValue found by the `where` argument doesn't exist, create a new KeyValue with this data.
     */
    create: XOR<KeyValueCreateInput, KeyValueUncheckedCreateInput>
    /**
     * In case the KeyValue was found with the provided `where` argument, update it with this data.
     */
    update: XOR<KeyValueUpdateInput, KeyValueUncheckedUpdateInput>
  }

  /**
   * KeyValue delete
   */
  export type KeyValueDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
    /**
     * Filter which KeyValue to delete.
     */
    where: KeyValueWhereUniqueInput
  }

  /**
   * KeyValue deleteMany
   */
  export type KeyValueDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KeyValues to delete
     */
    where?: KeyValueWhereInput
  }

  /**
   * KeyValue without action
   */
  export type KeyValueDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KeyValue
     */
    select?: KeyValueSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const AhsListingScalarFieldEnum: {
    id: 'id',
    name: 'name',
    hybridizer: 'hybridizer',
    year: 'year',
    scapeHeight: 'scapeHeight',
    bloomSize: 'bloomSize',
    bloomSeason: 'bloomSeason',
    ploidy: 'ploidy',
    foliageType: 'foliageType',
    bloomHabit: 'bloomHabit',
    seedlingNum: 'seedlingNum',
    color: 'color',
    form: 'form',
    parentage: 'parentage',
    ahsImageUrl: 'ahsImageUrl',
    fragrance: 'fragrance',
    budcount: 'budcount',
    branches: 'branches',
    sculpting: 'sculpting',
    foliage: 'foliage',
    flower: 'flower',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AhsListingScalarFieldEnum = (typeof AhsListingScalarFieldEnum)[keyof typeof AhsListingScalarFieldEnum]


  export const ListingScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    title: 'title',
    slug: 'slug',
    price: 'price',
    description: 'description',
    privateNote: 'privateNote',
    ahsId: 'ahsId',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ListingScalarFieldEnum = (typeof ListingScalarFieldEnum)[keyof typeof ListingScalarFieldEnum]


  export const ListScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    title: 'title',
    description: 'description',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ListScalarFieldEnum = (typeof ListScalarFieldEnum)[keyof typeof ListScalarFieldEnum]


  export const UserProfileScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    title: 'title',
    slug: 'slug',
    logoUrl: 'logoUrl',
    description: 'description',
    content: 'content',
    location: 'location',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserProfileScalarFieldEnum = (typeof UserProfileScalarFieldEnum)[keyof typeof UserProfileScalarFieldEnum]


  export const ImageScalarFieldEnum: {
    id: 'id',
    url: 'url',
    order: 'order',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    status: 'status',
    userProfileId: 'userProfileId',
    listingId: 'listingId'
  };

  export type ImageScalarFieldEnum = (typeof ImageScalarFieldEnum)[keyof typeof ImageScalarFieldEnum]


  export const UserScalarFieldEnum: {
    id: 'id',
    clerkUserId: 'clerkUserId',
    stripeCustomerId: 'stripeCustomerId',
    role: 'role',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const KeyValueScalarFieldEnum: {
    key: 'key',
    value: 'value',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type KeyValueScalarFieldEnum = (typeof KeyValueScalarFieldEnum)[keyof typeof KeyValueScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    
  /**
   * Deep Input Types
   */


  export type AhsListingWhereInput = {
    AND?: AhsListingWhereInput | AhsListingWhereInput[]
    OR?: AhsListingWhereInput[]
    NOT?: AhsListingWhereInput | AhsListingWhereInput[]
    id?: StringFilter<"AhsListing"> | string
    name?: StringNullableFilter<"AhsListing"> | string | null
    hybridizer?: StringNullableFilter<"AhsListing"> | string | null
    year?: StringNullableFilter<"AhsListing"> | string | null
    scapeHeight?: StringNullableFilter<"AhsListing"> | string | null
    bloomSize?: StringNullableFilter<"AhsListing"> | string | null
    bloomSeason?: StringNullableFilter<"AhsListing"> | string | null
    ploidy?: StringNullableFilter<"AhsListing"> | string | null
    foliageType?: StringNullableFilter<"AhsListing"> | string | null
    bloomHabit?: StringNullableFilter<"AhsListing"> | string | null
    seedlingNum?: StringNullableFilter<"AhsListing"> | string | null
    color?: StringNullableFilter<"AhsListing"> | string | null
    form?: StringNullableFilter<"AhsListing"> | string | null
    parentage?: StringNullableFilter<"AhsListing"> | string | null
    ahsImageUrl?: StringNullableFilter<"AhsListing"> | string | null
    fragrance?: StringNullableFilter<"AhsListing"> | string | null
    budcount?: StringNullableFilter<"AhsListing"> | string | null
    branches?: StringNullableFilter<"AhsListing"> | string | null
    sculpting?: StringNullableFilter<"AhsListing"> | string | null
    foliage?: StringNullableFilter<"AhsListing"> | string | null
    flower?: StringNullableFilter<"AhsListing"> | string | null
    createdAt?: DateTimeFilter<"AhsListing"> | Date | string
    updatedAt?: DateTimeFilter<"AhsListing"> | Date | string
    lilies?: ListingListRelationFilter
  }

  export type AhsListingOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    hybridizer?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    scapeHeight?: SortOrderInput | SortOrder
    bloomSize?: SortOrderInput | SortOrder
    bloomSeason?: SortOrderInput | SortOrder
    ploidy?: SortOrderInput | SortOrder
    foliageType?: SortOrderInput | SortOrder
    bloomHabit?: SortOrderInput | SortOrder
    seedlingNum?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    form?: SortOrderInput | SortOrder
    parentage?: SortOrderInput | SortOrder
    ahsImageUrl?: SortOrderInput | SortOrder
    fragrance?: SortOrderInput | SortOrder
    budcount?: SortOrderInput | SortOrder
    branches?: SortOrderInput | SortOrder
    sculpting?: SortOrderInput | SortOrder
    foliage?: SortOrderInput | SortOrder
    flower?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lilies?: ListingOrderByRelationAggregateInput
  }

  export type AhsListingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AhsListingWhereInput | AhsListingWhereInput[]
    OR?: AhsListingWhereInput[]
    NOT?: AhsListingWhereInput | AhsListingWhereInput[]
    name?: StringNullableFilter<"AhsListing"> | string | null
    hybridizer?: StringNullableFilter<"AhsListing"> | string | null
    year?: StringNullableFilter<"AhsListing"> | string | null
    scapeHeight?: StringNullableFilter<"AhsListing"> | string | null
    bloomSize?: StringNullableFilter<"AhsListing"> | string | null
    bloomSeason?: StringNullableFilter<"AhsListing"> | string | null
    ploidy?: StringNullableFilter<"AhsListing"> | string | null
    foliageType?: StringNullableFilter<"AhsListing"> | string | null
    bloomHabit?: StringNullableFilter<"AhsListing"> | string | null
    seedlingNum?: StringNullableFilter<"AhsListing"> | string | null
    color?: StringNullableFilter<"AhsListing"> | string | null
    form?: StringNullableFilter<"AhsListing"> | string | null
    parentage?: StringNullableFilter<"AhsListing"> | string | null
    ahsImageUrl?: StringNullableFilter<"AhsListing"> | string | null
    fragrance?: StringNullableFilter<"AhsListing"> | string | null
    budcount?: StringNullableFilter<"AhsListing"> | string | null
    branches?: StringNullableFilter<"AhsListing"> | string | null
    sculpting?: StringNullableFilter<"AhsListing"> | string | null
    foliage?: StringNullableFilter<"AhsListing"> | string | null
    flower?: StringNullableFilter<"AhsListing"> | string | null
    createdAt?: DateTimeFilter<"AhsListing"> | Date | string
    updatedAt?: DateTimeFilter<"AhsListing"> | Date | string
    lilies?: ListingListRelationFilter
  }, "id">

  export type AhsListingOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    hybridizer?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    scapeHeight?: SortOrderInput | SortOrder
    bloomSize?: SortOrderInput | SortOrder
    bloomSeason?: SortOrderInput | SortOrder
    ploidy?: SortOrderInput | SortOrder
    foliageType?: SortOrderInput | SortOrder
    bloomHabit?: SortOrderInput | SortOrder
    seedlingNum?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    form?: SortOrderInput | SortOrder
    parentage?: SortOrderInput | SortOrder
    ahsImageUrl?: SortOrderInput | SortOrder
    fragrance?: SortOrderInput | SortOrder
    budcount?: SortOrderInput | SortOrder
    branches?: SortOrderInput | SortOrder
    sculpting?: SortOrderInput | SortOrder
    foliage?: SortOrderInput | SortOrder
    flower?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AhsListingCountOrderByAggregateInput
    _max?: AhsListingMaxOrderByAggregateInput
    _min?: AhsListingMinOrderByAggregateInput
  }

  export type AhsListingScalarWhereWithAggregatesInput = {
    AND?: AhsListingScalarWhereWithAggregatesInput | AhsListingScalarWhereWithAggregatesInput[]
    OR?: AhsListingScalarWhereWithAggregatesInput[]
    NOT?: AhsListingScalarWhereWithAggregatesInput | AhsListingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AhsListing"> | string
    name?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    hybridizer?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    year?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    scapeHeight?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    bloomSize?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    bloomSeason?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    ploidy?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    foliageType?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    bloomHabit?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    seedlingNum?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    color?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    form?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    parentage?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    ahsImageUrl?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    fragrance?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    budcount?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    branches?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    sculpting?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    foliage?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    flower?: StringNullableWithAggregatesFilter<"AhsListing"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AhsListing"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AhsListing"> | Date | string
  }

  export type ListingWhereInput = {
    AND?: ListingWhereInput | ListingWhereInput[]
    OR?: ListingWhereInput[]
    NOT?: ListingWhereInput | ListingWhereInput[]
    id?: StringFilter<"Listing"> | string
    userId?: StringFilter<"Listing"> | string
    title?: StringFilter<"Listing"> | string
    slug?: StringFilter<"Listing"> | string
    price?: FloatNullableFilter<"Listing"> | number | null
    description?: StringNullableFilter<"Listing"> | string | null
    privateNote?: StringNullableFilter<"Listing"> | string | null
    ahsId?: StringNullableFilter<"Listing"> | string | null
    status?: StringNullableFilter<"Listing"> | string | null
    createdAt?: DateTimeFilter<"Listing"> | Date | string
    updatedAt?: DateTimeFilter<"Listing"> | Date | string
    images?: ImageListRelationFilter
    ahsListing?: XOR<AhsListingNullableRelationFilter, AhsListingWhereInput> | null
    lists?: ListListRelationFilter
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type ListingOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    price?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    privateNote?: SortOrderInput | SortOrder
    ahsId?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    images?: ImageOrderByRelationAggregateInput
    ahsListing?: AhsListingOrderByWithRelationInput
    lists?: ListOrderByRelationAggregateInput
    user?: UserOrderByWithRelationInput
  }

  export type ListingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_slug?: ListingUserIdSlugCompoundUniqueInput
    AND?: ListingWhereInput | ListingWhereInput[]
    OR?: ListingWhereInput[]
    NOT?: ListingWhereInput | ListingWhereInput[]
    userId?: StringFilter<"Listing"> | string
    title?: StringFilter<"Listing"> | string
    slug?: StringFilter<"Listing"> | string
    price?: FloatNullableFilter<"Listing"> | number | null
    description?: StringNullableFilter<"Listing"> | string | null
    privateNote?: StringNullableFilter<"Listing"> | string | null
    ahsId?: StringNullableFilter<"Listing"> | string | null
    status?: StringNullableFilter<"Listing"> | string | null
    createdAt?: DateTimeFilter<"Listing"> | Date | string
    updatedAt?: DateTimeFilter<"Listing"> | Date | string
    images?: ImageListRelationFilter
    ahsListing?: XOR<AhsListingNullableRelationFilter, AhsListingWhereInput> | null
    lists?: ListListRelationFilter
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id" | "userId_slug">

  export type ListingOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    price?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    privateNote?: SortOrderInput | SortOrder
    ahsId?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ListingCountOrderByAggregateInput
    _avg?: ListingAvgOrderByAggregateInput
    _max?: ListingMaxOrderByAggregateInput
    _min?: ListingMinOrderByAggregateInput
    _sum?: ListingSumOrderByAggregateInput
  }

  export type ListingScalarWhereWithAggregatesInput = {
    AND?: ListingScalarWhereWithAggregatesInput | ListingScalarWhereWithAggregatesInput[]
    OR?: ListingScalarWhereWithAggregatesInput[]
    NOT?: ListingScalarWhereWithAggregatesInput | ListingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Listing"> | string
    userId?: StringWithAggregatesFilter<"Listing"> | string
    title?: StringWithAggregatesFilter<"Listing"> | string
    slug?: StringWithAggregatesFilter<"Listing"> | string
    price?: FloatNullableWithAggregatesFilter<"Listing"> | number | null
    description?: StringNullableWithAggregatesFilter<"Listing"> | string | null
    privateNote?: StringNullableWithAggregatesFilter<"Listing"> | string | null
    ahsId?: StringNullableWithAggregatesFilter<"Listing"> | string | null
    status?: StringNullableWithAggregatesFilter<"Listing"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Listing"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Listing"> | Date | string
  }

  export type ListWhereInput = {
    AND?: ListWhereInput | ListWhereInput[]
    OR?: ListWhereInput[]
    NOT?: ListWhereInput | ListWhereInput[]
    id?: StringFilter<"List"> | string
    userId?: StringFilter<"List"> | string
    title?: StringFilter<"List"> | string
    description?: StringNullableFilter<"List"> | string | null
    status?: StringNullableFilter<"List"> | string | null
    createdAt?: DateTimeFilter<"List"> | Date | string
    updatedAt?: DateTimeFilter<"List"> | Date | string
    listings?: ListingListRelationFilter
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type ListOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    listings?: ListingOrderByRelationAggregateInput
    user?: UserOrderByWithRelationInput
  }

  export type ListWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ListWhereInput | ListWhereInput[]
    OR?: ListWhereInput[]
    NOT?: ListWhereInput | ListWhereInput[]
    userId?: StringFilter<"List"> | string
    title?: StringFilter<"List"> | string
    description?: StringNullableFilter<"List"> | string | null
    status?: StringNullableFilter<"List"> | string | null
    createdAt?: DateTimeFilter<"List"> | Date | string
    updatedAt?: DateTimeFilter<"List"> | Date | string
    listings?: ListingListRelationFilter
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type ListOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ListCountOrderByAggregateInput
    _max?: ListMaxOrderByAggregateInput
    _min?: ListMinOrderByAggregateInput
  }

  export type ListScalarWhereWithAggregatesInput = {
    AND?: ListScalarWhereWithAggregatesInput | ListScalarWhereWithAggregatesInput[]
    OR?: ListScalarWhereWithAggregatesInput[]
    NOT?: ListScalarWhereWithAggregatesInput | ListScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"List"> | string
    userId?: StringWithAggregatesFilter<"List"> | string
    title?: StringWithAggregatesFilter<"List"> | string
    description?: StringNullableWithAggregatesFilter<"List"> | string | null
    status?: StringNullableWithAggregatesFilter<"List"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"List"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"List"> | Date | string
  }

  export type UserProfileWhereInput = {
    AND?: UserProfileWhereInput | UserProfileWhereInput[]
    OR?: UserProfileWhereInput[]
    NOT?: UserProfileWhereInput | UserProfileWhereInput[]
    id?: StringFilter<"UserProfile"> | string
    userId?: StringFilter<"UserProfile"> | string
    title?: StringNullableFilter<"UserProfile"> | string | null
    slug?: StringNullableFilter<"UserProfile"> | string | null
    logoUrl?: StringNullableFilter<"UserProfile"> | string | null
    description?: StringNullableFilter<"UserProfile"> | string | null
    content?: StringNullableFilter<"UserProfile"> | string | null
    location?: StringNullableFilter<"UserProfile"> | string | null
    createdAt?: DateTimeFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeFilter<"UserProfile"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    images?: ImageListRelationFilter
  }

  export type UserProfileOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrderInput | SortOrder
    slug?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    content?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    images?: ImageOrderByRelationAggregateInput
  }

  export type UserProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId?: string
    slug?: string
    AND?: UserProfileWhereInput | UserProfileWhereInput[]
    OR?: UserProfileWhereInput[]
    NOT?: UserProfileWhereInput | UserProfileWhereInput[]
    title?: StringNullableFilter<"UserProfile"> | string | null
    logoUrl?: StringNullableFilter<"UserProfile"> | string | null
    description?: StringNullableFilter<"UserProfile"> | string | null
    content?: StringNullableFilter<"UserProfile"> | string | null
    location?: StringNullableFilter<"UserProfile"> | string | null
    createdAt?: DateTimeFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeFilter<"UserProfile"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    images?: ImageListRelationFilter
  }, "id" | "userId" | "slug">

  export type UserProfileOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrderInput | SortOrder
    slug?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    content?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserProfileCountOrderByAggregateInput
    _max?: UserProfileMaxOrderByAggregateInput
    _min?: UserProfileMinOrderByAggregateInput
  }

  export type UserProfileScalarWhereWithAggregatesInput = {
    AND?: UserProfileScalarWhereWithAggregatesInput | UserProfileScalarWhereWithAggregatesInput[]
    OR?: UserProfileScalarWhereWithAggregatesInput[]
    NOT?: UserProfileScalarWhereWithAggregatesInput | UserProfileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"UserProfile"> | string
    userId?: StringWithAggregatesFilter<"UserProfile"> | string
    title?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    slug?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    logoUrl?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    description?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    content?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    location?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserProfile"> | Date | string
  }

  export type ImageWhereInput = {
    AND?: ImageWhereInput | ImageWhereInput[]
    OR?: ImageWhereInput[]
    NOT?: ImageWhereInput | ImageWhereInput[]
    id?: StringFilter<"Image"> | string
    url?: StringFilter<"Image"> | string
    order?: IntFilter<"Image"> | number
    createdAt?: DateTimeFilter<"Image"> | Date | string
    updatedAt?: DateTimeFilter<"Image"> | Date | string
    status?: StringNullableFilter<"Image"> | string | null
    userProfileId?: StringNullableFilter<"Image"> | string | null
    listingId?: StringNullableFilter<"Image"> | string | null
    userProfile?: XOR<UserProfileNullableRelationFilter, UserProfileWhereInput> | null
    listing?: XOR<ListingNullableRelationFilter, ListingWhereInput> | null
  }

  export type ImageOrderByWithRelationInput = {
    id?: SortOrder
    url?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    status?: SortOrderInput | SortOrder
    userProfileId?: SortOrderInput | SortOrder
    listingId?: SortOrderInput | SortOrder
    userProfile?: UserProfileOrderByWithRelationInput
    listing?: ListingOrderByWithRelationInput
  }

  export type ImageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ImageWhereInput | ImageWhereInput[]
    OR?: ImageWhereInput[]
    NOT?: ImageWhereInput | ImageWhereInput[]
    url?: StringFilter<"Image"> | string
    order?: IntFilter<"Image"> | number
    createdAt?: DateTimeFilter<"Image"> | Date | string
    updatedAt?: DateTimeFilter<"Image"> | Date | string
    status?: StringNullableFilter<"Image"> | string | null
    userProfileId?: StringNullableFilter<"Image"> | string | null
    listingId?: StringNullableFilter<"Image"> | string | null
    userProfile?: XOR<UserProfileNullableRelationFilter, UserProfileWhereInput> | null
    listing?: XOR<ListingNullableRelationFilter, ListingWhereInput> | null
  }, "id">

  export type ImageOrderByWithAggregationInput = {
    id?: SortOrder
    url?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    status?: SortOrderInput | SortOrder
    userProfileId?: SortOrderInput | SortOrder
    listingId?: SortOrderInput | SortOrder
    _count?: ImageCountOrderByAggregateInput
    _avg?: ImageAvgOrderByAggregateInput
    _max?: ImageMaxOrderByAggregateInput
    _min?: ImageMinOrderByAggregateInput
    _sum?: ImageSumOrderByAggregateInput
  }

  export type ImageScalarWhereWithAggregatesInput = {
    AND?: ImageScalarWhereWithAggregatesInput | ImageScalarWhereWithAggregatesInput[]
    OR?: ImageScalarWhereWithAggregatesInput[]
    NOT?: ImageScalarWhereWithAggregatesInput | ImageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Image"> | string
    url?: StringWithAggregatesFilter<"Image"> | string
    order?: IntWithAggregatesFilter<"Image"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Image"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Image"> | Date | string
    status?: StringNullableWithAggregatesFilter<"Image"> | string | null
    userProfileId?: StringNullableWithAggregatesFilter<"Image"> | string | null
    listingId?: StringNullableWithAggregatesFilter<"Image"> | string | null
  }

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    clerkUserId?: StringNullableFilter<"User"> | string | null
    stripeCustomerId?: StringNullableFilter<"User"> | string | null
    role?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    listings?: ListingListRelationFilter
    lists?: ListListRelationFilter
    profile?: XOR<UserProfileNullableRelationFilter, UserProfileWhereInput> | null
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    clerkUserId?: SortOrderInput | SortOrder
    stripeCustomerId?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    listings?: ListingOrderByRelationAggregateInput
    lists?: ListOrderByRelationAggregateInput
    profile?: UserProfileOrderByWithRelationInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    clerkUserId?: string
    stripeCustomerId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    role?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    listings?: ListingListRelationFilter
    lists?: ListListRelationFilter
    profile?: XOR<UserProfileNullableRelationFilter, UserProfileWhereInput> | null
  }, "id" | "clerkUserId" | "stripeCustomerId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    clerkUserId?: SortOrderInput | SortOrder
    stripeCustomerId?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    clerkUserId?: StringNullableWithAggregatesFilter<"User"> | string | null
    stripeCustomerId?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type KeyValueWhereInput = {
    AND?: KeyValueWhereInput | KeyValueWhereInput[]
    OR?: KeyValueWhereInput[]
    NOT?: KeyValueWhereInput | KeyValueWhereInput[]
    key?: StringFilter<"KeyValue"> | string
    value?: StringFilter<"KeyValue"> | string
    createdAt?: DateTimeFilter<"KeyValue"> | Date | string
    updatedAt?: DateTimeFilter<"KeyValue"> | Date | string
  }

  export type KeyValueOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type KeyValueWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: KeyValueWhereInput | KeyValueWhereInput[]
    OR?: KeyValueWhereInput[]
    NOT?: KeyValueWhereInput | KeyValueWhereInput[]
    value?: StringFilter<"KeyValue"> | string
    createdAt?: DateTimeFilter<"KeyValue"> | Date | string
    updatedAt?: DateTimeFilter<"KeyValue"> | Date | string
  }, "key">

  export type KeyValueOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: KeyValueCountOrderByAggregateInput
    _max?: KeyValueMaxOrderByAggregateInput
    _min?: KeyValueMinOrderByAggregateInput
  }

  export type KeyValueScalarWhereWithAggregatesInput = {
    AND?: KeyValueScalarWhereWithAggregatesInput | KeyValueScalarWhereWithAggregatesInput[]
    OR?: KeyValueScalarWhereWithAggregatesInput[]
    NOT?: KeyValueScalarWhereWithAggregatesInput | KeyValueScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"KeyValue"> | string
    value?: StringWithAggregatesFilter<"KeyValue"> | string
    createdAt?: DateTimeWithAggregatesFilter<"KeyValue"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"KeyValue"> | Date | string
  }

  export type AhsListingCreateInput = {
    id?: string
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scapeHeight?: string | null
    bloomSize?: string | null
    bloomSeason?: string | null
    ploidy?: string | null
    foliageType?: string | null
    bloomHabit?: string | null
    seedlingNum?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    ahsImageUrl?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lilies?: ListingCreateNestedManyWithoutAhsListingInput
  }

  export type AhsListingUncheckedCreateInput = {
    id?: string
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scapeHeight?: string | null
    bloomSize?: string | null
    bloomSeason?: string | null
    ploidy?: string | null
    foliageType?: string | null
    bloomHabit?: string | null
    seedlingNum?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    ahsImageUrl?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lilies?: ListingUncheckedCreateNestedManyWithoutAhsListingInput
  }

  export type AhsListingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: ListingUpdateManyWithoutAhsListingNestedInput
  }

  export type AhsListingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lilies?: ListingUncheckedUpdateManyWithoutAhsListingNestedInput
  }

  export type AhsListingCreateManyInput = {
    id?: string
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scapeHeight?: string | null
    bloomSize?: string | null
    bloomSeason?: string | null
    ploidy?: string | null
    foliageType?: string | null
    bloomHabit?: string | null
    seedlingNum?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    ahsImageUrl?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AhsListingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AhsListingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListingCreateInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageCreateNestedManyWithoutListingInput
    ahsListing?: AhsListingCreateNestedOneWithoutLiliesInput
    lists?: ListCreateNestedManyWithoutListingsInput
    user: UserCreateNestedOneWithoutListingsInput
  }

  export type ListingUncheckedCreateInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutListingInput
    lists?: ListUncheckedCreateNestedManyWithoutListingsInput
  }

  export type ListingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUpdateManyWithoutListingNestedInput
    ahsListing?: AhsListingUpdateOneWithoutLiliesNestedInput
    lists?: ListUpdateManyWithoutListingsNestedInput
    user?: UserUpdateOneRequiredWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutListingNestedInput
    lists?: ListUncheckedUpdateManyWithoutListingsNestedInput
  }

  export type ListingCreateManyInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListCreateInput = {
    id?: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingCreateNestedManyWithoutListsInput
    user: UserCreateNestedOneWithoutListsInput
  }

  export type ListUncheckedCreateInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingUncheckedCreateNestedManyWithoutListsInput
  }

  export type ListUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUpdateManyWithoutListsNestedInput
    user?: UserUpdateOneRequiredWithoutListsNestedInput
  }

  export type ListUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUncheckedUpdateManyWithoutListsNestedInput
  }

  export type ListCreateManyInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileCreateInput = {
    id?: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutProfileInput
    images?: ImageCreateNestedManyWithoutUserProfileInput
  }

  export type UserProfileUncheckedCreateInput = {
    id?: string
    userId: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutUserProfileInput
  }

  export type UserProfileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProfileNestedInput
    images?: ImageUpdateManyWithoutUserProfileNestedInput
  }

  export type UserProfileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutUserProfileNestedInput
  }

  export type UserProfileCreateManyInput = {
    id?: string
    userId: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ImageCreateInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfile?: UserProfileCreateNestedOneWithoutImagesInput
    listing?: ListingCreateNestedOneWithoutImagesInput
  }

  export type ImageUncheckedCreateInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfileId?: string | null
    listingId?: string | null
  }

  export type ImageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfile?: UserProfileUpdateOneWithoutImagesNestedInput
    listing?: ListingUpdateOneWithoutImagesNestedInput
  }

  export type ImageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfileId?: NullableStringFieldUpdateOperationsInput | string | null
    listingId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ImageCreateManyInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfileId?: string | null
    listingId?: string | null
  }

  export type ImageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ImageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfileId?: NullableStringFieldUpdateOperationsInput | string | null
    listingId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserCreateInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingCreateNestedManyWithoutUserInput
    lists?: ListCreateNestedManyWithoutUserInput
    profile?: UserProfileCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingUncheckedCreateNestedManyWithoutUserInput
    lists?: ListUncheckedCreateNestedManyWithoutUserInput
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUpdateManyWithoutUserNestedInput
    lists?: ListUpdateManyWithoutUserNestedInput
    profile?: UserProfileUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUncheckedUpdateManyWithoutUserNestedInput
    lists?: ListUncheckedUpdateManyWithoutUserNestedInput
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type KeyValueCreateInput = {
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type KeyValueUncheckedCreateInput = {
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type KeyValueUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type KeyValueUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type KeyValueCreateManyInput = {
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type KeyValueUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type KeyValueUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ListingListRelationFilter = {
    every?: ListingWhereInput
    some?: ListingWhereInput
    none?: ListingWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ListingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AhsListingCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scapeHeight?: SortOrder
    bloomSize?: SortOrder
    bloomSeason?: SortOrder
    ploidy?: SortOrder
    foliageType?: SortOrder
    bloomHabit?: SortOrder
    seedlingNum?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    ahsImageUrl?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AhsListingMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scapeHeight?: SortOrder
    bloomSize?: SortOrder
    bloomSeason?: SortOrder
    ploidy?: SortOrder
    foliageType?: SortOrder
    bloomHabit?: SortOrder
    seedlingNum?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    ahsImageUrl?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AhsListingMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    hybridizer?: SortOrder
    year?: SortOrder
    scapeHeight?: SortOrder
    bloomSize?: SortOrder
    bloomSeason?: SortOrder
    ploidy?: SortOrder
    foliageType?: SortOrder
    bloomHabit?: SortOrder
    seedlingNum?: SortOrder
    color?: SortOrder
    form?: SortOrder
    parentage?: SortOrder
    ahsImageUrl?: SortOrder
    fragrance?: SortOrder
    budcount?: SortOrder
    branches?: SortOrder
    sculpting?: SortOrder
    foliage?: SortOrder
    flower?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
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

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
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

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type ImageListRelationFilter = {
    every?: ImageWhereInput
    some?: ImageWhereInput
    none?: ImageWhereInput
  }

  export type AhsListingNullableRelationFilter = {
    is?: AhsListingWhereInput | null
    isNot?: AhsListingWhereInput | null
  }

  export type ListListRelationFilter = {
    every?: ListWhereInput
    some?: ListWhereInput
    none?: ListWhereInput
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type ImageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ListOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ListingUserIdSlugCompoundUniqueInput = {
    userId: string
    slug: string
  }

  export type ListingCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    price?: SortOrder
    description?: SortOrder
    privateNote?: SortOrder
    ahsId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListingAvgOrderByAggregateInput = {
    price?: SortOrder
  }

  export type ListingMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    price?: SortOrder
    description?: SortOrder
    privateNote?: SortOrder
    ahsId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListingMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    price?: SortOrder
    description?: SortOrder
    privateNote?: SortOrder
    ahsId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListingSumOrderByAggregateInput = {
    price?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type ListCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserProfileCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    logoUrl?: SortOrder
    description?: SortOrder
    content?: SortOrder
    location?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    logoUrl?: SortOrder
    description?: SortOrder
    content?: SortOrder
    location?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserProfileMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    slug?: SortOrder
    logoUrl?: SortOrder
    description?: SortOrder
    content?: SortOrder
    location?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type UserProfileNullableRelationFilter = {
    is?: UserProfileWhereInput | null
    isNot?: UserProfileWhereInput | null
  }

  export type ListingNullableRelationFilter = {
    is?: ListingWhereInput | null
    isNot?: ListingWhereInput | null
  }

  export type ImageCountOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    status?: SortOrder
    userProfileId?: SortOrder
    listingId?: SortOrder
  }

  export type ImageAvgOrderByAggregateInput = {
    order?: SortOrder
  }

  export type ImageMaxOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    status?: SortOrder
    userProfileId?: SortOrder
    listingId?: SortOrder
  }

  export type ImageMinOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    status?: SortOrder
    userProfileId?: SortOrder
    listingId?: SortOrder
  }

  export type ImageSumOrderByAggregateInput = {
    order?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
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

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    stripeCustomerId?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    stripeCustomerId?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    stripeCustomerId?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type KeyValueCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type KeyValueMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type KeyValueMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListingCreateNestedManyWithoutAhsListingInput = {
    create?: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput> | ListingCreateWithoutAhsListingInput[] | ListingUncheckedCreateWithoutAhsListingInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutAhsListingInput | ListingCreateOrConnectWithoutAhsListingInput[]
    createMany?: ListingCreateManyAhsListingInputEnvelope
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type ListingUncheckedCreateNestedManyWithoutAhsListingInput = {
    create?: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput> | ListingCreateWithoutAhsListingInput[] | ListingUncheckedCreateWithoutAhsListingInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutAhsListingInput | ListingCreateOrConnectWithoutAhsListingInput[]
    createMany?: ListingCreateManyAhsListingInputEnvelope
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ListingUpdateManyWithoutAhsListingNestedInput = {
    create?: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput> | ListingCreateWithoutAhsListingInput[] | ListingUncheckedCreateWithoutAhsListingInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutAhsListingInput | ListingCreateOrConnectWithoutAhsListingInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutAhsListingInput | ListingUpsertWithWhereUniqueWithoutAhsListingInput[]
    createMany?: ListingCreateManyAhsListingInputEnvelope
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutAhsListingInput | ListingUpdateWithWhereUniqueWithoutAhsListingInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutAhsListingInput | ListingUpdateManyWithWhereWithoutAhsListingInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type ListingUncheckedUpdateManyWithoutAhsListingNestedInput = {
    create?: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput> | ListingCreateWithoutAhsListingInput[] | ListingUncheckedCreateWithoutAhsListingInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutAhsListingInput | ListingCreateOrConnectWithoutAhsListingInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutAhsListingInput | ListingUpsertWithWhereUniqueWithoutAhsListingInput[]
    createMany?: ListingCreateManyAhsListingInputEnvelope
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutAhsListingInput | ListingUpdateWithWhereUniqueWithoutAhsListingInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutAhsListingInput | ListingUpdateManyWithWhereWithoutAhsListingInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type ImageCreateNestedManyWithoutListingInput = {
    create?: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput> | ImageCreateWithoutListingInput[] | ImageUncheckedCreateWithoutListingInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutListingInput | ImageCreateOrConnectWithoutListingInput[]
    createMany?: ImageCreateManyListingInputEnvelope
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
  }

  export type AhsListingCreateNestedOneWithoutLiliesInput = {
    create?: XOR<AhsListingCreateWithoutLiliesInput, AhsListingUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: AhsListingCreateOrConnectWithoutLiliesInput
    connect?: AhsListingWhereUniqueInput
  }

  export type ListCreateNestedManyWithoutListingsInput = {
    create?: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput> | ListCreateWithoutListingsInput[] | ListUncheckedCreateWithoutListingsInput[]
    connectOrCreate?: ListCreateOrConnectWithoutListingsInput | ListCreateOrConnectWithoutListingsInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutListingsInput = {
    create?: XOR<UserCreateWithoutListingsInput, UserUncheckedCreateWithoutListingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutListingsInput
    connect?: UserWhereUniqueInput
  }

  export type ImageUncheckedCreateNestedManyWithoutListingInput = {
    create?: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput> | ImageCreateWithoutListingInput[] | ImageUncheckedCreateWithoutListingInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutListingInput | ImageCreateOrConnectWithoutListingInput[]
    createMany?: ImageCreateManyListingInputEnvelope
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
  }

  export type ListUncheckedCreateNestedManyWithoutListingsInput = {
    create?: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput> | ListCreateWithoutListingsInput[] | ListUncheckedCreateWithoutListingsInput[]
    connectOrCreate?: ListCreateOrConnectWithoutListingsInput | ListCreateOrConnectWithoutListingsInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ImageUpdateManyWithoutListingNestedInput = {
    create?: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput> | ImageCreateWithoutListingInput[] | ImageUncheckedCreateWithoutListingInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutListingInput | ImageCreateOrConnectWithoutListingInput[]
    upsert?: ImageUpsertWithWhereUniqueWithoutListingInput | ImageUpsertWithWhereUniqueWithoutListingInput[]
    createMany?: ImageCreateManyListingInputEnvelope
    set?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    disconnect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    delete?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    update?: ImageUpdateWithWhereUniqueWithoutListingInput | ImageUpdateWithWhereUniqueWithoutListingInput[]
    updateMany?: ImageUpdateManyWithWhereWithoutListingInput | ImageUpdateManyWithWhereWithoutListingInput[]
    deleteMany?: ImageScalarWhereInput | ImageScalarWhereInput[]
  }

  export type AhsListingUpdateOneWithoutLiliesNestedInput = {
    create?: XOR<AhsListingCreateWithoutLiliesInput, AhsListingUncheckedCreateWithoutLiliesInput>
    connectOrCreate?: AhsListingCreateOrConnectWithoutLiliesInput
    upsert?: AhsListingUpsertWithoutLiliesInput
    disconnect?: AhsListingWhereInput | boolean
    delete?: AhsListingWhereInput | boolean
    connect?: AhsListingWhereUniqueInput
    update?: XOR<XOR<AhsListingUpdateToOneWithWhereWithoutLiliesInput, AhsListingUpdateWithoutLiliesInput>, AhsListingUncheckedUpdateWithoutLiliesInput>
  }

  export type ListUpdateManyWithoutListingsNestedInput = {
    create?: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput> | ListCreateWithoutListingsInput[] | ListUncheckedCreateWithoutListingsInput[]
    connectOrCreate?: ListCreateOrConnectWithoutListingsInput | ListCreateOrConnectWithoutListingsInput[]
    upsert?: ListUpsertWithWhereUniqueWithoutListingsInput | ListUpsertWithWhereUniqueWithoutListingsInput[]
    set?: ListWhereUniqueInput | ListWhereUniqueInput[]
    disconnect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    delete?: ListWhereUniqueInput | ListWhereUniqueInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    update?: ListUpdateWithWhereUniqueWithoutListingsInput | ListUpdateWithWhereUniqueWithoutListingsInput[]
    updateMany?: ListUpdateManyWithWhereWithoutListingsInput | ListUpdateManyWithWhereWithoutListingsInput[]
    deleteMany?: ListScalarWhereInput | ListScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutListingsNestedInput = {
    create?: XOR<UserCreateWithoutListingsInput, UserUncheckedCreateWithoutListingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutListingsInput
    upsert?: UserUpsertWithoutListingsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutListingsInput, UserUpdateWithoutListingsInput>, UserUncheckedUpdateWithoutListingsInput>
  }

  export type ImageUncheckedUpdateManyWithoutListingNestedInput = {
    create?: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput> | ImageCreateWithoutListingInput[] | ImageUncheckedCreateWithoutListingInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutListingInput | ImageCreateOrConnectWithoutListingInput[]
    upsert?: ImageUpsertWithWhereUniqueWithoutListingInput | ImageUpsertWithWhereUniqueWithoutListingInput[]
    createMany?: ImageCreateManyListingInputEnvelope
    set?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    disconnect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    delete?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    update?: ImageUpdateWithWhereUniqueWithoutListingInput | ImageUpdateWithWhereUniqueWithoutListingInput[]
    updateMany?: ImageUpdateManyWithWhereWithoutListingInput | ImageUpdateManyWithWhereWithoutListingInput[]
    deleteMany?: ImageScalarWhereInput | ImageScalarWhereInput[]
  }

  export type ListUncheckedUpdateManyWithoutListingsNestedInput = {
    create?: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput> | ListCreateWithoutListingsInput[] | ListUncheckedCreateWithoutListingsInput[]
    connectOrCreate?: ListCreateOrConnectWithoutListingsInput | ListCreateOrConnectWithoutListingsInput[]
    upsert?: ListUpsertWithWhereUniqueWithoutListingsInput | ListUpsertWithWhereUniqueWithoutListingsInput[]
    set?: ListWhereUniqueInput | ListWhereUniqueInput[]
    disconnect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    delete?: ListWhereUniqueInput | ListWhereUniqueInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    update?: ListUpdateWithWhereUniqueWithoutListingsInput | ListUpdateWithWhereUniqueWithoutListingsInput[]
    updateMany?: ListUpdateManyWithWhereWithoutListingsInput | ListUpdateManyWithWhereWithoutListingsInput[]
    deleteMany?: ListScalarWhereInput | ListScalarWhereInput[]
  }

  export type ListingCreateNestedManyWithoutListsInput = {
    create?: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput> | ListingCreateWithoutListsInput[] | ListingUncheckedCreateWithoutListsInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutListsInput | ListingCreateOrConnectWithoutListsInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutListsInput = {
    create?: XOR<UserCreateWithoutListsInput, UserUncheckedCreateWithoutListsInput>
    connectOrCreate?: UserCreateOrConnectWithoutListsInput
    connect?: UserWhereUniqueInput
  }

  export type ListingUncheckedCreateNestedManyWithoutListsInput = {
    create?: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput> | ListingCreateWithoutListsInput[] | ListingUncheckedCreateWithoutListsInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutListsInput | ListingCreateOrConnectWithoutListsInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type ListingUpdateManyWithoutListsNestedInput = {
    create?: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput> | ListingCreateWithoutListsInput[] | ListingUncheckedCreateWithoutListsInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutListsInput | ListingCreateOrConnectWithoutListsInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutListsInput | ListingUpsertWithWhereUniqueWithoutListsInput[]
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutListsInput | ListingUpdateWithWhereUniqueWithoutListsInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutListsInput | ListingUpdateManyWithWhereWithoutListsInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutListsNestedInput = {
    create?: XOR<UserCreateWithoutListsInput, UserUncheckedCreateWithoutListsInput>
    connectOrCreate?: UserCreateOrConnectWithoutListsInput
    upsert?: UserUpsertWithoutListsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutListsInput, UserUpdateWithoutListsInput>, UserUncheckedUpdateWithoutListsInput>
  }

  export type ListingUncheckedUpdateManyWithoutListsNestedInput = {
    create?: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput> | ListingCreateWithoutListsInput[] | ListingUncheckedCreateWithoutListsInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutListsInput | ListingCreateOrConnectWithoutListsInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutListsInput | ListingUpsertWithWhereUniqueWithoutListsInput[]
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutListsInput | ListingUpdateWithWhereUniqueWithoutListsInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutListsInput | ListingUpdateManyWithWhereWithoutListsInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutProfileInput = {
    create?: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfileInput
    connect?: UserWhereUniqueInput
  }

  export type ImageCreateNestedManyWithoutUserProfileInput = {
    create?: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput> | ImageCreateWithoutUserProfileInput[] | ImageUncheckedCreateWithoutUserProfileInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutUserProfileInput | ImageCreateOrConnectWithoutUserProfileInput[]
    createMany?: ImageCreateManyUserProfileInputEnvelope
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
  }

  export type ImageUncheckedCreateNestedManyWithoutUserProfileInput = {
    create?: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput> | ImageCreateWithoutUserProfileInput[] | ImageUncheckedCreateWithoutUserProfileInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutUserProfileInput | ImageCreateOrConnectWithoutUserProfileInput[]
    createMany?: ImageCreateManyUserProfileInputEnvelope
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutProfileNestedInput = {
    create?: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfileInput
    upsert?: UserUpsertWithoutProfileInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProfileInput, UserUpdateWithoutProfileInput>, UserUncheckedUpdateWithoutProfileInput>
  }

  export type ImageUpdateManyWithoutUserProfileNestedInput = {
    create?: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput> | ImageCreateWithoutUserProfileInput[] | ImageUncheckedCreateWithoutUserProfileInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutUserProfileInput | ImageCreateOrConnectWithoutUserProfileInput[]
    upsert?: ImageUpsertWithWhereUniqueWithoutUserProfileInput | ImageUpsertWithWhereUniqueWithoutUserProfileInput[]
    createMany?: ImageCreateManyUserProfileInputEnvelope
    set?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    disconnect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    delete?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    update?: ImageUpdateWithWhereUniqueWithoutUserProfileInput | ImageUpdateWithWhereUniqueWithoutUserProfileInput[]
    updateMany?: ImageUpdateManyWithWhereWithoutUserProfileInput | ImageUpdateManyWithWhereWithoutUserProfileInput[]
    deleteMany?: ImageScalarWhereInput | ImageScalarWhereInput[]
  }

  export type ImageUncheckedUpdateManyWithoutUserProfileNestedInput = {
    create?: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput> | ImageCreateWithoutUserProfileInput[] | ImageUncheckedCreateWithoutUserProfileInput[]
    connectOrCreate?: ImageCreateOrConnectWithoutUserProfileInput | ImageCreateOrConnectWithoutUserProfileInput[]
    upsert?: ImageUpsertWithWhereUniqueWithoutUserProfileInput | ImageUpsertWithWhereUniqueWithoutUserProfileInput[]
    createMany?: ImageCreateManyUserProfileInputEnvelope
    set?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    disconnect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    delete?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    connect?: ImageWhereUniqueInput | ImageWhereUniqueInput[]
    update?: ImageUpdateWithWhereUniqueWithoutUserProfileInput | ImageUpdateWithWhereUniqueWithoutUserProfileInput[]
    updateMany?: ImageUpdateManyWithWhereWithoutUserProfileInput | ImageUpdateManyWithWhereWithoutUserProfileInput[]
    deleteMany?: ImageScalarWhereInput | ImageScalarWhereInput[]
  }

  export type UserProfileCreateNestedOneWithoutImagesInput = {
    create?: XOR<UserProfileCreateWithoutImagesInput, UserProfileUncheckedCreateWithoutImagesInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutImagesInput
    connect?: UserProfileWhereUniqueInput
  }

  export type ListingCreateNestedOneWithoutImagesInput = {
    create?: XOR<ListingCreateWithoutImagesInput, ListingUncheckedCreateWithoutImagesInput>
    connectOrCreate?: ListingCreateOrConnectWithoutImagesInput
    connect?: ListingWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserProfileUpdateOneWithoutImagesNestedInput = {
    create?: XOR<UserProfileCreateWithoutImagesInput, UserProfileUncheckedCreateWithoutImagesInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutImagesInput
    upsert?: UserProfileUpsertWithoutImagesInput
    disconnect?: UserProfileWhereInput | boolean
    delete?: UserProfileWhereInput | boolean
    connect?: UserProfileWhereUniqueInput
    update?: XOR<XOR<UserProfileUpdateToOneWithWhereWithoutImagesInput, UserProfileUpdateWithoutImagesInput>, UserProfileUncheckedUpdateWithoutImagesInput>
  }

  export type ListingUpdateOneWithoutImagesNestedInput = {
    create?: XOR<ListingCreateWithoutImagesInput, ListingUncheckedCreateWithoutImagesInput>
    connectOrCreate?: ListingCreateOrConnectWithoutImagesInput
    upsert?: ListingUpsertWithoutImagesInput
    disconnect?: ListingWhereInput | boolean
    delete?: ListingWhereInput | boolean
    connect?: ListingWhereUniqueInput
    update?: XOR<XOR<ListingUpdateToOneWithWhereWithoutImagesInput, ListingUpdateWithoutImagesInput>, ListingUncheckedUpdateWithoutImagesInput>
  }

  export type ListingCreateNestedManyWithoutUserInput = {
    create?: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput> | ListingCreateWithoutUserInput[] | ListingUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutUserInput | ListingCreateOrConnectWithoutUserInput[]
    createMany?: ListingCreateManyUserInputEnvelope
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type ListCreateNestedManyWithoutUserInput = {
    create?: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput> | ListCreateWithoutUserInput[] | ListUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListCreateOrConnectWithoutUserInput | ListCreateOrConnectWithoutUserInput[]
    createMany?: ListCreateManyUserInputEnvelope
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
  }

  export type UserProfileCreateNestedOneWithoutUserInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    connect?: UserProfileWhereUniqueInput
  }

  export type ListingUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput> | ListingCreateWithoutUserInput[] | ListingUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutUserInput | ListingCreateOrConnectWithoutUserInput[]
    createMany?: ListingCreateManyUserInputEnvelope
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
  }

  export type ListUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput> | ListCreateWithoutUserInput[] | ListUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListCreateOrConnectWithoutUserInput | ListCreateOrConnectWithoutUserInput[]
    createMany?: ListCreateManyUserInputEnvelope
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
  }

  export type UserProfileUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    connect?: UserProfileWhereUniqueInput
  }

  export type ListingUpdateManyWithoutUserNestedInput = {
    create?: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput> | ListingCreateWithoutUserInput[] | ListingUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutUserInput | ListingCreateOrConnectWithoutUserInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutUserInput | ListingUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ListingCreateManyUserInputEnvelope
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutUserInput | ListingUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutUserInput | ListingUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type ListUpdateManyWithoutUserNestedInput = {
    create?: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput> | ListCreateWithoutUserInput[] | ListUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListCreateOrConnectWithoutUserInput | ListCreateOrConnectWithoutUserInput[]
    upsert?: ListUpsertWithWhereUniqueWithoutUserInput | ListUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ListCreateManyUserInputEnvelope
    set?: ListWhereUniqueInput | ListWhereUniqueInput[]
    disconnect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    delete?: ListWhereUniqueInput | ListWhereUniqueInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    update?: ListUpdateWithWhereUniqueWithoutUserInput | ListUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ListUpdateManyWithWhereWithoutUserInput | ListUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ListScalarWhereInput | ListScalarWhereInput[]
  }

  export type UserProfileUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    upsert?: UserProfileUpsertWithoutUserInput
    disconnect?: UserProfileWhereInput | boolean
    delete?: UserProfileWhereInput | boolean
    connect?: UserProfileWhereUniqueInput
    update?: XOR<XOR<UserProfileUpdateToOneWithWhereWithoutUserInput, UserProfileUpdateWithoutUserInput>, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type ListingUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput> | ListingCreateWithoutUserInput[] | ListingUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListingCreateOrConnectWithoutUserInput | ListingCreateOrConnectWithoutUserInput[]
    upsert?: ListingUpsertWithWhereUniqueWithoutUserInput | ListingUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ListingCreateManyUserInputEnvelope
    set?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    disconnect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    delete?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    connect?: ListingWhereUniqueInput | ListingWhereUniqueInput[]
    update?: ListingUpdateWithWhereUniqueWithoutUserInput | ListingUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ListingUpdateManyWithWhereWithoutUserInput | ListingUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ListingScalarWhereInput | ListingScalarWhereInput[]
  }

  export type ListUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput> | ListCreateWithoutUserInput[] | ListUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ListCreateOrConnectWithoutUserInput | ListCreateOrConnectWithoutUserInput[]
    upsert?: ListUpsertWithWhereUniqueWithoutUserInput | ListUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ListCreateManyUserInputEnvelope
    set?: ListWhereUniqueInput | ListWhereUniqueInput[]
    disconnect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    delete?: ListWhereUniqueInput | ListWhereUniqueInput[]
    connect?: ListWhereUniqueInput | ListWhereUniqueInput[]
    update?: ListUpdateWithWhereUniqueWithoutUserInput | ListUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ListUpdateManyWithWhereWithoutUserInput | ListUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ListScalarWhereInput | ListScalarWhereInput[]
  }

  export type UserProfileUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    upsert?: UserProfileUpsertWithoutUserInput
    disconnect?: UserProfileWhereInput | boolean
    delete?: UserProfileWhereInput | boolean
    connect?: UserProfileWhereUniqueInput
    update?: XOR<XOR<UserProfileUpdateToOneWithWhereWithoutUserInput, UserProfileUpdateWithoutUserInput>, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
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
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
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

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
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
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
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
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type ListingCreateWithoutAhsListingInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageCreateNestedManyWithoutListingInput
    lists?: ListCreateNestedManyWithoutListingsInput
    user: UserCreateNestedOneWithoutListingsInput
  }

  export type ListingUncheckedCreateWithoutAhsListingInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutListingInput
    lists?: ListUncheckedCreateNestedManyWithoutListingsInput
  }

  export type ListingCreateOrConnectWithoutAhsListingInput = {
    where: ListingWhereUniqueInput
    create: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput>
  }

  export type ListingCreateManyAhsListingInputEnvelope = {
    data: ListingCreateManyAhsListingInput | ListingCreateManyAhsListingInput[]
  }

  export type ListingUpsertWithWhereUniqueWithoutAhsListingInput = {
    where: ListingWhereUniqueInput
    update: XOR<ListingUpdateWithoutAhsListingInput, ListingUncheckedUpdateWithoutAhsListingInput>
    create: XOR<ListingCreateWithoutAhsListingInput, ListingUncheckedCreateWithoutAhsListingInput>
  }

  export type ListingUpdateWithWhereUniqueWithoutAhsListingInput = {
    where: ListingWhereUniqueInput
    data: XOR<ListingUpdateWithoutAhsListingInput, ListingUncheckedUpdateWithoutAhsListingInput>
  }

  export type ListingUpdateManyWithWhereWithoutAhsListingInput = {
    where: ListingScalarWhereInput
    data: XOR<ListingUpdateManyMutationInput, ListingUncheckedUpdateManyWithoutAhsListingInput>
  }

  export type ListingScalarWhereInput = {
    AND?: ListingScalarWhereInput | ListingScalarWhereInput[]
    OR?: ListingScalarWhereInput[]
    NOT?: ListingScalarWhereInput | ListingScalarWhereInput[]
    id?: StringFilter<"Listing"> | string
    userId?: StringFilter<"Listing"> | string
    title?: StringFilter<"Listing"> | string
    slug?: StringFilter<"Listing"> | string
    price?: FloatNullableFilter<"Listing"> | number | null
    description?: StringNullableFilter<"Listing"> | string | null
    privateNote?: StringNullableFilter<"Listing"> | string | null
    ahsId?: StringNullableFilter<"Listing"> | string | null
    status?: StringNullableFilter<"Listing"> | string | null
    createdAt?: DateTimeFilter<"Listing"> | Date | string
    updatedAt?: DateTimeFilter<"Listing"> | Date | string
  }

  export type ImageCreateWithoutListingInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfile?: UserProfileCreateNestedOneWithoutImagesInput
  }

  export type ImageUncheckedCreateWithoutListingInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfileId?: string | null
  }

  export type ImageCreateOrConnectWithoutListingInput = {
    where: ImageWhereUniqueInput
    create: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput>
  }

  export type ImageCreateManyListingInputEnvelope = {
    data: ImageCreateManyListingInput | ImageCreateManyListingInput[]
  }

  export type AhsListingCreateWithoutLiliesInput = {
    id?: string
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scapeHeight?: string | null
    bloomSize?: string | null
    bloomSeason?: string | null
    ploidy?: string | null
    foliageType?: string | null
    bloomHabit?: string | null
    seedlingNum?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    ahsImageUrl?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AhsListingUncheckedCreateWithoutLiliesInput = {
    id?: string
    name?: string | null
    hybridizer?: string | null
    year?: string | null
    scapeHeight?: string | null
    bloomSize?: string | null
    bloomSeason?: string | null
    ploidy?: string | null
    foliageType?: string | null
    bloomHabit?: string | null
    seedlingNum?: string | null
    color?: string | null
    form?: string | null
    parentage?: string | null
    ahsImageUrl?: string | null
    fragrance?: string | null
    budcount?: string | null
    branches?: string | null
    sculpting?: string | null
    foliage?: string | null
    flower?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AhsListingCreateOrConnectWithoutLiliesInput = {
    where: AhsListingWhereUniqueInput
    create: XOR<AhsListingCreateWithoutLiliesInput, AhsListingUncheckedCreateWithoutLiliesInput>
  }

  export type ListCreateWithoutListingsInput = {
    id?: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutListsInput
  }

  export type ListUncheckedCreateWithoutListingsInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListCreateOrConnectWithoutListingsInput = {
    where: ListWhereUniqueInput
    create: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput>
  }

  export type UserCreateWithoutListingsInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lists?: ListCreateNestedManyWithoutUserInput
    profile?: UserProfileCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutListingsInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lists?: ListUncheckedCreateNestedManyWithoutUserInput
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutListingsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutListingsInput, UserUncheckedCreateWithoutListingsInput>
  }

  export type ImageUpsertWithWhereUniqueWithoutListingInput = {
    where: ImageWhereUniqueInput
    update: XOR<ImageUpdateWithoutListingInput, ImageUncheckedUpdateWithoutListingInput>
    create: XOR<ImageCreateWithoutListingInput, ImageUncheckedCreateWithoutListingInput>
  }

  export type ImageUpdateWithWhereUniqueWithoutListingInput = {
    where: ImageWhereUniqueInput
    data: XOR<ImageUpdateWithoutListingInput, ImageUncheckedUpdateWithoutListingInput>
  }

  export type ImageUpdateManyWithWhereWithoutListingInput = {
    where: ImageScalarWhereInput
    data: XOR<ImageUpdateManyMutationInput, ImageUncheckedUpdateManyWithoutListingInput>
  }

  export type ImageScalarWhereInput = {
    AND?: ImageScalarWhereInput | ImageScalarWhereInput[]
    OR?: ImageScalarWhereInput[]
    NOT?: ImageScalarWhereInput | ImageScalarWhereInput[]
    id?: StringFilter<"Image"> | string
    url?: StringFilter<"Image"> | string
    order?: IntFilter<"Image"> | number
    createdAt?: DateTimeFilter<"Image"> | Date | string
    updatedAt?: DateTimeFilter<"Image"> | Date | string
    status?: StringNullableFilter<"Image"> | string | null
    userProfileId?: StringNullableFilter<"Image"> | string | null
    listingId?: StringNullableFilter<"Image"> | string | null
  }

  export type AhsListingUpsertWithoutLiliesInput = {
    update: XOR<AhsListingUpdateWithoutLiliesInput, AhsListingUncheckedUpdateWithoutLiliesInput>
    create: XOR<AhsListingCreateWithoutLiliesInput, AhsListingUncheckedCreateWithoutLiliesInput>
    where?: AhsListingWhereInput
  }

  export type AhsListingUpdateToOneWithWhereWithoutLiliesInput = {
    where?: AhsListingWhereInput
    data: XOR<AhsListingUpdateWithoutLiliesInput, AhsListingUncheckedUpdateWithoutLiliesInput>
  }

  export type AhsListingUpdateWithoutLiliesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AhsListingUncheckedUpdateWithoutLiliesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    hybridizer?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableStringFieldUpdateOperationsInput | string | null
    scapeHeight?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSize?: NullableStringFieldUpdateOperationsInput | string | null
    bloomSeason?: NullableStringFieldUpdateOperationsInput | string | null
    ploidy?: NullableStringFieldUpdateOperationsInput | string | null
    foliageType?: NullableStringFieldUpdateOperationsInput | string | null
    bloomHabit?: NullableStringFieldUpdateOperationsInput | string | null
    seedlingNum?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    form?: NullableStringFieldUpdateOperationsInput | string | null
    parentage?: NullableStringFieldUpdateOperationsInput | string | null
    ahsImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fragrance?: NullableStringFieldUpdateOperationsInput | string | null
    budcount?: NullableStringFieldUpdateOperationsInput | string | null
    branches?: NullableStringFieldUpdateOperationsInput | string | null
    sculpting?: NullableStringFieldUpdateOperationsInput | string | null
    foliage?: NullableStringFieldUpdateOperationsInput | string | null
    flower?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListUpsertWithWhereUniqueWithoutListingsInput = {
    where: ListWhereUniqueInput
    update: XOR<ListUpdateWithoutListingsInput, ListUncheckedUpdateWithoutListingsInput>
    create: XOR<ListCreateWithoutListingsInput, ListUncheckedCreateWithoutListingsInput>
  }

  export type ListUpdateWithWhereUniqueWithoutListingsInput = {
    where: ListWhereUniqueInput
    data: XOR<ListUpdateWithoutListingsInput, ListUncheckedUpdateWithoutListingsInput>
  }

  export type ListUpdateManyWithWhereWithoutListingsInput = {
    where: ListScalarWhereInput
    data: XOR<ListUpdateManyMutationInput, ListUncheckedUpdateManyWithoutListingsInput>
  }

  export type ListScalarWhereInput = {
    AND?: ListScalarWhereInput | ListScalarWhereInput[]
    OR?: ListScalarWhereInput[]
    NOT?: ListScalarWhereInput | ListScalarWhereInput[]
    id?: StringFilter<"List"> | string
    userId?: StringFilter<"List"> | string
    title?: StringFilter<"List"> | string
    description?: StringNullableFilter<"List"> | string | null
    status?: StringNullableFilter<"List"> | string | null
    createdAt?: DateTimeFilter<"List"> | Date | string
    updatedAt?: DateTimeFilter<"List"> | Date | string
  }

  export type UserUpsertWithoutListingsInput = {
    update: XOR<UserUpdateWithoutListingsInput, UserUncheckedUpdateWithoutListingsInput>
    create: XOR<UserCreateWithoutListingsInput, UserUncheckedCreateWithoutListingsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutListingsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutListingsInput, UserUncheckedUpdateWithoutListingsInput>
  }

  export type UserUpdateWithoutListingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lists?: ListUpdateManyWithoutUserNestedInput
    profile?: UserProfileUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutListingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lists?: ListUncheckedUpdateManyWithoutUserNestedInput
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
  }

  export type ListingCreateWithoutListsInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageCreateNestedManyWithoutListingInput
    ahsListing?: AhsListingCreateNestedOneWithoutLiliesInput
    user: UserCreateNestedOneWithoutListingsInput
  }

  export type ListingUncheckedCreateWithoutListsInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutListingInput
  }

  export type ListingCreateOrConnectWithoutListsInput = {
    where: ListingWhereUniqueInput
    create: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput>
  }

  export type UserCreateWithoutListsInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingCreateNestedManyWithoutUserInput
    profile?: UserProfileCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutListsInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingUncheckedCreateNestedManyWithoutUserInput
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutListsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutListsInput, UserUncheckedCreateWithoutListsInput>
  }

  export type ListingUpsertWithWhereUniqueWithoutListsInput = {
    where: ListingWhereUniqueInput
    update: XOR<ListingUpdateWithoutListsInput, ListingUncheckedUpdateWithoutListsInput>
    create: XOR<ListingCreateWithoutListsInput, ListingUncheckedCreateWithoutListsInput>
  }

  export type ListingUpdateWithWhereUniqueWithoutListsInput = {
    where: ListingWhereUniqueInput
    data: XOR<ListingUpdateWithoutListsInput, ListingUncheckedUpdateWithoutListsInput>
  }

  export type ListingUpdateManyWithWhereWithoutListsInput = {
    where: ListingScalarWhereInput
    data: XOR<ListingUpdateManyMutationInput, ListingUncheckedUpdateManyWithoutListsInput>
  }

  export type UserUpsertWithoutListsInput = {
    update: XOR<UserUpdateWithoutListsInput, UserUncheckedUpdateWithoutListsInput>
    create: XOR<UserCreateWithoutListsInput, UserUncheckedCreateWithoutListsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutListsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutListsInput, UserUncheckedUpdateWithoutListsInput>
  }

  export type UserUpdateWithoutListsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUpdateManyWithoutUserNestedInput
    profile?: UserProfileUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutListsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUncheckedUpdateManyWithoutUserNestedInput
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateWithoutProfileInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingCreateNestedManyWithoutUserInput
    lists?: ListCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutProfileInput = {
    id?: string
    clerkUserId?: string | null
    stripeCustomerId?: string | null
    role?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingUncheckedCreateNestedManyWithoutUserInput
    lists?: ListUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutProfileInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
  }

  export type ImageCreateWithoutUserProfileInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    listing?: ListingCreateNestedOneWithoutImagesInput
  }

  export type ImageUncheckedCreateWithoutUserProfileInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    listingId?: string | null
  }

  export type ImageCreateOrConnectWithoutUserProfileInput = {
    where: ImageWhereUniqueInput
    create: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput>
  }

  export type ImageCreateManyUserProfileInputEnvelope = {
    data: ImageCreateManyUserProfileInput | ImageCreateManyUserProfileInput[]
  }

  export type UserUpsertWithoutProfileInput = {
    update: XOR<UserUpdateWithoutProfileInput, UserUncheckedUpdateWithoutProfileInput>
    create: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProfileInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProfileInput, UserUncheckedUpdateWithoutProfileInput>
  }

  export type UserUpdateWithoutProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUpdateManyWithoutUserNestedInput
    lists?: ListUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUncheckedUpdateManyWithoutUserNestedInput
    lists?: ListUncheckedUpdateManyWithoutUserNestedInput
  }

  export type ImageUpsertWithWhereUniqueWithoutUserProfileInput = {
    where: ImageWhereUniqueInput
    update: XOR<ImageUpdateWithoutUserProfileInput, ImageUncheckedUpdateWithoutUserProfileInput>
    create: XOR<ImageCreateWithoutUserProfileInput, ImageUncheckedCreateWithoutUserProfileInput>
  }

  export type ImageUpdateWithWhereUniqueWithoutUserProfileInput = {
    where: ImageWhereUniqueInput
    data: XOR<ImageUpdateWithoutUserProfileInput, ImageUncheckedUpdateWithoutUserProfileInput>
  }

  export type ImageUpdateManyWithWhereWithoutUserProfileInput = {
    where: ImageScalarWhereInput
    data: XOR<ImageUpdateManyMutationInput, ImageUncheckedUpdateManyWithoutUserProfileInput>
  }

  export type UserProfileCreateWithoutImagesInput = {
    id?: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutProfileInput
  }

  export type UserProfileUncheckedCreateWithoutImagesInput = {
    id?: string
    userId: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileCreateOrConnectWithoutImagesInput = {
    where: UserProfileWhereUniqueInput
    create: XOR<UserProfileCreateWithoutImagesInput, UserProfileUncheckedCreateWithoutImagesInput>
  }

  export type ListingCreateWithoutImagesInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ahsListing?: AhsListingCreateNestedOneWithoutLiliesInput
    lists?: ListCreateNestedManyWithoutListingsInput
    user: UserCreateNestedOneWithoutListingsInput
  }

  export type ListingUncheckedCreateWithoutImagesInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lists?: ListUncheckedCreateNestedManyWithoutListingsInput
  }

  export type ListingCreateOrConnectWithoutImagesInput = {
    where: ListingWhereUniqueInput
    create: XOR<ListingCreateWithoutImagesInput, ListingUncheckedCreateWithoutImagesInput>
  }

  export type UserProfileUpsertWithoutImagesInput = {
    update: XOR<UserProfileUpdateWithoutImagesInput, UserProfileUncheckedUpdateWithoutImagesInput>
    create: XOR<UserProfileCreateWithoutImagesInput, UserProfileUncheckedCreateWithoutImagesInput>
    where?: UserProfileWhereInput
  }

  export type UserProfileUpdateToOneWithWhereWithoutImagesInput = {
    where?: UserProfileWhereInput
    data: XOR<UserProfileUpdateWithoutImagesInput, UserProfileUncheckedUpdateWithoutImagesInput>
  }

  export type UserProfileUpdateWithoutImagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProfileNestedInput
  }

  export type UserProfileUncheckedUpdateWithoutImagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListingUpsertWithoutImagesInput = {
    update: XOR<ListingUpdateWithoutImagesInput, ListingUncheckedUpdateWithoutImagesInput>
    create: XOR<ListingCreateWithoutImagesInput, ListingUncheckedCreateWithoutImagesInput>
    where?: ListingWhereInput
  }

  export type ListingUpdateToOneWithWhereWithoutImagesInput = {
    where?: ListingWhereInput
    data: XOR<ListingUpdateWithoutImagesInput, ListingUncheckedUpdateWithoutImagesInput>
  }

  export type ListingUpdateWithoutImagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ahsListing?: AhsListingUpdateOneWithoutLiliesNestedInput
    lists?: ListUpdateManyWithoutListingsNestedInput
    user?: UserUpdateOneRequiredWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateWithoutImagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lists?: ListUncheckedUpdateManyWithoutListingsNestedInput
  }

  export type ListingCreateWithoutUserInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageCreateNestedManyWithoutListingInput
    ahsListing?: AhsListingCreateNestedOneWithoutLiliesInput
    lists?: ListCreateNestedManyWithoutListingsInput
  }

  export type ListingUncheckedCreateWithoutUserInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutListingInput
    lists?: ListUncheckedCreateNestedManyWithoutListingsInput
  }

  export type ListingCreateOrConnectWithoutUserInput = {
    where: ListingWhereUniqueInput
    create: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput>
  }

  export type ListingCreateManyUserInputEnvelope = {
    data: ListingCreateManyUserInput | ListingCreateManyUserInput[]
  }

  export type ListCreateWithoutUserInput = {
    id?: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingCreateNestedManyWithoutListsInput
  }

  export type ListUncheckedCreateWithoutUserInput = {
    id?: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    listings?: ListingUncheckedCreateNestedManyWithoutListsInput
  }

  export type ListCreateOrConnectWithoutUserInput = {
    where: ListWhereUniqueInput
    create: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput>
  }

  export type ListCreateManyUserInputEnvelope = {
    data: ListCreateManyUserInput | ListCreateManyUserInput[]
  }

  export type UserProfileCreateWithoutUserInput = {
    id?: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageCreateNestedManyWithoutUserProfileInput
  }

  export type UserProfileUncheckedCreateWithoutUserInput = {
    id?: string
    title?: string | null
    slug?: string | null
    logoUrl?: string | null
    description?: string | null
    content?: string | null
    location?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    images?: ImageUncheckedCreateNestedManyWithoutUserProfileInput
  }

  export type UserProfileCreateOrConnectWithoutUserInput = {
    where: UserProfileWhereUniqueInput
    create: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
  }

  export type ListingUpsertWithWhereUniqueWithoutUserInput = {
    where: ListingWhereUniqueInput
    update: XOR<ListingUpdateWithoutUserInput, ListingUncheckedUpdateWithoutUserInput>
    create: XOR<ListingCreateWithoutUserInput, ListingUncheckedCreateWithoutUserInput>
  }

  export type ListingUpdateWithWhereUniqueWithoutUserInput = {
    where: ListingWhereUniqueInput
    data: XOR<ListingUpdateWithoutUserInput, ListingUncheckedUpdateWithoutUserInput>
  }

  export type ListingUpdateManyWithWhereWithoutUserInput = {
    where: ListingScalarWhereInput
    data: XOR<ListingUpdateManyMutationInput, ListingUncheckedUpdateManyWithoutUserInput>
  }

  export type ListUpsertWithWhereUniqueWithoutUserInput = {
    where: ListWhereUniqueInput
    update: XOR<ListUpdateWithoutUserInput, ListUncheckedUpdateWithoutUserInput>
    create: XOR<ListCreateWithoutUserInput, ListUncheckedCreateWithoutUserInput>
  }

  export type ListUpdateWithWhereUniqueWithoutUserInput = {
    where: ListWhereUniqueInput
    data: XOR<ListUpdateWithoutUserInput, ListUncheckedUpdateWithoutUserInput>
  }

  export type ListUpdateManyWithWhereWithoutUserInput = {
    where: ListScalarWhereInput
    data: XOR<ListUpdateManyMutationInput, ListUncheckedUpdateManyWithoutUserInput>
  }

  export type UserProfileUpsertWithoutUserInput = {
    update: XOR<UserProfileUpdateWithoutUserInput, UserProfileUncheckedUpdateWithoutUserInput>
    create: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    where?: UserProfileWhereInput
  }

  export type UserProfileUpdateToOneWithWhereWithoutUserInput = {
    where?: UserProfileWhereInput
    data: XOR<UserProfileUpdateWithoutUserInput, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type UserProfileUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUpdateManyWithoutUserProfileNestedInput
  }

  export type UserProfileUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    slug?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutUserProfileNestedInput
  }

  export type ListingCreateManyAhsListingInput = {
    id?: string
    userId: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListingUpdateWithoutAhsListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUpdateManyWithoutListingNestedInput
    lists?: ListUpdateManyWithoutListingsNestedInput
    user?: UserUpdateOneRequiredWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateWithoutAhsListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutListingNestedInput
    lists?: ListUncheckedUpdateManyWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateManyWithoutAhsListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ImageCreateManyListingInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    userProfileId?: string | null
  }

  export type ImageUpdateWithoutListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfile?: UserProfileUpdateOneWithoutImagesNestedInput
  }

  export type ImageUncheckedUpdateWithoutListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfileId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ImageUncheckedUpdateManyWithoutListingInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    userProfileId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ListUpdateWithoutListingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutListsNestedInput
  }

  export type ListUncheckedUpdateWithoutListingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListUncheckedUpdateManyWithoutListingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListingUpdateWithoutListsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUpdateManyWithoutListingNestedInput
    ahsListing?: AhsListingUpdateOneWithoutLiliesNestedInput
    user?: UserUpdateOneRequiredWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateWithoutListsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutListingNestedInput
  }

  export type ListingUncheckedUpdateManyWithoutListsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ImageCreateManyUserProfileInput = {
    id?: string
    url: string
    order?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: string | null
    listingId?: string | null
  }

  export type ImageUpdateWithoutUserProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    listing?: ListingUpdateOneWithoutImagesNestedInput
  }

  export type ImageUncheckedUpdateWithoutUserProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    listingId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ImageUncheckedUpdateManyWithoutUserProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: NullableStringFieldUpdateOperationsInput | string | null
    listingId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ListingCreateManyUserInput = {
    id?: string
    title: string
    slug: string
    price?: number | null
    description?: string | null
    privateNote?: string | null
    ahsId?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListCreateManyUserInput = {
    id?: string
    title: string
    description?: string | null
    status?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListingUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUpdateManyWithoutListingNestedInput
    ahsListing?: AhsListingUpdateOneWithoutLiliesNestedInput
    lists?: ListUpdateManyWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    images?: ImageUncheckedUpdateManyWithoutListingNestedInput
    lists?: ListUncheckedUpdateManyWithoutListingsNestedInput
  }

  export type ListingUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    privateNote?: NullableStringFieldUpdateOperationsInput | string | null
    ahsId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUpdateManyWithoutListsNestedInput
  }

  export type ListUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listings?: ListingUncheckedUpdateManyWithoutListsNestedInput
  }

  export type ListUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use AhsListingCountOutputTypeDefaultArgs instead
     */
    export type AhsListingCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AhsListingCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ListingCountOutputTypeDefaultArgs instead
     */
    export type ListingCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ListingCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ListCountOutputTypeDefaultArgs instead
     */
    export type ListCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ListCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserProfileCountOutputTypeDefaultArgs instead
     */
    export type UserProfileCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserProfileCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AhsListingDefaultArgs instead
     */
    export type AhsListingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AhsListingDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ListingDefaultArgs instead
     */
    export type ListingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ListingDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ListDefaultArgs instead
     */
    export type ListArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ListDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserProfileDefaultArgs instead
     */
    export type UserProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserProfileDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ImageDefaultArgs instead
     */
    export type ImageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ImageDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use KeyValueDefaultArgs instead
     */
    export type KeyValueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = KeyValueDefaultArgs<ExtArgs>

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