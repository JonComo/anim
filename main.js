// colors
var gray = "#cccccc";
var grid = "#eeeeee";
var grid_guide = "#dddddd";
var graph_guide = "#aaaaaa";
var dark = "#000000";
var light = "#ffffff";

var colors = ["#000000", "#E74C3C", "#2980B9", "#FFA400"];

var font_small = "16px Courier";
var font_menu = "20px Courier";
var font_anim = "26px Menlo";

var point_size = 6;

var c;
var ctx;

var animator;
var objs = [];
var frames;
var menu;
var cam;
var num_frames = 3;
var frame = 1; // current frame
var next_frame;
var playing;
var rendering = false;
var presenting = false;

var t_ease = 0;
var t_steps = 60;

var grid_size = 30;
var mouse_time = 0;
var mouse_duration = 40;

var tool = "select";
var selecting = false;
var new_line;

var mouse_down = false;
var ctrl = false;
var meta = false;
var mouse = {x: 0, y: 0};
var mouse_last = {x: 0, y: 0};
var mouse_start = {x: 0, y: 0};
var mouse_grid = {x: 0, y: 0};
var mouse_last_grid = {x: 0, y: 0};
var mouse_graph = {x: 0, y: 0};

var t = 0; // time for parser

var pi2 = 2 * Math.PI;

var parser = math.parser();
parser.set('frame', frame);

// custom functions!
function sig(x) {
    return 1/(1+math.exp(-x));
}

function sigp(x) {
    return math.exp(-x)/math.pow(1+math.exp(-x), 2);
}

function rgb1ToHex(a) {
    let c = [Math.round(a[0]*255), 
            Math.round(a[1]*255),
            Math.round(a[2]*255)];
    return rgbToHex(c);
}

math.import({
    scatter: function(xs, ys) {
        // [x1, x2, ..], [y1, y2, ...]

        xs = xs._data;
        ys = ys._data;
        
        for (let i = 0; i < xs.length; i ++) {

            ctx.beginPath();
            let p = {x: xs[i], y: ys[i]};
            let sp = cam.graph_to_screen(p);

            ctx.arc(sp.x, sp.y, point_size, 0, pi2);
            ctx.stroke();

            if (distance(mouse_graph, p) < .2) {
                ctx.fillText('('+pretty_round(p.x)+','+pretty_round(p.y)+')', sp.x, sp.y-grid_size);
                ctx.fill();
            }
        }
    },
    graph: function(fn) {
        // function

        let y = 0;
        let p;
        ctx.beginPath();
        for (let x = -10; x < 10; x += .2) {
            y = fn(x);
            p = cam.graph_to_screen({x: x, y: y});
            if (x == -10) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }

        ctx.stroke();
    },
    shape: function(xs, ys) {
        // [x1, ...], [y1, ...]

        xs = xs._data;
        ys = ys._data;

        let p;
        ctx.beginPath();
        let N = xs.length;
        for (let i = 0; i < N; i ++) {
            p = cam.graph_to_screen({x: xs[i], y: ys[i]});
            if (i == 0) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }

        ctx.stroke();
    },
    if: function(x, a, b) {
        if (x == 1) {
            if (typeof a == 'function') {
                return a();
            } else {
                return a;
            }
        } else {
            if (typeof b == 'function') {
                return b();
            } else {
                return b;
            }
        }
    },
    view: function(x, p) {

        let t = [];
        if (x._data) {
            x = x.map(function (value, index, matrix) {
                return pretty_round(value);
            });

            let d = x._data;
            if (x._size.length == 1) {
                t = [d.join(' ')];
            } else {
                for (let r = 0; r < d.length; r++) {
                    t.push(d[r].join(' '));
                }
            }
        }

        p = p._data;
        p = cam.graph_to_screen({x: p[0], y: p[1]});
        for (let i = 0; i < t.length; i++) {
            ctx.textAlign = 'left';
            ctx.fillText(t[i], p.x, p.y + grid_size * i);
        }
    },
    label: function(l, p) {
        p = p._data;
        p = cam.graph_to_screen({x: p[0], y: p[1]});
        ctx.fillText(l, p.x, p.y);
    },
    sig: function(x) {
        if (x._data) {
            var b = x.map(function (value, index, matrix) {
                return sig(value);
            });
            return b;
        }

        return sig(x);
    },
    sigp: function(x) {
        if (x._data) {
            var b = x.map(function (value, index, matrix) {
                return sigp(value);
            });
            return b;
        }

        return sigp(x);
    },
});

// undo
var states = [];

window.requestAnimFrame = function() {
    return (
        window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ callback){
            window.setTimeout(callback, 1000 / 60);
        }
    );
}();

// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function Animator(fps, canvas, frames, callback) {
    this.fps = fps;
    this.canvas = canvas;
    this.frames = frames;
    this.callback = callback;

    if (this.frames > 0) {
        // Create a capturer that exports a WebM video
        this.capturer = new CCapture( { format: 'png', framerate: this.fps } );
        this.capturer.start();
    }

    this.animate = function () {
        if (this.frames > 0) {
            this.frames -= 1;
            requestAnimationFrame(this.animate);
        } else {
            if (this.capturer) {
                this.capturer.stop();
                this.capturer.save();
                this.capturer = null;
            }

            setTimeout(function() {
                requestAnimationFrame(this.animate);
            }, 1000/this.fps);
        }

        this.callback();
        this.capturer.capture(this.canvas);
    }

    this.animate();
}

function pretty_round(num) {
    return (Math.round(num*100)/100).toFixed(2);
}

function get_mouse_pos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function constrain_to_grid(p) {
    let gs = grid_size / 4;
    return {x: Math.floor((p.x + gs/2) / gs) * gs, y: Math.floor((p.y + gs/2) / gs) * gs};
}

function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function between(a, b) {
    return {x: (a.x + b.x)/2, y: (a.y + b.y)/2};
}

function grad_2(c, x, y) {
    // c is compiled obj
    // depends on x and y
    let h = 0.0001;

    parser.set('x', x+h);
    let fxh = c.eval(parser.scope);
    parser.set('x', x);
    let fx = c.eval(parser.scope);

    parser.set('y', y+h);
    let fyh = c.eval(parser.scope);
    parser.set('y', y);
    let fy = c.eval(parser.scope);

    return [(fxh-fx)/h, (fyh-fy)/h];
}

function sigmoid(x, num, offset, width) {
    return num / (1.0 + Math.exp(-(x+offset)*width));
}

function ease_in_out(x) {
    return 1.0 / (1.0 + Math.exp(-(x-.5)*10));
}

function copy(d) {
    return JSON.parse(JSON.stringify(d));
}

function change_frames() {
    for (let i = 0; i < objs.length; i++) {
        obj = objs[i];
        if (obj.properties[frame] && obj.properties[next_frame] == null) {
            obj.properties[next_frame] = copy(obj.properties[frame]);
            if (next_frame < frame) {
                // make that shit transparent?
                obj.properties[next_frame].c[3] = 0.0;
            }
        }
    }
}

function rgbToHex(c) {
    return "#" + ((1 << 24) + (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2])).toString(16).slice(1);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
     ] : null;
}

function transform_props(key, props) {
    let step = .2;

    if (key == "l") {
        props.w += step;
    } else if (key == "j") {
        props.w -= step;
    } else if (key == "i") {
        props.h += step;
    } else if (key == "k") {
        props.h -= step;
    } else if (key == "u") {
        props.r -= Math.PI/12;
    } else if (key == "o") {
        props.r += Math.PI/12;
    }

    return props;
}

function interpolate(a, b) {
    if (!b) {
        return a;
    }

    let interp = {};
    for (key in a) {
        if (key == "p") {
            // interpolate position
            let ap = a[key];
            let bp = b[key];

            interp[key] = {x: (1-t_ease) * ap.x + t_ease * bp.x,
                           y: (1-t_ease) * ap.y + t_ease * bp.y};
        } else if (key == "w" || key == "h" || key == "r" || key == "a_s" || key == "a_e") {
            // interpolate width, height, or rotation
            let aw = a[key];
            let bw = b[key];
            interp[key] = (1-t_ease) * aw + t_ease * bw;
        } else if (key == "c") {
            // interpolate colors
            let ac = a[key];
            let bc = b[key];
            let ic = [];
            let constrain = Math.min(1, Math.max(0, t_ease));
            for (let i = 0; i < ac.length; i++) {
                ic.push((1-constrain) * ac[i] + constrain * bc[i]);
            }

            interp[key] = ic;
        } else if (key == "path") {
            // interpolate paths
            let ap = a[key];
            let bp = b[key];
            
            ip = [];
            for (let i = 0; i < ap.length; i ++) {
                let newp = {x: (1-t_ease) * ap[i].x + t_ease * bp[i].x,
                            y: (1-t_ease) * ap[i].y + t_ease * bp[i].y};
                ip.push(newp);
            }

            interp[key] = ip;
        } else if (key == "t") {
            if (t_ease < .5) {
                interp[key] = a[key];
            } else {
                interp[key] = b[key];
            }
        } else {
            interp[key] = a[key];
        }
    }

    return interp;
}

function Button(text, pos, callback) {
    this.text = text;
    this.pos = pos;
    this.callback = callback;
    this.color = "";
    this.align = 'left';
    this.selected = false;

    this.width = text.length * grid_size/4;
    this.height = grid_size/4;

    if (this.width == 0) {
        this.width = grid_size;
    }
    
    this.hovering = function() {
        return (mouse.x > this.pos.x && mouse.x < this.pos.x + this.width && Math.abs(mouse.y - this.pos.y) < this.height);
    }

    this.mouse_up = function(evt) {
        if (this.hovering()) {
            // clicked
            if (this.callback) {
                this.callback(this);
            }
            return true;
        }

        return false;
    }

    this.render = function(ctx) {
        ctx.save();

        ctx.translate(this.pos.x, this.pos.y);

        if (this.hovering() || this.selected) {
            ctx.scale(1.5, 1.5);
        }

        if (this.color.length) {
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -grid_size/8, grid_size, grid_size/4);
        }

        ctx.textAlign = this.align;
        ctx.font = font_small;
        ctx.fillText(this.text, 0, 0);

        ctx.restore();
    }
}

function Shape(color, path) {
    this.type = "Shape";
    this.guid = guid();
    this.properties = {};
    this.properties[frame] = {c: color, path: path, v: false, w: 1, h: 1, r: 0};

    this.selected_indices = [];

    this.duplicate = function() {
        if (this.selected_indices.length == 0) {
            return;
        }

        let newc = new Shape(null, null);
        newc.properties[frame] = copy(this.properties[frame]);
        // select all indices for next one
        for (let i = 0; i < newc.properties[frame].path.length; i++) {
            newc.selected_indices.push(i);
        }

        this.selected_indices = [];
        objs.push(newc);
    }

    this.hidden = function() {
        if (!this.properties[frame]) {
            return true;
        }

        return this.properties[frame].c[3] == 0;
    }

    this.copy_properties = function(f, n) {
        this.properties[n] = copy(this.properties[f]);
    }

    this.hide = function() {
        if (this.selected_indices.length != 0) {
            if (this.properties[frame].c[3] == 1) {
                this.properties[frame].c[3] = 0;
            } else {
                this.properties[frame].c[3] = 1;
            }
            this.selected_indices = [];
        }
    }

    this.select = function() {
        this.selected_indices = [];
        for (let i = 0; i < this.properties[frame].path.length; i++) {
            this.selected_indices.push(i);
        }
    }

    this.is_selected = function() {
        return this.selected_indices.length > 0;
    }

    this.set_color = function(rgba) {
        if (this.selected_indices.length != 0) {
            rgba[3] = this.properties[frame].c[3];
            this.properties[frame].c = rgba;
        }
    }

    this.clear_props = function(f) {
        delete this.properties[f];
    }

    this.clear_all_props = function() {
        if (this.selected_indices.length == 0) {
            return;
        }

        for (var key in this.properties) {
            if (key != frame) {
                delete this.properties[key];
            }
        }
    }

    this.add_point = function(p) {
        let props = this.properties[frame];
        let path = props.path;
        path.push(p);
    }

    this.closest_point_idx = function() {
        let props = this.properties[frame];
        let path = props.path;
        for (let i = 0; i < path.length; i++) {
            let p = path[i];

            if (distance(p, mouse) < grid_size/8) {
                return i;
            }
        }

        return -1;
    }

    this.in_rect = function(x, y, x2, y2) {
        // select individual points
        let props = this.properties[frame];

        if (this.hidden()) {
            return;
        }

        let path = props.path;
        this.selected_indices = [];
        let found = false;

        for (let i = 0; i < path.length; i++) {
            let p = path[i];

            if (p.x > x && p.x < x2 && p.y > y && p.y < y2) {
                this.selected_indices.push(i);
                found = true;
            }
        }

        return found;
    }

    this.onkeydown = function(evt) {
        let key = evt.key;

        if (this.selected_indices.length != 0) {
            this.properties[frame] = transform_props(key, this.properties[frame]);
        }

        return false;
    }

    this.mouse_down = function(evt) {
        if (this.hidden()) {
            return false;
        }

        // try to selected one
        let idx = this.closest_point_idx();
        if (idx != -1) {
            this.selected_indices = [idx];
            return true;
        }

        return false;
    }

    this.mouse_drag = function(evt) {
        if (this.selected_indices.length > 0) {
            let props = this.properties[frame];
            let path = props.path;

            if (tool == "select") {
                // move all
                let offset = {x: mouse_grid.x - mouse_grid_last.x,
                          y: mouse_grid.y - mouse_grid_last.y};
                for (let i = 0; i < this.selected_indices.length; i++) {
                    let idx = this.selected_indices[i];
                    let p = path[idx];
                    path[idx] = {x: p.x + offset.x, y: p.y + offset.y};
                }
            }
        }
    }

    this.mouse_up = function(evt) {
        if (meta) {
            return;
        }

        this.selected_indices = [];
    }

    this.bezier = function(points, off, t) {
        let x = points[0].x - off.x;
        let y = points[0].y - off.y;
        let c = 0;
        let N = points.length;
        for (let i = 0; i < N; i++) {
            c = math.factorial(N) / (math.factorial(N-i) * math.factorial(i));

            c *= math.pow(1-t, N-i) * math.pow(t, i);

            x += c * (points[i].x - off.x);
            y += c * (points[i].y - off.y);
        }

        return [x, y];
    }

    this.draw_path = function(props) {
        let path = props.path;
        let c = {x: 0, y: 0};

        
        for (let i = 0; i < path.length; i++) {
            c.x += path[i].x;
            c.y += path[i].y;
        }

        c.x /= path.length;
        c.y /= path.length;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(props.r);
        ctx.scale(props.w, props.h);

        let idx = this.closest_point_idx();

        let hidden = this.hidden();

        for (let i = 0; i < path.length; i++) {
            let p = path[i];
            
            if (i == 0) {
                ctx.moveTo(p.x - c.x, p.y - c.y);
            } else {
                ctx.lineTo(p.x - c.x, p.y - c.y);
            }

            // show selected indices
            if (!presenting && !hidden && (this.selected_indices.indexOf(i) != -1 || i == idx)) {
                ctx.strokeStyle = dark;
                ctx.strokeRect(p.x- c.x -grid_size/2, p.y - c.y - grid_size/2, grid_size, grid_size);
            }
        }

        if (this.selected_indices.length > 0) {
            // render side lengths while dragging
            for (let i = 0; i < path.length - 1; i++) {
                let p1 = path[i];
                let p2 = path[i+1];
                let b = between(p1, p2);
                let d = distance(p1, p2) / grid_size;
                d = Math.round(d * 10) / 10;
                ctx.font = font_small;
                ctx.fillText(d, b.x - c.x, b.y - c.y);
            }
        }

        if (this.properties[frame].v && path.length >= 2) {
            // vector
            let b = path[path.length-2];
            let a = path[path.length-1];

            let theta = Math.atan2(a.y - b.y, a.x - b.x);
            ctx.moveTo(a.x - c.x, a.y - c.y);
            ctx.lineTo(a.x - c.x + Math.cos(theta - Math.PI*3/4) * grid_size/2, a.y - c.y + Math.sin(theta - Math.PI*3/4) * grid_size/2);
            ctx.moveTo(a.x - c.x, a.y - c.y);
            ctx.lineTo(a.x - c.x + Math.cos(theta + Math.PI*3/4) * grid_size/2, a.y - c.y + Math.sin(theta + Math.PI*3/4) * grid_size/2);
        }

        ctx.restore();
    }

    this.render = function(ctx) {

        let a = this.properties[frame];
        let b = this.properties[next_frame];

        if (!a) {
            return;
        }

        let props = interpolate(a, b);

        ctx.beginPath();

        this.draw_path(props);

        ctx.save();
        ctx.globalAlpha = props.c[3];

        ctx.strokeStyle = rgbToHex(props.c);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

function Circle(color, pos) {
    this.type = "Circle";
    this.guid = guid();
    this.properties = {};
    this.properties[frame] = {p: pos, c: color, a_s:0, a_e: Math.PI*2.0, w: 1, h: 1, r: 0};
    this.selected = false;

    this.select = function() {
        this.selected = true;
    }

    this.is_selected = function() {
        return this.selected;
    }

    this.hidden = function() {
        if (!this.properties[frame]) {
            return true;
        }
        
        return this.properties[frame].c[3] == 0;
    }

    this.copy_properties = function(f, n) {
        this.properties[n] = copy(this.properties[f]);
    }

    this.duplicate = function() {
        if (!this.selected) {
            return;
        }

        let newc = new Circle(null, null);
        newc.properties[frame] = copy(this.properties[frame]);
        newc.selected = true;
        this.selected = false;
        objs.push(newc);
    }

    this.hide = function() {
        if (this.selected) {
            if (this.properties[frame].c[3] == 1) {
                this.properties[frame].c[3] = 0;
            } else {
                this.properties[frame].c[3] = 1;
            }
            this.selected = false;
        }
    }

    this.set_color = function(rgba) {
        if (this.selected) {
            rgba[3] = this.properties[frame].c[3];
            this.properties[frame].c = rgba;
        }
    }

    this.clear_props = function(f) {
        delete this.properties[f];
    }

    this.clear_all_props = function() {
        if (!this.selected) {
            return;
        }

        for (var key in this.properties) {
            if (key != frame) {
                delete this.properties[key];
            }
        }
    }

    this.near_mouse = function () {
        let props = this.properties[frame];
        if (!props) {
            return false;
        }

        return distance(props.p, mouse) < grid_size/2
    }

    this.in_rect = function(x, y, x2, y2) {
        if (this.hidden()) {
            return false;
        }

        let props = this.properties[frame];
        let p = props.p;

        if (p.x > x && p.x < x2 && p.y > y && p.y < y2) {
            this.selected = true;
            return true;
        }

        return false;
    }

    this.onkeydown = function(evt) {
        if (!this.selected) {
            return false;
        }

        let key = evt.key;

        if (ctrl) {
            let p = this.properties[frame];
            let step = Math.PI/12;
            if (key == "u") {
                p.a_s += step;
            } else if (key == "o") {
                p.a_s -= step;
            } else if (key == "j") {
                p.a_e -= step;
            } else if (key == "l") {
                p.a_e += step;
            }
        } else {
            this.properties[frame] = transform_props(key, this.properties[frame]);
        }

        return false;
    }

    this.mouse_down = function(evt) {
        if (this.hidden()) {
            return false;
        }

        // try to selected one
        if (this.near_mouse()) {
            this.selected = true;
            return true;
        }

        return false;
    }

    this.mouse_drag = function(evt) {
        if (this.selected && tool == "select") {
            // move
            let props = this.properties[frame];
            let offset = {x: mouse_grid.x - mouse_grid_last.x,
                        y: mouse_grid.y - mouse_grid_last.y};
            let p = props.p;
            this.properties[frame].p = {x: p.x + offset.x, y: p.y + offset.y};
        }
    }

    this.mouse_up = function(evt) {
        if (meta) {
            return;
        }

        this.selected = false;
    }

    this.draw_ellipse = function(props, ctx) {
        let p = props.p;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(props.r);
        ctx.scale(props.w, props.h);
        ctx.arc(0, 0, 20, props.a_s, props.a_e, false);
        ctx.restore();
    }

    this.render = function(ctx) {

        let a = this.properties[frame];
        let b = this.properties[next_frame];

        if (!a) {
            return;
        }

        let props = interpolate(a, b);

        ctx.save();

        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        this.draw_ellipse(props, ctx);
        ctx.globalAlpha = props.c[3];
        ctx.strokeStyle = rgbToHex(props.c);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        if (!presenting && props.c[3] != 0 && (this.selected || this.near_mouse())) {
            ctx.beginPath();
            ctx.strokeStyle = dark;
            ctx.strokeRect(props.p.x - grid_size/4, props.p.y - grid_size/4, grid_size/2, grid_size/2);
            ctx.stroke();
        }
    }
}

function Text(text, pos) {
    this.type = "Text";
    this.guid = guid();
    this.properties = {};
    this.properties[frame] = {t: text, p: pos, c: [0, 0, 0, 1], w: 1, h: 1, r: 0};

    // ephemeral
    this.new = true; // loaded or just created
    this.selected = false;
    this.dragged = false;
    this.cursor = -1;
    this.command = "";
    this.args = [];
    this.cargs = []; // compiled arguments
    this.text_val = "";
    this.near_mouse = false;

    this.select = function() {
        this.selected = true;

        if (this.cursor == -1) {
            this.cursor = 0;
        }
    }

    this.is_selected = function() {
        return this.selected;
    }

    this.duplicate = function() {
        if (!this.selected) {
            return;
        }

        let newc = new Text(this.text, null);
        newc.properties[frame] = copy(this.properties[frame]);
        newc.selected = true;
        this.selected = false;
        objs.push(newc);
    }

    this.copy_properties = function(f, n) {
        this.properties[n] = copy(this.properties[f]);
    }

    this.set_color = function(rgba) {
        if (this.selected) {
            rgba[3] = this.properties[frame].c[3];
            this.properties[frame].c = rgba;
        }
    }

    this.hide = function() {
        if (this.selected) {
            if (this.properties[frame].c[3] == 1) {
                this.properties[frame].c[3] = 0;
            } else {
                this.properties[frame].c[3] = 1;
            }
            
            this.selected = false;
        }
    }

    this.clear_props = function(f) {
        delete this.properties[f];
    }

    this.clear_all_props = function() {
        if (!this.selected) {
            return;
        }

        for (var key in this.properties) {
            if (key != frame) {
                delete this.properties[key];
            }
        }
    }

    this.hidden = function() {
        if (!this.properties[frame]) {
            return true;
        }

        if (transition.transitioning) {
            return this.properties[frame].c[3] == 0 && this.properties[next_frame].c[3] == 0;
        }

        return this.properties[frame].c[3] == 0;
    }

    this.in_rect = function(x, y, x2, y2) {
        if (this.hidden()) {
            return false;
        }

        let props = this.properties[frame];
        let p;
        if (props.ge) {
            p = {x: props.p.x + cam.props.p.x, y: props.p.y + cam.props.p.y};
        } else {
            p = props.p;
        }
        
        if (p.x > x && p.y > y && p.x < x2 && p.y < y2) {
            this.select();
            return true;
        }

        return false;
    }

    this.split = function() {
        if (!this.is_selected()) {
            return;
        }

        // for each character, make it it's own text obj
        let t = this.properties[frame].t;
        if (!t) {
            return;
        }

        let p = this.properties[frame].p;

        let N = t.length;
        let xoff = 0;
        for (let i = 0; i < N; i++) {
            let c = t[i];
            if (c == " ") {
                xoff += grid_size/2;
                continue;
            }
            let newT = new Text(c, {x: p.x + xoff, y:p.y});
            objs.push(newT);
            xoff += grid_size/2;
        }

        this.deleted = true;
    }

    this.onkeydown = function(evt) {
        if (!this.selected) {
            return false;
        }

        if (meta) {
            return false;
        }

        let key = evt.key;
        let text = this.properties[frame].t;

        if (key == "Escape") {
            this.selected = false;
            return false;
        }

        if (key == "Enter") {
            this.selected = false;
            this.eval();
            enter_select();
            return false;
        }

        if (ctrl) {
            this.properties[frame] = transform_props(key, this.properties[frame]);
            return false;
        }

        if (key == "ArrowRight") {
            this.cursor += 1;
        } else if (key == "ArrowLeft") {
            this.cursor -= 1;
        } else if (key == "ArrowUp") {
            // find text above
            let texts = objs.filter(function(o) {
                return o.type == "Text";
            });

            texts.sort(function(a, b) {
                let ap = a.properties[frame].p;
                let bp = b.properties[frame].p;
                return ap.y > bp.y;
            });

            let i = guidIndex(texts, this);
            if (i == 0) {
                return true;
            }

            let new_obj = texts[i-1];
            new_obj.selected = true;
            this.selected = false;
            return true;

        } else if (key == "ArrowDown") {
            // find text below
            let texts = objs.filter(function(o) {
                return o.type == "Text";
            });

            texts.sort(function(a, b) {
                let ap = a.properties[frame].p;
                let bp = b.properties[frame].p;
                return ap.y > bp.y;
            });

            let i = guidIndex(texts, this);
            if (i == texts.length - 1) {
                return true;
            }

            let new_obj = texts[i+1];
            new_obj.selected = true;
            this.selected = false;
            return true;
        }

        if (key == 'Backspace') {
            let before = text.slice(0, this.cursor);
            let after = text.slice(this.cursor, text.length);
            this.cursor -= 1;
            
            text = before.slice(0, before.length-1) + after;
        } else if (key.length == 1) {
            let before = text.slice(0, this.cursor);
            let after = text.slice(this.cursor, text.length);

            text = before + key + after;
            this.cursor += 1;
        }

        if (this.cursor > text.length) {
            this.cursor = text.length;
        } else if (this.cursor < 0) {
            this.cursor = 0;
        }

        this.change_text(text);

        return true;
    }

    this.eval = function() {
        if ((!presenting && this.is_selected()) || this.hidden()) {
            return;
        }

        this.text_val = '';
        let expr = '';

        if (this.new) {
            this.new = false;
            this.parse_text(this.properties[frame].t);
        }

        let c = this.cargs[0];

        if (!c) {
            return;
        }

        ctx.save();

        let a = this.properties[frame];
        let b = this.properties[next_frame];
        let i = interpolate(a, b);

        let color = rgbToHex(i.c);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = i.c[3];

        try {
            let val = c.eval(parser.scope);
            let type = typeof val;
            if (type == "number") {
                if (ctrl) {
                    // nothing
                    this.text_val = '';
                } else {
                    this.text_val = ' = ' + pretty_round(val);
                }
                
            } else if (type == "object" && val._data.length != 0) {
                // prob a matrix, render dims
                let d = val._data;
                let dims = [];

                while (d.length) {
                    dims.push(d.length);
                    d = d[0];
                }

                this.text_val = ' = [';
                let N = dims.length;
                for (let i = 0; i < N; i++) {
                    this.text_val += dims[i];
                    if (i != N - 1) {
                        this.text_val += ', ';
                    }
                }
                this.text_val += ']';
            }
        } catch (e) {
            console.log('eval error:');
            console.log(e);
        }
        
        ctx.restore();
    }

    this.change_text = function(text) {
        let changed = this.properties[frame].t != text;

        this.properties[frame].t = text;

        if (changed) {
            this.parse_text(text);
        }
    }

    this.mouse_down = function(evt) {
        if (this.hidden()) {
            return false;
        } 

        if (this.near_mouse) {
            this.select();
            return true;
        }

        return false;
    }

    this.mouse_move = function(evt) {
        let props = this.properties[frame];
        if (!props) {
            return;
        }

        if (props.ge) {
            let d = distance({x: props.p.x + cam.props.p.x, y: props.p.y + cam.props.p.y}, mouse);
            this.near_mouse = d < grid_size/4;
        } else {
            let d = distance(props.p, mouse);
            this.near_mouse = d < grid_size/4;
        }
    };

    this.mouse_drag = function(evt) {
        let props = this.properties[frame];
        if (!props) {
            return false;
        }

        if (presenting) {
            if (this.command == "slide" && distance(mouse_start, props.p) < grid_size/4) {

                // change the value of the variable
                let var_name = this.args[0];
                var_name = var_name.replace(/\s+/g, '');

                let old_val = 0;
                if (!this.has_slid) {
                    this.has_slid = true;
                    parser.set(var_name, 0.0);
                } else {
                    old_val = parser.eval(var_name);
                }

                let delta = (mouse.x - mouse_last.x)/grid_size;

                let new_val = old_val + delta;
                this.text_val = ' = ' + pretty_round(new_val);

                try {
                    parser.set(var_name, new_val);
                } catch (error) {
                    console.log('slide error: ' + error);
                }

                return true;
            }
        } else if (tool == "select" && this.selected) {
            // shift it
            let p = props.p;
            let offset = {x: mouse_grid.x - mouse_grid_last.x, y: mouse_grid.y - mouse_grid_last.y};
            props.p = {x: p.x + offset.x, y: p.y + offset.y};

            this.dragged = true;
            return true;
        }

        return false;
    }

    this.mouse_up = function(evt) {
        if (presenting) {
            if (this.near_mouse) {
                // clicked, eval text

                // loop:num,expr
                if (this.command == "loop") {
                    try {
                        let num = this.args[0];
                        let expr = this.args[1];
                        for (let i = 0; i < num; i++) {
                            parser.eval(expr);
                        }
                    } catch(e) {
                        console.log('loop error ' + e);
                    }
                } else {
                    this.eval();
                }
            }
            return;
        }

        if (this.selected) {
            if (!meta && !this.near_mouse) {
                this.selected = false;
            }
        }
        
        this.dragged = false;
    }

    this.graphing = function() {
        let cs = ["tangent", "graph", "point", "scatter", "drag", "line", "contour"];

        if (cs.indexOf(this.command) != -1) {
            return true;
        }

        return false;
    }

    this.draw_text = function(ctx, props) {
        let t = props.t;

        if (this.command == "e" || this.command == "slide") {
            t = t + this.text_val;
        }

        if (presenting) {
            if (this.command) {
                t = t.slice(this.command.length+1); //+1 for semicolon
            }
        }

        ctx.fillStyle = rgbToHex(props.c);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.textAlign = 'center';

        let xoff = 0;

        let N = t.length;

        exponent = 0;
        let subscript = false;
        for (let i = 0; i < N; i++) {
            if (t[i] == "*") {
                ctx.beginPath();
                
                ctx.arc(xoff, 2, 3, 0, pi2, 0);
                ctx.fill();
                xoff += grid_size/2;
            } else if (presenting && t[i] == "_") {
                subscript = true;
            } else if (presenting && t[i] == "^" && t[i+1] == "(") {
                i += 1;
                exponent += 1;
            } else if (presenting && (exponent != 0 || subscript) && t[i] == ")") {
                if (exponent > 0) {
                    exponent -= 1;
                }
            } else {
                let yoff = -grid_size/2 * exponent;

                if (subscript) {
                    yoff = grid_size/2;
                }

                ctx.fillText(t[i], xoff, yoff);
                xoff += grid_size/2;

                if (subscript) {
                    subscript = false;
                }
            }
        }

        let center = (xoff-grid_size/2) / 2;

        if (!presenting && !this.hidden() && (this.selected || this.near_mouse)) {
            // draw cursor
            ctx.beginPath();
            let c = this.cursor;
            ctx.fillRect(c * grid_size/2 - grid_size/4, -grid_size/2, 2, grid_size);

            // draw center
            ctx.strokeStyle = dark;
            ctx.beginPath();
            ctx.strokeRect(center-grid_size/8, -grid_size/8, grid_size/4, grid_size/4);
        }
    }

    this.parse_text = function(text) {
        this.command = "";
        this.args = [];
        this.cargs = [];

        if (!text) {
            return;
        } else if (text.indexOf(':') == -1) {
            this.args = [text];
            try {
                this.cargs = math.compile(this.args);
            } catch(e) {
                console.log('compile2 error: ');
                console.log(e);
            }
            return;
        }

        // find top level command and args
        let N = text.length;
        let p = 0;
        let s = 0;

        for (let i = 0; i < N; i++) {
            let c = text[i];

            if (c == "(" || c == "[") {
                p += 1;
            } else if (c == ")" || c == "]") {
                p -= 1;
            }

            if (c == ':' && p == 0) {
                this.command = text.slice(s, i);
                s = i+1;
            }else if (c == ',' && p == 0) {
                this.args.push(text.slice(s, i));
                s = i+1;
            }
        }

        this.args.push(text.slice(s));
        try {
            this.cargs = math.compile(this.args);
        } catch(e) {
            console.log('compile error: ');
            console.log(e);
        }
    }

    this.parse_text(text);

    this.draw_tree = function(ctx, props) {

        if (this.args.length != 1) {
            return;
        }

        let t = -1;

        try {
            t = math.parse(this.args[0]);
        } catch(e) {

        }

        if (t == -1) {
            return;
        }
        
        // recursively draw it
        function render_tree(ctx, t, p) {
            if (t.args) {
                if (t.name && t.name.length) {
                    ctx.fillText(t.name, p.x, p.y);
                } else if (t.op && t.op.length) {
                    ctx.fillText(t.op, p.x, p.y);
                } else {
                    ctx.fillText('op', p.x, p.y);
                }

                for (let i = 0; i < t.args.length; i ++) {
                    render_tree(ctx, t.args[i], {x: p.x + i * grid_size*4 - (t.args.length-1)*grid_size*2 , y: p.y + grid_size});
                }
            } else if (t.content) {
                render_tree(ctx, t.content, p);
            } else {
                if (t.name && t.name.length) {
                    ctx.fillText(t.name, p.x, p.y);
                } else {
                    ctx.fillText(t.value, p.x, p.y);
                }
            }
        }

        render_tree(ctx, t, {x: props.p.x, y: props.p.y + grid_size});
    }

    this.draw_graph = function(ctx, props) {

        ctx.save();
        //ctx.translate(off.x, off.y);
        ctx.strokeStyle = rgbToHex(props.c);

        ctx.beginPath();

        let c = this.cargs[0];

        // regenerate path
        try {
            let c = this.cargs[0];

            let uw = 16;
            let uh = 9;

            let y = 0;

            let cx = 0;
            let cy = 0;

            for (let xx = -uw; xx <= uw; xx += .2) {
                parser.set('x', xx);
                //y = parser.eval(expr);
                y = c.eval(parser.scope);
                y = Math.max(Math.min(y, 1000), -1000);

                let p = {x: xx, y: y};
                p = cam.graph_to_screen(p);

                if (xx==-uw) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }


            ctx.stroke();

            // show where mouse is

            // if close to the line anywhere, draw a point on it

            let xin = mouse_graph.x;
            let yin = mouse_graph.y;

            parser.set('x', xin);
            let fn_y = c.eval(parser.scope);

            let d = (fn_y - yin) * grid_size;

            if (Math.abs(d) < grid_size/2) {
                // we got a match

                let yt;
                if (ctrl) {
                    yt = fn;
                } else {
                    yt = pretty_round(fn_y);
                }

                let s = cam.graph_to_screen({x: mouse_graph.x, y: fn_y});

                ctx.fillText("("+pretty_round(xin)+", "+yt+")", s.x, s.y - grid_size);
                ctx.beginPath();
                ctx.arc(s.x, s.y, point_size, 0, Math.PI*2);
                ctx.fill();
            }

        } catch(e) {
            console.log('graph mouse e: ' + e);
        }

        ctx.restore();
    }

    this.draw_tangent = function(ctx, props) {

        ctx.save();

        try {
            let c = this.cargs[0];

            ctx.translate(cam.props.p.x, cam.props.p.y);

            let inx = mouse_graph.x;

            parser.set('x', inx);
            let p0 = {x: inx, y: -c.eval(parser.scope)};

            inx += 0.0001;
            parser.set('x', inx);
            let p1 = {x: inx, y: -c.eval(parser.scope)};

            let slope = (p1.y - p0.y)/(p1.x - p0.x);

            let s = 100;
            let p0_extend = {x: p0.x - s * grid_size, y: p0.y - s * grid_size * slope};
            let p1_extend = {x: p0.x + s * grid_size, y: p0.y + s * grid_size * slope};

            let path = [p0_extend, p1_extend];

            // for (let xx = -uw; xx <= uw; xx += uw) {
            //     let y = math.eval(expr, {x: xx});
            //     y = Math.max(Math.min(y, 1000), -1000);
            //     path.push({x: grid_size * xx, y: -grid_size * y});
            // }

            ctx.beginPath();

            for (let i = 0; i < path.length; i++) {
                let p = path[i];
                
                if (i == 0) {
                    ctx.moveTo(p.x * grid_size * cam.props.w, p.y * grid_size * cam.props.h);
                } else {
                    ctx.lineTo(p.x * grid_size * cam.props.w, p.y * grid_size * cam.props.h);
                }
            }

            ctx.stroke();

        } catch (error) {
        }

        ctx.restore();
    }

    this.draw_contour = function(ctx, props) {
        // contour: f, steps, step_size

        if (this.args.length != 3) {
            return;
        }

        ctx.save();

        try {
            ctx.fillStyle = rgbToHex(props.c);

            let cexpr = this.cargs[0];
            let steps = this.cargs[1].eval(parser.scope);
            let step_size = this.cargs[2].eval(parser.scope);

            let sx = mouse_graph.x;
            let sy = mouse_graph.y;

            parser.set('x', sx);
            parser.set('y', sy);

            let cont_v = cexpr.eval(parser.scope);

            ctx.fillText(pretty_round(cont_v), mouse.x, mouse.y-grid_size/2);

            ctx.beginPath();
            let p = cam.graph_to_screen({x: sx, y: sy});
            ctx.moveTo(p.x, p.y);

            for (let i = 0; i < steps; i++) {
                let grad = grad_2(cexpr, sx, sy);
                let perp = [grad[1], -grad[0]];
                let norm = Math.sqrt(perp[0]**2 + perp[1]**2);
                perp = [step_size * perp[0] / norm, step_size * perp[1] / norm];

                sx += perp[0];
                sy += perp[1];

                // auto correct
                /*
                for (let j = 0; j < 5; j++) {
                    parser.set('x', sx);
                    parser.set('y', sy);
                    let new_v = cexpr.eval(parser.scope);

                    let diff = new_v - cont_v;
                    grad = grad_2(cexpr, sx, sy);
                    sx -= .01 * diff * grad[0];
                    sy -= .01 * diff * grad[1];
                } */
                
                p = cam.graph_to_screen({x: sx, y: sy});
                ctx.lineTo(p.x, p.y);
            }

            ctx.stroke();

        } catch(e) {
            console.log('contour error: ');
            console.log(e);
        }

        ctx.restore();
    }

    this.draw_scatter = function(ctx, props) {
        // scatter:[x1,x2,..],[y1,y2,..]

        if (this.args.length != 2) {
            return;
        }
        
        ctx.save();
        ctx.fillStyle = rgbToHex(props.c);

        try {
            let xs = this.cargs[0].eval(parser.scope)._data;
            let ys = this.cargs[1].eval(parser.scope)._data;

            let N = xs.length;
            for (let i = 0; i < N; i++) {
                ctx.beginPath();
                p = cam.graph_to_screen({x: xs[i], y: ys[i]});
                ctx.arc(p.x, p.y, point_size, 0, pi2, 0);
                ctx.stroke();
            }
        } catch(e) {
            console.log('scatter error:');
            console.log(e);
        }

        ctx.restore();
    }

    this.draw_drag = function(ctx, props) {
        // drag:[x1,x2,..],[y1,y2,..]

        if (this.args.length != 2) {
            return;
        }
        
        ctx.save();
        ctx.fillStyle = rgbToHex(props.c);

        if (!mouse_down) {
            this.dragv1 = '';
            this.dragv2 = '';
        }

        try {
            let xs = this.cargs[0].eval(parser.scope)._data;
            let ys = this.cargs[1].eval(parser.scope)._data;
            let gp;

            let N = xs.length;
            for (let i = 0; i < N; i++) {
                ctx.beginPath();
                gp = {x: xs[i], y: ys[i]};
                p = cam.graph_to_screen(gp);
                ctx.arc(p.x, p.y, point_size, 0, pi2, 0);
                ctx.stroke();

                if (distance(mouse_graph, gp) < .5) {
                    ctx.fill();

                    if (mouse_down && !this.dragv1) {
                        // change the variables values!
                        let v1 = math.parse(this.args[0]);
                        let v2 = math.parse(this.args[1]);

                        if (v1.items) {
                            v1 = v1.items[i].name;
                            v2 = v2.items[i].name;
                        } else if(v1.name) {
                            v1 = v1.name + '['+(i+1)+']';
                            v2 = v2.name+  '['+(i+1)+']';
                        }
                        
                        this.dragv1 = v1;
                        this.dragv2 = v2;
                    }
                }

                if (this.dragv1.length) {
                    parser.eval(this.dragv1 + ' = ' + mouse_graph.x);
                    parser.eval(this.dragv2 + ' = ' + mouse_graph.y);
                }
            }
        } catch(e) {
            console.log('drag error:');
            console.log(e);
        }

        ctx.restore();
    }

    this.draw_shape = function(ctx, props) {
        // shape:gear,radius,rot
        // shape:line,expr,min,max,grid_lines

        if (this.args[0] == "gear") {
            ctx.save();

            try {
                let r = parser.eval(this.args[1]);
                let rot = parser.eval(this.args[2]);
                let p = props.p;

                
                ctx.translate(p.x, p.y);
                ctx.rotate(rot);

                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI*2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(r*2/3, 0, r/10, 0, Math.PI*2);
                ctx.stroke();
            } catch(e) {
                console.log('shape error: ' + e);
            }

            ctx.restore();
        } else if (this.args[0] == "line") {
            if (this.args.length != 5) {
                return;
            }

            let expr = this.args[1];
            let min = this.args[2];
            let max = this.args[3];
            let grid_lines = this.args[4];

            ctx.save();

            try {
                min = parser.eval(min);
                max = parser.eval(max);
                grid_lines = parser.eval(grid_lines);

                let range = max - min;
                let v = parser.eval(expr);

                let x0 = -grid_lines/2 * grid_size;
                let x1 = grid_lines/2 * grid_size;

                // draw it
                ctx.translate(props.p.x, props.p.y);
                ctx.rotate(props.r);
                ctx.scale(props.w, props.h);

                // draw the line
                ctx.beginPath();
                ctx.moveTo(x0, 0);
                ctx.lineTo(x1, 0);
                ctx.stroke();

                let stuck = v;
                if (v < min) {
                    stuck = min;
                } else if (v > max) {
                    stuck = max;
                }

                let n_per_grid = range / grid_lines;

                let lx = x0 + ((stuck-min)/range) * grid_lines * grid_size;

                ctx.fillRect(lx - 1, -grid_size/2, 2, grid_size);


                if (ctrl) {
                    ctx.fillText(expr, lx, -grid_size);
                } else {
                    ctx.fillText(pretty_round(v), lx, -grid_size);
                }

                ctx.fillText(pretty_round(min), x0, grid_size);
                ctx.fillText(pretty_round(max), x1, grid_size);

                ctx.fillRect(x0 - 1, -grid_size/4, 2, grid_size/2);
                ctx.fillRect(x1 - 1, -grid_size/4, 2, grid_size/2);
            } catch(e) {
                console.log('number line error: ' + e);
            }

            ctx.restore();
        }
    }

    this.draw_line = function(ctx, props) {        
        // line:[x1,x2,...],[y1,y2,...]
        
        ctx.save();
        ctx.fillStyle = rgbToHex(props.c);

        try {
            let xs = parser.eval(this.args[0])._data;
            let ys = parser.eval(this.args[1])._data;
            
            ctx.beginPath();
            for (let i = 0; i < xs.length; i++) {
                let p = cam.graph_to_screen({x: xs[i], y: ys[i]});
                if (i == 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
            ctx.stroke();
            
        } catch (e) {
            console.log('line error: ' + e);
        }

        ctx.restore();
    }

    this.run_for = function(ctx, props) {
        // for:indices,expression

        try {
            let indices = this.cargs[0].eval(parser.scope)._data;
            let c = this.cargs[1];
            let v = 0;

            let N = indices.length;
            for (let i = 0; i < N; i++) {
                let idx = indices[i];
                parser.set('i', Math.floor(idx));
                //let v = parser.eval(expr);
                v = c.eval(parser.scope);
            }
        } catch(e) {
            console.log('for error: ' + e);
        }
    }

    this.render = function(ctx) {

        let a = this.properties[frame];

        if (!a) {
            return;
        }

        let b = this.properties[next_frame];
        let i = interpolate(a, b);

        let pos = i.p;

        ctx.save();

        ctx.globalAlpha = i.c[3];
        ctx.fillStyle = rgbToHex(i.c);
        ctx.strokeStyle = rgbToHex(i.c);

        let should_draw_text = true;

        //cam.transform(ctx);

        let c = this.command;
        if (c == "graph") {
            this.draw_graph(ctx, i);
        /*} else if (c == "point") {
            this.draw_point(ctx, i); */
        } else if (c == "line") {
            this.draw_line(ctx, i);
        } else if (c == "scatter") {
            this.draw_scatter(ctx, i);
        } else if (c == "drag") {
            this.draw_drag(ctx, i);
        } else if (c == "tangent") {
            this.draw_tangent(ctx, i);
        } else if (c == "contour") {
            this.draw_contour(ctx, i);
        } else if (c == "tree") {
            this.draw_tree(ctx, i);
        } else if (c == "for") {
            this.run_for(ctx, i);
        } else if (c == "shape") {
            this.draw_shape(ctx, i);
            if (presenting) {
                should_draw_text = false;
            }
        } else if (c == "slide") {
            // draw slider rect
            if (presenting && this.near_mouse && !this.hidden()) {
                ctx.strokeStyle = dark;
                ctx.strokeRect(pos.x-grid_size/2, pos.y-grid_size/2, grid_size, grid_size);
            }
        }

        //cam.restore(ctx);

        if (presenting && (a.ph || b.ph)) {
            should_draw_text = false;
        }

        // text
        if (should_draw_text) {
            if (a.ge) {
                ctx.translate(cam.props.p.x, cam.props.p.y);
            }

            ctx.translate(i.p.x, i.p.y);
            ctx.rotate(i.r);
            ctx.scale(i.w, i.h);

            if (b && b.c[3] != 0 && a.t != b.t && transition.transitioning) {
                // changing text
                let constrained = Math.min(1, Math.max(0, t_ease));
                ctx.globalAlpha = 1-constrained;
                this.draw_text(ctx, a);
                ctx.globalAlpha = constrained;
                this.draw_text(ctx, b);
            } else {
                ctx.globalAlpha = i.c[3];
                this.draw_text(ctx, i);
            }
        }

        ctx.restore();
    }
}

function Camera() {
    this.default_props = {p: {x:c.width/2, y:c.height/2}, w: 1, h: 1};
    this.properties = {};
    this.properties[frame] = copy(this.default_props);

    this.mouse_drag = function(evt) {
        if (tool != "camera") {
            return;
        }

        let props = this.properties[frame];

        let p = props.p;
        let offset = {x: mouse_grid.x - mouse_grid_last.x, y: mouse_grid.y - mouse_grid_last.y};
        props.p = {x: p.x + offset.x, y: p.y + offset.y};
    }

    this.onkeydown = function(evt) {
        if (tool != "camera") {
            return;
        }

        let key = evt.key;
        this.properties[frame] = transform_props(key, this.properties[frame]);
    }

    this.update_props = function() {
        let a = this.properties[frame];
        let b = this.properties[next_frame];

        if (!a) {
            this.properties[frame] = copy(this.default_props);
            this.props = this.properties[frame];
            return;
        }

        if (a && !b) {
            this.properties[next_frame] = copy(a);
            this.props = a;
            return;
        }

        this.props = interpolate(a, b);
    }

    this.graph_to_screen = function(p) {
        return {x: p.x * grid_size * this.props.w + this.props.p.x, y: -p.y * grid_size * this.props.h + this.props.p.y};
    }

    this.screen_to_graph = function(p) {
        return {x: (p.x-this.props.p.x)/(grid_size * this.props.w), y:-(p.y - this.props.p.y)/(grid_size * this.props.h)};
    }
}

function save_state() {
    // save state
    let str = state_to_string();
    if (states.length > 0) {
        let last = states[states.length-1];
        if (str != last) {
            states.push(str);
        }
    } else {
        states = [str];
    }
}

function undo() {
    if (states.length > 0) {
        states = states.splice(0, states.length-1);
        str_to_state(states[states.length-1]);
    }
}

function guidIndex(objs, obj) {
    let N = objs.length;
    for (let i = 0; i < N; i ++) {
        let tobj = objs[i];
        if (tobj.guid == obj.guid) {
            return i;
        }
    }

    return -1;
}

function state_to_string() {
    return JSON.stringify({"num_frames": num_frames, "frame": frame, "objs": objs, "cam": cam});
}

function str_to_state(str) {
    let dict = JSON.parse(str);
    let arr = dict["objs"];

    num_frames = dict["num_frames"];
    frame = dict["frame"];
    frames.create_buttons();

    objs = text_array_to_objs(arr, true);
    cam = new Camera();
    cam.properties = dict.cam.properties;
}

function save(objs) {
    let str = state_to_string();
    var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
    let name = document.getElementById("name").value;
    saveAs(blob, name);
}

function load(evt) {

    let files = evt.target.files; // FileList object
    let f = files[0];

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            let string = e.target.result;
            str_to_state(string);
        };
    }
    )(f);

    reader.readAsText(f);
}

function text_array_to_objs(arr, keep_animation) {
    
    let new_objs = [];
    for (let i = 0; i < arr.length; i++) {
        let o = arr[i];
        let new_obj = null;

        if (o.type == "Shape") {
            new_obj = new Shape();
        } else if (o.type == "Circle") {
            new_obj = new Circle();
        } else if (o.type == "Text") {
            new_obj = new Text();
        }

        if (keep_animation) {
            new_obj.properties = o.properties;
        } else {
            new_obj.properties = {};
            new_obj.properties[frame] = o.properties[1];
            new_obj.select();
        }

        new_obj.guid = o.guid;
        
        new_objs.push(new_obj);
    }

    return new_objs;
}

function Frames(pos) {
    this.pos = pos;
    this.size = grid_size/2;

    this.frame_pos = function(i) {
        let size = (this.size + grid_size/4);
        let yoffset = (i-1) * size;
        let xoff = 0;
        let hcon = size * 30;
        while (yoffset >= hcon) {
            yoffset -= hcon;
            xoff ++;
        }
        return {x: this.pos.x + xoff * grid_size*2/3, y: this.pos.y + yoffset + grid_size/2};
    }

    this.create_buttons = function() {
        this.buttons = [];
        for (let i = 1; i <= num_frames; i++) {
            let newb = new Button(''+i, this.frame_pos(i), null);
            this.buttons.push(newb);
        }
        this.buttons.push(new Button("-", this.frame_pos(num_frames+1), null));
        this.buttons.push(new Button("+", this.frame_pos(num_frames+2), null));
    };

    this.create_buttons();

    this.mouse_down = function(evt) {
        for (let i = 0; i < this.buttons.length; i++) {
            let btn = this.buttons[i];
            if (btn.hovering()) {
                return true;
            }
        }

        return false;
    }

    this.mouse_up = function(evt) {
        for (let i = 0; i < this.buttons.length; i++) {
            let btn = this.buttons[i];
            if (btn.mouse_up(evt)) {
                if (i == this.buttons.length - 2) {
                    // remove frame

                    // remove selected frame
                    // copy properties from next frames
                    // decrement number of frames
                    if (num_frames == 1) {
                        break;
                    }

                    for (let f = frame; f <= num_frames; f ++) {
                        for (let i = 0; i < objs.length; i++) {
                            let obj = objs[i];
                            if (typeof obj.copy_properties == "function") {
                                if (!obj.properties[f]) {
                                    continue;
                                }
                                if (!obj.properties[f+1]) {
                                    continue;
                                }
                                obj.copy_properties(f+1, f);
                            }
                        }

                        if (cam.properties[f] && cam.properties[f+1]) {
                            cam.properties[f] = copy(cam.properties[f+1]);
                        }
                    }

                    num_frames -= 1;
                    this.create_buttons();
                    return true;

                } else if (i == this.buttons.length - 1) {
                    // add frame
                    // copy to next from frame
                    insert_frame();
                    return true;
                } else {
                    this.on_click(i+1);
                }
            }
        }
    }

    this.onkeydown = function(evt) {
        let key = evt.key;

        if (key == "ArrowRight") {
            if (!presenting && frame + 1 > num_frames) {
                // create a new one
                insert_frame();
            }

            transition_with_next(loop_frame(frame+1));
            return true;
        } else if (key == "ArrowLeft") {
            transition_with_next(loop_frame(frame-1));
            return true;
        }

        return false;
    }

    this.render = function(ctx) {
        for (let i = 1; i <= this.buttons.length; i++) {
            let btn = this.buttons[i-1];
            btn.selected = false;
            if (btn.text == ''+frame) {
                btn.selected = true;
            }
            btn.render(ctx);
        }
    }
}

function insert_frame() {
    num_frames += 1;
    for (let f = num_frames; f >= frame; f--) {
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.copy_properties == "function") {
                if (!obj.properties[f]) {
                    continue;
                }
                obj.copy_properties(f, f+1);
            }
        }

        if (cam.properties[f]) {
            cam.properties[f+1] = copy(cam.properties[f]);
        }
    }
    frames.create_buttons();
}

function present() {
    tool = "select";
    presenting = true;
    document.body.style.cursor = 'none';
}

function Menu(pos) {
    this.pos = pos;
    this.buttons = [];

    this.buttons.push(new Button("select", {x: 0, y: 0}, function(b) {
        enter_select();
    }));

    this.buttons.push(new Button("text", {x: 0, y: 0}, function(b) {
        tool = "text";
    }));

    this.buttons.push(new Button("split", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (typeof obj.split == "function") {
                obj.split();
            }
        }
    }));

    this.buttons.push(new Button("shape", {x: 0, y: 0}, function(b) {
        tool = "shape";
    }));

    this.buttons.push(new Button("circle", {x: 0, y: 0}, function(b) {
        tool = "circle";
    }));

    this.buttons.push(new Button("vector", {x: 0, y: 0}, function(b) {
        tool = "vector";
    }));

    this.buttons.push(new Button("delete", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            if (objs[i].is_selected()) {
                objs[i].deleted = true;
            }
        }
    }));

    this.buttons.push(new Button("clear props", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (typeof obj.clear_all_props == "function") {
                obj.clear_all_props();
            }
        }
    }));

    this.buttons.push(new Button("duplicate", {x: 0, y: 0}, function(b) {
        for (let i = objs.length-1; i >= 0; i--) {
            let obj = objs[i];
            if (typeof obj.duplicate == "function") {
                obj.duplicate();
            }
        }
    }));

    this.buttons.push(new Button("copy frame", {x: 0, y: 0}, function(b) {
        tool = "copy frame";
    }));

    this.buttons.push(new Button("hide", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (typeof obj.hide == "function") {
                obj.hide();
            }
        }
    }));

    this.buttons.push(new Button("pres. hide", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.properties && obj.is_selected()) {
                obj.properties[frame]['ph'] = true;
            }
        }
    }));

    this.buttons.push(new Button("pres. show", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.properties && obj.is_selected()) {
                obj.properties[frame]['ph'] = false;
            }
        }
    }));

    this.buttons.push(new Button("screen ele.", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.properties && obj.is_selected()) {
                let props = obj.properties[frame];
                if (props.ge == true) {
                    props.p = {x: props.p.x + cam.props.p.x, y: props.p.y + cam.props.p.y};
                    obj.properties[frame]['ge'] = false;
                }
            }
        }
    }));

    this.buttons.push(new Button("graph ele.", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.properties && obj.is_selected()) {
                let props = obj.properties[frame];
                if (!props.ge) {
                    props.p = {x: props.p.x - cam.props.p.x, y: props.p.y - cam.props.p.y};
                    obj.properties[frame]['ge'] = true;
                }
            }
        }
    }));

    this.buttons.push(new Button("camera", {x: 0, y: 0}, function(b) {
        if (tool == "camera") {
            // reset cam
            cam.properties[frame] = cam.default_props;
        }
        tool = "camera";
    }));

    this.buttons.push(new Button("present", {x: 0, y: 0}, function(b) {
        // show a cursor
        present();
    }));

    for (let i = 0; i < colors.length; i++) {

        let b = new Button("", {x: 0, y: 0}, function(b) {
            let rgb = hexToRgb(colors[i]);

            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                if (typeof obj.set_color === "function") {
                    obj.set_color(rgb);
                }
            }
        });
        b.color = colors[i];
        this.buttons.push(b);
    }

    for (let i = 0; i < this.buttons.length; i++) {
        let b = this.buttons[i];
        b.pos = {x: this.pos.x, y: this.pos.y + i * 20};
    }

    this.mouse_up = function(evt) {
        for (let i = 0; i < this.buttons.length; i++) {
            let btn = this.buttons[i];
            if (btn.mouse_up(evt)) {
                return true;
            }
        }

        return false;
    }

    this.render = function(ctx) {
        ctx.fillStyle = "#000000";
        for (let i = 0; i < this.buttons.length; i++) {
            let b = this.buttons[i];
            b.selected = false;
            if (b.text == tool) {
                b.selected = true;
            }
            b.render(ctx);
        }
    };
}

function Transition() {
    this.steps = 0;
    this.step = 0;
    this.transitioning = false;
    this.target_frame = 0;
    this.complete;

    this.run = function(steps, target_frame, completion) {
        if (this.transitioning) {
            return;
        }

        t_percent = 0.0;
        t_ease = 0.0;
        this.steps = steps;
        this.target_frame = target_frame;
        this.transitioning = true;
        this.completion = completion;
    }

    this.update = function() {
        if (this.transitioning) {
            this.step += 1;
            t_percent = this.step / this.steps;
            parser.set('_t', t_percent);
            t_ease = ease_in_out(t_percent);
            parser.set('_tt', t_ease);
            t_ease = sigmoid(t_percent, 1.2, -.4, 14) - sigmoid(t_percent, .2, -.6, 15);
            if (this.step >= this.steps) {
                t_percent = 1.0;
                t_ease = 1.0;
                this.completion(this.target_frame);
                this.step = 0;
                this.transitioning = false;
            }
        }
    }
}

function constrain_frame(f) {
    return Math.max(1, Math.min(num_frames, f));
}

function loop_frame(f) {
    if (f >= num_frames + 1) {
        return 1;
    } else if (f < 1) {
        return num_frames;
    }

    return f;
}

function draw_grid(ctx) {

    ctx.save();
    ctx.strokeStyle = grid;

    // render grid
    let r_num = 10;
    let c_num = 10;
    let tick_size = grid_size/4;
    let x = 0; let y = 0;
    
    ctx.beginPath();
    for (let i = -r_num; i <= r_num; i++) {
        y = i * grid_size * cam.props.h + cam.props.p.y;
        ctx.moveTo(cam.props.p.x + tick_size, y);
        ctx.lineTo(cam.props.p.x - tick_size, y);
    }

    for (let j = -c_num; j <= c_num; j++) {
        x = j * grid_size * cam.props.w + cam.props.p.x;
        ctx.moveTo(x, cam.props.p.y + tick_size);
        ctx.lineTo(x, cam.props.p.y - tick_size);
    }
    ctx.stroke();
    

    // draw center
    ctx.beginPath();

    let hs = cam.graph_to_screen({x: -c_num, y: 0});
    let he = cam.graph_to_screen({x: c_num, y: 0});
    ctx.moveTo(hs.x, hs.y);
    ctx.lineTo(he.x, he.y);

    let vs = cam.graph_to_screen({x: 0, y: -r_num});
    let ve = cam.graph_to_screen({x: 0, y: r_num});
    ctx.moveTo(vs.x, vs.y);
    ctx.lineTo(ve.x, ve.y);

    ctx.strokeStyle = grid_guide;
    ctx.stroke();

    ctx.restore();

    /*
    if (!presenting) {
        ctx.beginPath();
        ctx.strokeStyle = grid_guide;
        ctx.moveTo(mouse_grid.x, 0);
        ctx.lineTo(mouse_grid.x, c.height);
        ctx.moveTo(0, mouse_grid.y);
        ctx.lineTo(c.width, mouse_grid.y);
        ctx.stroke();
    } */
}

function transition_with_next(next) {
    if (transition.transitioning) {
        return;
    }

    if (next > num_frames) {
        return;
    }

    if (tool == "copy frame") {
        enter_select();
        // copy properties
        for (let i = 0; i < objs.length; i ++) {
            let obj = objs[i];
            if (typeof obj.copy_properties === "function") {
                obj.copy_properties(frame, next);
            }
        }

        return;
    }

    new_line = null;
    next_frame = next;
    change_frames();
    let steps = t_steps;
    if (!presenting) {
        // make it instant when menu open
        steps = 0;
    }

    transition.run(steps, next, function(targ) {
        frame = targ;
        parser.set('frame', frame);

        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (typeof obj.parse_text == 'function') {
                obj.parse_text(obj.properties[frame].t);
            }
        }
    });
}

function enter_select() {
    tool = "select";
    new_line = null;
}

function draw_cursor() {
    if (presenting && mouse_time > 0) {
        // draw a cursor

        let mx = mouse.x;
        let my = mouse.y;

        ctx.save();
        ctx.translate(mx, my);
        ctx.strokeStyle = dark;
        ctx.beginPath();

        if (mouse_down) {
            mouse_time = mouse_duration;
            
            ctx.arc(0, 0, 10, 0, pi2, 0);
            
        } else {
            let pad = 20;

            if (tool == "camera") {
                ctx.moveTo(-pad, 0);
                ctx.lineTo(pad, 0);
                ctx.moveTo(0, -pad);
                ctx.lineTo(0, pad);
            } else {
                ctx.moveTo(pad, 0);
                ctx.lineTo(0, 0);
                ctx.lineTo(0, pad);
                ctx.moveTo(0, 0);
                ctx.lineTo(pad, pad);
            }
        }

        ctx.stroke();
        ctx.restore();
    }
}

window.onload = function() {
    
    c = document.createElement("canvas");
    c.width = 1280;
    c.height = 720;

    ctx = c.getContext("2d");
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var content = document.getElementById("content");
    content.appendChild(c);

    document.getElementById("save").onclick = function(evt) {
        save(objs);
        return false;
    };

    document.getElementById("file").onchange = function(evt) {
        enter_select();
        load(evt);
    };

    document.getElementById("load_to_frame").onclick = function(evt) {
        let text = document.getElementById("selected_objects_text").value;
        let arr = JSON.parse(text);
        objs = objs.concat(text_array_to_objs(arr, false));
    };

    document.getElementById("load_formula_text").onclick = function(evt) {
        let t = document.getElementById("formula_text").value;
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.change_text == "function" && obj.is_selected()) {
                obj.change_text(t);
            }
        }
    };

    objs = [];

    transition = new Transition();
    frame = 1;
    frames = new Frames({x: c.width - grid_size*2, y: grid_size/4});
    frames.on_click = function(idx) {
        transition_with_next(idx);
    };

    menu = new Menu({x: grid_size/4, y: grid_size/2});
    cam = new Camera();

    window.onkeydown = function(evt) {
        let key = evt.key;


        if (presenting && tool != "camera" && key == "Escape") {
            presenting = false;
            document.body.style.cursor = '';
            return false;
        }

        if (key == "Escape") {
            enter_select();
        }

        if (key == "Meta") {
            meta = true;
        }

        if (key == "Control") {
            ctrl = true;
        }

        if (key == "Backspace") {
            if (ctrl) {
                let N = objs.length;
                for (let i = 0; i < N; i++) {
                    let obj = objs[i];
                    if (obj.is_selected()) {
                        obj.deleted = true;
                    }
                }
            }
        }

        if (key == "z" && meta) {
            undo();
            return;
        }

        if (key == "p" && ctrl) {
            present();
            return true;
        }

        if (document.getElementById("formula_text") == document.activeElement) {
            return true;
        }

        let captured = false;
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];

            if (typeof obj.onkeydown === 'function') {
                if (obj.onkeydown(evt)) {
                    captured = true;
                    if (key == "ArrowUp" || key == "ArrowDown") {
                        // stops text selection from propagating as you iterate the array
                        break;
                    }
                }
            }
        }

        if (captured) {
            return false;
        }

        if (frames.onkeydown(evt)) {
            return false;
        }

        cam.onkeydown(evt);

        if (key == " ") {
            return false;
        }

        if (tool == "select" && evt.srcElement == document.body) {
            tools = {'t': 'text', 's': 'shape', 'c': 'camera', 'v': 'vector'};
            if (key in tools) {
                tool = tools[key];
            }
        }

        
        if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(Number(key)) != -1) {
            if (!transition.transitioning) {
                transition_with_next(Number(key));
            }
        }
    };

    window.onkeyup = function(evt) {
        let key = evt.key;
        if (key == "Meta") {
            meta = false;
        }

        if (key == "Control") {
            ctrl = false;
        }

        save_state();
    }

    window.onmousedown = function(evt) {
        if (evt.srcElement != c) {
            return;
        }

        mouse_down = true;
        mouse_start = get_mouse_pos(c, evt);

        try {
            math.compile('click()').eval(parser.scope);
        } catch(e) {

        }

        if (presenting) {
            return false;
        }

        for (let i = objs.length-1; i >= 0; i--) {
            let obj = objs[i];
            if (typeof obj.mouse_down === 'function') {
                if (obj.mouse_down(evt)) {
                    break;
                }
            }
        }

        if (frames.mouse_down()) {
            return;
        }

        // didn't touch an obj, if tool is move start a rect
        let obj_selected = false;
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            if (objs[i].is_selected()) {
                obj_selected = true;
            }
        }

        if (tool == "select" && obj_selected == false) {
            selecting = true;
        }
    };

    window.onmousemove = function(evt) {
        // update mouse
        mouse = get_mouse_pos(c, evt);
        mouse_grid = constrain_to_grid(mouse);
        mouse_graph = cam.screen_to_graph(mouse);

        parser.set('x', mouse_graph.x);
        parser.set('y', mouse_graph.y);

        if (mouse_down) {
            let captured = false;
            let N = objs.length;
            for (let i = 0; i < N; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_drag === 'function') {
                    captured = obj.mouse_drag(evt) || captured;
                }
            }
            if (!captured) {
                cam.mouse_drag(evt);
            }
        } else {
            let N = objs.length;
            for (let i = 0; i < N; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_move === 'function') {
                    obj.mouse_move(evt);
                }
            }
        }

        if (presenting) {
            mouse_time = mouse_duration;
        }


        mouse_last = get_mouse_pos(c, evt);
        mouse_grid_last = constrain_to_grid(mouse);
    };

    window.onmouseup = function(evt) {
        if (evt.srcElement != c) {
            return;
        }

        mouse_down = false;

        if (presenting) {
            // maybe tap some text
            let N = objs.length;
            for (let i = 0; i < N; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_up === 'function') {
                    obj.mouse_up(evt);
                }
            }

            return false;
        }

        if (frames.mouse_up(evt)) {
            return;
        }

        if (menu.mouse_up(evt)) {
            new_line = null;
            selecting = false;

            save_state();
            return;
        }

        if (tool == "select") {
            let N = objs.length;
            for (let i = 0; i < N; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_up === 'function') {
                    obj.mouse_up(evt);
                }
            }
        } else if (tool == "text") {
            // add a num obj at mouse pos
            let n = new Text("", mouse_grid);

            let N = objs.length;
            for (let i = 0; i < N; i++) {
                let obj = objs[i];
                if (typeof obj.is_selected == "function") {
                    obj.selected = false;
                }
            }

            n.select();
            objs.push(n);
        } else if (tool == "shape" || tool == "vector") {
            // add a num obj at mouse pos
            if (new_line) {
                // add a point
                new_line.add_point({x: mouse_grid.x, y: mouse_grid.y});
            } else {
                let l = new Shape([0, 0, 0, 1], [{x: mouse_grid.x, y: mouse_grid.y}]);

                if (tool == "vector") {
                    l.properties[frame].v = true;
                } else if (tool == "circle") {
                    l.properties[frame].circle = true;
                }

                objs.push(l);
                new_line = l
            }

            return;
        } else if (tool == "circle") {
            let new_circle = new Circle([0, 0, 0, 1], mouse_grid);
            objs.push(new_circle);
        }

        if (selecting) {
            selecting = false;

            let x = mouse_start.x;
            let y = mouse_start.y;
            let x2 = mouse.x;
            let y2 = mouse.y;

            xx = Math.min(x, x2);
            yy = Math.min(y, y2);
            xx2 = Math.max(x, x2);
            yy2 = Math.max(y, y2);

            let selected_objs = [];

            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                if (typeof obj.in_rect === 'function') {
                    obj.in_rect(xx, yy, xx2, yy2);
                    if (obj.is_selected()) {
                        selected_objs.push(obj);
                    }
                }
            }

            let scopy = copy(selected_objs);
            for (let i = 0; i < scopy.length; i++) {
                let obj = scopy[i];
                let props = copy(obj.properties[frame]);
                obj.properties = {1: props};
            }

            if (scopy.length > 0) {
                // store as text rep
                let string = JSON.stringify(scopy);
                document.getElementById("selected_objects_text").value = string;
            }

            save_state();
            return false;
        }

        save_state();
    }

    save_state();

    var fps = 60;
    animate();
    function animate() {
        setTimeout(function() {
            requestAnimationFrame(animate);
        }, 1000/fps);

        parser.set('t', t);

        if (presenting) {
            mouse_time -= 1;
        }

        ctx.clearRect(0, 0, c.width, c.height);

        cam.update_props();

        draw_grid(ctx);

        ctx.font = font_anim;

        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.command == "e" || obj.new) {
                obj.eval();
            }
        }

        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            obj.render(ctx);
        }

        for (let i = objs.length-1; i >= 0; i--) {
            let obj = objs[i];
            if (obj.deleted) {
                objs.splice(i, 1);
            }
        }

        if (selecting) {
            // draw a rect
            ctx.strokeStyle = dark;
            ctx.strokeRect(mouse_start.x, mouse_start.y, mouse.x - mouse_start.x, mouse.y - mouse_start.y);
        }

        ctx.font = font_menu;

        if (!presenting) {
            frames.render(ctx);
            menu.render(ctx);
        }

        draw_cursor();
        
        transition.update();

        if (playing) {
            transition_with_next(loop_frame(frame + 1));
        }

        t += 1;
    }
}