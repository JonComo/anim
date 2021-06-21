import { create, all } from 'mathjs';
import packageJson from '../package.json';
import './style.css';

export const VERSION = packageJson.version; // Version
const IS_MAC = navigator.platform.toUpperCase().includes('MAC'); // Running on macOS?

export const MODE_KEYS = {
  c: 'camera',
  s: 'shape',
  t: 'text',
  v: 'vector',
};

// Text and image border
export const BORDER_OPACITY = 0.2;

// colors
export const BRACKET_COLOR = '#E74C3C';
export const GRID = '#eeeeee';
export const GRID_GUIDE = '#dddddd';
export const GRAPH_GUIDE = '#aaaaaa';
export const DARK = '#000000';
export const LIGHT = '#ffffff';
export const CANVAS_BG = 'white';

export const COLORS = ['#000000', '#E74C3C', '#2980B9', '#FFA400', '#66E07A', '#cccccc'];

export const FONT = {
  SMALL: '26px Courier, monospace',
  MENU: '30px Courier, monospace',
  ANIM: `${IS_MAC ? '40px Menlo' : '40px Courier New'}, monospace`,
};

export const SCALE_FACTOR = 2; // retina

// scatter
export const POINT_SIZE = 6;

export const T_STEPS = 30;

export const GRID_SIZE = 45;
export const MOUSE_DURATION = 40;

export const BRACKETS = {
  '(': 1,
  '[': 1,
  ')': -1,
  ']': -1,
};

export const PI2 = 2 * Math.PI;
export const MAT_NUM_WIDTH = 140; // matrix max number width

// fn drawing
export const CHAR = {
  SIZE: GRID_SIZE / 2,
  PAD: GRID_SIZE / 4,
};

export const rtv = {
  error: {
    timer: 0,
    text: 0,
  },

  c: undefined,
  ctx: undefined,
  formula_text: undefined,

  animator: undefined,
  transition: undefined,
  objs: [],
  selected_objs: [],
  frames: undefined,
  menu: undefined,
  cam: undefined,
  pen: undefined,
  num_frames: 3,
  frame: 1, // current frame
  next_frame: undefined,
  rendering: false,
  presenting: false,
  debug: false,
  view_frame: false,
  fps: 30,

  // Recording
  recordingManager: undefined,

  // Volume meter
  meter: undefined,

  // speech synthesis
  speech: {
    synth: undefined,
    voices: undefined,
  },

  t_ease: 0,
  t_percent: 0,
  t_in_out: 1,

  tool: 'select',
  selecting: false,
  new_line: undefined,
  text_copied: undefined,

  keys: {
    tab: false,
    ctrl: false,
    meta: false,
    shift: false,
  },

  mouse: {
    down: false,
    pos: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
    grid: { x: 0, y: 0 },
    gridLast: { x: 0, y: 0 },
    graph: { x: 0, y: 0 },
    time: 0,
  },

  t: 0, // time for parser
  millis: 0,
};

export const math = create(all);
export const parser = math.parser();
export const date = new Date();
