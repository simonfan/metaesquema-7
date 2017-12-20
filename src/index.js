const Matter = require('matter-js')
const Tone = require('tone')
const mousetrap = require('mousetrap')
const Meta = require('metaesquema-util')
const MatterSound = require('matter-sound')
const MatterCollision = require('matter-collision')

const throttle = require('lodash.throttle')

const scale = require('d3-scale')

const aux = require('./lib/auxiliary')
const loadPlayers = require('./load-players')
const matterMicrophone = require('./lib/matter-microphone')

const Piano = require('tone-piano').Piano

let NOTES_TO_LOAD = [
  'C2',
  'G3',
  'B4',
  'F4',
  'A2',
]

NOTES_TO_LOAD = NOTES_TO_LOAD.map(note => {
  return {
    note: note,
    midi: Tone.Frequency(note).toMidi()
  }
})

NOTES_TO_LOAD.sort((a, b) => {
  return a.midi <= b.midi ? -1 : 1
})

let PIANO_RANGE = [
  NOTES_TO_LOAD[0].midi,
  NOTES_TO_LOAD[NOTES_TO_LOAD.length - 1].midi
]

let piano = new Piano(PIANO_RANGE, 1).toMaster()

const arr = require('./lib/array')

let optionsLoop = new arr.Loop([
  {
    render: {
      fillStyle: '#006BA6',
    },
    note: 'C2',
  },
  {
    render: {
      fillStyle: '#0496FF',
    },
    note: 'G3',
  },
  {
    render: {
      fillStyle: '#FFBC42',
    },
    note: 'B4',
  },
  {
    render: {
      fillStyle: '#D81159',
    },
    note: 'F4',
  },
  {
    render: {
      fillStyle: '#8F2D56',
    },
    note: 'A2',
  },
])

Tone.Master.volume.value = -30
Tone.Master.mute = true

/**
 * Configure tone master
 */
Tone.Master.chain(new Tone.Limiter())

/**
 * Matter submodules
 */
const Engine = Matter.Engine
const Render = Matter.Render
const Runner = Matter.Runner
const Body = Matter.Body
const Bodies = Matter.Bodies
const World = Matter.World
const Mouse = Matter.Mouse
const MouseConstraint = Matter.MouseConstraint
const Events = Matter.Events
const Common = Matter.Common

function setup(options) {

  const CANVAS_WIDTH = options.canvasWidth
  const CANVAS_HEIGHT = options.canvasHeight
  let canvas = options.canvas

  if (!canvas) {
    throw new Error('canvas is required')
  }
  
  if (!CANVAS_WIDTH) {
    throw new Error('CANVAS_WIDTH is required')
  }
  
  if (!CANVAS_HEIGHT) {
    throw new Error('CANVAS_HEIGHT is required')
  }

  if (options.plugins) {
  	options.plugins.forEach(plugin => {
  		Matter.use(plugin)
  	})
  }

  // create engine
  let engine = Engine.create({
  	// enable sleeping as we are collision heavy users
  	// enableSleeping: true
  })

  // let timeScaleInterval = setInterval(() => {
  //   engine.timing.timeScale = 1/2

  //   setTimeout(() => {
  //     engine.timing.timeScale = 1
  //   }, 1000)
  // }, 3000)

  // console.log(engine.world.gravity)

  // engine.world.gravity.x = 0
  // engine.world.gravity.y = 0
  
  // let gravityInversionInterval = setInterval(() => {

  //   engine.world.gravity.x = Math.random()
  //   engine.world.gravity.y = Math.random()

  // }, 1000)

  // engine.timing.timeScale = 0.05

  // create renderer
  let render = Render.create({
  	canvas: canvas,
  	engine: engine,
  	options: {
  		wireframes: false,
      // showPositions: true,
      // showAngleIndicator: true,
  		// background: '#003123',
  		pixelRatio: 1,

  		width: CANVAS_WIDTH,
  		height: CANVAS_HEIGHT,
  	}
  })
  Render.run(render)

  // create engine runner
  let runner = Meta.Matter.Runner.createMixedRunner(engine)
  runner.run()

  let walls = Meta.Matter.Composites.walls(
    {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      wallThickness: 60,
    },
    (spec) => {
      return Matter.Bodies.rectangle(spec.x, spec.y, spec.width, spec.height, {
        isStatic: true,
        restitution: 0, 
      })
    }
  )

  Matter.World.add(engine.world, walls)


  /**
   * Sound
   */
  let sources = [
    Bodies.circle(CANVAS_WIDTH * 1/2, CANVAS_HEIGHT * 1 / 2, 20, {
      label: 'sound-1',
      restitution: 0,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'white',
        lineWidth: 4,
      },
    }),
    Bodies.circle(CANVAS_WIDTH * 1/2, CANVAS_HEIGHT * 1 / 2, 20, {
      label: 'sound-2',
      restitution: 0,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'white',
        lineWidth: 4,
      },
    }),
    Bodies.circle(CANVAS_WIDTH * 1/2, CANVAS_HEIGHT * 1 / 2, 20, {
      label: 'sound-3',
      restitution: 0,

      render: {
        fillStyle: 'transparent',
        strokeStyle: 'white',
        lineWidth: 4,
      },
    }),
  ]

  function addSource() {
    let body = sources.shift()

    if (body) {
      World.add(engine.world, body)
      Body.applyForce(body, body.position, {
        x: 0,
        y: -0.02
      })
    }
  }

  let ARC_BASE_START_ANGLE = 0
  let ARC_BASE_END_ANGLE   = 2 * Math.PI

  let ARCS_CENTER = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
  }
  let OUTER_ARC_RADIUS = CANVAS_HEIGHT * .45

  let innerMostArcConfig = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: OUTER_ARC_RADIUS * .33,
    startAngle: ARC_BASE_START_ANGLE + (2 * Math.PI) * 1/12,
    endAngle: ARC_BASE_END_ANGLE - (2 * Math.PI) * 1/12,
    sides: 20,
  }

  let middleArcConfig = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: OUTER_ARC_RADIUS * .66,
    startAngle: ARC_BASE_START_ANGLE - Math.PI / 2 + (2 * Math.PI) * 1/24,
    endAngle: ARC_BASE_END_ANGLE - Math.PI / 2 - (2 * Math.PI) * 1/24,
    sides: 30,
  }

  let outerArcConfig = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: OUTER_ARC_RADIUS,
    startAngle: ARC_BASE_START_ANGLE + (2 * Math.PI) * 1/48,
    endAngle: ARC_BASE_END_ANGLE - (2 * Math.PI) * 1/48,
    sides: 40,
  }

  let innerMostArc = Meta.Matter.Composites.arc(innerMostArcConfig, (spec) => {
    let bodyOptions = optionsLoop.next()
    
    return Matter.Bodies.rectangle(
      spec.x,
      spec.y,
      spec.arcPartLength,
      10,
      {
        // angle: spec.angle,
        isStatic: true,
        restitution: 0,
        render: bodyOptions.render,
        plugin: {
          collision: {
            start: throttle((e) => {
              console.log(e.intensity)
              if (e.intensity < 0.05) {
                return
              }
              if (e.other.label.startsWith('sound-')) {
                piano.keyDown(bodyOptions.note).keyUp(bodyOptions.note, Tone.now() + 100)
              }
            }, 300)
          }
        }
      }
    )
  })

  let middleArcAddedSource = false

  let middleArc = Meta.Matter.Composites.arc(middleArcConfig, (spec) => {
    let bodyOptions = optionsLoop.next()
    
    return Matter.Bodies.rectangle(
      spec.x,
      spec.y,
      spec.arcPartLength,
      15,
      {
        // angle: spec.angle,
        isStatic: true,
        restitution: 0,
        render: bodyOptions.render,
        plugin: {
          collision: {
            start: throttle((e) => {
              console.log(e.intensity)
              if (e.intensity < 0.05) {
                return
              }
              if (!middleArcAddedSource) {
                addSource()
                // setTimeout(addSource, 10000)
              }
              middleArcAddedSource = true
              if (e.other.label.startsWith('sound-')) {
                piano.keyDown(bodyOptions.note).keyUp(bodyOptions.note, Tone.now() + 100)
              }
            }, 300)
          }
        }
      }
    )
  })

  let outerArcAddedSource = false

  let outerArc = Meta.Matter.Composites.arc(outerArcConfig, (spec) => {
    let bodyOptions = optionsLoop.next()

    return Matter.Bodies.rectangle(
      spec.x,
      spec.y,
      spec.arcPartLength,
      20,
      {
        // angle: spec.angle,
        isStatic: true,
        restitution: 0,
        render: bodyOptions.render,
        plugin: {
          collision: {
            start: throttle((e) => {
              console.log(e.intensity)
              if (e.intensity < 0.05) {
                return
              }
              if (!outerArcAddedSource) {
                addSource()
              }
              outerArcAddedSource = true
              if (e.other.label.startsWith('sound-')) {
                piano.keyDown(bodyOptions.note).keyUp(bodyOptions.note, Tone.now() + 100)
              }
            }, 300)
          }
        }
      }
    )
  })

  Matter.World.add(engine.world, innerMostArc)
  Matter.World.add(engine.world, middleArc)
  Matter.World.add(engine.world, outerArc)


  // add rotation
  Events.on(engine, 'beforeUpdate', (event) => {
    Matter.Composite.rotate(innerMostArc, (2 * Math.PI) * 1/2880, ARCS_CENTER)
    Matter.Composite.rotate(middleArc, -(2 * Math.PI) * 1/2880, ARCS_CENTER)
    Matter.Composite.rotate(outerArc, (2 * Math.PI) * 1/1440, ARCS_CENTER)
  })


  // add mouse control
  let mouse = Mouse.create(render.canvas)
  let mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      // allow bodies on mouse to rotate
      angularStiffness: 0,
      render: {
        visible: false
      }
    }
  })

  World.add(engine.world, mouseConstraint);

  // keep the mouse in sync with rendering
  render.mouse = mouse;


  setTimeout(() => {
    Tone.Master.mute = false
    Tone.Master.volume.rampTo(0)

    addSource()

  }, 200)



  return {
  	engine: engine,
    isPlaying: false,

  	stop: function () {
      this.isPlaying = false

      runner.stop()
  	}
  }
}

piano.load().then(()=>{
  let config = {
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    canvas: document.querySelector('canvas'),
    plugins: [
      new MatterCollision({
        collisionMomentumUpperThreshold: 10,
      }),
      new MatterSound(),
    ],
  }

  let app = setup(config)
})


window.addEventListener('beforeunload', (e) => {
  // mute tone.js to prevent crackling
  Tone.Master.mute = true
})