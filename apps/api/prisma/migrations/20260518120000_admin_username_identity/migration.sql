ALTER TABLE "Admin" ADD COLUMN "username" TEXT;

WITH normalized AS (
  SELECT
    "id",
    CASE
      WHEN lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]+', '_', 'g')) = '' THEN 'admin'
      ELSE lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]+', '_', 'g'))
    END AS base_username
  FROM "Admin"
),
ranked AS (
  SELECT
    "id",
    base_username,
    row_number() OVER (PARTITION BY base_username ORDER BY "id") AS duplicate_index
  FROM normalized
)
UPDATE "Admin"
SET "username" = CASE
  WHEN ranked.duplicate_index = 1 THEN ranked.base_username
  ELSE ranked.base_username || '_' || ranked.duplicate_index::text
END
FROM ranked
WHERE "Admin"."id" = ranked."id"
  AND "Admin"."username" IS NULL;

CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
