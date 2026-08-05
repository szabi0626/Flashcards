/*
 * GENERÁLT FÁJL — NE SZERKESZD KÉZZEL.
 *
 * Forrás: Wargaming World of Tanks API (encyclopedia/vehicles +
 * encyclopedia/vehicleprofile), EU szerver.
 * Lekérve: 2026-08-05
 *
 * Minden szám itt a JÁTÉK ALAPÉRTÉKE: nincs benne legénységi képzettség,
 * felszerelés (döngölő, szellőzés) vagy fogyóeszköz. A saját tankod ezért
 * jobb számokat mutat a garázsban — az ellenfél megítéléséhez viszont ez a
 * helyes kiindulás.
 *
 * A páncél itt NOMINÁLIS vastagság. A dőlésszögek, effektív értékek és
 * gyenge pontok kézi adatok: lásd js/armor-zones.js
 */

const TANKS = [
  {
    id: "is-3",
    tankId: 5377,
    name: "IS-3",
    nation: "ussr", nationHu: "Szovjet", flag: "🇷🇺",
    tier: 8, type: "heavyTank", typeHu: "Nehéz harckocsi",
    isPremium: false,
    image: "img/is-3.png",

    hp: 1650,
    weight: 49.1,
    armor: {
      hull:   { front: 110, sides: 90, rear: 60 },
      turret: { front: 249, sides: 172, rear: 100 },
    },
    mobility: {
      topSpeed: 45, reverse: 15,
      enginePower: 800, hpPerTon: 16.3,
      turretTraverse: 26, hullTraverse: 36,
    },
    vision: {
      viewRange: 370,
    },

    guns: [
      {
        name: "122 mm D-25T (IS-3)", caliber: 122, stock: true, xp: 0,
        alpha: 390, penAP: 196,
        penPrem: 225, premType: "APCR",
        penHE: 61, alphaHE: 530,
        reload: 12.3, dpm: 1903,
        accuracy: 0.42, aimTime: 3.4,
        depression: -5, elevation: 23,
      },
      {
        name: "122 mm BL-9 (IS-3)", caliber: 122, stock: false, xp: 44000,
        alpha: 390, penAP: 225,
        penPrem: 265, premType: "APCR",
        penHE: 68, alphaHE: 530,
        reload: 13.3, dpm: 1759,
        accuracy: 0.4, aimTime: 3.0,
        depression: -5, elevation: 23,
      },
    ],
  },
  {
    id: "tiger-ii",
    tankId: 5137,
    name: "Tiger II",
    nation: "germany", nationHu: "Német", flag: "🇩🇪",
    tier: 8, type: "heavyTank", typeHu: "Nehéz harckocsi",
    isPremium: false,
    image: "img/tiger-ii.png",

    hp: 1800,
    weight: 70.9,
    armor: {
      hull:   { front: 160, sides: 80, rear: 80 },
      turret: { front: 245, sides: 120, rear: 80 },
    },
    mobility: {
      topSpeed: 38, reverse: 12,
      enginePower: 900, hpPerTon: 12.7,
      turretTraverse: 27, hullTraverse: 32,
    },
    vision: {
      viewRange: 390,
    },

    guns: [
      {
        name: "8.8 cm Kw.K. 43 L/71 Ausf. E", caliber: 88, stock: true, xp: 0,
        alpha: 280, penAP: 218,
        penPrem: 251, premType: "APCR",
        penHE: 44, alphaHE: 370,
        reload: 7.0, dpm: 2400,
        accuracy: 0.3, aimTime: 1.8,
        depression: -8, elevation: 15,
      },
      {
        name: "10.5 cm Kw.K. L/68 Ausf. B", caliber: 105, stock: false, xp: 46000,
        alpha: 360, penAP: 225,
        penPrem: 285, premType: "APCR",
        penHE: 60, alphaHE: 440,
        reload: 10.4, dpm: 2077,
        accuracy: 0.31, aimTime: 2.3,
        depression: -8, elevation: 15,
      },
    ],
  },
  {
    id: "t32",
    tankId: 4385,
    name: "T32",
    nation: "usa", nationHu: "Amerikai", flag: "🇺🇸",
    tier: 8, type: "heavyTank", typeHu: "Nehéz harckocsi",
    isPremium: false,
    image: "img/t32.png",

    hp: 1650,
    weight: 57.5,
    armor: {
      hull:   { front: 127, sides: 76, rear: 51 },
      turret: { front: 298, sides: 197, rear: 152 },
    },
    mobility: {
      topSpeed: 35, reverse: 14,
      enginePower: 865, hpPerTon: 15.0,
      turretTraverse: 25, hullTraverse: 29,
    },
    vision: {
      viewRange: 390,
    },

    guns: [
      {
        name: "90 mm Gun T15E2", caliber: 90, stock: true, xp: 0,
        alpha: 240, penAP: 198,
        penPrem: 258, premType: "APCR",
        penHE: 45, alphaHE: 320,
        reload: 6.7, dpm: 2150,
        accuracy: 0.36, aimTime: 1.8,
        depression: -10, elevation: 20,
      },
      {
        name: "105 mm Gun T5E1/45", caliber: 105, stock: false, xp: 18100,
        alpha: 320, penAP: 218,
        penPrem: 252, premType: "APCR",
        penHE: 53, alphaHE: 420,
        reload: 9.0, dpm: 2134,
        accuracy: 0.38, aimTime: 1.9,
        depression: -10, elevation: 20,
      },
    ],
  },
  {
    id: "t-44",
    tankId: 4353,
    name: "T-44",
    nation: "ussr", nationHu: "Szovjet", flag: "🇷🇺",
    tier: 8, type: "mediumTank", typeHu: "Közepes harckocsi",
    isPremium: false,
    image: "img/t-44.png",

    hp: 1450,
    weight: 34.2,
    armor: {
      hull:   { front: 105, sides: 75, rear: 45 },
      turret: { front: 200, sides: 130, rear: 100 },
    },
    mobility: {
      topSpeed: 56, reverse: 23,
      enginePower: 730, hpPerTon: 21.4,
      turretTraverse: 48, hullTraverse: 56,
    },
    vision: {
      viewRange: 380,
    },

    guns: [
      {
        name: "85 mm ZiS-S-53", caliber: 85, stock: true, xp: 0,
        alpha: 220, penAP: 198,
        penPrem: 245, premType: "APCR",
        penHE: 44, alphaHE: 300,
        reload: 6.0, dpm: 2200,
        accuracy: 0.34, aimTime: 2.1,
        depression: -7, elevation: 25,
      },
      {
        name: "100 mm LB-1", caliber: 100, stock: false, xp: 19100,
        alpha: 250, penAP: 215,
        penPrem: 267, premType: "APCR",
        penHE: 50, alphaHE: 330,
        reload: 6.8, dpm: 2205,
        accuracy: 0.35, aimTime: 2.1,
        depression: -7, elevation: 23,
      },
      {
        name: "122 mm D-25-44T", caliber: 122, stock: false, xp: 26700,
        alpha: 390, penAP: 175,
        penPrem: 217, premType: "APCR",
        penHE: 61, alphaHE: 530,
        reload: 13.0, dpm: 1802,
        accuracy: 0.4, aimTime: 3.0,
        depression: -5, elevation: 23,
      },
    ],
  },
  {
    id: "amx-50-100",
    tankId: 3137,
    name: "AMX 50 100",
    nation: "france", nationHu: "Francia", flag: "🇫🇷",
    tier: 8, type: "heavyTank", typeHu: "Nehéz harckocsi",
    isPremium: false,
    image: "img/amx-50-100.png",

    hp: 1600,
    weight: 49.9,
    armor: {
      hull:   { front: 90, sides: 35, rear: 30 },
      turret: { front: 90, sides: 30, rear: 30 },
    },
    mobility: {
      topSpeed: 55, reverse: 20,
      enginePower: 920, hpPerTon: 18.4,
      turretTraverse: 32, hullTraverse: 52,
    },
    vision: {
      viewRange: 380,
    },

    guns: [
      {
        name: "90 mm DCA 45 (50 100)", caliber: 90, stock: true, xp: 0,
        alpha: 280, penAP: 224,
        penPrem: 259, premType: "APCR",
        penHE: 45, alphaHE: 370,
        reload: 43.0, dpm: 1817,
        accuracy: 0.36, aimTime: 2.5,
        depression: -9, elevation: 13,
      },
      {
        name: "100 mm SA47 (50 100)", caliber: 100, stock: false, xp: 34500,
        alpha: 300, penAP: 232,
        penPrem: 263, premType: "APCR",
        penHE: 50, alphaHE: 400,
        reload: 43.0, dpm: 1947,
        accuracy: 0.36, aimTime: 2.5,
        depression: -9, elevation: 13,
      },
    ],
  },
];

if (typeof window !== "undefined") window.TANKS = TANKS;
if (typeof module !== "undefined") module.exports = { TANKS };
