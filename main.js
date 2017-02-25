// colors
var gray = "#cccccc";
var grid = "#dddddd";
var dark = "#000000";
var light = "#ffffff";

var c;
var ctx;
var animator;
var mouse = {x: 0, y: 0};
var mouse_grid = {x: 0, y: 0};
var mouse_down = false;
var frames;
var num_frames = 10;
var frame; // current frame
var next_frame;

var t_linear; // transition percent
var t_ease;

var grid_size = 40;

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
        console.log('Recording');
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

function get_mouse_grid_pos() {
    return {x: Math.floor((mouse.x + grid_size/2) / grid_size) * grid_size, y: Math.floor((mouse.y + grid_size/2) / grid_size) * grid_size};
}

function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function ease_in_out(x) {
    return 1.0 / (1.0 + Math.exp(-(x-.5)*10));
}

function Text(text, pos) {
    this.text = text;
    this.pos = pos;

    this.render = function(ctx) {
        ctx.fillText(this.text, this.pos.x, this.pos.y);
    }
}

function Button(text, pos, callback) {
    this.text = text;
    this.pos = pos;
    this.callback = callback;
    this.radius = 20;
    
    this.hovering = function() {
        return distance(this.pos, mouse) < this.radius;
    }

    this.mouse_click = function(evt) {
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
        ctx.fillText(this.text, this.pos.x, this.pos.y);
        if (this.hovering()) {
            ctx.fillRect(this.pos.x - this.radius/2, this.pos.y + 10, this.radius, 2);
        }
    }
}

function Shape(pos, style, path) {
    this.pos = pos;
    this.paths = {0: path};
    this.style = style;
    this.drag_idx = -1;

    this.cur_path = function() {
        let path = this.paths[frame];
        let next_path = this.paths[next_frame];

        if (path == undefined) {
            path = this.paths[loop_frame(frame-1)].slice(0); // copy array
            this.paths[frame] = path;
        }

        return path;
    }

    this.blend_path = function() {
        let path = this.paths[frame];
        let next_path = this.paths[next_frame];

        if (path == undefined || next_path == undefined) {
            return null;
        }

        let new_path = [];

        for (let i = 0; i < path.length; i++) {
            let a = path[i];
            let b = next_path[i];

            let abx = a[0] * (1-t_ease) + b[0] * t_ease;
            let aby = a[1] * (1-t_ease) + b[1] * t_ease;

            new_path.push([abx, aby]);
        }

        return new_path;
    }

    this.closest_point_idx = function() {
        let path = this.cur_path();
        for (let i = 0; i < path.length; i++) {
            let parr = path[i];
            let p = {x: parr[0] + this.pos.x, y: parr[1] + this.pos.y};

            if (distance(p, mouse) < 10) {
                return i;
            }
        }

        return -1;
    }

    this.mouse_down = function(evt) {
        this.drag_idx = this.closest_point_idx();
    }

    this.mouse_drag = function(evt) {
        let path = this.cur_path();
        if (this.drag_idx != -1) {
            // drag that
            path[this.drag_idx] = [mouse_grid.x - this.pos.x, mouse_grid.y - this.pos.y];
        }
    }

    this.mouse_up = function(evt) {
        this.drag_idx = -1;
    }

    this.render = function(ctx) {
        ctx.strokeStyle = style;
        ctx.beginPath();

        let idx;
        if (this.drag_idx != -1) {
            idx = this.drag_idx;
        } else {
            idx = this.closest_point_idx();
        }

        let path = this.blend_path();

        if (path == undefined) {
            path = this.cur_path();
        }

        for (let i = 0; i < path.length; i++) {
            let parr = path[i];
            let p = {x: parr[0] + this.pos.x, y: parr[1] + this.pos.y};
            

            if (i == 0) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }

            if (i == idx) {
                ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
            }
        }
        ctx.stroke();
    }
}

function Frames(num, pos) {
    this.num = num;
    this.pos = pos;
    this.pad = 8;
    this.size = 32;

    this.frame_pos = function(i) {
        return {x: this.pos.x, y: this.pos.y + i * (this.size + this.pad)};
    }

    this.buttons = [];
    for (let i = 0; i < this.num; i++) {
        let newb = new Button(i, this.frame_pos(i), null);
        this.buttons.push(newb);
    }

    this.mouse_click = function(evt) {
        for (let i = 0; i < this.num; i++) {
            let btn = this.buttons[i];
            if (btn.mouse_click(evt)) {
                this.on_click(i);
            }
        }
    }

    this.render = function(ctx) {
        ctx.fillText('frames', this.pos.x, this.pos.y - 32);

        for (let i = 0; i < this.num; i++) {
            ctx.strokeStyle = gray;
            if (i == frame) {
                ctx.strokeStyle = dark;
            }
            let rectp = this.frame_pos(i);
            ctx.strokeRect(rectp.x - this.size/2, rectp.y - this.size/2, this.size, this.size);

            let btn = this.buttons[i];
            btn.render(ctx);
        }
    }
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
    return Math.max(0, Math.min(num_frames-1, f));
}

function loop_frame(f) {
    if (f >= num_frames) {
        return 0;
    } else if (f < 0) {
        return num_frames-1;
    }

    return f;
}

function draw_grid() {
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
}

window.onload = function() {
    
    c = document.createElement("canvas");
    c.width = 1280;
    c.height = 720;

    ctx = c.getContext("2d");
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.font = "20px Courier";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var content = document.getElementById("content");
    content.appendChild(c);

    var objs = [];

    transition = new Transition();
    frame = 0;
    frames = new Frames(num_frames, {x: 50, y: 55});
    frames.on_click = function(idx) {
        next_frame = idx;
        transition.run(20, idx, function(targ) {
            frame = targ;
        });
        //frame = idx;
    };

    let shape1 = new Shape({x: 200, y: 200}, dark, [[0, 0], [20, 20], [-20, 20], [0, 0]]);
    objs.push(shape1);

    let shape2 = new Shape({x: 300, y: 200}, gray, [[0, 0], [20, 20], [-20, 20], [0, 0]]);
    objs.push(shape2);

    let shape3 = new Shape({x: 600, y: 200}, dark, [[0, 0], [20, 20], [-20, 20], [0, 0]]);
    objs.push(shape3);

    window.onkeydown = function(evt) {
        let key = evt.key;
        if (key == "ArrowRight") {
            frame = loop_frame(frame + 1);
        } else if (key == "ArrowLeft") {
            frame = loop_frame(frame - 1);
        }
    };
    
    window.onclick = function(evt) {
        frames.mouse_click(evt);

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.mouse_click === 'function') {
                obj.mouse_click(evt);
            }
        }
    }

    window.onmousedown = function(evt) {
        mouse_down = true;

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.mouse_down === 'function') {
                obj.mouse_down(evt);
            }
        }
    };

    window.onmousemove = function(evt) {
        // update mouse
        mouse = get_mouse_pos(c, evt);
        mouse_grid = get_mouse_grid_pos();

        if (mouse_down) {
            for (let i = 0; i < objs.length; i++) {
                let obj = objs[i];
                if (typeof obj.mouse_drag === 'function') {
                    obj.mouse_drag(evt);
                }
            }
        }
    };

    window.onmouseup = function(evt) {
        mouse_down = false;

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.mouse_up === 'function') {
                obj.mouse_up(evt);
            }
        }
    }

    var fps = 60;
    animate();
    function animate() {
        setTimeout(function() {
            requestAnimationFrame(animate);
        }, 1000/fps);

        ctx.clearRect(0, 0, c.width, c.height);

        if (mouse_down) {
            draw_grid();
        }

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            obj.render(ctx);
        }

        frames.render(ctx);
        transition.update();
    }
}