import {
  copy,
  interpolate,
  rotation_matrix,
  transform_props,
} from './index';
import { math, rtv, GRID_SIZE } from './resources';

export default function Camera() {
  this.default_props = {
    p: { x: rtv.c.width / 2, y: rtv.c.height / 2 }, w: 1, h: 1, rxyz: [0, 0, 0], style: '3d',
  };
  this.properties = {};
  this.properties[rtv.frame] = copy(this.default_props);
  this.dragging_rotate = false;

  function generateTicks() {
    const ticks = [];

    const R = math.range(-10, 11, 1);
    const N = R.size()[0];
    const m = [];
    const tickSize = 10;

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < N; j++) {
        const t = R._data[j];
        if (i === 0) {
          m.push([t, -tickSize, 0]);
          m.push([t, tickSize, 0]);
        } else if (i === 1) {
          // y axis
          m.push([-tickSize, t, 0]);
          m.push([tickSize, t, 0]);
        } else if (i === 2) {
          // z axis
          m.push([-tickSize, 0, t]);
          m.push([tickSize, 0, t]);
        }
      }

      ticks.push(m);
    }

    return ticks;
  }

  this.ticks = generateTicks();

  this.style = () => {
    const props = this.properties[rtv.frame];
    if (props) {
      return props.style;
    }

    return null;
  };

  this.set_style = (style) => {
    const props = this.properties[rtv.frame];
    if (props) {
      props.style = style;
      return true;
    }

    return false;
  };

  this.mouse_down = () => {
    if (rtv.keys.meta || rtv.keys.ctrl) {
      const props = this.properties[rtv.frame];
      if (!props) {
        return false;
      }

      const dx = rtv.mouse.pos.x - props.p.x;
      const dy = rtv.mouse.pos.y - props.p.y;

      const dist = dx * dx + dy * dy;
      this.dragging_rotate = dist > 100000;

      return true;
    }

    return false;
  };

  this.mouse_drag = () => {
    if (rtv.tool !== 'camera') {
      return;
    }

    const props = this.properties[rtv.frame];

    if (rtv.keys.meta || rtv.keys.ctrl) {
      // rotate
      let r = props.rxyz;

      if (!this.dragging_rotate) {
        const a = r[1] - (rtv.mouse.pos.y - rtv.mouse.last.y) / 100;
        const b = r[2] - (rtv.mouse.pos.x - rtv.mouse.last.x) / 100;
        r = [r[0], a, b];
      } else {
        const angle = math.atan2(rtv.mouse.pos.y - props.p.y, rtv.mouse.pos.x - props.p.x);
        const angle2 = math.atan2(rtv.mouse.last.y - props.p.y, rtv.mouse.last.x - props.p.x);
        let c = (angle - angle2);

        if (Math.abs(c) > 1) {
          c = 0;
        }

        c += r[0];

        r = [c, r[1], r[2]];
      }

      this.rotate(r);
    } else {
      // translate
      const { p } = props;
      const offset = {
        x: rtv.mouse.grid.x - rtv.mouse.gridLast.x,
        y: rtv.mouse.grid.y - rtv.mouse.gridLast.y,
      };
      props.p = { x: p.x + offset.x, y: p.y + offset.y };
    }
  };

  this.rotate = (rxyz) => {
    const props = this.properties[rtv.frame];
    if (props) {
      props.rxyz = rxyz;
    }
  };

  this.onkeydown = (evt) => {
    if (rtv.tool !== 'camera') {
      return;
    }

    const { key } = evt;
    this.properties[rtv.frame] = transform_props(key, this.properties[rtv.frame], 0.01);
  };

  this.update_props = () => {
    const a = this.properties[rtv.frame];
    const b = this.properties[rtv.next_frame];

    if (!a) {
      this.properties[rtv.frame] = copy(this.default_props);
      this.props = this.properties[rtv.frame];
      return;
    }

    if (a && !b) {
      this.properties[rtv.next_frame] = copy(a);
      this.props = a;
      return;
    }

    if (rtv.transition.transitioning) {
      this.props = interpolate(a, b);
    } else {
      this.props = a;
    }

    if (!this.props.rxyz) {
      this.props.rxyz = [0, 0, 0];
    }

    const rx = this.props.rxyz[0];
    const ry = this.props.rxyz[1];
    const rz = this.props.rxyz[2];

    this.R = rotation_matrix(rx, ry, rz);
  };

  // takes array [x, y, z]
  // returns [x, y, z] projected to screen (render using first two coords)
  this.graph_to_screen = (x, y, z) => this.graph_to_screen_mat(math.matrix([[x, y, z]]))[0];

  this.graph_to_screen_mat = (point) => {
    // n x ?
    let p = point;
    const size = p.size();
    const n = size[0];
    const d = size[1];

    if (d === 2) {
      // 2d
      // append zeros for zs
      p = p.resize([n, 3]);
    }

    p = math.multiply(p, this.R);
    p = p._data;

    let x; let y; let z;
    for (let i = 0; i < n; i++) {
      [z, x, y] = p[i];

      /*
          m = z/20+1;
          if (m < 0) {
              m = 1;
          } */

      p[i][0] = x * this.props.w * GRID_SIZE + this.props.p.x;
      p[i][1] = -y * this.props.h * GRID_SIZE + this.props.p.y;
      p[i][2] = z;
    }

    return p;
  };

  this.screen_to_graph = (p) => ({
    x: (p.x - this.props.p.x) / (GRID_SIZE * this.props.w),
    y: -(p.y - this.props.p.y) / (GRID_SIZE * this.props.h),
  });

  this.update_props();
}
