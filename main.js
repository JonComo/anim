// colors
var gray = "#cccccc";
var grid = "#eeeeee";
var grid_guide = "#dddddd";
var graph_guide = "#aaaaaa";
var dark = "#000000";
var light = "#ffffff";

var colors = ["#000000", "#E74C3C", "#2980B9"];

var font_menu = "20px Courier";
var font_anim = "32px Menlo";

var c;
var ctx;

var animator;
var objs = [];
var frames;
var menu;
var num_frames = 3;
var frame; // current frame
var next_frame;
var playing;
var rendering = false;
var presenting = false;

var t_ease;
var t_steps = 60;

var grid_size = 40;
var menu_time = 0;
var mouse_time = 0;
var menu_duration = 200;

var tool = "select";
var selected = false;
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

var parser = math.parser();

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
    if (b == null) {
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
    this.radius = 20;
    this.color = "";
    
    this.hovering = function() {
        return distance(this.pos, mouse) < this.radius;
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
        if (this.color.length) {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.fillRect(this.pos.x - this.radius/2, this.pos.y - this.radius/2, this.radius, this.radius);
            ctx.restore();
        }

        ctx.fillText(this.text, this.pos.x, this.pos.y);
        if (this.hovering() || tool == this.color) {
            ctx.fillRect(this.pos.x - this.radius/2, this.pos.y + 10, this.radius, 2);
        }
    }
}

function Shape(color, path) {
    this.type = "Shape";
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
                selected = true;
            }
        }

        return found;
    }

    this.onkeydown = function(evt) {
        let key = evt.key;
        if (this == new_line) {
            tool = "select";
            new_shape = null;
            return true;
        }

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
            selected = true;
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
        if (this.selected_indices.length > 0) {
            if (tool == "hide") {
                this.hide();
            }
        }

        this.selected_indices = [];
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

        if (tool == "hide") {
            return false;
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
        let p = props.p;
        
        return distance(p, mouse) < grid_size/2
    }

    this.in_rect = function(x, y, x2, y2) {
        if (this.hidden()) {
            return false;
        }

        let props = this.properties[frame];
        let p = props.p;

        if (p.x > x && p.x < x2 && p.y > y && p.y < y2) {
            this.selected = true;
            selected = true;
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
            selected = true;
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
        if (this.selected) {
            if (tool == "hide") {
                this.hide();
            }
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
    this.properties = {};
    this.properties[frame] = {t: text, p: pos, c: [0, 0, 0, 1], w: 1, h: 1, r: 0};

    this.edited = false;
    this.selected = false;

    this.select = function() {
        this.selected = true;
    }

    this.is_selected = function() {
        return this.selected;
    }

    this.duplicate = function() {
        if (!this.selected) {
            return;
        }

        let newc = new Text(null, null);
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
        
        return this.properties[frame].c[3] == 0;
    }

    this.in_rect = function(x, y, x2, y2) {
        if (this.hidden()) {
            return false;
        }

        let p = this.properties[frame].p;
        if (p.x > x && p.y > y && p.x < x2 && p.y < y2) {
            this.selected = true;
            selected = true;
            return true;
        }

        return false;
    }

    this.near_mouse = function () {
        let p = this.properties[frame].p;
        return distance(p, mouse) < grid_size/4;
    }

    this.onkeydown = function(evt) {
        if (!this.selected) {
            return false;
        }

        let key = evt.key;

        if (key == "ArrowLeft" || key == "ArrowRight") {
            return false;
        }

        if (ctrl) {
            this.properties[frame] = transform_props(key, this.properties[frame]);
            return false;
        }

        let text = this.properties[frame].t;

        if (!this.edited) {
            this.edited = true;
            text = "";
        }

        if (key == 'Backspace') {
            text = text.slice(0, text.length-1);
        } else if (key.length == 1) {
            text = text + key;
        }

        this.change_text(text);

        return true;
    }

    this.change_text = function(text) {
        let changed = this.properties[frame].t != text;

        this.properties[frame].t = text;

        if (changed) {
            // reeval it

            try {
                parser.eval(text);
            } catch (e) {

            }

            let uw = 16;
            let uh = 9;

            if (text.slice(0, 6) == "graph:") {
                // regenerate path
                
                try {
                    let expr = text.slice(6);
                    console.log(expr);
                    let path = [];
                    for (let xx = -uw; xx <= uw; xx += .1) {
                        parser.set('x', xx);
                        let y = parser.eval(expr);
                        y = Math.max(Math.min(y, 1000), -1000);
                        path.push({x: grid_size * xx, y: -grid_size * y});
                    }

                    this.properties[frame].path = path;

                } catch (error) {
                    console.log(error);
                }
            }
        }
    }

    this.mouse_down = function(evt) {
        if (this.hidden()) {
            return false;
        } 

        if (this.near_mouse()) {
            this.selected = true;
            selected = true;
            return true;
        }

        return false;
    }

    this.mouse_drag = function(evt) {
        let props = this.properties[frame];
        if (!props) {
            return false;
        }

        let pos = props.p;

        if (tool == "select" && this.selected) {
            // shift it
            let p = this.properties[frame].p;
            let offset = {x: mouse_grid.x - mouse_grid_last.x, y: mouse_grid.y - mouse_grid_last.y};
            this.properties[frame].p = {x: p.x + offset.x, y: p.y + offset.y};
        }
    }

    this.mouse_up = function(evt) {
        if (this.selected) {
            if (tool == "hide") {
                this.hide();
                this.selected = false;
            }

            if (!this.near_mouse()) {
                this.selected = false;
            }
        }
    }

    this.graphing = function(props) {
        if (props && props.t && (props.t.slice(0, 8) == "tangent:" || props.t.slice(0, 6) == "graph:")) {
            return true;
        }

        return false;
    }

    this.draw_text = function(ctx, props) {

        let exponent = false;

        let t = props.t;
        let N = t.length;

        let chars = 0;
        for (let i = 0; i < N; i++) {
            if (t[i] == "*") {
                chars += 1;
            } else if (t[i] == "^" && t[i+1] == "(") {
                i += 1;
                exponent = true;
            } else if (t[i] == ")" && exponent) {
                exponent = false;
            } else {
                chars += 1;
            }
        }


        let xoff = -Math.round((chars-1)/2 * grid_size/2);

        ctx.fillStyle = rgbToHex(props.c);

        exponent = false;
        for (let i = 0; i < N; i++) {
            if (t[i] == "*") {
                ctx.beginPath();
                
                ctx.arc(xoff, 2, 4, 0, 2 * Math.PI, 0);
                ctx.fill();
                xoff += grid_size/2;
            } else if (t[i] == "^" && t[i+1] == "(") {
                i += 1;
                exponent = true;
            } else if (t[i] == ")" && exponent) {
                exponent = false;
            } else {
                let yoff = 0;
                if (exponent) {
                    yoff = -grid_size/2;
                }

                ctx.fillText(t[i], xoff, yoff);
                xoff += grid_size/2;
            }
        }
    }

    this.draw_graph = function(ctx, props) {
        let path = props.path;

        if (path == null) {
            return;
        }

        // graph it

        // graph the path

        let off = {x: c.width/2, y: c.height/2};

        ctx.translate(off.x, off.y);

        ctx.beginPath();

        for (let i = 0; i < path.length; i++) {
            let p = path[i];
            
            if (i == 0) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }

        ctx.stroke();

        // show where mouse is
        if (presenting && mouse_down) {
            ctx.strokeStyle = graph_guide;

            ctx.beginPath();

            ctx.moveTo(mouse.x - off.x, -off.y);
            ctx.lineTo(mouse.x - off.x, c.height - off.y);

            let iright = path.length-1;
            for (let i = 0; i < path.length; i++) {
                if (path[i].x > mouse.x - off.x) {
                    iright = i;
                    break;
                }
            }

            let ileft = iright - 1;

            if (ileft < 0) {
                ileft = 0;
                iright = 1;
            }

            let xdiff = (path[iright].x) - (mouse.x - off.x);
            let i = xdiff / (path[iright].x - path[ileft].x);

            let yout = (1 - i) * path[iright].y + i * path[ileft].y;

            ctx.moveTo(-off.x, yout);
            ctx.lineTo(c.width - off.x, yout);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mouse.x - off.x, yout, grid_size/2, 0, 2 * Math.PI, 0);
            ctx.stroke();

            ctx.fillText(Math.round(100 * (mouse.x - off.x)/grid_size)/100, mouse.x - off.x, off.y - 40);
            ctx.fillText(Math.round(100 * (-yout)/grid_size)/100, off.x - 60, yout - 20);
        }

        ctx.translate(-off.x, -off.y);
    }

    this.draw_tangent = function(ctx, props) {
        if (props.t.slice(0, 8) != "tangent:") {
            return;
        }

        try {
            let expr = props.t.slice(8);

            console.log(expr);

            let off = {x: c.width/2, y: c.height/2};

            ctx.translate(off.x, off.y);

            let inx = (mouse.x - c.width/2)/grid_size;

            parser.set('x', inx);
            let p0 = {x: inx * grid_size, y: -parser.eval(expr) * grid_size};

            inx += 0.0001;
            parser.set('x', inx);
            let p1 = {x: inx * grid_size, y: -parser.eval(expr) * grid_size};

            let slope = (p1.y - p0.y)/(p1.x - p0.x);

            let s = 100;
            let p0_extend = {x: p0.x - s * grid_size, y: p0.y - s * grid_size * slope};
            let p1_extend = {x: p0.x + s * grid_size, y: p0.y + s * grid_size * slope};

            let path = [p0_extend, p1_extend];

            console.log(path);

            // for (let xx = -uw; xx <= uw; xx += uw) {
            //     let y = math.eval(expr, {x: xx});
            //     y = Math.max(Math.min(y, 1000), -1000);
            //     path.push({x: grid_size * xx, y: -grid_size * y});
            // }

            ctx.beginPath();

            for (let i = 0; i < path.length; i++) {
                let p = path[i];
                
                if (i == 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }

            ctx.stroke();

            ctx.translate(-off.x, -off.y);

        } catch (error) {
            console.log(error);
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

        if (presenting && this.graphing(a)) {
            // graphing
            this.draw_graph(ctx, i);
            this.draw_tangent(ctx, i);

        } else {
            // text
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
                this.draw_text(ctx, i);
            }
        }

        ctx.restore();

        // draw rect
        if (!presenting && !this.hidden() && (this.selected || this.near_mouse())) {
            ctx.strokeStyle = dark;
            ctx.strokeRect(pos.x-grid_size/2, pos.y-grid_size/2, grid_size, grid_size);
        }
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

function state_to_string() {
    return JSON.stringify({"num_frames": num_frames, "frame": frame, "objs": objs});
}

function str_to_state(str) {
    let dict = JSON.parse(str);
    let arr = dict["objs"];

    num_frames = dict["num_frames"];
    frame = dict["frame"];
    frames.create_buttons();

    objs = text_array_to_objs(arr, true);
}

function save(objs) {
    let str = state_to_string();
    var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
    let name = document.getElementById("name").value;
    saveAs(blob, name);
}

function load(evt, keep_animation) {

    let files = evt.target.files; // FileList object
    let f = files[0];

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            let string = e.target.result;

            let dict = JSON.parse(string);
            let arr = dict["objs"];

            if (keep_animation) {
                num_frames = dict["num_frames"];
                frames.create_buttons();
            }

            let new_objs = text_array_to_objs(arr, keep_animation);

            if (keep_animation) {
                objs = new_objs;
            } else {
                objs = objs.concat(new_objs);
            }
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
        
        new_objs.push(new_obj);
    }

    return new_objs;
}

function Frames(pos) {
    this.pos = pos;
    this.pad = 8;
    this.size = 32;

    this.frame_pos = function(i) {
        let size =  (this.size + this.pad);
        let yoffset = (i) * size;
        let xoff = 0;
        let hcon = size * 15;
        while (yoffset > hcon) {
            yoffset -= hcon;
            xoff ++;
        }
        return {x: this.pos.x + xoff * 50, y: this.pos.y + yoffset};
    }

    this.create_buttons = function() {
        this.buttons = [];
        for (let i = 1; i <= num_frames; i++) {
            let newb = new Button(i, this.frame_pos(i), null);
            this.buttons.push(newb);
        }
        this.buttons.push(new Button("-", this.frame_pos(num_frames+1), null));
        this.buttons.push(new Button("+", this.frame_pos(num_frames+2), null));
    };

    this.create_buttons();

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
                    }

                    num_frames -= 1;
                    this.create_buttons();
                    return true;

                } else if (i == this.buttons.length - 1) {
                    // add frame
                    // copy to next from frame
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
                    }
                    this.create_buttons();
                    return true;
                } else {
                    this.on_click(i+1);
                }
            }
        }
    }

    this.render = function(ctx) {
        ctx.fillText('frames', this.pos.x, this.pos.y);

        for (let i = 1; i <= this.buttons.length; i++) {
            ctx.strokeStyle = gray;
            if (i == frame) {
                ctx.strokeStyle = dark;
            }
            let rectp = this.frame_pos(i);
            ctx.strokeRect(rectp.x - this.size/2, rectp.y - this.size/2, this.size, this.size);

            let btn = this.buttons[i-1];
            btn.render(ctx);
        }
    }
}

function Menu(pos) {
    this.pos = pos;
    this.buttons = [];

    this.buttons.push(new Button("menu", {x: 0, y: 0}, function(b) {
        menu_time = 0;
    }));

    this.buttons.push(new Button("select", {x: 0, y: 0}, function(b) {
        tool = "select";
    }));

    this.buttons.push(new Button("text", {x: 0, y: 0}, function(b) {
        tool = "text";
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
        for (let i = 0; i < objs.length; i++) {
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
        tool = "hide";

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.hide == "function") {
                obj.hide();
            }
        }
    }));

    this.buttons.push(new Button("present", {x: 0, y: 0}, function(b) {
        // show a cursor
        menu_time = 0;
        presenting = true;
        document.body.style.cursor = 'none';
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
        b.pos = {x: this.pos.x, y: this.pos.y + i * 40};
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
        for (let i = 0; i < this.buttons.length; i++) {
            let b = this.buttons[i];
            b.render(ctx);
            if (b.text == tool) {
                ctx.beginPath();
                ctx.strokeStyle = dark;
                ctx.moveTo(b.pos.x - 10, b.pos.y + 10);
                ctx.lineTo(b.pos.x + 10, b.pos.y + 10);
                ctx.stroke();
            }
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
            t_ease = ease_in_out(t_percent);
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
    ctx.strokeStyle = grid;
    // render grid
    let r_num = c.height / grid_size;
    let c_num = c.width / grid_size;
    let x = 0; let y = 0;
    
    ctx.beginPath();
    for (let i = 0; i < r_num; i++) {
        y = i * grid_size;
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
    }

    for (let j = 0; j < c_num; j++) {
        x = j * grid_size;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, c.height);
    }
    ctx.stroke();

    // draw center
    ctx.beginPath();
    ctx.moveTo(c.width/2.0, 0);
    ctx.lineTo(c.width/2.0, c.height);
    ctx.moveTo(0, c.height/2.0);
    ctx.lineTo(c.width, c.height/2.0);

    ctx.strokeStyle = grid_guide;
    ctx.stroke();

    if (menu_time > 0) {
        ctx.beginPath();
        ctx.strokeStyle = grid_guide;
        ctx.moveTo(mouse_grid.x, 0);
        ctx.lineTo(mouse_grid.x, c.height);
        ctx.moveTo(0, mouse_grid.y);
        ctx.lineTo(c.width, mouse_grid.y);
        ctx.stroke();
    }
}

function transition_with_next(next) {
    if (next > num_frames) {
        return;
    }

    if (tool == "copy frame") {
        tool = "select";
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
    if (menu_time > 0) {
        // make it instant when menu open
        steps = 0;
    }

    transition.run(steps, next, function(targ) {
        frame = targ;
    });
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
        tool = "select";
        load(evt, true);
    };

    document.getElementById("import").onchange = function(evt) {
        tool = "select";
        load(evt, false);
    };

    document.getElementById("load_to_frame").onclick = function(evt) {
        let text = document.getElementById("selected_objects_text").value;
        let arr = JSON.parse(text);
        objs = objs.concat(text_array_to_objs(arr, false));
        selected = true;
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
    frames = new Frames({x: c.width - 200, y: 50});
    frames.on_click = function(idx) {
        transition_with_next(idx);
    };

    menu = new Menu({x: 100, y: 50});

    window.onkeydown = function(evt) {
        let key = evt.key;

        if (key == "Meta") {
            meta = true;
        }

        if (key == "z" && meta) {
            undo();
            return;
        }

        if (document.getElementById("formula_text") == document.activeElement) {
            return true;
        }

        if (presenting && key == "Escape") {
            presenting = false;
            document.body.style.cursor = '';
            return false;
        }

        if (key == "Control") {
            ctrl = true;
        }

        let captured = false;
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];

            if (typeof obj.onkeydown === 'function') {
                if (obj.onkeydown(evt)) {
                    captured = true;
                }
            }
        }

        if (captured) {
            return false;
        }

        if (key == " ") {
            return false;
        }

        if (key == "ArrowRight") {
            transition_with_next(loop_frame(frame+1));
            return false;
        } else if (key == "ArrowLeft") {
            transition_with_next(loop_frame(frame-1));
            return false;
        } else if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(Number(key)) != -1) {
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
        mouse_down = true;
        mouse_start = get_mouse_pos(c, evt);

        if (presenting) {
            return false;
        }

        for (let i = objs.length-1; i >= 0; i--) {
            let obj = objs[i];
            if (typeof obj.mouse_down === 'function') {
                if (obj.mouse_down(evt)) {
                    console.log('touched ' + obj);
                    break;
                }
            }
        }

        // didn't touch an obj, if tool is move start a rect
        if (tool == "select" && selected == false) {
            selecting = true;
        }
    };

    window.onmousemove = function(evt) {
        // update mouse
        mouse = get_mouse_pos(c, evt);
        mouse_grid = constrain_to_grid(mouse);

        if (presenting) {
            mouse_time = 20;
            return false;
        }

        menu_time = menu_duration;

        if (mouse_down) {
            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_drag === 'function') {
                    obj.mouse_drag(evt);
                }
            }
        }

        mouse_last = get_mouse_pos(c, evt);
        mouse_grid_last = constrain_to_grid(mouse);
    };

    window.onmouseup = function(evt) {
        mouse_down = false;

        if (presenting) {
            return false;
        }

        frames.mouse_up(evt);

        if (menu.mouse_up(evt)) {
            new_line = null;
            selecting = false;

            save_state();
            return;
        }

        if (tool == "select") {
            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_up === 'function') {
                    obj.mouse_up(evt);
                }
            }
        } else if (tool == "text") {
            // add a num obj at mouse pos
            let n = new Text("0", mouse_grid);
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

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.mouse_up === 'function') {
                obj.mouse_up(evt);
            }
        }

        selected = false;
        if (selecting) {
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

            selecting = false;

            save_state();
            return false;
        }

        if (tool == "hide") {
            tool = "select";
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

        if (presenting) {
            menu_time = 0;
            mouse_time -= 1;
        }

        ctx.clearRect(0, 0, c.width, c.height);

        draw_grid(ctx);

        if (menu_time > 0) {
            menu_time -= 1;
        }

        ctx.font = font_anim;

        let N = objs.length;
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

        if (menu_time > 0) {
            frames.render(ctx);
            menu.render(ctx);
        }

        if (presenting && mouse_time > 0) {
            // draw a cursor

            let mx = mouse.x;
            let my = mouse.y;
            
            ctx.strokeStyle = dark;

            if (mouse_down) {
                mouse_time = 20;
                ctx.beginPath();
                ctx.arc(mx, my, 10, 0, Math.PI * 2.0, 0);
                ctx.stroke();
            } else {
                let pad = 20;
                ctx.beginPath();
                ctx.moveTo(mx + pad, my);
                ctx.lineTo(mx, my);
                ctx.lineTo(mx, my + pad);
                ctx.moveTo(mx, my);
                ctx.lineTo(mx + pad, my + pad);
                ctx.stroke();
            }
            
        }
        
        transition.update();

        if (playing) {
            transition_with_next(loop_frame(frame + 1));
        }
    }
}