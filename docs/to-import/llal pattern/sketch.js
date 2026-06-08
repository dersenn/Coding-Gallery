// https://redstapler.co/realistic-water-effect-svg-turbulence-filter/
// https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/


// INIT

const useSeed = true
let seed
if (useSeed) {
  seed = new Hash()
} else {
  seed = false
}


// SETUP SVG

const setup = {
      id: 'mySVG',
      parent: document.body,
      presAspect: 'none', // other values?
}

let svg = new SVG(setup)


// SETUP SKETCH

let defs = document.createElementNS(svg.ns, 'defs')
svg.stage.prepend(defs)


// let style = document.createElementNS(svg.ns, 'style')
// style.setAttribute('type', 'text/css')
// defs.append(style)



const useFilter = coinToss(100)
const useBlanks = coinToss(50)
const useCircles = coinToss(0)


const blanksProb = rnd()*100

const wdths = [50, 100, 150, 200]
const nCols = 20
const nRows = rndInt(3, 30)
const fSize = (100 / nRows) * 1.5 +'vh'
const lOff = '.66em'


let a = nVec(0, 0)
let txt = 'LLAL'

let cols = []


// FILTER STUFF

if (useFilter) {
  let swirl = document.createElementNS(svg.ns, 'filter')
  swirl.setAttribute('id', 'swirl')
  swirl.setAttribute('width', svg.w)
  swirl.setAttribute('height', svg.h)

  let turb = document.createElementNS(svg.ns, 'feTurbulence')
  turb.setAttribute('type', 'turbulence')
  turb.setAttribute('seed', rnd()*100)
  turb.setAttribute('baseFrequency', `${rnd()/100} ${rnd()/100}`)
  turb.setAttribute('numOctaves', rndInt(1,10))
  turb.setAttribute('result', 'turbulence')

  turb.setAttribute('color-interpolation-filters', 'sRGB')


  let disp = document.createElementNS(svg.ns, 'feDisplacementMap')
  disp.setAttribute('in2', 'turbulence')
  disp.setAttribute('in', 'SourceGraphic')
  disp.setAttribute('scale', rnd()*100)
  disp.setAttribute('xChannelSelector', 'R')
  disp.setAttribute('yChannelSelector', 'G')

  disp.setAttribute('color-interpolation-filters', 'sRGB')

  swirl.append(turb, disp)
  // svg.stage.prepend(swirl)
  defs.append(swirl)

  svg.stage.setAttribute('style', 'filter: url(#swirl')
}



// GRAPHICS

if(useCircles && useFilter) {
  let circles = []
  let nCircles = rndInt(5, 50)
  
  for (let c = 0; c < nCircles; c++) {
    let pos = {
      x: rnd() * svg.w,
      y: rnd() * svg.h
    }
    circles.push(svg.makeCircle(pos, rnd()*300, 'transparent', 'white', rndInt(3, 20)))
  }  
}


// LETTERS

let letters = document.createElementNS(svg.ns, 'g')
letters.setAttribute('id', 'letters')

svg.stage.append(letters)


for (let col = 0; col < nCols; col++) {
  
  let text = document.createElementNS(svg.ns, 'text')
  text.setAttribute('x', a.x)
  text.setAttribute('y', a.y)
  text.setAttribute('style', 'font-size: ' + fSize)
  text.setAttribute('class', 'col')

  for (let row = 0; row < nRows; row++) {
    let row = document.createElementNS(svg.ns, 'tspan')
    row.setAttribute('x', a.x)
    row.setAttribute('dy', lOff)
    row.setAttribute('class', 'row')

    let wShuffled = shuffle(wdths)
    for (let g = 0; g < txt.length; g++) {
      let rndfill = 'white'
      if(useBlanks) {
        if(coinToss(blanksProb)) {
          rndfill = 'transparent'
        }
      }
      let span = document.createElementNS(svg.ns, 'tspan')
      span.setAttribute('style', 'font-size: ' + fSize + ';' + 'font-variation-settings: \'wdth\' ' + wShuffled[g] + ';' +  'fill: ' + rndfill)
      // span.setAttribute('font-family', "LLAL-linear")
      span.innerHTML = txt[g]
      row.append(span)
    }
    text.append(row)
  }
  letters.append(text)

  cols.push(text)
  a.x += cols[col].getBBox().width
}



/////// INTERACTION, KEYS & FILEHANDLING

function newSketch() {
  const myURL = new URL(window.location.href)
  const newHash = seed.new()
  myURL.searchParams.set('seed', newHash)
  window.location.href = myURL.href
}

const reloadBtn = document.getElementById('btnreload')
reloadBtn.addEventListener('click', newSketch)



// SVG-TEXT-TO-PATH

let session = new SvgTextToPath(document.querySelector('svg'), {
  useFontFace: true,
});
let stat = session.replaceAll();







// My Only Friend, The End.