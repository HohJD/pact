-- 0004: policies bulk-imported from NewClimate Institute's Climate Policy
-- Database (`pnpm import:cpdb`) carry data_status 'IMPORTED': real metadata,
-- unreviewed, never linked to evidence. CANDIDATE stays runtime-only.
alter table policies
  drop constraint if exists policies_data_status_check;
alter table policies
  add constraint policies_data_status_check
  check (data_status in ('CURATED', 'DEMO', 'IMPORTED'));
