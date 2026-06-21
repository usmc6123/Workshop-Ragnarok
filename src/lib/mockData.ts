/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GarageItem, Vehicle, PageResponse, CategoryPage, ContentPage } from '../types';

export const MOCK_GARAGE: GarageItem[] = [
  {
    garageId: 201,
    id: 1,
    year: "2016",
    make: "Ford",
    model: "Mustang GT",
    engine: "V8 5.0L",
    source: "charm",
    uriPath: "/Ford/2016/Mustang_GT",
    isComplete: 1,
    nickname: "PRIMARY REPLICA"
  },
  {
    garageId: 202,
    id: 2,
    year: "2015",
    make: "Chevrolet",
    model: "Silverado",
    engine: "V8 5.0L",
    source: "charm",
    uriPath: "/Chevrolet/2015/Silverado",
    isComplete: 1,
    nickname: "WORKHORSE"
  },
  {
    garageId: 203,
    id: 3,
    year: "2018",
    make: "Toyota",
    model: "Tacoma",
    engine: "V8 5.0L",
    source: "lemon",
    uriPath: "/Toyota/2018/Tacoma",
    isComplete: 1,
    nickname: "OFFROAD COMPANION"
  },
  {
    garageId: 204,
    id: 4,
    year: "2016",
    make: "Ford",
    model: "Mustang GT",
    engine: "V8 5.0L",
    source: "lemon",
    uriPath: "/Ford/2016/Mustang_GT",
    isComplete: 1,
    nickname: "PRIMARY DETROIT UNIT"
  },
  {
    garageId: 205,
    id: 5,
    year: "2016",
    make: "Ford",
    model: "Mustang GT",
    engine: "V8 5.0L",
    source: "charm",
    uriPath: "/Ford/2016/Mustang_GT",
    isComplete: 1,
    nickname: "TERTIARY RACER"
  },
  {
    garageId: 206,
    id: 6,
    year: "2016",
    make: "Ford",
    model: "Mustang GT",
    engine: "V8 5.0L",
    source: "lemon",
    uriPath: "/Ford/2016/Mustang_GT",
    isComplete: 1,
    nickname: "DETROIT STEEL"
  },
  {
    garageId: 207,
    id: 7,
    year: "2013",
    make: "Toysa",
    model: "Mustang",
    engine: "V8 5.0L",
    source: "charm",
    uriPath: "/Toysa/2013/Mustang",
    isComplete: 1,
    nickname: "ANTIQUE MOD"
  },
  {
    garageId: 208,
    id: 8,
    year: "2016",
    make: "Toyota",
    model: "Tacoma Llt",
    engine: "V8 5.0L",
    source: "charm",
    uriPath: "/Toyota/2016/Tacoma_Llt",
    isComplete: 1,
    nickname: "MIDSIZE CLASSIC"
  },
  {
    garageId: 209,
    id: 9,
    year: "2016",
    make: "Ford",
    model: "Mustang GT",
    engine: "V8 5.0L",
    source: "lemon",
    uriPath: "/Ford/2016/Mustang_GT",
    isComplete: 1,
    nickname: "SECONDARY STEEL"
  }
];

export const MOCK_MAKES = ["Chevrolet", "Ford", "Toyota", "Toysa"];

export const MOCK_YEARS: { [make: string]: string[] } = {
  "Chevrolet": ["2015", "2016", "2017", "2018"],
  "Ford": ["2014", "2015", "2016", "2017", "2018"],
  "Toyota": ["2015", "2016", "2017", "2018"],
  "Toysa": ["2013"]
};

export const MOCK_VEHICLES: Vehicle[] = MOCK_GARAGE.map(({ garageId, nickname, ...vehicle }) => vehicle);

export const MOCK_TOC: CategoryPage = {
  pageType: "category",
  title: "Service Chapters Index",
  tree: [
    {
      type: "category",
      title: "General Engine Procedures",
      icon: "/icons/service-and-repair.svg",
      children: [
        { type: "link", title: "Head Gasket Service & Specifications", icon: "/icons/service-and-repair.svg", href: "/engine/head-gasket" },
        { type: "link", title: "Timing Chain Inspection & Calibration", icon: "/icons/service-and-repair.svg", href: "/engine/timing-chain" },
        { type: "link", title: "Valve Clearance Correction Setup", icon: "/icons/service-and-repair.svg", href: "/engine/valve-clearance" }
      ]
    },
    {
      type: "category",
      title: "Fluid Dynamics & Maintenance",
      icon: "/icons/service-and-repair.svg",
      children: [
        { type: "link", title: "Cooling System Bleeding Procedure", icon: "/icons/service-and-repair.svg", href: "/fluids/cooling" },
        { type: "link", title: "Oil Pressure Relief Valve Diagnostics", icon: "/icons/service-and-repair.svg", href: "/fluids/oil-flow" }
      ]
    },
    {
      type: "category",
      title: "Electrical Control Unit Diagnostics",
      icon: "/icons/service-and-repair.svg",
      children: [
        { type: "link", title: "OBD-II Multi-Diagnostic Codes Guide", icon: "/icons/service-and-repair.svg", href: "/electrical/obd-codes" }
      ]
    }
  ]
};

export const MOCK_PAGES: { [path: string]: ContentPage } = {
  "/engine/head-gasket": {
    pageType: "content",
    title: "Head Gasket Service & Torque Specifications",
    blocks: [
      { type: "heading", text: "1. OVERVIEW & PREPARATION" },
      { type: "text", text: "Ensure the engine is completely cold before starting bolt removal. Relieve the active fuel system pressure and disconnect the negative terminal battery cable. Drain the coolant from both the radiator and engine block structural plugs." },
      { type: "heading", text: "2. INTERACTIVE WORKSHOP CHECKLIST" },
      {
        type: "steps",
        items: [
          "Disconnect the active ignition coils structural wiring harness connectors.",
          "Remove spark plugs and verify zero liquid coolant contamination inside chamber cylinders.",
          "Unbolt intake manifold structural assembly and set aside with lines fully sealed.",
          "Remove cylinder head block bolts in reverse order of the tightening sequence.",
          "Carefully lift structural cylinder head block and inspect deck flatness alignment."
        ]
      },
      { type: "heading", text: "3. CRITICAL TORQUE SPECIFICATIONS" },
      { type: "text", text: "TORQUE SPECIFICATION: Tighten cylinder head bolts under 3 sequential stages: Stage 1 = 40 Nm (30 lb-ft), Stage 2 = 80 Nm (59 lb-ft), Stage 3 = Rotate bolts exactly 90 degrees." },
      { type: "text", text: "Precaution: Always replace fasteners on every head rebuild. Never reuse torque-to-yield fasteners under high-stress conditions." }
    ]
  },
  "/engine/timing-chain": {
    pageType: "content",
    title: "Timing Chain Calibration Diagnostics",
    blocks: [
      { type: "heading", text: "1. TIMING MARK ALIGNMENT" },
      { type: "text", text: "Rotate the crankshaft clockwise until keyway points to the 12 o'clock status. Ensure camshaft keyways are pointing perpendicular to cylinder head mating rail surfaces." },
      { type: "heading", text: "2. DIAGNOSTIC ASSEMBLY STEPS" },
      {
        type: "steps",
        items: [
          "Secure camshaft lock plates in status position.",
          "Inspect chain guides for heavy synthetic wear patterns or plastic micro-fractures.",
          "Reset chain hydraulic tensioner piston back to zero release slot.",
          "Verify the physical links on the chain match color dots on the gear edges.",
          "Cycle engine by hand twice to verify zero collision interference."
        ]
      },
      { type: "heading", text: "3. CRITICAL TORQUE VALUES" },
      { type: "text", text: "TORQUE SPECIFICATION: Tensioner Assembly Mount bolts must be calibrated to 22 Nm (16 lb-ft). Camshaft gear structural flange bolts must be locked to 115 Nm (85 lb-ft)." }
    ]
  },
  "/engine/valve-clearance": {
    pageType: "content",
    title: "Valve Clearance & Shimming Matrix",
    blocks: [
      { type: "heading", text: "1. WORKSHOP CALCULATIONS" },
      { type: "text", text: "Clearance checks should be performed with block at 20°C ambient base. Measure gaps using specialized feebles metric strip sliders." },
      { type: "heading", text: "2. CALIBRATION MATRIX STEPS" },
      {
        type: "steps",
        items: [
          "Measure intake lobe clearances: Intake Speeds criteria must fall between 0.15mm and 0.25mm.",
          "Measure exhaust lobe clearances: Exhaust Speeds criteria must fall between 0.25mm and 0.35mm.",
          "If measurements are out of specification range, extract lifter bucket shims.",
          "Calculate replacement thickness using manual micro-meter calipers."
        ]
      }
    ]
  },
  "/fluids/cooling": {
    pageType: "content",
    title: "Cooling System Bleeding Procedure",
    blocks: [
      { type: "heading", text: "1. FLUID RESET STEPS" },
      { type: "text", text: "Bleeding trapped air prevents critical hot pockets and localized head damage. Always complete procedures on Level floor boards." },
      {
        type: "steps",
        items: [
          "Fit bleed funnel assembly back directly on radiator fill neck.",
          "Add 50/50 ethylene glycol mix inside secondary overflow reservoir container.",
          "Start the workshop motor and let thermostatic valve click open completely.",
          "Increase cabin heater matrix speed and blower temperature to Maximum state.",
          "Cycle coolant bleed screw threads until air bubbles completely stop venting."
        ]
      }
    ]
  },
  "/fluids/oil-flow": {
    pageType: "content",
    title: "Oil Pressure Relief Valve Service",
    blocks: [
      { type: "heading", text: "1. PRESSURE SYSTEM RESET" },
      { type: "text", text: "A sticking structural bypass valve causes severe oil filter blowouts or bottom end starvation under high cold start pressures." },
      {
        type: "steps",
        items: [
          "Remove lower structural crankcase assembly pan.",
          "Extract pressure relief valve retaining bore pin.",
          "Clean relief spring and verify spring resting height meets 42.4mm parameter specs.",
          "Deburr high spots inside steel cylinder pathways before reassembly."
        ]
      }
    ]
  },
  "/electrical/obd-codes": {
    pageType: "content",
    title: "OBD-II Multi-Diagnostic Codes Guide",
    blocks: [
      { type: "heading", text: "1. TROUBLESHOOTING CODES REFERENCE" },
      { type: "text", text: "Diagnose and resolve common fault codes on board system microchips:" },
      { type: "text", text: "CODE P0300 - Random/Multiple Cylinder Misfire reported. Verify ignition secondary voltage coil outputs and fuel injection pulse widths." },
      { type: "text", text: "CODE P0171 - System Too Lean Bank 1. Clear carbon build-up on MAF sensor grids and test structural intake boot seals." },
      { type: "text", text: "CODE P0420 - Catalytic Converter Efficiency Below Threshold. Check rear oxygen sensor heater resistances." }
    ]
  }
};
