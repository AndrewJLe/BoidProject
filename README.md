# 🐦 Boids Flocking Simulation

A modern, interactive implementation of Craig Reynolds' classic boids flocking algorithm with real-time parameter controls and algorithm visualization.

## ✨ Features

### 🎮 Interactive Controls
- **Real-time parameter adjustment** with smooth sliders
- **Visualization toggles** for FOV, neighbor lines, and steering forces
- **Simulation controls** for pause/resume and reset
- **Modern UI** with clean, responsive design

### 🧠 Algorithm Showcase
- **Interactive demos** for each flocking behavior
- **Real-time explanations** of separation, cohesion, and alignment
- **Visual demonstrations** showing how each algorithm works
- **Mini-canvas** with slow-motion algorithm visualization

### 🔧 Performance Optimizations
- **Memory-efficient** vector operations with object reuse
- **Distance caching** to eliminate redundant calculations
- **Optimized DOM manipulation** for smooth 60fps performance
- **Smart neighbor detection** with field-of-view constraints

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/AndrewJLe/BoidProject.git
   cd BoidProject
   ```

2. **Open in browser**
   ```bash
   # Serve locally (recommended)
   python -m http.server 8000
   # or
   npx serve .
   
   # Then visit http://localhost:8000
   ```

3. **Start experimenting!**
   - Adjust the sliders to see how parameters affect flocking behavior
   - Toggle visualizations to understand the underlying algorithms
   - Click algorithm tabs to learn how each behavior works

## 🎯 How It Works

### Core Algorithms

**Separation**: Boids steer away from nearby neighbors to avoid crowding
- Calculates repulsion force based on distance
- Closer neighbors create stronger repulsion
- Results in natural spacing between boids

**Cohesion**: Boids are attracted to the center of mass of their neighbors
- Finds average position of nearby boids
- Steers toward the group's center
- Creates tight flocking groups

**Alignment**: Boids try to match the average velocity of their neighbors
- Calculates average direction of nearby boids
- Gradually turns to match group movement
- Results in coordinated group behavior

### Technical Implementation

- **Canvas-based rendering** for smooth animation
- **Modular architecture** with separate UI and simulation layers
- **Responsive design** that works on desktop and mobile
- **Real-time parameter updates** without simulation restart

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────┐
│                    🐦 Boids Simulation                   │
├─────────────┬─────────────────────────┬─────────────────┤
│   Controls  │                         │   Algorithm     │
│             │                         │   Showcase      │
│  • Toggles  │                         │                 │
│  • Sliders  │                         │  • Tabs         │
│  • Buttons  │                         │  • Info         │
│             │                         │  • Mini Demo    │
├─────────────┴─────────────────────────┴─────────────────┤
│                                                         │
│              🎯 Main Simulation Canvas                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │         Boids flying around here               │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                      📊 Stats          │
└─────────────────────────────────────────────────────────┘
```

## 🎛️ Controls

### Visualization
- **Field of View**: Shows the detection range of the main boid
- **Neighbor Lines**: Displays connections between nearby boids
- **Separation**: Shows repulsion forces (green arrows)
- **Cohesion**: Shows attraction to group center (blue arrows)
- **Alignment**: Shows velocity matching forces (yellow arrows)

### Parameters
- **Field of View**: Detection range (50-300 pixels)
- **Separation Force**: Strength of repulsion (0-50)
- **Cohesion Force**: Strength of attraction (0-50)
- **Alignment Force**: Strength of velocity matching (0-50)
- **Max Speed**: Maximum boid velocity (1-10)

### Simulation
- **Reset**: Randomize all boid positions and velocities
- **Pause/Resume**: Stop or continue the simulation

## 📱 Responsive Design

The interface automatically adapts to different screen sizes:
- **Desktop**: Full three-panel layout
- **Tablet**: Stacked panels with collapsible sections
- **Mobile**: Single column with expandable controls

## 🔧 Technical Details

### Performance Optimizations
- Pre-allocated static vectors to avoid garbage collection
- Distance caching between boids to eliminate redundant calculations
- Efficient DOM manipulation with minimal reflows
- Smart field-of-view culling for neighbor detection

### Code Structure
```
├── index.html          # Main HTML structure
├── styles.css          # Modern CSS with CSS Grid and Flexbox
├── index.js            # Main simulation loop
├── ui-controller.js    # UI management and event handling
├── boid.js             # Optimized Boid class
├── vector.js           # 2D vector mathematics
├── world.js            # World configuration
└── utils.js            # Utility functions
```

## 🎓 Educational Value

This simulation demonstrates:
- **Emergent behavior** from simple rules
- **Real-time algorithm visualization**
- **Interactive parameter exploration**
- **Performance optimization techniques**
- **Modern web development practices**

Perfect for:
- Computer science students learning about emergent systems
- Developers interested in animation and simulation
- Anyone curious about how flocking behavior works in nature

## 🚀 Future Enhancements

- [ ] Predator-prey interactions
- [ ] Obstacle avoidance
- [ ] 3D boids simulation
- [ ] Custom boid shapes and colors
- [ ] Export simulation as GIF/video
- [ ] Preset behavior patterns
- [ ] Multi-species flocking

## 📄 License

MIT License - feel free to use this code for educational or commercial projects.

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

**Live Preview**: https://andrewjle.github.io/BoidProject/

Built with ❤️ and modern web technologies
