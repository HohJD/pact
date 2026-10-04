import type { Technology } from "@/lib/domain/schema";

export const technologies: Technology[] = [
  {
    id: "tech_heat_pump",
    name: "Heat pumps",
    description: "Air- and ground-source heat pumps, including hybrid systems.",
  },
  {
    id: "tech_insulation",
    name: "Insulation & fabric retrofit",
    description: "Insulation and building fabric measures that reduce heating and cooling demand.",
  },
  {
    id: "tech_district_heating",
    name: "District heating",
    description: "District heating networks and connections.",
  },
  {
    id: "tech_efficient_appliances",
    name: "Efficient appliances & cooling",
    description: "Efficient appliances and cooling equipment, including air-conditioners.",
  },
  {
    id: "tech_solar_thermal",
    name: "Solar thermal",
    description: "Solar thermal collectors for water and space heating.",
  },
  {
    id: "tech_smart_controls",
    name: "Smart controls & metering",
    description: "Smart heating and energy controls and metering.",
  },
  {
    id: "tech_whole_house_retrofit",
    name: "Deep / whole-house retrofit",
    description: "Whole-house or deep retrofit packages combining multiple measures.",
  },
  {
    id: "tech_green_building",
    name: "Green building design",
    description: "Green building design and performance standards, primarily for new build.",
  },
];
