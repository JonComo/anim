import { formatRgb } from '../index';
import { math, rtv } from '../resources';

export default function Pen() {
  this.drawings = {};
  this.path = [];
  this.path_nearby_idx = -1;

  this.onkeydown = (evt) => {
    if (rtv.tool === 'pen' && evt.key === 'Esc') {
      rtv.tool = 'select';
    } else if (evt.key === 'p') {
      if (rtv.tool === 'pen') {
        this.clear_drawing();
      }

      rtv.tool = 'pen';
    }

    if (rtv.tool === 'pen' && evt.key === 'Backspace') {
      // delete path nearby mouse
      if (this.path_nearby_idx !== -1) {
        this.drawings[rtv.frame].splice(this.path_nearby_idx, 1);
      }
    }
  };

  this.mouse_down = () => {
    if (rtv.tool === 'pen') {
      this.path = [];
      return true;
    }

    return false;
  };

  this.mouse_move = () => {
    if (rtv.tool === 'pen') {
      this.path_nearby_idx = -1;

      if (rtv.mouse.down) {
        this.path.push([rtv.mouse.pos.x, rtv.mouse.pos.y]);
      }

      const drawing = this.drawings[rtv.frame];
      if (drawing) {
        for (let i = 0; i < drawing.length; i++) {
          const path = drawing[i].p;

          const x = path[0][0];
          const y = path[0][1];

          const xd = rtv.mouse.pos.x - x;
          const yd = rtv.mouse.pos.y - y;

          if (xd * xd + yd * yd < 200) {
            this.path_nearby_idx = i;
          }
        }
      }

      return true;
    }

    return false;
  };

  this.mouse_up = () => {
    if (rtv.tool === 'pen') {
      // add path to drawing
      if (this.path && this.path.length) {
        if (!this.drawings[rtv.frame]) {
          this.drawings[rtv.frame] = [];
        }

        this.drawings[rtv.frame].push({ p: this.path, c: this.color });
        this.path = [];
      }

      return true;
    }

    return false;
  };

  this.set_color = (rgb) => {
    if (rtv.tool === 'pen') {
      this.color = formatRgb(rgb);
      return true;
    }

    return false;
  };

  this.clear_drawing = () => {
    if (this.drawings[rtv.frame]) {
      delete this.drawings[rtv.frame];
    }

    this.path = [];
  };

  this.render = () => {
    rtv.ctx.save();

    const drawPath = (_path) => {
      rtv.ctx.beginPath();
      const path = _path.p;
      const { c } = _path;

      rtv.ctx.strokeStyle = c;

      for (let j = 0; j < path.length; j++) {
        const x = path[j][0];
        const y = path[j][1];

        if (j === 0) {
          rtv.ctx.moveTo(x, y);
        } else {
          rtv.ctx.lineTo(x, y);
        }
      }

      rtv.ctx.stroke();
    };

    let frameToDraw = rtv.frame;

    if (rtv.transition.transitioning) {
      // fade in out
      rtv.ctx.globalAlpha = -math.cos(rtv.t_percent * 2 * math.PI - math.PI) / 2 + 0.5;
      if (rtv.t_percent > 0.5) {
        frameToDraw = rtv.next_frame;
      }

      if (!this.drawings[rtv.next_frame]) {
        // fade out
        rtv.ctx.globalAlpha = 1 - rtv.t_percent;
        frameToDraw = rtv.frame;
      }
    }

    if (this.drawings[frameToDraw]) {
      // draw the drawing
      for (let i = 0; i < this.drawings[frameToDraw].length; i++) {
        const path = this.drawings[frameToDraw][i];

        if (!rtv.presenting) {
          rtv.ctx.globalAlpha = 1;
          if (this.path_nearby_idx === i) {
            rtv.ctx.globalAlpha = 0.5;
          }
        }

        drawPath(path);
      }
    }

    if (this.path && this.path.length) {
      drawPath({ p: this.path, c: this.color });
    }

    /*
      if (!presenting) {
          // onion skin
          ctx.globalAlpha = .5;
          if (frame > 1) {
              if (this.drawings[frame-1]) {
                  // draw the drawing
                  for (let i = 0; i < this.drawings[frame-1].length; i ++) {
                      let path = this.drawings[frame-1][i];
                      draw_path(path);
                  }
              }
          }
      } */

    rtv.ctx.restore();
  };
}
