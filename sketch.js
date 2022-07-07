/// <reference path="../../TSDef/p5/global.d.ts" />

// parameters to be controlledst
const controls = {
  sigma: 10,
  rho: 28,
  beta: 8.0 / 3.0,
  t: .01,
  partNum: 400,
  partSize: 1,
  outlines: false,
  view: "rotate",
  trace: false,
  spread: 5,
  spawnPoint: {x: 7, y: -9, z: 0}
}
let paused = false;
let fpsGraph;

let clock = -600; // allows the camera to orbit in "rotate" view. -600 looks good at the start of the default settings
let fov; // used for remembering current field of view and resizing the window
// looking back, I could have just moved the camera to get a similar effect as this.
// however, this lets me directly use 1 as the smallest particle size which is nice.
let scaleFactor = 4;
let scaleFactorTail = scaleFactor * 1; // in case you want to to exaggerate speed stretch (doesn't look that good)

const particles = [];




// define a particle class
class particle {
  constructor(x, y, z, color) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.dir = createVector(0, 0, 0);
  }
  
  // move the particle to its next position in time and get new size from speed  
  update(sigma, rho, beta, t) {
    let dx = sigma * (this.y - this.x);
    let dy = this.x * (rho - this.z) - this.y;
    let dz = this.x * this.y - beta * this.z;
    this.x += dx * t;
    this.y += dy * t;
    this.z += dz * t;
    this.dir.set(dx * t, dy * t, dz * t); // set the velocity vector
  }

  // draw a speed-stretched box between the current and previous positions
  draw() {
    let initVec = createVector(1, 0, 0); // represents the box's x axis (arbitrarily, but so that I can scale the box's width property)
    push();
    translate(this.x * scaleFactor, this.y * scaleFactor, this.z * scaleFactor); // get to position
    // this line is bonkers.
    // we decide the box is traveling along its x axis (or the vector [1, 0, 0]), so that we can simply scale its width.
    // we get the angle between that vector and the velocity vector which together define a plane.
    // we then rotate by that angle around an axis normal to that plane (axis vector obtained from cross product).
    // it's important to use the absolute value of that angle (0 <= angle <= 180), otherwise it doesn't work right (i don't know why, mathematically).
    rotate(abs(initVec.angleBetween(this.dir)), initVec.cross(this.dir)); // align box x axis with direction
    translate(-this.dir.mag() * scaleFactorTail / 2, 0, 0); // adjust box origin from the center to front face
    fill(this.color);
    box(max(this.dir.mag() * scaleFactorTail, controls.partSize), controls.partSize, controls.partSize); // draw box elongated to previous location
    pop();
  }
}



// spawn particles
function createParticles(number) {
  const colRand = [0, 0, 0];
  for(let i = 0; i < number; i++) {
    let colRandIndex = random([0, 1, 2]);
    colRand[colRandIndex] = 255;
    // this wacky lil formula randomly targets an rgb component other than the one selected previously
    // and assigns it a random value 0-255
    colRand[(random([1, 2]) + colRandIndex) % 3] = random(255);
    particles.push(new particle(
      random(-1, 1) * max(controls.spread, .000000001) + controls.spawnPoint.x, // minimum spread is 1 billionth of a unit
      random(-1, 1) * max(controls.spread, .000000001) - controls.spawnPoint.y,
      random(-1, 1) * max(controls.spread, .000000001) + controls.spawnPoint.z + 27,
      color(...colRand)));
  }
}

// reset trace when switching views
function viewChanged() {
  trace.checkbox.checked(false);
}

// yup, it's that easy.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}




function setup() {
  pixelDensity(1); // account for high-density displays
  createCanvas(windowWidth, windowHeight, WEBGL); // 3D mode
  background(0); // initialize
  
  // set up gui
  // define where the control panel should go
  const controlsContainer = createDiv();
  controlsContainer.id("controlsContainer");
  controlsContainer.style("position", "fixed"); // always visible, even when scrolling
  controlsContainer.style("top", "10px");
  controlsContainer.style("left", "10px"); // left or right
  controlsContainer.style("width", "300px");
  // create a pane as a child of the previously created div
  const pane = new Tweakpane.Pane({container: document.getElementById("controlsContainer"), title: "controls", expanded: true});
  pane.registerPlugin(TweakpaneEssentialsPlugin); // add plugin for fpsgraph
  pane.addSeparator();
  const pauseBtn = pane.addButton({title: "pause"}); // create pause button
  pauseBtn.on("click", () => { // alternatively, use () => yourFunc(anArg, anotherArg) to call any function with arguments
    if(!paused) {
      paused = true;
      pauseBtn.title = "resume";
    } else {
      paused = false;
      pauseBtn.title = "pause";
    }
  });
  pane.addSeparator();

  pane.addInput(controls, "t", {label: "time step", min: 0.0001, max: 0.01, format: (v) => v.toFixed(4)});
  pane.addInput(controls, "partNum", {label: "particle number", min: 1, max: 1000, step: 1}).on("change", (ev) => {

    // IS THIS SETTING PART NUM BEFORE THIS CODE??

    if(controls.partNum > particles.length) { // update particles
      createParticles(controls.partNum - particles.length);
    } else {
      let dif = particles.length - controls.partNum;
      for(let i = 0; i < dif; i++) {
        particles.shift();
      }
    }
  });
  pane.addInput(controls, "partSize", {label: "particle size", min: 1, max: 30, step: 1});
  pane.addInput(controls, "outlines", {label: "draw outlines"});
  pane.addInput(controls, "trace");
  pane.addInput(controls, "view", {options: {rotate: "rotate", top: "top", bottom: "bottom", side: "side"}});
  pane.addSeparator();
  pane.addButton({title: "respawn particles"}).on("click", () => {
    background(0);
    while(particles.length > 0) { // delete existing particles
      particles.pop();
    }
    createParticles(controls.partNum);
    if(paused) {
      paused = false;
      pauseBtn.title = "pause";
    }
  })
  pane.addInput(controls, "spread");
  pane.addInput(controls, "spawnPoint", {label: "spawn point", x: {min: -30, max: 30}, y: {min: -30, max: 30}, z: {min: -30, max: 30}});
 
  pane.addSeparator();
  const stats = pane.addFolder({title: "stats", expanded: false});
  fpsGraph = stats.addBlade({view: "fpsgraph", label: "fps"});

  // set up particles
  createParticles(controls.partNum);
}




function draw() {
  fpsGraph.begin();
  if(!paused) {
    if(!controls.trace) { // clear every frame or not
      background(0);
    }
    push();
    if(controls.outlines) { // draw outlines or not
      stroke(64);
      strokeWeight(.66); // good value if you want to use larger particle sizes
    } else {
      noStroke();
    }
    translate(0, 0, -27 * scaleFactor); // center the system
    let len = particles.length;
    for(let i = 0; i < len; i++) { // calculate and draw the actual particles
      particles[i].update(controls.sigma, controls.rho, controls.beta, controls.t);
      particles[i].draw();
    }
    pop();

    // camera controls
    switch(controls.view) { // based on the currently selected view
      case "rotate":
        if(!controls.trace) {
          traceClicked = true;
          // draw box to help visualize rotation
          push();
          stroke(255, 64);
          noFill();
          box(60 * scaleFactor);
          pop();
        } else if(traceClicked) {
          background(0);
          traceClicked = false;
        }
        camera(sin(clock / 360) * 100 * scaleFactor, cos(clock / 360) * 100 * scaleFactor, 0, 0, 0, 0, 0, 0, -1); // orbital camera
        fov = PI / 3;
        perspective(fov, width / height); // reset FoV, update aspect ratio to allow proper screen resizing
        break;
      case "top":
        camera(0, 0, 212 * scaleFactor, 0, 0, 0, 0, 1, 0); // fixed camera
        fov = .4;
        perspective(fov, width / height); // zoom in with FoV
        break;
      case "bottom":
        camera(0, 0, -212 * scaleFactor, 0, 0, 0, 0, 1, 0);
        fov = .4;
        perspective(fov, width / height);
        break;
      case "side":
        camera(150 * scaleFactor, -150 * scaleFactor, 0, 0, 0, 0, 0, 0, -1);
        fov = .4;
        perspective(fov, width / height);
        break;
    }
    clock++;
  }
  fpsGraph.end();
}