
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.20.0
 * Query Engine version: 06fc58a368dc7be9fbbbe894adf8d445d208c284
 */
Prisma.prismaVersion = {
  client: "5.20.0",
  engine: "06fc58a368dc7be9fbbbe894adf8d445d208c284"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.AhsListingScalarFieldEnum = {
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

exports.Prisma.ListingScalarFieldEnum = {
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

exports.Prisma.ListScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserProfileScalarFieldEnum = {
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

exports.Prisma.ImageScalarFieldEnum = {
  id: 'id',
  url: 'url',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  status: 'status',
  userProfileId: 'userProfileId',
  listingId: 'listingId'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  clerkUserId: 'clerkUserId',
  stripeCustomerId: 'stripeCustomerId',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeyValueScalarFieldEnum = {
  key: 'key',
  value: 'value',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  AhsListing: 'AhsListing',
  Listing: 'Listing',
  List: 'List',
  UserProfile: 'UserProfile',
  Image: 'Image',
  User: 'User',
  KeyValue: 'KeyValue'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/makon/dev/apps/new-daylily-catalog/prisma/generated/sqlite-client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "/Users/makon/dev/apps/new-daylily-catalog/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../..",
  "clientVersion": "5.20.0",
  "engineVersion": "06fc58a368dc7be9fbbbe894adf8d445d208c284",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "sqlite",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "LOCAL_DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  output          = \"./generated/sqlite-client\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = env(\"LOCAL_DATABASE_URL\")\n}\n\nmodel AhsListing {\n  id          String   @id @default(cuid())\n  name        String?\n  hybridizer  String?\n  year        String?\n  scapeHeight String?\n  bloomSize   String?\n  bloomSeason String?\n  ploidy      String?\n  foliageType String?\n  bloomHabit  String?\n  seedlingNum String?\n  color       String?\n  form        String?\n  parentage   String?\n  ahsImageUrl String?\n  fragrance   String?\n  budcount    String?\n  branches    String?\n  sculpting   String?\n  foliage     String?\n  flower      String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  lilies Listing[]\n}\n\nmodel Listing {\n  id          String   @id @default(cuid())\n  userId      String\n  title       String\n  slug        String\n  price       Float?\n  description String?\n  privateNote String?\n  ahsId       String?\n  status      String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  images Image[]\n\n  ahsListing AhsListing? @relation(fields: [ahsId], references: [id])\n  lists      List[]      @relation(\"ListToListing\")\n  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, slug])\n  @@index([ahsId])\n  @@index([userId])\n  @@index([slug])\n}\n\nmodel List {\n  id          String    @id @default(cuid())\n  userId      String\n  title       String\n  description String?\n  status      String?\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  listings    Listing[] @relation(\"ListToListing\")\n  user        User      @relation(fields: [userId], references: [id])\n\n  @@index([userId])\n}\n\nmodel UserProfile {\n  id          String   @id @default(cuid())\n  userId      String   @unique\n  title       String?\n  slug        String?  @unique\n  logoUrl     String?\n  description String?\n  content     String?\n  location    String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  images Image[]\n\n  @@index([slug])\n}\n\nmodel Image {\n  id        String   @id @default(cuid())\n  url       String\n  order     Int      @default(0)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  status    String?\n\n  userProfileId String?\n  listingId     String?\n\n  userProfile UserProfile? @relation(fields: [userProfileId], references: [id])\n  listing     Listing?     @relation(fields: [listingId], references: [id])\n\n  @@index([userProfileId])\n  @@index([listingId])\n}\n\nmodel User {\n  id               String       @id @default(cuid())\n  clerkUserId      String?      @unique\n  stripeCustomerId String?      @unique\n  role             String?      @default(\"USER\")\n  createdAt        DateTime     @default(now())\n  updatedAt        DateTime     @updatedAt\n  listings         Listing[]\n  lists            List[]\n  profile          UserProfile?\n}\n\nmodel KeyValue {\n  key       String   @id\n  value     String // Will store JSON stringified values\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n",
  "inlineSchemaHash": "ad6118433fd01938e39c4534c3def5c17059e463ca956f508417d89a2760c774",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"AhsListing\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hybridizer\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"year\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scapeHeight\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bloomSize\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bloomSeason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ploidy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"foliageType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bloomHabit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"seedlingNum\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"color\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"form\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ahsImageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fragrance\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"budcount\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"branches\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sculpting\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"foliage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"flower\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lilies\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"AhsListingToListing\"}],\"dbName\":null},\"Listing\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"privateNote\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ahsId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"images\",\"kind\":\"object\",\"type\":\"Image\",\"relationName\":\"ImageToListing\"},{\"name\":\"ahsListing\",\"kind\":\"object\",\"type\":\"AhsListing\",\"relationName\":\"AhsListingToListing\"},{\"name\":\"lists\",\"kind\":\"object\",\"type\":\"List\",\"relationName\":\"ListToListing\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ListingToUser\"}],\"dbName\":null},\"List\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"listings\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"ListToListing\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ListToUser\"}],\"dbName\":null},\"UserProfile\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserProfile\"},{\"name\":\"images\",\"kind\":\"object\",\"type\":\"Image\",\"relationName\":\"ImageToUserProfile\"}],\"dbName\":null},\"Image\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"order\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userProfileId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userProfile\",\"kind\":\"object\",\"type\":\"UserProfile\",\"relationName\":\"ImageToUserProfile\"},{\"name\":\"listing\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"ImageToListing\"}],\"dbName\":null},\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"clerkUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"listings\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"ListingToUser\"},{\"name\":\"lists\",\"kind\":\"object\",\"type\":\"List\",\"relationName\":\"ListToUser\"},{\"name\":\"profile\",\"kind\":\"object\",\"type\":\"UserProfile\",\"relationName\":\"UserToUserProfile\"}],\"dbName\":null},\"KeyValue\":{\"fields\":[{\"name\":\"key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"value\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    LOCAL_DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['LOCAL_DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.LOCAL_DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

