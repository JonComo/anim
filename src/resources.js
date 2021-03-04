import { create, all } from 'mathjs';
import packageJson from '../package.json';
import './style.css';

export const VERSION = packageJson.version; // Version
const IS_MAC = navigator.platform.toUpperCase().includes('MAC'); // Running on macOS?

// colors
export const GRAY = '#cccccc';
export const GRID = '#eeeeee';
export const GRID_GUIDE = '#dddddd';
export const GRAPH_GUIDE = '#aaaaaa';
export const DARK = '#000000';
export const LIGHT = '#ffffff';

export const COLORS = ['#000000', '#E74C3C', '#2980B9', '#FFA400', '#66E07A', GRAY];

export const FONT = {
  SMALL: '26px Courier',
  MENU: '30px Courier',
  ANIM: IS_MAC ? '40px Menlo' : '40px Courier New',
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

  c: null,
  ctx: null,
  win_width: null,
  win_height: null,
  formula_text: null,

  animator: null,
  transition: null,
  objs: [],
  selected_objs: [],
  frames: null,
  menu: null,
  cam: null,
  pen: null,
  num_frames: 3,
  frame: 1, // current frame
  next_frame: null,
  rendering: false,
  presenting: false,
  debug: false,
  view_frame: false,

  // speech synthesis
  speech: {
    synth: null,
    voices: null,
  },

  t_ease: 0,
  t_percent: 0,
  t_in_out: 1,

  tool: 'select',
  selecting: false,
  new_line: null,
  text_copied: null,

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
parser.set('frame', rtv.frame);

export const date = new Date();
