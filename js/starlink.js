var scene, camera, renderer, controls
const width = window.innerWidth
const height = window.innerHeight
const ratio = width / height
const simSize = 100
var tstep = 0 //the current index in the data array
var MAX_POINTS = 50000; //The maximum length of the trails
var scaleFactor
var tempBodies = []
var bodies = []

const init = () => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, ratio, 1, 1000)
  camera.position.z = 250
  camera.position.y = 200
  camera.position.x = 150

  controls = new THREE.OrbitControls(camera, document.getElementById("viewport"))
  axis = new THREE.AxisHelper(simSize * 1.1)
  scene.add(axis)

  var gridHelper = new THREE.GridHelper( simSize * 2.2, 20 );
  scene.add( gridHelper );

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor("#000000")
  renderer.setSize(width, height)

  document.getElementById("viewport").append(renderer.domElement)

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  const render = () => {
    requestAnimationFrame(render)
    renderer.render(scene, camera)
    controls.update()
  }
  render()
}

const getPointLight = (color, intensity, distance) => {
  let light = new THREE.PointLight(color, intensity, distance)
  return light
}

function getOrbitingBody(name, data) {
  let mesh = getSphere(0.5, 0xffffff)
  scene.add(mesh)

  let trail = getTrail()
  scene.add(trail)

  /*
  let label = getLabel(name)
  let currentPos = mesh.position.project(camera)

  let x = (currentPos.x + 1) * width / 2
  let y = - (currentPos.y - 1) * height / 2
  label.style.top = y+'px'
  label.style.left = x+'px'
  */
 
  return {
    mesh: mesh,
    trail: trail,
    //label: label,
    data: data
  }
}

function getLabel(text) {
  let div = document.createElement("div")
  div.className = "label"
  div.innerHTML = text
  document.getElementById("viewport").appendChild(div)
  return div
}

function getSphere(radius, color, cb=false) {
  var geometry = new THREE.SphereGeometry( radius, 32, 16 )
  if(!cb)
    var material = new THREE.MeshBasicMaterial( {color: color} )
  else
    var material = new THREE.MeshNormalMaterial( {color: color} )
  var edges = new THREE.EdgesGeometry(geometry)
  var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}))
  scene.add(line)
  var sphere = new THREE.Mesh( geometry, material );
  return sphere
}

function getTrail() {

  // geometry
  var geometry = new THREE.BufferGeometry();

  // attributes
  var positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
  geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

  // draw range
  drawCount = 2; // draw the first 2 points, only
  geometry.setDrawRange( 0, drawCount );

  // material
  var material = new THREE.LineBasicMaterial( { color: 0x00ffff } );

  // line
  line = new THREE.Line( geometry,  material );
  return line
}

init()

function parseData(varName) {
  let data = []
  let lines = varName.split("\n")
  for(let i = 1; i < lines.length; i++) {
    let line = lines[i]
    let points = line.split(",")
    data.push({
      rx: parseFloat(points[0]),
      ry: parseFloat(points[1]),
      rz: parseFloat(points[2]),
      vx: parseFloat(points[3]),
      vy: parseFloat(points[4]),
      vz: parseFloat(points[5]),
      t: parseFloat(points[6])
    })
  }
  return data
}

function getMaxR(data) {
  let maxR = 0
  data.forEach(state => {
    if(Math.abs(state.rx) > maxR) maxR = Math.abs(state.rx)
    if(Math.abs(state.ry) > maxR) maxR = Math.abs(state.ry)
    if(Math.abs(state.rz) > maxR) maxR = Math.abs(state.rz)
  })
  return maxR
}

function scaleData(data, scaleFactor) {
  let scaledData = []
  data.forEach(state => {
    scaledData.push({
      rx: state.rx * scaleFactor,
      ry: state.ry * scaleFactor,
      rz: state.rz * scaleFactor,
      vx: state.vx * scaleFactor,
      vy: state.vy * scaleFactor,
      vz: state.vz * scaleFactor,
      t:  state.t
    })
  })
  return scaledData
}

function updateTrail(line, scaledData) {
  let positions = line.geometry.attributes.position.array;
  let index = 0
  for ( var i = 0; i < tstep; i ++ ) {
      positions[ index++ ] = scaledData[i].rx;
      positions[ index++ ] = scaledData[i].rz;
      positions[ index++ ] = scaledData[i].ry;
  }
  line.geometry.setDrawRange( 0, tstep );
  line.geometry.attributes.position.needsUpdate = true
}

function updateLabel(object) {
  let mesh = object.mesh
  let label = object.label

  let currentPos = mesh.position.clone().project(camera)
  let x = (currentPos.x + 1) * width / 2
  if(x > width - 20) x = width-35
  if(x < 0) x = 5
  let y = - (currentPos.y - 1) * height / 2
  if(y > height - 20) y = height-20
  if(y < 0) y = 20
  label.style.top = y+'px'
  label.style.left = x+'px'
}

function animate() {
  bodies.forEach(body => {
    let state = body.data[tstep]
    body.mesh.position.x = state.rx
    body.mesh.position.z = state.ry
    body.mesh.position.y = state.rz
  
    updateTrail(body.trail, body.data)
    //updateLabel(body)
  })
  tstep ++
  if(tstep > bodies[0].data.length-1) tstep = 0
}

function loadData(objectName) {
  let maxRs = []
  objectName.forEach(body => {
    let name = body.name
    let data = parseData(body.data)
    let maxR = getMaxR(data)
    maxRs.push(maxR)
    tempBodies.push({data: data, name: name})
  })
  
  scaleFactor = simSize/Math.max(...maxRs)
  
  tempBodies.forEach(body => {
    let name = body.name
    let data = body.data
    let scaledData = scaleData(data, scaleFactor)
    let mesh = getOrbitingBody(name, scaledData)
    bodies.push(mesh)
  })
}

loadData(starlink)

let cb = getSphere(6378*scaleFactor, 0x0000ff, true)
scene.add( cb );

var light = new THREE.AmbientLight(0x404040, 10)
scene.add(light)

setInterval(function(){
  animate()
}, 1000 * 1/60)