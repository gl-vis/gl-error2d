'use strict'

var createShader = require('gl-shader')
var createBuffer = require('gl-buffer')

module.exports = createError2D

var WEIGHTS = [
  //x-error bar
  [ 1, 0, 0, 1, 0, 0],
  [ 1, 0, 0,-1, 0, 0],
  [-1, 0, 0,-1, 0, 0],
  [-1, 0, 0,-1, 0, 0],
  [ 1, 0, 0,-1, 0, 0],
  [-1, 0, 0, 1, 0, 0],

  //y-error bar
  [0, 1, 1, 0, 0, 0],
  [0, 1,-1, 0, 0, 0],
  [0,-1,-1, 0, 0, 0],
  [0,-1,-1, 0, 0, 0],
  [0, 1,-1, 0, 0, 0],
  [0,-1, 1, 0, 0, 0]
]

function GLError2D(plot, shader, buffer) {
  this.plot = plot

  this.shader = shader
  this.buffer = buffer

  this.bounds = [Infinity, Infinity, -Infinity, -Infinity]

  this.numPoints = 0

  this.color     = [0,0,0,1]
}

var proto = GLError2D.prototype

proto.draw = (function() {

  var MATRIX      = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ]

  var PIXEL_SCALE = [1,1]

  return function() {
    var plot      = this.plot
    var shader    = this.shader
    var buffer    = this.buffer
    var bounds    = this.bounds
    var numPoints = this.numPoints
    var color     = this.color

    var gl          = plot.gl
    var dataBox     = plot.dataBox
    var viewBox     = plot.viewBox
    var pixelRatio  = plot.pixelRatio

    var boundX  = bounds[2]  - bounds[0]
    var boundY  = bounds[3]  - bounds[1]
    var dataX   = dataBox[2] - dataBox[0]
    var dataY   = dataBox[3] - dataBox[1]

    MATRIX[0] = 2.0 * boundX / dataX
    MATRIX[4] = 2.0 * boundY / dataY
    MATRIX[6] = 2.0 * (bounds[0] - dataBox[0]) / dataX - 1.0
    MATRIX[7] = 2.0 * (bounds[1] - dataBox[1]) / dataY - 1.0

    var screenX = viewBox[2] - viewBox[0]
    var screenY = viewBox[3] - viewBox[1]

    PIXEL_SCALE[0] = 2.0 * pixelRatio / screenX
    PIXEL_SCALE[1] = 2.0 * pixelRatio / screenY

    buffer.bind()
    shader.bind()

    shader.uniforms.viewTransform = MATRIX
    shader.uniforms.pixelScale    = PIXEL_SCALE
    shader.uniforms.color         = this.color

    shader.attributes.position.pointer(
      gl.FLOAT,
      false,
      16,
      0)

    shader.attributes.pixelScale.pointer(
      gl.FLOAT,
      false,
      16,
      8)

    gl.drawArrays(gl.TRIANGLES, 0, numPoints * WEIGHTS.length)
  }
})()

proto.drawPick = function() {}
proto.pick = function(x, y) {
  return null
}

proto.update = function(options) {
  options = options || {}

  var positions = options.positions || []
  var errors    = options.errors    || []

  var lineWidth = 1
  if('lineWidth' in options) {
    lineWidth = +options.lineWidth
  }

  var capSize = 0
  if('capSize' in options) {
    capSize = +options.capSize
  }

  this.color     = (options.color || [0,0,0,1]).slice()

  var bounds    = this.bounds = [Infinity, Infinity, -Infinity, -Infinity]

  var numPoints  = positions.length>>1
  for(var i=0; i<numPoints; ++i) {
    var x = positions[i*2]
    var y = positions[i*2+1]

    bounds[0] = Math.min(x, bounds[0])
    bounds[1] = Math.min(y, bounds[1])
    bounds[2] = Math.max(x, bounds[2])
    bounds[3] = Math.max(y, bounds[3])
  }
  if(bounds[2] === bounds[0]) {
    bounds[2] += 1
  }
  if(bounds[3] === bounds[1]) {
    bounds[3] += 1
  }
  var sx = 1.0 / (bounds[2] - bounds[0])
  var sy = 1.0 / (bounds[3] - bounds[1])
  var tx = bounds[0]
  var ty = bounds[1]

  var bufferData = pool.mallocFloat32(numPoints * WEIGHTS.length * 4)
  var ptr = 0
  for(var i=0; i<numPoints; ++i) {
    var x = positions[2*i]
    var y = positions[2*i+1]
    var ex = errors[2*i]
    var ey = errors[2*i+1]

    for(var j=0; j<WEIGHTS.length; ++j) {
      var w = WEIGHTS[j]

      bufferData[ptr++] = sx * ((x - tx) + w[0] * ex)
      bufferData[ptr++] = sy * ((y - ty) + w[1] * ey)
      bufferData[ptr++] = lineWidth * w[2] + capSize * w[4]
      bufferData[ptr++] = lineWidth * w[3] + capSize * w[5]
    }
  }
  this.buffer.update(bufferData)
  pool.free(bufferData)
}

proto.dispose = function() {
  this.shader.dispose()
  this.buffer.dispose()
}

function createError2D(plot, options) {
  var shader = createShader(plot.gl, shaders.vertex, shaders.fragment)
  var buffer = createBuffer(plot.gl)

  var errorbars = new GLError2D(plot, shader, buffer)

  errorbars.update(options)

  return errorbars
}
