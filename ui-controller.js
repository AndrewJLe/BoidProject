import { flock } from "./world.js";
import { Vector2D } from "./vector.js";

/**
 * UIController
 *
 * Manages application UI and the algorithm showcase demo canvas. This class
 * wires DOM controls to simulation parameters and provides a lightweight demo
 * environment that visualizes individual boid rules (separation, cohesion,
 * alignment). It intentionally does not perform the main simulation loop; the
 * demo loop is isolated and uses simple plain objects for clarity.
 */
class UIController {
    /**
     * Create a new UIController and initialize UI and demo state.
     */
    constructor() {
        this.isPaused = false;
        this.currentAlgorithm = "overview";
        this.demoCanvas = null;
        this.demoCtx = null;
        this.demoBoids = [];
        this.demoPaused = false;
        this.minSpeed = 0.5;
        this.maxSpeed = 3.0;

        this.initializeUI();
        this.initializeDemoCanvas();
        this.startFPSCounter();
    }

    /**
     * Initialize UI pieces and register event handlers.
     * - Registers tab navigation
     * - Wires control toggles and sliders
     * - Synchronizes visual state when boids become available
     */
    initializeUI() {
        this.setupMainTabs();
        this.setupPanelToggles();
        this.setupParameterControls();
        this.setupSimulationControls();
        this.setupAlgorithmTabs();

        // Visualization controls are safe to set up even before boids exist.
        this.setupVisualizationControls();
        window.addEventListener("boids-ready", () => {
            this.syncVisualizationState();
        });
    }

    /**
     * Sync UI toggle state to the first boid (if present). The toggles are
     * primarily visual debugging aids for a single, highlighted boid; this
     * ensures the panel reflects actual simulation defaults.
     */
    syncVisualizationState() {
        const first = flock[0];
        if (!first) return;

        // Ensure the boids use the current FOV slider value
        this.initializeFOVAngles();

        const mappings = [
            ["fov-switch", "FOVEnabled"],
            ["neighbor-switch", "showNeighbors"],
            ["separate-switch", "showSeparate"],
            ["cohere-switch", "showCohere"],
            ["align-switch", "showAlign"],
        ];

        mappings.forEach(([id, prop]) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!first[prop];
        });

        // Ghost trails and variation are static flags on the Boid class; import
        // the class dynamically to read the defaults without creating a circular
        // dependency at module load time.
        const ghostTrailSwitch = document.getElementById("ghost-trail-switch");
        if (ghostTrailSwitch) {
            import("./boid.js")
                .then((module) => {
                    const { Boid } = module;
                    ghostTrailSwitch.checked = Boid.ghostTrailEnabled;
                })
                .catch((err) => {
                    console.warn("Failed to sync ghost trail state:", err);
                });
        }

        if (first.updateFOVDisplay) {
            first.updateFOVDisplay();
        }
    }

    /**
     * Attach click handlers to the main tab buttons. Expects each tab element
     * to have a `data-tab` attribute matching a panel id suffix.
     */
    setupMainTabs() {
        const mainTabs = document.querySelectorAll(".main-tab");
        const tabPanels = document.querySelectorAll(".tab-panel");

        mainTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const targetTab = tab.getAttribute("data-tab");

                mainTabs.forEach((t) => t.classList.remove("active"));
                tabPanels.forEach((panel) => panel.classList.remove("active"));

                tab.classList.add("active");
                document.getElementById(`${targetTab}-tab`).classList.add("active");
            });
        });
    }

    /**
     * Placeholder for old panel toggles. Kept intentionally minimal.
     */
    setupPanelToggles() {
        // No-op for current layout
    }

    /**
     * Wire visualization toggles (FOV, neighbor lines, steer vectors, trails,
     * variation) to UI controls. These toggles mostly affect the highlighted
     * boid used for visualization, or global Boid flags for class-level features.
     */
    setupVisualizationControls() {
        // Field of view toggle
        const fovSwitch = document.getElementById("fov-switch");
        if (fovSwitch) {
            if (flock[0]) fovSwitch.checked = flock[0].FOVEnabled;
            fovSwitch.addEventListener("change", (e) => {
                if (flock[0]) {
                    flock[0].FOVEnabled = e.target.checked;
                    flock[0].updateFOVDisplay();
                }
            });
        }

        // Neighbor lines toggle
        const neighborSwitch = document.getElementById("neighbor-switch");
        if (neighborSwitch) {
            if (flock[0]) neighborSwitch.checked = flock[0].showNeighbors;
            neighborSwitch.addEventListener("change", (e) => {
                if (flock[0]) flock[0].showNeighbors = e.target.checked;
            });
        }

        // Separation toggle
        const separateSwitch = document.getElementById("separate-switch");
        if (separateSwitch) {
            if (flock[0]) separateSwitch.checked = flock[0].showSeparate;
            separateSwitch.addEventListener("change", (e) => {
                if (flock[0]) {
                    flock[0].showSeparate = e.target.checked;
                    if (!e.target.checked && flock[0].separateSteerElement) {
                        flock[0].separateSteerElement.style.display = "none";
                        flock[0].separateSteerElement.style.height = "0px";
                    } else if (e.target.checked && flock[0].separateSteerElement) {
                        flock[0].separateSteerElement.style.display = "block";
                    }
                }
            });
        }

        // Cohesion toggle
        const cohereSwitch = document.getElementById("cohere-switch");
        if (cohereSwitch) {
            if (flock[0]) cohereSwitch.checked = flock[0].showCohere;
            cohereSwitch.addEventListener("change", (e) => {
                if (flock[0]) {
                    flock[0].showCohere = e.target.checked;
                    if (!e.target.checked && flock[0].cohereSteerElement) {
                        flock[0].cohereSteerElement.style.display = "none";
                        flock[0].cohereSteerElement.style.height = "0px";
                    } else if (e.target.checked && flock[0].cohereSteerElement) {
                        flock[0].cohereSteerElement.style.display = "block";
                    }
                }
            });
        }

        // Alignment toggle
        const alignSwitch = document.getElementById("align-switch");
        if (alignSwitch) {
            if (flock[0]) alignSwitch.checked = flock[0].showAlign;
            alignSwitch.addEventListener("change", (e) => {
                if (flock[0]) {
                    flock[0].showAlign = e.target.checked;
                    if (!e.target.checked && flock[0].alignSteerElement) {
                        flock[0].alignSteerElement.style.display = "none";
                        flock[0].alignSteerElement.style.height = "0px";
                    } else if (e.target.checked && flock[0].alignSteerElement) {
                        flock[0].alignSteerElement.style.display = "block";
                    }
                }
            });
        }

        // Ghost trail toggle (class-level flag)
        const ghostTrailSwitch = document.getElementById("ghost-trail-switch");
        if (ghostTrailSwitch) {
            import("./boid.js")
                .then((module) => {
                    const { Boid } = module;
                    ghostTrailSwitch.checked = Boid.ghostTrailEnabled;
                    ghostTrailSwitch.addEventListener("change", (e) => {
                        Boid.ghostTrailEnabled = e.target.checked;
                        flock.forEach((boid) => {
                            if (boid.trailElements) {
                                boid.trailElements.forEach((el) => {
                                    if (!el) return;
                                    el.style.display = e.target.checked ? "block" : "none";
                                    if (!e.target.checked) el.style.opacity = "0";
                                });
                            }
                        });
                    });
                })
                .catch((err) => console.warn("Failed to import Boid class for ghost trail toggle:", err));
        }

        // Rule variation toggle (class-level flag)
        const variationSwitch = document.getElementById("variation-switch");
        if (variationSwitch) {
            import("./boid.js")
                .then((module) => {
                    const { Boid } = module;
                    variationSwitch.checked = !!Boid.variationEnabled;
                    variationSwitch.addEventListener("change", (e) => {
                        Boid.variationEnabled = e.target.checked;
                    });
                })
                .catch((err) => console.warn("Failed to import Boid class for variation toggle:", err));
        }

        // Make the UI slider visuals toggle the hidden checkbox inputs. This
        // improves the clickable area for toggles.
        const sliders = document.querySelectorAll(".toggle-slider");
        sliders.forEach((slider) => {
            slider.addEventListener("click", (ev) => {
                const container = slider.closest(".toggle-item");
                const input = container ? container.querySelector("input.toggle-switch") : null;
                if (!input) return;
                input.checked = !input.checked;
                input.dispatchEvent(new Event("change", { bubbles: true }));
                ev.stopPropagation();
            });
        });

        // Clicking an entire toggle item should also toggle the input (except
        // when interacting with nested interactive elements).
        const toggleItems = document.querySelectorAll(".toggle-item");
        toggleItems.forEach((item) => {
            item.addEventListener("click", (ev) => {
                const targetTag = ev.target.tagName.toLowerCase();
                if (["input", "button", "a", "label"].includes(targetTag)) return;
                const input = item.querySelector("input.toggle-switch");
                if (!input) return;
                input.checked = !input.checked;
                input.dispatchEvent(new Event("change", { bubbles: true }));
            });
        });
    }

    /**
     * Initialize numeric display values for sliders to match DOM defaults.
     */
    initializeParameterValues() {
        const separationValue = document.getElementById("separation-value");
        const cohereValue = document.getElementById("cohere-value");
        const alignValue = document.getElementById("align-value");

        if (separationValue) separationValue.textContent = "100%";
        if (cohereValue) cohereValue.textContent = "100%";
        if (alignValue) alignValue.textContent = "100%";

        const fovAngleValue = document.getElementById("fov-angle-value");
        if (fovAngleValue) fovAngleValue.textContent = "360°";

        this.initializeFOVAngles();
    }

    /**
     * Read the FOV angle slider and set the boids' FOV accordingly.
     *
     * Converts degrees to radians and calls boid.setFOVAngle on existing boids
     * if that method is available. If boid instances are plain objects or not
     * fully constructed yet, fall back to setting FOV-related properties
     * directly and calling updateFOVDisplay when available.
     */
    initializeFOVAngles() {
        const fovAngleRange = document.getElementById('fov-angle-range');
        const initialAngle = fovAngleRange ? parseInt(fovAngleRange.value, 10) : 360;
        const angleInRadians = (initialAngle * Math.PI) / 180;

        if (!window.flock || window.flock.length === 0) return;

        window.flock.forEach(boid => {
            try {
                if (!boid) return;

                // Preferred API: call the Boid instance method when present
                if (typeof boid.setFOVAngle === 'function') {
                    boid.setFOVAngle(angleInRadians);
                    if (typeof boid.updateFOVDisplay === 'function') {
                        boid.updateFOVDisplay();
                    }
                    return;
                }

                // Fallback: set common FOV properties used by visualization code.
                // Many code paths expect leftSideFOV/rightSideFOV in radians.
                const half = angleInRadians / 2;
                if ('leftSideFOV' in boid && 'rightSideFOV' in boid) {
                    boid.leftSideFOV = half;
                    boid.rightSideFOV = half;
                } else {
                    // Generic fallback property
                    boid.FOVAngle = angleInRadians;
                }

                // If the object exposes an update/display hook, call it.
                if (typeof boid.updateFOVDisplay === 'function') {
                    boid.updateFOVDisplay();
                }
            } catch (err) {
                // Non-fatal: continue for other boids and log for debugging
                console.warn('initializeFOVAngles: failed to apply FOV to a boid', err);
            }
        });
    }

    /**
     * Wire parameter sliders to update the flock's global parameters.
     */
    setupParameterControls() {
        this.initializeParameterValues();

        // FOV range
        const fovRange = document.getElementById("fov-range");
        const fovValue = document.getElementById("fov-value");
        fovRange?.addEventListener("input", (e) => {
            const value = e.target.value;
            fovValue.textContent = value;
            flock.forEach((boid) => (boid.range = parseInt(value)));
            this.updateFOVDisplay();
        });

        // FOV angle
        const fovAngleRange = document.getElementById("fov-angle-range");
        const fovAngleValue = document.getElementById("fov-angle-value");
        fovAngleRange?.addEventListener("input", (e) => {
            const value = parseInt(e.target.value);
            fovAngleValue.textContent = value + "°";
            const angleInRadians = (value * Math.PI) / 180;
            flock.forEach((boid) => boid.setFOVAngle(angleInRadians));
            this.updateFOVDisplay();
        });

        // Separation coefficient
        const separationRange = document.getElementById("separation-range");
        const separationValue = document.getElementById("separation-value");
        separationRange?.addEventListener("input", (e) => {
            const value = e.target.value;
            separationValue.textContent = value + "%";
            const coefficient = parseFloat(value) / 100;
            flock.forEach((boid) => (boid.separationCoefficient = coefficient));
        });

        // Cohesion coefficient
        const cohereRange = document.getElementById("cohere-range");
        const cohereValue = document.getElementById("cohere-value");
        cohereRange?.addEventListener("input", (e) => {
            const value = e.target.value;
            cohereValue.textContent = value + "%";
            const coefficient = parseFloat(value) / 100;
            flock.forEach((boid) => (boid.cohereCoefficient = coefficient));
        });

        // Alignment coefficient
        const alignRange = document.getElementById("align-range");
        const alignValue = document.getElementById("align-value");
        alignRange?.addEventListener("input", (e) => {
            const value = e.target.value;
            alignValue.textContent = value + "%";
            const coefficient = parseFloat(value) / 100;
            flock.forEach((boid) => (boid.alignCoefficient = coefficient));
        });

        // Max speed
        const speedRange = document.getElementById("speed-range");
        const speedValue = document.getElementById("speed-value");
        speedRange?.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = value;
            flock.forEach((boid) => (boid.maxSpeed = value));
        });

        // Ghost trail length
        const trailLengthRange = document.getElementById("trail-length-range");
        const trailLengthValue = document.getElementById("trail-length-value");
        trailLengthRange?.addEventListener("input", (e) => {
            const value = parseInt(e.target.value);
            trailLengthValue.textContent = value;
            flock.forEach((boid) => {
                if (boid.setTrailLength) boid.setTrailLength(value);
            });
        });

        // Variation frequency
        const variationFreqRange = document.getElementById("variation-frequency-range");
        const variationFreqValue = document.getElementById("variation-frequency-value");
        variationFreqRange?.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            if (variationFreqValue) variationFreqValue.textContent = value.toFixed(1);
            import("./boid.js")
                .then((module) => (module.Boid.variationFrequency = value))
                .catch((err) => console.warn("Failed to set Boid variation frequency:", err));
        });

        // Variation amplitude
        const variationAmpRange = document.getElementById("variation-amplitude-range");
        const variationAmpValue = document.getElementById("variation-amplitude-value");
        variationAmpRange?.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            if (variationAmpValue) variationAmpValue.textContent = value.toFixed(2);
            import("./boid.js")
                .then((module) => (module.Boid.variationAmplitude = value))
                .catch((err) => console.warn("Failed to set Boid variation amplitude:", err));
        });
    }

    /**
     * Resize and update the FOV SVG elements for the highlighted boid.
     */
    updateFOVDisplay() {
        if (!(flock[0] && flock[0].SVGElement && flock[0].BlindSpotElement)) return;
        const range = flock[0].range;
        const size = range * 2;
        flock[0].SVGElement.setAttribute("height", size);
        flock[0].SVGElement.setAttribute("width", size);
        flock[0].SVGElement.setAttribute("viewBox", `0 0 ${size} ${size}`);
        try {
            flock[0].SVGElement.style.left = `${-size / 2}px`;
            flock[0].SVGElement.style.top = `${-size / 2}px`;
        } catch (e) {
            // ignore environments where style writes are restricted
        }
        const totalFOVAngle = flock[0].leftSideFOV + flock[0].rightSideFOV;
        flock[0]._setFOVSectorAttributes(flock[0].BlindSpotElement, range, totalFOVAngle);
    }

    /**
     * Wire simulation controls (reset, pause) to UI buttons.
     */
    setupSimulationControls() {
        const resetBtn = document.getElementById("reset-btn");
        const pauseBtn = document.getElementById("pause-btn");
        resetBtn?.addEventListener("click", () => this.resetSimulation());
        pauseBtn?.addEventListener("click", () => this.togglePause());
    }

    /**
     * Register algorithm tab handlers and demo control buttons.
     */
    setupAlgorithmTabs() {
        const tabs = document.querySelectorAll(".tab-btn");
        tabs.forEach((tab) => tab.addEventListener("click", (e) => this.switchAlgorithm(e.target.dataset.algorithm)));

        const demoResetBtn = document.getElementById("demo-reset-btn");
        const demoPauseBtn = document.getElementById("demo-pause-btn");
        if (demoResetBtn) demoResetBtn.addEventListener("click", () => this.resetDemoBoids());
        if (demoPauseBtn) demoPauseBtn.addEventListener("click", () => this.toggleDemoPause());
    }

    /**
     * Switch the demo algorithm and recreate demo boids if needed.
     *
     * @param {string} algorithm - one of 'overview', 'separation', 'cohesion', 'alignment'
     */
    switchAlgorithm(algorithm) {
        this.currentAlgorithm = algorithm;
        document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
        document.querySelector(`[data-algorithm="${algorithm}"]`)?.classList.add("active");
        if (algorithm !== "overview") this.createDemoBoids();
        this.updateAlgorithmInfo(algorithm);
        this.updateDemoCanvas(algorithm);
    }

    /**
     * Update descriptive content for the algorithm info panel.
     *
     * @param {string} algorithm
     */
    updateAlgorithmInfo(algorithm) {
        const infoElement = document.getElementById("algorithm-info");
        if (!infoElement) return;
        const algorithmData = {
            overview: {
                title: "Flocking Behavior",
                description: "Boids follow three simple rules that create emergent flocking behavior:",
                items: [
                    "<strong>Separation:</strong> Avoid crowding neighbors",
                    "<strong>Cohesion:</strong> Steer towards the center of neighbors",
                    "<strong>Alignment:</strong> Steer towards the average heading of neighbors",
                ],
            },
            separation: {
                title: "Separation Algorithm",
                description: "Each boid steers away from nearby neighbors to avoid collisions:",
                items: [
                    "<strong>Calculate:</strong> Distance to each neighbor",
                    "<strong>Weight:</strong> Closer neighbors have stronger repulsion",
                    "<strong>Direction:</strong> Point away from neighbor positions",
                    "<strong>Result:</strong> Smooth spacing between boids",
                ],
            },
            cohesion: {
                title: "Cohesion Algorithm",
                description: "Boids are attracted to the center of mass of their neighbors:",
                items: [
                    "<strong>Calculate:</strong> Average position of neighbors",
                    "<strong>Direction:</strong> Vector from boid to center of mass",
                    "<strong>Strength:</strong> Proportional to distance from center",
                    "<strong>Result:</strong> Boids naturally group together",
                ],
            },
            alignment: {
                title: "Alignment Algorithm",
                description: "Boids try to match the average velocity of their neighbors:",
                items: [
                    "<strong>Calculate:</strong> Average velocity of neighbors",
                    "<strong>Adjust:</strong> Gradually turn towards average direction",
                    "<strong>Speed:</strong> Match the group's movement speed",
                    "<strong>Result:</strong> Coordinated group movement",
                ],
            },
        };
        const data = algorithmData[algorithm];
        if (data) {
            infoElement.innerHTML = `
                                <h3>${data.title}</h3>
                                <p>${data.description}</p>
                                <ul>
                                        ${data.items.map((item) => `<li>${item}</li>`).join("")}
                                </ul>
                        `;
        }
    }

    /**
     * Initialize the demo canvas context and start the demo animation.
     */
    initializeDemoCanvas() {
        this.demoCanvas = document.getElementById("demo-canvas");
        if (!this.demoCanvas) return;
        this.demoCtx = this.demoCanvas.getContext("2d");
        this.createDemoBoids();
        this.startDemoAnimation();
    }

    /**
     * Create a small set of demo boids (plain objects) for the showcase.
     * Demo boids are intentionally lightweight and separate from the main Boid
     * class to keep the showcase deterministic and easy to reason about.
     */
    createDemoBoids() {
        this.demoBoids = [];
        for (let i = 0; i < 6; i++) {
            this.demoBoids.push({
                x: Math.random() * 480 + 35,
                y: Math.random() * 280 + 35,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                neighbors: [],
            });
        }
        this.enforceVelocityLimits();
    }

    /**
     * Clear and redraw the demo canvas for the selected algorithm.
     *
     * @param {string} algorithm
     */
    updateDemoCanvas(algorithm) {
        if (!this.demoCtx || this.demoPaused) return;
        this.demoCtx.fillStyle = "#000";
        this.demoCtx.fillRect(0, 0, 550, 350);
        this.drawDemoBoids(algorithm);
    }

    /**
     * Update demo boid physics for the chosen algorithm and render everything.
     *
     * @param {string} algorithm
     */
    drawDemoBoids(algorithm) {
        this.demoCtx.save();
        this.demoBoids.forEach((boid, index) => {
            if (algorithm === "separation") this.applySeparation(boid, index);
            else if (algorithm === "cohesion") this.applyCohesion(boid, index);
            else if (algorithm === "alignment") this.applyAlignment(boid, index);
            else {
                boid.x += boid.vx;
                boid.y += boid.vy;
            }

            // Wrap edges
            if (boid.x < 0) boid.x = 520;
            if (boid.x > 520) boid.x = 0;
            if (boid.y < 0) boid.y = 320;
            if (boid.y > 320) boid.y = 0;
        });

        this.enforceVelocityLimits();

        if (algorithm === "separation") this.drawSeparationDemo();
        else if (algorithm === "cohesion") this.drawCohesionDemo();
        else if (algorithm === "alignment") this.drawAlignmentDemo();

        this.demoBoids.forEach((boid, index) => this.drawDemoBoid(boid, index === 0));
        this.demoCtx.restore();
    }

    /**
     * Draw a single demo boid as a rotated triangle.
     *
     * @param {{x:number,y:number,vx:number,vy:number}} boid
     * @param {boolean} isMain
     */
    drawDemoBoid(boid, isMain = false) {
        this.demoCtx.save();
        this.demoCtx.translate(boid.x, boid.y);
        this.demoCtx.rotate(Math.atan2(boid.vy, boid.vx));
        this.demoCtx.fillStyle = isMain ? "#ffffff" : "#64748b";
        this.demoCtx.beginPath();
        this.demoCtx.moveTo(8, 0);
        this.demoCtx.lineTo(-4, -3);
        this.demoCtx.lineTo(-4, 3);
        this.demoCtx.closePath();
        this.demoCtx.fill();
        this.demoCtx.restore();
    }

    /**
     * Visualize separation: repulsion vectors and neighbor circles for the
     * main demo boid.
     */
    drawSeparationDemo() {
        const mainBoid = this.demoBoids[0];
        this.demoCtx.strokeStyle = "#10b981";
        this.demoCtx.lineWidth = 2;
        this.demoBoids.slice(1).forEach((boid) => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 60) {
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
                this.demoCtx.lineTo(mainBoid.x - dx * 0.5, mainBoid.y - dy * 0.5);
                this.demoCtx.stroke();
                this.demoCtx.strokeStyle = "#ef4444";
                this.demoCtx.beginPath();
                this.demoCtx.arc(boid.x, boid.y, 20, 0, Math.PI * 2);
                this.demoCtx.stroke();
                this.demoCtx.strokeStyle = "#10b981";
            }
        });
    }

    /**
     * Visualize cohesion: center of mass and attraction vector to it.
     */
    drawCohesionDemo() {
        const mainBoid = this.demoBoids[0];
        let centerX = 0,
            centerY = 0,
            count = 0;
        this.demoBoids.slice(1).forEach((boid) => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 80) {
                centerX += boid.x;
                centerY += boid.y;
                count++;
                this.demoCtx.strokeStyle = "#3b82f6";
                this.demoCtx.lineWidth = 1;
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
                this.demoCtx.lineTo(boid.x, boid.y);
                this.demoCtx.stroke();
            }
        });
        if (count > 0) {
            centerX /= count;
            centerY /= count;
            this.demoCtx.fillStyle = "#3b82f6";
            this.demoCtx.beginPath();
            this.demoCtx.arc(centerX, centerY, 5, 0, Math.PI * 2);
            this.demoCtx.fill();
            this.demoCtx.strokeStyle = "#3b82f6";
            this.demoCtx.lineWidth = 3;
            this.demoCtx.beginPath();
            this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
            this.demoCtx.lineTo(centerX, centerY);
            this.demoCtx.stroke();
        }
    }

    /**
     * Visualize alignment: neighbor velocity vectors and the average heading.
     */
    drawAlignmentDemo() {
        const mainBoid = this.demoBoids[0];
        let avgVx = 0,
            avgVy = 0,
            count = 0;
        this.demoBoids.slice(1).forEach((boid) => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 80) {
                avgVx += boid.vx;
                avgVy += boid.vy;
                count++;
                this.demoCtx.strokeStyle = "#f59e0b";
                this.demoCtx.lineWidth = 2;
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(boid.x, boid.y);
                this.demoCtx.lineTo(boid.x + boid.vx * 20, boid.y + boid.vy * 20);
                this.demoCtx.stroke();
            }
        });
        if (count > 0) {
            avgVx /= count;
            avgVy /= count;
            this.demoCtx.strokeStyle = "#f59e0b";
            this.demoCtx.lineWidth = 4;
            this.demoCtx.beginPath();
            this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
            this.demoCtx.lineTo(mainBoid.x + avgVx * 30, mainBoid.y + avgVy * 30);
            this.demoCtx.stroke();
        }
    }

    /**
     * Clamp demo boid speeds to configured min/max and ensure non-zero velocity.
     */
    enforceVelocityLimits() {
        this.demoBoids.forEach((boid) => {
            const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
            if (speed > this.maxSpeed) {
                boid.vx = (boid.vx / speed) * this.maxSpeed;
                boid.vy = (boid.vy / speed) * this.maxSpeed;
            } else if (speed < this.minSpeed && speed > 0) {
                boid.vx = (boid.vx / speed) * this.minSpeed;
                boid.vy = (boid.vy / speed) * this.minSpeed;
            } else if (speed === 0) {
                const angle = Math.random() * Math.PI * 2;
                boid.vx = Math.cos(angle) * this.minSpeed;
                boid.vy = Math.sin(angle) * this.minSpeed;
            }
        });
    }

    /** Reset demo boids by respawning them. */
    resetDemoBoids() {
        this.createDemoBoids();
    }

    /** Toggle demo paused state and update the demo button UI. */
    toggleDemoPause() {
        this.demoPaused = !this.demoPaused;
        const demoPauseBtn = document.getElementById("demo-pause-btn");
        if (!demoPauseBtn) return;
        if (this.demoPaused) {
            demoPauseBtn.innerHTML = "<i class=\"fas fa-play\"></i>";
            demoPauseBtn.title = "Resume Demo";
        } else {
            demoPauseBtn.innerHTML = "<i class=\"fas fa-pause\"></i>";
            demoPauseBtn.title = "Pause Demo";
        }
    }

    /**
     * Separation force for demo boids. Moves a boid away from neighbors within
     * a threshold distance.
     *
     * @param {Object} boid
     * @param {number} boidIndex
     */
    applySeparation(boid, boidIndex) {
        let separationForceX = 0;
        let separationForceY = 0;
        let count = 0;
        this.demoBoids.forEach((other, otherIndex) => {
            if (boidIndex === otherIndex) return;
            const dx = boid.x - other.x;
            const dy = boid.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 60 && distance > 0) {
                const nx = dx / distance;
                const ny = dy / distance;
                const strength = (60 - distance) / 60;
                separationForceX += nx * strength;
                separationForceY += ny * strength;
                count++;
            }
        });
        if (count > 0) {
            separationForceX /= count;
            separationForceY /= count;
            boid.vx += separationForceX * 0.1;
            boid.vy += separationForceY * 0.1;
        }
        boid.vx *= 0.995;
        boid.vy *= 0.995;
        boid.x += boid.vx;
        boid.y += boid.vy;
    }

    /**
     * Cohesion force for demo boids: steer toward nearby boids' center of mass.
     */
    applyCohesion(boid, boidIndex) {
        let centerX = 0;
        let centerY = 0;
        let count = 0;
        this.demoBoids.forEach((other, otherIndex) => {
            if (boidIndex === otherIndex) return;
            const dx = boid.x - other.x;
            const dy = boid.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 80) {
                centerX += other.x;
                centerY += other.y;
                count++;
            }
        });
        if (count > 0) {
            centerX /= count;
            centerY /= count;
            const dx = centerX - boid.x;
            const dy = centerY - boid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                boid.vx += (dx / distance) * 0.02;
                boid.vy += (dy / distance) * 0.02;
            }
        }
        boid.vx *= 0.995;
        boid.vy *= 0.995;
        boid.x += boid.vx;
        boid.y += boid.vy;
    }

    /**
     * Alignment force for demo boids: match neighbors' average velocity.
     */
    applyAlignment(boid, boidIndex) {
        let avgVx = 0;
        let avgVy = 0;
        let count = 0;
        this.demoBoids.forEach((other, otherIndex) => {
            if (boidIndex === otherIndex) return;
            const dx = boid.x - other.x;
            const dy = boid.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 80) {
                avgVx += other.vx;
                avgVy += other.vy;
                count++;
            }
        });
        if (count > 0) {
            avgVx /= count;
            avgVy /= count;
            boid.vx += (avgVx - boid.vx) * 0.05;
            boid.vy += (avgVy - boid.vy) * 0.05;
        }
        boid.vx *= 0.995;
        boid.vy *= 0.995;
        boid.x += boid.vx;
        boid.y += boid.vy;
    }

    /** Start demo animation loop. */
    startDemoAnimation() {
        const animate = () => {
            this.updateDemoCanvas(this.currentAlgorithm);
            requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Reset main simulation boids to random positions and velocities. This is a
     * convenience triggered from the UI; it does not change persistent settings.
     */
    resetSimulation() {
        flock.forEach((boid) => {
            boid.position.x = Math.random() * 800;
            boid.position.y = Math.random() * 600;
            boid.velocity.x = (Math.random() - 0.5) * 6;
            boid.velocity.y = (Math.random() - 0.5) * 6;
            boid.neighbors.clear();
            boid.neighborDistances.clear();
        });
    }

    /**
     * Toggle main simulation pause state and dispatch an event the main loop
     * can listen to.
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById("pause-btn");
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused ? "<i class='fas fa-play'></i>" : "<i class='fas fa-pause'></i>";
        }
        window.dispatchEvent(
            new CustomEvent("simulation-pause-toggle", { detail: { isPaused: this.isPaused } })
        );
    }

    /** Start an FPS counter that updates once per second. */
    startFPSCounter() {
        let frames = 0;
        let lastTime = performance.now();
        const updateFPS = () => {
            frames++;
            const currentTime = performance.now();
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                const fpsElement = document.getElementById("fps-counter");
                if (fpsElement) fpsElement.textContent = fps;
                frames = 0;
                lastTime = currentTime;
            }
            requestAnimationFrame(updateFPS);
        };
        updateFPS();
    }

    /** Update displayed boid count in the UI. */
    updateBoidCount(count) {
        const countElement = document.getElementById("boid-count");
        if (countElement) countElement.textContent = count;
    }
}

// Initialize UI when DOM is ready
document.addEventListener("DOMContentLoaded", () => new UIController());

export { UIController };
