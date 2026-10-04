import { z } from "zod";

import { Mechanism, MechanismKind } from "@/lib/domain/schema";

type MechanismKindT = z.infer<typeof MechanismKind>;

const defs: Array<[string, MechanismKindT, string, string]> = [
  ["mech_grant", "GRANT", "Grant", "Capital grant or subsidy paid to the end user."],
  ["mech_tax_credit", "TAX_CREDIT", "Tax credit", "Credit against tax liability for eligible measures."],
  ["mech_loan", "LOAN", "Concessional loan", "Concessional or zero-interest finance."],
  ["mech_loan_guarantee", "LOAN_GUARANTEE", "Loan guarantee", "Public guarantee de-risking private finance."],
  ["mech_obligation", "OBLIGATION", "Obligation", "Supplier or market obligation (e.g. ECO, CEE, Clean Heat Market Mechanism)."],
  ["mech_standard", "STANDARD", "Standard", "Performance standard or building code."],
  ["mech_ban", "BAN", "Ban / phase-out", "Phase-out or prohibition of a technology or fuel."],
  ["mech_carbon_price", "CARBON_PRICE", "Carbon price", "Carbon tax, fuel tax reform or emissions pricing."],
  ["mech_information", "INFORMATION", "Information", "Labels, audits, certification and advice."],
  ["mech_direct_investment", "DIRECT_INVESTMENT", "Direct investment", "Public procurement or publicly delivered programme."],
  ["mech_target", "TARGET", "Target", "Statutory or political target."],
];

export const mechanisms: Mechanism[] = defs.map(([id, kind, name, description]) => ({
  id,
  kind: kind as z.infer<typeof MechanismKind>,
  name,
  description,
}));
