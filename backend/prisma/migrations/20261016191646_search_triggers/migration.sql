-- Full-text search columns are maintained by triggers instead of GENERATED columns:
-- Prisma reads a generation expression as a column default and would keep trying to drop it.
-- Triggers are invisible to Prisma's schema diff, so migrations stay drift-free.

-- 1. Replace the generated columns with plain tsvector columns (dropping a column drops its index).
ALTER TABLE "restaurants" DROP COLUMN "searchVector";
ALTER TABLE "restaurants" ADD COLUMN "searchVector" tsvector;
ALTER TABLE "menu_items" DROP COLUMN "searchVector";
ALTER TABLE "menu_items" ADD COLUMN "searchVector" tsvector;
DROP FUNCTION IF EXISTS immutable_array_to_string(text[], text);

-- 2. Weighted documents: name (A) ranks above cuisines/category (B) and description (C).
CREATE FUNCTION restaurants_search_vector_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW."cuisines", ' '), '') || ' ' || coalesce(NEW."area", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END $$;

CREATE FUNCTION menu_items_search_vector_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."category", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END $$;

CREATE TRIGGER restaurants_search_vector_trg
  BEFORE INSERT OR UPDATE OF "name", "cuisines", "area", "description" ON "restaurants"
  FOR EACH ROW EXECUTE FUNCTION restaurants_search_vector_update();

CREATE TRIGGER menu_items_search_vector_trg
  BEFORE INSERT OR UPDATE OF "name", "category", "description" ON "menu_items"
  FOR EACH ROW EXECUTE FUNCTION menu_items_search_vector_update();

-- 3. Backfill any existing rows, then recreate the GIN indexes.
UPDATE "restaurants" SET "name" = "name";
UPDATE "menu_items" SET "name" = "name";
CREATE INDEX "restaurants_searchVector_idx" ON "restaurants" USING GIN ("searchVector");
CREATE INDEX "menu_items_searchVector_idx" ON "menu_items" USING GIN ("searchVector");
