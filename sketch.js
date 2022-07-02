/// <reference path="../../TSDef/global.d.ts" />

// gui
let controls = new controlPanel(); // this abstracts DOM elements in a way that lets me easily manage and position them
let pauseButton; // this button functions as a giant checkbox
let paused = false;
let hideButton; // so does this one
let hidden = false;
let tSlider;
let partNumSlider;
let partSizeSlider;
let outlines;
let view;
let trace;
let traceClicked = false;
let initButton;
let initialSpread;
let initialX;
let initialY;
let initialZ;

// app
let clock = -600; // allows the camera to orbit in "rotate" view. -600 looks good at the start of the default settings
let fov; // used for remembering current field of view and resizing the window
// looking back, I could have just moved the camera to get a similar effect as this.
// however, this lets me directly use 1 as the smallest particle size which is nice.
let scaleFactor = 4;
let scaleFactorTail = scaleFactor * 1; // in case you want to to exaggerate speed stretch (doesn't look that good)

// controlled parameters located in ctrlPanel.js

const fps = [];
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
    box(max(this.dir.mag() * scaleFactorTail, params.partSize), params.partSize, params.partSize); // draw box elongated to previous location
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
      random(-1, 1) * max(params.initSpread, .000000001) + params.initX, // minimum spread is 1 billionth of a unit
      random(-1, 1) * max(params.initSpread, .000000001) - params.initY,
      random(-1, 1) * max(params.initSpread, .000000001) + params.initZ + 27,
      color(...colRand)));
  }
}

// these two functions called by the part num slider and input
function changePartNumSlider() {
  params.partNum = partNumSlider.elements.slider.value(); // update variable
  partNumSlider.elements.number.value(params.partNum); // update number
  if(params.partNum > particles.length) { // update particles
    createParticles(params.partNum - particles.length);
  } else {
    let dif = particles.length - params.partNum;
    for(let i = 0; i < dif; i++) {
      particles.shift();
    }
  }
}
function changePartNumNumber() {
  partNumSlider.elements.slider.value(partNumSlider.elements.number.value()); // update slider
  params.partNum = partNumSlider.elements.slider.value(); // update variable from slider
  if(params.partNum > particles.length) { // update particles
    createParticles(params.partNum - particles.length);
  } else {
    let dif = particles.length - params.partNum;
    for(let i = 0; i < dif; i++) {
      particles.shift();
    }
  }
}

// called when pause button is pressed
function toggle_pause() {
  if(!paused) {
    pauseButton.button.html("resume")
    paused = true;
  } else {
    pauseButton.button.html("pause")
    paused = false;
  }
}

// called when hide button is pressed
function toggle_hide() {
  if(!hidden) {
    hideButton.button.html("show controls");
    hidden = true;
    controls.toggleVisible();
  } else {
    hideButton.button.html("hide controls");
    hidden = false;
    controls.toggleVisible();
  }
}

// reset trace when switching views
function viewChanged() {
  trace.checkbox.checked(false);
}

// clear and respawn particles
function initialize() {
  background(0);
  while(particles.length > 0) { // delete existing particles
    particles.pop();
  }
  createParticles(params.partNum);
  if(paused) { // unpause when respawning
    toggle_pause();
  }
}

// yup, it's that easy.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}




function setup() {
  pixelDensity(1); // account for high-density displays
  createCanvas(windowWidth, windowHeight, WEBGL); // 3D mode
  background(0); // initialize
  
  // set up controls with classes from ctrlPanel.js
  pauseButton = new button(toggle_pause, "pause");
  pauseButton.fixed = true; // always visible
  hideButton = new button(toggle_hide, "hide controls");
  hideButton.fixed = true; // always visible
  tSlider = new richSlider("t", "- timestep -------------", 5, 0.0001, .012, params.t, 0.0001);
  partNumSlider = new richSlider("partNum", "- number of particles --", 3.5, 1, 1000, params.partNum, 1,);
  partNumSlider.elements.slider.input(changePartNumSlider); // override standard behavior on these two
  partNumSlider.elements.number.input(changePartNumNumber); // they need to call a function to change partnum instead of just changing the variable
  partSizeSlider = new richSlider("partSize", "- particle size --------", 2, 1, 30, params.partSize, 1);
  outlines = new checkbox("particle outlines", false, 100, 100);
  view = new richSelector("- view -----------------", ["rotate", "top", "bottom", "side"], 130, 160);
  view.elements.selector.changed(viewChanged);
  trace = new checkbox("trace", false, 100, 50, 0, 27); // this uses the offset arguments to position it within "view"
  initButton = new button(initialize, "respawn", 100, 35);
  initialSpread = new richNumberInput("initSpread", "spread", 67, params.initSpread, 4, 100, 33);
  initialX = new richNumberInput("initX", "X", 15, params.initX, 3);
  initialY = new richNumberInput("initY", "Y", 15, params.initY, 3);
  initialZ = new richNumberInput("initZ", "Z", 15, params.initZ, 3);


  // add controls to the control panel
  // everything is added from top top bottom (left to right for elements in the same row)
  controls.addElementVertical(pauseButton);
  controls.addElementHorizontal(hideButton);
  controls.addElementVertical(tSlider);
  controls.addElementVertical(partNumSlider);
  controls.addElementVertical(partSizeSlider);
  controls.addElementVertical(outlines);
  controls.addElementVertical(view);
  controls.addElementHorizontal(trace);
  controls.addElementVertical(initButton);
  controls.addElementVertical(initialSpread);
  controls.addElementVertical(initialX);
  controls.addElementHorizontal(initialY);
  controls.addElementHorizontal(initialZ);
  
  // put a little border there 
  controls.position(10, 10);

  // set up particles
  createParticles(params.partNum);
}




function draw() {
  if(!paused) {
    if(!trace.checkbox.checked()) { // clear every frame or not
      background(0);
    }
    push();
    if(outlines.checkbox.checked()) { // draw outlines or not
      stroke(64);
      strokeWeight(.66); // good value if you want to use larger particle sizes
    } else {
      noStroke();
    }
    translate(0, 0, -27 * scaleFactor); // center the system
    let len = particles.length;
    for(let i = 0; i < len; i++) { // calculate and draw the actual particles
      particles[i].update(params.sigma, params.rho, params.beta, params.t);
      particles[i].draw();
    }
    pop();

    // camera controls
    switch(view.elements.selector.value()) { // based on the currently selected view
      case "rotate":
        if(!trace.checkbox.checked()) {
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
        fov = .3;
        perspective(fov, width / height); // zoom in with FoV
        break;
      case "bottom":
        camera(0, 0, -212 * scaleFactor, 0, 0, 0, 0, 1, 0);
        fov = .3;
        perspective(fov, width / height);
        break;
      case "side":
        camera(150 * scaleFactor, -150 * scaleFactor, 0, 0, 0, 0, 0, 0, -1);
        fov = .3;
        perspective(fov, width / height);
        break;
    }
    clock++;
  }
}