import {
  copy,
  insert_frame,
  loop_frame,
  transition_with_next,
} from './index';
import Button from './ui/button';
import { rtv, GRID_SIZE } from './resources';

export default function Frames(pos) {
  this.pos = pos;
  this.size = GRID_SIZE / 2;

  this.frame_pos = (i) => {
    const size = (this.size + GRID_SIZE / 4);
    let yoffset = (i - 1) * size;
    let xoff = 0;
    const hcon = size * 30;
    while (yoffset >= hcon) {
      yoffset -= hcon;
      xoff++;
    }
    return { x: this.pos.x + xoff * GRID_SIZE * (2 / 3), y: this.pos.y + yoffset + GRID_SIZE / 2 };
  };

  this.create_buttons = () => {
    this.buttons = [];
    for (let i = 1; i <= rtv.num_frames; i++) {
      const newb = new Button(`${i}`, this.frame_pos(i), null);
      this.buttons.push(newb);
    }
    this.buttons.push(new Button('-', this.frame_pos(rtv.num_frames + 1), null));
    this.buttons.push(new Button('+', this.frame_pos(rtv.num_frames + 2), null));
  };

  this.create_buttons();

  this.mouse_down = () => {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.hovering()) {
        return true;
      }
    }

    return false;
  };

  this.mouse_up = (evt) => {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.mouse_up(evt)) {
        if (i === this.buttons.length - 2) {
          // remove frame

          // remove selected frame
          // copy properties from next frames
          // decrement number of frames
          if (rtv.num_frames === 1) {
            break;
          }

          for (let f = rtv.frame; f <= rtv.num_frames; f++) {
            for (let j = 0; j < rtv.objs.length; j++) {
              const obj = rtv.objs[j];
              if (typeof obj.copy_properties === 'function' && obj.properties[f] && obj.properties[f + 1]) {
                obj.copy_properties(f + 1, f);
              }
            }

            if (rtv.cam.properties[f] && rtv.cam.properties[f + 1]) {
              rtv.cam.properties[f] = copy(rtv.cam.properties[f + 1]);
            }
          }

          rtv.num_frames -= 1;
          this.create_buttons();
          return;
        } if (i === this.buttons.length - 1) {
          // add frame
          // copy to next from frame
          insert_frame();
          return;
        }
        this.on_click(i + 1);
      }
    }
  };

  this.onkeydown = (evt) => {
    const { key } = evt;

    if (key === 'ArrowRight') {
      if (!rtv.presenting && rtv.frame + 1 > rtv.num_frames) {
        // create a new one
        insert_frame();
      }

      transition_with_next(loop_frame(rtv.frame + 1));
      return true;
    } if (key === 'ArrowLeft') {
      transition_with_next(loop_frame(rtv.frame - 1));
      return true;
    }

    if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(Number(key)) !== -1) {
      if (!rtv.transition.transitioning) {
        transition_with_next(Number(key));
        return true;
      }

      return false;
    }

    return false;
  };

  this.render = (ctx) => {
    for (let i = 1; i <= this.buttons.length; i++) {
      const btn = this.buttons[i - 1];
      btn.selected = false;
      if (btn.text === `${rtv.frame}`) {
        btn.selected = true;
      }
      btn.render(ctx);
    }
  };
}
