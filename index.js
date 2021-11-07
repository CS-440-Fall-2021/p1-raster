"use strict";

let gl; // WebGL "context"
let program;

let t = 0.0;
let modeVal = 1.0;
let lightPos = [1.0, 1.0, -1.0];
let lightVec = new Float32Array(3);
let ambientColor = [0.2, 0.5, 0.0];
let diffuseColor = [0.8, 0.4, 0.0];
let specularColor = [1.0, 1.0, 1.0];
let clearColor = [0.0, 0.4, 0.7];
let attenuation = 0.01;
let shininess = 2.0;
let kaVal = 1.0;
let kdVal = 1.0;
let ksVal = 1.0;

let vBuffer;
let cBuffer;
let points;
let canvas;

var xmin = 0;
var zmin = 0;

let flag = 0;

var xmax;
var zmax;

let escape = false;
// var near = 0.3;
// var far = 3.0;
var radius = 4.0;
var theta = 0.0;
var phi = 0.0;
var dr = (5.0 * Math.PI) / 180.0;

var fovy = 45.0; // Field-of-view in Y direction angle (in degrees)
var aspect; // Viewport aspect ratio

var normalLoc = 0;
var normalMatrixLoc = 0;

var modeLoc = 0;
var kaLoc = 0;
var kdLoc = 0;
var ksLoc = 0;
var attenuationLoc = 0;
var shininessLoc = 0;
var lightPosLoc = 0;
var lightVecLoc = 0;
var ambientColorLoc = 0;
var diffuseColorLoc = 0;
var specularColorLoc = 0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var modelviewInv = new Float32Array(16);
var normalmatrix = new Float32Array(16);

// var eye = vec3(1, 0.5, 1.0);
// let at = vec3(0.0, 0.0, 0.0);
// let up = vec3(0.0, 1.0, 0.0);

// let eye = vec3(0.0, 0.3, 1.0);
// // let at_vector = vec3(0.0, -1.0, -1.0);
// // let at = add(eye, at_vector);
// let at = vec3(0.0, -0.2, -1.0);
// at = add(eye, at);
// let up = vec3(0.0, 1.0, 0.0);

let eye = vec3(300, 1000, -300.0);
// let at_vector = vec3(0.0, -1.0, -1.0);
// let at = add(eye, at_vector);
let at = vec3(0.0, -250.0, 300);
at = add(eye, at);
let up = vec3(0.0, 1.0, 0.0);

let left = -0.1;
let right = 0.1;
let bottom = -0.5;
let top_ = 0.5;
let near = 1.0;
let far = -1.0;

var drawmodes = ["t", "p", "l"];
var drawmode_idx = 0;

var shadingmodes = [1.0, 2.0, 3.0];
var shadingmode_idx = 0;

var row_length;
var col_length;

// var vpMatrix = mat4(); // View projection matrix

var rotMat;

var anim;

let transformMatrixUniform;
//--------------------------------------------------------------------------------------------------------------------------

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) alert("WebGL 2.0 isn't available");
  // drawmode = gl.TRIANGLES;

  //  Configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.55686, 0.70196, 0.81961, 1.0);
  gl.enable(gl.DEPTH_TEST);

  xmax = canvas.width;
  zmax = canvas.height;

  // eye = vec3(1, 0.5, 1.0);

  //  Load shaders and initialize attribute buffers
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
  // transformMatrixUniform = gl.getUniformLocation(program, "uTransformMatrix");

  // get_patch(xmin, xmax, zmin, zmax)
  // points = get_patch2(0, canvas.width, 0, canvas.height);
  // points = get_patch(0, canvas.width, 0, canvas.height);

  // -------------------------

  points = get_patch2(0, 600, 0, 600);
  let shapes = {};
  shapes.hmap = {};
  shapes.hmap.Start = 0;
  shapes.hmap.Vertices = points.length;

  // for (var i = 0; i < points.length; i++) {
  //   points[i][1] =
  //     (Math.sin(points[i][0] * 1.5) / 3 + Math.sin(points[i][2] * 1) / 2) * 100;
  // }

  // Try to build a wireframe representation from triangles
  try {
    shapes.hmapWires = {};
    shapes.hmapWires.Start = points.length;
    points = points.concat(TrianglesToWireframe(points));
    shapes.hmapWires.Vertices = points.length - shapes.hmapWires.Start;
  } catch (error) {
    console.log("TrianglesToWireframe stopped unexpectedly or not defined!");
    console.error(error);
    TrianglesToWireframe = null;
    shapes.hmapWires.Vertices = 0;
  }

  // ------------------------

  // for (let i = 0; i < points.length; i++) {
  //   // points[i][1] = getHeight(points[i][0], points[i][2]);
  //   // points[i][1] = map_point(0, canvas.height, 0, 1, y);
  //   // points[i][0] = map_point(0, canvas.width, -1, 1, points[i][0]);
  //   // points[i][2] = map_point(0, canvas.width, -1, 1, points[i][2]);
  // }

  // Associate out shader variables with our data buffer
  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  // Load the data into the GPU and bind to shader variables.
  let positionLoc = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 0, gl.STATIC_DRAW);

  normalLoc = gl.getAttribLocation(program, "normal");
  if (normalLoc != -1) {
    // normal
    var stride = (3 + 2 + 3) * Float32Array.BYTES_PER_ELEMENT;
    var offset = 0 + (3 + 2) * Float32Array.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, stride, offset);
    gl.enableVertexAttribArray(normalLoc);
  }

  // let colorLoc = gl.getAttribLocation(program, "vColor");
  // gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(colorLoc);
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  normalMatrixLoc = gl.getUniformLocation(program, "normalMat");
  modeLoc = gl.getUniformLocation(program, "mode");
  lightPosLoc = gl.getUniformLocation(program, "lightPos");
  lightVecLoc = gl.getUniformLocation(program, "lightVec");
  ambientColorLoc = gl.getUniformLocation(program, "ambientColor");
  diffuseColorLoc = gl.getUniformLocation(program, "diffuseColor");
  specularColorLoc = gl.getUniformLocation(program, "specularColor");
  shininessLoc = gl.getUniformLocation(program, "shininessVal");
  attenuationLoc = gl.getUniformLocation(program, "attenuationVal");
  kaLoc = gl.getUniformLocation(program, "Ka");
  kdLoc = gl.getUniformLocation(program, "Kd");
  ksLoc = gl.getUniformLocation(program, "Ks");
  aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  // render();
  window.cancelAnimationFrame(anim);
  if (escape == false) {
    window.requestAnimationFrame(render);
  } else if (escape == true) {
    window.cancelAnimationFrame(anim);
  }
};

function render(timestamp) {
  // gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // let colors = [];
  // for (let i = 0; i < points.length; i++) {
  //   if (points[i][1] < -0.05) {
  //     //blue
  //     colors.push(vec3(0.18039, 0.22353, 0.55686));
  //   } else if (0.0 < points[i][1] && points[i][1] < 0.06) {
  //     //brown
  //     colors.push(vec3(0.24, 0.15, 0.08));
  //   } else if (points[i][1] > 0.13) {
  //     //white
  //     colors.push(vec3(1.0, 1.0, 1.0));
  //   } else {
  //     colors.push(vec3(0.14, 0.56, 0.31));
  //   }
  // }

  // eye = vec3(
  //   radius * Math.sin(theta) * Math.cos(phi),
  //   radius * Math.sin(theta) * Math.sin(phi),
  //   radius * Math.cos(theta)
  // );

  // gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  if (flag != 1) {
    zmin = zmin + 1;
    zmax = zmax + 1;

    // xmin = xmin - 1;
    // xmax = xmax - 1;
  }

  points = get_patch2(xmin, xmax, zmin, zmax);

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

  if (escape == false) {
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  }

  if (normalMatrixLoc != -1)
    gl.uniformMatrix4fv(normalMatrixLoc, false, normalmatrix);
  if (modeLoc != -1) gl.uniform1f(modeLoc, modeVal);
  if (kaLoc != -1) gl.uniform1f(kaLoc, kaVal);
  if (kdLoc != -1) gl.uniform1f(kdLoc, kdVal);
  if (ksLoc != -1) gl.uniform1f(ksLoc, ksVal);
  if (attenuationLoc != -1) gl.uniform1f(attenuationLoc, attenuation);
  if (shininessLoc != -1) gl.uniform1f(shininessLoc, shininess);
  if (lightPosLoc != -1) gl.uniform3fv(lightPosLoc, lightPos);
  if (lightVecLoc != -1) gl.uniform3fv(lightVecLoc, lightVec);
  if (ambientColorLoc != -1) gl.uniform3fv(ambientColorLoc, ambientColor);
  if (diffuseColorLoc != -1) gl.uniform3fv(diffuseColorLoc, diffuseColor);
  if (specularColorLoc != -1) gl.uniform3fv(specularColorLoc, specularColor);

  let xmin_loc = gl.getUniformLocation(program, "xmin");
  gl.uniform1i(xmin_loc, xmin);
  let xmax_loc = gl.getUniformLocation(program, "xmax");
  gl.uniform1i(xmax_loc, xmax);

  let zmin_loc = gl.getUniformLocation(program, "zmin");
  gl.uniform1i(zmin_loc, zmin);
  let zmax_loc = gl.getUniformLocation(program, "zmax");
  gl.uniform1i(zmax_loc, zmax);

  let ymax_loc = gl.getUniformLocation(program, "ymax");
  gl.uniform1i(ymax_loc, canvas.height);

  modelViewMatrix = lookAt(eye, at, up);

  // projectionMatrix = perspective(fovy, aspect, near, far);
  // frustum(left, right, bottom, top, near, far);
  projectionMatrix = frustum(left, right, bottom, top_, near, far);

  // projectionMatrix = mult(projectionMatrix, modelViewMatrix);`

  mat4Invert(modelViewMatrix, modelviewInv);
  mat4Transpose(modelviewInv, normalmatrix);

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

  if (drawmodes[drawmode_idx] === "t") {
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
  } else if (drawmodes[drawmode_idx] === "p") {
    gl.drawArrays(gl.POINTS, 0, points.length);
  } else {
    gl.drawArrays(gl.LINES, 0, points.length);
  }

  anim = window.requestAnimationFrame(render);
}

// ---------------------
