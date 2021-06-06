import {
  constrain,
  copy,
  distance,
  drawFn,
  drawNetwork,
  drawSimple,
  enterSelect,
  formatRgb,
  interpolate,
  roundWithKey,
  saveState,
  transformProps,
} from '../index';
import MatrixOutput from '../graphics/matrix-output';
import {
  math,
  parser,
  rtv,
  BORDER_OPACITY,
  BRACKETS,
  BRACKET_COLOR,
  CHAR,
  GRID_SIZE,
  MAT_NUM_WIDTH,
  PI2,
} from '../resources';

function getSortedTexts() {
  const texts = rtv.objs.filter((o) => o.type === 'Text');

  texts.sort((a, b) => {
    const ap = a.properties[rtv.frame].p;
    const bp = b.properties[rtv.frame].p;
    return ap.y > bp.y;
  });

  return texts;
}

export default function Text(text, pos) {
  this.type = 'Text';
  this.properties = {};
  this.properties[rtv.frame] = {
    t: text,
    p: pos,
    c: [0, 0, 0, 1],
    w: 1,
    h: 1,
    r: 0,
    e: undefined,
  };

  // ephemeral
  this.new = true; // loaded or just created
  this.selected = false;
  this.dragged = false;
  this.cursor = 0;
  this.cursor_selection = 0;
  this.command = '';
  this.args = [];
  this.pArgs = []; // Parsed arguments
  this.text_val = '';
  this.matrix_vals = [];
  this.near_mouse = false;
  this.size = { w: 0, h: 0 }; // pixel width and height
  this.image = null;
  this.dirty = false;
  this.requirements = {};

  this.select = () => {
    this.selected = true;
    rtv.formula_text.value = this.properties[rtv.frame].t;
  };

  this.is_selected = () => this.selected;

  this.selection_indices = () => {
    const s = Math.min(this.cursor, this.cursor_selection);
    const e = Math.max(this.cursor, this.cursor_selection);
    return { s, e };
  };

  this.text_selected = () => {
    if (!this.is_text_selected()) {
      return;
    }

    const props = this.properties[rtv.frame];
    if (!props) {
      return;
    }

    const s = this.selection_indices();
    return props.t.slice(s.s, s.e);
  };

  this.is_text_selected = () => this.cursor !== this.cursor_selection;

  this.replace_selected_text = (replace) => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return;
    }

    const { t } = props;
    const s = this.selection_indices();
    const newText = t.slice(0, s.s) + replace + t.slice(s.e, t.length);

    this.cursor = s.s + replace.length;
    this.cursor_selection = this.cursor;

    return newText;
  };

  this.paste_text = (copiedText) => {
    if (this.is_text_selected()) {
      // wipe out some text in between
      this.change_text(this.replace_selected_text(copiedText));
    } else {
      const { t } = this.properties[rtv.frame];
      this.properties[rtv.frame].t = t.slice(0, this.cursor)
        + copiedText
        + t.slice(this.cursor, t.length);
      this.cursor += copiedText.length;
      this.cursor_selection = this.cursor;
    }
  };

  this.constrain_cursors = () => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return;
    }
    const { t } = props;
    this.cursor = Math.max(0, Math.min(this.cursor, t.length));
    this.cursor_selection = Math.max(
      0,
      Math.min(this.cursor_selection, t.length),
    );
  };

  this.char_index_at_x = (x) => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return 0;
    }

    const idx = Math.round((x - props.p.x) / CHAR.SIZE);
    return Math.max(0, Math.min(idx, props.t.length));
  };

  this.duplicate = () => {
    if (!this.selected) {
      return;
    }

    const newc = new Text(this.text, null);
    newc.properties[rtv.frame] = copy(this.properties[rtv.frame]);
    newc.selected = true;
    this.selected = false;
    rtv.objs.push(newc);
  };

  this.copy_properties = (f, n) => {
    this.properties[n] = copy(this.properties[f]);
  };

  this.set_color = (rgba) => {
    if (this.selected) {
      Object.assign(this.properties[rtv.frame].c, rgba.slice(0, 3));
    }
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

  this.hidden = () => {
    if (!this.properties[rtv.frame]) {
      return true;
    }

    if (rtv.transition.transitioning) {
      return (
        this.properties[rtv.frame].c[3] === 0
        && this.properties[rtv.next_frame].c[3] === 0
      );
    }

    return this.properties[rtv.frame].c[3] === 0;
  };

  this.in_rect = (x, y, x2, y2) => {
    if (this.hidden()) {
      return false;
    }

    const props = this.properties[rtv.frame];
    let p;
    if (props.ge) {
      p = {
        x: props.p.x + rtv.cam.props.p.x,
        y: props.p.y + rtv.cam.props.p.y,
      };
    } else {
      p = props.p;
    }

    if (p.x > x && p.y > y && p.x < x2 && p.y < y2) {
      this.select();
      return true;
    }

    return false;
  };

  this.split = () => {
    if (!this.is_selected()) {
      return;
    }

    const { t } = this.properties[rtv.frame];

    if (t.includes('visnet')) {
      // very hacky but it works.. :-)

      const { p } = this.properties[rtv.frame];

      const l = math.evaluate(t.substring(t.indexOf('['), t.indexOf(']') + 1));

      drawNetwork(l._data, [p.x, p.y]);

      // hide
      this.properties[rtv.frame].c[3] = 0;
      this.selected = false;

      return;
    }

    // for each character, make it it's own text obj
    if (!t) {
      return;
    }

    const { p } = this.properties[rtv.frame];

    // if its a matrix split that up too
    if (this.matrix_vals.length !== 0) {
      // create a bunch of matrix numbers

      const pad = 24;

      const newTextbox = (initialText, i, j) => {
        const newT = new Text(roundWithKey(initialText).toString(), {
          x: p.x + j * (MAT_NUM_WIDTH + pad) + 110,
          y: p.y + i * GRID_SIZE,
        });
        rtv.objs.push(newT);
      };

      for (let i = 0; i < this.matrix_vals.length; i++) {
        if (this.matrix_vals[i] instanceof Array) {
          for (let j = 0; j < this.matrix_vals[i].length; j++) {
            newTextbox(this.matrix_vals[i][j], i, j);
          }
        } else {
          newTextbox(this.matrix_vals[i], i, 0);
        }
      }

      return;
    }

    const N = t.length;
    let xoff = 0;
    for (let i = 0; i < N; i++) {
      const c = t[i];
      if (c === ' ') {
        xoff += GRID_SIZE / 2;
      } else {
        const newT = new Text(c, { x: p.x + xoff, y: p.y });
        rtv.objs.push(newT);
        xoff += GRID_SIZE / 2;
      }
    }

    this.deleted = true;
  };

  this.onkeydown = (evt) => {
    if (!this.selected) {
      return false;
    }

    const { key } = evt;
    let { t } = this.properties[rtv.frame];

    if (rtv.keys.meta || rtv.keys.ctrl) {
      if (this.is_selected()) {
        const copyText = () => {
          // copy
          rtv.text_copied = this.text_selected();

          // hacky but works
          const el = document.createElement('textarea');
          el.value = this.text_selected();
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        };

        if (key === 'c') {
          copyText();

          return true;
        }
        if (key === 'x') {
          copyText();
          this.change_text(this.replace_selected_text(''));

          return true;
        }
        if (key === 'v') {
          // paste, let event take over
          return false;
        }
        if (key === 'a') {
          // select all
          this.cursor = this.properties[rtv.frame].t.length;
          this.cursor_selection = 0;
          return true;
        }
      }

      this.properties[rtv.frame] = transformProps(evt, this.properties[rtv.frame]);

      return true;
    }

    if (rtv.keys.tab) {
      // auto complete
      const fn = t.split(/[^A-Za-z]/).pop();

      if (fn.length !== 0) {
        const keys = Object.keys(math);

        for (let i = 0; i < keys.length; i++) {
          const funcName = keys[i];

          if (funcName.startsWith(fn)) {
            let newText = t.split(fn)[0] + keys[i];
            if (`${math[funcName]}`.split('\n')[0].includes('(')) {
              newText += '(';
            }

            this.change_text(newText);
            this.cursor = newText.length;
            this.cursor_selection = this.cursor;
            break;
          }
        }
      }

      return true;
    }

    if (key === 'Escape') {
      this.selected = false;
      return false;
    }

    if (key === 'Enter') {
      this.selected = false;
      this.parse_text();
      this.eval();
      if (rtv.keys.shift) {
        // create a new text below this one
        const { p } = this.properties[rtv.frame];
        const newT = new Text('', { x: p.x, y: p.y + CHAR.SIZE * 2 });
        rtv.objs.push(newT);
        newT.select();
        saveState();
      } else {
        enterSelect();
      }

      return false;
    }

    if (!rtv.keys.shift && this.is_text_selected()) {
      const s = this.selection_indices();
      if (key === 'ArrowRight') {
        this.cursor = s.e;
      } else if (key === 'ArrowLeft') {
        this.cursor = s.s;
      }
    } else if (key === 'ArrowRight') {
      this.cursor += 1;
      this.constrain_cursors();
    } else if (key === 'ArrowLeft') {
      this.cursor -= 1;
      this.constrain_cursors();
    }

    if (key === 'Home') {
      this.cursor = 0;
    } else if (key === 'End') {
      this.cursor = this.properties[rtv.frame].t.length;
    }

    if (key === 'ArrowUp') {
      // Find textbox above
      const texts = getSortedTexts();

      const i = texts.indexOf(this);
      if (i !== 0) {
        texts[i - 1].selected = true;
        this.selected = false;
      }

      return true;
    }

    if (key === 'ArrowDown') {
      // Find textbox below
      const texts = getSortedTexts();

      const i = texts.indexOf(this);
      if (i !== texts.length - 1) {
        texts[i + 1].selected = true;
        this.selected = false;
      }

      return true;
    }

    if (key === 'PageUp') {
      // Find highest textbox
      const texts = getSortedTexts();

      const first = texts[0];
      if (this !== first) {
        first.selected = true;
        this.selected = false;
      }

      return true;
    }

    if (key === 'PageDown') {
      // Find lowest textbox
      const texts = getSortedTexts();

      const last = texts[texts.length - 1];
      if (this !== last) {
        last.selected = true;
        this.selected = false;
      }

      return true;
    }

    if (key === 'Backspace') {
      if (!this.is_text_selected()) {
        this.cursor_selection = this.cursor - 1;
        this.constrain_cursors();
        t = this.replace_selected_text('');
      } else {
        t = this.replace_selected_text('');
      }
    } else if (key === 'Delete') {
      if (!this.is_text_selected()) {
        this.cursor_selection = this.cursor + 1;
        this.constrain_cursors();
        t = this.replace_selected_text('');
      } else {
        t = this.replace_selected_text('');
      }
    } else if (key.length === 1) {
      // type character
      if (this.is_text_selected()) {
        t = this.replace_selected_text(key);
      } else {
        t = t.slice(0, this.cursor)
          + key
          + t.slice(this.cursor, t.length);
        this.cursor += 1;
      }
    }

    if (!rtv.keys.shift || (key !== 'Shift' && key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End')) {
      this.cursor_selection = this.cursor;
    }

    this.change_text(t);

    return true;
  };

  this.eval = () => {
    if ((!rtv.presenting && this.is_selected()) || this.hidden()) {
      return;
    }

    this.dirty = true;
    this.text_val = '';
    this.matrix_vals = [];

    if (this.new) {
      this.new = false;
      this.parse_text();
    }

    if (!this.pArgs[0]) {
      return;
    }

    rtv.ctx.save();

    const a = this.properties[rtv.frame];
    const b = this.properties[rtv.next_frame];

    let i;
    if (rtv.transition.transitioning) {
      i = interpolate(a, b);
    } else {
      i = a;
    }

    const color = formatRgb(i.c);

    rtv.ctx.strokeStyle = color;
    rtv.ctx.fillStyle = color;
    rtv.ctx.globalAlpha = i.c[3];

    if (rtv.transition.transitioning) {
      if (a.t !== b.t) {
        // text is diff, cross fade result
        // ctx.globalAlpha = -math.cos(t_percent*2*math.PI-math.PI)/2 + .5;
        /*
              if (t_percent > .5) {
                  this.parse_text(this.properties[next_frame].t);
              } */
      }
    }

    try {
      Text.setVariable('text_props', i);

      const val = this.pArgs[0].evaluate(parser.scope);

      // only display the value if its not an assignment or constant
      const opType = this.pArgs[0].type;

      if (!opType.includes('Assignment') && opType !== 'ConstantNode') {
        const type = typeof val;

        // set display text
        if (type === 'number') {
          if (rtv.keys.ctrl) {
            // nothing
            this.text_val = `=${val}`;
          } else {
            this.text_val = `=${roundWithKey(val)}`;
          }
        } else if (type === 'boolean') {
          this.text_val = ` = ${val}`;
        } else if (type === 'object' && val._data && val._data.length !== 0) {
          // prob a matrix, render entries
          this.matrix_vals = val._data;
          this.text_val = null;
        } else if (val && 're' in val && val.im) {
          if (val) {
            if (rtv.keys.ctrl) {
              // nothing
              this.text_val = `=${val}`;
            } else {
              this.text_val = `=${roundWithKey(
                val.re,
              ).toString()} + ${roundWithKey(val.im)}i`;
            }
          }
        } else if (val) {
          this.text_val = `=${val.toString()}`;
        }
      }

      this.fulfillments.forEach(Text.dispatchAssignment);
    } catch (e) {
      const trimmedStack = e.stack.substring(0,
        e.stack.search(/(at Text.eval \(|^Text\/this.eval@)/m));
      const lastError = this.properties[rtv.frame].e;

      if (
        lastError === undefined
        || lastError.message !== e.message
        || lastError.name !== e.name
        || lastError.trimmedStack !== trimmedStack
      ) {
        console.error('eval error: ', e);
        e.trimmedStack = trimmedStack;
        this.properties[rtv.frame].e = e;
      }
    }

    rtv.ctx.restore();
  };

  this.change_text = (newText) => {
    if (this.properties[rtv.frame].t !== newText) {
      this.properties[rtv.frame].t = newText;
      this.constrain_cursors();
    }
  };

  this.mouse_down = () => {
    if (this.hidden()) {
      return false;
    }

    this.near_mouse = this.point_in_text_rect(rtv.mouse.pos);

    if (this.near_mouse) {
      return true;
    }

    return false;
  };

  this.point_in_text_rect = (point) => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return false;
    }

    const { p } = props;

    if (this.image) {
      const w = this.image.width * props.w;
      const h = this.image.height * props.h;
      if (
        point.x > p.x - w / 2
        && point.x < p.x + w / 2
        && point.y > p.y - h / 2
        && point.y < p.y + h / 2
      ) {
        return true;
      }
    } else if (
      point.x > p.x
      && point.x < p.x + this.size.w
      && point.y > p.y - this.size.h / 2
      && point.y < p.y + this.size.h / 2
    ) {
      return true;
    }

    return false;
  };

  this.mouse_move = () => {
    const props = this.properties[rtv.frame];
    if (!props) {
      return;
    }

    this.near_mouse = this.point_in_text_rect(rtv.mouse.pos);
  };

  this.var_name = () => {
    let varName = this.args[0].split('=')[0];
    varName = varName.replace(/\s+/g, '');
    return varName;
  };

  this.mouse_drag = () => {
    if (rtv.tool === 'camera') {
      return false;
    }

    const props = this.properties[rtv.frame];
    if (!props) {
      return false;
    }

    if (
      Math.abs(rtv.mouse.pos.x - rtv.mouse.start.x) > CHAR.SIZE
      || Math.abs(rtv.mouse.pos.y - rtv.mouse.start.y) > CHAR.SIZE
    ) {
      this.dragged = true;
    }

    if (rtv.presenting) {
      if (
        !(this.args && this.args[0] && this.args[0]._data)
        && this.command === 'slide'
        && this.point_in_text_rect(rtv.mouse.start)
      ) {
        // change the value of the variable
        const varName = this.var_name();

        let oldVal;
        try {
          oldVal = parser.evaluate(varName);
          if (Number.isNaN(oldVal)) {
            oldVal = 0;
          }
        } catch {
          oldVal = 0;
        }

        let delta = (rtv.mouse.pos.x - rtv.mouse.last.x) / GRID_SIZE;
        if (rtv.keys.meta || rtv.keys.ctrl) {
          delta *= 0.01;
        }

        const newVal = oldVal + delta;
        this.text_val = `=${roundWithKey(newVal)}`;

        try {
          Text.setVariable(varName, newVal);
        } catch (e) {
          console.error('slide error: ', e);
        }

        return true;
      }
    } else if (this.is_selected() && this.near_mouse && this.image == null) {
      this.cursor = this.char_index_at_x(rtv.mouse.pos.x);
      this.cursor_selection = this.char_index_at_x(rtv.mouse.start.x);

      this.constrain_cursors();
      this.dragged = true;
    } else if (
      rtv.tool === 'select'
      && (this.near_mouse || this.is_selected())
    ) {
      // shift it
      const { p } = props;
      const offset = {
        x: rtv.mouse.grid.x - rtv.mouse.gridLast.x,
        y: rtv.mouse.grid.y - rtv.mouse.gridLast.y,
      };
      props.p = { x: p.x + offset.x, y: p.y + offset.y };

      return true;
    }

    return false;
  };

  this.mouse_up = () => {
    if (this.hidden()) {
      return false;
    }

    if (this.near_mouse) {
      if (!this.dragged) {
        if (rtv.presenting) {
          this.eval();
        } else {
          this.select();

          // move cursor
          this.cursor = this.char_index_at_x(rtv.mouse.pos.x);
          this.cursor_selection = this.cursor;
          this.constrain_cursors();
        }

        return true;
      }
    } else if (!rtv.keys.shift && this.is_selected()) {
      this.selected = false;
    }

    this.dragged = false;
    return false;
  };

  this.draw_text = (ctx, t) => {
    let size;

    if (this.command === 'f' && !this.is_selected()) {
      const fn = t.slice(this.command.length + 1); // +1 for semicolon
      size = drawFn(fn);
    } else {
      const N = t.length;
      size = { w: N * CHAR.SIZE, h: CHAR.SIZE * 2 };

      size = { w: drawSimple(t), h: CHAR.SIZE * 2 };

      let plevel = 0;
      for (let i = 0; i < N; i++) {
        if (i < this.cursor) {
          if (t[i] in BRACKETS) plevel += BRACKETS[t[i]];
        }
      }

      // draw red brackets
      ctx.save();
      if (this.is_selected() && plevel !== 0) {
        ctx.fillStyle = BRACKET_COLOR;
        let p2 = plevel;
        for (let i = this.cursor; i < N; i++) {
          if (t[i] in BRACKETS) p2 += BRACKETS[t[i]];

          if (p2 === plevel - 1) {
            ctx.fillText(t[i], i * CHAR.SIZE, 0);
            break;
          }
        }

        p2 = plevel;
        for (let i = this.cursor - 1; i >= 0; i--) {
          if (t[i] in BRACKETS) p2 += BRACKETS[t[i]];

          if (p2 === plevel + 1) {
            ctx.fillText(t[i], i * CHAR.SIZE, 0);
            break;
          }
        }
      }
      ctx.restore();
    }

    if (this.matrix_vals.length !== 0) {
      ctx.save();
      ctx.translate(size.w, 0);
      ctx.fillText('=', 0, 0);
      ctx.translate(135, 0);

      ctx.translate(-100, -20);
      new MatrixOutput(this.matrix_vals).draw(0, 0);

      ctx.restore();
    } else if (!this.selected && this.text_val && this.text_val.length) {
      ctx.save();
      ctx.translate(size.w, 0);
      size.w += drawSimple(this.text_val);
      ctx.restore();
    }

    return size;
  };

  this.handleAssignment = () => {
    if (!this.dirty) this.eval();
  };

  this.parse_text = () => {
    this.command = null;
    this.args = [];
    this.pArgs = [];

    if (!(rtv.frame in this.properties)) {
      this.requirements = {};
      this.fulfillments = [];

      return;
    }

    this.dirty = false;
    this.fulfillments = null;

    let newRequirements;

    const parsedText = this.properties[rtv.frame].t
      .replace(/^(\w+?):(.*)$/, (match, command, arg) => {
        this.command = command;
        this.args[0] = arg;

        return arg;
      })
      .replace(/([^(]*)(\|->|↦)/g, (match, parameters) => `@(${parameters})=`)
      .replace(/@/g, '_anon') // Replace @ with anonymous fn name
      .replace(/^{(.*?)}(.*){(.*?)}$/, (match, requirements, expression, fulfillments) => {
        newRequirements = {};
        requirements.split(' ').forEach((r) => {
          if (r) newRequirements[r] = 1;
        });
        this.fulfillments = fulfillments.split(' ').filter((s) => s);

        return expression;
      });

    this.command ??= '';
    this.args[0] ??= parsedText;

    try {
      this.pArgs = math.parse(this.args);
    } catch (e) {
      console.error('Parsing error:', e);

      this.args = [];
      this.pArgs = [];
      this.requirements = {};
      this.fulfillments = [];

      return;
    }

    if (newRequirements) return;

    newRequirements = {};
    this.fulfillments = [];

    this.pArgs[0].traverse((node, path, parent) => {
      switch (node.type) {
        case 'SymbolNode':
        case 'FunctionNode':
          if (!parent?.isAssignmentNode) {
            newRequirements[node.name] ??= 0;
            newRequirements[node.name]++;
          }
          break;

        case 'AssignmentNode':
          this.fulfillments.push((function extractName(object) {
            return object.object ? extractName(object.object) : object.name;
          })(node.object));
          break;

        case 'FunctionAssignmentNode':
          this.fulfillments.push(node.name);
          node.traverse((nestedNode, nestedPath, nestedParent) => {
            if (
              (nestedNode.isSymbolNode || nestedNode.isFunctionNode)
           && !nestedParent?.isAssignmentNode
           && node.params.includes(nestedNode.name)
            ) {
              newRequirements[nestedNode.name] ??= 0;
              newRequirements[nestedNode.name]--;
            }
          });
          break;

        // no default
      }
    });

    Object.keys(this.requirements).forEach((r) => {
      // Please do not change; `!(undefined > 0)` is true, however `undefined <= 0` is false!
      if (!(newRequirements[r] > 0)) {
        Text.assignments.removeEventListener(r, this.handleAssignment);
      }
    });

    Object.keys(newRequirements).forEach((r) => {
      // Please do not change; `!(undefined > 0)` is true, however `undefined <= 0` is false!
      if (newRequirements[r] > 0 && !(this.requirements[r] > 0)) {
        Text.assignments.addEventListener(r, this.handleAssignment);
      }
    });

    this.requirements = newRequirements;
    console.log(this.requirements);
  };

  this.draw_tree = (ctx, props) => {
    ctx.save();

    if (this.args.length !== 1) {
      return;
    }

    let stuff;
    try {
      stuff = [math.parse(this.args[0])];
    } catch {
      return;
    }

    const yoff = GRID_SIZE * 3;
    const xoff = GRID_SIZE * 3;
    const opSize = GRID_SIZE;

    const p = { x: props.p.x, y: props.p.y + GRID_SIZE };

    if (!stuff) {
      return;
    }

    while (true) {
      let nextStuff = [];
      let addedAllSpaces = true;
      for (let i = 0; i < stuff.length; i++) {
        const o = stuff[i];
        if (o.args) {
          nextStuff = nextStuff.concat(o.args);
          addedAllSpaces = false;
        } else {
          nextStuff.push(' ');
        }
      }

      let lx = (-(nextStuff.length - 1) / 2) * xoff;
      let li = 0;

      for (let i = 0; i < stuff.length; i++) {
        const o = stuff[i];
        if (o !== ' ') {
          let t;
          const np = {
            x: p.x + i * xoff - ((stuff.length - 1) / 2) * xoff,
            y: p.y,
          };

          if (o.args) {
          // draw the op name

            if (o.name && o.name.length) {
              t = o.name;
            } else if (o.op && o.op.length) {
              t = o.op;
            }

            if (distance(rtv.mouse.pos, np) < GRID_SIZE) {
              t = o.toString();
            }

            /* ctx.beginPath();
                  ctx.arc(np.x, np.y, op_size, 0, pi2);
                  ctx.stroke(); */

            ctx.fillText(t, np.x, np.y);

            for (let j = 0; j < o.args.length; j++) {
              while (nextStuff[li] === ' ') {
                lx += xoff;
                li += 1;
              }

              const argp = { x: p.x + lx, y: np.y + yoff };
              let diff = { x: argp.x - np.x, y: argp.y - np.y };
              const n = math.norm([diff.x, diff.y]);
              diff = { x: diff.x / n, y: diff.y / n };

              ctx.beginPath();
              ctx.moveTo(np.x + diff.x * opSize, np.y + diff.y * opSize);
              ctx.lineTo(argp.x - diff.x * opSize, argp.y - diff.y * opSize);
              ctx.stroke();

              lx += xoff;
              li += 1;
            }
          } else {
            if (o.name && o.name.length) {
              t = o.name;
            } else if (o.items) {
              t = 'A'; // array
            } else if (o.value) {
              t = o.value;
            } else if (o.content) {
              t = o.content;
            } else {
              t = '?';
            }

            ctx.fillText(t, np.x, np.y);
          }
        }
      }

      if (nextStuff.length === 0) {
        break;
      }

      if (addedAllSpaces) {
        break;
      }

      stuff = nextStuff;
      p.y += yoff;
    }

    ctx.restore();
  };

  this.draw_border = (ctx) => {
    ctx.save();
    ctx.globalAlpha = BORDER_OPACITY;

    if (this.image) {
      ctx.strokeRect(
        -this.image.width / 2,
        -this.image.height / 2,
        this.image.width,
        this.image.height,
      );
    } else {
      ctx.strokeRect(0, -this.size.h / 2, this.size.w, this.size.h);
    }

    ctx.restore();
  };

  this.render = (ctx) => {
    this.dirty = false;

    const a = this.properties[rtv.frame];

    if (!a) {
      return;
    }

    let b = this.properties[rtv.next_frame];

    const itn = rtv.transition.transitioning
      ? interpolate(a, b)
      : a;

    if (itn.c[3] === 0) {
      return;
    }

    let { p } = itn;

    if (b && b.c[3] > a.c[3]) {
      // fade in, use final position always
      p = b.p;
    } else if (b && b.c[3] < a.c[3]) {
      // fade out, use initial position
      p = a.p;
    }

    ctx.save();

    ctx.globalAlpha = itn.c[3];
    ctx.fillStyle = formatRgb(itn.c);
    ctx.strokeStyle = formatRgb(itn.c);

    let shouldDrawText = true;

    const c = this.command;
    if (c === 'tree') {
      this.draw_tree(ctx, itn);
      if (rtv.presenting) {
        shouldDrawText = false;
      }
    }

    if (rtv.presenting && (a.ph || (b && b.ph))) {
      shouldDrawText = false;
    }

    // text
    this.size = { w: 0, h: 0 };

    ctx.translate(p.x, p.y);
    ctx.rotate(itn.r);
    ctx.scale(itn.w, itn.h);

    // image display
    if (
      itn.t.includes('http')
      && (itn.t.includes('png')
        || itn.t.includes('jpg')
        || itn.t.includes('gif')
        || itn.t.includes('jpeg'))
    ) {
      if (this.image == null || this.image.src !== itn.t) {
        this.image = new Image();
        this.image.src = itn.t;
      } else {
        ctx.drawImage(
          this.image,
          -this.image.width / 2,
          -this.image.height / 2,
        );
        this.size = { w: this.image.width * itn.w, h: this.image.height * itn.h };
      }
    } else if (shouldDrawText) {
      if (!b) {
        b = a;
      }

      const fadingIn = a.c[3] === 0 && b.c[3] === 1;
      const fadingOut = a.c[3] === 1 && b.c[3] === 0;

      let at = a.t;
      let bt = b.t;

      if (rtv.transition.transitioning) {
        if (fadingIn) {
          at = b.t;
          bt = b.t;
        } else if (fadingOut) {
          at = a.t;
          bt = a.t;
        }
      }

      const textDifferent = at !== bt;

      if (textDifferent && rtv.transition.transitioning) {
        // changing text
        const constrained = constrain(rtv.t_ease);
        ctx.globalAlpha = 1 - constrained;
        this.draw_text(ctx, a.t);
        ctx.globalAlpha = constrained;
        this.draw_text(ctx, b.t);
      } else {
        ctx.globalAlpha = itn.c[3];
        this.size = this.draw_text(ctx, at);
      }
    }

    if (c === 'slide' && rtv.presenting && this.near_mouse && !this.hidden()) {
      // draw slider rect
      this.draw_border(ctx);
    }

    if (!rtv.presenting && !this.hidden() && this.near_mouse) {
      // draw border
      this.draw_border(ctx);
    }

    if (!rtv.presenting && this.is_selected()) {
      // draw cursor
      ctx.fillRect(this.cursor * CHAR.SIZE, -GRID_SIZE / 2, 2, GRID_SIZE);
      if (this.is_text_selected()) {
        // draw selection
        const s = this.selection_indices();

        const xstart = s.s * CHAR.SIZE;
        const xend = s.e * CHAR.SIZE;

        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillRect(xstart, -GRID_SIZE / 2, xend - xstart, GRID_SIZE);
        ctx.restore();
      }

      // draw function information
      if (itn.t) {
        const t = itn.t.slice(0, this.cursor);
        const fn = t.split(/[^A-Za-z]/).pop();

        if (fn.length !== 0) {
          const keys = Object.keys(math);
          let yoff = 0;

          for (let i = 0; i < keys.length; i++) {
            const funcName = keys[i];

            if (funcName.startsWith(fn)) {
              ctx.save();
              ctx.translate(0, CHAR.SIZE * 2 + yoff);
              ctx.scale(0.5, 0.5);
              ctx.globalAlpha = 0.5;
              drawSimple(`${funcName}: ${`${math[funcName]}`.split('\n')[0]}`);
              ctx.restore();
              yoff += GRID_SIZE;
            }
          }
        }
      }
    }

    ctx.restore();
  };

  this.generate_javascript = () => {
    const props = this.properties[rtv.frame];
    const { p } = props;
    const cp = rtv.cam.properties[rtv.frame].p;
    const { t } = props;

    let js = '';
    js += 'ctx.save();\n';
    js += `ctx.translate(x + ${p.x - cp.x}, y + ${p.y - cp.y});\n`;
    js += `ctx.rotate(${props.r});\n`;
    js += `ctx.scale(${props.w}, ${props.h});\n`;
    js += `ctx.fillStyle = "${formatRgb(props.c)}";\n`;

    for (let i = 0; i < t.length; i++) {
      if (t[i] === '*') {
        js += 'ctx.beginPath();\n';
        js += `ctx.arc(${i * CHAR.SIZE + CHAR.SIZE / 2}, 0, 3, 0, ${PI2});\n`;
        js += 'ctx.fill();\n';
      } else {
        js += `ctx.fillText("${t[i]}", ${i * CHAR.SIZE}, 0);\n`;
      }
    }

    js += 'ctx.restore();\n';

    return js;
  };

  this.parse_text();
}

Text.assignments = new EventTarget();

Text.dispatchAssignment = (name) => Text.assignments.dispatchEvent(new Event(name));

Text.setVariable = (name, value) => {
  parser.set(name, value);
  Text.dispatchAssignment(name);
};
