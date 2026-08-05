// Minta adatok az app shell demonstrálásához.
// TODO: ezt a listát fogjuk feltölteni a teljes tank adatbázissal
// (páncélzat, fegyver statok, mobilitás stb.)

const TANKS = [
  {
    id: "is-7",
    name: "IS-7",
    nation: "USSR",
    tier: 10,
    type: "Nehéz harckocsi",
    stats: {
      "Életerő": "2350 HP",
      "Homlokpáncél (test)": "150 mm",
      "Homlokpáncél (torony)": "240 mm",
      "Lövedék sebzés": "490",
      "Páncéltörés": "252 mm",
      "Sebesség": "60 km/h",
    },
  },
  {
    id: "e100",
    name: "E 100",
    nation: "Germany",
    tier: 10,
    type: "Nehéz harckocsi",
    stats: {
      "Életerő": "2650 HP",
      "Homlokpáncél (test)": "150 mm",
      "Homlokpáncél (torony)": "250 mm",
      "Lövedék sebzés": "530",
      "Páncéltörés": "234 mm",
      "Sebesség": "40 km/h",
    },
  },
  {
    id: "t110e5",
    name: "T110E5",
    nation: "USA",
    tier: 10,
    type: "Nehéz harckocsi",
    stats: {
      "Életerő": "2350 HP",
      "Homlokpáncél (test)": "127 mm",
      "Homlokpáncél (torony)": "254 mm",
      "Lövedék sebzés": "400",
      "Páncéltörés": "252 mm",
      "Sebesség": "48 km/h",
    },
  },
];
