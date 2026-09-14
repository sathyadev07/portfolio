

window.EXPERIENCES_DATA = [
  {
    id: 'sikorsky',
    title: 'Tooling Design Engineer Intern',
    company: 'LOCKHEED MARTIN SIKORSKY',
    period: 'Jun 2026 — Aug 2026',
    badge: 'LOCKHEED MARTIN SIKORSKY',
    logoType: 'sikorsky',
    tags: ['CATIA V5', '3DEXPERIENCE', 'SAP ERP'],
    bullets: [
      'Designed and revised 14 production tooling fixtures and jigs (drill jigs, assembly locators, masking fixtures) in CATIA V5 for CH-53K, Black Hawk, and search-and-rescue rotorcraft, 3 of which are now in use on the shop floor.',
      'Toleranced 12 tools to ASME Y14.5 GD&T, matching every callout to the process that would actually make the part (CNC milling, manual machining, or additive) rather than to a single default standard.',
      'Traced constraint and leakage failures in 3 released production tools back to root cause and redesigned each one, which cut procurement lead time and dropped a secondary machining setup from the build.',
      'Maintained multi-level BOMs for all 14 tools and routed engineering change orders through SAP ERP and 3DEXPERIENCE PLM, so manufacturing engineers and machinists worked from current tooling data across releases.',
      'Co-designed the hybrid-electric powertrain for the dual-propeller Nomad VTOL, packaging an ICE, motor generator, battery pack, and a per-propeller motor and planetary gearbox inside thermal limits; presented to leadership.'
    ],
    stats: [
      { label: 'Tools Designed', value: '14' },
      { label: 'In Production Use', value: '3' },
      { label: 'ASME Y14.5 Tools', value: '12' },
      { label: 'Root-Cause Redesigns', value: '3' }
    ],
    telemetryNote: {
      title: '[TOOLING TELEMETRY]',
      lines: [
        'CH-53K & Black Hawk Airframe Fixturing',
        'Nomad VTOL Planetary Gearbox Packaging'
      ]
    },
    viewers: [
      {
        id: 'vtol-box',
        title: '[3D Interactive Viewer: Nomad VTOL Planetary Gearbox Packaging CAD]',
        type: 'cad-fixture'
      },
      {
        id: 'sikorsky-fixture',
        title: '[3D Interactive Assembly Viewer: CH-53K Airframe Drill Jig Fixture]',
        type: 'cad-upright'
      },
      {
        id: 'fea-tooling',
        title: '[Simulation Model: Fixture Clamping Strain & Deflection FEA]',
        type: 'fea-stress'
      }
    ]
  },
  {
    id: 'fsae',
    title: 'Drivetrain Engineer',
    company: 'FORMULA SAE ELECTRIC',
    period: 'Aug 2025 — Present',
    badge: 'FORMULA SAE ELECTRIC',
    logoType: 'fsae',
    tags: ['Siemens NX', 'Ansys FEA', '5-Axis CNC'],
    bullets: [
      'Designed the rear upright and planet carrier for the 2027 outrunner drivetrain in NX, cutting weight 32%.',
      'Ran static structural FEA on the rear upright and hub group, then reworked stiffener and fillet geometry against the stress peaks and 2 mm deflections it exposed, and pulled dead weight out of near-zero-stress areas.',
      'Drafted the rear upright to sub-0.003 in. bearing and seal bore tolerances, called out for a manual boring finish.',
      'Cut wheel-upright machining time 50% by reworking the toolpaths from 3-axis to 5-axis CNC milling, then built the fixture plate that locates and holds the upright through the remaining 3-axis production runs.'
    ],
    stats: [
      { label: 'Machining Time Cut', value: '50%' },
      { label: 'Weight Reduction', value: '32%' },
      { label: 'Bore & Bearing Tolerance', value: '0.003"' }
    ],
    viewers: [
      {
        id: 'upright-3d',
        title: '[3D Interactive Viewer: 2027 Rear Wheel Upright CAD]',
        type: 'cad-upright'
      },
      {
        id: 'assembly-3d',
        title: '[3D Interactive Assembly Viewer: 2027 Outrunner Drivetrain Assembly]',
        type: 'cad-fixture'
      },
      {
        id: 'fea-sim',
        title: '[Simulation: Rear Upright & Hub Static Structural FEA Deformation]',
        type: 'fea-stress'
      }
    ]
  }
];

window.PROJECTS_DATA = [
  {
    id: 'proj-01',
    projNumber: 'PROJ-01',
    title: 'Custom Electric Bike Design',
    period: 'Oct 2025 — Present',
    subtitle: 'Parametric Frame & FEA',
    summary: 'Fully parametric frame assembly in Siemens NX tied to off-the-shelf tubing catalogs. Automated geometric updates for wheelbase, head angle, and chainstay dropouts.',
    bullets: [
      'Built a fully parametric frame assembly in Siemens NX keyed to off-the-shelf tubing dimensions, so wheelbase, head angle, chainstay angle, and dropout geometry all update from a single set of driving inputs.',
      'Ran Ansys FEA on each candidate frame, swapping stock tube diameters and wall thicknesses through the parametric model to find the lightest combination that holds a 2.0 minimum safety factor under static load.',
      'Ran cost-versus-performance trade studies on motors, sprockets, and tubing alongside the FEA, converging on the cheapest catalog set that still meets the target safety factor and ride geometry, 9% under the first build cost.'
    ],
    tags: ['Siemens NX', 'Ansys FEA', 'Parametric CAD'],
    metricLabel: 'Safety Factor',
    metricValue: 'SF: 2.0',
    viewerType: 'bike-frame',
    viewerLabel: 'frame assembly'
  },
  {
    id: 'proj-02',
    projNumber: 'PROJ-02',
    title: 'Autonomous Supply Robot',
    period: 'Mar 2026 — Apr 2026',
    subtitle: 'Robotics & Sensor Fusion',
    summary: 'Autonomous maze navigation powered by Raspberry Pi Build HAT, ultrasonic and IMU sensor fusion, with infrared detection for heat and magnetic hazard avoidance.',
    bullets: [
      'Navigated a walled maze on ultrasonic and IMU sensing, adding infrared to dodge heat and magnetic hazards.',
      'Designed a gripping mechanism that holds cargo in transit and releases it at the target destination.',
      'Logged the path traveled by IMU dead-reckoning, recording hazard and delivery coordinates into a matrix.'
    ],
    tags: ['Raspberry Pi', 'Python', 'Kalman Filter'],
    metricLabel: 'Navigation State',
    metricValue: 'Autonomous',
    viewerType: 'robot-gripper',
    viewerLabel: '[3D Interactive Viewer: Multi-Linkage Payload Gripper CAD]',
    engineeringSpecs: [
      { label: 'Payload Capacity', value: '1.2 kg rated payload' },
      { label: 'IMU Sample Rate', value: '200 Hz with sensor fusion' },
      { label: 'Position Accuracy', value: '±8 mm closed-loop drift' }
    ]
  },
  {
    id: 'proj-03',
    projNumber: 'PROJ-03',
    title: 'Complex Surface Topography',
    period: 'Dec 2025 — Jan 2026',
    subtitle: '3-Axis CAM Optimization',
    summary: 'Generated 3D organic relief mesh in Fusion 360 directly from 2D grayscale gradient heightmaps, optimizing toolpath continuity for automated CNC milling.',
    bullets: [
      'Produced a 2D grayscale gradient heightmap from a source portrait photo.',
      'Built 3D mesh geometry from the heightmap in Fusion 360, keeping the organic topology machinable.',
      'Cut machining time 60% by reworking CAM toolpaths, holding surface detail with almost no hand rework.'
    ],
    tags: ['Fusion 360', 'CAM / CNC'],
    metricLabel: 'Cycle Time Reduction',
    metricValue: '-60% Time',
    viewerType: 'cam-mesh',
    viewerLabel: '[3D Interactive Viewer: Face Relief Mesh & CAM Surface Model]'
  },
  {
    id: 'proj-04',
    projNumber: 'PROJ-04',
    title: 'Analog Audio Equalizer',
    period: 'Apr 2026',
    subtitle: 'Active Filter Hardware',
    summary: 'Multi-stage analog active filter and amplifier circuitry designed to split, isolate, adjust, and recombine treble, mid, and bass frequency bands for custom audio curves.',
    bullets: [
      'Designed schematic for an audio equalizer and amplifier to recombine adjusted treble, mid, and bass frequencies for customizable output.',
      'Troubleshot and validated breadboard circuit assembly via frequency generator, oscilloscope, and multimeter.'
    ],
    tags: ['LTSpice', 'Breadboarding', 'Analog Circuits'],
    metricLabel: 'Architecture',
    metricValue: 'Active Filter',
    viewerType: 'analog-circuit',
    viewerLabel: '[Interactive Circuit & Frequency Response Analyzer]',
    engineeringSpecs: [
      { label: 'Band Splitting', value: 'Low (120Hz), Mid (1kHz), High (8kHz)' },
      { label: 'Gain Range', value: '±12 dB per octave shelving' },
      { label: 'Signal-to-Noise', value: '> 98 dB A-weighted' }
    ]
  },
  {
    id: 'proj-05',
    projNumber: 'PROJ-05',
    title: 'Mars Rover Drivetrain & Control',
    period: 'Oct 2025 — Dec 2025',
    subtitle: 'Robotics & Control',
    summary: 'Compact high-torque rover drivetrain engineered with a custom non-backdrivable worm-gear cargo system capable of carrying 500 g payloads up 35° incline grades.',
    bullets: [
      'Built a compact drivetrain with a custom worm-gear cargo system to carry 500 g loads up 35° inclines.',
      'Wrote a Python control loop that trims motor PWM from live IMU feedback to hold the line over rough terrain.'
    ],
    tags: ['Python', 'PWM Control', 'Sensor Fusion'],
    metricLabel: 'Max Incline Grade',
    metricValue: '35° Incline',
    viewerType: 'mars-rover',
    viewerLabel: '[3D Interactive Viewer: Worm-Drive Transmission & Suspension Bogie]',
    engineeringSpecs: [
      { label: 'Holding Torque', value: '4.8 N·m static holding' },
      { label: 'Backdrive Factor', value: 'Zero backdrive on steep grade' },
      { label: 'Climb Incline', value: '35° sustained rocky surface' }
    ]
  },
  {
    id: 'proj-06',
    projNumber: 'PROJ-06',
    title: 'Smog Tower Feasibility & Simulation',
    period: 'Mar 2025',
    subtitle: 'Environmental Fluid Dynamics',
    summary: 'Evaluated large-scale environmental air cleaning towers for PM2.5/PM10 mitigation in Hong Kong under urban budgetary, airflow, and energetic constraints.',
    bullets: [
      'Researched Studio Roosegaarde\'s Smog Free Tower concept and evaluated its feasibility for large-scale deployment to reduce PM2.5/PM10 air pollution in Hong Kong within realistic budget and practicality constraints.',
      'Built a low-fidelity Python simulation modeling individual particle motion to determine each tower\'s effective cleaning radius — the area where PM2.5/PM10 concentrations could be held at or below global health standards.',
      'Combined the simulation results with a scale-deployment feasibility analysis to conclude that city-wide deployment wasn\'t practical — a data-driven recommendation rather than a subjective call.'
    ],
    tags: ['Python', 'Particle Simulation', 'Trade Study'],
    metricLabel: 'Study Outcome',
    metricValue: 'Trade Study',
    viewerType: 'smog-tower',
    viewerLabel: '[Atmospheric Particle Plume Simulation & Tower Dynamics]'
  }
];
