/**
 * Bill calculation rules - shared by the browser (live preview) and the server (final values).
 *
 *  Part A  Travel Allowance
 *          - Normal fuel type : (one-way KM x 2) x RatePerKM   e.g. 20 km, Petrol 12  -> 240 + 240 = 480
 *          - Fixed fuel type  : RatePerKM is the fixed amount   e.g. Local -> 200
 *  Part B  Dearness Allowance : fixed (Setting.daAmount, default 200), nature "Viva"
 *  Part C  Examination Honorarium on TOTAL students of all courses/subjects in the bill
 *          - upto 45 students : 500
 *          - above 45         : 500 + (total - 45) x 15
 *  Summary = A + B + C (+ D misc) ; Grand total = Summary - advance
 */

export interface CalcSettings {
  daAmount: number;
  daNature: string;
  honorariumBaseStudents: number;
  honorariumBaseAmount: number;
  honorariumExtraPerStudent: number;
}

export const DEFAULT_SETTINGS: CalcSettings = {
  daAmount: 200, daNature: "Viva", honorariumBaseStudents: 45, honorariumBaseAmount: 500, honorariumExtraPerStudent: 15,
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function calcTravel(oneWayKm: number, rate: number, isFixed: boolean) {
  const km = Math.max(0, Number(oneWayKm) || 0);
  const r = Math.max(0, Number(rate) || 0);
  if (isFixed) return { oneWayKm: km, totalKm: 0, oneWayAmount: r, amount: round2(r) };
  const oneWayAmount = round2(km * r);
  return { oneWayKm: km, totalKm: round2(km * 2), oneWayAmount, amount: round2(oneWayAmount * 2) };
}

export function calcHonorarium(students: number, s: CalcSettings = DEFAULT_SETTINGS) {
  const n = Math.max(0, Math.floor(Number(students) || 0));
  if (n === 0) return { totalStudents: 0, baseAmount: 0, extraStudents: 0, extraAmount: 0, amount: 0 };
  const extraStudents = Math.max(0, n - s.honorariumBaseStudents);
  const baseAmount = round2(s.honorariumBaseAmount);
  const extraAmount = round2(extraStudents * s.honorariumExtraPerStudent);
  return { totalStudents: n, baseAmount, extraStudents, extraAmount, amount: round2(baseAmount + extraAmount) };
}

export interface BillCalcInput {
  oneWayKm: number;
  travelRate: number;
  isFixedTravel: boolean;
  daAmount: number;
  examItems: { noOfStudents: number }[];
  miscAmount?: number;
  advanceAmount?: number;
}

export function calcBill(input: BillCalcInput, s: CalcSettings = DEFAULT_SETTINGS) {
  const travel = calcTravel(input.oneWayKm, input.travelRate, input.isFixedTravel);
  const totalStudents = input.examItems.reduce((a, i) => a + Math.max(0, Math.floor(Number(i.noOfStudents) || 0)), 0);
  const honorarium = calcHonorarium(totalStudents, s);
  const partA = travel.amount;
  const partB = round2(input.daAmount);
  const partC = honorarium.amount;
  const partD = round2(input.miscAmount || 0);
  const total = round2(partA + partB + partC + partD);
  const grandTotal = round2(total - (Number(input.advanceAmount) || 0));
  return { travel, honorarium, totalStudents, partA, partB, partC, partD, total, grandTotal };
}
