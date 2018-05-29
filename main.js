// colors
var gray = "#cccccc";
var grid = "#eeeeee";
var grid_guide = "#dddddd";
var graph_guide = "#aaaaaa";
var dark = "#000000";
var light = "#ffffff";

var colors = ["#000000", "#E74C3C", "#2980B9", "#FFA400", "#66E07A", gray];

var font_small = "26px Courier";
var font_menu = "30px Courier";
var font_anim = "40px Menlo";
var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
if (!isMac) {
    font_anim = "40px Courier New";
}

var scale_factor = 2; // retina

// scatter
var point_size = 6;

var c;
var ctx;
var formula_text;

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
var debug = false;

var t_ease = 0;
var t_steps = 60;

var grid_size = 45;
var mouse_time = 0;
var mouse_duration = 40;

var tool = "select";
var selecting = false;
var new_line;
var text_copied;

var mouse_down = false;
var ctrl = false;
var meta = false;
var shift = false;
var mouse = {x: 0, y: 0};
var mouse_last = {x: 0, y: 0};
var mouse_start = {x: 0, y: 0};
var mouse_grid = {x: 0, y: 0};
var mouse_last_grid = {x: 0, y: 0};
var mouse_graph = {x: 0, y: 0};

var brackets = {"(": 1, "[": 1, ")": -1, "]": -1};

var t = 0; // time for parser
var millis = 0;
var date = new Date();

var pi2 = 2 * Math.PI;

// fn drawing
let char_size = grid_size/2;
let char_pad = grid_size/4;

var parser = math.parser();
parser.set('frame', frame);

// custom functions!
function sig(x) {
    return 1/(1+math.exp(-x));
}

function sigp(x) {
    return math.exp(-x)/math.pow(1+math.exp(-x), 2);
}

// http://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
// Maxwell Collard
function randn_bm() {
    var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// cache
var matrix_cache = {};
function cached(dims) {
    let s = dims.join('_');
    let m = matrix_cache[s];
    if (!m) {
        m = math.matrix(math.zeros(dims));
        matrix_cache[s] = m;
    }

    return m;
}

// import
function graph(fn, d1, d2, d3) { // graphs y=f(x) from -10 to 10
    let y = 0;
    let p; let gp;
    let N = 400;
    let points = cached([N+1, 3]);
    let asyms = cached([N+1, 1])._data;
    let pd = points._data;

    let dx = 20/N;

    let i = 0;
    let x = -10;
    let y_last = fn(x)
    for (; x < 10; x += dx) {
        y = fn(x);

        pd[i][d1] = x;
        pd[i][d2] = Math.max(Math.min(y, 10000), -10000);
        pd[i][d3] = 0;

        asyms[i] = 0;
        if (math.abs(y-y_last) > 20) {
            // vertical asymptote
            asyms[i] = 1;

            pd[i-1][d2] = math.sign(pd[i-1][d2]) * 1000;
            pd[i][d2] = math.sign(y) * 1000;
        }

        y_last = y;
        i ++;
    }

    points = cam.graph_to_screen_mat(points);

    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        p = points[i];

        if (asyms[i]) {
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            continue;
        }

        if (i == 0) {
            ctx.moveTo(p[0], p[1]);
        } else {
            ctx.lineTo(p[0], p[1]);
        }
    }
    ctx.stroke();
}

function para(r, tmin, tmax, units) { // graphs x=f(t) y=g(t) z=h(t) from tmin to tmax, units shows markers every 1 increment in t
    let N = 300;
    let points = cached([N+1, 3]);
    let pd = points._data;

    let dt = (tmax-tmin)/N;

    let i = 0;
    let data;

    for (let t = tmin; t <= tmax; t += dt) {
        data = r(t)._data;

        data[0] = Math.max(Math.min(data[0], 1000), -1000);
        data[1] = Math.max(Math.min(data[1], 1000), -1000);
        data[2] = Math.max(Math.min(data[2], 1000), -1000);

        pd[i][0] = data[0];
        pd[i][1] = data[1];
        pd[i][2] = data[2];
        
        i ++;
    }

    points = cam.graph_to_screen_mat(points);

    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        p = points[i];
        if (i == 0) {
            ctx.moveTo(p[0], p[1]);
        } else {
            ctx.lineTo(p[0], p[1]);
        }
    }
    ctx.stroke();

    if (units) {
        let num_dots = tmax-tmin;
        num_dots = Math.floor(num_dots);
        
        if (num_dots > 0) {
            let dots = cached([num_dots, 3]);
            
            let i = 0;

            for (i=0; i < num_dots; i++) {
                data = r(i+1)._data;
        
                    data[0] = Math.max(Math.min(data[0], 1000), -1000);
                    data[1] = Math.max(Math.min(data[1], 1000), -1000);
                    data[2] = Math.max(Math.min(data[2], 1000), -1000);
            
                    dots._data[i][0] = data[0];
                    dots._data[i][1] = data[1];
                    dots._data[i][2] = data[2];
            }

            dots = cam.graph_to_screen_mat(dots);


            ctx.save();
            for (let i = 0; i < num_dots; i++) {
                p = dots[i];
                
                ctx.beginPath();
                ctx.arc(p[0], p[1], 4, 0, pi2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}

math.import({
    loop: function(fn, count) { // function of index 0 to count-1
        if (count <= 0) {
            return;
        }

        for (let i = 0; i < count; i ++) {
            fn(i);
        }
    },
    fifo: function(matrix, value) {
        matrix = matrix._data;
        let first = matrix[0];
        let N = matrix.length;
        for (let i = 0; i < N-1; i++) {
            matrix[i] = matrix[i+1];
        }
        matrix[N-1] = value;

        return math.matrix(matrix);
    },
    push: function(matrix, value) {
        matrix = matrix._data;
        matrix.push(value);
        return math.matrix(matrix);
    },
    dims: function(m) {
        return math.matrix(m.size());
    },
    surface: function(fn) {
        let d = 21; let d2 = d/2;
        let dims = [d*d, 3];
        let m = cached(dims);
        let md = m._data;

        let xin = 0; let zin = 0; let yout = 0;
        let i = 0;
        for (let x = 0; x < d; x ++) {
            for (let z = 0; z < d; z ++) {
                xin = (x-d2)+.5;
                zin = (z-d2)+.5;
                yout = fn(xin, zin);
                md[i][0] = xin;
                md[i][1] = yout;
                md[i][2] = zin;
                i += 1;
            }
        }

        md = cam.graph_to_screen_mat(m);
        
        i = 0;
        for (let x = 0; x < d; x ++) {
            ctx.beginPath();
            let xc = md[i][0];
            let yc = md[i][1];
            ctx.moveTo(xc, yc);

            for (let z = 0; z < d; z ++) {
                xc = md[i][0];
                yc = md[i][1];

                ctx.lineTo(xc, yc);

                i += 1;
            }

            ctx.stroke();

            ctx.beginPath();
            xc = md[x][0];
            yc = md[x][1];
            ctx.moveTo(xc, yc);

            for (let j = 0; j < dims[0]; j += d) {
                xc = md[x+j][0];
                yc = md[x+j][1];

                ctx.lineTo(xc, yc);
            }

            ctx.stroke();
        }
    },
    surfacez: function(fn) {
        let d = 21; let d2 = d/2;
        let dims = [d*d, 3];
        let m = cached(dims);
        let md = m._data;

        let a = 0; let b = 0;
        let i = 0;
        for (let x = 0; x < d; x ++) {
            for (let z = 0; z < d; z ++) {
                a = (x-d2)+.5;
                b = (z-d2)+.5;
                md[i][0] = a;
                md[i][1] = b;
                md[i][2] = fn(a, b);
                i += 1;
            }
        }

        md = cam.graph_to_screen_mat(m);
        
        i = 0;
        for (let x = 0; x < d; x ++) {
            ctx.beginPath();
            let xc = md[i][0];
            let yc = md[i][1];
            ctx.moveTo(xc, yc);

            for (let z = 0; z < d; z ++) {
                xc = md[i][0];
                yc = md[i][1];

                ctx.lineTo(xc, yc);

                i += 1;
            }

            ctx.stroke();

            ctx.beginPath();
            xc = md[x][0];
            yc = md[x][1];
            ctx.moveTo(xc, yc);

            for (let j = 0; j < dims[0]; j += d) {
                xc = md[x+j][0];
                yc = md[x+j][1];

                ctx.lineTo(xc, yc);
            }

            ctx.stroke();
        }
    },
    randn: function() { // no args: random normal, 1 arg shape: dims of matrix to return
        let N = arguments.length;
        if (N == 1) {
            let shape = arguments[0];
            let m = cached(shape._data);
            m = m.map(function (value, index, matrix) {
                return randn_bm();
            });

            return m;
        }
        return randn_bm();
    },
    axes: function(x,y,z) { // replace default camera axis names
        cam.axes_names = [x,y,z];
    },
    block: function() { // exectutes each argument
    },
    rotation: function(rx, ry, rz) { // creates a 3x3 rotation matrix
        return math.matrix(rotation_matrix(rx, ry, rz));
    },
    grid: function(rangex, rangey) { // returns matrix x*y by 2
        if (!rangey) {
            rangey = rangex;
        }

        let xd = rangex._data;
        let yd = rangey._data;
        let xN = xd.length; let yN = yd.length;
        let m = cached([xN*yN, 2]);

        let idx = 0;

        for (let i = 0; i < xN; i ++) {
            
            for (let j = 0; j < yN; j ++) {
                let row = m._data[idx];
                row[0] = xd[i];
                row[1] = yd[j];
                idx += 1;
            }
        }

        return m;
    },
    rotate: function(rx, ry, rz) { // rotates the camera
        let rxyz = [rx, ry, rz];
        if (!isNaN(math.sum(rxyz))) {
            cam.properties[frame].rxyz = rxyz;
        } else {
            cam.properties[frame].rxyz = [0, 0, 0];
        }
    },
    T: function(m) { // transpose m
        return math.transpose(m);
    },
    scatter: function(points, point_size, color_fn) { // points [[x1, y1, z1], ...], psize, color([x,y,z])=[r,g,b] 0 <= r <= 1
        let size = points.size();
        let n = size[0];
        let points_d = points._data;

        let psize = 8;
        if (arguments.length >= 2) {
            psize = arguments[1];
        }
        let psize_half = psize/2;

        let cam_data = cam.graph_to_screen_mat(points);
        
        ctx.save();
        if (arguments.length == 3) {
            // gradation

            var indices = new Array(n);
            for (var i = 0; i < n; ++i) indices[i] = i;
            
            indices.sort(function(a, b) {
                a = cam_data[a][2];
                b = cam_data[b][2];
                return a < b ? 1 : (a > b ? -1 : 1);
            });
            
            let col;
            for (let j = 0; j < n; j++) {
                let i = indices[j];

                let p = points_d[i];

                // constrain
                col = color_fn(p)._data;
                col = [constrain(col[0]), constrain(col[1]), constrain(col[2])];
                ctx.fillStyle = rgbToHex(math.multiply(col, 255));
                ctx.fillRect(cam_data[i][0]-psize_half, cam_data[i][1]-psize_half, psize, psize);
            }
        } else {
            for (let i = 0; i < n; i++) {
                ctx.fillRect(cam_data[i][0]-psize_half, cam_data[i][1]-psize_half, psize, psize);
            }
        }
        ctx.restore();
    },
    point: function(a, size, color) { // point [x,y,z] size color[r,g,b]
        let psize = 8;
        if (size){ 
            psize = size;
        }

        if (psize <= 0) {
            return;
        }

        if (color) {
            color = color._data;
            color = [constrain(color[0]), constrain(color[1]), constrain(color[2])];
        }

        let cam_data = cam.graph_to_screen_mat(math.matrix([a]))[0];
        
        ctx.save();
        ctx.beginPath();
        if (color) {
            ctx.fillStyle = rgbToHex(math.multiply(color, 255));
        }
        ctx.arc(cam_data[0], cam_data[1], psize, 0, pi2);
        ctx.fill();

        ctx.restore();
    },
    graph: function(fn) { // graphs y=f(x)
        graph(fn, 0, 1, 2);
    },
    paral: function(r, tmin, tmax, units) { // parametric line, graphs r(t)=[f(t), g(t), h(t)] from t=tmin to tmax
        para(r, tmin, tmax, units);
    },
    graphxy: function(fn) { // graphs y=f(x)
        graph(fn, 0, 1, 2);
    },
    graphyx: function(fn) { // graphs x=f(y)
        graph(fn, 1, 0, 2);
    },
    graphxz: function(fn) {
        graph(fn, 0, 2, 1);
    },
    graphyz: function(fn) {
        graph(fn, 1, 2, 0);
    },
    shape: function(points, fill) { // draws line from point to point [[x1,y1,z1], ...], draws arrow
        let N = points.size()[0];
        points = cam.graph_to_screen_mat(points);

        ctx.save();
        ctx.beginPath();
        let p; let lastp;
        for (let i = 0; i < N; i ++) {
            p = points[i];
            if (i == 0) {
                ctx.moveTo(p[0], p[1]);
            } else {
                ctx.lineTo(p[0], p[1]);
            }

            lastp = p;
        }
        ctx.stroke();
        if (fill) {
            col = fill._data;
            col = [constrain(col[0]), constrain(col[1]), constrain(col[2])];
            ctx.fillStyle = rgbToHex(math.multiply(col, 255));
            ctx.globalAlpha = .8;
            ctx.fill();
        }
        ctx.restore();
    },
    vect: function(a, b) {

        if (!a) {
            return;
        }

        _x = 0;
        _y = 0;
        _z = 0;

        x = 0;
        y = 0;
        z = 0;

        if ('re' in a && a.im) {
            a = math.matrix([a.re, a.im]);
        }

        if (b && b.re && b.im) {
            b = math.matrix([b.re, b.im]);
        }

        if (!b) {
            x = a._data[0];
            y = a._data[1];
            
            if (a.size()[0] == 3) {
                z = a._data[2];
            }
        } else {
            _x = a._data[0];
            _y = a._data[1];
            
            if (a.size()[0] == 3) {
                _z = a._data[2];
            }

            x = b._data[0];
            y = b._data[1];
            
            if (b.size()[0] == 3) {
                z = b._data[2];
            }
        }

        draw_vect(_x, _y, _z, x, y, z);
    },
    if: function(fn_condition, fn_a, fn_b) { // if fn_condition() == true then fn_a() else fn_b()
        if (fn_condition()) {
            fn_a();
        } else {
            fn_b();
        }
    },
    list: function(fn, array) { // [fn(v) for v in array]
        let N = array.size()[0];
        let d = array._data;

        let v = fn(d[0])._data;
        // get return size
        let dims = [N, v.length];
        
        let m = cached(dims);
        let md = m._data;

        for (let i = 0; i < N; i++) {
            v = fn(d[i]);
            let vd = v._data;

            if (vd) {
                let vN = vd.length;
                for (let j = 0; j < vN; j++) {
                    md[i][j] = vd[j];
                }
            } else {
                md[i] = v;
            }
        }

        return m;
    },
    view: function(x, p) { // matrix, position: [x, y, z]

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

        if (p) {
            p = p._data;
        } else {
            p = [0, 0];
        }
        
        p = cam.graph_to_screen(p[0], p[1], 0);
        for (let i = 0; i < t.length; i++) {
            ctx.textAlign = 'left';
            ctx.fillText(t[i], p[0], p[1] + grid_size * i);
        }
    },
    labels: function(labels, points) { // render labels ["l1", ...] at [[x1, y1, z1], ...]
        points = cam.graph_to_screen_mat(points);
        let N = labels.size()[0];
        let p;
        ctx.save();
        ctx.textAlign = 'center';
        for (let i = 0; i < N; i++) {
            p = points[i];
            ctx.fillText(labels._data[i], p[0], p[1]);
        }
        ctx.restore();
    },
    sig: function(x) { // sigmoid(x)
        if (x._data) {
            var b = x.map(function (value, index, matrix) {
                return sig(value);
            });
            return b;
        }

        return sig(x);
    },
    sigp: function(x) { // sigmoid_prime(x)
        if (x._data) {
            var b = x.map(function (value, index, matrix) {
                return sigp(value);
            });
            return b;
        }

        return sigp(x);
    },
    field: function(f, _n, _uv) { // plots a vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
        let n = 10;
        let uv = false;
        
        if (arguments.length >= 2) {
            n = _n-1;

            if (n <= 0) {
                n = 1;
            }
        }

        if (arguments.length >= 3 && _uv == true) {
            uv = true;
        }

        let d = 20 / n;

        for (let x = -10; x <= 10; x+=d) {
            for (let y = -10; y <= 10; y+=d) {
                for (let z = -10; z <= 10; z+=d) {
                    let v = f(x,y,z)._data;
                    if (uv) {
                        let n = math.norm(v);
                        v = [v[0]/n, v[1]/n, v[2]/n];
                    }

                    draw_vect(x, y, z, x+v[0], y+v[1], z+v[2]);
                }
            }
        }
    },
    fielda: function(f, _n, _uv) { // plots an animated vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
        let n = 10;
        let uv = false;
        
        let mod = .2;
        let flo = (t/500)%mod;

        if (arguments.length >= 3) {
            n = _n-1;

            if (n <= 0) {
                n = 1;
            }
        }

        if (arguments.length >= 4 && _uv == true) {
            uv = true;
        }

        let d = 20 / n;

        ctx.save();
        ctx.globalAlpha = math.sin(flo/mod * math.PI);

        for (let x = -10; x <= 10; x+=d) {
            for (let y = -10; y <= 10; y+=d) {
                for (let z = -10; z <= 10; z+=d) {
                    let v = f(x,y,z)._data;
                    if (uv) {
                        let n = math.norm(v);
                        v = [v[0]/n, v[1]/n, v[2]/n];
                    }

                    a = cam.graph_to_screen(x + flo*v[0], y + flo*v[1], z + flo*v[2]);

                    ctx.beginPath();
                    ctx.arc(a[0], a[1], 5, 0, pi2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    },
    paras: function(r, _ur, _vr, _n=1, f) { // parametric surface r(u,v) with optional field f
        let n = 10;

        if (_ur <= 0 || _vr <= 0 || n <= 0) {
            return;
        }

        if (arguments.length >= 4) {
            n = _n;
        }

        let du = _ur/n;
        let dv = _vr/n;

        ctx.save();

        let u = 0;
        let v = 0;

        for (let i = 0; i <= n; i ++) {
            u = du * i;

            ctx.beginPath();
            for (let j = 0; j <= n; j ++) {
                v = dv * j;

                let p = r(u, v)._data;
                let camp = cam.graph_to_screen(p[0], p[1], p[2]);            
                if (v == 0) {
                    ctx.moveTo(camp[0], camp[1]);
                } else {
                    ctx.lineTo(camp[0], camp[1]);
                }
            }
            ctx.stroke();
        }

        for (let i = 0; i <= n; i ++) {
            v = dv * i;

            ctx.beginPath();
            for (let j = 0; j <= n; j ++) {

                u = du * j;
                let p = r(u, v)._data;
                let camp = cam.graph_to_screen(p[0], p[1], p[2]);            
                if (u == 0) {
                    ctx.moveTo(camp[0], camp[1]);
                } else {
                    ctx.lineTo(camp[0], camp[1]);
                }
            }
            ctx.stroke();
        }

        if (f) {
            for (let i = 0; i <= n; i ++) {
                u = du * i;
    
                for (let j = 0; j <= n; j ++) {
                    v = dv * j;
    
                    let p = r(u, v)._data;
                    
                    let vect = f(p[0], p[1], p[2])._data;
                    draw_vect(p[0], p[1], p[2], p[0]+vect[0], p[1]+vect[1], p[2]+vect[2]);
                }
            }
        }

        ctx.restore();
    },
    integral: function(f, a, b, _n) {
        let n = 10000;
        if (arguments.length >= 4) {
            n = _n;
        }

        let dx = (b-a)/n;
        let sum = 0;
        for (let x = a; x <=b; x+= dx) {
            sum += f(x) * dx;
        }

        return sum;
    },
    der: function(f, _h) { // return derivative approximation function _h = dx default .001
        let h = .001;
        if (arguments.length >= 2) {
            h = _h;
        }
        
        return function g(a) {
            return (f(a+h)-f(a))/h;
        }
    }
});

// undo
var states = [];

function rgb1ToHex(a) {
    let c = [Math.round(a[0]*255), 
            Math.round(a[1]*255),
            Math.round(a[2]*255)];
    return rgbToHex(c);
}

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

function draw_r(o, p, d) {
    // o tree object
    // p position
    // d should draw, false to just get the size

    let text = '';
    let argc = 0;
    let args;

    if (o && o.args) {
        args = o.args;
        argc = args.length;
    }

    let size = {w: 0, h: 0};

    if (args) {
        
        if (o.name && o.name.length) {
            text = o.name;
        } else if (o.op && o.op.length) {
            text = o.op;
        }
        
        if (text == "+" || text == "-" || text == "*") {
            if (argc == 1) {
                if (d) ctx.fillText(text, p.x, p.y);
                let s1 = draw_r(args[0], {x: p.x + char_size, y: p.y}, d);

                size.w = s1.w + char_size;
                size.h = s1.h;
            } else if (argc == 2) {
                // draw on the left and the right

                let center = false; // false -> bottom align
                let pad2 = char_pad * 2;
                if (text == "*") {
                    pad2 = 0;
                }

                let s1 = draw_r(args[0], {x: 0, y: 0}, false);
                let s2 = draw_r(args[1], {x: 0, y: 0}, false);

                size.w = s1.w + text.length * char_size + 2*pad2 + s2.w;
                size.h = Math.max(s1.h, s2.h);

                if (d) {
                    let opp = {x: 0, y: 0};
                    if (center) {
                        s1 = draw_r(args[0], {x: p.x, y: p.y + size.h/2 - s1.h/2}, d);
                        opp = {x: p.x + s1.w + pad2, y: p.y + size.h/2 - char_size};
                        s2 = draw_r(args[1], {x: p.x + s1.w + pad2 + text.length*char_size + pad2, y: p.y + size.h/2 - s2.h/2}, d);
                    } else {
                        // bottom align
                        s1 = draw_r(args[0], {x: p.x, y: p.y + size.h - s1.h}, d);
                        opp = {x: p.x + s1.w + pad2, y: p.y + size.h - char_size*2};
                        s2 = draw_r(args[1], {x: p.x + s1.w + pad2 + text.length*char_size + pad2, y: p.y + size.h - s2.h}, d);
                    }
                    
                    if (text == "*") {
                        ctx.beginPath();
                        ctx.arc(opp.x + char_size/2, opp.y+char_size, 3, 0, pi2);
                        ctx.fill();
                    } else {
                        ctx.fillText(text, opp.x, opp.y);
                    }
                }
            }
        } else if (text == "^") {
            if (argc == 2) {
                // draw on the left and the right, shifted up!
                let a = args[0];
                let b = args[1];

                if (b.content) {
                    b = b.content;
                }

                let s1 = draw_r(a, {x: 0, y: 0}, false);
                let s2 = draw_r(b, {x: 0, y: 0}, false);

                size.w = s1.w + s2.w;
                size.h = s1.h + s2.h - char_size;

                if (d) {
                    draw_r(a, {x: p.x, y: p.y + size.h - s1.h}, d);
                    draw_r(b, {x: p.x + s1.w, y: p.y}, d);
                }
            }
        } else if (text == "/") {
            if (argc == 2) {
                // draw on top and bottom
                let a = args[0]; let b = args[1];

                // remove unnecessary parens
                if (a.content) {
                    a = a.content;
                }

                if (b.content) {
                    b = b.content;
                }

                let s1 = draw_r(a, {x: 0, y: 0}, false);
                let s2 = draw_r(b, {x: 0, y: 0}, false);

                size.w = Math.max(s1.w, s2.w) + char_pad*2;
                size.h = Math.max(s1.h, s2.h)*2 + char_pad*4;

                if (d) {

                    draw_r(a, {x: p.x + size.w/2 - s1.w/2, y: p.y + size.h/2 - s1.h - char_pad*2}, d);
                    draw_r(b, {x: p.x + size.w/2 - s2.w/2, y: p.y + size.h/2 + char_pad*2}, d);

                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y + size.h/2);
                    ctx.lineTo(p.x + size.w, p.y + size.h/2);
                    ctx.stroke();
                }
            }
        } else if (text == "!") {
            let s1 = draw_r(args[0], {x: p.x, y: p.y}, d);
            if (d) ctx.fillText(text, p.x + s1.w, p.y);

            size.w = s1.w + char_size;
            size.h = s1.h;
        } else if (o.fn) {
            // function call
            let h = 0;

            // get height of all args
            let N = args.length;
            let hs = [];
            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(args[i], {x: 0, y: 0}, false);
                hs.push(s1);

                h = Math.max(h, s1.h);
            }

            size.h = h;

            // draw it
            text = o.name + "(";
            let cally = p.y + size.h/2 - char_size;

            if (d) {
                for (let i = 0; i < text.length; i ++) {
                    ctx.fillText(text[i], p.x+i*char_size, cally);
                }
            }

            let xo = text.length * char_size;

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(args[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i == N-1) {
                    if (d) ctx.fillText(")", p.x + xo, cally);
                } else {
                    if (d) ctx.fillText(",", p.x + xo, cally);
                }
                
                xo += char_size;
            }

            size.w = xo;
        }

    } else {
        // no args

        if (o.name && o.name.length) {
            text = o.name;
        } else if (o.value) {
            text = o.value;
        } else {
            text = '?';
        }
        
        if (o.content) {
            // parens
            let s1 = draw_r(o.content, {x: 0, y: 0}, false);
            //ctx.save();
            //ctx.scale(1, s1.h/(char_size*2));
            if (d) ctx.fillText("(", p.x, p.y + s1.h/2-char_size);
            if (d) ctx.fillText(")", p.x + s1.w + char_size, p.y + s1.h/2-char_size);
            //ctx.restore();

            s1 = draw_r(o.content, {x: p.x + char_size, y: p.y}, d);

            size.w = s1.w + char_size*2;
            size.h = s1.h;
        } else if (o.node) {
            size = draw_r(o.node, {x: p.x, y: p.y}, d);
        } else if (o.object && o.value) {
            // assignment
            
            let s1 = draw_r(o.value, {x: 0, y: 0}, false);
            let text = o.object.name + " = ";

            if (d) {
                ctx.save();
                ctx.translate(p.x, p.y + s1.h/2-char_size);
                draw_simple(text);
                ctx.restore();
                
                draw_r(o.value, {x: p.x + text.length*char_size, y: p.y}, d);
            }

            size.w = s1.w + text.length * char_size;
            size.h = s1.h;
        } else if (o.blocks) {
            // block

            let items = o.blocks;
            let h = 0;

            // get height of all args
            let N = items.length;
            let hs = [];
            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: 0, y: 0}, false);
                hs.push(s1);

                h = Math.max(h, s1.h);
            }

            size.h = h;

            // draw it
            let cally = p.y + size.h/2 - char_size;
            let xo = 0;

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i != N-1) {
                    if (d) ctx.fillText(";", p.x + xo, cally);
                }
                xo += char_size;
            }

            xo -= char_size;

            size.w = xo;

        } else if (o.items) {
            // array

            let items = o.items;
            let h = 0;

            // get height of all args
            let N = items.length;
            let hs = [];
            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: 0, y: 0}, false);
                hs.push(s1);

                h = Math.max(h, s1.h);
            }

            size.h = h;

            // draw it
            let cally = p.y + size.h/2 - char_size;
            let xo = char_size; // first open bracket

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i != N-1) {
                    if (d) ctx.fillText(",", p.x + xo, cally);
                }
                xo += char_size;
            }

            ctx.save();
            ctx.scale(1, size.h/(char_size*2));
            if (d) ctx.fillText("[", p.x, cally);
            if (d) ctx.fillText("]", p.x + xo - char_size, cally);
            ctx.restore();

            size.w = xo;

        } else if (o.expr) {
            // function definition
            let s1 = draw_r(o.expr, {x: 0, y: 0}, false);

            text = o.name;
            text += "(" + o.params.join(",") + ") = ";

            if (d) {
                ctx.save();
                ctx.translate(p.x, p.y + s1.h - char_size*2);
                draw_simple(text);
                ctx.restore();
            }

            let xo = text.length*char_size;

            draw_r(o.expr, {x: p.x + xo, y: p.y}, d);

            size.w = xo + s1.w;
            size.h = s1.h;

        } else {
            if (d) {
                let N = text.length;
                for (let i = 0; i < N; i ++) {
                    ctx.fillText(text[i], p.x + i*char_size, p.y);
                }
            }
            
            size.w = text.length * char_size;
            size.h = char_size * 2;
        }
    }

    if (debug && d) ctx.strokeRect(p.x, p.y, size.w, size.h);

    return size;
}

function draw_vect(_x, _y, _z, x, y, z) {
    a = cam.graph_to_screen(_x, _y, _z);
    b = cam.graph_to_screen(x, y, z);
    
    a = {x: a[0], y: a[1]};
    b = {x: b[0], y: b[1]};
    
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    
    // draw an arrow head
    let theta = Math.atan2(b.y - a.y, b.x - a.x);

    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(theta - Math.PI*3/4) * 15, b.y + Math.sin(theta - Math.PI*3/4) * 15);
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(theta + Math.PI*3/4) * 15, b.y + Math.sin(theta + Math.PI*3/4) * 15);
    ctx.stroke();
}

function draw_simple(text) {
    for (let i = 0; i < text.length; i++) {
        if (text[i] == "*") {
            ctx.beginPath();
            ctx.arc(i * char_size + char_size/2, 0, 3, 0, pi2);
            ctx.fill();
        } else {
            ctx.fillText(text[i], i * char_size, 0);
        }
    }
    return text.length * char_size;
}

let cache_fn = {};
function draw_fn(fn) {

    let tree;

    if (cache_fn[fn]) {
        tree = cache_fn[fn];
    } else {
        try {
            tree = math.parse(fn);
        } catch(e) {

        }

        if (tree) {
            cache_fn[fn] = tree;
        }
    }

    if (!tree) {
        return {w: 0, h: 0};
    }

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let size = draw_r(tree, {x: 0, y: 0}, false);
    draw_r(tree, {x: 0, y: -size.h/2}, true);
    ctx.restore();

    return size;
}

function get_mouse_pos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * scale_factor,
        y: (evt.clientY - rect.top) * scale_factor
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

function rotation_matrix(rx, ry, rz) {
    let Rx = [[1,        0,        0],
                  [0, Math.cos(rx), -Math.sin(rx)],
                  [0, Math.sin(rx), Math.cos(rx)]];

    let Ry = [[Math.cos(ry),   0, Math.sin(ry)],
            [0, 1, 0],
            [-Math.sin(ry), 0, Math.cos(ry)]];

    let Rz = [[Math.cos(rz), -Math.sin(rz), 0],
            [Math.sin(rz), Math.cos(rz), 0],
            [0, 0, 1]];

    return math.multiply(math.multiply(Rx, Ry), Rz);
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

function transform_props(key, props, step=.2) {

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
        } else if (key == "rxyz") {
            let ar = a[key];
            let br = b[key];
            interp[key] = [0, 0, 0];
            for (let i = 0; i < 3; i ++) {
                interp[key][i] = (1-t_ease) * ar[i] + t_ease * br[i];
            }
        } else if (key == "c") {
            // interpolate colors
            let ac = a[key];
            let bc = b[key];
            interp[key] = interpolate_colors(ac, bc, constrain(t_ease));
        } else if (key == "path") {
            // interpolate paths
            let ap = a[key];
            let bp = b[key];
            let N = ap.length;
            let ip = new Array(N);
            for (let i = 0; i < N; i ++) {
                let newp = {x: (1-t_ease) * ap[i].x + t_ease * bp[i].x,
                            y: (1-t_ease) * ap[i].y + t_ease * bp[i].y};
                ip[i] = newp;
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

function interpolate_colors(ac, bc, interp) {
    let same = true;
    let N = ac.length;
    for (let i = 0; i < N; i++) {
        if (ac[i] != bc[i]) {
            same = false;
        }
    }

    if (same) {
        return ac;
    }

    let ic = new Array(N);

    for (let i = 0; i < N; i++) {
        ic[i] = (1-interp) * ac[i] + interp * bc[i];
    }

    return ic;
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
        if (!shift) {
            this.selected_indices = [];
        }
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

        let props;
        if (transition.transitioning) {
            props = interpolate(a, b);
        } else {
            props = a;
        }

        ctx.beginPath();

        this.draw_path(props);

        ctx.save();
        ctx.globalAlpha = props.c[3];

        ctx.strokeStyle = rgbToHex(props.c);
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
        if (!shift) {
            this.selected = false;
        }
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

        let props;
        if (transition.transitioning) {
            props = interpolate(a, b);
        } else {
            props = a;
        }

        ctx.save();

        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        this.draw_ellipse(props, ctx);
        ctx.globalAlpha = props.c[3];
        ctx.strokeStyle = rgbToHex(props.c);
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
    this.cursor = 0;
    this.cursor_selection = 0;
    this.command = "";
    this.args = [];
    this.cargs = []; // compiled arguments
    this.text_val = "";
    this.matrix_vals = [];
    this.near_mouse = false;
    this.size = {w:0, h:0}; // pixel width and height

    this.select = function() {
        this.selected = true;
        formula_text.value = this.properties[frame].t;
    }

    this.is_selected = function() {
        return this.selected;
    }

    this.selection_indices = function() {
        let s = Math.min(this.cursor, this.cursor_selection);
        let e = Math.max(this.cursor, this.cursor_selection);
        return {s: s, e: e};
    }

    this.text_selected = function() {
        if (!this.is_text_selected()) {
            return;
        }

        let props = this.properties[frame];
        if (!props) {
            return;
        }

        let s = this.selection_indices();
        return props.t.slice(s.s, s.e);
    }

    this.is_text_selected = function() {
        return this.cursor != this.cursor_selection;
    }

    this.replace_selected_text = function(replace) {
        let props = this.properties[frame];
        if (!props) {
            return;
        }

        let text = props.t;
        let s = this.selection_indices();
        let new_text = text.slice(0, s.s) + replace + text.slice(s.e, text.length);

        this.cursor = s.s + replace.length;
        this.cursor_selection = this.cursor;

        return new_text;
    }

    this.constrain_cursors = function() {
        let props = this.properties[frame];
        if (!props) {
            return;
        }
        let t = props.t;
        this.cursor = Math.max(0, Math.min(this.cursor, props.t.length));
        this.cursor_selection = Math.max(0, Math.min(this.cursor_selection, props.t.length));
    }

    this.char_index_at_x = function(x) {
        let props = this.properties[frame];
        if (!props) {
            return 0;
        }
        
        let idx = Math.round((x - props.p.x)/char_size);
        return Math.max(0, Math.min(idx, props.t.length));
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

        let key = evt.key;
        let text = this.properties[frame].t;

        if (meta || ctrl) {
            if (this.is_selected()) {
                if (key == "c") {
                    // copy
                    text_copied = this.text_selected();
                    return true;
                } else if (key == "v") {
                    // paste
                    if (this.is_text_selected()) {
                        // wipe out some text in between
                        this.change_text(this.replace_selected_text(text_copied));
                        return true;
                    } else {
                        this.properties[frame].t = text.slice(0, this.cursor) + text_copied + text.slice(this.cursor, text.length);
                        this.cursor += text_copied.length;
                        return true;
                    }
                } else if (key == "a") {
                    // select all
                    this.cursor = this.properties[frame].t.length;
                    this.cursor_selection = 0;
                    return true;
                }
            }
            return false;
        }

        if (key == "Escape") {
            this.selected = false;
            return false;
        }

        if (key == "Enter") {
            this.selected = false;
            this.eval();
            if (shift) {
                // create a new text below this one
                let p = this.properties[frame].p;
                let newT = new Text("", {x: p.x, y: p.y + char_size*2});
                objs.push(newT);
                newT.select();
                save_state();

            } else {
                enter_select();
            }
            
            return false;
        }

        if (ctrl) {
            this.properties[frame] = transform_props(key, this.properties[frame]);
            return false;
        }

        if (!shift && this.is_text_selected()) {
            let s = this.selection_indices();
            if (key == "ArrowRight") {
                this.cursor = s.e;
            } else if (key == "ArrowLeft") {
                this.cursor = s.s;
            }
        } else {
            if (key == "ArrowRight") {
                this.cursor += 1;
            } else if (key == "ArrowLeft") {
                this.cursor -= 1;
            }
        }

        if (key == "ArrowUp") {
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

        if (key == "Backspace") {
            if (!this.is_text_selected()) {
                this.cursor_selection = this.cursor - 1;
                this.constrain_cursors();
                text = this.replace_selected_text("");
            } else {
                text = this.replace_selected_text("");
            }
        } else if (key.length == 1) {
            // type character
            if (this.is_text_selected()) {
                text = this.replace_selected_text(key);
            } else {
                text = text.slice(0, this.cursor) + key + text.slice(this.cursor, text.length);
                this.cursor += 1;
            }
        }

        if (!shift || (key != "ArrowRight" && key != "ArrowLeft")) {
            this.cursor_selection = this.cursor;
        }

        this.change_text(text);

        return true;
    }

    this.eval = function() {
        if ((!presenting && this.is_selected()) || this.hidden()) {
            return;
        }

        this.text_val = "";
        let expr = "";

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

        let i;
        if (transition.transitioning) {
            i = interpolate(a, b);
        } else {
            i = a;
        }

        let color = rgbToHex(i.c);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = i.c[3];

        try {
            let val = c.eval(parser.scope);

            // only display the value if its not an assignment
            let op_type = math.parse(this.args[0]).type;
            if (op_type.indexOf("Assignment") == -1) {
                let type = typeof val;

                // set display text
                if (type == "number") {
                    if (ctrl) {
                        // nothing
                        this.text_val = '=' + val;
                    } else {
                        this.text_val = '=' + pretty_round(val);
                    }
                    
                } else if (type == "object" && val._data && val._data.length != 0) {
                    // prob a matrix, render entries
                    let t = [];

                    if (val._data) {
                        val = val.map(function (value, index, matrix) {
                            return pretty_round(value);
                        });

                        let d = val._data;
                        if (val._size.length == 1) {
                            t = [d.join(' ')];
                        } else {
                            for (let r = 0; r < d.length; r++) {
                                t.push(d[r].join(' '));
                            }
                        }
                    }

                    this.matrix_vals = t;
                    this.text_val = null;
                } else if (val && 're' in val && val.im) {
                    if (val) {
                        if (ctrl) {
                            // nothing
                            this.text_val = '=' + val;
                        } else {
                            this.text_val = '=' + pretty_round(val.re).toString() + ' + ' + pretty_round(val.im).toString() +'i';
                        }
                    }
                } else {
                    if (val) {
                        this.text_val = '=' + val.toString();
                    }
                }
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
        this.constrain_cursors();

        if (changed) {
            this.parse_text(text);
        }
    }

    this.mouse_down = function(evt) {
        if (this.hidden()) {
            return false;
        }

        this.near_mouse = this.point_in_text_rect(mouse);
        
        if (this.near_mouse) {
            return true;
        }

        return false;
    }

    this.point_in_text_rect = function(point) {
        let props = this.properties[frame];
        if (!props) {
            return false;
        }

        let p = props.p;
        if (point.x > p.x && point.x < p.x + this.size.w && point.y > p.y - this.size.h/2 && point.y < p.y + this.size.h/2) {
            return true;
        }

        return false;
    }

    this.mouse_move = function(evt) {
        let props = this.properties[frame];
        if (!props) {
            return;
        }

        
        this.near_mouse = this.point_in_text_rect(mouse);
    };

    this.var_name = function() {
        let var_name = this.args[0].split('=')[0];
        var_name = var_name.replace(/\s+/g, '');
        return var_name;
    }

    this.mouse_drag = function(evt) {
        if (tool == "camera") {
            return false;
        }
        
        let props = this.properties[frame];
        if (!props) {
            return false;
        }

        if (Math.abs(mouse.x - mouse_start.x) > char_size || Math.abs(mouse.y - mouse_start.y) > char_size) {
            this.dragged = true;
        }

        if (presenting) {
            if (this.args && this.args[0]._data) {

            } else {
                if (this.command == "slide" && this.point_in_text_rect(mouse_start)) {

                    // change the value of the variable
                    let var_name = this.var_name();

                    let old_val = 0;
                    try {
                        old_val = parser.eval(var_name);
                    } catch(e) {

                    }

                    if (isNaN(old_val)) {
                        old_val = 0;
                    }

                    let delta = (mouse.x - mouse_last.x)/grid_size;
                    if (meta || ctrl) {
                        delta *= .01;
                    }

                    let new_val = old_val + delta;
                    this.text_val = '=' + pretty_round(new_val);

                    try {
                        parser.set(var_name, new_val);
                    } catch (error) {
                        console.log('slide error: ' + error);
                    }

                    return true;
                }
            }
        } else if (this.is_selected() && this.near_mouse) {
            let p = props.p;
            
            this.cursor = this.char_index_at_x(mouse.x);
            this.cursor_selection = this.char_index_at_x(mouse_start.x);

            this.constrain_cursors();
            this.dragged = true;
        } else if (tool == "select" && (this.near_mouse || this.is_selected())) {
            // shift it
            let p = props.p;
            let offset = {x: mouse_grid.x - mouse_grid_last.x, y: mouse_grid.y - mouse_grid_last.y};
            props.p = {x: p.x + offset.x, y: p.y + offset.y};

            return true;
        }
        
        return false;
    }

    this.mouse_up = function(evt) {
        if (this.hidden()) {
            return false;
        }

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
        
        if (this.near_mouse) {
            if (!this.dragged) {
                this.select();

                // move cursor
                this.cursor = this.char_index_at_x(mouse.x);
                this.cursor_selection = this.cursor;
                this.constrain_cursors();
            }
        } else if (!shift && this.is_selected()) {
            this.selected = false;
        }
        
        this.dragged = false;
    }

    this.draw_text = function(ctx, t) {
        let size;

        if (this.command == "f" && !this.is_selected()) {
            let fn = t.slice(this.command.length+1); //+1 for semicolon
            size = draw_fn(fn);
        } else {
            let N = t.length;
            size = {w: N * char_size, h:char_size*2};

            size = {w:draw_simple(t), h:char_size*2};

            let plevel = 0;
            for (let i = 0; i < N; i++) {
                if (i < this.cursor) {
                    if (t[i] in brackets) plevel += brackets[t[i]];
                }
            }
            
            // draw red brackets
            ctx.save();
            if (this.is_selected() && plevel != 0) {
                ctx.fillStyle = colors[1];
                let p2 = plevel;
                for (let i = this.cursor; i < N; i++) {
                    if (t[i] in brackets) p2 += brackets[t[i]];

                    if (p2 == plevel-1) {
                        ctx.fillText(t[i], i * char_size, 0);
                        break;
                    }
                }

                p2 = plevel;
                for (let i = this.cursor-1; i >= 0; i--) {
                    if (t[i] in brackets) p2 += brackets[t[i]];

                    if (p2 == plevel+1) {
                        ctx.fillText(t[i], i * char_size, 0);
                        break;
                    }
                }
            }
            ctx.restore();
        }

        if (this.matrix_vals.length != 0) {
            ctx.save();
            ctx.translate(size.w + grid_size, 0);

            for (let i = 0; i < this.matrix_vals.length; i++) {
                ctx.textAlign = 'left';
                ctx.fillText(this.matrix_vals[i], 0, grid_size * i);
            }
            
            ctx.restore();
        } else if (!this.selected && this.text_val && this.text_val.length) {
            ctx.save();
            ctx.translate(size.w, 0);
            size.w = size.w + draw_simple(this.text_val);
            ctx.restore();
        }

        return size;
    }

    this.parse_text = function(text) {
        this.command = "";
        this.args = [];
        this.cargs = [];

        // replace @ with anonymous fn name
        if (text && text.length) {
            let split = text.split("@");
            let new_t = "";
            let N = split.length;
            for (let i = 0; i < N-1; i++) {
                new_t += split[i] + "anon"+guid().slice(0,8);
            }
            new_t += split[N-1]
            text = new_t;
        }

        if (!text) {
            return;
        } else if (text.indexOf(':') != -1) {
            let split = text.split(":");
            this.command = split[0];
            this.args = [split[1]];

            try {
                this.cargs = math.compile(this.args);
            } catch(e) {
                console.log('compile2 error: ');
                console.log(e);
            }
        } else {
            this.args = [text];

            try {
                this.cargs = math.compile(this.args);
            } catch(e) {
                console.log('compile2 error: ');
                console.log(e);
            }
        }
    }

    this.draw_tree = function(ctx, props) {
        ctx.save();

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

        let yoff = grid_size*3;
        let xoff = grid_size*3;
        let op_size = grid_size;

        let p = {x: props.p.x, y: props.p.y + grid_size};
        let stuff = [t];

        if (!stuff) {
            return;
        }

        while (true) {

            let next_stuff = [];
            let added_all_spaces = true;
            for (let i = 0; i < stuff.length; i ++) {
                let o = stuff[i];
                if (o.args) {
                    next_stuff = next_stuff.concat(o.args);
                    added_all_spaces = false;
                } else {
                    next_stuff.push(' ');
                }
            }
            
            
            let lx = -(next_stuff.length-1)/2*xoff;
            let li = 0;

            for (let i = 0; i < stuff.length; i ++) {

                let o = stuff[i];
                if (o == ' ') {
                    continue;
                }

                let text;
                let np = {x: p.x + i * xoff - (stuff.length-1)/2*xoff, y: p.y};

                if (o.args) {
                    // draw the op name

                    if (o.name && o.name.length) {
                        text = o.name;
                    } else if (o.op && o.op.length) {
                        text = o.op;
                    }

                    if (distance(mouse, np) < grid_size) {
                        text = o.toString();
                    }
                    
                    /*ctx.beginPath();
                    ctx.arc(np.x, np.y, op_size, 0, pi2);
                    ctx.stroke(); */

                    ctx.fillText(text, np.x, np.y);

                    for (let j = 0; j < o.args.length; j++) {
                        while(next_stuff[li] == ' ') {
                            lx += xoff;
                            li += 1;
                        }

                        let argp = {x: p.x + lx, y: np.y + yoff};
                        let diff = {x: argp.x - np.x, y: argp.y - np.y};
                        let n = math.norm([diff.x, diff.y]);
                        diff = {x: diff.x/n, y: diff.y/n};

                        ctx.beginPath();
                        ctx.moveTo(np.x + diff.x*op_size, np.y + diff.y*op_size);
                        ctx.lineTo(argp.x - diff.x*op_size, argp.y - diff.y*op_size);
                        ctx.stroke();

                        lx += xoff;
                        li += 1;
                    }
                } else {

                    if (o.name && o.name.length) {
                        text = o.name;
                    } else if (o.items) {
                        text = 'A'; // array
                    } else if (o.value) {
                        text = o.value;
                    } else if (o.content) {
                        text = o.content;
                    } else {
                        text = '?';
                    }

                    
                    ctx.fillText(text, np.x, np.y);
                }
            }

            if (next_stuff.length == 0) {
                break;
            }
            
            if (added_all_spaces) {
                break;
            }

            stuff = next_stuff;
            p.y += yoff;
        }
        
        ctx.restore();
    }

    this.draw_border = function(ctx) {
        ctx.save();
        ctx.fillStyle = gray;
        ctx.fillRect(0, this.size.h/2, this.size.w, 4);
        ctx.fillRect(this.size.w/2-2,this.size.h/2+2,4,12);
        ctx.restore();
    }

    this.render = function(ctx) {

        let a = this.properties[frame];

        if (!a) {
            return;
        }

        let b = this.properties[next_frame];

        let i;
        if (transition.transitioning) {
            i = interpolate(a, b);
        } else {
            i = a;
        }

        if (i.c[3] == 0) {
            return;
        }

        let pos = i.p;

        ctx.save();

        ctx.globalAlpha = i.c[3];
        ctx.fillStyle = rgbToHex(i.c);
        ctx.strokeStyle = rgbToHex(i.c);

        let should_draw_text = true;

        let c = this.command;
        if (c == "tree") {
            this.draw_tree(ctx, i);
            if (presenting) {
                should_draw_text = false;
            }
        }

        if (presenting && (a.ph || (b && b.ph))) {
            should_draw_text = false;
        }

        // text
        this.size = {w: 0, h: 0};
        if (should_draw_text) {

            ctx.translate(i.p.x, i.p.y);
            ctx.rotate(i.r);
            ctx.scale(i.w, i.h);

            if (!b) {
                b = a;
            }

            let fading_in = (a.c[3] == 0 && b.c[3] == 1);
            let fading_out = (a.c[3] == 1 && b.c[3] == 0);

            let at = a.t;
            let bt = b.t;

            if (transition.transitioning) {
                if (fading_in) {
                    at = b.t;
                    bt = b.t;
                } else if (fading_out) {
                    at = a.t;
                    bt = a.t;
                }
            }

            let text_different = at != bt;

            if (text_different && transition.transitioning) {
                // changing text
                let constrained = constrain(t_ease);
                ctx.globalAlpha = 1-constrained;
                this.draw_text(ctx, a.t);
                ctx.globalAlpha = constrained;
                this.draw_text(ctx, b.t);
            } else {
                ctx.globalAlpha = i.c[3];
                this.size = this.draw_text(ctx, at);
            }
        }

        if (c == "slide" && presenting && this.near_mouse && !this.hidden()) {
            // draw slider rect
            this.draw_border(ctx);
        }
        
        if (!presenting && !this.hidden() && this.near_mouse) {
            // draw border
            this.draw_border(ctx);
        }

        if (!presenting && this.is_selected()) {
            // draw cursor
            ctx.fillRect(this.cursor * char_size, -grid_size/2, 2, grid_size);
            if (this.is_text_selected()) {
                // draw selection
                let s = this.selection_indices();

                let xstart = s.s * char_size;
                let xend = s.e * char_size;

                ctx.save();
                ctx.globalAlpha = .1;
                ctx.fillRect(xstart, -grid_size/2, xend-xstart, grid_size);
                ctx.restore();
            }

            // draw function information
            if (i.t) {
                text = i.t.slice(0, this.cursor);
                let fn = text.split(/[^A-Za-z]/).pop();

                if (fn.length != 0) {
                    let keys = Object.keys(math);
                    let yoff = 0;
                    for (let i = 0; i < keys.length; i++) {
                        let key = keys[i];

                        if (key.indexOf(fn) == 0) {
                            ctx.save();
                            ctx.translate(0, char_size*2 + yoff);
                            ctx.scale(.5, .5);
                            ctx.globalAlpha = .5;
                            draw_simple(key + ": " + (math[key]+"").split("\n")[0]);
                            ctx.restore();
                            yoff += grid_size;
                        }
                    }
                }
                
            }
        }

        ctx.restore();
    }

    this.parse_text(text);
}

function Camera() {
    this.default_props = {p: {x:c.width/2, y:c.height/2}, w: 1, h: 1, rxyz: [0, 0, 0]};
    this.properties = {};
    this.properties[frame] = copy(this.default_props);

    function generate_ticks() {
        let ticks = [];

        var R = math.range(-10,11,1);
        let N = R.size()[0];
        let m = [];
        let tick_size = 10;

        for (let i = 0; i < 2; i++) {
            
            for (let j = 0; j < N; j++) {
                let t = R._data[j];
                if (i == 0) {
                    m.push([t, -tick_size, 0]);
                    m.push([t, tick_size, 0]);
                } else if (i == 1) {
                    // y axis
                    m.push([-tick_size, t, 0]);
                    m.push([tick_size,  t, 0]);
                } else if (i == 2) {
                    // z axis
                    m.push([-tick_size, 0, t]);
                    m.push([tick_size, 0, t]);
                }
            }

            ticks.push(m);
        }

        return ticks;
    }

    this.ticks = generate_ticks();

    this.mouse_drag = function(evt) {
        if (tool != "camera") {
            return;
        }

        let props = this.properties[frame];

        if (meta || ctrl) {
            // rotate
            let r = props.rxyz;
            a = r[1] - (mouse.y - mouse_last.y)/100;
            b = r[2] - (mouse.x - mouse_last.x)/100;

            r = [0, a, b];
            this.rotate(r);
        } else {
            // translate
            let p = props.p;
            let offset = {x: mouse_grid.x - mouse_grid_last.x, y: mouse_grid.y - mouse_grid_last.y};
            props.p = {x: p.x + offset.x, y: p.y + offset.y};
        }
    }

    this.rotate = function(rxyz) {
        let props = this.properties[frame];
        if (props) {
            props.rxyz = rxyz;
        }
    }

    this.onkeydown = function(evt) {
        if (tool != "camera") {
            return;
        }

        let key = evt.key;
        this.properties[frame] = transform_props(key, this.properties[frame], .01);
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

        if (transition.transitioning) {
            this.props = interpolate(a, b);
        } else {
            this.props = a;
        }

        if (!this.props.rxyz) {
            this.props.rxyz = [0, 0, 0];
        }

        let rx = this.props.rxyz[0];
        let ry = this.props.rxyz[1];
        let rz = this.props.rxyz[2];

        this.R = rotation_matrix(rx, ry, rz);

    }

    this.graph_to_screen = function(x, y, z) {
        // takes array [x, y, z]
        // returns [x, y, z] projected to screen (render using first two coords)
        return this.graph_to_screen_mat(math.matrix([[x, y, z]]))[0];
    }

    this.graph_to_screen_mat = function(p) {
        // n x ?
        let size = p.size();
        let n = size[0];
        let d = size[1];

        if (d == 2) {
            // 2d
            // append zeros for zs
            p = p.resize([n, 3]);
        }

        p = math.multiply(p, this.R);
        p = p._data;

        let x; let y; let z; let m;
        for (let i = 0; i < n; i++) {
            x = p[i][1];
            y = p[i][2];
            z = p[i][0];

            /*
            m = z/20+1;
            if (m < 0) {
                m = 1;
            } */

            p[i][0] = x * this.props.w * grid_size + this.props.p.x;
            p[i][1] = -y * this.props.h * grid_size + this.props.p.y;
            p[i][2] = z;
        }

        return p;
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

    this.buttons.push(new Button("del props all", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (typeof obj.clear_all_props == "function") {
                obj.clear_all_props();
            }
        }
    }));

    this.buttons.push(new Button("del props f-1", {x: 0, y: 0}, function(b) {
        let N = objs.length;
        for (let i = 0; i < N; i++) {
            let obj = objs[i];
            if (obj.properties && obj.properties[frame-1]) {
                delete obj.properties[frame-1];
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

    this.buttons.push(new Button("camera", {x: 0, y: 0}, function(b) {
        if (tool == "camera") {
            // reset the camera rotation
            cam.properties[frame].rxyz = [0,0,0];
            cam.properties[frame].p = cam.default_props.p;
        }
        tool = "camera";
    }));

    this.buttons.push(new Button("view xy", {x: 0, y: 0}, function(b) {
        cam.rotate([-Math.PI/2,0,-Math.PI/2]);
    }));

    this.buttons.push(new Button("debug", {x: 0, y: 0}, function(b) {
        debug = !debug;
    }));

    this.buttons.push(new Button("present", {x: 0, y: 0}, function(b) {
        // show a cursor
        present();
    }));

    this.buttons.push(new Button("save local", {x: 0, y: 0}, function(b) {
        // Put the object into storage
        localStorage.setItem('page', state_to_string());
    }));

    this.buttons.push(new Button("load local", {x: 0, y: 0}, function(b) {
        // Put the object into storage
        let page = localStorage.getItem('page');
        if (page && page.length) {
            str_to_state(page);
        }
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
        b.pos = {x: this.pos.x, y: this.pos.y + i * grid_size*.6};
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

function constrain(v) {
    return Math.min(1, Math.max(0, v));
}

function loop_frame(f) {
    if (f >= num_frames + 1) {
        return 1;
    } else if (f < 1) {
        return num_frames;
    }

    return f;
}

function draw_axes(ctx) {
    if (!cam.R) {
        return;
    }

    ctx.save();


    // draw gridlines
    
    ctx.strokeStyle = "#000000";
    ctx.globalAlpha = 0.05;

    let axis = cam.ticks[0];
    axis = math.matrix(axis);
    axis = cam.graph_to_screen_mat(axis);
    let N = axis.length;
    for (let j = 0; j < N; j += 2) {

        if (j == 20 || j == 62) {
            continue;
        }

        ctx.beginPath();
        ctx.moveTo(axis[j][0], axis[j][1]);
        ctx.lineTo(axis[j+1][0], axis[j+1][1]);
        ctx.stroke();
    }


    ctx.textAlign = 'center';
    ctx.globalAlpha = .5;

    // center
    let c = cam.graph_to_screen_mat(math.matrix([[0, 0, 0]]));

    // axes
    let axes = math.matrix([[10, 0, 0],
                [0, 10, 0],
                [0, 0, 10],
                [-10, 0, 0],
                [0, -10, 0],
                [0, 0, -10]]);

    axes = cam.graph_to_screen_mat(axes);

    let labels;
    if (cam.axes_names) {
        labels = cam.axes_names;
    } else {
        labels = ['x', 'y', 'z'];
    }
    
    let colors = ["#FF0000", "#00FF00", "#0000FF"];
    
    N = axes.length;
    for (let i = 0; i < N; i ++) {
        ctx.fillStyle = colors[i%3];
        ctx.strokeStyle = colors[i%3];

        x = axes[i][0];
        y = axes[i][1];

        ctx.beginPath();
        ctx.moveTo(c[0][0], c[0][1]);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    for (let i = 0; i < 3; i++) {
        x = axes[i][0];
        y = axes[i][1];

        ctx.beginPath();
        ctx.fillStyle = '#FFFFFF';
        ctx.arc(x, y, 16, 0, 2*Math.PI);
        ctx.globalAlpha = 1;
        ctx.fill();

        ctx.fillStyle = colors[i%3];
        ctx.strokeStyle = colors[i%3];
        ctx.fillText(labels[i], x, y);
    }

    ctx.restore();
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

            if (typeof obj.eval == 'function') {
                obj.eval();
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
    let w = window.innerWidth; let h = window.innerHeight;
    c.width = w*scale_factor;
    c.height = h*scale_factor;
    c.style.width = w;
    c.style.height = h;

    ctx = c.getContext("2d");
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

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

    formula_text = document.getElementById("formula_text");
    document.getElementById("load_clear_formula_text").onclick = function(evt) {
        let t = formula_text.value;
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.change_text == "function" && obj.is_selected()) {
                obj.change_text(t);
            }
        }
    };
    document.getElementById("load_insert_formula_text").onclick = function(evt) {
        let t = formula_text.value;
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (typeof obj.replace_selected_text == "function" && obj.is_selected()) {
                obj.change_text(obj.replace_selected_text(t));
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

    $(window).focus(function(){
        meta = false;
        ctrl = false;
    });

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

        if (key == "Shift") {
            shift = true;
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

        if (key == "z" && (meta || ctrl)) {
            undo();
            return;
        }

        if ((meta || ctrl) && key == "Enter") {
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

        if (key == "Shift") {
            shift = false;
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

        let captured = false;
        for (let i = objs.length-1; i >= 0; i--) {
            let obj = objs[i];
            if (typeof obj.mouse_down === 'function') {
                if (obj.mouse_down(evt)) {
                    captured = true;
                    break;
                }
            }
        }

        if (captured) {
            return false;
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

        parser.set('_y', mouse_graph.x);
        parser.set('_z', mouse_graph.y);

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

        parser.set('_frame', t);
        parser.set('_millis', Date.now());

        if (presenting) {
            mouse_time -= 1;
        }

        if (!parser.get('_trace')) {
            ctx.clearRect(0, 0, c.width, c.height);
        }

        cam.update_props();

        draw_axes(ctx);

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