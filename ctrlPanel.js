/// <reference path="../../TSDef/global.d.ts" />

/*
  
  How to use this library:

  instead of creating DOM elements one at a time with createButton() or createSlider(), instantiate one of these classes instead.
  Just assign variables to keep track of each instance: let myButton = new button(buttonFunction, "button label", totalWidth, totalHeight, offsetX, offsetY)
  the width/height/positioning arguments are optional, but useful for fine-tuning the menu.
  
  to actually show the created elements on the screen properly, create a controlPanel object.
  then, call addElementVertical to add elements from the top down.
  calling addElementHorizontal adds elements side by side in a row.
  all elements in the next row will space according to the tallest element in the row above it.

  finally, you have to call the .position(x, y) method on your controlPanel object in order to actually arrange the elements.

*/

// parameters to be controlled (in the form of an object so that references to parameters can be passed to control functions as strings)
// i access this object in sketch.js, but it's primarily a dependency of the classes in this document.
const params = {
  sigma: 10,  //
  rho: 28,    // I didn't actually make controls for these three, but they're here if I want to
  beta: 8/3,  //
  t: .01,
  partNum: 400, // this one is also never actually used, but it's referenced in the setup of its control
  partSize: 1,
  initSpread: 5,
  initX: 7,
  initY: -9,
  initZ: 0
}

// font settings to be used in all menu elements
let font = "Courier";
let fontSize = "16px"

// this is a container, arranger, and controller for all the controls
class controlPanel {
  constructor() {
    this.visible = true;
    this.x = 0;
    this.y = 0;
    this.controls = [];
  }

  // simply add an element to the vertical array
  addElementVertical(element) {
    this.controls.push(element);
  }

  // either make a horizontal array for at the last index, and/or add this element to an existing one
  addElementHorizontal(element) {
    let arr = this.controls;
    let last = arr.length - 1;
    if(Array.isArray(arr[last])) { // check if there are already multiple elements in this row
      arr[last].push(element);
    } else { // reconfigure row into an array of elements if necessary
      let temp = arr[last];
      arr[last] = [];
      arr[last].push(temp, element);
    }
  }

  // iterate through every item in the panel and adjust everything cumulatively
  position(x, y) {
    let totalX = 0;
    let totalY = 0;
    for(let i = 0; i < this.controls.length; i++) {
      if(Array.isArray(this.controls[i])) {
        let maxY = 0;
        for(let j = 0; j < this.controls[i].length; j++) {
          this.controls[i][j].position(x + totalX, y + totalY);
          totalX += this.controls[i][j].width;
          maxY = max(this.controls[i][j].height, maxY);
        }
        totalY += maxY;
        totalX = 0; // reset this after positioning elements in a row
      } else {
        this.controls[i].position(x, y + totalY);
        totalY += this.controls[i].height;
      }
    }
  }

  // used to hide/show all controls. control has the hide and show functions, but they do nothing unless overriden by the children classes.
  toggleVisible() {
    if(this.visible) {
      this.visible = false;
      // iterate through every control and hide them
      for(let i = 0; i < this.controls.length; i++) {
        if(Array.isArray(this.controls[i])) {
          for(let j = 0; j < this.controls[i].length; j++) {
            if(!this.controls[i][j].fixed) {
              this.controls[i][j].hide();
            }
          }
        } else if(!this.controls[i].fixed) {
          this.controls[i].hide();
        }
      }
    } else {
      this.visible = true;
      // iterate through every control and show them
      for(let i = 0; i < this.controls.length; i++) {
        if(Array.isArray(this.controls[i])) {
          for(let j = 0; j < this.controls[i].length; j++) {
            this.controls[i][j].show();
          }
        } else {
          this.controls[i].show();
        }
      }
    }
  }
}

// this parent class ensures that all children have the information required by a control panel object
class control {
  constructor() {
    this.width = 250; // total width of the control
    this.height = 100; // total height of the control
    this.fixed = false; // set to true to prevent hiding
  }

  position() { // override to account for all constituent elements
    return false;
  }

  hide() { // override to account for all constituent elements
    return false;
  }

  show() { // override to account for all constituent elements
    return false;
  }
}

// takes the function name for func, just like putting it directly in mousePressed()
class button extends control {
  constructor(func, label, width = 90, height = 30, offsetX = 0, offsetY = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.button = createButton(label);
    this.button.mousePressed(func);
    this.button.style("font-family", font);
    this.button.style("font-size", fontSize);
    this.button.style("font-weight", "bold");
  }
  position(x, y) {
    this.button.position(x + this.offsetX, y + this.offsetY);
  }
  hide() {
    this.button.hide();
  }
  show() {
    this.button.show();
  }
}

// this one is pretty self-explanatory
class checkbox extends control {
  constructor(label, val, width = 90, height = 60, offsetX = 0, offsetY = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.checkbox = createCheckbox(label, val);
    this.checkbox.style("color", "#FFFFFF");
    this.checkbox.style("font-family", font);
    this.checkbox.style("font-size", fontSize);
  }
  position(x, y) {
    this.checkbox.position(x + this.offsetX, y + 15 + this.offsetY);
  }
  hide() {
    this.checkbox.hide();
  }
  show() {
    this.checkbox.show();
  }
}

// the default behavior of this is to tie the slider and number values together, as well as point them both to a variable to adjust.
// if more complex behavior is required, manually call the input() functions on the slider and number elements.
class richSlider extends control {
  constructor(variable, label, numberDigits, min, max, val, step, width = 250, height = 70, offsetX = 0, offsetY = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.padding
    this.variable = variable;
    this.elements = {
      label: createP(label),
      slider: createSlider(min, max, val, step),
      number: createInput(str(val), "number")
    }
    this.elements.label.style("color", "#FFFFFF");
    this.elements.label.style("font-family", font);
    this.elements.label.style("font-size", fontSize);
    this.elements.slider.style("width", "150px"); // right now, this assumes 150 width for all sliders
    this.elements.slider.input(() => this.sliderInput(this)); // arrow function expression calls a function outside, passing in all the info about the rich slider (scope issues otherwise)
    this.elements.number.style("width", str(numberDigits * 9 + 15)+"px"); // this approximates the width of the text box, but likely requires fine tuning
    this.elements.number.input(() => this.numberInput(this));
  }

  // these two methods deal with each kind of input
  // they take a richSlider object as an argument because when they're called back to by input(), they're somehow outside of the scope of the object.
  sliderInput(richSlider) {
    params[richSlider.variable] = richSlider.elements.slider.value();
    richSlider.elements.number.value(params[richSlider.variable]);
  }
  numberInput(richSlider) {
    richSlider.elements.slider.value(richSlider.elements.number.value());
    params[richSlider.variable] = richSlider.elements.slider.value();
  }
  // repositioning
  position(x, y) {
    this.elements.label.position(x + 1 + this.offsetX, y + this.offsetY);
    this.elements.slider.position(x + this.offsetX, y + 41 + this.offsetY);
    this.elements.number.position(x + 160 + this.offsetX, y + 40 + this.offsetY); // adapt this if you allow dynamic slider lengths
  }
  hide() {
    this.elements.label.hide();
    this.elements.slider.hide();
    this.elements.number.hide();
  }
  show() {
    this.elements.label.show();
    this.elements.slider.show();
    this.elements.number.show();
  }
}

// just like a rich slider without the slider. also the label is to the left of the input field, and the width of the label must be specified in pixels.
class richNumberInput extends control {
  constructor(variable, label, labelWidthPx, val, numberDigits, width = 80, height = 50, offsetX = 0, offsetY = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.variable = variable;
    this.labelWidth = labelWidthPx;
    this.elements = {
      label: createP(label),
      number: createInput(str(val), "number")
    }
    this.elements.label.style("color", "#FFFFFF");
    this.elements.label.style("font-family", font);
    this.elements.label.style("font-size", fontSize);
    this.elements.number.input(() => this.numberChanged(this));
    this.elements.number.style("width", str(numberDigits * 9 + 15)+"px")
  }
  // again, this must be written as if it's outside the class because of scope issues in input(). is it because of the arrow function?
  numberChanged(richNumberInput) {
    params[richNumberInput.variable] = Number(richNumberInput.elements.number.value());
  }
  position(x, y) {
    this.elements.label.position(x + 1 + this.offsetX, y - 14 + this.offsetY);
    this.elements.number.position(x + this.labelWidth + this.offsetX, y + this.offsetY);
  }
  hide() {
    this.elements.label.hide();
    this.elements.number.hide();
  }
  show() {
    this.elements.label.show();
    this.elements.number.show();
  }
}

// all options for the selector are to be passed in as an array
class richSelector extends control{
  constructor(label, options = [], width = 250, height = 70, offsetX = 0, offsetY = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.elements = {
      label: createP(label),
      selector: createSelect()
    }
    for(let i = 0; i < options.length; i++) {
      this.elements.selector.option(options[i]);
    }
    this.elements.selector.selected(options[0]);
    this.elements.label.style("color", "#FFFFFF");
    this.elements.label.style("font-family", font);
    this.elements.label.style("font-size", fontSize);
    this.elements.selector.style("width", "100px");
    this.elements.selector.style("font-family", font);
    this.elements.selector.style("font-size", fontSize);
    this.elements.selector.style("font-weight", "bold");
  }
  position(x, y) {
    this.elements.label.position(x + 1 + this.offsetX, y + this.offsetY);
    this.elements.selector.position(x + this.offsetX, y + 41 + this.offsetY);
  }
  hide() {
    this.elements.label.hide();
    this.elements.selector.hide();
  }
  show() {
    this.elements.label.show();
    this.elements.selector.show();
  }
}