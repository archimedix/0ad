# 0 A.D. Map Editor

A comprehensive collection of Node.js tools for working with [0 A.D.](https://play0ad.com/) game maps, featuring a web-based visual editor and CLI tools for intelligent resource placement.

## Features

### 🌐 Web Editor (Visual Interface)
- **Real-time Heightmap Visualization**: Live rendering of maps with elevation-based coloring
- **Multiple View Modes**: Heightmap, texture, and entity visualization
- **Interactive Resource Placement**: Click-to-place resource clusters with customizable parameters
- **Dynamic Water Level Control**: Real-time water level adjustment with visual preview
- **Zoom & Pan Navigation**: Smooth map navigation with zoom controls
- **Map Upload Interface**: Upload .pmp/.xml files through web interface
- **Automatic Saving**: Export modified maps in 0 A.D. format

### 🖥️ CLI Tools
- **Terrain-Aware Resource Placement**: Automatically populate maps with resources that respect terrain elevation
- **PMP File Parser**: Read and interpret 0 A.D.'s heightmap format (both legacy Float32 and current UInt16 formats)
- **Water Avoidance**: Smart placement that avoids placing resources underwater
- **Boundary Respect**: Ensures all entities stay within map boundaries
- **Civil Center Exclusion**: Maintains safe distances from existing structures
- **Multi-Format Support**: Works with both old and new PMP file formats

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd 0ad-map-editor

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Usage

### 🌐 Web Editor

Start the development servers:

```bash
# Terminal 1: Start backend server
cd backend
npm run dev
# Server will run on http://localhost:3001

# Terminal 2: Start frontend development server
cd frontend
npm run dev
# Web interface will be available on http://localhost:5173
```

**Web Editor Features:**
- Upload and visualize 0 A.D. maps (.pmp/.xml files)
- Interactive heightmap with elevation coloring
- Click-to-place resource clusters (forests, stones, metals)
- Real-time water level adjustment
- Export modified maps

### 🖥️ CLI Tools

**Basic Map Population:**

```bash
cd backend
node populate-map.js <map_name> [custom_map_dimension]
```

**Examples:**
```bash
# Populate test-pattern map with auto-detected dimensions
node populate-map.js test-pattern

# Populate world map with custom dimensions
node populate-map.js world 6400
```

### Input Files Required

Place your map files in the `backend/maps/` directory:
- `<map_name>.xml` - 0 A.D. scenario file
- `<map_name>.pmp` - 0 A.D. heightmap file

**For Web Editor:** Upload files directly through the web interface.

### Output

- **CLI Tools:** Generate `maps/<map_name>_p.xml` with populated resources
- **Web Editor:** Save as `maps/<map_name>_edited.xml` with all modifications

## Configuration

Edit the constants in `populate-map.js` to customize behavior:

```javascript
const CLUSTER_COUNT = 200;           // Number of resource clusters
const CLUSTER_RADIUS = 50;           // Radius of each cluster
const RESOURCES_PER_CLUSTER = 10;    // Additional resources per cluster
const ALT_WATER_THRESHOLD = 5;       // Water level threshold (meters)
const EXCLUSION_RADIUS = 300;        // Distance to avoid Civil Centers
```

## Resource Distribution

Resources are distributed based on terrain elevation:

- **Low elevations (< 10m)**: Tropical trees and fauna (palms, goats, chickens)
- **Medium elevations (10-40m)**: Temperate trees and fauna (oak, deer, rabbits)  
- **High elevations (> 40m)**: Rocks and metal deposits

## Technical Details

### PMP File Format Support

The tool automatically detects and supports:

- **Legacy Format**: Float32 heightmaps (pre-v27)
- **Current Format**: UInt16 heightmaps with PSMP header (v27+)

### Coordinate System

- **Game coordinates**: 0 to mapDimension
- **Grid coordinates**: Mapped to heightmap array indices
- **Elevation range**: -20m to +692m (0 A.D. standard)

### Map Dimensions

The tool calculates map dimensions from PMP files:
- **16 patches**: 1024 game units (16×16×4)
- **64 patches**: 4096 game units (64×16×4)
- Custom dimensions can be specified as second argument

## Project Structure

```
├── backend/                 # Node.js backend server
│   ├── maps/               # Map files directory
│   │   ├── *.xml          # 0 A.D. scenario files
│   │   ├── *.pmp          # 0 A.D. heightmap files
│   │   └── *_edited.xml   # Modified maps from web editor
│   ├── server.js          # Express API server
│   ├── populate-map.js    # CLI population script
│   ├── pmp-utils.js      # PMP file parsing utilities
│   ├── xml-utils.js      # XML handling utilities
│   ├── resource-config.js # Resource type definitions
│   └── package.json      # Backend dependencies
├── frontend/               # Vue.js web interface
│   ├── src/
│   │   ├── views/
│   │   │   └── MapEditor.vue    # Main editor interface
│   │   ├── components/
│   │   │   └── MapCanvas.vue    # Canvas rendering component
│   │   └── App.vue              # Main app component
│   ├── index.html              # Entry point
│   └── package.json            # Frontend dependencies
└── README.md                    # This file
```

## Dependencies

### Backend
- `express`: Web server framework
- `cors`: Cross-origin resource sharing
- `multer`: File upload handling
- `xml2js`: XML parsing and generation
- `fs`: File system operations (Node.js built-in)

### Frontend
- `vue`: Vue.js framework
- `vue-router`: Client-side routing
- `pinia`: State management
- `axios`: HTTP client
- `tailwindcss`: CSS framework
- `vite`: Build tool and development server

## Algorithm

1. **Parse Input**: Read XML scenario and PMP heightmap
2. **Detect Format**: Identify PMP format (legacy Float32 vs current UInt16)
3. **Generate Positions**: Create resource cluster positions with boundary checks
4. **Filter Positions**: 
   - Remove underwater positions (elevation ≤ threshold)
   - Exclude areas near Civil Centers
   - Ensure positions stay within map boundaries
5. **Select Resources**: Choose appropriate resources based on elevation
6. **Generate Output**: Create new XML with populated entities

## Examples

### Web Editor Screenshot
```
🌐 Web Editor Running:
Frontend: http://localhost:5173
Backend API: http://localhost:3001

📊 Map Editor Interface:
- Heightmap visualization with terrain coloring
- Interactive resource placement
- Real-time water level control
- Multiple view modes (heightmap/texture/entities)
```

### CLI Population Output

```
📥 Loading map: world
🔍 PMP file: 10493418 bytes total
📋 Detected format: 0AD v27 (UInt16)
📋 PMP Header: magic="PSMP", version=7, dataSize=10493406, mapSize=64 patches
✅ Map loaded (1025x1025), detected dimensions: 6476, initial entities: 45
🏔 Elevations: min=27.28, max=614.17, water threshold=5
🏛 Civil Centers found: 8
📊 Debug: CC=117, Bounds=0, Water=0, Added=2083
✅ Population completed! Added 2083 new entities.
📄 File saved to: maps/world_p.xml
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with various map types
5. Submit a pull request

## Documentation References

- [0 A.D. Documentation](https://docs.wildfiregames.com/)
- [0 A.D. Development Wiki](https://gitea.wildfiregames.com/0ad/0ad)

## License

MIT License

## Acknowledgments

- 0 A.D. development team for the excellent RTS engine
- Community mapmakers for testing and feedback