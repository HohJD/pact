alter table jurisdictions
  drop constraint if exists jurisdictions_country_code_check;
alter table jurisdictions
  add constraint jurisdictions_country_code_check
  check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'JP', 'KR', 'CN', 'IN', 'EU'));

alter table policies
  drop constraint if exists policies_country_code_check;
alter table policies
  add constraint policies_country_code_check
  check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'JP', 'KR', 'CN', 'IN', 'EU'));

alter table time_series
  drop constraint if exists time_series_country_code_check;
alter table time_series
  add constraint time_series_country_code_check
  check (country_code in ('GB', 'DE', 'FR', 'NL', 'DK', 'NO', 'US', 'SG', 'JP', 'KR', 'CN', 'IN', 'EU'));
