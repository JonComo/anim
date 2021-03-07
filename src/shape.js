import {
  between,
  copy,
  distance,
  guid,
  interpolate,
  rgbToHex,
  transform_props,
} from './index';
import {
  math,
  rtv,
  DARK,
  GRID_SIZE,
} from './resources';

export default function Shape(color, path) {
  this.type = 'Shape';
  this.guid = guid();
  this.properties = {};
  this.properties[rtv.frame] = {
    c: color, path, v: false, w: 1, h: 1, r: 0,
  };

  this.selected_indices = [];

  this.duplicate = () => {
    if (this.selected_indices.length === 0) {
      return;
    }

    const newc = new Shape(null, null);
    newc.properties[rtv.frame] = copy(this.properties[rtv.frame]);
    // select all indices for next one
    for (let i = 0; i < newc.properties[rtv.frame].path.length; i++) {
      newc.selected_indices.push(i);
    }

    this.selected_indices = [];
    rtv.objs.push(newc);
  };

  this.hidden = () => {
    if (!this.properties[rtv.frame]) {
      return true;
    }

    return this.properties[rtv.frame].c[3] === 0;
  };

  this.copy_properties = (f, n) => {
    this.properties[n] = copy(this.properties[f]);
  };

  this.hide = () => {
    if (this.selected_indices.length !== 0) {
      if (this.properties[rtv.frame].c[3] === 1) {
        this.properties[rtv.frame].c[3] = 0;
      } else {
        this.properties[rtv.frame].c[3] = 1;
      }
      this.selected_indices = [];
    }
  };

  this.select = () => {
    this.selected_indices = [];
    for (let i = 0; i < this.properties[rtv.frame].path.length; i++) {
      this.selected_indices.push(i);
    }
  };

  this.is_selected = () => this.selected_indices.length > 0;

  this.set_color = (rgba) => {
    if (this.selected_indices.length !== 0) {
      Object.assign(this.properties[rtv.frame].c, rgba.slice(0, 3));
    }
  };

  this.clear_props = (f) => {
    delete this.properties[f];
  };

  this.clear_all_props = () => {
    if (this.selected_indices.length === 0) {
      return;
    }

    Object.keys(this.properties).forEach((key) => {
      if (key !== rtv.frame) {
        delete this.properties[key];
      }
    });
  };

  this.del_props_before = () => {
    if (this.selected_indices.length === 0) {
      return;
    }

    if (this.properties && this.properties[rtv.frame - 1]) {
      delete this.properties[rtv.frame - 1];
    }
  };

  this.add_point = (p) => {
    const props = this.properties[rtv.frame];
    const { path: framePath } = props;
    framePath.push(p);
  };

  this.closest_point_idx = () => {
    const props = this.properties[rtv.frame];
    const { path: framePath } = props;
    for (let i = 0; i < framePath.length; i++) {
      const p = framePath[i];

      if (distance(p, rtv.mouse.pos) < GRID_SIZE / 8) {
        return i;
      }
    }

    return -1;
  };

  this.in_rect = (x, y, x2, y2) => {
    if (this.hidden()) {
      return false;
    }

    // select individual points
    const props = this.properties[rtv.frame];

    const { path: framePath } = props;
    this.selected_indices = [];
    let found = false;

    for (let i = 0; i < framePath.length; i++) {
      const p = framePath[i];

      if (p.x > x && p.x < x2 && p.y > y && p.y < y2) {
        this.selected_indices.push(i);
        found = true;
      }
    }

    return found;
  };

  this.onkeydown = (evt) => {
    const { key } = evt;

    if (this.selected_indices.length !== 0) {
      this.properties[rtv.frame] = transform_props(key, this.properties[rtv.frame]);
    }

    return false;
  };

  this.mouse_down = () => {
    if (this.hidden()) {
      return false;
    }

    // try to selected one
    const idx = this.closest_point_idx();
    if (idx !== -1) {
      this.selected_indices = [idx];
      return true;
    }

    return false;
  };

  this.mouse_drag = () => {
    if (this.selected_indices.length > 0) {
      const props = this.properties[rtv.frame];
      const { path: framePath } = props;

      if (rtv.tool === 'select') {
        // move all
        const offset = {
          x: rtv.mouse.grid.x - rtv.mouse.gridLast.x,
          y: rtv.mouse.grid.y - rtv.mouse.gridLast.y,
        };
        for (let i = 0; i < this.selected_indices.length; i++) {
          const idx = this.selected_indices[i];
          const p = framePath[idx];
          framePath[idx] = { x: p.x + offset.x, y: p.y + offset.y };
        }
      }
    }
  };

  this.mouse_up = () => {
    if (!rtv.keys.shift) {
      this.selected_indices = [];
    }
  };

  this.bezier = (points, off, t) => {
    let x = points[0].x - off.x;
    let y = points[0].y - off.y;
    let c = 0;
    const N = points.length;
    for (let i = 0; i < N; i++) {
      c = math.factorial(N) / (math.factorial(N - i) * math.factorial(i));

      c *= math.pow(1 - t, N - i) * math.pow(t, i);

      x += c * (points[i].x - off.x);
      y += c * (points[i].y - off.y);
    }

    return [x, y];
  };

  this.draw_path = (props) => {
    const { path: framePath } = props;
    const c = { x: 0, y: 0 };

    for (let i = 0; i < framePath.length; i++) {
      c.x += framePath[i].x;
      c.y += framePath[i].y;
    }

    c.x /= framePath.length;
    c.y /= framePath.length;

    rtv.ctx.translate(c.x, c.y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);

    const idx = this.closest_point_idx();

    const hidden = this.hidden();

    for (let i = 0; i < framePath.length; i++) {
      const p = framePath[i];

      if (i === 0) {
        rtv.ctx.moveTo(p.x - c.x, p.y - c.y);
      } else {
        rtv.ctx.lineTo(p.x - c.x, p.y - c.y);
      }

      // show selected indices
      if (!rtv.presenting && !hidden && (this.selected_indices.indexOf(i) !== -1 || i === idx)) {
        rtv.ctx.strokeStyle = DARK;
        rtv.ctx.strokeRect(
          p.x - c.x - GRID_SIZE / 2,
          p.y - c.y - GRID_SIZE / 2,
          GRID_SIZE,
          GRID_SIZE,
        );
      }
    }

    if (this.selected_indices.length > 0) {
      // render side lengths while dragging
      for (let i = 0; i < framePath.length - 1; i++) {
        const p1 = framePath[i];
        const p2 = framePath[i + 1];
        const b = between(p1, p2);
        let d = distance(p1, p2) / GRID_SIZE;
        d = Math.round(d * 10) / 10;
        rtv.ctx.fillText(d, b.x - c.x, b.y - c.y);
      }
    }

    if (this.properties[rtv.frame].v && framePath.length >= 2) {
      // vector
      const b = framePath[framePath.length - 2];
      const a = framePath[framePath.length - 1];

      const theta = Math.atan2(a.y - b.y, a.x - b.x);
      rtv.ctx.moveTo(a.x - c.x, a.y - c.y);
      rtv.ctx.lineTo(
        a.x - c.x + Math.cos(theta - Math.PI * (3 / 4)) * (GRID_SIZE / 2),
        a.y - c.y + Math.sin(theta - Math.PI * (3 / 4)) * (GRID_SIZE / 2),
      );
      rtv.ctx.moveTo(a.x - c.x, a.y - c.y);
      rtv.ctx.lineTo(
        a.x - c.x + Math.cos(theta + Math.PI * (3 / 4)) * (GRID_SIZE / 2),
        a.y - c.y + Math.sin(theta + Math.PI * (3 / 4)) * (GRID_SIZE / 2),
      );
    }
  };

  this.generate_javascript = () => {
    const cp = rtv.cam.properties[rtv.frame].p;

    const props = this.properties[rtv.frame];
    const { path: framePath } = props;
    const c = { x: 0, y: 0 };

    for (let i = 0; i < framePath.length; i++) {
      c.x += framePath[i].x;
      c.y += framePath[i].y;
    }

    c.x /= framePath.length;
    c.y /= framePath.length;

    let js = '';
    js += 'ctx.save();\n';
    js += `ctx.globalAlpha = ${props.c[3]};\n`;
    js += `ctx.strokeStyle = "${rgbToHex(props.c)}";\n`;
    js += `ctx.translate(x + ${c.x - cp.x}, y + ${c.y - cp.y});\n`;
    js += `ctx.rotate(${props.r});\n`;
    js += `ctx.scale(${props.w}, ${props.h});\n`;
    js += 'ctx.beginPath();\n';

    for (let i = 0; i < framePath.length; i++) {
      const p = framePath[i];

      if (i === 0) {
        js += `ctx.moveTo(${p.x - c.x}, ${p.y - c.y});\n`;
      } else {
        js += `ctx.lineTo(${p.x - c.x}, ${p.y - c.y});\n`;
      }
    }

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

    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = props.c[3];
    ctx.strokeStyle = rgbToHex(props.c);
    this.draw_path(props);
    ctx.stroke();
    ctx.restore();
  };
}
