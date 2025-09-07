# Boids Flocking Simulation

A modern, interactive implementation of Craig Reynolds' boids flocking algorithm with real-time parameter controls and visualizations.

Live preview: https://andrewjle.github.io/BoidProject/

## Overview

Boids simulates emergent group behaviors (birds, fish, swarms) using three simple local rules: separation, cohesion, and alignment. This project adds interactive visualization, per-rule live tuning, demo canvases for each algorithm, and additional usability features such as ghost trails and field-of-view controls.

## Features

- Real-time parameter adjustment with sliders
- Visualization toggles for FOV, neighbor lines, steering forces, and ghost trails
- Live tuning of rule variation (frequency and amplitude)
- Algorithm Showcase: separate demo boids for Separation, Cohesion, and Alignment
- Compact, responsive UI with canvas toolbar (pause/reset)
- Performance optimizations for smooth 60fps animation


## Controls

Controls are grouped into Visualization toggles, Parameters (global), and Simulation controls.

### Visualization toggles
Toggles apply to the focused/selected boid (displayed as the highlighted boid) and help illustrate how rules are computed. Visual toggles are intended to represent flock behavior but are rendered for the selected boid.

- Field of View  
  Show a highlighted region where the boid can detect others. The FOV angle can be 0°–360° (0° = none, 360° = full surround). A blind spot remains behind the boid based on the FOV configuration.

- Neighbor Lines (red)  
  Draws lines between the selected boid and any neighbor inside its FOV and range.

- Separation Vector (green)  
  Displays the separation steering vector: the direction and magnitude the boid uses to repel from neighbors.

- Cohesion Vector (blue)  
  Displays the cohesion steering vector: the direction and magnitude the boid uses to move toward neighbors’ center of mass.

- Alignment Vector (yellow)  
  Displays the alignment steering vector: the direction and magnitude the boid uses to match neighbors’ average heading.

- Ghost Trail  
  Toggle a fading trail that visualizes recent boid positions. Trail length is adjustable with a slider.

- Rule Variation (toggle)  
  Enables/disables the per-frame wave modulation that scales each rule (0%–100%) over time. When enabled, separation/cohesion/alignment are modulated independently per boid for more organic movement.

### Parameters (affect all boids)
Sliders change global simulation parameters. Larger coefficients increase the weight of the corresponding rule.

- Field of View — detection range in pixels (affects how far a boid senses others).
- FOV Angle — viewing cone angle in degrees (0–360). 360° is full surround.
- Separation Coefficient — weight applied to separation steering (0–50).
- Cohesion Coefficient — weight applied to cohesion steering (0–50).
- Alignment Coefficient — weight applied to alignment steering (0–50).
- Max Speed — upper speed limit for boids (1–10).
- Min Speed — lower speed limit for boids (0.1–Max Speed).
- Ghost Trail Length — number of trail samples to render (0 = off).
- Variation Frequency — frequency of the modulation wave (cycles per second).
- Variation Amplitude — how deeply the wave modulates rules (0 = no modulation, 1 = full 0–100% modulation).

Tooltips are available on toggles and sliders to clarify each control.

### Simulation controls
- Pause / Resume — stops or continues the simulation (also available in the canvas toolbar).
- Reset — randomize positions and velocities of all boids. Canvas toolbar includes compact pause/reset at the top-left of the canvas for quick access.

## Algorithm Showcase

The Algorithm Showcase provides isolated demos for each core rule. Selecting a tab spawns a dedicated set of demo boids inside the mini-canvas, with only the selected rule applied. This allows direct observation of how each rule influences motion.

- Separation demo  
  Demo boids apply only the separation rule. Boids will actively repel from nearby boids to maintain spacing.

- Cohesion demo  
  Demo boids apply only the cohesion rule. Boids steer toward the group's center of mass and form clusters.

- Alignment demo  
  Demo boids apply only the alignment rule. Boids attempt to match the average heading of neighbors, producing coordinated motion.

Demo controls (per showcase):
- Pause/Resume demo animation
- Reset demo (respawn demo boids)
- Demo speed control (optional, if available)

## How it works

### Core rules
- Separation: repel from nearby neighbors; stronger when neighbors are closer.
- Cohesion: steer toward the average position of neighbors (center of mass).
- Alignment: steer toward the average velocity/direction of neighbors.

Each rule returns a steering vector that is weighted by its coefficient and (optionally) modulated per-frame by a wave (when Rule Variation is enabled). Final acceleration is composed from these weighted vectors and is applied to the boid’s velocity with speed limits enforced.

### Variation modulation
When enabled, each rule's strength is multiplied per-frame by a smooth wave (sin or cos) normalized to the range 0.0–1.0. Per-boid random phase offsets desynchronize modulation across the flock for more natural motion. Live tuning sliders control modulation frequency and amplitude.

## UI & Layout

- Three-panel layout on desktop: Controls | Canvas | Algorithm Showcase
- Compact canvas toolbar contains Pause and Reset buttons (top-left)
- Controls use a two-column compact layout for toggles and sliders to minimize scrolling
- Tooltips are available on all controls

## Performance notes

- Static pre-allocated vector objects to reduce garbage collection
- Neighbor distance culling and field-of-view checks to reduce computations
- DOM updates minimized; visualization elements reused where possible


## Contributing

Contributions welcome. Open issues for bugs or feature requests and submit pull requests for improvements.
