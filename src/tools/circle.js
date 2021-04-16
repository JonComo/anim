import {
  copy,
  distance,
  formatRgb,
  interpolate,
  transformProps,
} from '../index';
import {
  math,
  rtv,
  DARK,
  GRID_SIZE,
} from '../resources';

export default function Circle(color, pos) {
  this.type = 'Circle';
  this.properties = {};
  this.properties[rtv.frame] = {
    p: pos, c: color, fill: [0, 0, 0, 0], a_s: 0, a_e: Math.PI * 2.0, w: 1, h: 1, r: 0,
  };
  this.selected = false;

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

    const newc = new Circle(null, null);
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
      Object.assign(this.properties[rtv.frame].c, rgba.slice(0, 3));
    }
  };

  this.clear_props = (f) => {
    delete this.properties[f];
  };

  this.clear_all_props = () => {
    if (!this.selected) {
      return;
    }

    Object.keys(this.properties).forEach((key) => {
      if (key !== rtv.frame) {
        delete this.properties[key];
      }
    });
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

  this.onkeydown = (evt) => {
    if (!this.selected) {
      return false;
    }

    const { key } = evt;

    if (rtv.keys.ctrl) {
      const p = this.properties[rtv.frame];
      const step = Math.PI / 12;
      if (key === 'u') {
        p.a_s += step;
      } else if (key === 'o') {
        p.a_s -= step;
      } else if (key === 'j') {
        p.a_e -= step;
      } else if (key === 'l') {
        p.a_e += step;
      }
    } else {
      this.properties[rtv.frame] = transformProps(evt, this.properties[rtv.frame]);
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

  this.draw_ellipse = (props, ctx) => {
    const { p } = props;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(props.r);
    ctx.scale(props.w, props.h);
    ctx.arc(0, 0, 20, props.a_s, props.a_e, false);
    ctx.restore();
  };

  this.generate_javascript = () => {
    const props = this.properties[rtv.frame];
    const { p } = props;
    const cp = rtv.cam.properties[rtv.frame].p;

    let js = '';

    js += 'ctx.save();\n';
    js += 'ctx.beginPath();\n';
    js += `ctx.translate(x + ${p.x - cp.x}, y + ${p.y - cp.y});\n`;
    js += `ctx.rotate(${props.r});\n`;
    js += `ctx.scale(${props.w}, ${props.h});\n`;
    js += `ctx.arc(0, 0, 20, ${props.a_s}, ${props.a_e}, false);\n`;
    js += `ctx.globalAlpha = ${props.c[3]};\n`;
    js += `ctx.strokeStyle = "${formatRgb(props.c)}";\n`;
    js += 'ctx.restore();\n';
    js += 'ctx.stroke();\n';

    return js;
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
    this.draw_ellipse(props, ctx);

    ctx.save();

    ctx.fillStyle = formatRgb(props.fill);
    ctx.globalAlpha = math.min(props.fill[3], props.c[3]);
    ctx.fill();

    ctx.globalAlpha = props.c[3];
    ctx.strokeStyle = formatRgb(props.c);

    ctx.stroke();

    ctx.restore();

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
