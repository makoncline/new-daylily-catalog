## initial db and data migration

assumptions:

- local db is empty
- hosted db is empty

reset local db
USE_TURSO_DB=false npm run env:prod npx prisma migrate reset

run migrate script on local db
USE_TURSO_DB=false npm run env:prod npm run migrate

dump the local db to a file
sqlite3 prisma/db-prod.sqlite ".dump" > dump.sql

run the sql on the hosted db
turso db shell daylily-catalog < dump.sql

## keep data updated until launch by running migration script on hosted db

USE_TURSO_DB=true npm run env:prod npm run migrate

## schema changes

generate a prisma migration
npm run env:dev npm run migrate:generate

apply the prisma migration to the turso db
npm run env:dev npm run migrate:apply -- 20250130184830_init
