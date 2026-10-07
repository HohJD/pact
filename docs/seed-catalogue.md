# PACT seed catalogue (lead-authored, authoritative)

Rules for expanding this into seed records:
- Every fact below is believed accurate from public information as of 2025. Expand wording, but DO NOT add new numbers, dates, amounts, URLs, report titles or author names that are not in this file. If a field needs content that isn't here, write it generically ("Eligibility criteria apply; see official programme guidance") and keep `data_status: CURATED`, OR mark the whole record `DEMO` if it must be illustrative.
- `source_url` / `sources[].url`: only the URLs listed here. Anything else is `null`.
- Numbers marked `~` are approximate → time-series `precision: APPROXIMATE`. Time-series marked ILLUSTRATIVE are DEMO shape only and must render with a DEMO label.
- Evidence must never be attached to a policy it doesn't actually discuss.

## Jurisdictions (id, name, lat/lng, context)
- jur_gb United Kingdom 54.0,-2.5 — gas dominant (~85% of homes gas-heated), owner-occupier ~0.64, old stock (large share pre-1945), high electricity/gas price ratio (~4), HP stock low.
- jur_de Germany 51.2,10.4 — gas ~50% / oil ~25%, owner-occupier ~0.47 (lowest in EU), ratio ~3, HP stock moderate.
- jur_fr France 46.6,2.3 — electricity already large share of heating, nuclear-backed low electricity price, owner-occupier ~0.63, ratio ~2, HP stock high (largest EU HP market by units).
- jur_nl Netherlands 52.2,5.3 — gas ~90% (Groningen field legacy), owner-occupier ~0.69, ratio ~2.5 after tax shift.
- jur_dk Denmark 56.2,9.5 — district heating ~65% of homes, owner-occupier ~0.60, ratio ~2 after 2021 electricity tax cut.
- jur_no Norway 61.0,8.5 — electric heating dominant (hydro), owner-occupier ~0.80, ratio n/a (no gas), highest HP stock per capita in Europe (~60% of households).
- jur_us United States 39.8,-98.6 — gas ~47% / electric ~40% of homes, owner-occupier ~0.65, varies by state. Sub-jurisdictions: jur_us_ny New York State (STATE, parent jur_us, 42.9,-75.5), jur_us_nyc New York City (CITY, parent jur_us_ny, 40.7,-74.0), jur_us_ca California (STATE, 36.8,-119.4), jur_us_me Maine (STATE, 45.3,-69.2), jur_us_ma Massachusetts (STATE, 42.4,-71.4).
- jur_sg Singapore 1.35,103.8 — tropical; cooling not heating dominates building energy; ~80% public housing (HDB); high-rise stock.
- Add: jur_eu European Union (SUPRANATIONAL, 50.8,4.4) for EPBD; jur_gb_oxford Oxford (CITY, parent jur_gb, 51.75,-1.26) — used only as a policy-transfer target, no policies.

- Asia expansion (lead-authored 2026-10; context kept qualitative — no new numeric context fields except those given):
  - jur_jp Japan 36.2,138.3 — space heating commonly via room air-conditioners (air-to-air heat pumps), kerosene and gas; heat-pump water heaters (EcoCute) widespread; owner-occupier ~0.61. Sub-jurisdiction: jur_jp_tokyo Tokyo (CITY, parent jur_jp, 35.68,139.69).
  - jur_kr South Korea 36.5,127.9 — dense apartment stock; floor heating (ondol) mostly gas-fired; district heating in new towns.
  - jur_cn China 35.9,104.2 — northern China: coal-fired district heating in cities, coal stoves historically in rural homes; southern China: no central heating, room air-conditioners; world's largest heat-pump manufacturer and market.
  - jur_in India 22.0,79.0 — cooling, not heating, dominates building energy growth; rapidly rising room air-conditioner ownership.

## Technologies
tech_heat_pump Heat pumps (air- and ground-source, incl. hybrids) · tech_insulation Insulation & fabric retrofit · tech_district_heating District heating · tech_efficient_appliances Efficient appliances & cooling · tech_solar_thermal Solar thermal · tech_smart_controls Smart controls & metering · tech_whole_house_retrofit Deep / whole-house retrofit · tech_green_building Green building design (new build)

## Mechanisms (id → kind)
mech_grant GRANT · mech_tax_credit TAX_CREDIT · mech_loan LOAN · mech_obligation OBLIGATION · mech_standard STANDARD · mech_ban BAN · mech_carbon_price CARBON_PRICE · mech_information INFORMATION · mech_direct_investment DIRECT_INVESTMENT · mech_target TARGET · mech_loan_guarantee LOAN_GUARANTEE

## Metrics
metric_hp_sales (annual heat-pump sales, units) · metric_hp_installs_certified (certified installations, units) · metric_grants_issued (grants/vouchers paid, count) · metric_retrofits (homes retrofitted, count) · metric_energy_consumption (household energy consumption, index/%) · metric_emissions (building sector emissions, MtCO2e) · metric_gas_boiler_sales (units) · metric_public_spend (programme spend, local currency m) · metric_energy_label (share of stock at label C or better, %) · metric_green_mark_share (share of GFA Green Mark certified, %)

## Policies (≈60). Format: id | name | status | introduced(–ended) | sector | tech | mechanisms | targets | incentive/design facts | data_status
### United Kingdom
1. pol_gb_bus | Boiler Upgrade Scheme (BUS) | ACTIVE | 2022-05 | RES | HP | grant | owner-occupiers, small landlords, England & Wales | Grant £5,000 for ASHP at launch, raised to £7,500 from Oct 2023 (GSHP also £7,500). Paid via installer (MCS-certified). Budget ~£450m over 2022–25, later extended. Source: https://www.gov.uk/apply-boiler-upgrade-scheme | CURATED
2. pol_gb_eco4 | Energy Company Obligation 4 (ECO4) | ACTIVE | 2022-04–2026-03 | RES | insulation, HP, whole-house | obligation | low-income & fuel-poor households | Supplier obligation; ~£1bn/yr; whole-house fabric-first; successor to ECO1–3 (2013–2022). Source: https://www.ofgem.gov.uk/environmental-and-social-schemes/energy-company-obligation-eco | CURATED
3. pol_gb_gbis | Great British Insulation Scheme | ACTIVE | 2023 | RES | insulation | obligation | lower council-tax bands, EPC D–G | Single-measure insulation; ~£1bn to 2026. | CURATED
4. pol_gb_ggg | Green Homes Grant Voucher Scheme | CLOSED | 2020-09–2021-03 | RES | insulation, HP | grant | owner-occupiers, landlords | Vouchers up to £5,000 (£10,000 low-income) covering 2/3 of cost; closed early after delivery problems; ~47,500 homes improved vs 600,000 target (NAO). | CURATED
5. pol_gb_shdf | Social Housing Decarbonisation Fund / Warm Homes: Social Housing Fund | ACTIVE | 2021 | RES | insulation, HP, whole-house | direct_investment, grant | social landlords | Competitive grant waves to social landlords to reach EPC C; £3.8bn manifesto commitment. | CURATED
6. pol_gb_hug | Home Upgrade Grant | CLOSED | 2021–2025 | RES | insulation, HP | grant | low-income off-gas-grid homes | Local authority delivered. | CURATED
7. pol_gb_chmm | Clean Heat Market Mechanism | ACTIVE | 2025-04 | RES | HP | obligation | boiler manufacturers | Boiler makers must achieve HP sales equal to a % of boiler sales (6% in year 1) or pay £500/missed unit (originally £3,000, reduced); start delayed from 2024 to 2025. | CURATED
8. pol_gb_mees | Minimum Energy Efficiency Standards (private rented sector) | ACTIVE | 2018-04 | RES | insulation | standard | private landlords | Minimum EPC E to let (2018 new, 2020 all tenancies); proposals to raise to C by 2030. | CURATED
9. pol_gb_fhs | Future Homes Standard | ANNOUNCED | 2025 (consulted 2023–24) | RES | HP, green_building | standard | new build | New homes to be "zero-carbon ready"; in practice no new gas boilers; 2025 target. | CURATED
10. pol_gb_hp_target | 600,000 heat pumps per year by 2028 target | ACTIVE | 2020-11 (Ten Point Plan) | RES | HP | target | national | Target in PM's Ten Point Plan and Heat & Buildings Strategy 2021. | CURATED
11. pol_gb_warm_homes_plan | Warm Homes Plan | ANNOUNCED | 2024 | RES | insulation, HP | grant, loan | households | £13.2bn commitment announced in 2024/25 budget cycle; grants and low-interest loans; details at 2025 Spending Review. | CURATED
12. pol_gb_rhi_domestic | Domestic Renewable Heat Incentive | CLOSED | 2014-04–2022-03 | RES | HP, solar_thermal | grant (tariff) | owner-occupiers | Quarterly payments per kWh renewable heat over 7 years; replaced by BUS. Source: https://www.ofgem.gov.uk/environmental-and-social-schemes/domestic-renewable-heat-incentive-domestic-rhi | CURATED
13. pol_gb_heat_networks | Green Heat Network Fund | ACTIVE | 2022 | ALL | district_heating | direct_investment | network developers | £288m capital fund. | CURATED

### Germany
14. pol_de_beg | Bundesförderung für effiziente Gebäude (BEG) | ACTIVE | 2021-01 | ALL | HP, insulation, whole-house | grant, loan | owners, landlords, municipalities | Unified successor to KfW/BAFA programmes (incl. MAP). Heat-pump grant: 2021–22 up to 35% (+10% oil-boiler replacement bonus, max 50% in 2022 before Aug-2022 reform cut to 40%). Delivered by BAFA (single measures) and KfW (whole building). | CURATED
15. pol_de_beg_em_2024 | BEG Heizungsförderung 2024 (KfW 458) | ACTIVE | 2024-01 (applications from Feb 2024) | RES | HP | grant, loan | owner-occupiers first, landlords from mid-2024 | 30% base + 20% speed bonus (declining) + 30% income bonus (household income ≤€40k) + 5% efficiency bonus; capped at 70% of max €30,000 eligible cost (first unit). Low-interest supplementary loan. | CURATED
16. pol_de_geg_2024 | Gebäudeenergiegesetz 2024 amendment ("Heizungsgesetz") | ACTIVE | 2024-01 | ALL | HP, district_heating | standard, ban (phased) | all new heating systems | New heating systems must run on 65% renewable energy — immediately in new-build areas, elsewhere tied to municipal heat planning (2026/2028). Passed Sept 2023 after a heated public debate that depressed HP demand and drove record gas-boiler purchases in 2023. | CURATED
17. pol_de_map | Marktanreizprogramm (MAP) | SUPERSEDED | 1999–2020 | RES | HP, solar_thermal, biomass | grant | owners | Renewable heat grants via BAFA; evaluated repeatedly; merged into BEG 2021. | CURATED
18. pol_de_kfw_effizienzhaus | KfW Energieeffizient Sanieren / Effizienzhaus | SUPERSEDED | 2006(–2020) | RES | whole-house, insulation | loan, grant | owners | Low-interest loans with repayment bonuses tied to Effizienzhaus standards; merged into BEG. | CURATED
19. pol_de_behg | Brennstoffemissionshandelsgesetz (national CO2 price on heating fuels) | ACTIVE | 2021-01 | ALL | — | carbon_price | fuel suppliers | €25/t 2021, €30 2022, (freeze 2023) €45 2024, €55 2025; transitions to EU ETS2 2027. | CURATED
20. pol_de_waermeplanung | Wärmeplanungsgesetz (municipal heat planning) | ACTIVE | 2024-01 | ALL | district_heating, HP | standard | municipalities | Large cities plan by mid-2026, others by mid-2028. | CURATED
21. pol_de_energieberatung | Bundesförderung Energieberatung für Wohngebäude | ACTIVE | 2020 | RES | — | information, grant | owners | Subsidised energy advice / individual renovation roadmap (iSFP) with 5% bonus on later BEG measures (bonus removed 2024). | CURATED

### France
22. pol_fr_maprimerenov | MaPrimeRénov' | ACTIVE | 2020-01 | RES | HP, insulation, whole-house | grant | owner-occupiers (all incomes from 2021), landlords | Income-banded grants (Bleu/Jaune/Violet/Rose); ANAH delivered; replaced CITE tax credit; ~€2–4bn/yr; 2024 reform pushed "rénovation d'ampleur" (Parcours accompagné). Source: https://www.maprimerenov.gouv.fr | CURATED
23. pol_fr_cee | Certificats d'économies d'énergie (CEE) | ACTIVE | 2006 | ALL | HP, insulation | obligation | energy suppliers ("obligés") | White-certificate scheme in multi-year periods (P5 2022–2025); funds "Coup de pouce" bonuses. | CURATED
24. pol_fr_coup_de_pouce_chauffage | Coup de pouce Chauffage | ACTIVE | 2019 | RES | HP | grant (via CEE) | households replacing fossil boilers | Bonus for replacing oil/gas/coal boilers with HP etc; funded by CEE. | CURATED
25. pol_fr_eco_ptz | Éco-prêt à taux zéro (éco-PTZ) | ACTIVE | 2009 | RES | insulation, HP | loan | owners | 0% loan up to €50,000 (since 2022) for energy renovation; combinable with MaPrimeRénov'. | CURATED
26. pol_fr_cite | Crédit d'impôt pour la transition énergétique (CITE) | SUPERSEDED | 2014–2020 | RES | HP, insulation | tax_credit | owner-occupiers | 30% tax credit; replaced by MaPrimeRénov'. | CURATED
27. pol_fr_re2020 | RE2020 (Réglementation environnementale) | ACTIVE | 2022-01 | RES | HP, green_building | standard | new build | Carbon threshold effectively excludes gas-only heating in new single-family homes from 2022 (collective housing 2025). | CURATED
28. pol_fr_loi_climat_dpe | Loi Climat et Résilience — rental ban for G/F labels | ACTIVE | 2021 (G from 2025, F 2028, E 2034) | RES | insulation | standard, ban | landlords | Progressive ban on letting "passoires thermiques". | CURATED
29. pol_fr_fonds_chaleur | Fonds Chaleur (ADEME) | ACTIVE | 2009 | ALL | district_heating, HP (large), solar_thermal | grant, direct_investment | collective/industrial | ADEME fund for renewable heat; ~€800m/yr by 2024. | CURATED
30. pol_fr_mon_accompagnateur | Mon Accompagnateur Rénov' | ACTIVE | 2023 | RES | whole-house | information | households doing deep retrofit | Mandatory accredited advisor for large MaPrimeRénov' projects. | CURATED

### Netherlands
31. pol_nl_isde | ISDE (Investeringssubsidie duurzame energie en energiebesparing) | ACTIVE | 2016 | RES | HP, insulation, solar_thermal | grant | owner-occupiers, VvEs | ~30% grant for HP/insulation (raised 2022); RVO delivered. Source: https://www.rvo.nl/subsidies-financiering/isde | CURATED
32. pol_nl_warmtefonds | Nationaal Warmtefonds | ACTIVE | 2020 | RES | insulation, HP | loan | owner-occupiers incl. low-income (0% loans) | Energiebespaarlening; 0% for incomes below ~€60k since 2023. | CURATED
33. pol_nl_gasloos_nieuwbouw | Gas connection ban for new build (Wet VET) | ACTIVE | 2018-07 | RES | HP, district_heating | ban | new build | Grid operators no longer obliged/allowed to connect new homes to gas. | CURATED
34. pol_nl_hybrid_norm | Hybrid heat-pump standard for boiler replacement (planned 2026) | PAUSED | announced 2022 for 2026 | RES | HP | standard | existing homes replacing boiler | Would require at least hybrid HP at boiler replacement from 2026; scrapped/paused by 2024 coalition agreement. | CURATED
35. pol_nl_paw | Programma Aardgasvrije Wijken | CLOSED | 2018–2024 | RES | district_heating, HP, insulation | direct_investment | municipalities / neighbourhoods | 66 pilot neighbourhoods; Algemene Rekenkamer criticised slow progress. | CURATED
36. pol_nl_label_c_kantoren | Energy label C obligation for offices | ACTIVE | 2023-01 | COMM | insulation, smart_controls | standard | office owners | Offices ≥100m² must have label C or better. | CURATED
37. pol_nl_energiebelasting | Energy tax shift gas→electricity | ACTIVE | 2020 | ALL | — | carbon_price | all consumers | Stepwise increases of gas tax and reductions of electricity tax to improve HP economics. | CURATED
38. pol_nl_nip | Nationaal Isolatieprogramma | ACTIVE | 2022 | RES | insulation | grant, direct_investment | low-energy-label homes, low-income | Target 2.5m homes insulated by 2030; ~€4bn. | CURATED

### Denmark
39. pol_dk_oil_ban_new | Ban on oil & gas boilers in new buildings | ACTIVE | 2013 | RES | HP, district_heating | ban | new build | Oil/gas boilers banned in new build from 2013; oil boilers banned in existing buildings in DH/gas areas from 2016. | CURATED
40. pol_dk_bygningspulje | Bygningspuljen | ACTIVE | 2020 | RES | HP, insulation | grant | owner-occupiers | Grant pool for energy renovation incl. HP replacing oil/gas; part of 2020 Climate Agreement. | CURATED
41. pol_dk_skrotningsordning | Skrotningsordningen (oil-boiler scrappage for HP-as-a-service) | ACTIVE | 2020 | RES | HP | grant | households with oil/gas boilers | Subsidy to energy-service companies offering heat-pump subscriptions. | CURATED
42. pol_dk_el_afgift | Electricity tax reduction for heating | ACTIVE | 2021 | RES | HP | carbon_price (tax reform) | households | Electricity tax on heating cut sharply (to near EU minimum) in 2021 green tax reform. | CURATED
43. pol_dk_afkobling | Afkoblingsordningen (gas disconnection scheme) | ACTIVE | 2021 | RES | HP, district_heating | grant | gas-heated households | Pays the fee to disconnect from the gas grid. | CURATED
44. pol_dk_dh_expansion | District heating roll-out & 2035 gas phase-out plan | ACTIVE | 2022 | RES | district_heating | target, direct_investment | municipalities | "Danmark kan mere II" (2022): 2035 end of gas for heating; municipalities to notify households of DH plans by end-2022. | CURATED
45. pol_dk_building_regs | BR18 energy requirements | ACTIVE | 2018 | ALL | green_building, insulation | standard | new build | Danish building regulations with low-energy classes. | CURATED

### Norway
46. pol_no_oil_ban | Ban on fossil oil for heating in buildings | ACTIVE | 2020-01 | ALL | HP | ban | all buildings | Oil-heating ban adopted 2017, effective 2020; preceded by Enova scrappage support. | CURATED
47. pol_no_enova_hp | Enova household support (heat pumps & efficiency) | ACTIVE | 2015 (Enovatilskuddet) | RES | HP, insulation, smart_controls | grant | households | Rights-based rebates for liquid-to-water / GSHP etc.; air-to-air HP support ended earlier as market matured. Source: https://www.enova.no | CURATED
48. pol_no_tek17 | TEK17 building regulations | ACTIVE | 2017 | ALL | green_building | standard | new build | Energy requirements; fossil fuel heating not permitted in new build. | CURATED
49. pol_no_enova_scrappage | Enova oil-boiler scrappage grant | CLOSED | 2016–2019 | RES | HP | grant | households | Scrappage support ahead of 2020 oil ban. | CURATED

### United States
50. pol_us_25c | Energy Efficient Home Improvement Credit (IRC §25C, IRA) | ACTIVE | 2023-01 | RES | HP, insulation | tax_credit | homeowners | 30% credit; $2,000/yr cap for heat pumps, $1,200 for envelope; from Inflation Reduction Act 2022. Source: https://www.irs.gov/credits-deductions/energy-efficient-home-improvement-credit | CURATED
51. pol_us_heehra | Home Electrification and Appliance Rebates (HEEHRA / HEAR) | ACTIVE | 2024 (state roll-out) | RES | HP | grant | low- and moderate-income households | Up to $8,000 for heat pump, $14,000 total; $4.5bn; administered by states. | CURATED
52. pol_us_homes | Home Efficiency Rebates (HOMES) | ACTIVE | 2024 | RES | whole-house, insulation | grant | all households (higher for LMI) | Performance-based rebates for modelled/measured savings; $4.3bn. | CURATED
53. pol_us_wap | Weatherization Assistance Program | ACTIVE | 1976 | RES | insulation | direct_investment, grant | low-income households | DOE programme via states & local agencies; ~7m homes to date; $3.5bn boost from 2021 IIJA. Source: https://www.energy.gov/scep/wap/weatherization-assistance-program | CURATED
54. pol_us_nyc_ll97 | NYC Local Law 97 | ACTIVE | 2019 (limits from 2024) | ALL | whole-house, HP | standard (BPS), carbon_price-like penalty | buildings >25,000 sq ft | Emissions caps per building type tightening 2024→2030, $268/tCO2e penalty. | CURATED
55. pol_us_ny_all_electric | New York All-Electric Buildings Act | ANNOUNCED | 2023 (new build ≤7 storeys from 2026) | RES | HP | ban | new build | Statewide prohibition of fossil-fuel equipment in new construction (phased 2026/2029); legally challenged. | CURATED
56. pol_us_ca_title24_2022 | California Title 24 2022 Energy Code (heat-pump baseline) | ACTIVE | 2023-01 | RES | HP | standard | new build | Heat pumps set as prescriptive baseline for space or water heating in new homes. | CURATED
57. pol_us_me_hp_target | Maine 100,000 heat pumps by 2025 target + Efficiency Maine rebates | ACTIVE | 2019 | RES | HP | target, grant | households | Target met in 2023, two years early; new target 175,000 more by 2027. | CURATED
58. pol_us_masssave | Mass Save (Massachusetts) | ACTIVE | 2008 | RES | HP, insulation | obligation (utility), grant | households | Utility-funded efficiency programme; HP rebates up to $10,000 whole-home (2022+). | CURATED

### Singapore
59. pol_sg_green_mark | BCA Green Mark Scheme | ACTIVE | 2005 | ALL | green_building, efficient_appliances | information (certification), standard (mandatory for new build ≥ thresholds since 2008) | developers, owners | Rating scheme; legislated minimum standard for new and retrofitted buildings via Building Control Act. Source: https://www1.bca.gov.sg/buildsg/sustainability/green-mark-certification-scheme | CURATED
60. pol_sg_gbmp_2030 | Singapore Green Building Masterplan "80-80-80 in 2030" | ACTIVE | 2021 | ALL | green_building, efficient_appliances | target | national | 80% of buildings green by GFA, 80% of new developments Super Low Energy, 80% improvement in energy efficiency for best-in-class by 2030. | CURATED
61. pol_sg_gmis_eb | Green Mark Incentive Scheme for Existing Buildings 2.0 | ACTIVE | 2022 | COMM | efficient_appliances, smart_controls | grant | owners of existing buildings | Co-funds retrofit to higher Green Mark tiers; S$63m. | CURATED
62. pol_sg_meps_ac | Minimum Energy Performance Standards & Mandatory Energy Labelling (air-conditioners) | ACTIVE | 2008 (labels) / 2011 (MEPS) | RES | efficient_appliances | standard, information | consumers | NEA; tightened several times. | CURATED
62b. pol_sg_mandatory_audit | Periodic Energy Audits & Minimum Standards for existing buildings (Building Control Act, 2013 amendments; Mandatory Energy Improvement regime announced 2024) | ACTIVE | 2013 | COMM | efficient_appliances | standard | owners of large buildings | Cooling-system audits every 3 years; 2024 announcement: worst-performing buildings must improve by 10%. | CURATED

### Japan
61. pol_jp_top_runner | Top Runner Program | ACTIVE | 1999-04 | ALL | efficient_appliances | standard | appliance manufacturers & importers | Efficiency targets set at the level of the best-performing product on the market at the time, under the Energy Conservation Act (amended 1998); covers room air-conditioners and many other appliances; publisher METI / ANRE. | CURATED
62. pol_jp_bee_act | Building Energy Efficiency Act — mandatory compliance for new buildings | ACTIVE | 2017-04 | ALL | green_building, insulation | standard | new build | Act on the Improvement of Energy Consumption Performance of Buildings passed 2015; compliance with energy standards mandatory for large non-residential new buildings from April 2017, extended to all new buildings including houses from April 2025; publisher MLIT. | CURATED
63. pol_jp_zeh | Net Zero Energy House (ZEH) promotion & subsidies | ACTIVE | 2015-12 | RES | green_building, insulation, heat_pump, smart_controls | grant, target | new detached houses | ZEH Roadmap (Dec 2015) followed by national ZEH subsidies; government goal that new houses reach ZEH-level performance on average by 2030; publisher METI / MOE. | CURATED
### Tokyo
64. pol_jp_tokyo_cap_trade | Tokyo Cap-and-Trade Program | ACTIVE | 2010-04 | COMM | efficient_appliances, smart_controls | carbon_price, obligation | large facilities using ≥1,500 kL crude-oil-equivalent energy per year | World's first urban cap-and-trade; mandatory emission reduction obligations for large commercial buildings and factories over multi-year compliance periods, with trading of excess reductions; publisher Tokyo Metropolitan Government. | CURATED
65. pol_jp_tokyo_solar_mandate | Tokyo solar requirement for new buildings | ACTIVE | 2025-04 | RES | green_building | standard | large housing suppliers (≥20,000 m² new floor area per year) | Ordinance passed Dec 2022; requires major housebuilders to install solar PV on new small buildings including detached houses; publisher Tokyo Metropolitan Government. | CURATED
### South Korea
66. pol_kr_zeb | Zero Energy Building (ZEB) mandatory certification | ACTIVE | 2020-01 | ALL | green_building, smart_controls | standard | new public buildings ≥1,000 m² (from 2020); private buildings ≥1,000 m² and apartment complexes ≥30 units (from 2025) | ZEB certification with grades 1–5 introduced 2017; phased mandate starting with public buildings; publisher MOLIT. | CURATED
67. pol_kr_ets | Korea Emissions Trading Scheme (K-ETS) | ACTIVE | 2015-01 | ALL | — | carbon_price | large emitters across sectors, incl. large buildings | East Asia's first nationwide emissions trading scheme; publisher Ministry of Environment. | CURATED
68. pol_kr_green_remodeling | Public-building Green Remodeling (Korean New Deal) | ACTIVE | 2020 | PUBLIC | insulation, whole_house_retrofit, green_building | direct_investment | ageing public buildings such as daycare centres and public health centres | Energy retrofits of older public buildings scaled up under the 2020 Korean (Green) New Deal; publisher MOLIT. | CURATED
### China
69. pol_cn_clean_winter_heating | Clean Winter Heating Plan for Northern China (2017–2021) | CLOSED | 2017-12–2021 | RES | heat_pump, district_heating | direct_investment, grant, ban | households in northern China, priority "2+26" cities around Beijing–Tianjin–Hebei | Coal-to-gas and coal-to-electricity conversion (incl. air-source heat pumps) with central and local subsidies, alongside restrictions on scattered coal use in designated areas; issued by NDRC with other ministries. | CURATED
70. pol_cn_gb55015 | GB 55015-2021 General Code for Building Energy Efficiency and Renewable Energy Application | ACTIVE | 2022-04 | ALL | green_building, insulation | standard | new build and renovation projects | Fully mandatory national code effective 1 April 2022; requires renewable-energy assessment and building carbon-emission calculation at design stage; publisher MOHURD. | CURATED
71. pol_cn_energy_label | China Energy Label | ACTIVE | 2005-03 | ALL | efficient_appliances | information, standard | appliance manufacturers & importers | Mandatory graded energy-efficiency labels, launched March 2005 with refrigerators and room air-conditioners, later extended to many product groups; publisher NDRC / SAMR. | CURATED
72. pol_cn_14fyp_buildings | 14th Five-Year Plan for Building Energy Efficiency and Green Building Development | ACTIVE | 2022-03 | ALL | green_building, insulation, heat_pump | target | national | Issued by MOHURD; by 2025 all new urban buildings to be built to green building standards, with expanded retrofits of existing buildings and growth of ultra-low/near-zero energy buildings. | CURATED
### India
73. pol_in_ecbc | Energy Conservation Building Code (ECBC) | ACTIVE | 2007-05 | COMM | green_building, efficient_appliances | standard | commercial buildings with connected load ≥100 kW | Launched by the Bureau of Energy Efficiency (BEE) in 2007, updated 2017; made mandatory through notification by individual states. | CURATED
74. pol_in_eco_niwas | Eco Niwas Samhita (ECBC-Residential) | ACTIVE | 2018-12 | RES | green_building, insulation | standard | residential buildings | Residential envelope code to limit heat gain and improve thermal comfort; launched by BEE in December 2018; adoption via states. | CURATED
75. pol_in_star_labelling | BEE Standards & Labelling Programme (star labels) | ACTIVE | 2006-05 | ALL | efficient_appliances | information, standard | appliance manufacturers | Star-rating labels launched 2006; mandatory for room air-conditioners, frost-free refrigerators and some other products from January 2010; publisher BEE. | CURATED
76. pol_in_icap | India Cooling Action Plan (ICAP) | ACTIVE | 2019-03 | ALL | efficient_appliances, green_building | target | national | 20-year plan (2017-18 to 2037-38) targeting a 20–25% cut in cooling demand, 25–30% in refrigerant demand and 25–40% in cooling energy requirements by 2037-38; publisher MoEFCC. | CURATED
Asia rules: no evidence, outcomes or time-series records for these 16 policies (none curated yet → product shows "insufficient evidence"). All `sources[].url` null.

### EU (context)
63. pol_eu_epbd_2024 | Energy Performance of Buildings Directive recast (EPBD 2024) | ACTIVE | 2024-05 | ALL | HP, insulation | standard, target | member states | Zero-emission new buildings from 2030 (public 2028); phase-out of fossil boiler subsidies from 2025; MEPS for non-residential. | CURATED

## Evidence (real, verifiable publications — content limited to what is stated here)
E1 ev_nao_home_heating_2024 | "Decarbonising home heating" | National Audit Office (UK) | 2024-03 | GOVERNMENT_EVALUATION | DESCRIPTIVE | HIGH | GB | policies: bus, hp_target, chmm | url: https://www.nao.org.uk/reports/decarbonising-home-heating/ | Findings: BUS uptake well below forecast in its first years (around half of expected grants); DESNZ's 600,000/yr by 2028 ambition at serious risk; consumer awareness and upfront cost barriers; recommends clearer long-term plan. Limitations: audit of delivery, not causal impact.
E2 ev_desnz_bus_stats | "Boiler Upgrade Scheme statistics" (monthly official statistics series) | DESNZ (UK) | 2022–2025 (ongoing) | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | GB | bus | url: https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics | Findings: monthly applications rose markedly after the grant increased to £7,500 in Oct 2023 (applications roughly doubled vs prior months); the vast majority of vouchers are ASHP. Limitations: administrative counts; no counterfactual.
E3 ev_nao_ghg_2021 | "Green Homes Grant Voucher Scheme" | National Audit Office (UK) | 2021-09 | GOVERNMENT_EVALUATION | DESCRIPTIVE | HIGH | GB | ggg | url: https://www.nao.org.uk/reports/green-homes-grant/ | Findings: scheme rushed (12-week design), ~47,500 homes improved vs 600,000 ambition; installer frustration, voucher delays; scheme closed after 6 months. Limitations: process evaluation.
E4 ev_ccc_progress_2024 | "Progress in reducing emissions — 2024 Report to Parliament" | Climate Change Committee (UK) | 2024-07 | INSTITUTIONAL_REPORT | DESCRIPTIVE | HIGH | GB | bus, hp_target, chmm, mees | url: https://www.theccc.org.uk/publication/progress-in-reducing-emissions-2024-report-to-parliament/ | Findings: UK HP installations far below required trajectory (roughly a tenth of 2028 target rate); grant uplift helped; recommends removing policy costs from electricity prices, confirming CHMM. Limitations: progress monitoring.
E5 ev_bwp_sales | "Absatzzahlen Wärmepumpen" (annual heat-pump sales statistics) | Bundesverband Wärmepumpe (BWP) with BDH | 2015–2025 | INDUSTRY_REPORT | DESCRIPTIVE | HIGH | DE | beg, beg_em_2024, geg_2024, map | url: https://www.waermepumpe.de | Findings: 2021 154,000; 2022 236,000 (+53%); 2023 356,000 record (+51%); 2024 193,000 (−46%). Limitations: industry-reported sales, not installations; no attribution.
E6 ev_bdh_2023 | Heating market statistics 2023 | BDH (German heating industry association) | 2024-02 | INDUSTRY_REPORT | DESCRIPTIVE | MEDIUM | DE | geg_2024 | url null | Findings: 2023 total heating appliance market ~1.3m units (+34%), with gas boilers ~790,000 (+32%) — a record driven by anticipatory purchases during the GEG debate. Limitations: industry stats.
E7 ev_map_evaluation | "Evaluation des Marktanreizprogramms zur Förderung von Maßnahmen zur Nutzung erneuerbarer Energien im Wärmemarkt" (series) | Fraunhofer ISI et al. for BMWi | 2010s (series, latest covering 2019/2020) | GOVERNMENT_EVALUATION | CORRELATIONAL | MEDIUM | DE | map | url null | Findings: MAP triggered substantial renewable heat investment; estimated leverage of several euros private investment per euro grant; free-rider effects noted. Limitations: free-ridership estimated via surveys.
E8 ev_agora_waermewende | "Wärmewende" analyses on heat-pump ramp-up and GEG | Agora Energiewende | 2023–2024 | INSTITUTIONAL_REPORT | DESCRIPTIVE | MEDIUM | DE | geg_2024, beg_em_2024, behg | url: https://www.agora-energiewende.de | Findings: policy uncertainty in 2023 depressed demand; combination of regulation (GEG), subsidy (BEG) and carbon price (BEHG) needed; electricity-gas price ratio key. Limitations: think-tank analysis.
E9 ev_iea_future_hp_2022 | "The Future of Heat Pumps" | International Energy Agency | 2022-11 | INSTITUTIONAL_REPORT | DESCRIPTIVE | HIGH | GB,DE,FR,NL,DK,NO,US | bus, beg, maprimerenov, isde, enova_hp, oil_ban, 25c | url: https://www.iea.org/reports/the-future-of-heat-pumps | Findings: global HP sales grew ~13% in 2021, Europe ~35%; Norway highest penetration (~60% of households); upfront cost and electricity/gas price ratio are the central barriers; subsidies plus regulation used by leading markets. Limitations: global synthesis.
E10 ev_ehpa_market | "European Heat Pump Market and Statistics Report" (annual) | European Heat Pump Association (EHPA) | 2023–2025 | INDUSTRY_REPORT | DESCRIPTIVE | HIGH | GB,DE,FR,NL,DK,NO | beg, maprimerenov, isde, bus | url: https://www.ehpa.org | Findings: ~3m units sold in Europe in 2022 (+~38%); sales fell ~5% in 2023 and ~23% in 2024 as subsidies were cut/uncertain and gas prices fell; France largest market by units; Norway, Finland, Sweden highest per-capita. Limitations: industry-reported.
E11 ev_rosenow_2022 | "Heating up the global heat pump market" | Nature Energy (Rosenow, Gibb, Nowak, Lowes) | 2022 | ACADEMIC_STUDY | DESCRIPTIVE | HIGH | GB,DE,FR,NL,DK,NO,US | bus, beg, maprimerenov, oil_ban, hp_target | url: https://www.nature.com/articles/s41560-022-01104-8 | Findings: markets with high HP uptake combine financial incentives, fossil-heating restrictions and favourable electricity-gas price ratios; policy stability matters. Limitations: comparative/descriptive.
E12 ev_fowlie_wap_2018 | "Do Energy Efficiency Investments Deliver? Evidence from the Weatherization Assistance Program" | Quarterly Journal of Economics (Fowlie, Greenstone, Wolfram) | 2018 | ACADEMIC_STUDY | EXPERIMENTAL | HIGH | US | wap | url: https://doi.org/10.1093/qje/qjx027 | Findings: randomised encouragement design in Michigan; realised energy savings ~10–20% vs modelled ~2.5× higher; upfront cost ~ $5,000 exceeded energy savings value; no significant rebound. Limitations: single state, low-income sample, ~2010–11.
E13 ev_ornl_wap_2015 | "Weatherization Assistance Program National Evaluation" (retrospective, ARRA period) | Oak Ridge National Laboratory for US DOE | 2015 | GOVERNMENT_EVALUATION | QUASI_EXPERIMENTAL | HIGH | US | wap | url: https://weatherization.ornl.gov | Findings: average savings ~ 18% of gas use in single-family homes; cost-effective when non-energy benefits included. Limitations: billing analysis with comparison groups.
E14 ev_christensen_wap_2021 | "Decomposing the Wedge between Projected and Realized Returns in Energy Efficiency Programs" | Christensen, Francisco, Myers, Souza (NBER / Review of Economics & Statistics) | 2021 | ACADEMIC_STUDY | QUASI_EXPERIMENTAL | MEDIUM | US | wap | url null | Findings: large share of performance gap attributable to contractor quality and workmanship rather than household behaviour. Limitations: Illinois sample.
E15 ev_irs_25c_2023 | IRA residential clean energy & efficiency credit statistics, tax year 2023 | US Treasury / IRS | 2024-08 | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | US | 25c | url null | Findings: over 2.3 million households claimed §25C in TY2023 (~$2bn), ~267,000 for heat pumps. Limitations: claims data; no counterfactual.
E16 ev_efficiency_maine_2023 | Efficiency Maine heat pump milestone announcement & annual reports | Efficiency Maine Trust / Governor's Office | 2023-07 | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | US | me_hp_target | url null | Findings: 100,000-heat-pump target (set 2019 for 2025) reached in 2023, two years early; rebates plus high heating-oil prices and installer network cited. Limitations: administrative milestone.
E17 ev_cour_des_comptes_mpr | "La rénovation énergétique des bâtiments" / observations on MaPrimeRénov' | Cour des comptes (France) | 2024 | GOVERNMENT_EVALUATION | DESCRIPTIVE | MEDIUM | FR | maprimerenov, cee | url null | Findings: high volume of single-measure grants (esp. HP) but few deep renovations; fraud risks; weak outcome monitoring. Limitations: audit; no causal estimate.
E18 ev_anah_mpr_stats | MaPrimeRénov' annual results (ANAH) | ANAH | 2021–2024 | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | FR | maprimerenov | url null | Findings: ~644,000 grants in 2021, ~670,000 in 2022, ~570,000 in 2023; ~€2.6bn committed in 2022; heat pumps a leading measure. Limitations: administrative counts.
E19 ev_uniclima_fr | French HVAC market statistics (air-to-water heat pumps) | Uniclima / AFPAC | annual | INDUSTRY_REPORT | DESCRIPTIVE | MEDIUM | FR | maprimerenov, coup_de_pouce_chauffage, re2020 | url null | Findings: air-to-water HP sales grew strongly 2019–2022 to a record (~350,000 in 2022) then declined in 2023–24. Limitations: industry data.
E20 ev_cbs_nl_hp | Heat pump statistics (Hernieuwbare energie; warmtepompen) | CBS Statistics Netherlands / RVO | annual | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | NL | isde, gasloos_nieuwbouw, energiebelasting | url: https://www.cbs.nl | Findings: installed HP stock in homes rose rapidly after 2018; annual sales ~160,000 in 2023 (record). Limitations: counts.
E21 ev_rekenkamer_paw | "Aardgasvrije wijken" | Algemene Rekenkamer (Netherlands Court of Audit) | 2020 | GOVERNMENT_EVALUATION | DESCRIPTIVE | HIGH | NL | paw | url null | Findings: pilot neighbourhoods far behind target; costs per home high; unclear learning objectives. Limitations: audit.
E22 ev_dea_dk_stats | Danish Energy Agency energy statistics & heat pump data | Energistyrelsen | annual | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | DK | oil_ban_new, bygningspulje, el_afgift, afkobling | url: https://ens.dk | Findings: number of oil boilers fell steadily; HP installations accelerated after 2020–21 incentives and gas price shock; district heating connections surged 2022. Limitations: counts.
E23 ev_ssb_no | Norway dwelling heating statistics | Statistics Norway (SSB) / NOVAP | annual | OFFICIAL_STATISTICS | DESCRIPTIVE | HIGH | NO | oil_ban, enova_hp | url: https://www.ssb.no | Findings: oil heating almost eliminated by 2020; HP in majority of detached homes; ~100,000+ HP sold annually (mostly air-to-air). Limitations: counts.
E24 ev_urban_green_ll97 | Local Law 97 analyses | Urban Green Council (NYC) | 2019–2024 | INSTITUTIONAL_REPORT | DESCRIPTIVE | MEDIUM | US | nyc_ll97 | url null | Findings: majority of covered buildings already comply with 2024 limits; the 2030 limits bind much more; compliance pathways rely on electrification. Limitations: modelling of compliance, pre-outcome.
E25 ev_bca_green_mark | BCA annual reports / Green Building Masterplan progress | Building and Construction Authority (Singapore) | 2021–2024 | OFFICIAL_STATISTICS | DESCRIPTIVE | MEDIUM | SG | green_mark, gbmp_2030, gmis_eb | url: https://www1.bca.gov.sg | Findings: >49% of buildings by GFA Green Mark certified by 2023 (target 80% by 2030). Limitations: certification share, not measured energy.
E26 ev_epbd_impact | EPBD recast impact assessment | European Commission | 2021-12 | GOVERNMENT_EVALUATION | DESCRIPTIVE | MEDIUM | — | epbd_2024 | url null | Findings: ~75% of EU building stock energy-inefficient; renovation rate ~1%/yr needs to double+. Limitations: ex-ante modelling.
E27 ev_gibb_joule_2023 | "Coming in from the cold: Heat pump efficiency at low temperatures" | Joule (Gibb, Rosenow, Lowes, Hewitt) | 2023 | ACADEMIC_STUDY | META_ANALYSIS | HIGH | GB,DE,NO,US | bus, beg, enova_hp | url: https://doi.org/10.1016/j.joule.2023.08.005 | Findings: field data across cold climates show HP efficiency 2–3× resistive heating even below −10°C. Limitations: technical performance, not policy.

DEMO-ONLY evidence (clearly synthetic placeholders for architecture demonstration; publisher "PACT demo dataset", url null, data_status DEMO):
D1 ev_demo_bus_evaluation | "Illustrative interim evaluation of a heat-pump grant (DEMO DATA)" | QUASI_EXPERIMENTAL | GB | bus | Findings phrased hypothetically: "Illustrates how a difference-in-differences evaluation would appear in PACT; values are not real." Confidence LOW.
D2 ev_demo_sg_cooling | "Illustrative cooling-retrofit outcome study (DEMO DATA)" | CORRELATIONAL | SG | gmis_eb.

## Time-series (country-level annual HP sales, units)
- DE metric_hp_sales (E5, APPROXIMATE for pre-2021, REPORTED 2021–2024): 2015 57000, 2016 66500, 2017 78000, 2018 84000, 2019 86000, 2020 120000, 2021 154000, 2022 236000, 2023 356000, 2024 193000.
- DE metric_gas_boiler_sales (E6, APPROXIMATE): 2021 ~653000, 2022 ~598000, 2023 ~790000, 2024 ~~ 440000 (approx).
- FR metric_hp_sales air-to-water (E19, APPROXIMATE): 2018 ~150000, 2019 ~175000, 2020 ~190000, 2021 ~270000, 2022 ~350000, 2023 ~280000, 2024 ~200000.
- NL metric_hp_sales (E20, APPROXIMATE): 2018 ~50000, 2019 ~ 55000, 2020 ~73000, 2021 ~87000, 2022 ~112000, 2023 ~160000, 2024 ~130000.
- GB metric_hp_installs_certified (MCS, no evidence record → attribute to E4 CCC which cites MCS; APPROXIMATE): 2019 ~27000, 2020 ~36000, 2021 ~43000, 2022 ~50000, 2023 ~40000, 2024 ~60000.
- GB metric_grants_issued BUS vouchers paid, approx (E2): 2022 ~9000 (May–Dec), 2023 ~20000, 2024 ~32000.
- DK metric_hp_sales (E22, APPROXIMATE): 2019 ~16000, 2020 ~22000, 2021 ~40000, 2022 ~55000, 2023 ~40000.
- NO metric_hp_sales (E23, APPROXIMATE, mostly air-to-air): 2019 ~110000, 2020 ~115000, 2021 ~130000, 2022 ~145000, 2023 ~100000.
- US metric_hp_sales (AHRI shipments, attribute to E9; APPROXIMATE): 2019 ~3100000, 2020 ~3400000, 2021 ~3900000, 2022 ~4000000, 2023 ~3600000, 2024 ~4100000.
- SG metric_green_mark_share (E25, APPROXIMATE): 2015 ~30, 2018 ~38, 2021 ~43, 2023 ~49.
- ILLUSTRATIVE/DEMO series: GB metric_energy_consumption index for a retrofit cohort (DEMO), SG metric_energy_consumption for GMIS-EB cohort (DEMO).

## Outcomes (key ones; inference must match evidence)
- DE BEG 2022–23: HP sales +53% then +51% (E5) — CORRELATIONAL (subsidy + gas crisis + GEG anticipation; no causal attribution).
- DE GEG 2024 debate: record gas-boiler sales 2023 (E6), HP sales −46% in 2024 (E5) — CORRELATIONAL; note: policy uncertainty widely cited as a driver (E8).
- GB BUS grant uplift Oct 2023: applications roughly doubled (E2) — CORRELATIONAL; BUS uptake below forecast 2022–23 (E1) — DESCRIPTIVE.
- GB GHG: 47,500 vs 600,000 — DESCRIPTIVE (E3).
- US WAP: realised savings 10–20%, below projections — CAUSAL (E12 experimental; E13 quasi-exp).
- US 25C: 2.3m claims TY2023 — DESCRIPTIVE (E15).
- US Maine: 100k target hit 2 years early — DESCRIPTIVE (E16).
- FR MPR: ~670k grants 2022; mostly single measures — DESCRIPTIVE (E18, E17).
- NL PAW: behind target — DESCRIPTIVE (E21).
- NO oil ban: oil heating near-eliminated by 2020 — CORRELATIONAL (E23; ban + scrappage + electric baseline).
- DK: HP installations accelerated post-2020 incentives + 2022 gas shock — CORRELATIONAL (E22).
- SG Green Mark: 49% GFA by 2023 — DESCRIPTIVE (E25).
- EU-wide: 2022 record ~3m, then decline 2023–24 as subsidies cut and gas prices fell — CORRELATIONAL (E10).

## Similarity pairs to seed (overall score; differences)
bus↔beg_em_2024 0.82 (both consumer HP grants; DE adds income bonus + loan + regulatory 65% rule; GB flat grant) · bus↔maprimerenov 0.74 (FR income-banded, multi-measure) · bus↔isde 0.78 · bus↔25c 0.66 (tax credit vs grant) · bus↔bygningspulje 0.76 · beg↔maprimerenov 0.79 · eco4↔cee 0.81 (both supplier obligations) · eco4↔wap 0.72 (low-income retrofit) · chmm↔hybrid_norm 0.58 · geg_2024↔oil_ban 0.71 · geg_2024↔gasloos_nieuwbouw 0.69 · geg_2024↔ny_all_electric 0.66 · oil_ban↔oil_ban_new(DK) 0.84 · nyc_ll97↔label_c_kantoren 0.70 · nyc_ll97↔mandatory_audit(SG) 0.62 · green_mark↔gbmp_2030 0.75 · maprimerenov↔isde 0.77 · eco_ptz↔warmtefonds 0.86 · eco_ptz↔kfw_effizienzhaus 0.80 · warm_homes_plan↔beg 0.65 · me_hp_target↔hp_target(GB) 0.73 · rhi_domestic↔map 0.74 · fhs↔re2020 0.83 · fhs↔title24 0.78 · re2020↔title24 0.80 · behg↔energiebelasting 0.77 · behg↔el_afgift 0.60 · skrotningsordning↔enova_scrappage 0.85 · heehra↔beg_em_2024 0.74 · masssave↔eco4 0.70.
Plus compute structured similarity programmatically for all other pairs (the engine), but seed these as curated.

Asia similarity pairs (lead-authored): sg_meps_ac↔jp_top_runner 0.72 (both cover air-conditioner efficiency; Japan sets targets at the best product on the market, Singapore sets a minimum floor plus mandatory labels) · cn_energy_label↔in_star_labelling 0.80 (both mandatory graded appliance labels) · jp_tokyo_cap_trade↔nyc_ll97 0.74 (both cap emissions of large existing buildings; Tokyo allows trading, LL97 uses per-building limits with penalties) · kr_zeb↔epbd_2024 0.62 (both push new buildings toward zero energy/emissions; Korea phases a certification mandate by building type, the EU sets a directive for member states) · in_ecbc↔green_mark 0.60 (both set mandatory minimum performance for commercial buildings in cooling-dominated climates; Green Mark adds a voluntary higher rating tier).

## Refresh — October 2026

## A. United Kingdom

### pol_gb_bus — Boiler Upgrade Scheme
- status ACTIVE (unchanged). incentive unchanged (£7,500).
- funding → "Government funded; ~£450m for 2022–25, then extended to FY2029/30 with £2.7bn under the Warm Homes Plan (Jan 2026)."
- description append: "Extended to 2030 by the Boiler Upgrade Scheme (England and Wales) (Amendment) Regulations 2026; 75,174 grants had been paid by the end of December 2025."
- limitations: keep existing; add "Grant count to end-2025 (75,174) remains far below the pace implied by national heat-pump ambitions."
- sources add:
  - { label: "Boiler Upgrade Scheme (England and Wales) (Amendment) Regulations 2026", url: "https://www.legislation.gov.uk/uksi/2026/390/made", publisher: "legislation.gov.uk" }
  - { label: "Warm Homes Plan (HTML)", url: "https://www.gov.uk/government/publications/warm-homes-plan/warm-homes-plan-html", publisher: "DESNZ" }

### pol_gb_hp_target — 600,000 heat pumps per year by 2028 target
- status → SUPERSEDED; ended → "2026-01".
- description append: "Superseded on 21 January 2026 by the Warm Homes Plan, which replaced it with an aim of over 450,000 heat-pump installations per year by 2030 (a lower number over a longer horizon). In a written answer of 4 June 2026 the government described the 600,000 figure as 'set by the previous government'."
- limitations → ["Installations ran far below the required trajectory.", "Target dropped in January 2026 in favour of >450,000/yr by 2030."]
- sources add: { label: "Warm Homes Plan (HTML)", url: "https://www.gov.uk/government/publications/warm-homes-plan/warm-homes-plan-html", publisher: "DESNZ" }
  and try { label: "Heat and Buildings Strategy", url: "https://www.gov.uk/government/publications/heat-and-buildings-strategy", publisher: "UK Government" } (null if not 200).

### pol_gb_warm_homes_plan — Warm Homes Plan
- status → ACTIVE; introduced → "2026-01".
- incentive → "£15bn programme to 2029/30: ~£5bn grants for low-income homes (£4.4bn capital), £2.7bn Boiler Upgrade Scheme, £2bn zero/low-interest consumer loans, £1.1bn heat networks, £2.7bn Warm Homes Fund finance."
- funding → "£15bn capital over 2025/26–2029/30 including Barnett consequentials; published 21 January 2026."
- description REWRITE: "Published by DESNZ on 21 January 2026: a £15bn plan to upgrade up to 5 million homes by 2030. It funds low-income upgrades through the Warm Homes: Social Housing Fund and Warm Homes: Local Grant (to be consolidated into a single low-income scheme), extends the Boiler Upgrade Scheme to 2030 with £2.7bn, launches a zero/low-interest loan offer backed by £2bn, and funds heat networks. It abolishes the supplier-obligation (ECO) model in favour of public investment, and sets an aim of over 450,000 heat-pump installations per year by 2030."
- limitations → ["Most delivery is back-loaded to 2027/28–2029/30; the consolidated low-income scheme is not yet designed."]
- sources → [{ label: "Warm Homes Plan", url: "https://www.gov.uk/government/publications/warm-homes-plan", publisher: "DESNZ" }]

### pol_gb_fhs — Future Homes Standard
- status stays ANNOUNCED (legislated, not yet in force). introduced → "2026-03".
- name → "Future Homes and Buildings Standards"
- incentive → "New homes to emit on average ≥75% less carbon than 2013 standards: low-carbon heating as standard (in practice no gas boilers) and solar on the majority of new homes."
- description REWRITE: "Government response to the Future Homes and Buildings Standards consultation published 24 March 2026, with the Building Regulations etc. (Amendment) (England) Regulations 2026 (SI 2026/335) laid the same day. The standards come into force on 24 March 2027 for ordinary building work and 24 September 2027 for higher-risk buildings, with a 12-month transitional period: work with a valid application before 24 March 2027 that commences before 24 March 2028 may be built to the 2021 Part L standards."
- limitations → ["Legislated but not in force until March 2027; transitional rules mean most homes completing in 2027–28 will still be built to 2021 standards."]
- sources → [{ label: "Future Homes and Buildings Standards: Building Circular 01/2026", url: "https://www.gov.uk/government/publications/the-future-homes-and-buildings-standards-building-circular-012026/the-future-homes-and-buildings-standards-building-circular-012026-letter", publisher: "MHCLG" }]

### pol_gb_eco4 — Energy Company Obligation 4
- ended → "2026-12".
- description append: "Extended by nine months to 31 December 2026 (government response, January 2026) to let suppliers complete targets and remediate non-compliant installations. There will be no successor supplier obligation: the Warm Homes Plan replaces the ECO model with £1.5bn of additional public grant funding for low-income households."
- sources add: { label: "Extending the ECO4 end date: government response", url: "https://www.gov.uk/government/consultations/extending-the-eco4-end-date/outcome/extending-the-eco4-end-date-government-response-html", publisher: "DESNZ" }

### pol_gb_gbis — Great British Insulation Scheme
- status → CLOSED; ended → "2026-03".
- description append: "Closed to new installations on 31 March 2026 as planned; no successor obligation."
- sources → [{ label: "Great British Insulation Scheme", url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/great-british-insulation-scheme", publisher: "Ofgem" }]

### pol_gb_hug — Home Upgrade Grant
- ended → "2025-03".
- description append: "Ended March 2025 and succeeded by the Warm Homes: Local Grant (April 2025–March 2028, £500m, delivered by 271 local authorities and open to on-gas as well as off-gas homes)."
- sources → [{ label: "Warm Homes: Local Grant – guidance for local authorities", url: "https://www.gov.uk/government/publications/warm-homes-local-grant", publisher: "DESNZ" }]

### pol_gb_chmm — Clean Heat Market Mechanism
- incentive append: " Year 2 target (from 1 April 2026) raised to 8% of relevant boiler sales; MCS named the sole certification scheme."
- description append: "The Clean Heat Market Mechanism (Amendment) Regulations 2025 set the Year 2 (2026/27) target at 8% and named MCS as sole certification scheme; targets beyond Year 2 are subject to further consultation."
- sources → [
  { label: "CHMM: revisions ahead of Scheme Year 2 — government response", url: "https://www.gov.uk/government/consultations/clean-heat-market-mechanism-revisions-ahead-of-scheme-year-2-20262027/outcome/clean-heat-market-mechanism-revisions-ahead-of-scheme-year-2-2026-to-2027-government-response-accessible-webpage", publisher: "DESNZ" },
  { label: "Clean Heat Market Mechanism Regulations 2025, Part 4", url: "https://www.legislation.gov.uk/uksi/2025/81/part/4", publisher: "legislation.gov.uk" } ]

### pol_gb_mees — Minimum Energy Efficiency Standards (PRS)
- incentive → "Minimum EPC E to let (2018 new tenancies, 2020 all). Government response of 21 January 2026 confirms an EPC C-equivalent standard for all private tenancies by 1 October 2030, assessed on new dual-metric EPCs (fabric first, then heating-system or smart-readiness), with a £10,000 per-property cost cap."
- description append: "On 21 January 2026 the government confirmed it will raise the standard to EPC C-equivalent for all tenancies by 1 October 2030, with a £10,000 cost cap and 10-year exemptions; homes already at EPC C (EER) before 1 October 2029 are recognised as compliant until the certificate expires."
- limitations → ["Legislative changes subject to parliamentary approval."]
- sources → [{ label: "Improving the energy performance of privately rented homes: government response", url: "https://www.gov.uk/government/consultations/improving-the-energy-performance-of-privately-rented-homes-2025-update/outcome/improving-the-energy-performance-of-privately-rented-homes-government-response-html", publisher: "DESNZ" }]

## B. Germany

### pol_de_geg_2024 — GEG 2024 amendment (Heizungsgesetz)
- status → SUPERSEDED; ended → "2026-07".
- description append: "Superseded in July 2026 by the Gebäudemodernisierungsgesetz (GModG): passed by Bundestag and Bundesrat on 10 July 2026 and promulgated on 23 July 2026 (BGBl. 2026 I Nr. 226), it removed the 65%-renewable requirement for new heating systems and renamed the Act."
- limitations add: "Repealed after roughly two and a half years in force."
- sources → [
  { label: "Bundestag beschließt Heizungsgesetz-Novelle", url: "https://www.bundestag.de/dokumente/textarchiv/2026/kw28-de-heizungsgesetz-1194534", publisher: "Deutscher Bundestag" },
  { label: "Gebäudeenergiegesetz (consolidated text)", url: "https://www.gesetze-im-internet.de/geg/", publisher: "Bundesministerium der Justiz" } ]  (null if not 200)

### NEW pol_de_gmodg — Gebäudemodernisierungsgesetz (GModG)
- country DE (jurisdiction = same as pol_de_geg_2024); short_name "GModG"; status ACTIVE; introduced "2026-07"; ended null.
- sector, technology_ids, mechanism_ids, target_groups, tags-style: copy from pol_de_geg_2024, replacing tag "65% renewable" with "technology-open" and "heating law" kept.
- eligibility: "All owners installing a new heating system in Germany; fossil boilers permitted subject to a rising green-fuel quota from 1 January 2029."
- incentive: "Technology-open rules for new heating systems — heat pumps, district heating, hybrids, biomass, direct electric and, again, new gas and oil boilers, the latter conditional on a rising share of CO2-neutral fuels from 1 January 2029 (a Grüngas-/Grünheizölquote law is to be tabled by 1 December 2026)."
- funding: "Regulatory measure; accompanied by continued BEG subsidies, strengthened for lower-income households. Government estimates ~€7.4bn relief for citizens and businesses."
- objectives: ["Technology-open decarbonisation of building heat", "Reduce compliance cost and bureaucracy for building owners"]
- description: "Successor to the 2024 'Heizungsgesetz' under the CDU/CSU–SPD coalition, implementing the coalition agreement's pledge to abolish it. Passed by Bundestag and Bundesrat on 10 July 2026 and promulgated 23 July 2026 (BGBl. 2026 I Nr. 226). It deletes the 65% renewable requirement, re-permits new fossil boilers subject to a phased green-fuel quota, retains municipal heat planning, and is paired with reformed BEG funding."
- implementation_notes: "In force on publication in the Bundesgesetzblatt; further amendments scheduled for 1 January 2028 and 1 January 2030."
- limitations: ["Effects on heat-pump demand not yet observable at refresh time (October 2026).", "Green-fuel quota not yet legislated."]
- sources: [
  { label: "Gebäudemodernisierungsgesetz ist Investitionsprogramm für den Wärmemarkt (press release, 10 July 2026)", url: "https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Pressemitteilungen/2026/07/20260710-gebaeudemodernisierungsgesetz.html", publisher: "BMWE" },
  { label: "BGBl. 2026 I Nr. 226", url: "https://www.recht.bund.de/bgbl/1/2026/226/regelungstext.pdf?__blob=publicationFile&v=1", publisher: "Bundesgesetzblatt" } ]
- similarity pair to add: a pol_de_geg_2024, b pol_de_gmodg, overall 0.86, differences ["GModG removes the 65% renewable mandate and re-permits fossil boilers under a green-fuel quota."]
- Also add pair a pol_de_gmodg, b pol_no_oil_ban, overall 0.45, differences ["Norway bans fossil oil outright; GModG permits fossil boilers with a rising green-fuel share."]

### pol_de_beg_em_2024 — BEG Heizungsförderung (KfW 458)
- incentive REWRITE: "From 21 July 2026: 30% base grant on max €28,000 eligible cost for the first unit (cap falls by €750 every six months from 1 Feb 2027); income bonus 40% (taxable household income ≤€30,000), 30% (≤€40,000), 10% (≤€50,000), with thresholds €10,000 higher for families with children; climate-speed bonus 16%, falling 4 points every six months and ending for applications from 1 Aug 2028; maximum 80% for the lowest income band, 70% otherwise. Jan 2024–Jul 2026 design: 30% base + 20% speed + 30% income bonus (≤€40,000) + 5% efficiency bonus, capped at 70% of €30,000; supplementary low-interest loan."
- description append: "Reformed under the GModG framework: the BEG EM guideline of 17 August 2026 (effective 21 July 2026) keeps the 30% base grant, lowers the cap to €28,000 with a declining schedule, widens and steepens the income bonus, and phases out the speed bonus by August 2028."
- sources → [
  { label: "Die neue Bundesförderung für effiziente Gebäude startet jetzt (KfW press release)", url: "https://www.kfw.de/%C3%9Cber-die-KfW/Newsroom/Aktuelles/Pressemitteilungen-Details_901760.html", publisher: "KfW" },
  { label: "FAQ BEG", url: "https://www.energiewechsel.de/KAENEF/Navigation/DE/Service/FAQ/BEG/faq-beg.html", publisher: "BMWE" },
  { label: "Merkblatt KfW 458 Heizungsförderung", url: "https://www.kfw.de/PDF/Download-Center/F%C3%B6rderprogramme-%28Inlandsf%C3%B6rderung%29/PDF-Dokumente/6000005131_M_458.pdf", publisher: "KfW" } ]

### pol_de_waermeplanung — Wärmeplanungsgesetz
- incentive → "Mandatory municipal heat planning (large cities by mid-2026, others by mid-2028); originally the geographic trigger for the GEG 65% rule, retained under the 2026 GModG."
- description: replace "the GEG 65% requirement binds once local plans are in place" with "under the 2024 GEG the 65% requirement bound once local plans were in place; the planning duty is retained under the 2026 GModG".

## C. France

### pol_fr_maprimerenov — MaPrimeRénov'
- funding → "State budget via ANAH; €3.6bn for 2026 (targeting ≥120,000 deep and 150,000 single-measure renovations)."
- description append: "The deep-renovation window was suspended in summer 2025 and the whole scheme again from the start of 2026 pending the state budget; it reopened for all pathways on 23 February 2026 with a mandatory France Rénov' adviser meeting before deep-renovation applications. Around 83,000 files were pending at end-2025; average processing time exceeded six months for deep renovations."
- limitations add: "Repeated suspensions (2025, early 2026) and multi-month processing backlogs."
- sources add: { label: "Réouverture de MaPrimeRénov' (23 February 2026)", url: "https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov", publisher: "Gouvernement (info.gouv.fr)" }

## D. Netherlands

### pol_nl_hybrid_norm
- name → "Hybrid heat-pump standard at boiler replacement (2026 plan dropped; 2029 plan announced)"
- status → ANNOUNCED; introduced stays "2022".
- description REWRITE: "A 2022 plan to require at least a hybrid heat pump at boiler replacement from 2026 was formally dropped on 31 October 2024 under the Schoof coalition (never in force). On 7 October 2026 the new D66–VVD–CDA minority cabinet announced that smart hybrid heat pumps will become the standard at boiler replacement from 2029 for homes not connected, or due to be connected, to a heat network; exemptions and legislation are still to be worked out."
- incentive → "Would require at least a smart hybrid heat pump at boiler replacement from 2029 (outside heat-network areas)."
- limitations → ["Minority coalition; no parliamentary majority secured.", "The 2026 version never entered into force; hybrid sales fell to ~41,000 in 2025 against >425,000 boiler replacements per year."]
- tags: replace "paused" with "announced".
- sources → [{ label: "Slimme en hybride warmtepompen vanaf 2029 de nieuwe standaard", url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/07/slimme-en-hybride-warmtepompen-vanaf-2029-de-nieuwe-standaard", publisher: "Rijksoverheid" }]
- similarities.ts: pair (pol_gb_chmm, pol_nl_hybrid_norm) difference → "CHMM obliges manufacturers; the Dutch norm would oblige households at boiler replacement (now planned for 2029)."

### pol_nl_isde
- incentive append: " 2026: €500m budget; first air-to-water heat pump €1,025 start amount + €225/kW from the first kW + €200 energy-label bonus; second and further units €225/kW only; scheme runs to 2031."
- sources add: { label: "ISDE: wat is er gewijzigd vanaf 2026?", url: "https://www.rvo.nl/subsidies-financiering/isde/isde-wat-wijzigt-er-2026", publisher: "RVO" }

## E. Denmark

### pol_dk_bygningspulje
- status → SUPERSEDED; ended → "2023".
- description append: "Split in summer 2023 into Varmepumpepuljen (heat-pump conversions) and Energirenoveringspuljen (energy renovation). Roughly DKK 2.5bn was allocated across 2020–2026 (2020: 245m; 2021: 675m; 2022: 430m; 2023: 340m; 2024: 405m; 2025: 230m; 2026: 200m); the pool is expected to be wound up after 31 October 2026."
- sources → [{ label: "Bygningspuljen – opsplittet i to puljer", url: "https://ens.dk/tilskud-og-puljer/tilskuds-stoetteordninger/bygningspuljen-opsplittet-i-puljer", publisher: "Danish Energy Agency" }]

### NEW pol_dk_varmepumpepulje — Varmepumpepuljen
- country DK; short_name "Varmepumpepuljen"; status ACTIVE; introduced "2023"; sector/tech/mechanisms/target_groups copied from pol_dk_bygningspulje (technology: heat pumps only).
- eligibility: "Owners of year-round homes under 400 m² replacing an oil, gas, electric or biomass boiler with an air-to-water or ground-source heat pump; application and approval before work starts; first-come-first-served."
- incentive: "Fixed grant of DKK 27,000 per heat pump regardless of type."
- funding: "State grant pool; DKK 116.9m for 2026 plus a DKK 200m top-up; pool closed 11 May 2026 when exhausted and reopened 2 July 2026 until 30 November 2026 or exhaustion."
- objectives: ["Replace oil and gas boilers with heat pumps outside district-heating areas"]
- description: "Successor to Bygningspuljen's heat-pump track from 2023: a fixed DKK 27,000 grant for converting a boiler to a heat pump in a year-round home. Demand regularly exhausts annual rounds — the 2026 round closed on 11 May and reopened on 2 July with DKK 200m of extra funding."
- limitations: ["First-come-first-served rounds exhaust quickly, creating stop-go demand."]
- sources: [{ label: "Varmepumpepuljen åbner igen: 200 mio. kr. skal hjælpe flere væk fra olie og gas", url: "https://ens.dk/presse/varmepumpepuljen-aabner-igen-200-mio-kr-skal-hjaelpe-flere-vaek-fra-olie-og-gas", publisher: "Danish Energy Agency" }]
- similarity pair: a pol_dk_varmepumpepulje, b pol_gb_bus, overall 0.78, differences ["Both are flat per-unit heat-pump grants; the Danish grant is smaller (DKK 27,000) and rationed by annual rounds."]

### pol_dk_skrotningsordning
- incentive → "Up to DKK 25,000 per heat pump (max 45% of eligible cost), paid to pre-qualified energy-service providers who offer heat pumps on subscription and scrap the household's oil, wood-pellet or gas boiler; a new application round opened 7 January 2026 under BEK nr 806 of 18 June 2025."
- sources → [{ label: "Skrotningsordningen", url: "https://ens.dk/tilskud-og-puljer/tilskuds-stoetteordninger/skrotningsordningen", publisher: "Danish Energy Agency" }]

## F. Norway

### pol_no_enova_hp
- incentive → "25% of invoiced cost up to NOK 40,000 for liquid-to-water (ground/sea/rock) and NOK 20,000 for air-to-water heat pumps (air-to-water support reinstated when Enova revised its household scheme), NOK 5,000 for heat-pump water heaters; approval required before work starts; combined cap NOK 100,000 per home for 2025–2028."
- sources → [{ label: "Væske-til-vann varmepumpe", url: "https://enova.no/nb/privat/bolig/stotte/vaeske-til-vann-varmepumpe", publisher: "Enova" }]

## G. United States

### pol_us_25c
- status → CLOSED; ended → "2025-12".
- description append: "Terminated early by the One Big Beautiful Bill Act (Public Law 119-21, 4 July 2025), §70505: no credit for property placed in service after 31 December 2025, against an original sunset of 2032. No federal successor credit was created."
- limitations → ["Repealed early; unavailable from 1 January 2026.", "Efficiency Maine reports slower heat-pump rebate demand in 2026, which it attributes partly to the credit's loss."]
- sources add: { label: "FAQs for modification of sections 25C, 25D … under Public Law 119-21 (OBBB)", url: "https://www.irs.gov/newsroom/faqs-for-modification-of-sections-25c-25d-25e-30c-30d-45l-45w-and-179d-under-public-law-119-21-139-stat-72-july-4-2025-commonly-known-as-the-one-big-beautiful-bill-obbb", publisher: "IRS" }
- similarities.ts pair (25C, BUS) difference → "25C was a tax credit claimed after spend (repealed end-2025); BUS is an upfront grant."

### pol_us_heehra
- description append: "Roll-out remains uneven: by mid-2026 roughly half the states had launched; Idaho and South Dakota returned their allocations. DOE Program Notice 26-2 (29 May 2026) removed fuel-switching from the electrification rebate and dropped the Justice40 set-aside. Some state programmes paused — Georgia's HEAR closed on 14 August 2026 and reopens in October 2026 for wiring/panel upgrades only."
- limitations → ["State-by-state launch; several states slow or declined.", "2026 federal rule change narrowed the rebate to non-fuel-switching measures."]
- sources → [
  { label: "Home Energy Rebates", url: "https://www.energy.gov/save/rebates", publisher: "US Department of Energy" } (null if not 200),
  { label: "Georgia HEAR programme update", url: "https://energyrebates.georgia.gov/home-electrification-and-appliance-rebates", publisher: "Georgia Environmental Finance Authority" } ]

### pol_us_homes
- description append: "By mid-2026 roughly half the states had launched programmes; DOE Program Notice 26-1 (29 May 2026) simplified state blueprint approval and removed the Justice40 set-aside."
- sources → same DOE source as above.

### pol_us_ny_all_electric
- status stays ANNOUNCED.
- description REWRITE: "Statewide prohibition of fossil-fuel equipment in new buildings of seven storeys or fewer from 2026, and all new buildings from 1 January 2029, enacted in the FY2024 state budget (2023). On 30 June 2026 the Second Circuit (Mulhern Gas v. Mosley) held that neither the Act nor NYC Local Law 154 is pre-empted by the federal Energy Policy and Conservation Act, splitting from the Ninth Circuit. The state had agreed in November 2025 to delay enforcement pending the ruling; enforcement remains on hold until the 28 October 2026 deadline for a Supreme Court petition."
- limitations → ["Enforcement paused pending possible Supreme Court petition (deadline 28 October 2026)."]
- sources → [{ label: "Mulhern Gas v. Mosley — Second Circuit decision (30 June 2026)", url: "https://dos.ny.gov/system/files/documents/2026/07/decision-mulhern-gas-v.-mosley-2d-cir.pdf", publisher: "New York Department of State" }]

### pol_us_me_hp_target
- description append: "2026 headwinds: Efficiency Maine reports a more pronounced seasonal slowdown in whole-home heat-pump rebates, citing lower consumer confidence, the loss of the federal tax credit, tariffs and higher electricity prices; it introduced a new ducted rebate structure (1 January 2026) and a limited-time bonus (from 1 March 2026)."
- sources → [
  { label: "After Maine surpasses 100,000 heat pump goal two years ahead of schedule, Governor Mills sets new target", url: "https://www.maine.gov/governor/mills/news/after-maine-surpasses-100000-heat-pump-goal-two-years-ahead-schedule-governor-mills-sets-new", publisher: "Office of Governor Janet T. Mills" },
  { label: "Efficiency Maine Executive Director's Summary Report, May 2026", url: "https://www.efficiencymaine.com/docs/ED-Report-5-27-2026.pdf", publisher: "Efficiency Maine Trust" } ]

## H. EU

### pol_eu_epbd_2024
- description append: "The transposition deadline of 29 May 2026 passed with no member state fully notifying; on 15 July 2026 the Commission opened infringement procedures by sending letters of formal notice to all 27 member states."
- limitations → ["Effects depend on member-state transposition — incomplete in all 27 as of July 2026."]
- sources → [
  { label: "Directive (EU) 2024/1275 — national transposition measures", url: "https://eur-lex.europa.eu/legal-content/EN/NIM/?uri=CELEX:32024L1275", publisher: "EUR-Lex" },
  { label: "Commission calls on EU countries to transpose the reinforced rules on the energy performance of buildings (15 July 2026)", url: "https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en", publisher: "European Commission" } ]

---

## I. Evidence — URL fixes and new records

### Fix
- ev_efficiency_maine_2023 → source_url "https://www.maine.gov/governor/mills/news/after-maine-surpasses-100000-heat-pump-goal-two-years-ahead-schedule-governor-mills-sets-new"
- pol_sg_green_mark source url → "https://www1.bca.gov.sg/buildsg/sustainability/green-mark-certification-scheme/" (trailing slash; currently 404 without it).

### NEW ev_bus_extension_ia_2026
- title "Boiler Upgrade Scheme (England and Wales) (Amendment) Regulations 2026 — Impact Assessment"
- publisher "DESNZ"; publication_date "2026"
- source_url "https://www.legislation.gov.uk/ukia/2026/67/pdfs/ukia_20260067_en.pdf"
- evidence_type GOVERNMENT_EVALUATION; causal_strength DESCRIPTIVE; confidence HIGH; geography GB
- policy_ids ["pol_gb_bus"]; metrics: the existing heat-pump-installations metric id used by pol_gb_bus outcomes
- methodology "Ex-ante impact assessment using scheme administrative data"
- findings "75,174 BUS grants paid from launch to end December 2025; scheme extended to FY2029/30 with ~£2.7bn, budget rising each year; 90–95% of surveyed property owners satisfied with their installation."
- limitations "Ex-ante assessment; the installation figure is an administrative count, not an impact estimate."

### NEW ev_efficiency_maine_ed_2026
- title "Efficiency Maine Executive Director's Summary Report (May 2026)"
- publisher "Efficiency Maine Trust"; publication_date "2026-05"
- source_url "https://www.efficiencymaine.com/docs/ED-Report-5-27-2026.pdf"
- evidence_type OFFICIAL_STATISTICS; causal_strength DESCRIPTIVE; confidence MEDIUM; geography US (Maine)
- policy_ids ["pol_us_me_hp_target", "pol_us_25c"]; metrics: heat-pump installations metric
- methodology "Programme administrative reporting to the Trust's board"
- findings "3,714 standard whole-home heat-pump rebates issued fiscal-year-to-date (≈81/week); the seasonal slowdown in early 2026 was more pronounced than in prior years, which the Trust attributes to lower consumer confidence, the loss of the federal tax credit, tariffs and higher electricity prices; demand picked up in spring with rising heating-oil prices."
- limitations "Programme self-reporting; attribution of the slowdown is the Trust's qualitative judgement, not an evaluation."

### NEW ev_efficiency_maine_whhp_2026
- title "Assessment of Heat Pumps in Maine Homes (2026)"
- publisher "Efficiency Maine Trust"; publication_date "2026"
- source_url "https://www.efficiencymaine.com/docs/Efficiency_Maine_Whole_Home_Heat_Pump_Study_2026.pdf"
- evidence_type GOVERNMENT_EVALUATION; causal_strength DESCRIPTIVE; confidence MEDIUM; geography US (Maine)
- policy_ids ["pol_us_me_hp_target"]; metrics: heat-pump installations and (if it exists) energy-consumption metric
- methodology "Analysis of utility AMI interval electricity data for whole-home heat-pump installations from the programme's first six months (Sept 2023–Feb 2024)"
- findings "As of September 2025, ~98% of rebated whole-home heat pumps were ductless; the study isolates cold-weather-dependent electricity use to estimate heat-pump usage in rebated homes."
- limitations "Early cohort; descriptive usage analysis without a control group."

### NEW outcome (mirror the existing pol_gb_bus outcome record shape)
- policy pol_gb_bus; metric heat-pump installations; value 75174; unit "grants paid"; period "2022-05 to 2025-12"; inference DESCRIPTIVE/administrative; evidence_ids ["ev_bus_extension_ia_2026"]; note "Cumulative BUS grants paid to end December 2025 (administrative count)."

---

