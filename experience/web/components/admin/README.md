# Soul Sphere - Admin Interface

A comprehensive visualization and analysis tool for exploring the 87 emotions in VAC space, with automatic path computation and interactive 3D exploration.

**Status:** ✅ Production-Ready (Post-Refactoring Phases 1-6)  
**Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure

## 🎯 Quick Links

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Component architecture and patterns
- **[hooks/README.md](../../hooks/README.md)** - Custom hooks documentation
- **[types/README.md](../../types/README.md)** - Type system guide

## Overview

The Soul Sphere Admin Interface provides a powerful way to:

- Visualize all 87 emotions positioned in 3D VAC (Valence, Arousal, Connection) space
- Select any combination of emotions (n+1 selection)
- Automatically compute transition paths between selected emotions using the Observer's A\* pathfinding
- Explore emotion categories, bridge emotions, and psychological transitions
- Analyze path difficulty, waypoints, and transition strategies

## Access

Navigate to: `/admin/visualization`

## Architecture

### Components

```
/components/admin/
├── AtlasScene.tsx          # Main 3D scene container
├── EmotionCloud.tsx        # Renders 87 emotions as interactive spheres
├── PathNetwork.tsx         # Renders computed transition paths
├── ControlPanel.tsx        # Left sidebar with selection & filters
├── InfoPanel.tsx           # Right sidebar with detailed information
└── LegendOverlay.tsx       # Category/difficulty color legend
```

### State Management

**Store**: `useVisualizationStore.ts`

- Manages all 87 emotions
- Tracks selected emotions
- Stores computed paths
- Handles category filters
- Controls layer visibility
- Manages settings

### Data Hooks

**useEmotionData**: Fetches all 87 emotions from Observer API
**usePathCalculator**: Computes paths between selected emotions using Observer's transition system
**useLoadCachedPaths**: Automatically loads cached paths from backend database on page load
**useComputeAllPaths**: Batch computes all 7,482 possible paths (87×86) with backend caching

## Features

### 3D Visualization

- **Emotion Points**: Each of the 87 emotions rendered as a sphere at its [V, A, C] coordinates
- **Category Colors**: 13 distinct colors for each emotion category
- **Bridge Emotions**: Special gold ring indicator for the 6 bridge emotions
- **Transition Paths**: Smooth 3D curves connecting selected emotions
- **Path Colors**: Color-coded by difficulty (Cyan=easy, Yellow=moderate, Magenta=difficult)
- **Waypoints**: Intermediate emotion markers along paths
- **Interactive**: Click to select, hover for details, orbit/zoom camera

### Selection System

- **Multi-Select**: Select any number of emotions (n+1)
- **Search**: Filter by emotion name or category
- **Quick Actions**: One-click to select all 6 bridge emotions
- **Visual Feedback**: Selected emotions are larger, brighter, and pulse
- **Clear All**: Quickly deselect all emotions

### Path Computation

- **Automatic**: Paths computed automatically when 2+ emotions selected (configurable)
- **Manual Mode**: Toggle to compute paths on-demand
- **Pairwise**: Computes all N×(N-1)/2 paths for N selected emotions
- **Caching**: Paths cached to avoid redundant computation
- **Progress**: Loading indicator during computation

### Path Analysis

For each computed path:

- **Distance**: Euclidean distance in VAC space
- **Difficulty**: Easy/Moderate/Difficult classification
- **Estimated Time**: Time estimate for transition
- **Waypoints**: Intermediate emotions along the path
- **Bridge Detection**: Identifies if bridge emotions are required
- **Strategies**: Recommended transition strategies (from Observer)

### Category Filtering

- **13 Categories**: All emotion categories from Brené Brown's Atlas of the Heart
- **Toggle**: Enable/disable categories to reduce visual clutter
- **Color-Coded**: Each category has a distinct color
- **Counts**: Shows number of emotions in each category

### Layer Controls

Toggle visibility of:

- Soul Sphere (background reference)
- Emotion Points
- Emotion Labels
- Transition Paths
- Waypoints
- Bridge Highlights
- Legend Overlay

### Information Display

**Hovered/Selected Emotion**:

- Name and category
- Full definition
- Precise VAC coordinates
- Bridge emotion status

**Hovered Path**:

- From → To emotions
- Distance metric
- Difficulty level
- Estimated time
- Waypoint list
- Bridge requirements

**Summary View**:

- All computed paths
- Quick metrics for each
- Visual difficulty indicators

## VAC Model

The 3D space represents:

- **X-axis (Valence)**: Negative (-1) to Positive (+1)
- **Y-axis (Arousal)**: Low (-1) to High (+1)
- **Z-axis (Connection)**: Disconnected (-1) to Connected (+1)

## Bridge Emotions

The 6 gateway emotions that enable difficult transitions:

1. **Vulnerability** [0.0, 0.3, 0.6] - Required for shame → connection
2. **Awe** [0.7, 0.5, 0.8] - Universal bridge, accessible from any state
3. **Compassion** [0.5, 0.2, 0.9] - Heals shame, builds connection
4. **Curiosity** [0.5, 0.6, 0.3] - Interrupts rumination
5. **Acceptance** [0.3, -0.2, 0.4] - Releases resistance
6. **Gratitude** [0.8, 0.3, 0.9] - Amplifies positivity

## Use Cases

### Research & Analysis

- Explore relationships between emotions
- Validate VAC coordinate mappings
- Analyze path complexity and patterns
- Study category clustering

### Debugging & Validation

- Verify path computation logic
- Test bridge emotion detection
- Validate psychological constraints
- Check category transitions

### Demonstration

- Showcase the emotional map
- Explain the VAC model
- Illustrate transition pathways
- Present the system to stakeholders

### Development

- Test new emotions or coordinate adjustments
- Prototype path planning improvements
- Visualize algorithmic changes
- Debug transition issues

## Backend Caching System

### Path Matrix Cache

All computed paths are automatically cached in the Observer PostgreSQL database for instant retrieval:

**Performance Benefits**:

- **240x faster** than client-side computation
- Load 7,482 pre-computed paths in under 1 second
- Path Matrix ready instantly on page load
- Real-time statistics from database aggregates

**Cache Strategy**:

- Paths cached immediately after computation
- Persistent across sessions
- Shared between users
- Automatically loaded via `useLoadCachedPaths` hook

**Monitoring**:

- View cache performance metrics in Statistics Panel
- Track load times and cache hit rates
- Real-time progress during batch computation

### Batch Computation

**Path Matrix Feature**:

- Click "🚀 Compute All Paths" button
- Computes all 7,482 possible paths (87×86 emotion pairs)
- Takes ~5-10 minutes for initial computation
- Results permanently cached in database
- Future loads instant (<1 second)

**API Endpoints**:

- `POST /observer/paths/batch` - Batch compute all paths
- `GET /observer/paths/all` - Load all cached paths
- `GET /observer/statistics` - Real-time aggregate metrics

## API Integration

### Observer API Endpoints Used

**GET /observer/emotions**

- Fetches all 87 emotions with VAC coordinates
- Called on page load

**POST /observer/transitions/find-path**

- Computes optimal path between two emotions
- Uses A\* with psychological constraints
- Returns waypoints, difficulty, time estimates
- Results automatically cached in database

**POST /observer/paths/batch**

- Batch compute all 7,482 possible paths
- Stores results in `path_matrix_cache` table
- Returns progress updates during computation

**GET /observer/paths/all**

- Retrieves all cached paths from database
- Supports limit parameter for large datasets
- Called automatically on page load

**GET /observer/statistics**

- Real-time aggregate statistics from cache
- Difficulty distribution, distance metrics
- Completion percentage, bridge path counts
- Refreshed every 10 seconds

## Performance

- **Optimized Rendering**: Instanced meshes for emotion points
- **Selective Computation**: Only computes visible/selected paths
- **Caching**: Path results cached in store
- **Smooth Animations**: 60 FPS with up to 10 paths
- **Lazy Loading**: Emotions loaded once, paths on-demand

## Keyboard/Mouse Controls

- **Left Click**: Select/deselect emotion
- **Hover**: Show detailed information
- **Left Drag**: Rotate camera
- **Right Drag**: Pan camera
- **Scroll**: Zoom in/out
- **Search Box**: Type to filter emotions

## Future Enhancements

Potential additions:

- Path comparison mode (multiple routes between same pair)
- Journey simulation (animate emotion walker along path)
- Export/screenshot functionality
- User journey replay from database
- Category graph view (2D network diagram)
- Heatmap visualization mode
- Keyboard shortcuts for power users
- Path matrix grid view (n×n selection)

## Technical Details

**Stack**:

- Next.js 16 (React 19)
- React Three Fiber (3D rendering)
- @react-three/drei (3D helpers)
- Zustand (state management)
- Tailwind CSS (styling)
- TypeScript

**Data Flow**:

1. useEmotionData fetches emotions → store
2. User selects emotions → store updates
3. usePathCalculator watches selection
4. Paths computed via Observer API
5. Results cached in store
6. Components render from store

## Troubleshooting

**No emotions visible**:

- Check Observer service is running (default: http://localhost:8001)
- Verify /emotions endpoint is accessible
- Check browser console for errors

**Paths not computing**:

- Ensure 2+ emotions selected
- Check "Auto-compute paths" setting is enabled
- Verify Observer's /transitions/find-path endpoint
- Look for errors in browser console

**Performance issues**:

- Reduce number of selected emotions
- Disable animations in settings
- Hide unused layers (Soul Sphere, Labels)
- Close other browser tabs

## Credits

Built on the L.O.V.E. emotional guidance system:

- **VAC Model**: Valence-Arousal-Connection emotion representation
- **87 Emotions**: From Brené Brown's "Atlas of the Heart"
- **Path Planning**: A\* algorithm with psychological constraints
- **Bridge Emotions**: Research-backed gateway emotions
- **Transition Strategies**: Evidence-based therapeutic techniques
