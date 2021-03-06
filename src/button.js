import { rtv, FONT, GRID_SIZE } from './resources';

export default function Button(text, pos, callback) {
  this.text = text;
  this.pos = pos;
  this.callback = callback;
  this.color = '';
  this.align = 'left';
  this.selected = false;

  this.width = (text.length * GRID_SIZE) / 4;
  this.height = GRID_SIZE / 4;

  if (this.width === 0) {
    this.width = GRID_SIZE;
  }

  this.hovering = () => rtv.mouse.pos.x > this.pos.x
    && rtv.mouse.pos.x < this.pos.x + this.width
    && Math.abs(rtv.mouse.pos.y - this.pos.y) < this.height;

  this.mouse_up = () => {
    if (this.hovering()) {
      // clicked
      if (this.callback) {
        this.callback(this);
      }
      return true;
    }

    return false;
  };

  this.render = (ctx) => {
    ctx.save();

    ctx.translate(this.pos.x, this.pos.y);

    if (this.hovering() || this.selected) {
      ctx.scale(1.5, 1.5);
    }

    if (this.color.length) {
      ctx.fillStyle = this.color;
      ctx.fillRect(0, -GRID_SIZE / 8, GRID_SIZE, GRID_SIZE / 4);
    }

    ctx.textAlign = this.align;
    ctx.font = FONT.SMALL;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  };
}
