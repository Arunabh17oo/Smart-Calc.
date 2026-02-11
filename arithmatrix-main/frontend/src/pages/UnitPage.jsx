import { useEffect, useMemo, useState } from 'react';

const GROUPS = [
  { id: 'basic', label: 'Basic Units' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'weight', label: 'Weight / Mass' },
  { id: 'compound', label: 'Compound Units' }
];

const CATEGORIES = [
  {
    id: 'length',
    group: 'basic',
    label: 'Length',
    units: [
      { id: 'mm', label: 'Millimeter (mm)', toBase: 0.001 },
      { id: 'cm', label: 'Centimeter (cm)', toBase: 0.01 },
      { id: 'm', label: 'Meter (m)', toBase: 1 },
      { id: 'km', label: 'Kilometer (km)', toBase: 1000 },
      { id: 'in', label: 'Inch (in)', toBase: 0.0254 },
      { id: 'ft', label: 'Foot (ft)', toBase: 0.3048 },
      { id: 'yd', label: 'Yard (yd)', toBase: 0.9144 },
      { id: 'mi', label: 'Mile (mi)', toBase: 1609.344 },
      { id: 'nmi', label: 'Nautical Mile (nmi)', toBase: 1852 }
    ]
  },
  {
    id: 'area',
    group: 'basic',
    label: 'Area',
    units: [
      { id: 'mm2', label: 'Square Millimeter (mm^2)', toBase: 0.000001 },
      { id: 'cm2', label: 'Square Centimeter (cm^2)', toBase: 0.0001 },
      { id: 'm2', label: 'Square Meter (m^2)', toBase: 1 },
      { id: 'km2', label: 'Square Kilometer (km^2)', toBase: 1000000 },
      { id: 'in2', label: 'Square Inch (in^2)', toBase: 0.00064516 },
      { id: 'ft2', label: 'Square Foot (ft^2)', toBase: 0.09290304 },
      { id: 'acre', label: 'Acre (ac)', toBase: 4046.8564224 },
      { id: 'hectare', label: 'Hectare (ha)', toBase: 10000 }
    ]
  },
  {
    id: 'volume',
    group: 'basic',
    label: 'Volume',
    units: [
      { id: 'ml', label: 'Milliliter (mL)', toBase: 0.001 },
      { id: 'l', label: 'Liter (L)', toBase: 1 },
      { id: 'm3', label: 'Cubic Meter (m^3)', toBase: 1000 },
      { id: 'tsp', label: 'Teaspoon (US tsp)', toBase: 0.00492892159375 },
      { id: 'tbsp', label: 'Tablespoon (US tbsp)', toBase: 0.01478676478125 },
      { id: 'cup', label: 'Cup (US cup)', toBase: 0.2365882365 },
      { id: 'pt', label: 'Pint (US pt)', toBase: 0.473176473 },
      { id: 'gal', label: 'Gallon (US gal)', toBase: 3.785411784 }
    ]
  },
  {
    id: 'time',
    group: 'basic',
    label: 'Time',
    units: [
      { id: 'ms', label: 'Millisecond (ms)', toBase: 0.001 },
      { id: 's', label: 'Second (s)', toBase: 1 },
      { id: 'min', label: 'Minute (min)', toBase: 60 },
      { id: 'hr', label: 'Hour (h)', toBase: 3600 },
      { id: 'day', label: 'Day (d)', toBase: 86400 },
      { id: 'week', label: 'Week (wk)', toBase: 604800 }
    ]
  },
  {
    id: 'temperature',
    group: 'temperature',
    label: 'Temperature',
    kind: 'temperature',
    units: [
      {
        id: 'c',
        label: 'Celsius (deg C)',
        toKelvin: (value) => value + 273.15,
        fromKelvin: (kelvin) => kelvin - 273.15
      },
      {
        id: 'f',
        label: 'Fahrenheit (deg F)',
        toKelvin: (value) => ((value - 32) * 5) / 9 + 273.15,
        fromKelvin: (kelvin) => ((kelvin - 273.15) * 9) / 5 + 32
      },
      {
        id: 'k',
        label: 'Kelvin (K)',
        toKelvin: (value) => value,
        fromKelvin: (kelvin) => kelvin
      },
      {
        id: 'r',
        label: 'Rankine (deg R)',
        toKelvin: (value) => value * (5 / 9),
        fromKelvin: (kelvin) => kelvin * (9 / 5)
      }
    ]
  },
  {
    id: 'mass',
    group: 'weight',
    label: 'Weight / Mass',
    units: [
      { id: 'mg', label: 'Milligram (mg)', toBase: 0.000001 },
      { id: 'g', label: 'Gram (g)', toBase: 0.001 },
      { id: 'kg', label: 'Kilogram (kg)', toBase: 1 },
      { id: 'tonne', label: 'Metric Ton (t)', toBase: 1000 },
      { id: 'oz', label: 'Ounce (oz)', toBase: 0.028349523125 },
      { id: 'lb', label: 'Pound (lb)', toBase: 0.45359237 },
      { id: 'st', label: 'Stone (st)', toBase: 6.35029318 },
      { id: 'short-ton', label: 'Short Ton (US ton)', toBase: 907.18474 },
      { id: 'long-ton', label: 'Long Ton (UK ton)', toBase: 1016.0469088 }
    ]
  },
  {
    id: 'speed',
    group: 'compound',
    label: 'Speed',
    units: [
      { id: 'mps', label: 'Meter/Second (m/s)', toBase: 1 },
      { id: 'kmph', label: 'Kilometer/Hour (km/h)', toBase: 0.2777777777778 },
      { id: 'mph', label: 'Mile/Hour (mph)', toBase: 0.44704 },
      { id: 'knot', label: 'Knot (kn)', toBase: 0.5144444444444 },
      { id: 'fps', label: 'Foot/Second (ft/s)', toBase: 0.3048 }
    ]
  },
  {
    id: 'acceleration',
    group: 'compound',
    label: 'Acceleration',
    units: [
      { id: 'mps2', label: 'Meter/Second^2 (m/s^2)', toBase: 1 },
      { id: 'fps2', label: 'Foot/Second^2 (ft/s^2)', toBase: 0.3048 },
      { id: 'g0', label: 'Standard Gravity (g)', toBase: 9.80665 }
    ]
  },
  {
    id: 'force',
    group: 'compound',
    label: 'Force',
    units: [
      { id: 'newton', label: 'Newton (N)', toBase: 1 },
      { id: 'kilonewton', label: 'Kilonewton (kN)', toBase: 1000 },
      { id: 'pound-force', label: 'Pound-force (lbf)', toBase: 4.4482216152605 },
      { id: 'dyne', label: 'Dyne (dyn)', toBase: 0.00001 }
    ]
  },
  {
    id: 'pressure',
    group: 'compound',
    label: 'Pressure',
    units: [
      { id: 'pa', label: 'Pascal (Pa)', toBase: 1 },
      { id: 'kpa', label: 'Kilopascal (kPa)', toBase: 1000 },
      { id: 'bar', label: 'Bar (bar)', toBase: 100000 },
      { id: 'atm', label: 'Atmosphere (atm)', toBase: 101325 },
      { id: 'psi', label: 'PSI (psi)', toBase: 6894.7572931684 },
      { id: 'torr', label: 'Torr (Torr)', toBase: 133.3223684211 }
    ]
  },
  {
    id: 'energy',
    group: 'compound',
    label: 'Energy',
    units: [
      { id: 'j', label: 'Joule (J)', toBase: 1 },
      { id: 'kj', label: 'Kilojoule (kJ)', toBase: 1000 },
      { id: 'cal', label: 'Calorie (cal)', toBase: 4.184 },
      { id: 'kcal', label: 'Kilocalorie (kcal)', toBase: 4184 },
      { id: 'wh', label: 'Watt-hour (Wh)', toBase: 3600 },
      { id: 'kwh', label: 'Kilowatt-hour (kWh)', toBase: 3600000 },
      { id: 'btu', label: 'BTU (IT)', toBase: 1055.05585262 }
    ]
  },
  {
    id: 'power',
    group: 'compound',
    label: 'Power',
    units: [
      { id: 'w', label: 'Watt (W)', toBase: 1 },
      { id: 'kw', label: 'Kilowatt (kW)', toBase: 1000 },
      { id: 'mw', label: 'Megawatt (MW)', toBase: 1000000 },
      { id: 'hp', label: 'Horsepower (hp)', toBase: 745.6998715823 },
      { id: 'btuph', label: 'BTU/hour (BTU/h)', toBase: 0.29307107 }
    ]
  },
  {
    id: 'density',
    group: 'compound',
    label: 'Density',
    units: [
      { id: 'kgm3', label: 'Kilogram/Cubic meter (kg/m^3)', toBase: 1 },
      { id: 'gcm3', label: 'Gram/Cubic centimeter (g/cm^3)', toBase: 1000 },
      { id: 'lbft3', label: 'Pound/Cubic foot (lb/ft^3)', toBase: 16.01846337396 },
      { id: 'lbin3', label: 'Pound/Cubic inch (lb/in^3)', toBase: 27679.9047102 }
    ]
  },
  {
    id: 'torque',
    group: 'compound',
    label: 'Torque',
    units: [
      { id: 'nm', label: 'Newton-meter (N*m)', toBase: 1 },
      { id: 'ftlb', label: 'Foot-pound force (ft*lbf)', toBase: 1.3558179483314 },
      { id: 'inlb', label: 'Inch-pound force (in*lbf)', toBase: 0.1129848290276 }
    ]
  }
];

const CONSTANT_FILTERS = [
  { id: 'all', label: 'All Constants' },
  { id: 'math', label: 'Math' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'quantum', label: 'Quantum + Atomic' },
  { id: 'electromagnetic', label: 'Electromagnetic' },
  { id: 'thermo', label: 'Thermo' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'astro', label: 'Astronomy + Earth' },
  { id: 'standards', label: 'Standards' }
];

const WORLD_CONSTANTS = [
  {
    id: 'pi',
    group: 'math',
    title: 'Pi',
    symbol: 'pi',
    value: '3.141592653589793',
    unit: 'unitless',
    details: 'Circle circumference to diameter ratio.'
  },
  {
    id: 'euler-number',
    group: 'math',
    title: 'Euler Number',
    symbol: 'e',
    value: '2.718281828459045',
    unit: 'unitless',
    details: 'Natural logarithm base.'
  },
  {
    id: 'golden-ratio',
    group: 'math',
    title: 'Golden Ratio',
    symbol: 'phi',
    value: '1.618033988749895',
    unit: 'unitless',
    details: 'Appears in geometry and growth patterns.'
  },
  {
    id: 'sqrt2',
    group: 'math',
    title: 'Square Root of 2',
    symbol: 'sqrt(2)',
    value: '1.4142135623730951',
    unit: 'unitless',
    details: 'Diagonal of a unit square.'
  },
  {
    id: 'ln2',
    group: 'math',
    title: 'Natural Log of 2',
    symbol: 'ln(2)',
    value: '0.6931471805599453',
    unit: 'unitless',
    details: 'Used in half-life and information theory.'
  },
  {
    id: 'speed-of-light',
    group: 'fundamental',
    title: 'Speed of Light',
    symbol: 'c',
    value: '299792458',
    unit: 'm/s',
    details: 'Exact in vacuum.'
  },
  {
    id: 'gravitational-constant',
    group: 'fundamental',
    title: 'Gravitational Constant',
    symbol: 'G',
    value: '6.67430e-11',
    unit: 'm^3/(kg*s^2)',
    details: 'Newtonian gravity constant.'
  },
  {
    id: 'planck-constant',
    group: 'fundamental',
    title: 'Planck Constant',
    symbol: 'h',
    value: '6.62607015e-34',
    unit: 'J*s',
    details: 'Exact SI-defining constant.'
  },
  {
    id: 'reduced-planck',
    group: 'fundamental',
    title: 'Reduced Planck Constant',
    symbol: 'hbar',
    value: '1.054571817e-34',
    unit: 'J*s',
    details: 'h/(2*pi).'
  },
  {
    id: 'elementary-charge',
    group: 'fundamental',
    title: 'Elementary Charge',
    symbol: 'e',
    value: '1.602176634e-19',
    unit: 'C',
    details: 'Exact SI-defining constant.'
  },
  {
    id: 'planck-length',
    group: 'fundamental',
    title: 'Planck Length',
    symbol: 'lP',
    value: '1.616255e-35',
    unit: 'm',
    details: 'Derived Planck scale length.'
  },
  {
    id: 'planck-time',
    group: 'fundamental',
    title: 'Planck Time',
    symbol: 'tP',
    value: '5.391247e-44',
    unit: 's',
    details: 'Derived Planck scale time.'
  },
  {
    id: 'planck-mass',
    group: 'fundamental',
    title: 'Planck Mass',
    symbol: 'mP',
    value: '2.176434e-8',
    unit: 'kg',
    details: 'Derived Planck scale mass.'
  },
  {
    id: 'planck-temperature',
    group: 'fundamental',
    title: 'Planck Temperature',
    symbol: 'TP',
    value: '1.416784e32',
    unit: 'K',
    details: 'Derived Planck scale temperature.'
  },
  {
    id: 'electron-mass',
    group: 'quantum',
    title: 'Electron Mass',
    symbol: 'me',
    value: '9.1093837015e-31',
    unit: 'kg',
    details: 'Rest mass of electron.'
  },
  {
    id: 'proton-mass',
    group: 'quantum',
    title: 'Proton Mass',
    symbol: 'mp',
    value: '1.67262192369e-27',
    unit: 'kg',
    details: 'Rest mass of proton.'
  },
  {
    id: 'neutron-mass',
    group: 'quantum',
    title: 'Neutron Mass',
    symbol: 'mn',
    value: '1.67492749804e-27',
    unit: 'kg',
    details: 'Rest mass of neutron.'
  },
  {
    id: 'atomic-mass-unit',
    group: 'quantum',
    title: 'Unified Atomic Mass Unit',
    symbol: 'u',
    value: '1.66053906660e-27',
    unit: 'kg',
    details: '1/12 mass of carbon-12 atom.'
  },
  {
    id: 'bohr-radius',
    group: 'quantum',
    title: 'Bohr Radius',
    symbol: 'a0',
    value: '5.29177210903e-11',
    unit: 'm',
    details: 'Hydrogen ground-state scale.'
  },
  {
    id: 'rydberg-constant',
    group: 'quantum',
    title: 'Rydberg Constant',
    symbol: 'Rinf',
    value: '10973731.568160',
    unit: '1/m',
    details: 'Hydrogen spectral constant.'
  },
  {
    id: 'bohr-magneton',
    group: 'quantum',
    title: 'Bohr Magneton',
    symbol: 'muB',
    value: '9.2740100783e-24',
    unit: 'J/T',
    details: 'Electron magnetic moment unit.'
  },
  {
    id: 'nuclear-magneton',
    group: 'quantum',
    title: 'Nuclear Magneton',
    symbol: 'muN',
    value: '5.0507837461e-27',
    unit: 'J/T',
    details: 'Nuclear magnetic moment unit.'
  },
  {
    id: 'electron-volt',
    group: 'quantum',
    title: 'Electron Volt',
    symbol: 'eV',
    value: '1.602176634e-19',
    unit: 'J',
    details: 'Energy gained by one electron through 1 volt.'
  },
  {
    id: 'fine-structure',
    group: 'electromagnetic',
    title: 'Fine Structure Constant',
    symbol: 'alpha',
    value: '7.2973525693e-3',
    unit: 'unitless',
    details: 'Fundamental EM coupling strength.'
  },
  {
    id: 'vacuum-permittivity',
    group: 'electromagnetic',
    title: 'Vacuum Permittivity',
    symbol: 'epsilon0',
    value: '8.8541878128e-12',
    unit: 'F/m',
    details: 'Electric constant in vacuum.'
  },
  {
    id: 'vacuum-permeability',
    group: 'electromagnetic',
    title: 'Vacuum Permeability',
    symbol: 'mu0',
    value: '1.25663706212e-6',
    unit: 'N/A^2',
    details: 'Magnetic constant in vacuum.'
  },
  {
    id: 'coulomb-constant',
    group: 'electromagnetic',
    title: 'Coulomb Constant',
    symbol: 'ke',
    value: '8.9875517923e9',
    unit: 'N*m^2/C^2',
    details: 'Electrostatic force constant.'
  },
  {
    id: 'quantum-conductance',
    group: 'electromagnetic',
    title: 'Quantum of Conductance',
    symbol: 'G0',
    value: '7.748091729e-5',
    unit: 'S',
    details: 'Conductance quantum 2e^2/h.'
  },
  {
    id: 'boltzmann-constant',
    group: 'thermo',
    title: 'Boltzmann Constant',
    symbol: 'kB',
    value: '1.380649e-23',
    unit: 'J/K',
    details: 'Exact SI-defining constant.'
  },
  {
    id: 'gas-constant',
    group: 'thermo',
    title: 'Universal Gas Constant',
    symbol: 'R',
    value: '8.314462618',
    unit: 'J/(mol*K)',
    details: 'Ideal gas law constant.'
  },
  {
    id: 'stefan-boltzmann',
    group: 'thermo',
    title: 'Stefan-Boltzmann Constant',
    symbol: 'sigma',
    value: '5.670374419e-8',
    unit: 'W/(m^2*K^4)',
    details: 'Black-body radiated power constant.'
  },
  {
    id: 'faraday-constant',
    group: 'thermo',
    title: 'Faraday Constant',
    symbol: 'F',
    value: '96485.33212',
    unit: 'C/mol',
    details: 'Charge per mole of electrons.'
  },
  {
    id: 'standard-gravity',
    group: 'thermo',
    title: 'Standard Gravity',
    symbol: 'g0',
    value: '9.80665',
    unit: 'm/s^2',
    details: 'Conventional reference gravity.'
  },
  {
    id: 'standard-atmosphere',
    group: 'thermo',
    title: 'Standard Atmosphere',
    symbol: 'atm',
    value: '101325',
    unit: 'Pa',
    details: 'Standard pressure.'
  },
  {
    id: 'zero-celsius-kelvin',
    group: 'thermo',
    title: 'Zero Celsius in Kelvin',
    symbol: 'T0',
    value: '273.15',
    unit: 'K',
    details: 'Offset between Celsius and Kelvin.'
  },
  {
    id: 'water-triple-point',
    group: 'thermo',
    title: 'Water Triple Point',
    symbol: 'Ttriple',
    value: '273.16',
    unit: 'K',
    details: 'Water solid-liquid-vapor equilibrium point.'
  },
  {
    id: 'water-boiling',
    group: 'thermo',
    title: 'Water Boiling Point at 1 atm',
    symbol: 'Tb',
    value: '373.15',
    unit: 'K',
    details: 'Approximate reference at standard pressure.'
  },
  {
    id: 'avogadro-constant',
    group: 'chemistry',
    title: 'Avogadro Constant',
    symbol: 'NA',
    value: '6.02214076e23',
    unit: '1/mol',
    details: 'Exact SI-defining constant.'
  },
  {
    id: 'molar-volume-stp',
    group: 'chemistry',
    title: 'Ideal Gas Molar Volume at STP',
    symbol: 'Vm',
    value: '22.41396954',
    unit: 'L/mol',
    details: 'At 273.15 K and 1 atm.'
  },
  {
    id: 'loschmidt-constant',
    group: 'chemistry',
    title: 'Loschmidt Constant',
    symbol: 'n0',
    value: '2.686780111e25',
    unit: '1/m^3',
    details: 'Number density of ideal gas at STP.'
  },
  {
    id: 'molar-mass-constant',
    group: 'chemistry',
    title: 'Molar Mass Constant',
    symbol: 'Mu',
    value: '1e-3',
    unit: 'kg/mol',
    details: 'Conventional molar mass constant.'
  },
  {
    id: 'water-density',
    group: 'chemistry',
    title: 'Water Density at 25 C',
    symbol: 'rhoH2O',
    value: '997',
    unit: 'kg/m^3',
    details: 'Approximate room-temperature value.'
  },
  {
    id: 'water-specific-heat',
    group: 'chemistry',
    title: 'Water Specific Heat',
    symbol: 'cpH2O',
    value: '4184',
    unit: 'J/(kg*K)',
    details: 'Approximate around room temperature.'
  },
  {
    id: 'astronomical-unit',
    group: 'astro',
    title: 'Astronomical Unit',
    symbol: 'AU',
    value: '149597870700',
    unit: 'm',
    details: 'Exact Earth-Sun distance standard.'
  },
  {
    id: 'light-year',
    group: 'astro',
    title: 'Light Year',
    symbol: 'ly',
    value: '9.4607304725808e15',
    unit: 'm',
    details: 'Distance light travels in one Julian year.'
  },
  {
    id: 'parsec',
    group: 'astro',
    title: 'Parsec',
    symbol: 'pc',
    value: '3.085677581491367e16',
    unit: 'm',
    details: 'Astronomical distance unit.'
  },
  {
    id: 'solar-mass',
    group: 'astro',
    title: 'Solar Mass',
    symbol: 'Msun',
    value: '1.98847e30',
    unit: 'kg',
    details: 'Mass of the Sun.'
  },
  {
    id: 'solar-luminosity',
    group: 'astro',
    title: 'Solar Luminosity',
    symbol: 'Lsun',
    value: '3.828e26',
    unit: 'W',
    details: 'Power emitted by the Sun.'
  },
  {
    id: 'earth-mass',
    group: 'astro',
    title: 'Earth Mass',
    symbol: 'Mearth',
    value: '5.9722e24',
    unit: 'kg',
    details: 'Mass of Earth.'
  },
  {
    id: 'earth-radius',
    group: 'astro',
    title: 'Earth Mean Radius',
    symbol: 'Rearth',
    value: '6371000',
    unit: 'm',
    details: 'Mean Earth radius.'
  },
  {
    id: 'earth-surface-area',
    group: 'astro',
    title: 'Earth Surface Area',
    symbol: 'Aearth',
    value: '5.10072e14',
    unit: 'm^2',
    details: 'Approximate total Earth surface area.'
  },
  {
    id: 'earth-escape-velocity',
    group: 'astro',
    title: 'Earth Escape Velocity',
    symbol: 'vesc',
    value: '11186',
    unit: 'm/s',
    details: 'Escape speed near Earth surface.'
  },
  {
    id: 'moon-mass',
    group: 'astro',
    title: 'Moon Mass',
    symbol: 'Mmoon',
    value: '7.342e22',
    unit: 'kg',
    details: 'Mass of Earth moon.'
  },
  {
    id: 'mean-earth-moon-distance',
    group: 'astro',
    title: 'Mean Earth-Moon Distance',
    symbol: 'Dmoon',
    value: '384400000',
    unit: 'm',
    details: 'Average orbital distance.'
  },
  {
    id: 'inch-standard',
    group: 'standards',
    title: 'International Inch',
    symbol: 'in',
    value: '0.0254',
    unit: 'm',
    details: 'Exact conversion standard.'
  },
  {
    id: 'foot-standard',
    group: 'standards',
    title: 'International Foot',
    symbol: 'ft',
    value: '0.3048',
    unit: 'm',
    details: 'Exact conversion standard.'
  },
  {
    id: 'pound-standard',
    group: 'standards',
    title: 'International Pound',
    symbol: 'lb',
    value: '0.45359237',
    unit: 'kg',
    details: 'Exact conversion standard.'
  },
  {
    id: 'nautical-mile-standard',
    group: 'standards',
    title: 'Nautical Mile',
    symbol: 'nmi',
    value: '1852',
    unit: 'm',
    details: 'Exact navigation standard.'
  },
  {
    id: 'calorie-standard',
    group: 'standards',
    title: 'Thermochemical Calorie',
    symbol: 'cal',
    value: '4.184',
    unit: 'J',
    details: 'Conventional heat-energy conversion.'
  },
  {
    id: 'electron-charge-per-mole',
    group: 'standards',
    title: 'Charge of One Mole of Electrons',
    symbol: '1 mol e-',
    value: '96485.33212',
    unit: 'C',
    details: 'Equivalent to Faraday constant.'
  }
];

function convertValue(category, value, fromUnit, toUnit) {
  if (category.kind === 'temperature') {
    const kelvin = fromUnit.toKelvin(value);
    return toUnit.fromKelvin(kelvin);
  }

  return (value * fromUnit.toBase) / toUnit.toBase;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '';

  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1000000000 || abs < 0.000001)) {
    return value.toExponential(8);
  }

  const rounded = Number(value.toFixed(10));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function UnitPage() {
  const [group, setGroup] = useState('basic');
  const [amount, setAmount] = useState('1');
  const [categoryId, setCategoryId] = useState('length');
  const [fromUnitId, setFromUnitId] = useState('m');
  const [toUnitId, setToUnitId] = useState('km');
  const [constantFilter, setConstantFilter] = useState('all');
  const [constantQuery, setConstantQuery] = useState('');

  const categoriesInGroup = useMemo(
    () => CATEGORIES.filter((category) => category.group === group),
    [group]
  );

  useEffect(() => {
    if (!categoriesInGroup.length) return;
    setCategoryId((prev) => {
      const exists = categoriesInGroup.some((category) => category.id === prev);
      return exists ? prev : categoriesInGroup[0].id;
    });
  }, [categoriesInGroup]);

  const category = useMemo(() => {
    const active = categoriesInGroup.find((entry) => entry.id === categoryId);
    return active || categoriesInGroup[0] || CATEGORIES[0];
  }, [categoriesInGroup, categoryId]);

  useEffect(() => {
    const firstUnit = category.units[0];
    const secondUnit = category.units[1] || category.units[0];
    setFromUnitId(firstUnit.id);
    setToUnitId(secondUnit.id);
  }, [category.id]);

  const fromUnit = useMemo(
    () => category.units.find((unit) => unit.id === fromUnitId) || category.units[0],
    [category.units, fromUnitId]
  );
  const toUnit = useMemo(
    () => category.units.find((unit) => unit.id === toUnitId) || category.units[1] || category.units[0],
    [category.units, toUnitId]
  );

  const conversion = useMemo(() => {
    const trimmedAmount = String(amount || '').trim();
    if (!trimmedAmount) {
      return { value: '', error: '' };
    }

    const numericAmount = Number(trimmedAmount);
    if (!Number.isFinite(numericAmount)) {
      return { value: '', error: 'Please enter a valid number.' };
    }

    const convertedValue = convertValue(category, numericAmount, fromUnit, toUnit);
    if (!Number.isFinite(convertedValue)) {
      return { value: '', error: 'Result is out of range.' };
    }

    return { value: formatNumber(convertedValue), error: '' };
  }, [amount, category, fromUnit, toUnit]);

  const filteredConstants = useMemo(() => {
    const query = constantQuery.trim().toLowerCase();

    return WORLD_CONSTANTS.filter((constant) => {
      if (constantFilter !== 'all' && constant.group !== constantFilter) return false;
      if (!query) return true;

      const searchString = `${constant.title} ${constant.symbol} ${constant.value} ${constant.unit} ${constant.details}`
        .toLowerCase();
      return searchString.includes(query);
    });
  }, [constantFilter, constantQuery]);

  function swapUnits() {
    setFromUnitId(toUnit.id);
    setToUnitId(fromUnit.id);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Unit Converter</h2>
      </div>

      <p className="hint-text">
        Separate conversion options for basic units, temperature, weight, and compound units.
      </p>

      <div className="filter-row">
        {GROUPS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`pill-btn ${group === entry.id ? 'pill-btn-active' : ''}`}
            onClick={() => setGroup(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label>
          Conversion Type
          <select
            className="text-input"
            value={category.id}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categoriesInGroup.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          From
          <select
            className="text-input"
            value={fromUnit.id}
            onChange={(event) => setFromUnitId(event.target.value)}
          >
            {category.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          To
          <select className="text-input" value={toUnit.id} onChange={(event) => setToUnitId(event.target.value)}>
            {category.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label htmlFor="unit-value" className="upload-label">
        Value
      </label>
      <input
        id="unit-value"
        className="text-input"
        type="number"
        step="any"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Enter value"
      />

      <div className="button-row">
        <button type="button" className="ghost-btn" onClick={swapUnits}>
          Swap Units
        </button>
      </div>

      {conversion.error ? <p className="error-text">{conversion.error}</p> : null}

      <div className="display-block">
        <p className="expression-line">
          {amount || '0'} {fromUnit.label}
        </p>
        <p className="result-line">
          {conversion.value ? `${conversion.value} ${toUnit.label}` : '--'}
        </p>
      </div>

      <section className="constants-section" aria-label="World constants">
        <div className="panel-row panel-row-space">
          <h3 className="constants-title">World Constants Board</h3>
          <span className="constants-count">{filteredConstants.length} notes</span>
        </div>

        <p className="hint-text constants-hint">
          Sticky-note view of common mathematical, scientific, astronomy, and standards constants.
        </p>

        <div className="filter-row">
          {CONSTANT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`pill-btn ${constantFilter === filter.id ? 'pill-btn-active' : ''}`}
              onClick={() => setConstantFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label htmlFor="constant-query" className="upload-label">
          Search Constants
        </label>
        <input
          id="constant-query"
          className="text-input constants-search-input"
          type="text"
          value={constantQuery}
          onChange={(event) => setConstantQuery(event.target.value)}
          placeholder="Search by name, symbol, value, or unit"
        />

        {!filteredConstants.length ? <p className="hint-text">No constants match your search.</p> : null}

        <div className="sticky-notes-grid">
          {filteredConstants.map((constant) => (
            <article className="sticky-note-card" key={constant.id}>
              <p className="sticky-note-symbol">{constant.symbol}</p>
              <h4>{constant.title}</h4>
              <p className="sticky-note-value">{constant.value}</p>
              <p className="sticky-note-unit">{constant.unit}</p>
              <p className="sticky-note-details">{constant.details}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
