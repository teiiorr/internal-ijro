-- Studiyaga beriladigan vazifalar uchun: vazifani loyiha bosqichiga bog'lash.
-- Nullable + additive — mavjud vazifalar va ichki vazifa oqimiga ta'sir qilmaydi.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "stage_id" uuid;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_stage_id_project_stages_id_fk"
    FOREIGN KEY ("stage_id") REFERENCES "project_stages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
