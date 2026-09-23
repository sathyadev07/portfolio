export const COPY = {
  "name": "SATHYA DEVARAJAN",
  "role": "// MECHANICAL DESIGN, STRUCTURES & DFM",
  "tagline": "",
  "about": "Hello, I'm Sathya! My depth thus far is in mechanical design, structural analysis, and design-for-manufacturing. I've machined drivetrain components for Purdue Electric Racing (PER--Formula SAE Electric) and designed production tooling for rotorcraft at Sikorsky, and I love when I can design a part and take it all the way from structural mechanics and optimization to GD&T to CAM to machining to finished product. From medevac helicopters at Sikorsky to electric vehicles at PER, I'm building my first principles skills to genuinely help people and planet. With that said, enjoy your space odyssey!",
  "contactHeading": "GET IN TOUCH",
  "contactBody": "",
  "email": "sathyadevarajan07@gmail.com",
  "phone": "630-888-0715",
  "phoneHref": "tel:6308880715",
  "linkedin": "https://linkedin.com/in/sathya-devarajan",
  "linkedinLabel": "linkedin.com/in/sathya-devarajan",
  "portfolioPdf": "assets/Portfolio_Compressed.pdf",
  "resumePdf": "assets/Resume.pdf",
  "status": ""
};

export const WORK = [
  {
    "id": "sikorsky",
    "title": "Tooling Design Intern",
    "company": "LOCKHEED MARTIN SIKORSKY",
    "period": "Jun 2026 — Aug 2026",
    "badge": "LOCKHEED MARTIN SIKORSKY",
    "logoType": "sikorsky",
    "tags": [
      "CATIA V5",
      "3DEXPERIENCE",
      "SAP ERP"
    ],
    "bullets": [
      "Designed & revised 14 production tooling fixtures & jigs (drill jigs, assembly locators, masking fixtures) in CATIA V5 for CH-53K, Black Hawk, & search-and-rescue rotorcraft; 3 now in use on shop floor; 11 in procurement & manufacturing",
      "Toleranced 12 tools to ASME Y14.5 GD&T, matching every callout to the process that would actually make the part (CNC milling, manual machining, or additive) rather than to a single default standard.Toleranced 12 tools to ASME Y14.5 GD&T, defining datum reference frames and profile/position callouts (±0.001 in. to ±0.015 in.) matched to CNC milling, manual machining, and additive processes",
      "Traced kinematic underconstraint and lack of sealing in 3 released production tools back to root cause; redesigned geometry to eliminate secondary mill setups and reduce vendor procurement lead time by 2 weeks",
      "Maintained multi-level BOMs for all 14 tools & routed engineering change orders through SAP ERP & 3DEXPERIENCE PLM, so manufacturing engineers & machinists worked from current tooling data across releases",
      "Led mechanical design on hybrid propulsion system intern project for rotor-blown Nomad VTOL; packaged ICE, motor generator, battery pack, & a dual motor & planetary gearbox 20% under 80 lb weight limits; presented to leadership"
    ],
    "stats": [
      {
        "label": "Tools Designed",
        "value": "14"
      },
      {
        "label": "In Production Use",
        "value": "3"
      },
      {
        "label": "ASME Y14.5 Tools",
        "value": "12"
      },
      {
        "label": "Root-Cause Redesigns",
        "value": "3"
      }
    ],
    "telemetryNote": {
      "title": "[TOOLING TELEMETRY]",
      "lines": [
        "CH-53K & Black Hawk Airframe Fixturing",
        "Nomad VTOL Planetary Gearbox Packaging"
      ]
    },
    "viewers": [
      {
        "id": "vtol-box",
        "title": "[3D Interactive Viewer: Nomad VTOL Planetary Gearbox Packaging CAD]",
        "type": "cad-fixture"
      },
      {
        "id": "sikorsky-fixture",
        "title": "[3D Interactive Assembly Viewer: CH-53K Airframe Drill Jig Fixture]",
        "type": "cad-upright"
      },
      {
        "id": "fea-tooling",
        "title": "[Simulation Model: Fixture Clamping Strain & Deflection FEA]",
        "type": "fea-stress"
      }
    ]
  },
  {
    "id": "fsae",
    "title": "Drivetrain Engineer",
    "company": "FORMULA SAE ELECTRIC",
    "period": "Aug 2025 — Present",
    "badge": "FORMULA SAE ELECTRIC",
    "logoType": "fsae",
    "tags": [
      "Siemens NX",
      "Ansys FEA",
      "5-Axis CNC"
    ],
    "bullets": [
      "Executed static structural FEA on the rear upright & hub group targeting SF 1.5; optimized rib topology & fillet radii against localized stress concentrations to reduce suspension bracket compliance from 0.079 in. to under 0.02 in.",
      "Ran static structural FEA on the rear upright and hub group, then reworked stiffener and fillet geometry against the stress peaks and 2 mm deflections it exposed, and pulled dead weight out of near-zero-stress areas",
      "Resolved stress propagation issues in Ansys via strain-energy study & first principles calculation; identified bonded contacts as an issue & switched to frictionless contacts on specific interfaces for correct stress propagation & deformation",
      "Ran mesh convergence studies to produce highest fidelity results on max cornering, accel, & combined tire contact patch cases to verify previous studies and geometry modifications",
      "Enhanced lumped-parameter battery thermal model accuracy by calculating effective thermal conductivities from empirical literature & test datasets, replacing uniform isotropic cell assumptions to increase thermal simulation fidelity",
      "Detailed 2D production drawings for rear upright assemblies, applying ISO P7 interference limits & ISO H8 transition fit on 3.937 in. & 4.528 in. nominal bearing seats (−0.0009 in./ − 0.0022 in. & +.002 in. / 0 in.) to maintain a press fit for SKF 61818 bearings across operating thermal ranges in 7075-T6 aluminum"
    ],
    "stats": [
      {
        "label": "Machining Time Cut",
        "value": "50%"
      },
      {
        "label": "Weight Reduction",
        "value": "32%"
      },
      {
        "label": "Bearing Tolerance",
        "value": "0.001\""
      }
    ],
    "viewers": [
      {
        "id": "upright-3d",
        "title": "[3D Interactive Viewer: 2027 Rear Wheel Upright CAD]",
        "type": "cad-upright"
      },
      {
        "id": "assembly-3d",
        "title": "[3D Interactive Viewer: 2027 Outrunner Drivetrain Assembly]",
        "type": "cad-fixture"
      },
      {
        "id": "fea-sim",
        "title": "[Simulation: Rear Upright & Hub Static Structural FEA Deformation]",
        "type": "fea-stress"
      }
    ]
  }
];

export const PROJECTS = [
  {
    "id": "proj-01",
    "projNumber": "PROJ-01",
    "title": "Custom Electric Bike Design",
    "period": "Oct 2025 — Present",
    "subtitle": "Parametric Frame & FEA",
    "summary": "Fully parametric frame assembly in Siemens NX tied to off-the-shelf tubing catalogs. Automated geometric updates for wheelbase, head angle, and chainstay dropouts.",
    "bullets": [
      "Built a fully parametric frame assembly in Siemens NX keyed to off-the-shelf tubing dimensions, so wheelbase, head angle, chainstay angle, and dropout geometry all update from a single set of driving inputs.",
      "Ran Ansys FEA on each candidate frame, swapping stock tube diameters and wall thicknesses through the parametric model to find the lightest combination that holds a 2.0 minimum safety factor under static load.",
      "Ran cost-versus-performance trade studies on motors, sprockets, and tubing alongside the FEA, converging on the cheapest catalog set that still meets the target safety factor and ride geometry, 9% under the first build cost."
    ],
    "tags": [
      "Siemens NX",
      "Ansys FEA",
      "Parametric CAD"
    ],
    "metricLabel": "Safety Factor",
    "metricValue": "SF: 2.0",
    "viewerType": "bike-frame",
    "viewerLabel": "frame assembly"
  },
  {
    "id": "proj-03",
    "projNumber": "PROJ-02",
    "title": "Surface Topography",
    "period": "Dec 2025 — Jan 2026",
    "subtitle": "3-Axis CAM Optimization",
    "summary": "Generated 3D organic relief mesh in Fusion 360 directly from 2D grayscale gradient heightmaps, optimizing toolpath continuity for automated CNC milling.",
    "bullets": [
      "Produced a 2D grayscale gradient heightmap from a source portrait photo.",
      "Built 3D mesh geometry from the heightmap in Fusion 360, keeping the organic topology machinable.",
      "Cut machining time 60% by reworking CAM toolpaths, holding surface detail with almost no hand rework."
    ],
    "tags": [
      "Fusion 360",
      "CAM / CNC"
    ],
    "metricLabel": "Cycle Time Reduction",
    "metricValue": "-60% Time",
    "viewerType": "cam-mesh",
    "viewerLabel": "[3D Interactive Viewer: Face Relief Mesh & CAM Surface Model]"
  },
  {
    "id": "proj-04",
    "projNumber": "PROJ-03",
    "title": "Analog Audio Equalizer",
    "period": "Apr 2026",
    "subtitle": "Active Filter Hardware",
    "summary": "Multi-stage analog active filter and amplifier circuitry designed to split, isolate, adjust, and recombine treble, mid, and bass frequency bands for custom audio curves.",
    "bullets": [
      "Designed schematic for an audio equalizer and amplifier to recombine adjusted treble, mid, and bass frequencies for customizable output.",
      "Troubleshot and validated breadboard circuit assembly via frequency generator, oscilloscope, and multimeter."
    ],
    "tags": [
      "LTSpice",
      "Breadboarding",
      "Analog Circuits"
    ],
    "metricLabel": "Architecture",
    "metricValue": "Active Filter",
    "viewerType": "analog-circuit",
    "viewerLabel": "[Interactive Circuit & Frequency Response Analyzer]",
    "engineeringSpecs": [
      {
        "label": "Band Splitting",
        "value": "Low (120Hz), Mid (1kHz), High (8kHz)"
      },
      {
        "label": "Gain Range",
        "value": "±12 dB per octave shelving"
      },
      {
        "label": "Signal-to-Noise",
        "value": "> 98 dB A-weighted"
      }
    ]
  },
  {
    "id": "proj-06",
    "projNumber": "PROJ-04",
    "title": "Smog Tower Feasibility & Simulation",
    "period": "Mar 2025",
    "subtitle": "Environmental Fluid Dynamics",
    "summary": "Evaluated large-scale environmental air cleaning towers for PM2.5/PM10 mitigation in Hong Kong under urban budgetary, airflow, and energetic constraints.",
    "bullets": [
      "Researched Studio Roosegaarde's Smog Free Tower concept and evaluated its feasibility for large-scale deployment to reduce PM2.5/PM10 air pollution in Hong Kong within realistic budget and practicality constraints.",
      "Built a low-fidelity Python simulation modeling individual particle motion to determine each tower's effective cleaning radius — the area where PM2.5/PM10 concentrations could be held at or below global health standards.",
      "Combined the simulation results with a scale-deployment feasibility analysis to conclude that city-wide deployment wasn't practical — a data-driven recommendation rather than a subjective call."
    ],
    "tags": [
      "Python",
      "Particle Simulation",
      "Trade Study"
    ],
    "metricLabel": "Study Outcome",
    "metricValue": "Trade Study",
    "viewerType": "smog-tower",
    "viewerLabel": "[Atmospheric Particle Plume Simulation & Tower Dynamics]"
  }
];

export const GALLERIES = {
  "fsae": [
    [
      "upright-wheel-cad-01.jpg",
      "2027 rear wheel drivetrain assembly"
    ],
    [
      "upright-fea.jpg",
      "Static structural FEA deformation result for rear upright and hub group"
    ],
    [
      "upright-cam-01-roughing.jpg",
      "CAM roughing setup for upright."
    ],
    [
      "upright-5axis-machined.jpg",
      "Upright after 5-axis machining."
    ]
  ],
  "proj-01": [
    [
      "bike-01-frame-assembly.jpg",
      "Parametric electric bike frame assembly"
    ],
    [
      "bike-02-fea-prepped.jpg",
      "Frame model prepared for FEA"
    ],
    [
      "bike-03-fea-stress.jpg",
      "Stress distribution across the frame under static load"
    ]
  ],
  "proj-03": [
    [
      "topo-01-source.jpg",
      "Source portrait"
    ],
    [
      "topo-02-heightmap.jpg",
      "Grayscale heightmap derived from source image"
    ],
    [
      "topo-03-mesh-toolpath.jpg",
      "Mesh with generated CAM toolpaths"
    ],
    [
      "topo-05-stockprep.jpg",
      "Stock preparation before machining"
    ],
    [
      "topo-06-router.jpg",
      "Machining the relief on router gantry"
    ],
    [
      "topo-07-final.jpg",
      "Finished machined relief"
    ]
  ],
  "proj-04": [
    [
      "audio-eq-schematic.png",
      "Multi-stage analog equalizer schematic"
    ]
  ]
};

export const LOGOS = {
  "sikorsky": {
    "src": "assets/logos/sikorsky-208.webp",
    "width": 208,
    "height": 208,
    "alt": "Sikorsky, a Lockheed Martin company"
  },
  "fsae": {
    "src": "assets/logos/purdue-electric-racing.png",
    "width": 200,
    "height": 200,
    "alt": "Purdue Electric Racing"
  }
};

export const VIDEOS = {
  "proj-03": [
    {
      "stem": "topo-video-1",
      "caption": "Machining Pass 01"
    },
    {
      "stem": "topo-video-2",
      "caption": "Machining Pass 02"
    },
    {
      "stem": "topo-video-3",
      "caption": "Machining Pass 03"
    }
  ]
};

export const MEDIA = {
  "upright-fea.jpg": {
    "height": 826,
    "width": 1050
  },
  "bike-03-fea-stress.jpg": {
    "height": 417,
    "width": 897
  },
  "topo-01-source.jpg": {
    "height": 183,
    "width": 275
  },
  "upright-wheel-cad-01.jpg": {
    "height": 1075,
    "width": 1192
  },
  "topo-02-heightmap.jpg": {
    "height": 939,
    "width": 1400
  },
  "topo-06-router.jpg": {
    "height": 1205,
    "width": 1600
  },
  "topo-03-mesh-toolpath.jpg": {
    "height": 851,
    "width": 1390
  },
  "topo-07-final.jpg": {
    "height": 1355,
    "width": 1800
  },
  "upright-5axis-machined.jpg": {
    "height": 1355,
    "width": 1800
  },
  "upright-cam-01-roughing.jpg": {
    "height": 765,
    "width": 1047
  },
  "bike-01-frame-assembly.jpg": {
    "height": 983,
    "width": 1425
  },
  "topo-05-stockprep.jpg": {
    "height": 1350,
    "width": 1800
  },
  "bike-02-fea-prepped.jpg": {
    "height": 417,
    "width": 897
  },
  "audio-eq-schematic.png": {
    "height": 880,
    "width": 1342
  }
};

export const MODELS = {
  "sikorsky": null,
  "fsae": {
    "label": "Rear upright",
    "model": "assets/models/DT27_Rear_Upright.gltf",
    "orientation": {
      "rotation": [
        0,
        0,
        0
      ],
      "azimuth": 0.6108652381980153,
      "elevation": 0.2617993877991494,
      "frame": 1.1760000000000002
    }
  },
  "fsae-assembly": {
    "label": "Full drivetrain assembly",
    "model": "assets/models/Drivetrain27_Asy.gltf",
    "orientation": {
      "rotation": [
        0,
        0,
        1.5707963267948966
      ],
      "azimuth": -0.3490658503988659,
      "elevation": 0.20943951023931956,
      "frame": 1.12
    }
  },
  "proj-01": {
    "label": "frame assembly",
    "model": "assets/models/ebike-top-level-assembly.gltf",
    "orientation": {
      "rotation": [
        -1.5707963267948966,
        0,
        1.5707963267948966
      ],
      "azimuth": 3.141592653589793,
      "elevation": 0,
      "frame": 1.12
    }
  },
  "proj-03": {
    "label": "Face relief surface model",
    "model": "assets/models/BabaWoodSurface.gltf",
    "orientation": {
      "rotation": [
        -1.5707963267948966,
        0,
        0
      ],
      "azimuth": 1.5707963267948966,
      "elevation": 0,
      "frame": 1.12
    }
  },
  "proj-04": null,
  "proj-06": null
};
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, "");
