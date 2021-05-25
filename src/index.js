import { saveAs } from 'file-saver';
import Camera from './graphics/camera';
import Circle from './tools/circle';
import Frames, { configureCanvas } from './graphics/frames';
import MatrixOutput from './graphics/matrix-output';
import Menu from './ui/menu';
import Network from './tools/network';
import Pen from './tools/pen';
import Shape from './tools/shape';
import RecordingManager from './graphics/recording-manager';
import Text from './tools/text';
import Transition from './graphics/transition';
import initVolumeMeter from './audio/volume-meter';
import {
  rtv,
  math,
  parser,
  DARK,
  CANVAS_BG,
  COLORS,
  FONT,
  SCALE_FACTOR,
  T_STEPS,
  GRID_SIZE,
  MOUSE_DURATION,
  PI2,
  MAT_NUM_WIDTH,
  CHAR,
} from './resources';

// custom functions!
function sig(x) {
  return 1 / (1 + math.exp(-x));
}

function sigp(x) {
  return math.exp(-x) / math.pow(1 + math.exp(-x), 2);
}

// http://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
// Maxwell Collard
function randNBm() {
  const u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
  const v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// cache
const matrixCache = {};
function cached(dims) {
  const s = dims.join('_');
  let m = matrixCache[s];
  if (!m) {
    m = math.matrix(math.zeros(dims));
    matrixCache[s] = m;
  }

  return m;
}

// import
function graph(fn, d1, d2, d3) { // graphs y=f(x) from -10 to 10
  let y = 0;
  let p; let gp;
  const N = 400;
  let points = cached([N + 1, 3]);
  const asyms = cached([N + 1, 1])._data;
  const pd = points._data;

  const dx = 20 / N;

  let i = 0;
  let x = -10;
  let yLast = fn(x);
  for (; x < 10; x += dx) {
    y = fn(x);

    pd[i][d1] = x;
    pd[i][d2] = Math.max(Math.min(y, 10000), -10000);
    pd[i][d3] = 0;

    asyms[i] = 0;
    if (math.abs(y - yLast) > 20) {
      // vertical asymptote
      asyms[i] = 1;

      pd[i - 1][d2] = math.sign(pd[i - 1][d2]) * 1000;
      pd[i][d2] = math.sign(y) * 1000;
    }

    yLast = y;
    i++;
  }

  points = rtv.cam.graph_to_screen_mat(points);

  rtv.ctx.beginPath();
  for (let i = 0; i < N; i++) {
    p = points[i];

    if (asyms[i]) {
      rtv.ctx.stroke();
      rtv.ctx.beginPath();
      rtv.ctx.moveTo(p[0], p[1]);
    } else if (i === 0) {
      rtv.ctx.moveTo(p[0], p[1]);
    } else {
      rtv.ctx.lineTo(p[0], p[1]);
    }
  }
  rtv.ctx.stroke();
}

/**
 * graphs x=f(t) y=g(t) z=h(t) from tmin to tmax, units shows markers every 1 increment in t
 * @param {*} r
 * @param {*} tmin
 * @param {*} tmax
 * @param {*} units
 */
function para(r, tmin, tmax, units) {
  const N = 300;
  let points = cached([N + 1, 3]);
  const pd = points._data;

  const dt = (tmax - tmin) / N;

  let i = 0;
  let data;

  for (let t = tmin; t <= tmax; t += dt) {
    data = r(t)._data;

    data[0] = Math.max(Math.min(data[0], 1000), -1000);
    data[1] = Math.max(Math.min(data[1], 1000), -1000);
    data[2] = Math.max(Math.min(data[2], 1000), -1000);

    pd[i][0] = data[0];
    pd[i][1] = data[1];
    pd[i][2] = data[2];

    i++;
  }

  points = rtv.cam.graph_to_screen_mat(points);

  rtv.ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const p = points[i];
    if (i === 0) {
      rtv.ctx.moveTo(p[0], p[1]);
    } else {
      rtv.ctx.lineTo(p[0], p[1]);
    }
  }
  rtv.ctx.stroke();

  if (units) {
    let numDots = tmax - tmin;
    numDots = Math.floor(numDots);

    if (numDots > 0) {
      let dots = cached([numDots, 3]);

      let i = 0;

      for (i = 0; i < numDots; i++) {
        data = r(i + 1)._data;

        data[0] = Math.max(Math.min(data[0], 1000), -1000);
        data[1] = Math.max(Math.min(data[1], 1000), -1000);
        data[2] = Math.max(Math.min(data[2], 1000), -1000);

        dots._data[i][0] = data[0];
        dots._data[i][1] = data[1];
        dots._data[i][2] = data[2];
      }

      dots = rtv.cam.graph_to_screen_mat(dots);

      rtv.ctx.save();
      for (let i = 0; i < numDots; i++) {
        const p = dots[i];

        rtv.ctx.beginPath();
        rtv.ctx.arc(p[0], p[1], 4, 0, PI2);
        rtv.ctx.fill();
        rtv.ctx.stroke();
      }
      rtv.ctx.restore();
    }
  }
}

function implies(p, q) {
  return !p || q;
}

function reportError(e) {
  console.log(e);
  rtv.error.timer = 100;
  rtv.error.text = e;
}

// undo
let states = [];

export function formatRgb([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbToHex(c) {
  return `#${((1 << 24) + (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2])).toString(16).slice(1)}`;
}

function formatRgb1(rgb) {
  const [r, g, b] = rgb.map((x) => Math.round(x * 255));
  return `rgb(${r}, ${g}, ${b})`;
}

function rgb1ToHex(a) {
  const c = [Math.round(a[0] * 255),
    Math.round(a[1] * 255),
    Math.round(a[2] * 255)];
  return rgbToHex(c);
}

export function drawSimple(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*') {
      rtv.ctx.beginPath();
      rtv.ctx.arc(i * CHAR.SIZE + CHAR.SIZE / 2, 0, 3, 0, PI2);
      rtv.ctx.fill();
    } else {
      rtv.ctx.fillText(text[i], i * CHAR.SIZE, 0);
    }
  }
  return text.length * CHAR.SIZE;
}

function drawR(o, p, d) {
  // o tree object
  // p position
  // d should draw, false to just get the size

  let text = '';
  let argc = 0;
  let args;

  if (o && o.args) {
    args = o.args;
    argc = args.length;
  }

  let size = { w: 0, h: 0 };

  if (args) {
    if (o.name && o.name.length) {
      text = o.name;
    } else if (o.op && o.op.length) {
      text = o.op;
    }

    if (text === '+' || text === '-' || text === '*') {
      if (argc === 1) {
        if (d) rtv.ctx.fillText(text, p.x, p.y);
        const s1 = drawR(args[0], { x: p.x + CHAR.SIZE, y: p.y }, d);

        size.w = s1.w + CHAR.SIZE;
        size.h = s1.h;
      } else if (argc === 2) {
        // draw on the left and the right

        const center = false; // false -> bottom align
        let pad2 = CHAR.PAD * 2;
        if (text === '*') {
          pad2 = 0;
        }

        let s1 = drawR(args[0], { x: 0, y: 0 }, false);
        let s2 = drawR(args[1], { x: 0, y: 0 }, false);

        size.w = s1.w + text.length * CHAR.SIZE + 2 * pad2 + s2.w;
        size.h = Math.max(s1.h, s2.h);

        if (d) {
          let opp = { x: 0, y: 0 };
          if (center) {
            s1 = drawR(args[0], {
              x: p.x,
              y: p.y + size.h / 2 - s1.h / 2,
            }, d);

            opp = {
              x: p.x + s1.w + pad2,
              y: p.y + size.h / 2 - CHAR.SIZE,
            };

            s2 = drawR(args[1], {
              x: p.x + s1.w + pad2 + text.length * CHAR.SIZE + pad2,
              y: p.y + size.h / 2 - s2.h / 2,
            }, d);
          } else {
            // bottom align
            s1 = drawR(args[0], {
              x: p.x,
              y: p.y + size.h - s1.h,
            }, d);

            opp = {
              x: p.x + s1.w + pad2,
              y: p.y + size.h - CHAR.SIZE * 2,
            };

            s2 = drawR(args[1], {
              x: p.x + s1.w + pad2 + text.length * CHAR.SIZE + pad2,
              y: p.y + size.h - s2.h,
            }, d);
          }

          if (text === '*') {
            rtv.ctx.beginPath();
            rtv.ctx.arc(opp.x + CHAR.SIZE / 2, opp.y + CHAR.SIZE, 3, 0, PI2);
            rtv.ctx.fill();
          } else {
            rtv.ctx.fillText(text, opp.x, opp.y);
          }
        }
      }
    } else if (text === '^') {
      if (argc === 2) {
        // draw on the left and the right, shifted up!
        const a = args[0];
        let b = args[1];

        if (b.content) {
          b = b.content;
        }

        const s1 = drawR(a, { x: 0, y: 0 }, false);
        const s2 = drawR(b, { x: 0, y: 0 }, false);

        size.w = s1.w + s2.w;
        size.h = s1.h + s2.h - CHAR.SIZE;

        if (d) {
          drawR(a, { x: p.x, y: p.y + size.h - s1.h }, d);
          drawR(b, { x: p.x + s1.w, y: p.y }, d);
        }
      }
    } else if (text === '/') {
      if (argc === 2) {
        // draw on top and bottom
        let a = args[0]; let b = args[1];

        // remove unnecessary parens
        if (a.content) {
          a = a.content;
        }

        if (b.content) {
          b = b.content;
        }

        const s1 = drawR(a, { x: 0, y: 0 }, false);
        const s2 = drawR(b, { x: 0, y: 0 }, false);

        size.w = Math.max(s1.w, s2.w) + CHAR.PAD * 2;
        size.h = Math.max(s1.h, s2.h) * 2 + CHAR.PAD * 4;

        if (d) {
          drawR(a, {
            x: p.x + size.w / 2 - s1.w / 2,
            y: p.y + size.h / 2 - s1.h - CHAR.PAD * 2,
          }, d);

          drawR(b, {
            x: p.x + size.w / 2 - s2.w / 2,
            y: p.y + size.h / 2 + CHAR.PAD * 2,
          }, d);

          rtv.ctx.beginPath();
          rtv.ctx.moveTo(p.x, p.y + size.h / 2);
          rtv.ctx.lineTo(p.x + size.w, p.y + size.h / 2);
          rtv.ctx.stroke();
        }
      }
    } else if (text === '!') {
      const s1 = drawR(args[0], { x: p.x, y: p.y }, d);
      if (d) rtv.ctx.fillText(text, p.x + s1.w, p.y);

      size.w = s1.w + CHAR.SIZE;
      size.h = s1.h;
    } else if (o.fn) {
      // function call
      let h = 0;

      // get height of all args
      const N = args.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(args[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      text = `${o.name}(`;
      const cally = p.y + size.h / 2 - CHAR.SIZE;

      if (d) {
        for (let i = 0; i < text.length; i++) {
          rtv.ctx.fillText(text[i], p.x + i * CHAR.SIZE, cally);
        }
      }

      let xo = text.length * CHAR.SIZE;

      for (let i = 0; i < N; i++) {
        const s1 = drawR(args[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i === N - 1) {
          if (d) rtv.ctx.fillText(')', p.x + xo, cally);
        } else if (d) rtv.ctx.fillText(',', p.x + xo, cally);

        xo += CHAR.SIZE;
      }

      size.w = xo;
    }
  } else {
    // no args

    if (o.name && o.name.length) {
      text = o.name;
    } else if (o.value) {
      text = o.value;
    } else {
      text = '?';
    }

    if (o.content) {
      // parens
      let s1 = drawR(o.content, { x: 0, y: 0 }, false);
      // ctx.save();
      // ctx.scale(1, s1.h/(char_size*2));
      if (d) rtv.ctx.fillText('(', p.x, p.y + s1.h / 2 - CHAR.SIZE);
      if (d) rtv.ctx.fillText(')', p.x + s1.w + CHAR.SIZE, p.y + s1.h / 2 - CHAR.SIZE);
      // ctx.restore();

      s1 = drawR(o.content, { x: p.x + CHAR.SIZE, y: p.y }, d);

      size.w = s1.w + CHAR.SIZE * 2;
      size.h = s1.h;
    } else if (o.node) {
      size = drawR(o.node, { x: p.x, y: p.y }, d);
    } else if (o.object && o.value) {
      // assignment

      const s1 = drawR(o.value, { x: 0, y: 0 }, false);
      const text = `${o.object.name} = `;

      if (d) {
        rtv.ctx.save();
        rtv.ctx.translate(p.x, p.y + s1.h / 2 - CHAR.SIZE);
        drawSimple(text);
        rtv.ctx.restore();

        drawR(o.value, { x: p.x + text.length * CHAR.SIZE, y: p.y }, d);
      }

      size.w = s1.w + text.length * CHAR.SIZE;
      size.h = s1.h;
    } else if (o.blocks) {
      // block

      const items = o.blocks;
      let h = 0;

      // get height of all args
      const N = items.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      const cally = p.y + size.h / 2 - CHAR.SIZE;
      let xo = 0;

      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i !== N - 1) {
          if (d) rtv.ctx.fillText(';', p.x + xo, cally);
        }
        xo += CHAR.SIZE;
      }

      xo -= CHAR.SIZE;

      size.w = xo;
    } else if (o.items) {
      // array

      const { items } = o;
      let h = 0;

      // get height of all args
      const N = items.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      const cally = p.y + size.h / 2 - CHAR.SIZE;
      let xo = CHAR.SIZE; // first open bracket

      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i !== N - 1) {
          if (d) rtv.ctx.fillText(',', p.x + xo, cally);
        }
        xo += CHAR.SIZE;
      }

      rtv.ctx.save();
      rtv.ctx.scale(1, size.h / (CHAR.SIZE * 2));
      if (d) rtv.ctx.fillText('[', p.x, cally);
      if (d) rtv.ctx.fillText(']', p.x + xo - CHAR.SIZE, cally);
      rtv.ctx.restore();

      size.w = xo;
    } else if (o.expr) {
      // function definition
      const s1 = drawR(o.expr, { x: 0, y: 0 }, false);

      text = o.name;
      text += `(${o.params.join(',')}) = `;

      if (d) {
        rtv.ctx.save();
        rtv.ctx.translate(p.x, p.y + s1.h - CHAR.SIZE * 2);
        drawSimple(text);
        rtv.ctx.restore();
      }

      const xo = text.length * CHAR.SIZE;

      drawR(o.expr, { x: p.x + xo, y: p.y }, d);

      size.w = xo + s1.w;
      size.h = s1.h;
    } else {
      if (d) {
        const N = text.length;
        for (let i = 0; i < N; i++) {
          rtv.ctx.fillText(text[i], p.x + i * CHAR.SIZE, p.y);
        }
      }

      size.w = text.length * CHAR.SIZE;
      size.h = CHAR.SIZE * 2;
    }
  }

  if (rtv.debug && d) rtv.ctx.strokeRect(p.x, p.y, size.w, size.h);

  return size;
}

function drawVect(_x, _y, _z, x, y, z) {
  let a = rtv.cam.graph_to_screen(_x, _y, _z);
  let b = rtv.cam.graph_to_screen(x, y, z);

  a = { x: a[0], y: a[1] };
  b = { x: b[0], y: b[1] };

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(a.x, a.y);
  rtv.ctx.lineTo(b.x, b.y);
  rtv.ctx.stroke();

  // draw an arrow head
  const theta = Math.atan2(b.y - a.y, b.x - a.x);

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(b.x, b.y);
  rtv.ctx.lineTo(
    b.x + Math.cos(theta - Math.PI * 3 / 4) * 15,
    b.y + Math.sin(theta - Math.PI * 3 / 4) * 15,
  );
  rtv.ctx.moveTo(b.x, b.y);
  rtv.ctx.lineTo(
    b.x + Math.cos(theta + Math.PI * 3 / 4) * 15,
    b.y + Math.sin(theta + Math.PI * 3 / 4) * 15,
  );
  rtv.ctx.stroke();
}

export function drawPath(points, canvas = rtv.ctx) {
  if (points.length < 1) return; // Do not continue if no points exist to be drawn

  canvas.beginPath();
  canvas.moveTo(...points[0]); // Start path at first point

  points
    .slice(1) // Exclude first point
    .forEach((p) => canvas.lineTo(...p));

  canvas.stroke();
}

/**
 * Returns `x` rounded to two decimal places if `ctrl` is pressed, otherwise one decimal place.
 * @param {number} x
 * @returns {number}
 */
export function roundWithKey(x) {
  return math.round(x, rtv.keys.ctrl ? 2 : 1);
}

/**
 * Returns the actual width of `text` on the canvas.
 * @param {string} text
 * @param {CanvasRenderingContext2D} ctx Optionally specifies a substitute context 2D.
 * @returns {number} Length in pixels.
 */
export function getTextWidth(text, ctx = rtv.ctx) {
  return ctx.measureText(text).width;
}

/**
 * Returns current font size of canvas.
 * @param {CanvasRenderingContext2D} ctx Optionally specifies a substitute context 2D.
 * @returns {number} Font size.
 */
export function getFontHeight(ctx = rtv.ctx) {
  return parseInt(ctx.font.match(/(\d+)px/)[1], 10);
}

export function drawBrackets(sx, sy, width, height) {
  rtv.ctx.beginPath();
  rtv.ctx.moveTo(sx + 7, sy);
  rtv.ctx.lineTo(sx, sy);
  rtv.ctx.lineTo(sx, sy + height);
  rtv.ctx.lineTo(sx + 7, sy + height);
  rtv.ctx.stroke();

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(sx + width - 7, sy);
  rtv.ctx.lineTo(sx + width, sy);
  rtv.ctx.lineTo(sx + width, sy + height);
  rtv.ctx.lineTo(sx + width - 7, sy + height);
  rtv.ctx.stroke();
}

export function drawNetwork(layers, pos) {
  const pad = 120;
  const radius = 20;

  const pad2 = 250;
  // [pos[0] - pad2/2 - j*(pad2+80), pos[1] + pad2/2 - pad2 * units/2 + i*pad2];
  const loc = (i, j, units) => [
    pos[0] - pad2 * units / 2 + pad2 / 2 + i * pad2,
    -pad + pos[1] - j * pad2,
  ];

  // connections
  for (let j = 0; j < layers.length - 1; j++) {
    const units = layers[j];
    const unitsNext = layers[j + 1];

    for (let i = 0; i < units; i++) {
      const p = loc(i, j, units);

      for (let k = 0; k < unitsNext; k++) {
        const p2 = loc(k, j + 1, unitsNext);

        const l = new Shape([0, 0, 0, 1], [{ x: p[0], y: p[1] }, { x: p2[0], y: p2[1] }]);
        rtv.objs.push(l);
      }
    }
  }

  // neurons
  for (let j = 0; j < layers.length; j++) {
    const units = layers[j];

    for (let i = 0; i < units; i++) {
      const p = loc(i, j, units);
      const c = new Circle([1, 1, 1, 1], { x: p[0], y: p[1] });
      c.properties[rtv.frame].fill = [255, 255, 255, 255]; // white fill
      rtv.objs.push(c);
    }
  }
}

const cacheFn = {};
export function drawFn(fn) {
  let tree;

  if (cacheFn[fn]) {
    tree = cacheFn[fn];
  } else {
    try {
      tree = math.parse(fn);
    } catch { /* Continue */ }

    if (tree) {
      cacheFn[fn] = tree;
    }
  }

  if (!tree) {
    return { w: 0, h: 0 };
  }

  rtv.ctx.save();
  rtv.ctx.textAlign = 'left';
  rtv.ctx.textBaseline = 'top';
  const size = drawR(tree, { x: 0, y: 0 }, false);
  drawR(tree, { x: 0, y: -size.h / 2 }, true);
  rtv.ctx.restore();

  return size;
}

function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  let x; let
    y;

  if (evt.touches) {
    for (let i = 0; i < evt.touches.length; i++) {
      if (evt.touches[i].touchType === 'stylus') {
        return {
          x: (evt.touches[i].clientX - rect.left) * SCALE_FACTOR,
          y: (evt.touches[i].clientY - rect.top) * SCALE_FACTOR,
        };
      }
    }
  }

  return {
    x: (evt.clientX - rect.left) * SCALE_FACTOR,
    y: (evt.clientY - rect.top) * SCALE_FACTOR,
  };
}

function constrainToGrid(p) {
  const gs = GRID_SIZE / 4;
  return { x: Math.floor((p.x + gs / 2) / gs) * gs, y: Math.floor((p.y + gs / 2) / gs) * gs };
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function between(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function grad2(c, x, y) {
  // c is compiled obj
  // depends on x and y
  const h = 0.0001;

  parser.set('x', x + h);
  const fxh = c.evaluate(parser.scope);
  parser.set('x', x);
  const fx = c.evaluate(parser.scope);

  parser.set('y', y + h);
  const fyh = c.evaluate(parser.scope);
  parser.set('y', y);
  const fy = c.evaluate(parser.scope);

  return [(fxh - fx) / h, (fyh - fy) / h];
}

export function rotationMatrix(rx, ry, rz) {
  const Rx = [[1, 0, 0],
    [0, Math.cos(rx), -Math.sin(rx)],
    [0, Math.sin(rx), Math.cos(rx)]];

  const Ry = [[Math.cos(ry), 0, Math.sin(ry)],
    [0, 1, 0],
    [-Math.sin(ry), 0, Math.cos(ry)]];

  const Rz = [[Math.cos(rz), -Math.sin(rz), 0],
    [Math.sin(rz), Math.cos(rz), 0],
    [0, 0, 1]];

  return math.multiply(math.multiply(Rx, Ry), Rz);
}

export function sigmoid(x, num, offset, width) {
  return num / (1.0 + Math.exp(-(x + offset) * width));
}

export function easeInOut(x) {
  return 1.0 / (1.0 + Math.exp(-(x - 0.5) * 10));
}

export function copy(d) {
  return JSON.parse(JSON.stringify(d));
}

function changeFrames() {
  for (let i = 0; i < rtv.objs.length; i++) {
    const obj = rtv.objs[i];
    if (obj.properties[rtv.frame] && obj.properties[rtv.next_frame] == null) {
      obj.properties[rtv.next_frame] = copy(obj.properties[rtv.frame]);
      if (rtv.next_frame < rtv.frame) {
        // make that shit transparent?
        obj.properties[rtv.next_frame].c[3] = 0.0;
      }
    }
  }
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : null;
}

export function transformProps(e, props, step = 0.2) {
  const transformations = {
    l: (p) => ({ w: p.w + 1 }),
    j: (p) => ({ w: p.w - 1 }),
    i: (p) => ({ h: p.h + 1 }),
    k: (p) => ({ h: p.h - 1 }),
    u: (p) => ({ r: p.r - Math.PI / 12 }),
    o: (p) => ({ r: p.r + Math.PI / 12 }),
  };

  if (e.key in transformations) {
    e.preventDefault();
    return { ...props, ...transformations[e.key](props) };
  }

  return props;
}

export function constrain(v) {
  return Math.min(1, Math.max(0, v));
}

function interpolateColors(ac, bc, interp) {
  let same = true;
  const N = ac.length;
  for (let i = 0; i < N; i++) {
    if (ac[i] !== bc[i]) {
      same = false;
    }
  }

  if (same) {
    return ac;
  }

  const ic = new Array(N);

  for (let i = 0; i < N; i++) {
    ic[i] = (1 - interp) * ac[i] + interp * bc[i];
  }

  return ic;
}

export function interpolate(a, b) {
  if (!b) {
    return a;
  }

  const interp = {};
  Object.keys(a).forEach((key) => {
    if (key === 'p') {
      // interpolate position
      const ap = a[key];
      const bp = b[key];

      interp[key] = {
        x: (1 - rtv.t_ease) * ap.x + rtv.t_ease * bp.x,
        y: (1 - rtv.t_ease) * ap.y + rtv.t_ease * bp.y,
      };
    } else if (key === 'w' || key === 'h' || key === 'r' || key === 'a_s' || key === 'a_e') {
      // interpolate width, height, or rotation
      const aw = a[key];
      const bw = b[key];
      interp[key] = (1 - rtv.t_ease) * aw + rtv.t_ease * bw;
    } else if (key === 'rxyz') {
      const ar = a[key];
      const br = b[key];
      interp[key] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        interp[key][i] = (1 - rtv.t_ease) * ar[i] + rtv.t_ease * br[i];
      }
    } else if (key === 'c') {
      // interpolate colors
      const ac = a[key];
      const bc = b[key];
      interp[key] = interpolateColors(ac, bc, constrain(rtv.t_ease));
    } else if (key === 'path') {
      // interpolate paths
      const ap = a[key];
      const bp = b[key];
      const N = ap.length;
      const ip = new Array(N);
      for (let i = 0; i < N; i++) {
        const newp = {
          x: (1 - rtv.t_ease) * ap[i].x + rtv.t_ease * bp[i].x,
          y: (1 - rtv.t_ease) * ap[i].y + rtv.t_ease * bp[i].y,
        };
        ip[i] = newp;
      }

      interp[key] = ip;
    } else if (key === 't') {
      if (rtv.t_ease < 0.5) {
        interp[key] = a[key];
      } else {
        interp[key] = b[key];
      }
    } else {
      interp[key] = a[key];
    }
  });

  return interp;
}

function textArrayToObjs(arr, keepAnimation) {
  const newObjs = [];
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    let newObj = null;

    if (o.type === 'Shape') {
      newObj = new Shape();
    } else if (o.type === 'Circle') {
      newObj = new Circle();
    } else if (o.type === 'Text') {
      newObj = new Text();
    }

    if (keepAnimation) {
      newObj.properties = o.properties;
    } else {
      newObj.properties = {};
      newObj.properties[rtv.frame] = o.properties[1];
      newObj.select();
    }

    newObjs.push(newObj);
  }

  return newObjs;
}

function stateToString() {
  return JSON.stringify({
    num_frames: rtv.num_frames, frame: rtv.frame, objs: rtv.objs, cam: rtv.cam, pen: rtv.pen,
  });
}

function strToState(str) {
  const dict = JSON.parse(str);
  const arr = dict.objs;

  if (dict.num_frames) {
    rtv.num_frames = dict.num_frames;
  }

  if (dict.frame) {
    rtv.frame = dict.frame;
    rtv.frames.create_buttons();
  }

  if (dict.pen) {
    rtv.pen = new Pen();
    rtv.pen.drawings = dict.pen.drawings;
  }

  if (dict.cam && dict.cam.properties) {
    rtv.cam = new Camera();
    rtv.cam.properties = dict.cam.properties;
    rtv.cam.update_props();
  }

  rtv.objs = textArrayToObjs(arr, true);
}

export function saveState() {
  // save state
  const str = stateToString();
  if (states.length > 0) {
    const last = states[states.length - 1];
    if (str !== last) {
      states.push(str);
    }
  } else {
    states = [str];
  }
}

function undo() {
  if (states.length > 1) {
    states = states.splice(0, states.length - 1);
    strToState(states[states.length - 1]);
  }
}

function save(objs) {
  const str = stateToString();
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' });
  const name = document.getElementById('name').value;
  saveAs(blob, name);
}

function load(evt) {
  const { files } = evt.target; // FileList object
  const f = files[0];

  const reader = new FileReader();

  reader.addEventListener('load', ({ target: { result: string } }) => strToState(string));

  reader.readAsText(f);
}

export function saveLocal() {
  localStorage.setItem('page', stateToString());
}

export function loadLocal() {
  // Grab the objects from storage
  const page = localStorage.getItem('page');
  if (page && page.length) {
    strToState(page);
  }
}

export function insertFrame() {
  rtv.num_frames += 1;
  for (let f = rtv.num_frames; f >= rtv.frame; f--) {
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.copy_properties === 'function' && obj.properties[f]) {
        obj.copy_properties(f, f + 1);
      }
    }

    if (rtv.cam.properties[f]) {
      rtv.cam.properties[f + 1] = copy(rtv.cam.properties[f]);
    }
  }
  rtv.frames.create_buttons();
}

export function enterSelect() {
  rtv.tool = 'select';
  rtv.new_line = null;
}

/**
 * Enters presentation mode.
 */
export function present() {
  /**
   * Sets page up for presentation mode.
   */
  function setUpPresentationMode() {
    rtv.c.focus();
    enterSelect(); // Enter select mode
    document.body.style.cursor = 'none'; // Hide cursor
    document.body.style.overflow = 'hidden'; // Disable and hide scrollbars
    rtv.presenting = true; // Declare presentation mode entered
  }

  /**
   * Sets up presentation mode once window is scrolled to top.
   */
  function scrollListener() { // Scroll listener
    if (window.scrollY === 0) { // Check if smooth scroll finished
      window.removeEventListener('scroll', scrollListener); // Stop listening
      setUpPresentationMode();
    }
  }

  if (window.scrollY !== 0) { // Check if already at top
    window.scrollTo({
      top: 0, // Scroll to top
      behavior: 'smooth', // Smooth scroll
    }); // Scroll window

    window.addEventListener('scroll', scrollListener); // Attach scroll listener
  } else {
    setUpPresentationMode();
  }
}

function constrainFrame(f) {
  return Math.max(1, Math.min(rtv.num_frames, f));
}

export function loopFrame(f) {
  if (f >= rtv.num_frames + 1) {
    return 1;
  } if (f < 1) {
    return rtv.num_frames;
  }

  return f;
}

function drawAxes(ctx) {
  if (!rtv.cam.R) {
    return;
  }

  ctx.save();

  let csysStyle = rtv.cam.style();
  let props = rtv.cam.properties[rtv.frame];

  // do a fade in and out
  if (rtv.transition.transitioning) {
    const csysNextStyle = rtv.cam.properties[rtv.next_frame].style;

    if (csysNextStyle != null && csysNextStyle !== csysStyle) {
      // changing text
      const constrained = constrain(rtv.t_ease);
      ctx.globalAlpha = Math.cos(constrained * 2 * Math.PI) / 2 + 0.5;
      if (constrained >= 0.5) {
        csysStyle = csysNextStyle;
        if (rtv.cam.properties[rtv.next_frame]) {
          props = rtv.cam.properties[rtv.next_frame];
        }
      }
    }
  }

  if (csysStyle === '3d' || csysStyle === 'flat') {
    // draw gridlines
    ctx.strokeStyle = '#DDDDDD';

    if (csysStyle === '3d') {
      let axis = rtv.cam.ticks[0];
      axis = math.matrix(axis);
      axis = rtv.cam.graph_to_screen_mat(axis);
      const N = axis.length;
      for (let j = 0; j < N; j += 2) {
        if (j !== 20 && j !== 62) {
          ctx.beginPath();
          ctx.moveTo(axis[j][0], axis[j][1]);
          ctx.lineTo(axis[j + 1][0], axis[j + 1][1]);
          ctx.stroke();
        }
      }
    } else {
      const w = rtv.c.clientWidth * 2;
      const h = rtv.c.clientHeight * 2;

      const dx = GRID_SIZE * props.w;
      const dy = GRID_SIZE * props.h;

      const p = rtv.cam.graph_to_screen(0, 0, 0);

      for (let x = p[0] % dx; x < w; x += dx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = p[1] % dy; y < h; y += dy) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';

    // center
    const c = rtv.cam.graph_to_screen(0, 0, 0);

    // axes
    let axes = math.matrix([[10, 0, 0],
      [0, 10, 0],
      [0, 0, 10],
      [-10, 0, 0],
      [0, -10, 0],
      [0, 0, -10]]);

    axes = rtv.cam.graph_to_screen_mat(axes);

    let labels;
    if (rtv.cam.axes_names) {
      labels = rtv.cam.axes_names;
    } else {
      labels = ['x', 'y', 'z'];
    }

    const colors = ['#FF0000', '#00FF00', '#0000FF'];

    const N = axes.length;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = colors[i % 3];
      ctx.strokeStyle = colors[i % 3];

      const x = axes[i][0];
      const y = axes[i][1];

      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 0;

    for (let i = 0; i < 3; i++) {
      const x = axes[i][0];
      const y = axes[i][1];

      ctx.beginPath();
      ctx.fillStyle = '#FFFFFF';
      ctx.arc(x, y, 16, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = colors[i % 3];
      ctx.strokeStyle = colors[i % 3];
      ctx.fillText(labels[i], x, y);
    }
  }

  ctx.restore();
}

export function transitionWithNext(next) {
  if (rtv.transition.transitioning) {
    return;
  }

  if (next > rtv.num_frames) {
    return;
  }

  if (rtv.tool === 'copy frame') {
    enterSelect();
    // copy properties
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.copy_properties === 'function') {
        obj.copy_properties(rtv.frame, next);
      }
    }

    return;
  }

  rtv.new_line = null;
  rtv.next_frame = next;
  changeFrames();
  let steps = T_STEPS;
  if (!rtv.presenting || rtv.keys.meta || rtv.keys.ctrl) {
    // make it instant when menu open
    steps = 0;
  }

  rtv.transition.run(steps, next, (targ) => {
    rtv.frame = targ;
    parser.set('frame', rtv.frame);

    rtv.objs.forEach((obj) => {
      if (typeof obj.parse_text === 'function') {
        obj.parse_text(obj.properties[rtv.frame].t);
      }

      if (typeof obj.eval === 'function') {
        obj.eval();
      }
    });
  });
}

function drawCursor() {
  if (rtv.presenting && rtv.tool === 'pen') {
    const pad = 20;

    rtv.ctx.save();

    rtv.ctx.translate(rtv.mouse.pos.x, rtv.mouse.pos.y);

    rtv.ctx.strokeStyle = rtv.pen.color;

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 0);
    rtv.ctx.lineTo(pad / 2, pad);
    rtv.ctx.moveTo(0, 0);
    rtv.ctx.lineTo(-pad / 2, pad);

    rtv.ctx.stroke();
    rtv.ctx.restore();
  } else if (rtv.presenting && rtv.mouse.time > 0) {
    // draw a cursor

    const mx = rtv.mouse.pos.x;
    const my = rtv.mouse.pos.y;

    rtv.ctx.save();
    rtv.ctx.translate(mx, my);
    rtv.ctx.strokeStyle = DARK;
    rtv.ctx.beginPath();

    if (rtv.mouse.down) {
      rtv.mouse.time = MOUSE_DURATION;

      rtv.ctx.arc(0, 0, 10, 0, PI2, 0);
    } else {
      const pad = 20;

      if (rtv.tool === 'camera') {
        rtv.ctx.moveTo(-pad, 0);
        rtv.ctx.lineTo(pad, 0);
        rtv.ctx.moveTo(0, -pad);
        rtv.ctx.lineTo(0, pad);
      } else {
        rtv.ctx.moveTo(pad, 0);
        rtv.ctx.lineTo(0, 0);
        rtv.ctx.lineTo(0, pad);
        rtv.ctx.moveTo(0, 0);
        rtv.ctx.lineTo(pad, pad);
      }
    }

    rtv.ctx.stroke();
    rtv.ctx.restore();
  }
}

// http://www.javascriptkit.com/javatutors/requestanimationframe.shtml
window.requestAnimationFrame
    ??= window.mozRequestAnimationFrame
    ?? window.webkitRequestAnimationFrame
    ?? window.msRequestAnimationFrame
    ?? ((f) => setTimeout(f, 1000 / rtv.fps)); // simulate calling code 60

math.import({
  logicTable(...scenarios) {
    const O = [true, false];

    scenarios.forEach((s, k) => {
      rtv.ctx.save();

      const props = parser.evaluate('text_props');
      const { x } = props.p;
      const { y } = props.p;
      rtv.ctx.translate(x + 5 * GRID_SIZE * k, y + GRID_SIZE);
      rtv.ctx.fillText(s, 0, 0);

      for (let i = 0; i < 2; i++) {
        const p = O[i];

        for (let j = 0; j < 2; j++) {
          const q = O[j];

          const r = math.beval(s
            .replace('P', p)
            .replace('Q', q));

          if (r) {
            rtv.ctx.fillStyle = COLORS[4];
            rtv.ctx.fillText('T', 0, GRID_SIZE);
          } else {
            rtv.ctx.fillStyle = COLORS[1];
            rtv.ctx.fillText('F', 0, GRID_SIZE);
          }

          rtv.ctx.beginPath();
          rtv.ctx.strokeStyle = COLORS[5];
          rtv.ctx.moveTo(0, GRID_SIZE / 2 - 2);
          rtv.ctx.lineTo(GRID_SIZE * 5, GRID_SIZE / 2 - 2);
          rtv.ctx.stroke();

          rtv.ctx.translate(0, GRID_SIZE);
        }
      }

      rtv.ctx.restore();
    });
  },
  implies(p, q) { // LOGIC: Returns whether p => q is a true statement. Only false when p=T and q=F
    return implies(p, q);
  },
  beval(statement) { // LOGIC: Boolean evaluation, "true^false||true"
    return eval(statement
      .toLowerCase()
      .replace('^', '&&'));
  },
  // eslint-disable-next-line max-len
  tautology(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always true
    const O = [true, false];

    for (let i = 0; i < 2; i++) {
      const p = O[i];
      for (let j = 0; j < 2; j++) {
        const q = O[j];

        const s = copy(statement);
        s.replace('P', p);
        s.replace('Q', q);

        if (!math.beval(s)) {
          return false;
        }
      }
    }

    return true;
  },
  // eslint-disable-next-line max-len
  contradiction(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always false
    const O = [true, false];

    for (let i = 0; i < 2; i++) {
      const p = O[i];
      for (let j = 0; j < 2; j++) {
        const q = O[j];

        const s = copy(statement);
        s.replace('P', p);
        s.replace('Q', q);

        if (math.beval(s)) {
          return false;
        }
      }
    }

    return true;
  },
  egg({ _data: f }) {
    const radius = 100;

    let col = 'white';
    if (f[0]) {
      col = 'white';
    } else if (f[1]) {
      col = COLORS[3];
    } else if (f[2]) {
      col = COLORS[4];
    }

    let scol = 'white';
    if (f[3]) {
      scol = 'white';
    } else if (f[4]) {
      scol = COLORS[3];
    } else if (f[5]) {
      scol = COLORS[4];
    }

    let spots = 0;
    if (f[6]) {
      spots = 1;
    } else if (f[7]) {
      spots = 3;
    } else if (f[8]) {
      spots = 5;
    }

    const hairy = f[10];

    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const { x } = props.p;
    const { y } = props.p;
    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h * 1.2);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.beginPath();
    rtv.ctx.arc(x, y, radius, 0, 2 * math.PI, 0);
    rtv.ctx.fillStyle = col;
    rtv.ctx.strokeStyle = 'black';
    rtv.ctx.fill();
    rtv.ctx.stroke();

    const da = 2 * math.PI / math.max(spots, 1);
    for (let i = 0; i < spots; i++) {
      const a = da * i;
      rtv.ctx.beginPath();
      rtv.ctx.arc(x + math.cos(a) * (20 + spots * 2) + 30,
        y + math.sin(a) * (20 + spots * 2) + 30,
        10, 0, 2 * math.PI, 0);
      rtv.ctx.fillStyle = scol;
      rtv.ctx.fill();
      rtv.ctx.stroke();
    }

    if (hairy) {
      const n = 40;
      const da = 2 * math.PI / n;
      for (let i = 0; i < n; i++) {
        const a = da * i;

        const sx = x + math.cos(a) * radius;
        const sy = y + math.sin(a) * radius;

        rtv.ctx.beginPath();

        rtv.ctx.moveTo(sx,
          sy);

        rtv.ctx.lineTo(sx + math.cos(a) * 15,
          sy + math.sin(a) * 15);

        rtv.ctx.stroke();
      }
    }

    rtv.ctx.restore();
  },
  rad(deg) { // converts to radians
    return deg * math.pi / 180;
  },
  deg(rad) { // converts to degrees
    return rad * 180.0 / math.pi;
  },
  loop(fn, count) { // function of index 0 to count-1
    if (count <= 0) {
      return;
    }

    for (let i = 0; i < count; i++) {
      fn(i);
    }
  },
  fifo(matrix, value) {
    return math.matrix(matrix
      .toArray()
      .slice(1)
      .concat(value));
  },
  push(matrix, value) {
    return math.concat(matrix, [value]);
  },
  dims(m) {
    return math.matrix(m.size());
  },
  surface(fn) {
    const d = 21; const d2 = d / 2;
    const dims = [d * d, 3];
    const m = cached(dims);
    let md = m._data;

    let xin = 0; let zin = 0; let yout = 0;
    let i = 0;
    for (let x = 0; x < d; x++) {
      for (let z = 0; z < d; z++) {
        xin = (x - d2) + 0.5;
        zin = (z - d2) + 0.5;
        yout = fn(xin, zin);
        md[i][0] = xin;
        md[i][1] = yout;
        md[i][2] = zin;
        i += 1;
      }
    }

    md = rtv.cam.graph_to_screen_mat(m);

    i = 0;
    for (let x = 0; x < d; x++) {
      rtv.ctx.beginPath();
      let xc = md[i][0];
      let yc = md[i][1];
      rtv.ctx.moveTo(xc, yc);

      for (let z = 0; z < d; z++) {
        xc = md[i][0];
        yc = md[i][1];

        rtv.ctx.lineTo(xc, yc);

        i += 1;
      }

      rtv.ctx.stroke();

      rtv.ctx.beginPath();
      xc = md[x][0];
      yc = md[x][1];
      rtv.ctx.moveTo(xc, yc);

      for (let j = 0; j < dims[0]; j += d) {
        xc = md[x + j][0];
        yc = md[x + j][1];

        rtv.ctx.lineTo(xc, yc);
      }

      rtv.ctx.stroke();
    }
  },
  surfacez(fn) {
    const d = 21; const d2 = d / 2;
    const dims = [d * d, 3];
    const m = cached(dims);
    let md = m._data;

    let a = 0; let b = 0;
    let i = 0;
    for (let x = 0; x < d; x++) {
      for (let z = 0; z < d; z++) {
        a = (x - d2) + 0.5;
        b = (z - d2) + 0.5;
        md[i][0] = a;
        md[i][1] = b;
        md[i][2] = fn(a, b);
        i += 1;
      }
    }

    md = rtv.cam.graph_to_screen_mat(m);

    i = 0;
    for (let x = 0; x < d; x++) {
      rtv.ctx.beginPath();
      let xc = md[i][0];
      let yc = md[i][1];
      rtv.ctx.moveTo(xc, yc);

      for (let z = 0; z < d; z++) {
        xc = md[i][0];
        yc = md[i][1];

        rtv.ctx.lineTo(xc, yc);

        i += 1;
      }

      rtv.ctx.stroke();

      rtv.ctx.beginPath();
      xc = md[x][0];
      yc = md[x][1];
      rtv.ctx.moveTo(xc, yc);

      for (let j = 0; j < dims[0]; j += d) {
        xc = md[x + j][0];
        yc = md[x + j][1];

        rtv.ctx.lineTo(xc, yc);
      }

      rtv.ctx.stroke();
    }
  },
  randn(shape) { // no args: random normal, 1 arg shape: dims of matrix to return
    if (shape) {
      let m = cached(shape._data);
      m = m.map(randNBm);

      return m;
    }
    return randNBm();
  },
  axes(x, y, z) { // replace default camera axis names
    rtv.cam.axes_names = [x, y, z];
  },
  block() { // exectutes each argument
  },
  rotation(rx, ry, rz) { // creates a 3x3 rotation matrix
    return math.matrix(rotationMatrix(rx, ry, rz));
  },
  grid(rangex, rangey = rangex) { // returns matrix x*y by 2
    const xd = rangex._data;
    const yd = rangey._data;
    const xN = xd.length; const yN = yd.length;
    const m = cached([xN * yN, 2]);

    let idx = 0;

    for (let i = 0; i < xN; i++) {
      for (let j = 0; j < yN; j++) {
        const row = m._data[idx];
        row[0] = xd[i];
        row[1] = yd[j];
        idx += 1;
      }
    }

    return m;
  },
  rotateCamera(rx, ry, rz) { // rotates the camera
    const rxyz = [rx, ry, rz];
    if (!Number.isNaN(math.sum(rxyz))) {
      rtv.cam.properties[rtv.frame].rxyz = rxyz;
    } else {
      rtv.cam.properties[rtv.frame].rxyz = [0, 0, 0];
    }
  },
  T(m) { // transpose m
    return math.transpose(m);
  },
  // eslint-disable-next-line max-len
  scatter(points, pSize = 8, colorFn) { // points [[x1, y1, z1], ...], pSize, color([x,y,z])=[r,g,b] 0 <= r <= 1
    const pointsArray = points.toArray();
    const pSizeHalf = pSize / 2;
    const colored = colorFn instanceof Function;

    const mappedPoints = rtv.cam.graph_to_screen_mat(points)
      .map((mapped, i) => ({
        mapped,
        color: colored
          ? formatRgb1(colorFn(pointsArray[i]).map(constrain).toArray())
          : undefined,
      }));

    if (colored) {
      mappedPoints.sort(({ mapped: [,, a] }, { mapped: [,, b] }) => (a <= b ? 1 : -1));
    }

    rtv.ctx.save();

    mappedPoints.forEach(({ color, mapped }) => {
      rtv.ctx.fillStyle = color;
      rtv.ctx.fillRect(mapped[0] - pSizeHalf, mapped[1] - pSizeHalf, pSize, pSize);
    });

    rtv.ctx.restore();
  },
  point(a, size = 8, color) { // point [x,y,z] size color[r,g,b]
    if (size <= 0) return;

    const mapped = rtv.cam.graph_to_screen(...a.toArray());

    rtv.ctx.save();

    if (color) {
      rtv.ctx.fillStyle = formatRgb1(color.map(constrain).toArray());
    }

    rtv.ctx.beginPath();
    rtv.ctx.arc(mapped[0], mapped[1], size, 0, PI2);
    rtv.ctx.fill();

    rtv.ctx.restore();
  },
  graph(fn) { // graphs y=f(x)
    graph(fn, 0, 1, 2);
  },
  // eslint-disable-next-line max-len
  paral(r, tmin, tmax, units) { // parametric line, graphs r(t)=[f(t), g(t), h(t)] from t=tmin to tmax
    para(r, tmin, tmax, units);
  },
  graphxy(fn) { // graphs y=f(x)
    graph(fn, 0, 1, 2);
  },
  graphyx(fn) { // graphs x=f(y)
    graph(fn, 1, 0, 2);
  },
  graphxz(fn) {
    graph(fn, 0, 2, 1);
  },
  graphyz(fn) {
    graph(fn, 1, 2, 0);
  },
  draw(points, fill) { // draws line from point to point [[x1,y1,z1], ...], draws arrow
    const N = points.size()[0];
    const mapped = rtv.cam.graph_to_screen_mat(points);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    let p; let lastp;
    for (let i = 0; i < N; i++) {
      p = mapped[i];
      if (i === 0) {
        rtv.ctx.moveTo(p[0], p[1]);
      } else {
        rtv.ctx.lineTo(p[0], p[1]);
      }

      lastp = p;
    }
    rtv.ctx.stroke();
    if (fill) {
      const col = fill._data.map(constrain);
      rtv.ctx.fillStyle = formatRgb1(col);
      rtv.ctx.globalAlpha = 0.8;
      rtv.ctx.fill();
    }
    rtv.ctx.restore();
  },
  drawxy(xs, ys) {
    const N = xs.size()[0];
    const m = cached([N, 3]);
    for (let i = 0; i < N; i++) {
      m._data[i][0] = xs._data[i];
      m._data[i][1] = ys._data[i];
      m._data[i][2] = 0;
    }

    math.draw(m);
  },
  oval(_p, hr, vr, _n) {
    let n = 10;
    if (arguments.length >= 4) {
      n = _n;
    }

    const path = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2 * math.PI;
      const p = math.add(_p, [math.cos(t) * hr, math.sin(t) * vr, 0]);
      path.push(p);
    }

    return math.matrix(path);
  },
  vect(a, b) {
    if (!a) {
      return;
    }

    const aL = 're' in a && a.im
      ? math.matrix([a.re, a.im])
      : a;

    const bL = b && b.re && b.im
      ? math.matrix([b.re, b.im])
      : b;

    let _x = 0;
    let _y = 0;
    let _z = 0;

    let x = 0;
    let y = 0;
    let z = 0;

    if (!bL) {
      x = aL._data[0];
      y = aL._data[1];

      if (aL.size()[0] === 3) {
        z = aL._data[2];
      }
    } else {
      _x = aL._data[0];
      _y = aL._data[1];

      if (aL.size()[0] === 3) {
        _z = aL._data[2];
      }

      x = bL._data[0];
      y = bL._data[1];

      if (bL.size()[0] === 3) {
        z = bL._data[2];
      }
    }

    drawVect(_x, _y, _z, x, y, z);
  },
  if(fnCondition, fnA, fnB) { // if fn_condition() == true then fn_a() else fn_b()
    if (fnCondition()) {
      fnA();
    } else {
      fnB();
    }
  },
  list(fn, array) { // [fn(v) for v in array]
    const N = array.size()[0];
    const d = array._data;

    let v = fn(d[0])._data;
    // get return size
    const dims = [N, v.length];

    const m = cached(dims);
    const md = m._data;

    for (let i = 0; i < N; i++) {
      v = fn(d[i]);
      const vd = v._data;

      if (vd) {
        const vN = vd.length;
        for (let j = 0; j < vN; j++) {
          md[i][j] = vd[j];
        }
      } else {
        md[i] = v;
      }
    }

    return m;
  },
  view(x, { _data: p } = { _data: [0, 0] }) { // matrix, position: [x, y, z]
    let t = [];
    if (x._data) {
      const d = x.map(roundWithKey)._data;
      if (x._size.length === 1) {
        t = [d.join(' ')];
      } else {
        for (let r = 0; r < d.length; r++) {
          t.push(d[r].join(' '));
        }
      }
    }

    const mapped = rtv.cam.graph_to_screen(p[0], p[1], 0);
    for (let i = 0; i < t.length; i++) {
      rtv.ctx.textAlign = 'left';
      rtv.ctx.fillText(t[i], mapped[0], mapped[1] + GRID_SIZE * i);
    }
  },
  labels(labels, points) { // render labels ["l1", ...] at [[x1, y1, z1], ...]
    const mapped = rtv.cam.graph_to_screen_mat(points);
    const N = labels.size()[0];
    let p;
    rtv.ctx.save();
    rtv.ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      p = mapped[i];
      rtv.ctx.fillText(labels._data[i], p[0], p[1]);
    }
    rtv.ctx.restore();
  },
  sig(x) { // sigmoid(x)
    if (x._data) {
      const b = x.map(sig);
      return b;
    }

    return sig(x);
  },
  sigp(x) { // sigmoid_prime(x)
    if (x._data) {
      const b = x.map(sigp);
      return b;
    }

    return sigp(x);
  },
  // eslint-disable-next-line max-len
  field(f, _n, _uv) { // plots a vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
    let n = 10;
    let uv = false;

    if (arguments.length >= 2) {
      n = _n - 1;

      if (n <= 0) {
        n = 1;
      }
    }

    if (arguments.length >= 3 && _uv === true) {
      uv = true;
    }

    const d = 20 / n;

    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let v = f(x, y, z)._data;
          if (uv) {
            const n = math.norm(v);
            v = [v[0] / n, v[1] / n, v[2] / n];
          }

          drawVect(x, y, z, x + v[0], y + v[1], z + v[2]);
        }
      }
    }
  },
  // eslint-disable-next-line max-len
  fielda(f, _n, _uv) { // plots an animated vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
    let n = 10;
    let uv = false;

    const mod = 0.2;
    const flo = (rtv.t / 500) % mod;

    if (arguments.length >= 3) {
      n = _n - 1;

      if (n <= 0) {
        n = 1;
      }
    }

    if (arguments.length >= 4 && _uv === true) {
      uv = true;
    }

    const d = 20 / n;

    rtv.ctx.save();
    rtv.ctx.globalAlpha = math.sin(flo / mod * math.PI);

    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let v = f(x, y, z)._data;
          if (uv) {
            const n = math.norm(v);
            v = [v[0] / n, v[1] / n, v[2] / n];
          }

          const a = rtv.cam.graph_to_screen(x + flo * v[0], y + flo * v[1], z + flo * v[2]);

          rtv.ctx.beginPath();
          rtv.ctx.arc(a[0], a[1], 5, 0, PI2);
          rtv.ctx.fill();
        }
      }
    }
    rtv.ctx.restore();
  },
  paras(r, _urs, _ure, _vrs, _vre, _n = 1, f) { // parametric surface r(u,v) with optional field f
    let n = 10;

    if ((_ure - _urs) <= 0 || (_vre - _vrs) <= 0 || n <= 0) {
      return;
    }

    if (arguments.length >= 6) {
      n = _n;
    }

    const du = (_ure - _urs) / n;
    const dv = (_vre - _vrs) / n;

    rtv.ctx.save();

    let u = _urs;
    let v = _vrs;

    for (let i = 0; i <= n; i++) {
      u = _urs + du * i;

      rtv.ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        v = _vrs + dv * j;

        const p = r(u, v)._data;
        const camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
        if (v === 0) {
          rtv.ctx.moveTo(camp[0], camp[1]);
        } else {
          rtv.ctx.lineTo(camp[0], camp[1]);
        }
      }
      rtv.ctx.stroke();
    }

    for (let i = 0; i <= n; i++) {
      v = _vrs + dv * i;

      rtv.ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        u = _urs + du * j;
        const p = r(u, v)._data;
        const camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
        if (u === 0) {
          rtv.ctx.moveTo(camp[0], camp[1]);
        } else {
          rtv.ctx.lineTo(camp[0], camp[1]);
        }
      }
      rtv.ctx.stroke();
    }

    if (f) {
      for (let i = 0; i <= n; i++) {
        u = _urs + du * i;

        for (let j = 0; j <= n; j++) {
          v = _vrs + dv * j;

          const p = r(u, v)._data;

          const vect = f(p[0], p[1], p[2])._data;
          drawVect(p[0], p[1], p[2], p[0] + vect[0], p[1] + vect[1], p[2] + vect[2]);
        }
      }
    }

    rtv.ctx.restore();
  },
  integral(f, a, b, _n) {
    if (a === b) {
      return 0;
    }

    let aL = a;
    let bL = b;

    let negate = false;
    if (aL > bL) {
      rtv.t = bL;
      bL = aL;
      aL = rtv.t;
      negate = true;
    }

    let n = 10000;
    if (arguments.length >= 4) {
      n = _n;
    }

    const dx = (bL - aL) / n;
    let sum = 0;
    for (let x = aL; x <= bL; x += dx) {
      sum += f(x) * dx;
    }

    if (negate) {
      sum *= -1;
    }

    return sum;
  },
  der(f, _h) { // return derivative approximation function _h = dx default .001
    let h = 0.001;
    if (arguments.length >= 2) {
      h = _h;
    }

    return function g(a) {
      return (f(a + h) - f(a)) / h;
    };
  },
  visnet({ _data: layers }, retHighlighted) { // Draws a neural net layers = [1, 2, 3, 2, 1]
    const props = parser.evaluate('text_props');
    const pos = [props.p.x, props.p.y];

    const pad = 200;
    const radius = 20;

    const h = layers.length * pad;
    const w = Math.max(...layers) * pad;

    const loc = (i, j, units) => [
      pos[0] + 30 + w / 2 - pad * units / 2 + i * pad,
      pos[1] + h - j * pad - 120,
    ];

    rtv.ctx.save();

    // connections
    let highConn = [];
    let highNeur = [];

    for (let j = 0; j < layers.length - 1; j++) {
      const units = layers[j];
      const unitsNext = layers[j + 1];

      for (let i = 0; i < units; i++) {
        const p = loc(i, j, units);

        for (let k = 0; k < unitsNext; k++) {
          const p2 = loc(k, j + 1, unitsNext);

          /*
                    let vline = [p2[0] - p[0], p2[1] - p[1]];
                    let mvect = [mouse.x - p[0], mouse.y - p[1]];

                    let dot = mvect[0] * vline[0] + mvect[1] * vline[1];

                    let vlen = math.norm(vline);
                    let total_len = vlen * math.norm(mvect);

                    if (dot > total_len * .998 && dot < vlen*vlen) {
                        ctx.strokeStyle = "red";
                    } else {
                        ctx.strokeStyle = "black";
                    } */

          rtv.ctx.strokeStyle = 'black';

          if (highConn.length === 0) {
            const dx1 = p[0] - rtv.mouse.pos.x;
            const dy1 = p[1] - rtv.mouse.pos.y;

            const dx2 = p2[0] - rtv.mouse.pos.x;
            const dy2 = p2[1] - rtv.mouse.pos.y;

            const d1 = math.sqrt(dx1 * dx1 + dy1 * dy1);
            const d2 = math.sqrt(dx2 * dx2 + dy2 * dy2);

            const vline = [p2[0] - p[0], p2[1] - p[1]];
            const vlen = math.norm(vline);

            if (d1 + d2 < vlen + 1) {
              rtv.ctx.strokeStyle = COLORS[3];
              highConn = [i, k, j]; // unit i to unit k in layer j
              highNeur = [[i, j], [k, j + 1]];
            }
          }

          rtv.ctx.beginPath();
          rtv.ctx.moveTo(p[0], p[1]);
          rtv.ctx.lineTo(p2[0], p2[1]);
          rtv.ctx.stroke();
        }
      }
    }

    rtv.ctx.fillStyle = 'white';

    // neurons
    for (let j = 0; j < layers.length; j++) {
      const units = layers[j];

      for (let i = 0; i < units; i++) {
        const p = loc(i, j, units);

        rtv.ctx.strokeStyle = 'black';

        // if we have a highlighted connection and we're in the right layer
        if (highConn.length !== 0) {
          if (highConn[2] === j) {
            if (highConn[0] === i) {
              if (j === 0) {
                rtv.ctx.strokeStyle = COLORS[1];
              } else {
                rtv.ctx.strokeStyle = COLORS[2];
              }
            }
          } else if (highConn[2] === j - 1) {
            if (highConn[1] === i) {
              if (j === 0) {
                rtv.ctx.strokeStyle = COLORS[1];
              } else {
                rtv.ctx.strokeStyle = COLORS[2];
              }
            }
          }
        } else {
          const dx = rtv.mouse.pos.x - p[0];
          const dy = rtv.mouse.pos.y - p[1];

          if (dx * dx + dy * dy < 400) {
            if (j === 0) {
              rtv.ctx.strokeStyle = COLORS[1];
            } else {
              rtv.ctx.strokeStyle = COLORS[2];
            }

            highNeur = [[i, j]];
          }
        }

        rtv.ctx.beginPath();
        rtv.ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
        rtv.ctx.fill();
        rtv.ctx.stroke();
      }
    }

    rtv.ctx.restore();

    if (arguments.length >= 2 && retHighlighted) {
      return [highConn, highNeur];
    }
  },
  int(n) {
    return n | 0;
  },
  // eslint-disable-next-line max-len
  elefield({ _data: charges }, location) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.], provide location for field there
    if (arguments.length === 1) {
      const n = 5;
      const d = 20 / n;
      let p = [0, 0];
      const pl = 5; // path length

      // let move = ((millis % 1000) /1000 * .5 + .5);
      // console.log(move);

      for (let x = -10; x <= 10; x += d) {
        for (let y = -10; y <= 10; y += d) {
          for (let z = -10; z <= 10; z += d) {
            let xp = x;
            let yp = y;
            let zp = z;

            for (let j = 0; j <= pl; j++) {
              rtv.ctx.beginPath();
              p = rtv.cam.graph_to_screen(xp, yp, zp);
              rtv.ctx.moveTo(p[0], p[1]);
              let dead = false;

              // add up forces from charges
              for (let i = 0; i < charges.length; i += 4) {
                const q = charges[i];
                const cx = charges[i + 1];
                const cy = charges[i + 2];
                const cz = charges[i + 3];

                const v = [xp - cx, yp - cy, zp - cz];
                const len = math.norm(v);
                const l2 = len * len;

                const c = math.coulomb.value * q / len / l2;

                if (len > 2) {
                  xp += c * v[0];
                  yp += c * v[1];
                  zp += c * v[2];
                } else {
                  j = pl;
                  dead = true;
                }
              }

              if (dead === false) {
                p = rtv.cam.graph_to_screen(xp, yp, zp);
                rtv.ctx.strokeStyle = formatRgb1([1 - j / pl, 0, j / pl]);
                rtv.ctx.lineTo(p[0], p[1]);
                rtv.ctx.stroke();
              }
            }
          }
        }
      }
    } else if (arguments.length === 2) {
      // calculate field at the provided location
      const loc = location._data;

      const xp = loc[0];
      const yp = loc[1];
      const zp = loc[2];

      let xt = 0;
      let yt = 0;
      let zt = 0;

      // add up forces from charges
      for (let i = 0; i < charges.length; i += 4) {
        const q = charges[i];
        const cx = charges[i + 1];
        const cy = charges[i + 2];
        const cz = charges[i + 3];

        const v = [xp - cx, yp - cy, zp - cz];
        const len = math.norm(v);
        const l2 = len * len;

        const c = math.coulomb.value * q / len / l2; // math.coulomb.value*

        xt += c * v[0];
        yt += c * v[1];
        zt += c * v[2];
      }

      return [xt, yt, zt];
    }
  },
  // eslint-disable-next-line max-len
  eleforce({ _data: charges }, j) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.] force on jth charge
    const oc = charges[j * 4];
    const xp = charges[j * 4 + 1];
    const yp = charges[j * 4 + 2];
    const zp = charges[j * 4 + 3];

    let fx = 0;
    let fy = 0;
    let fz = 0;

    // add up forces from charges
    for (let i = 0; i < charges.length; i += 4) {
      if (i !== j * 4) {
        const q = charges[i];
        const cx = charges[i + 1];
        const cy = charges[i + 2];
        const cz = charges[i + 3];

        const v = [xp - cx, yp - cy, zp - cz];
        const len = math.norm(v);
        const l2 = len * len;

        const c = math.coulomb.value * q * oc / len / l2; // math.coulomb.value*

        fx += c * v[0];
        fy += c * v[1];
        fz += c * v[2];
      }
    }

    return [fx, fy, fz];
  },
  vismult(W, x) { // visualize matrix vector multiplication
    const pad = 24;

    const props = parser.evaluate('text_props');
    const loc = [props.p.x, props.p.y + pad];

    const result = math.multiply(W, x);

    const rMO = new MatrixOutput(result.toArray());
    const WMO = new MatrixOutput(W.toArray());
    const xMO = new MatrixOutput(x.toArray());

    // draw neural network
    const rows = W._size[0];
    const cols = W._size[1];

    const high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
    const highConn = high[0];
    const highNeur = high[1];

    // draw matrices

    // draw result matrix
    rtv.ctx.save();

    rtv.ctx.font = FONT.ANIM;

    rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
    rMO.draw(0, 0, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 1 && highn[0] === i) {
          rtv.ctx.fillStyle = COLORS[2];
        }
      }
    });

    rtv.ctx.fillStyle = 'black';
    rtv.ctx.fillText('=', rMO.width + pad, rMO.height / 2);

    // draw W matrix
    rtv.ctx.translate(rMO.width + pad * 3, 0);
    WMO.draw(0, 0, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      if (highConn.length && highConn[0] === j && highConn[1] === i) {
        rtv.ctx.fillStyle = COLORS[3];
      }
    });

    rtv.ctx.fillText('*', WMO.width + pad, WMO.height / 2);

    // draw x matrix
    rtv.ctx.translate(WMO.width + pad * 3, WMO.height / 2 - xMO.height / 2);
    xMO.draw(0, 0, (i, j) => {
      rtv.ctx.fillStyle = 'black';

      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 0 && highn[0] === i) {
          rtv.ctx.fillStyle = COLORS[1];
        }
      }
    });

    rtv.ctx.restore();
  },
  visdot(W, x) { // visualize matrix vector multiplication but as dot products
    const pad = 24;

    const props = parser.evaluate('text_props');
    const loc = [props.p.x, props.p.y + pad];

    const result = math.multiply(W, x);

    const rMO = new MatrixOutput(result.toArray());

    // draw neural network
    const rows = W._size[0];
    const cols = W._size[1];

    const high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
    const highConn = high[0];
    const highNeur = high[1];

    // draw matrices

    // draw result matrix
    rtv.ctx.save();

    rtv.ctx.font = FONT.ANIM;

    rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
    rMO.draw(0, 0, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 1 && highn[0] === i) {
          rtv.ctx.fillStyle = 'red';
        }
      }
    });

    rtv.ctx.fillStyle = 'black';
    rtv.ctx.fillText('=', rMO.width + pad, rMO.height / 2);

    // draw dot prod matrix
    rtv.ctx.translate(rMO.width + pad * 3, 0);
    const dp = [];

    for (let i = 0; i < W._data.length; i++) {
      let text = '';

      for (let j = 0; j < W._data[0].length; j++) {
        text += `${roundWithKey(W._data[i][j])}*${roundWithKey(x._data[j])}`;
        if (j < W._data[0].length - 1) {
          text += ' + ';
        }
      }

      rtv.ctx.fillText(text, 0, i * GRID_SIZE + 20);
    }

    rtv.ctx.restore();
  },
  // eslint-disable-next-line max-len
  magfield(path, current, { _data: atPoint } = {}) { // mag field from path [[x1, y1, z1], [x2, y2, z2], ...]
    const n = 5;
    const d = 20 / n;

    function bAt(x, y, z, { _data: path }, current) {
      let b = math.zeros(3);
      const c = current * math.magneticConstant.value / 4.0 / math.PI; // u0 I / 4 / pi

      for (let i = 0; i < path.length - 1; i += 1) {
        const p1 = path[i];
        const p2 = path[i + 1];

        let r = math.subtract([x, y, z], p1);
        const rnorm = math.norm(r);
        r = math.multiply(r, 1 / rnorm);

        const ds = math.subtract(p2, p1);
        let db = math.cross(ds, r);
        db = math.multiply(db, 1 / math.pow(rnorm, 2));

        b = math.add(b, db);
      }

      return math.multiply(b, c);
    }

    if (atPoint !== undefined) {
      const b = bAt(atPoint[0], atPoint[1], atPoint[2], path, current);

      return b;
    }
    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let b = bAt(x, y, z, path, current);

          if (math.norm(b) > 0.1) {
            b = b._data;
            drawVect(x, y, z, x + b[0], y + b[1], z + b[2]);
          }
        }
      }
    }
  },
  circle(_p, r, _n) {
    let n = 10;
    if (arguments.length >= 3) {
      n = _n;
    }

    const path = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2 * math.PI;
      const p = math.add(_p, [math.cos(t) * r, math.sin(t) * r, 0]);
      path.push(p);
    }

    return math.matrix(path);
  },
  interp(a, b, divisions) { // interpolate from [x1,y1,z1,...] -> [x2,y2,z2,...]
    const ad = a._data;
    const bd = b._data;

    const L = cached([divisions, ad.length]);

    for (let i = 0; i < divisions; i++) {
      const t = i / (divisions - 1);
      for (let j = 0; j < ad.length; j++) {
        L._data[i][j] = ad[j] * (1 - t) + t * bd[j];
      }
    }

    return L;
  },
  zer() {
    return [0, 0, 0];
  },
  linspace(a, b, steps) {
    const path = [];

    path.push(a);

    if (steps > 2) {
      const dt = 1 / (steps - 2);
      let t = 0;
      for (let i = 0; i < steps - 2; i++) {
        path.push(math.add(math.multiply(a, (1 - t)), math.multiply(t, b)));
        t += dt;
      }
    }

    path.push(b);

    return math.matrix(path);
  },
  say(text, _voice, _rate, _pitch) { // text to speech
    let voice = 11;

    if (_voice) {
      voice = _voice;
    }

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.8;

    if (arguments.length >= 3) {
      utterThis.rate = _rate;
    }

    if (arguments.length >= 4) {
      utterThis.pitch = _pitch;
    }

    utterThis.voice = rtv.speech.voices[voice];
    rtv.speech.synth.cancel();
    rtv.speech.synth.speak(utterThis);
  },
  enableVolMeter() {
    if (rtv.meter === undefined) {
      rtv.meter = initVolumeMeter();
    }
  },
  traceToggle() { // enable or disable canvas clearing
    try {
      parser.evaluate('_trace');
    } catch (e) {
      parser.set('_trace', false);
    }

    parser.set('_trace', !parser.evaluate('_trace'));
  },
  drawFarmer() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const { x } = props.p;
    const { y } = props.p;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -1.25, y + -211);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(4.000000000000001, 4.000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -41.25, y + -201);
    rtv.ctx.rotate(6.2831853071795845);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 38.75, y + -201);
    rtv.ctx.rotate(-6.2831853071795845);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -1.25, y + -171);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -1.25, y + -86);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-20, -45);
    rtv.ctx.lineTo(-40, 45);
    rtv.ctx.lineTo(40, 45);
    rtv.ctx.lineTo(20, -45);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -21.25, y + -21);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -20);
    rtv.ctx.lineTo(0, 20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 18.75, y + -21);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -20);
    rtv.ctx.lineTo(0, 20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -36.25, y + -101);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(15, -30);
    rtv.ctx.lineTo(-15, 30);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 33.75, y + -101);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-15, -30);
    rtv.ctx.lineTo(15, 30);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -57.91666666666674, y + -154.33333333333331);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-23.333333333333258, -56.666666666666686);
    rtv.ctx.lineTo(-13.333333333333258, 33.333333333333314);
    rtv.ctx.lineTo(36.66666666666674, 23.333333333333314);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 55.41666666666674, y + -154.33333333333331);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(23.333333333333258, -56.666666666666686);
    rtv.ctx.lineTo(13.333333333333258, 33.333333333333314);
    rtv.ctx.lineTo(-36.66666666666674, 23.333333333333314);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -71.25, y + -291);
    rtv.ctx.rotate(-1.308996938995747);
    rtv.ctx.scale(4.000000000000001, 3.400000000000001);
    rtv.ctx.arc(0, 0, 20, 1.308996938995747, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 68.75, y + -291);
    rtv.ctx.rotate(-2.0943951023931953);
    rtv.ctx.scale(4.000000000000001, -3.800000000000001);
    rtv.ctx.arc(0, 0, 20, 1.308996938995747, 2.8797932657906453, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -86.25, y + -206);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -5);
    rtv.ctx.lineTo(-5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawComputer() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const { x } = props.p;
    const { y } = props.p;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -3.5, y + -186);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-128, -96);
    rtv.ctx.lineTo(-128, 144);
    rtv.ctx.lineTo(192, 144);
    rtv.ctx.lineTo(192, -96);
    rtv.ctx.lineTo(-128, -96);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -151.5, y + -154.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(20, -127.5);
    rtv.ctx.lineTo(-20, -87.5);
    rtv.ctx.lineTo(-20, 102.5);
    rtv.ctx.lineTo(20, 112.5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -186.5, y + -124.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(15, -77.5);
    rtv.ctx.lineTo(-15, -27.5);
    rtv.ctx.lineTo(-15, 42.5);
    rtv.ctx.lineTo(15, 62.5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -11.5, y + -22);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-40, -20);
    rtv.ctx.lineTo(-80, 20);
    rtv.ctx.lineTo(80, 20);
    rtv.ctx.lineTo(40, -20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 53.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, 5);
    rtv.ctx.lineTo(-5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 98.5, y + -197);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 5);
    rtv.ctx.lineTo(0, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 143.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, 5);
    rtv.ctx.lineTo(5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 118.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 118.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 98.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(2.1999999999999997, 0.8);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 28.5, y + -122);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 0.5, y + -182);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-112, -80);
    rtv.ctx.lineTo(-112, 120);
    rtv.ctx.lineTo(168, 120);
    rtv.ctx.lineTo(168, -80);
    rtv.ctx.lineTo(-112, -80);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -41.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(2.1999999999999997, 0.8);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -21.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -21.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 3.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, 5);
    rtv.ctx.lineTo(5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -41.5, y + -197);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 5);
    rtv.ctx.lineTo(0, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -86.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, 5);
    rtv.ctx.lineTo(-5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawFace() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const { x } = props.p;
    const { y } = props.p;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -56.25, y + -53.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    // pupil
    rtv.ctx.save();
    rtv.ctx.beginPath();
    let angle = math.atan2(rtv.mouse.pos.y - y + 53.5, rtv.mouse.pos.x - x + 56.25);
    rtv.ctx.translate(x + -56.25, y + -53.5);
    rtv.ctx.rotate(angle);
    rtv.ctx.translate(8, 0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 56.25, y + -53.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    // pupil
    rtv.ctx.save();
    rtv.ctx.beginPath();
    angle = math.atan2(rtv.mouse.pos.y - y + 53.5, rtv.mouse.pos.x - x - 56.25);
    rtv.ctx.translate(x + 56.25, y + -53.5);
    rtv.ctx.rotate(angle);
    rtv.ctx.translate(8, 0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -8.4375, y + 11.1875);
    rtv.ctx.rotate(0);
    if (rtv.meter && rtv.meter.volume) {
      rtv.ctx.scale(1 - rtv.meter.volume * 2, 1 + rtv.meter.volume * 2);
    } else {
      rtv.ctx.scale(1, 1);
    }
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-25.3125, -8.4375);
    rtv.ctx.lineTo(42.1875, -8.4375);
    rtv.ctx.lineTo(8.4375, 25.3125);
    rtv.ctx.lineTo(-25.3125, -8.4375);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 0, y + -36.625);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    let np = 28.125;
    if (rtv.meter && rtv.meter.volume) {
      np -= rtv.meter.volume * 20;
    }
    rtv.ctx.moveTo(0, -28.125);
    rtv.ctx.lineTo(0, np);
    rtv.ctx.lineTo(0 - 15, 28.125 - 15);
    rtv.ctx.moveTo(0, np);
    rtv.ctx.lineTo(0 + 15, 28.125 - 15);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawDog() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const { x } = props.p;
    const { y } = props.p;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -23.25, y + -117.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-48, -32);
    rtv.ctx.lineTo(72, -32);
    rtv.ctx.lineTo(72, 48);
    rtv.ctx.lineTo(-48, 48);
    rtv.ctx.lineTo(-48, -32);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -51.25, y + -149.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1.4);
    rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 28.75, y + -149.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1.4);
    rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.translate(x + -42.5, y + -109.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.fillStyle = '#000000';
    rtv.ctx.fillText('-', 0, 0);
    rtv.ctx.fillText('.', 22.5, 0);
    rtv.ctx.fillText('-', 45, 0);
    rtv.ctx.restore();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -16.25, y + -94.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -5);
    rtv.ctx.lineTo(-5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -6.25, y + -94.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, -5);
    rtv.ctx.lineTo(5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -3.75, y + -34.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-37.5, -35);
    rtv.ctx.lineTo(-47.5, 35);
    rtv.ctx.lineTo(52.5, 35);
    rtv.ctx.lineTo(32.5, -35);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -26.25, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -25);
    rtv.ctx.lineTo(-5, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 63.75, y + -19.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-15, 20);
    rtv.ctx.lineTo(15, -20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -1.25, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -25);
    rtv.ctx.lineTo(0, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 18.75, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -25);
    rtv.ctx.lineTo(0, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  dirField(f) { // draws direction field of dy/dx = f(x,y)
    for (let x = -10; x <= 10; x += 2) {
      for (let y = -10; y <= 10; y += 2) {
        const dydx = f(x + 0.0001, y + 0.0001); // to avoid asymptotes at x=0 or y=0
        if (!dydx.im) {
          let uv = [1, dydx];
          uv = math.matrix(uv);
          uv = math.multiply(uv, 1 / math.norm(uv));
          drawVect(x, y, 0, x + uv._data[0], y + uv._data[1], 0);
        }
      }
    }
  },
  // eslint-disable-next-line max-len
  eulerMeth(f, x0, y0, _n, _h) { // approximate solution to diff eq from initial condition y(x0)=y0, n steps
    const n = _n > 0 ? _n : 10;
    const h = _h > 0 ? _h : 0.1;

    let x = x0;
    let y = y0;

    rtv.ctx.beginPath();

    let p = rtv.cam.graph_to_screen(x, y, 0);
    rtv.ctx.moveTo(p[0], p[1]);

    for (let i = 0; i < n; i++) {
      const dydx = f(x, y);

      if (dydx.im) {
        rtv.ctx.stroke();
        return math.matrix([x, y]);
      }

      x += h;
      y += dydx * h;

      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }

    rtv.ctx.stroke();
    return math.matrix([x, y]);
  },
  // eslint-disable-next-line max-len
  diffEq(a, b, c, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = 0 numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 7) {
      n = _n;
    }

    if (arguments.length >= 8) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const ypp = (-b * yp - c * y) / a;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  // eslint-disable-next-line max-len
  diffEqF(a, b, c, f, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = f(x) numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 8) {
      n = _n;
    }

    if (arguments.length >= 9) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const ypp = (f(x) - b * yp - c * y) / a;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  // eslint-disable-next-line max-len
  diffEqTri(a, b, c, d, x0, y0, yp0, ypp0, _n, _dt) { // ay''' + by'' + cy' + dy = 0 numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 8) {
      n = _n;
    }

    if (arguments.length >= 9) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;
    let ypp = ypp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const yppp = (-b * ypp - c * yp - d * y) / a;
      ypp += yppp * dt;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  factors(n) { // Returns positive factors of positive integer 'n'
    const factors = [];

    // Inserts element 'l' at index 'i' in array 'a'
    const insert = (l, i, a) => a.splice(i, 0, l);

    let i = 1;
    let c;
    let middle = 0;
    do {
      c = n / i; // Corresponding factor (or fraction, if 'i' isn't a factor of 'n') to 'i'

      // Check if 'n' is divisible by 'i'
      if (c % 1 === 0) { // Faster than 'Number.isInteger(c)'
        insert(i, middle, factors);
        if (i !== c) { // Check that 'n' is not a perfect square
          middle++; // Shift 'middle' one position to the right
          insert(c, middle, factors); // Insert 'c' to the right of 'i'
        }
      }

      i++;
    } while (i < c);

    return math.matrix(factors);
  },
  primeFactors(n, repeat = false) { // Returns prime factors of positive integer 'n'
    let dividend = n;
    const primes = [];

    let i = 2; // Initialize 'i' at smallest prime number
    let last; // Last prime factor
    while (dividend > 1) { // Loop until all factors are extracted
      const quotient = dividend / i;
      if (quotient % 1 === 0) {
        // Make sure factor is not already registered when 'repeat' is false
        if (repeat || i !== last) {
          primes.push(i);
        }
        last = i; // Register last prime factor
        dividend = quotient;
      } else { // 'f' is not a prime factor of 'dividend' (anymore)
        i++;
      }
    }

    return math.matrix(primes);
  },
  laplace(f, _ti, _tf, _dt) {
    let ti = 0;
    let tf = 1000;
    let dt = 0.01;

    if (arguments.length >= 2) {
      ti = _ti;
    }

    if (arguments.length >= 3) {
      tf = _tf;
    }

    if (arguments.length >= 4) {
      dt = _dt;
    }

    return (s) => {
      let sum = 0;
      for (rtv.t = ti; rtv.t <= tf; rtv.t += dt) {
        sum += math.exp(-s * rtv.t) * f(rtv.t);
      }
      return sum;
    };
  },
  step(t) {
    if (t > 0) {
      return 1;
    }
    return 0;
  },
  window(t, a, b) {
    return math.step(t - a) - math.step(t - b);
  },
});

/**
 * Draws a colored rectangle that covers the canvas.
 * @param {CanvasRenderingContext2D} ctx Canvas context.
 * @param {string} color Background color.
 */
function drawBackground(ctx = rtv.ctx, color = CANVAS_BG) {
  ctx.save(); // Save canvas state
  ctx.fillStyle = color; // Set fill style to requested background color
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Draw filled rectangle to cover surface
  ctx.restore(); // Restore canvas state
}

window.addEventListener('load', () => {
  rtv.objs = [];

  rtv.c = document.getElementById('viewport');
  rtv.c.style.backgroundColor = CANVAS_BG;
  rtv.c.focus();

  rtv.ctx = rtv.c.getContext('2d');

  configureCanvas();
  window.addEventListener('resize', configureCanvas);

  // speech synth
  rtv.speech.synth = window.speechSynthesis; // speech synthesis
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    rtv.speech.voices = window.speechSynthesis.getVoices();
  });

  document.getElementById('save').addEventListener('click', () => save(rtv.objs));

  document.getElementById('file').addEventListener('change', (evt) => {
    enterSelect();
    load(evt);
  });

  document.getElementById('load_to_frame').addEventListener('click', () => {
    const text = document.getElementById('selected_objects_text').value;
    const arr = JSON.parse(text);
    rtv.objs = rtv.objs.concat(textArrayToObjs(arr, false));
  });

  rtv.formula_text = document.getElementById('formula_text');
  document.getElementById('load_clear_formula_text').addEventListener('click', () => {
    const t = rtv.formula_text.value;
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.change_text === 'function' && obj.is_selected()) {
        obj.change_text(t);
      }
    }
  });
  document.getElementById('load_insert_formula_text').addEventListener('click', () => {
    const t = rtv.formula_text.value;
    rtv.objs.forEach((obj) => {
      if (typeof obj.replace_selected_text === 'function' && obj.is_selected()) {
        obj.change_text(obj.replace_selected_text(t));
      }
    });
  });

  document.getElementById('gen_js').addEventListener('click', () => {
    let js = '';

    rtv.selected_objs.forEach((obj) => {
      if (obj.generate_javascript) {
        const s = obj.generate_javascript();
        js += `${s}\n`;
      }
    });

    document.getElementById('generic').value = js;
  });

  document.getElementById('gen_script').addEventListener('click', () => {
    let script = document.getElementById('generic').value;
    script = script.split('\n');
    script = script.filter((s) => s.length !== 0);

    const t = new Text('', { x: 20, y: rtv.c.clientHeight * 2 - 60 });
    t.properties[rtv.frame].w = 0.6;
    t.properties[rtv.frame].h = 0.6;
    rtv.objs.push(t);

    for (let i = 0; i < script.length; i++) {
      const s = script[i];
      const fr = i + 1;
      if (!t.properties[fr]) {
        t.properties[fr] = copy(t.properties[fr - 1]);
      }

      t.properties[fr].t = s;
    }

    rtv.num_frames = script.length;
    rtv.frames.create_buttons();

    saveState();
  });

  rtv.recordingManager = new RecordingManager(
    rtv.c,
    document.getElementById('record'),
    document.getElementById('pause-resume'),
  );

  document.addEventListener('paste', (event) => {
    const paste = (event.clipboardData || window.clipboardData).getData('text');

    const N = rtv.objs.length;
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (obj.type === 'Text') {
        if (obj.is_selected()) {
          obj.paste_text(paste);
        }
      }
    }

    event.preventDefault();
  });

  rtv.transition = new Transition();
  rtv.frame = 1;
  rtv.frames = new Frames(() => ({
    x: rtv.c.width - GRID_SIZE * 2,
    y: GRID_SIZE / 4,
  }));
  rtv.frames.on_click = transitionWithNext;

  rtv.menu = new Menu({ x: GRID_SIZE / 4, y: GRID_SIZE / 2 });
  rtv.cam = new Camera();
  rtv.pen = new Pen();

  window.addEventListener('focus', () => {
    rtv.keys.meta = false;
    rtv.keys.ctrl = false;
  });

  rtv.c.addEventListener('keydown', (evt) => {
    const { key } = evt;

    if (key === 'Escape') {
      if (rtv.presenting && rtv.tool !== 'camera' && rtv.tool !== 'pen') {
        rtv.presenting = false;
        document.body.style.cursor = '';
        document.body.style.overflow = 'auto'; // Enable and show scrollbar
        return;
      }

      enterSelect();
    }

    if (rtv.keys.ctrl && key === 'Backspace') {
      rtv.objs.forEach((obj) => {
        if (obj.is_selected) obj.deleted = true;
      });
    }

    if (key === 'z' && (rtv.keys.meta || rtv.keys.ctrl)) {
      undo();
      return;
    }

    let captured = false;
    rtv.objs.forEach((obj) => {
      if (obj.onkeydown?.(evt)) {
        captured = true;
        return key === 'ArrowDown';
      }
      return false;
    });
    if (captured) {
      evt.preventDefault();
      return;
    }

    if (rtv.frames.onkeydown(evt)) {
      evt.preventDefault();
      return;
    }

    rtv.cam.onkeydown(evt);
    rtv.pen.onkeydown(evt);

    if (rtv.tool === 'select') {
      const tools = {
        t: 'text', s: 'shape', c: 'camera', v: 'vector',
      };
      if (key in tools) rtv.tool = tools[key];
    }
  });

  window.addEventListener('keydown', (evt) => {
    switch (evt.key) {
      case 'Tab':
        rtv.keys.tab = true;
        break;

      case 'Meta':
        rtv.keys.meta = true;
        break;

      case 'Shift':
        rtv.keys.shift = true;
        break;

      case 'Control':
        rtv.keys.ctrl = true;
        break;

      case 'Enter':
        if (rtv.keys.meta || rtv.keys.ctrl) present();
        break;

      case ' ':
        evt.preventDefault();
        break;

      // no default
    }
  });

  window.addEventListener('keyup', ({ key }) => {
    switch (key) {
      case 'Tab':
        rtv.keys.tab = false;
        break;

      case 'Meta':
        rtv.keys.meta = false;
        break;

      case 'Shift':
        rtv.keys.shift = false;
        break;

      case 'Control':
        rtv.keys.ctrl = false;
        break;

      // no default
    }

    saveState();
  });

  ['mousedown', 'touchstart'].forEach((evtName) => rtv.c.addEventListener(evtName, (evt) => {
    rtv.mouse.down = true;
    rtv.mouse.start = getMousePos(rtv.c, evt);

    try {
      math.compile('click()').evaluate(parser.scope);
    } catch { /* Continue */ }

    if (rtv.cam.mouse_down(evt) || rtv.pen.mouse_down(evt) || rtv.presenting) return;
    if (rtv.objs.some((obj) => obj.mouse_down?.(evt))) evt.preventDefault();
    if (rtv.frames.mouse_down()) return;
    if (rtv.tool === 'select') rtv.selecting = true;
  }));

  ['mousemove', 'touchmove'].forEach((key) => rtv.c.addEventListener(key, (evt) => {
    // update mouse
    rtv.mouse.pos = getMousePos(rtv.c, evt);
    rtv.mouse.grid = constrainToGrid(rtv.mouse.pos);
    rtv.mouse.graph = rtv.cam.screen_to_graph(rtv.mouse.pos);

    parser.set('_y', rtv.mouse.graph.x);
    parser.set('_z', rtv.mouse.graph.y);

    if (rtv.pen.mouse_move(evt)) return;

    if (rtv.mouse.down) {
      if (!rtv.objs.some((obj) => obj.mouse_drag?.(evt))) {
        rtv.cam.mouse_drag();
      }
    } else {
      rtv.objs.forEach((obj) => obj.mouse_move?.(evt));
    }

    if (rtv.presenting) rtv.mouse.time = MOUSE_DURATION;

    rtv.mouse.last = getMousePos(rtv.c, evt);
    rtv.mouse.gridLast = constrainToGrid(rtv.mouse.pos);
  }));

  ['mouseup', 'touchend'].forEach((evtName) => rtv.c.addEventListener(evtName, (evt) => {
    rtv.mouse.down = false;

    if (rtv.presenting) {
      // maybe tap some text
      rtv.objs.some((obj) => obj.mouse_up?.());

      evt.preventDefault();
    }

    if (rtv.frames.mouse_up(evt)) return;

    if (rtv.menu.mouse_up(evt)) {
      rtv.new_line = null;
      rtv.selecting = false;

      saveState();
      return;
    }

    if (rtv.pen.mouse_up(evt)) {
      saveState();
      return;
    }

    switch (rtv.tool) {
      case 'select':
        rtv.objs.some((obj) => obj.mouse_up?.());
        break;

      case 'text': {
        rtv.objs.forEach((obj) => { obj.selected = false; });

        // add a num obj at mouse pos
        const newText = new Text('', rtv.mouse.grid);
        newText.select();
        rtv.objs.push(newText);
      } break;

      case 'shape':
      case 'vector':
        // add a num obj at mouse pos
        if (rtv.new_line) {
          // add a point
          rtv.new_line.add_point({ x: rtv.mouse.grid.x, y: rtv.mouse.grid.y });
        } else {
          const l = new Shape([0, 0, 0, 1], [{ x: rtv.mouse.grid.x, y: rtv.mouse.grid.y }]);

          switch (rtv.tool) {
            case 'vector':
              l.properties[rtv.frame].v = true;
              break;

            case 'circle':
              l.properties[rtv.frame].circle = true;
              break;

            // no default
          }

          rtv.objs.push(l);
          rtv.new_line = l;
        }
        return;

      case 'circle': {
        const newCircle = new Circle([0, 0, 0, 1], rtv.mouse.grid);
        rtv.objs.push(newCircle);
      } break;

      case 'network': {
        const newNetwork = new Network(rtv.mouse.grid);
        rtv.objs.push(newNetwork);
      } break;

      // no default
    }

    if (rtv.selecting) {
      rtv.selecting = false;

      const { x, y } = rtv.mouse.start;
      const { x: x2, y: y2 } = rtv.mouse.pos;

      const xx = Math.min(x, x2);
      const yy = Math.min(y, y2);
      const xx2 = Math.max(x, x2);
      const yy2 = Math.max(y, y2);

      rtv.selected_objs = rtv.objs.filter((obj) => {
        if (typeof obj.in_rect === 'function') {
          obj.in_rect(xx, yy, xx2, yy2);
          return obj.is_selected();
        }
        return false;
      });

      if (rtv.selected_objs.length) {
        // store as text rep
        document.getElementById('selected_objects_text').value = JSON.stringify(
          rtv.selected_objs.map(
            (obj) => ({ ...obj, properties: { 1: obj.properties[rtv.frame] } }),
          ),
        );
      }
    }

    saveState();
  }));

  saveState();

  rtv.millis = Date.now();
  let targMillis = rtv.millis + 1; // set below

  function animate() {
    rtv.millis = Date.now();
    if (rtv.millis < targMillis) {
      setTimeout(animate, targMillis - rtv.millis);
      return;
    }

    targMillis = rtv.millis + 1000 / rtv.fps;

    if (rtv.presenting) {
      rtv.fps = 60;
    } else {
      rtv.fps = 30; // save power when editing
    }

    parser.set('_frame', rtv.t);
    parser.set('_millis', rtv.millis);
    const mp = rtv.cam.screen_to_graph({ x: rtv.mouse.pos.x, y: rtv.mouse.pos.y });
    parser.set('_mx', mp.x);
    parser.set('_my', mp.y);

    if (rtv.meter) {
      parser.set('_vol', rtv.meter.volume);
    }

    if (rtv.presenting) {
      rtv.mouse.time -= 1;
    }

    if (!parser.get('_trace')) {
      drawBackground();
    }

    rtv.cam.update_props();

    drawAxes(rtv.ctx);

    rtv.ctx.font = FONT.ANIM;

    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.eval === 'function') {
        obj.eval();
      }
    }

    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      obj.render(rtv.ctx);
    }

    for (let i = rtv.objs.length - 1; i >= 0; i--) {
      const obj = rtv.objs[i];
      if (obj.deleted) {
        rtv.objs.splice(i, 1);
      }
    }

    if (rtv.selecting) {
      // draw a rect
      rtv.ctx.strokeStyle = DARK;
      rtv.ctx.strokeRect(
        rtv.mouse.start.x,
        rtv.mouse.start.y,
        rtv.mouse.pos.x - rtv.mouse.start.x,
        rtv.mouse.pos.y - rtv.mouse.start.y,
      );
    }

    rtv.ctx.font = FONT.MENU;

    if (!rtv.presenting) {
      rtv.frames.render(rtv.ctx);
      rtv.menu.render(rtv.ctx);

      if (rtv.error.timer > 0) {
        rtv.ctx.save();
        rtv.ctx.fillStyle = 'red';
        rtv.ctx.fillText(rtv.error.text, 250, 30);
        rtv.ctx.restore();
        rtv.error.timer -= 1;
      }
    }

    rtv.pen.render();

    drawCursor();

    if (rtv.view_frame) {
      rtv.ctx.save();
      rtv.ctx.strokeStyle = 'black';
      rtv.ctx.beginPath();
      const w = 1928; // +8 pixels for padding
      const h = 1088;
      rtv.ctx.rect(rtv.c.clientWidth - w / 2, rtv.c.clientHeight - h / 2, w, h);
      rtv.ctx.stroke();

      if (!rtv.presenting) {
        rtv.ctx.globalAlpha = 0.1;

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(rtv.c.clientWidth - w / 2, rtv.c.clientHeight);
        rtv.ctx.lineTo(rtv.c.clientWidth + w / 2, rtv.c.clientHeight);
        rtv.ctx.stroke();

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(rtv.c.clientWidth, rtv.c.clientHeight - h / 2);
        rtv.ctx.lineTo(rtv.c.clientWidth, rtv.c.clientHeight + h / 2);
        rtv.ctx.stroke();

        rtv.ctx.globalAlpha = 1;
      }

      rtv.ctx.restore();
    }

    rtv.transition.update();

    rtv.t += 1;

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});
