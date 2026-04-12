
export interface MasterFormatItem {
  code: string;
  title: string;
}

export interface MasterFormatDivision {
  number: string;
  title: string;
  items: MasterFormatItem[];
}

export const masterFormatData: MasterFormatDivision[] = [
  {
    number: "01",
    title: "General Requirements",
    items: [
      { code: "01100", title: "Summary" },
      { code: "01200", title: "Price and Payment Procedures" },
      { code: "01300", title: "Administrative Requirements" },
      { code: "01400", title: "Quality Requirements" },
      { code: "01500", title: "Temporary Facilities and Controls" },
      { code: "01600", title: "Product Requirements" },
      { code: "01700", title: "Execution Requirements" },
      { code: "01800", title: "Facility Operation" },
      { code: "01900", title: "Facility Decommissioning" }
    ]
  },
  {
    number: "02",
    title: "Site Construction",
    items: [
      { code: "02050", title: "Basic Site Materials and Methods" },
      { code: "02100", title: "Site Remediation" },
      { code: "02200", title: "Site Preparation" },
      { code: "02300", title: "Earthwork" },
      { code: "02400", title: "Tunneling, Boring, and Jacking" },
      { code: "02450", title: "Foundation and Load-bearing Elements" },
      { code: "02500", title: "Utility Services" },
      { code: "02600", title: "Drainage and Containment" },
      { code: "02700", title: "Bases, Ballasts, Pavements, and Appurtenances" },
      { code: "02800", title: "Site Improvements and Amenities" },
      { code: "02900", title: "Planting" },
      { code: "02950", title: "Site Restoration and Rehabilitation" }
    ]
  },
  {
    number: "03",
    title: "Concrete",
    items: [
      { code: "03050", title: "Basic Concrete Materials and Methods" },
      { code: "03100", title: "Concrete Forms and Accessories" },
      { code: "03200", title: "Concrete Reinforcement" },
      { code: "03300", title: "Cast-in-Place Concrete" },
      { code: "03400", title: "Precast Concrete" },
      { code: "03500", title: "Cementitious Decks and Underlayment" },
      { code: "03600", title: "Grouts" },
      { code: "03700", title: "Mass Concrete" },
      { code: "03900", title: "Concrete Restoration and Cleaning" }
    ]
  },
  {
    number: "04",
    title: "Masonry",
    items: [
      { code: "04050", title: "Basic Masonry Materials and Methods" },
      { code: "04200", title: "Masonry Units" },
      { code: "04400", title: "Stone" },
      { code: "04500", title: "Refractories" },
      { code: "04600", title: "Corrosion-Resistant Masonry" },
      { code: "04700", title: "Simulated Masonry" },
      { code: "04800", title: "Masonry Assemblies" },
      { code: "04900", title: "Masonry Restoration and Cleaning" }
    ]
  },
  {
    number: "05",
    title: "Metals",
    items: [
      { code: "05050", title: "Basic Metal Materials and Methods" },
      { code: "05100", title: "Structural Metal Framing" },
      { code: "05200", title: "Metal Joists" },
      { code: "05300", title: "Metal Deck" },
      { code: "05400", title: "Cold-Formed Metal Framing" },
      { code: "05500", title: "Metal Fabrications" },
      { code: "05600", title: "Hydraulic Fabrications" },
      { code: "05650", title: "Railroad Track and Accessories" },
      { code: "05700", title: "Ornamental Metal" },
      { code: "05800", title: "Expansion Control" },
      { code: "05900", title: "Metal Restoration and Cleaning" }
    ]
  },
  {
    number: "06",
    title: "Wood and Plastics",
    items: [
      { code: "06050", title: "Basic Materials and Methods" },
      { code: "06100", title: "Rough Carpentry" },
      { code: "06200", title: "Finish Carpentry" },
      { code: "06400", title: "Architectural Woodwork" },
      { code: "06500", title: "Structural Plastics" },
      { code: "06600", title: "Plastic Fabrications" },
      { code: "06900", title: "Wood and Plastic Restoration and Cleaning" }
    ]
  },
  {
    number: "07",
    title: "Thermal and Moisture Protection",
    items: [
      { code: "07050", title: "Basic Materials and Methods" },
      { code: "07100", title: "Dampproofing and Waterproofing" },
      { code: "07200", title: "Thermal Protection" },
      { code: "07300", title: "Shingles, Roof Tiles, and Roof Coverings" },
      { code: "07400", title: "Roofing and Siding Panels" },
      { code: "07500", title: "Membrane Roofing" },
      { code: "07600", title: "Flashing and Sheet Metal" },
      { code: "07700", title: "Roof Specialties and Accessories" },
      { code: "07800", title: "Fire and Smoke Protection" },
      { code: "07900", title: "Joint Sealers" }
    ]
  },
  {
    number: "08",
    title: "Doors and Windows",
    items: [
      { code: "08050", title: "Basic Materials and Methods" },
      { code: "08100", title: "Metal Doors and Frames" },
      { code: "08200", title: "Wood and Plastic Doors" },
      { code: "08300", title: "Specialty Doors" },
      { code: "08400", title: "Entrances and Storefronts" },
      { code: "08500", title: "Windows" },
      { code: "08600", title: "Skylights" },
      { code: "08700", title: "Hardware" },
      { code: "08800", title: "Glazing" },
      { code: "08900", title: "Glazed Curtain Wall" }
    ]
  },
  {
    number: "09",
    title: "Finishes",
    items: [
      { code: "09050", title: "Basic Materials and Methods" },
      { code: "09100", title: "Metal Support Assemblies" },
      { code: "09200", title: "Plaster and Gypsum Board" },
      { code: "09300", title: "Tile" },
      { code: "09400", title: "Terrazzo" },
      { code: "09500", title: "Ceilings" },
      { code: "09600", title: "Flooring" },
      { code: "09700", title: "Wall Finishes" },
      { code: "09800", title: "Acoustical Treatment" },
      { code: "09900", title: "Paints and Coatings" }
    ]
  },
  {
    number: "10",
    title: "Specialties",
    items: [
      { code: "10100", title: "Visual Display Boards" },
      { code: "10150", title: "Compartments and Cubicles" },
      { code: "10200", title: "Louvers and Vents" },
      { code: "10240", title: "Grilles and Screens" },
      { code: "10250", title: "Service Walls" },
      { code: "10260", title: "Wall and Corner Guards" },
      { code: "10270", title: "Access Flooring" },
      { code: "10290", title: "Pest Control" },
      { code: "10300", title: "Fireplaces and Stoves" },
      { code: "10340", title: "Manufactured Exterior Specialties" },
      { code: "10350", title: "Flagpoles" },
      { code: "10400", title: "Identification Devices" },
      { code: "10450", title: "Pedestrian Control Devices" },
      { code: "10500", title: "Lockers" },
      { code: "10520", title: "Fire Protection Specialties" },
      { code: "10530", title: "Protective Covers" },
      { code: "10550", title: "Postal Specialties" },
      { code: "10600", title: "Partitions" },
      { code: "10670", title: "Storage Shelving" },
      { code: "10700", title: "Exterior Protection" },
      { code: "10750", title: "Telephone Specialties" },
      { code: "10800", title: "Toilet, Bath, and Laundry Accessories" },
      { code: "10880", title: "Scales" },
      { code: "10900", title: "Wardrobe and Closet Specialties" }
    ]
  },
  {
    number: "11",
    title: "Equipment",
    items: [
      { code: "11010", title: "Maintenance Equipment" },
      { code: "11020", title: "Security and Vault Equipment" },
      { code: "11030", title: "Teller and Service Equipment" },
      { code: "11040", title: "Ecclesiastical Equipment" },
      { code: "11050", title: "Library Equipment" },
      { code: "11060", title: "Theater and Stage Equipment" },
      { code: "11070", title: "Instrumental Equipment" },
      { code: "11080", title: "Registration Equipment" },
      { code: "11090", title: "Checkroom Equipment" },
      { code: "11100", title: "Mercantile Equipment" },
      { code: "11110", title: "Commercial Laundry and Dry Cleaning Equipment" },
      { code: "11120", title: "Vending Equipment" },
      { code: "11130", title: "Audio-Visual Equipment" },
      { code: "11140", title: "Vehicle Service Equipment" },
      { code: "11150", title: "Parking Control Equipment" },
      { code: "11160", title: "Loading Dock Equipment" },
      { code: "11170", title: "Solid Waste Handling Equipment" },
      { code: "11190", title: "Detention Equipment" },
      { code: "11200", title: "Water Supply and Treatment Equipment" },
      { code: "11280", title: "Hydraulic Gates and Valves" },
      { code: "11300", title: "Fluid Waste Treatment and Disposal Equipment" },
      { code: "11400", title: "Food Service Equipment" },
      { code: "11450", title: "Residential Equipment" },
      { code: "11460", title: "Unit Kitchens" },
      { code: "11470", title: "Darkroom Equipment" },
      { code: "11480", title: "Athletic, Recreational, and Therapeutic Equipment" },
      { code: "11500", title: "Industrial and Process Equipment" },
      { code: "11600", title: "Laboratory Equipment" },
      { code: "11650", title: "Planetarium Equipment" },
      { code: "11660", title: "Observatory Equipment" },
      { code: "11680", title: "Office Equipment" },
      { code: "11700", title: "Medical Equipment" },
      { code: "11780", title: "Mortuary Equipment" },
      { code: "11850", title: "Navigation Equipment" },
      { code: "11870", title: "Agricultural Equipment" },
      { code: "11900", title: "Exhibit Equipment" }
    ]
  },
  {
    number: "12",
    title: "Furnishings",
    items: [
      { code: "12050", title: "Fabrics" },
      { code: "12100", title: "Art" },
      { code: "12300", title: "Manufactured Casework" },
      { code: "12400", title: "Furnishings and Accessories" },
      { code: "12500", title: "Furniture" },
      { code: "12600", title: "Multiple Seating" },
      { code: "12700", title: "Systems Furniture" },
      { code: "12800", title: "Interior Plants and Planters" },
      { code: "12900", title: "Furnishings Repair and Restoration" }
    ]
  },
  {
    number: "13",
    title: "Special Construction",
    items: [
      { code: "13010", title: "Air-Supported Structures" },
      { code: "13020", title: "Building Modules" },
      { code: "13030", title: "Special Purpose Rooms" },
      { code: "13080", title: "Sound, Vibration, and Seismic Control" },
      { code: "13090", title: "Radiation Protection" },
      { code: "13100", title: "Lightning Protection" },
      { code: "13110", title: "Cathodic Protection" },
      { code: "13120", title: "Pre-Engineered Structures" },
      { code: "13150", title: "Swimming Pools" },
      { code: "13160", title: "Aquariums" },
      { code: "13165", title: "Aquatic Park Facilities" },
      { code: "13170", title: "Tubs and Pools" },
      { code: "13175", title: "Ice Rinks" },
      { code: "13185", title: "Kennels and Animal Shelters" },
      { code: "13190", title: "Site-Constructed Incinerators" },
      { code: "13200", title: "Storage Tanks" },
      { code: "13220", title: "Filter Underdrains and Media" },
      { code: "13230", title: "Digester Covers and Appurtenances" },
      { code: "13240", title: "Oxygenation Systems" },
      { code: "13260", title: "Sludge Conditioning Systems" },
      { code: "13280", title: "Hazardous Material Remediation" },
      { code: "13400", title: "Measurement and Control Instrumentation" },
      { code: "13500", title: "Recording Instrumentation" },
      { code: "13550", title: "Transportation Control Instrumentation" },
      { code: "13600", title: "Solar and Wind Energy Equipment" },
      { code: "13700", title: "Security Access and Surveillance" },
      { code: "13800", title: "Building Automation and Control" },
      { code: "13850", title: "Detection and Alarm" },
      { code: "13900", title: "Fire Suppression" }
    ]
  },
  {
    number: "14",
    title: "Conveying Systems",
    items: [
      { code: "14100", title: "Dumbwaiters" },
      { code: "14200", title: "Elevators" },
      { code: "14300", title: "Escalators and Moving Walks" },
      { code: "14400", title: "Lifts" },
      { code: "14500", title: "Material Handling" },
      { code: "14600", title: "Hoists and Cranes" },
      { code: "14700", title: "Turntables" },
      { code: "14800", title: "Scaffolding" },
      { code: "14900", title: "Transportation" }
    ]
  },
  {
    number: "15",
    title: "Mechanical",
    items: [
      { code: "15050", title: "Basic Mechanical Materials and Methods" },
      { code: "15100", title: "Building Services Piping" },
      { code: "15200", title: "Process Piping" },
      { code: "15300", title: "Fire Protection Piping" },
      { code: "15400", title: "Plumbing Fixtures and Equipment" },
      { code: "15500", title: "Heat-Generation Equipment" },
      { code: "15600", title: "Refrigeration Equipment" },
      { code: "15700", title: "Heating, Ventilating, and Air Conditioning Equipment" },
      { code: "15800", title: "Air Distribution" },
      { code: "15900", title: "Instrumentation and Controls" },
      { code: "15950", title: "Testing, Adjusting, and Balancing" }
    ]
  },
  {
    number: "16",
    title: "Electrical",
    items: [
      { code: "16050", title: "Basic Electrical Materials and Methods" },
      { code: "16100", title: "Wiring Methods" },
      { code: "16200", title: "Electrical Power" },
      { code: "16300", title: "Transmission and Distribution" },
      { code: "16400", title: "Low-Voltage Distribution" },
      { code: "16500", title: "Lighting" },
      { code: "16700", title: "Communications" },
      { code: "16800", title: "Sound and Video" }
    ]
  }
];
