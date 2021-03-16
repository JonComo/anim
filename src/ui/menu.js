import {
  enter_select,
  hexToRgb,
  loadLocal,
  present,
  saveLocal,
} from '../index';
import Button from './button';
import {
  rtv,
  COLORS,
  GRID_SIZE,
  VERSION,
} from '../resources';

export default function Menu(pos) {
  this.pos = pos;
  this.buttons = [];

  this.buttons.push(new Button('select', { x: 0, y: 0 }, (() => {
    enter_select();
  })));

  this.buttons.push(new Button('text', { x: 0, y: 0 }, (() => {
    rtv.tool = 'text';
  })));

  this.buttons.push(new Button('pen', { x: 0, y: 0 }, (() => {
    if (rtv.tool !== 'pen') {
      rtv.tool = 'pen';
    } else {
      rtv.pen.clear_drawing();
    }
  })));

  this.buttons.push(new Button('split', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.split === 'function') {
        obj.split();
      }
    }
  })));

  this.buttons.push(new Button('shape', { x: 0, y: 0 }, (() => {
    rtv.tool = 'shape';
  })));

  this.buttons.push(new Button('circle', { x: 0, y: 0 }, (() => {
    rtv.tool = 'circle';
  })));

  this.buttons.push(new Button('vector', { x: 0, y: 0 }, (() => {
    rtv.tool = 'vector';
  })));

  /*
  this.buttons.push(new Button("network", {x: 0, y: 0}, function(b) {
      tool = "network";
  })); */

  this.buttons.push(new Button('delete', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      if (rtv.objs[i].is_selected()) {
        rtv.objs[i].deleted = true;
      }
    }
  })));

  this.buttons.push(new Button('del props all', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.clear_all_props === 'function') {
        obj.clear_all_props();
      }
    }
  })));

  this.buttons.push(new Button('del props before', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.del_props_before === 'function') {
        obj.del_props_before();
      }
    }
  })));

  this.buttons.push(new Button('duplicate', { x: 0, y: 0 }, (() => {
    for (let i = rtv.objs.length - 1; i >= 0; i--) {
      const obj = rtv.objs[i];
      if (typeof obj.duplicate === 'function') {
        obj.duplicate();
      }
    }
  })));

  this.buttons.push(new Button('copy frame', { x: 0, y: 0 }, (() => {
    rtv.tool = 'copy frame';
  })));

  this.buttons.push(new Button('hide', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.hide === 'function') {
        obj.hide();
      }
    }
  })));

  this.buttons.push(new Button('pres. hide', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (obj.properties && obj.is_selected()) {
        obj.properties[rtv.frame].ph = true;
      }
    }
  })));

  this.buttons.push(new Button('pres. show', { x: 0, y: 0 }, (() => {
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (obj.properties && obj.is_selected()) {
        obj.properties[rtv.frame].ph = false;
      }
    }
  })));

  this.buttons.push(new Button('camera', { x: 0, y: 0 }, (() => {
    if (rtv.tool === 'camera') {
      // reset the camera rotation
      rtv.cam.properties[rtv.frame].rxyz = [0, 0, 0];
      rtv.cam.properties[rtv.frame].p = rtv.cam.default_props.p;
    }
    rtv.tool = 'camera';
  })));

  this.buttons.push(new Button('csys', { x: 0, y: 0 }, (() => {
    const csysStyle = rtv.cam.style();

    if (csysStyle === '3d') {
      rtv.cam.set_style('flat');
      rtv.cam.properties[rtv.frame].w = 1.5;
      rtv.cam.properties[rtv.frame].h = 1.5;
      rtv.cam.rotate([-Math.PI / 2, 0, -Math.PI / 2]);
    } else if (csysStyle === 'flat') {
      rtv.cam.set_style('none');
    } else if (csysStyle === 'none') {
      rtv.cam.set_style('3d');
      rtv.cam.properties[rtv.frame].w = 1;
      rtv.cam.properties[rtv.frame].h = 1;
    }
  })));

  this.buttons.push(new Button('view xy', { x: 0, y: 0 }, (() => {
    rtv.cam.rotate([-Math.PI / 2, 0, -Math.PI / 2]);
  })));

  this.buttons.push(new Button('frame', { x: 0, y: 0 }, (() => {
    rtv.view_frame = !rtv.view_frame;
  })));

  this.buttons.push(new Button('debug', { x: 0, y: 0 }, (() => {
    rtv.debug = !rtv.debug;
  })));

  this.buttons.push(new Button('present', { x: 0, y: 0 }, (() => {
    // show a cursor
    present();
  })));

  this.buttons.push(new Button('save local', { x: 0, y: 0 }, (() => {
    // Put the object into storage
    saveLocal();
  })));

  this.buttons.push(new Button('load local', { x: 0, y: 0 }, (() => {
    loadLocal();
  })));

  this.buttons.push(new Button(`ver: ${VERSION}`, { x: 0, y: 0 }, (() => {

  })));

  for (let i = 0; i < COLORS.length; i++) {
    const b = new Button('', { x: 0, y: 0 }, (() => {
      const rgb = hexToRgb(COLORS[i]);

      rtv.pen.set_color(rgb);

      for (let j = 0; j < rtv.objs.length; j++) {
        const obj = rtv.objs[j];
        if (typeof obj.set_color === 'function') {
          obj.set_color(rgb);
        }
      }
    }));
    b.color = COLORS[i];
    this.buttons.push(b);
  }

  for (let i = 0; i < this.buttons.length; i++) {
    const b = this.buttons[i];
    b.pos = { x: this.pos.x, y: this.pos.y + i * GRID_SIZE * 0.6 };
  }

  this.mouse_up = (evt) => {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.mouse_up(evt)) {
        return true;
      }
    }

    return false;
  };

  this.render = (ctx) => {
    ctx.fillStyle = '#000000';
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      b.selected = false;
      if (b.text === rtv.tool) {
        b.selected = true;
      }
      b.render(ctx);
    }
  };
}
