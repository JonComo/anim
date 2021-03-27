import {
  copy,
  distance,
  interpolate,
} from '../index';
import {
  math,
  rtv,
  DARK,
  GRID_SIZE,
} from '../resources';

export default function Network(position) {
  this.type = 'Network';
  this.properties = {};
  this.properties[rtv.frame] = {
    layers: [2, 3, 2], p: position, c: [0, 0, 0, 1], w: 1, h: 1, r: 0,
  };

  // ephemeral
  this.new = true; // loaded or just created
  this.selected = false;
  this.dragged = false;

  this.select = () => {
    this.selected = true;
  };

  this.is_selected = () => this.selected;

  this.hidden = () => {
    if (!this.properties[rtv.frame]) {
      return true;
    }

    return this.properties[rtv.frame].c[3] === 0;
  };

  this.copy_properties = (f, n) => {
    this.properties[n] = copy(this.properties[f]);
  };

  this.duplicate = () => {
    if (!this.selected) {
      return;
    }

    const newc = new Network(null);
    newc.properties[rtv.frame] = copy(this.properties[rtv.frame]);
    newc.selected = true;
    this.selected = false;
    rtv.objs.push(newc);
  };

  this.hide = () => {
    if (this.selected) {
      if (this.properties[rtv.frame].c[3] === 1) {
        this.properties[rtv.frame].c[3] = 0;
      } else {
        this.properties[rtv.frame].c[3] = 1;
      }
      this.selected = false;
    }
  };

  this.set_color = (rgba) => {
    if (this.selected) {
      Object.assign(this.properties[rtv.frame].c, rgba.splice(0, 3));
    }
  };

  this.clear_props = (f) => {
    delete this.properties[f];
  };

  this.clear_all_props = () => {
    if (this.selected) {
      Object.keys(this.properties).forEach((key) => {
        if (key !== rtv.frame) {
          delete this.properties[key];
        }
      });
    }
  };

  this.del_props_before = () => {
    if (!this.selected) {
      return;
    }

    if (this.properties && this.properties[rtv.frame - 1]) {
      delete this.properties[rtv.frame - 1];
    }
  };

  this.near_mouse = () => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return false;
    }

    return distance(props.p, rtv.mouse.pos) < GRID_SIZE / 2;
  };

  this.in_rect = (x, y, x2, y2) => {
    if (this.hidden()) {
      return false;
    }

    const props = this.properties[rtv.frame];
    const { p } = props;

    if (p.x > x && p.x < x2 && p.y > y && p.y < y2) {
      this.selected = true;
      return true;
    }

    return false;
  };

  this.mouse_down = () => {
    if (this.hidden()) {
      return false;
    }

    // try to selected one
    if (this.near_mouse()) {
      this.selected = true;
      return true;
    }

    return false;
  };

  this.mouse_drag = () => {
    if (this.selected && rtv.tool === 'select') {
      // move
      const props = this.properties[rtv.frame];
      const offset = {
        x: rtv.mouse.grid.x - rtv.mouse.gridLast.x,
        y: rtv.mouse.grid.y - rtv.mouse.gridLast.y,
      };
      const { p } = props;
      this.properties[rtv.frame].p = { x: p.x + offset.x, y: p.y + offset.y };
    }
  };

  this.mouse_up = () => {
    if (!rtv.keys.shift) {
      this.selected = false;
    }
  };

  this.draw_network = (props, ctx) => {
    const { p: netPos } = props;
    ctx.save();
    ctx.translate(netPos.x, netPos.y);
    ctx.rotate(props.r);
    ctx.scale(props.w, props.h);

    const { layers } = props;

    const pad = 120;

    const pos = [0, 0];

    const radius = 14;

    const loc = (i, j, units) => {
      const pad2 = 250;
      // return [pos[0] - pad2/2 - j*(pad2+80), pos[1] + pad2/2 - pad2 * units/2 + i*pad2];
      return [pos[0] - pad2 * units / 2 + pad2 / 2 + i * pad2, -pad + pos[1] - j * pad2];
    };

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

          ctx.strokeStyle = 'black';

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
              ctx.strokeStyle = 'green';
              highConn = [i, k, j]; // unit i to unit k in layer j
              highNeur = [[i, j], [k, j + 1]];
            }
          }

          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = 'white';

    // neurons
    for (let j = 0; j < layers.length; j++) {
      const units = layers[j];

      for (let i = 0; i < units; i++) {
        const p = loc(i, j, units);

        ctx.strokeStyle = 'black';

        // if we have a highlighted connection and we're in the right layer
        if (highConn.length !== 0) {
          if (highConn[2] === j) {
            if (highConn[0] === i) {
              if (j === 0) {
                ctx.strokeStyle = 'blue';
              } else {
                ctx.strokeStyle = 'red';
              }
            }
          } else if (highConn[2] === j - 1) {
            if (highConn[1] === i) {
              if (j === 0) {
                ctx.strokeStyle = 'blue';
              } else {
                ctx.strokeStyle = 'red';
              }
            }
          }
        } else {
          const dx = rtv.mouse.pos.x - p[0];
          const dy = rtv.mouse.pos.y - p[1];

          if (dx * dx + dy * dy < 400) {
            if (j === 0) {
              ctx.strokeStyle = 'blue';
            } else {
              ctx.strokeStyle = 'red';
            }

            highNeur = [[i, j]];
          }
        }

        ctx.beginPath();
        ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  this.render = (ctx) => {
    const a = this.properties[rtv.frame];
    const b = this.properties[rtv.next_frame];

    if (!a) {
      return;
    }

    let props;
    if (rtv.transition.transitioning) {
      props = interpolate(a, b);
    } else {
      props = a;
    }

    ctx.beginPath();
    this.draw_network(props, ctx);

    if (!rtv.presenting && props.c[3] !== 0 && (this.selected || this.near_mouse())) {
      ctx.beginPath();
      ctx.strokeStyle = DARK;
      ctx.strokeRect(
        props.p.x - GRID_SIZE / 4,
        props.p.y - GRID_SIZE / 4,
        GRID_SIZE / 2,
        GRID_SIZE / 2,
      );
      ctx.stroke();
    }
  };
}
