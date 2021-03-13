import { saveAs } from 'file-saver';
import $ from 'jquery';
import Camera from './graphics/camera';
import Circle from './tools/circle';
import Frames, { configureCanvas } from './graphics/frames';
import Menu from './ui/menu';
import Network from './tools/network';
import Pen from './tools/pen';
import Shape from './tools/shape';
import Text from './tools/text';
import Transition from './graphics/transition';
import initVolumeMeter from './audio/volume-meter';
import {
  rtv,
  math,
  parser,
  DARK,
  COLORS,
  FONT,
  SCALE_FACTOR,
  T_STEPS,
  GRID_SIZE,
  MOUSE_DURATION,
  PI2,
  MAT_NUM_WIDTH,
  CHAR,
} from './resources';

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

    points = rtv.cam.graph_to_screen_mat(points);

    rtv.ctx.beginPath();
    for (let i = 0; i < N; i++) {
        p = points[i];

        if (asyms[i]) {
            rtv.ctx.stroke();
            rtv.ctx.beginPath();
            rtv.ctx.moveTo(p[0], p[1]);
            continue;
        }

        if (i === 0) {
            rtv.ctx.moveTo(p[0], p[1]);
        } else {
            rtv.ctx.lineTo(p[0], p[1]);
        }
    }
    rtv.ctx.stroke();
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

    points = rtv.cam.graph_to_screen_mat(points);

    rtv.ctx.beginPath();
    for (let i = 0; i < N; i++) {
        const p = points[i];
        if (i === 0) {
            rtv.ctx.moveTo(p[0], p[1]);
        } else {
            rtv.ctx.lineTo(p[0], p[1]);
        }
    }
    rtv.ctx.stroke();

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

            dots = rtv.cam.graph_to_screen_mat(dots);


            rtv.ctx.save();
            for (let i = 0; i < num_dots; i++) {
                const p = dots[i];

                rtv.ctx.beginPath();
                rtv.ctx.arc(p[0], p[1], 4, 0, PI2);
                rtv.ctx.fill();
                rtv.ctx.stroke();
            }
            rtv.ctx.restore();
        }
    }
}

function implies(p, q) {
    return !p || q;
}

math.import({
    logicTable: function() {
        const O = [true, false];

        for (let k = 0; k < arguments.length; k++) {
            rtv.ctx.save();
            const s = copy(arguments[k]);

            let props = parser.evaluate("text_props");
            let x = props.p.x;
            let y = props.p.y;
            rtv.ctx.translate(x + 5*GRID_SIZE*k, y+GRID_SIZE);
            rtv.ctx.fillText(s, 0, 0);

            for (let i = 0; i < 2; i++) {
                const p = O[i];

                for (let j = 0; j < 2; j++) {
                    const q = O[j];


                    s.replace("P", p);
                    s.replace("Q", q);
                    const r = math.beval(s);

                    if (r) {
                        rtv.ctx.fillStyle = COLORS[4];
                        rtv.ctx.fillText("T", 0, GRID_SIZE);
                    } else {
                        rtv.ctx.fillStyle = COLORS[1];
                        rtv.ctx.fillText("F", 0, GRID_SIZE);
                    }

                    rtv.ctx.beginPath();
                    rtv.ctx.strokeStyle = COLORS[5];
                    rtv.ctx.moveTo(0, GRID_SIZE/2-2);
                    rtv.ctx.lineTo(GRID_SIZE * 5, GRID_SIZE/2-2);
                    rtv.ctx.stroke();

                    rtv.ctx.translate(0, GRID_SIZE);
                }
            }

            rtv.ctx.restore();
        }
    },
    implies: function(p, q) { // LOGIC: Returns whether p => q is a true statement. Only false when p=T and q=F
        return implies(p, q);
    },
    beval: function(statement) { // LOGIC: Boolean evaluation, "true^false||true"
        statement = statement.toLowerCase();
        statement = statement.replace("^", "&&");
        return eval(statement);
    },
    tautology: function(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always true
        const O = [true, false];

        for (let i = 0; i < 2; i++) {
            const p = O[i];
            for (let j = 0; j < 2; j++) {
                const q = O[j];

                const s = copy(statement);
                s.replace("P", p);
                s.replace("Q", q);

                if (!math.beval(s)) {
                    return false;
                }
            }
        }

        return true;
    },
    contradiction: function(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always false
        const O = [true, false];

        for (let i = 0; i < 2; i++) {
            const p = O[i];
            for (let j = 0; j < 2; j++) {
                const q = O[j];

                const s = copy(statement);
                s.replace("P", p);
                s.replace("Q", q);

                if (math.beval(s)) {
                    return false;
                }
            }
        }

        return true;
    },
    egg: function(f) {
        f = f._data;

        let radius = 100;

        var col = "white";
        if (f[0]) {
            col = "white";
        } else if (f[1]) {
            col = COLORS[3];
        } else if (f[2]) {
            col = COLORS[4];
        }

        var scol = "white";
        if (f[3]) {
            scol = "white";
        } else if (f[4]) {
            scol = COLORS[3];
        } else if (f[5]) {
            scol = COLORS[4];
        }

        var spots = 0;
        if (f[6]) {
            spots = 1;
        } else if (f[7]) {
            spots = 3;
        } else if (f[8]) {
            spots = 5;
        }

        var hairy = f[10];

        rtv.ctx.save();

        let props = parser.evaluate("text_props");
        let x = props.p.x;
        let y = props.p.y;
        rtv.ctx.translate(x, y);
        rtv.ctx.rotate(props.r);
        rtv.ctx.scale(props.w, props.h*1.2);
        rtv.ctx.translate(-x, -y);

        rtv.ctx.beginPath();
        rtv.ctx.arc(x, y, radius, 0, 2*math.PI, 0);
        rtv.ctx.fillStyle = col;
        rtv.ctx.strokeStyle = "black";
        rtv.ctx.fill();
        rtv.ctx.stroke();

        var da = 2*math.PI / math.max(spots, 1);
        for (let i = 0; i < spots; i++) {
            var a = da * i;
            rtv.ctx.beginPath();
            rtv.ctx.arc(x+math.cos(a)*(20+spots*2) + 30,
                    y+math.sin(a)*(20+spots*2) + 30,
                    10, 0, 2*math.PI, 0);
            rtv.ctx.fillStyle = scol;
            rtv.ctx.fill();
            rtv.ctx.stroke();
        }

        if (hairy) {
            let n = 40;
            let da = 2*math.PI / n;
            for (let i = 0; i < n; i++) {
                var a = da * i;

                let sx = x+math.cos(a)*radius;
                let sy = y+math.sin(a)*radius;

                rtv.ctx.beginPath();

                rtv.ctx.moveTo(sx,
                           sy);

                rtv.ctx.lineTo(sx+math.cos(a)*15,
                           sy+math.sin(a)*15);

                rtv.ctx.stroke();
            }
        }

        rtv.ctx.restore();
    },
    rad: function(deg) { // converts to radians
        return deg * math.pi/180;
    },
    deg: function(rad) { // converts to degrees
        return rad * 180.0 / math.pi;
    },
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

        md = rtv.cam.graph_to_screen_mat(m);

        i = 0;
        for (let x = 0; x < d; x ++) {
            rtv.ctx.beginPath();
            let xc = md[i][0];
            let yc = md[i][1];
            rtv.ctx.moveTo(xc, yc);

            for (let z = 0; z < d; z ++) {
                xc = md[i][0];
                yc = md[i][1];

                rtv.ctx.lineTo(xc, yc);

                i += 1;
            }

            rtv.ctx.stroke();

            rtv.ctx.beginPath();
            xc = md[x][0];
            yc = md[x][1];
            rtv.ctx.moveTo(xc, yc);

            for (let j = 0; j < dims[0]; j += d) {
                xc = md[x+j][0];
                yc = md[x+j][1];

                rtv.ctx.lineTo(xc, yc);
            }

            rtv.ctx.stroke();
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

        md = rtv.cam.graph_to_screen_mat(m);

        i = 0;
        for (let x = 0; x < d; x ++) {
            rtv.ctx.beginPath();
            let xc = md[i][0];
            let yc = md[i][1];
            rtv.ctx.moveTo(xc, yc);

            for (let z = 0; z < d; z ++) {
                xc = md[i][0];
                yc = md[i][1];

                rtv.ctx.lineTo(xc, yc);

                i += 1;
            }

            rtv.ctx.stroke();

            rtv.ctx.beginPath();
            xc = md[x][0];
            yc = md[x][1];
            rtv.ctx.moveTo(xc, yc);

            for (let j = 0; j < dims[0]; j += d) {
                xc = md[x+j][0];
                yc = md[x+j][1];

                rtv.ctx.lineTo(xc, yc);
            }

            rtv.ctx.stroke();
        }
    },
    randn: function() { // no args: random normal, 1 arg shape: dims of matrix to return
        let N = arguments.length;
        if (N === 1) {
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
        rtv.cam.axes_names = [x,y,z];
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
    rotateCamera: function(rx, ry, rz) { // rotates the camera
        let rxyz = [rx, ry, rz];
        if (!isNaN(math.sum(rxyz))) {
            rtv.cam.properties[rtv.frame].rxyz = rxyz;
        } else {
            rtv.cam.properties[rtv.frame].rxyz = [0, 0, 0];
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

        let cam_data = rtv.cam.graph_to_screen_mat(points);

        rtv.ctx.save();
        if (arguments.length === 3) {
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
                rtv.ctx.fillStyle = rgbToHex(math.multiply(col, 255));
                rtv.ctx.fillRect(cam_data[i][0]-psize_half, cam_data[i][1]-psize_half, psize, psize);
            }
        } else {
            for (let i = 0; i < n; i++) {
                rtv.ctx.fillRect(cam_data[i][0]-psize_half, cam_data[i][1]-psize_half, psize, psize);
            }
        }
        rtv.ctx.restore();
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

        let cam_data = rtv.cam.graph_to_screen_mat(math.matrix([a]))[0];

        rtv.ctx.save();
        rtv.ctx.beginPath();
        if (color) {
            rtv.ctx.fillStyle = rgbToHex(math.multiply(color, 255));
        }
        rtv.ctx.arc(cam_data[0], cam_data[1], psize, 0, PI2);
        rtv.ctx.fill();

        rtv.ctx.restore();
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
    draw: function(points, fill) { // draws line from point to point [[x1,y1,z1], ...], draws arrow
        let N = points.size()[0];
        points = rtv.cam.graph_to_screen_mat(points);

        rtv.ctx.save();
        rtv.ctx.beginPath();
        let p; let lastp;
        for (let i = 0; i < N; i ++) {
            p = points[i];
            if (i === 0) {
                rtv.ctx.moveTo(p[0], p[1]);
            } else {
                rtv.ctx.lineTo(p[0], p[1]);
            }

            lastp = p;
        }
        rtv.ctx.stroke();
        if (fill) {
            const col = fill._data.map(constrain);
            rtv.ctx.fillStyle = rgbToHex(math.multiply(col, 255));
            rtv.ctx.globalAlpha = .8;
            rtv.ctx.fill();
        }
        rtv.ctx.restore();
    },
    drawxy: function(xs, ys) {
        let N = xs.size()[0];
        let m = cached([N, 3]);
        for (let i = 0; i < N; i++) {
            m._data[i][0] = xs._data[i];
            m._data[i][1] = ys._data[i];
            m._data[i][2] = 0;
        }

        math.draw(m);
    },
    oval: function(_p, hr, vr, _n) {
        let n = 10;
        if (arguments.length >= 4) {
            n = _n;
        }

        let path = [];
        for (let i = 0; i <= n; i++) {
            let t = i/n * 2 * math.PI;
            let p = math.add(_p, [math.cos(t) * hr, math.sin(t) * vr, 0]);
            path.push(p);
        }

        return math.matrix(path);
    },
    vect: function(a, b) {

        if (!a) {
            return;
        }

        let _x = 0;
        let _y = 0;
        let _z = 0;

        let x = 0;
        let y = 0;
        let z = 0;

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

        p = rtv.cam.graph_to_screen(p[0], p[1], 0);
        for (let i = 0; i < t.length; i++) {
            rtv.ctx.textAlign = 'left';
            rtv.ctx.fillText(t[i], p[0], p[1] + GRID_SIZE * i);
        }
    },
    labels: function(labels, points) { // render labels ["l1", ...] at [[x1, y1, z1], ...]
        points = rtv.cam.graph_to_screen_mat(points);
        let N = labels.size()[0];
        let p;
        rtv.ctx.save();
        rtv.ctx.textAlign = 'center';
        for (let i = 0; i < N; i++) {
            p = points[i];
            rtv.ctx.fillText(labels._data[i], p[0], p[1]);
        }
        rtv.ctx.restore();
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
        let flo = (rtv.t/500)%mod;

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

        rtv.ctx.save();
        rtv.ctx.globalAlpha = math.sin(flo/mod * math.PI);

        for (let x = -10; x <= 10; x+=d) {
            for (let y = -10; y <= 10; y+=d) {
                for (let z = -10; z <= 10; z+=d) {
                    let v = f(x,y,z)._data;
                    if (uv) {
                        let n = math.norm(v);
                        v = [v[0]/n, v[1]/n, v[2]/n];
                    }

                    const a = rtv.cam.graph_to_screen(x + flo*v[0], y + flo*v[1], z + flo*v[2]);

                    rtv.ctx.beginPath();
                    rtv.ctx.arc(a[0], a[1], 5, 0, PI2);
                    rtv.ctx.fill();
                }
            }
        }
        rtv.ctx.restore();
    },
    paras: function(r, _urs, _ure, _vrs, _vre, _n=1, f) { // parametric surface r(u,v) with optional field f
        let n = 10;

        if ((_ure-_urs) <= 0 || (_vre-_vrs) <= 0 || n <= 0) {
            return;
        }

        if (arguments.length >= 6) {
            n = _n;
        }

        let du = (_ure-_urs)/n;
        let dv = (_vre-_vrs)/n;

        rtv.ctx.save();

        let u = _urs;
        let v = _vrs;

        for (let i = 0; i <= n; i ++) {
            u = _urs + du * i;

            rtv.ctx.beginPath();
            for (let j = 0; j <= n; j ++) {
                v = _vrs + dv * j;

                let p = r(u, v)._data;
                let camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
                if (v == 0) {
                    rtv.ctx.moveTo(camp[0], camp[1]);
                } else {
                    rtv.ctx.lineTo(camp[0], camp[1]);
                }
            }
            rtv.ctx.stroke();
        }

        for (let i = 0; i <= n; i ++) {
            v = _vrs + dv * i;

            rtv.ctx.beginPath();
            for (let j = 0; j <= n; j ++) {

                u = _urs + du * j;
                let p = r(u, v)._data;
                let camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
                if (u == 0) {
                    rtv.ctx.moveTo(camp[0], camp[1]);
                } else {
                    rtv.ctx.lineTo(camp[0], camp[1]);
                }
            }
            rtv.ctx.stroke();
        }

        if (f) {
            for (let i = 0; i <= n; i ++) {
                u = _urs + du * i;

                for (let j = 0; j <= n; j ++) {
                    v = _vrs + dv * j;

                    let p = r(u, v)._data;

                    let vect = f(p[0], p[1], p[2])._data;
                    draw_vect(p[0], p[1], p[2], p[0]+vect[0], p[1]+vect[1], p[2]+vect[2]);
                }
            }
        }

        rtv.ctx.restore();
    },
    integral: function(f, a, b, _n) {
        if (a == b) {
            return 0;
        }

        let negate = false;
        if (a > b) {
            rtv.t = b
            b = a
            a = rtv.t
            negate = true;
        }

        let n = 10000;
        if (arguments.length >= 4) {
            n = _n;
        }

        let dx = (b-a)/n;
        let sum = 0;
        for (let x = a; x <= b; x+= dx) {
            sum += f(x) * dx;
        }

        if (negate) {
            sum *= -1;
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
    },
    visnet: function(layers, ret_highlighted) { // Draws a neural net layers = [1, 2, 3, 2, 1]
        layers = layers._data;

        let props = parser.evaluate("text_props");
        let pos = [props.p.x, props.p.y];

        let pad = 200;
        let radius = 20;

        let h = layers.length * pad;
        let w = Math.max(...layers) * pad;

        function loc(i, j, units) {
            return [pos[0] + 30 + w/2 - pad * units/2 + i*pad, pos[1] + h - j*pad - 120];
        }

        rtv.ctx.save();

        // connections
        let high_conn = [];
        let high_neur = [];

        for (let j = 0; j < layers.length-1; j++) {
            let units = layers[j];
            let units_next = layers[j+1];


            for (let i = 0; i < units; i++) {
                let p = loc(i, j, units);

                for (let k = 0; k < units_next; k++) {

                    let p2 = loc(k, j+1, units_next);

                    /*
                    let vline = [p2[0] - p[0], p2[1] - p[1]];
                    let mvect = [mouse.x - p[0], mouse.y - p[1]];

                    let dot = mvect[0] * vline[0] + mvect[1] * vline[1];

                    let vlen = math.norm(vline);
                    let total_len = vlen * math.norm(mvect);

                    if (dot > total_len * .998 && dot < vlen*vlen) {
                        ctx.strokeStyle = "red";
                    } else {
                        ctx.strokeStyle = "black";
                    } */

                    rtv.ctx.strokeStyle = "black";

                    if (high_conn.length == 0) {
                        let dx1 = p[0] - rtv.mouse.pos.x;
                        let dy1 = p[1] - rtv.mouse.pos.y;

                        let dx2 = p2[0] - rtv.mouse.pos.x;
                        let dy2 = p2[1] - rtv.mouse.pos.y;

                        let d1 = math.sqrt(dx1*dx1 + dy1*dy1);
                        let d2 = math.sqrt(dx2*dx2 + dy2*dy2);

                        let vline = [p2[0] - p[0], p2[1] - p[1]];
                        let vlen = math.norm(vline);

                        if (d1 + d2 < vlen + 1) {
                            rtv.ctx.strokeStyle = COLORS[3];
                            high_conn = [i, k, j]; // unit i to unit k in layer j
                            high_neur = [[i, j], [k, j+1]];
                        }
                    }

                    rtv.ctx.beginPath();
                    rtv.ctx.moveTo(p[0], p[1]);
                    rtv.ctx.lineTo(p2[0], p2[1]);
                    rtv.ctx.stroke();
                }
            }
        }

        rtv.ctx.fillStyle = 'white';

        // neurons
        for (let j = 0; j < layers.length; j++) {
            let units = layers[j];

            for (let i = 0; i < units; i++) {
                let p = loc(i, j, units);

                rtv.ctx.strokeStyle = "black";

                // if we have a highlighted connection and we're in the right layer
                if (high_conn.length != 0) {

                    if (high_conn[2] == j) {
                        if (high_conn[0] == i) {
                            if (j == 0) {
                                rtv.ctx.strokeStyle = COLORS[1];
                            } else {
                                rtv.ctx.strokeStyle = COLORS[2];
                            }
                        }
                    } else if (high_conn[2] == j-1) {
                        if (high_conn[1] == i) {
                            if (j == 0) {
                                rtv.ctx.strokeStyle = COLORS[1];
                            } else {
                                rtv.ctx.strokeStyle = COLORS[2];
                            }
                        }
                    }



                } else {
                    let dx = rtv.mouse.pos.x - p[0];
                    let dy = rtv.mouse.pos.y - p[1];

                    if (dx*dx + dy*dy < 400) {
                        if (j == 0) {
                            rtv.ctx.strokeStyle = COLORS[1];
                        } else {
                            rtv.ctx.strokeStyle = COLORS[2];
                        }

                        high_neur = [[i, j]];
                    }
                }

                rtv.ctx.beginPath();
                rtv.ctx.arc(p[0], p[1], radius, 0, 2*Math.PI);
                rtv.ctx.fill();
                rtv.ctx.stroke();
            }
        }

        rtv.ctx.restore();

        if (arguments.length >= 2 && ret_highlighted) {
            return [high_conn, high_neur];
        }
    },
    int: function(n) {
        return n | 0;
    },
    elefield: function(charges, location) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.], provide location for field there
        charges = charges._data;

        if (arguments.length == 1) {
            const n = 5;
            let d = 20 / n;
            let p = [0, 0];
            let pl = 5; // path length

            //let move = ((millis % 1000) /1000 * .5 + .5);
            //console.log(move);

            for (let x = -10; x <= 10; x+=d) {
                for (let y = -10; y <= 10; y+=d) {
                    for (let z = -10; z <= 10; z+=d) {

                        var xp = x;
                        var yp = y
                        var zp = z;

                        for (let j = 0; j <= pl; j++) {

                            rtv.ctx.beginPath();
                            p = rtv.cam.graph_to_screen(xp, yp, zp);
                            rtv.ctx.moveTo(p[0], p[1]);
                            let dead = false;

                            // add up forces from charges
                            for (let i = 0; i < charges.length; i+= 4) {
                                let q = charges[i];
                                let cx = charges[i+1];
                                let cy = charges[i+2];
                                let cz = charges[i+3];

                                let v = [xp-cx, yp-cy, zp-cz];
                                let len = math.norm(v);
                                let l2 = len*len;

                                let c = math.coulomb.value*q/len/l2;

                                if (len > 2) {
                                    xp += c*v[0];
                                    yp += c*v[1];
                                    zp += c*v[2];
                                } else {
                                    j = pl;
                                    dead = true;
                                }
                            }

                            if (dead == false) {
                                p = rtv.cam.graph_to_screen(xp, yp, zp);
                                rtv.ctx.strokeStyle = rgbToHex([math.round((pl-j)/pl * 255), 0, math.round(j/pl * 255)]);
                                rtv.ctx.lineTo(p[0], p[1]);
                                rtv.ctx.stroke();
                            }
                        }
                    }
                }
            }
        } else if (arguments.length == 2) {
            // calculate field at the provided location
            const loc = location._data;

            var xp = loc[0];
            var yp = loc[1];
            var zp = loc[2];

            var xt = 0;
            var yt = 0;
            var zt = 0;

            // add up forces from charges
            for (let i = 0; i < charges.length; i+= 4) {
                let q = charges[i];
                let cx = charges[i+1];
                let cy = charges[i+2];
                let cz = charges[i+3];

                let v = [xp-cx, yp-cy, zp-cz];
                let len = math.norm(v);
                let l2 = len*len;

                let c = math.coulomb.value*q/len/l2; //math.coulomb.value*

                xt += c * v[0];
                yt += c * v[1];
                zt += c * v[2];
            }

            return [xt, yt, zt];
        }
    },
    eleforce: function(charges, j) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.] force on jth charge
        charges = charges._data;

        var oc = charges[j*4];
        var xp = charges[j*4+1];
        var yp = charges[j*4+2];
        var zp = charges[j*4+3];

        var fx = 0;
        var fy = 0;
        var fz = 0;

        // add up forces from charges
        for (let i = 0; i < charges.length; i+= 4) {
            if (i == j * 4) {
                continue;
            }

            let q = charges[i];
            let cx = charges[i+1];
            let cy = charges[i+2];
            let cz = charges[i+3];

            let v = [xp-cx, yp-cy, zp-cz];
            let len = math.norm(v);
            let l2 = len*len;

            let c = math.coulomb.value*q*oc/len/l2; //math.coulomb.value*

            fx += c * v[0];
            fy += c * v[1];
            fz += c * v[2];
        }

        return [fx, fy, fz];
    },
    vismult: function(W, x) { // visualize matrix vector multiplication
        let pad = 24;

        let props = parser.evaluate("text_props");
        let loc = [props.p.x, props.p.y + pad];

        let result = math.multiply(W, x);

        let xformat = format_matrix(x._data);
        let rformat = format_matrix(result._data);
        let Wformat = format_matrix(W._data);

        let rsize = matrix_size(rformat);
        let Wsize = matrix_size(format_matrix(W._data));
        let xsize = matrix_size(xformat);

        // draw neural network
        let rows = W._size[0];
        let cols = W._size[1];

        let high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
        let high_conn = high[0];
        let high_neur = high[1];

        // draw matrices

        // draw result matrix
        rtv.ctx.save();

        rtv.ctx.font = FONT.ANIM;

        rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
        draw_matrix(rformat, function(i, j) {
            rtv.ctx.fillStyle = "black";
            for (let n = 0; n < high_neur.length; n ++) {
                let highn = high_neur[n];
                if (highn[1] == 1 && highn[0] == i) {
                    rtv.ctx.fillStyle = COLORS[2];
                }
            }
        });

        rtv.ctx.fillStyle = "black";
        rtv.ctx.fillText("=", rsize[0] + pad, rsize[1]/2);

        // draw W matrix
        rtv.ctx.translate(rsize[0] + pad*3, 0);
        draw_matrix(Wformat, function(i, j) {
            rtv.ctx.fillStyle = "black";
            if (high_conn.length && high_conn[0] == j && high_conn[1] == i) {
                rtv.ctx.fillStyle = COLORS[3];
            }
        });

        rtv.ctx.fillText("*", Wsize[0] + pad, rsize[1]/2);

        // draw x matrix
        rtv.ctx.translate(Wsize[0] + pad*3, rsize[1]/2-xsize[1]/2);
        draw_matrix(xformat, function(i,j) {
            rtv.ctx.fillStyle = "black";

            for (let n = 0; n < high_neur.length; n ++) {
                let highn = high_neur[n];
                if (highn[1] == 0 && highn[0] == i) {
                    rtv.ctx.fillStyle = COLORS[1];
                }
            }
        });

        rtv.ctx.restore();
    },
    visdot: function(W, x) { // visualize matrix vector multiplication but as dot products
        let pad = 24;

        let props = parser.evaluate("text_props");
        let loc = [props.p.x, props.p.y + pad];

        let result = math.multiply(W, x);

        let rformat = format_matrix(result._data);
        let rsize = matrix_size(rformat);

        // draw neural network
        let rows = W._size[0];
        let cols = W._size[1];

        let high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
        let high_conn = high[0];
        let high_neur = high[1];

        // draw matrices

        // draw result matrix
        rtv.ctx.save();

        rtv.ctx.font = FONT.ANIM;

        rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
        draw_matrix(rformat, function(i, j) {
            rtv.ctx.fillStyle = "black";
            for (let n = 0; n < high_neur.length; n ++) {
                let highn = high_neur[n];
                if (highn[1] == 1 && highn[0] == i) {
                    rtv.ctx.fillStyle = "red";
                }
            }
        });

        rtv.ctx.fillStyle = "black";
        rtv.ctx.fillText("=", rsize[0] + pad, rsize[1]/2);

        // draw dot prod matrix
        rtv.ctx.translate(rsize[0] + pad*3, 0);
        let dp = [];

        let round = pretty_round_one;
        if (rtv.keys.ctrl) {
            round = pretty_round;
        }

        for (let i = 0; i < W._data.length; i ++) {
            let text = "";

            for (let j = 0; j < W._data[0].length; j ++) {
                text += round(W._data[i][j]) + "*" + round(x._data[j]);
                if (j < W._data[0].length-1) {
                    text += " + ";
                }
            }

            rtv.ctx.fillText(text, 0, i * GRID_SIZE + 20);
        }

        rtv.ctx.restore();
    },
    magfield: function(path, current, at_point) { // mag field from path [[x1, y1, z1], [x2, y2, z2], ...]

        const n = 5;
        let d = 20 / n;

        let b_at = function(x, y, z, path, current) {
            path = path._data;

            let b = math.zeros(3);
            let c = current * math.magneticConstant.value / 4.0 / math.PI; // u0 I / 4 / pi

            for (let i = 0; i < path.length-1; i += 1) {
                let p1 = path[i];
                let p2 = path[i+1];

                let r = math.subtract([x, y, z], p1);
                let rnorm = math.norm(r);
                r = math.multiply(r, 1/rnorm);

                let ds = math.subtract(p2, p1);
                let db = math.cross(ds, r);
                db = math.multiply(db, 1/math.pow(rnorm, 2));

                b = math.add(b, db);
            }

            return math.multiply(b, c);
        };

        if (arguments.length >= 3) {
            at_point = at_point._data;
            let b = b_at(at_point[0], at_point[1], at_point[2], path, current);

            return b;
        } else {
            for (let x = -10; x <= 10; x+=d) {
                for (let y = -10; y <= 10; y+=d) {
                    for (let z = -10; z <= 10; z+=d) {

                        let b = b_at(x, y, z, path, current);

                        if (math.norm(b) > .1) {
                            b = b._data;
                            draw_vect(x, y, z, x + b[0], y+b[1], z+b[2]);
                        }
                    }
                }
            }
        }

    },
    circle: function(_p, r, _n) {
        let n = 10;
        if (arguments.length >= 3) {
            n = _n;
        }

        let path = [];
        for (let i = 0; i <= n; i++) {
            let t = i/n * 2 * math.PI;
            let p = math.add(_p, [math.cos(t)*r, math.sin(t)*r, 0]);
            path.push(p);
        }

        return math.matrix(path);
    },
    interp: function(a, b, divisions) { // interpolate from [x1,y1,z1,...] -> [x2,y2,z2,...]
        const ad = a._data;
        const bd = b._data;

        divisions -= 1;

        const L = cached([divisions+1, ad.length]);

        for (let i = 0; i <= divisions; i ++) {
            let t = i/divisions;
            for (let j = 0; j < ad.length; j++) {
                L._data[i][j] = ad[j] * (1-t) + t * bd[j];
            }
        }

        return L;
    },
    zer: function() {
        return [0, 0, 0];
    },
    linspace: function(a, b, steps) {
        let path = [];

        path.push(a);

        if (steps > 2) {
            let dt = 1/(steps-2);
            let t = 0;
            for (let i = 0; i < steps-2; i ++) {
                path.push(math.add(math.multiply(a, (1-t)),  math.multiply(t, b)));
                t += dt
            }
        }

        path.push(b);

        return math.matrix(path);
    },
    say: function(text, _voice, _rate, _pitch) { // text to speech
        let voice = 11;

        if (_voice) {
            voice = _voice;
        }

        var utterThis = new SpeechSynthesisUtterance(text);
        utterThis.pitch = .8;

        if (arguments.length >= 3) {
            utterThis.rate = _rate;
        }

        if (arguments.length >= 4) {
            utterThis.pitch = _pitch;
        }

        utterThis.voice = rtv.speech.voices[voice];
        rtv.speech.synth.cancel();
        rtv.speech.synth.speak(utterThis);
    },
    enableVolMeter: function () {
        if (rtv.meter === undefined) {
            rtv.meter = initVolumeMeter();
        }
    },
    traceToggle: function() { // enable or disable canvas clearing
        try {
            parser.evaluate("_trace");
        } catch (e) {
            parser.set("_trace", false);
        }

        parser.set("_trace", !parser.evaluate("_trace"));
    },
    drawFarmer: function() {

        rtv.ctx.save();

        let props = parser.evaluate("text_props");
        let x = props.p.x;
        let y = props.p.y;

        rtv.ctx.translate(x, y);
        rtv.ctx.rotate(props.r);
        rtv.ctx.scale(props.w, props.h);
        rtv.ctx.translate(-x, -y);

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -1.25, y + -211);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(4.000000000000001, 4.000000000000001);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -41.25, y + -201);
        rtv.ctx.rotate(6.2831853071795845);
        rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
        rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 38.75, y + -201);
        rtv.ctx.rotate(-6.2831853071795845);
        rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
        rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -1.25, y + -171);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
        rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -1.25, y + -86);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-20, -45);
        rtv.ctx.lineTo(-40, 45);
        rtv.ctx.lineTo(40, 45);
        rtv.ctx.lineTo(20, -45);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -21.25, y + -21);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, -20);
        rtv.ctx.lineTo(0, 20);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 18.75, y + -21);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, -20);
        rtv.ctx.lineTo(0, 20);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -36.25, y + -101);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(15, -30);
        rtv.ctx.lineTo(-15, 30);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 33.75, y + -101);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-15, -30);
        rtv.ctx.lineTo(15, 30);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -57.91666666666674, y + -154.33333333333331);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-23.333333333333258, -56.666666666666686);
        rtv.ctx.lineTo(-13.333333333333258, 33.333333333333314);
        rtv.ctx.lineTo(36.66666666666674, 23.333333333333314);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 55.41666666666674, y + -154.33333333333331);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(23.333333333333258, -56.666666666666686);
        rtv.ctx.lineTo(13.333333333333258, 33.333333333333314);
        rtv.ctx.lineTo(-36.66666666666674, 23.333333333333314);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -71.25, y + -291);
        rtv.ctx.rotate(-1.308996938995747);
        rtv.ctx.scale(4.000000000000001, 3.400000000000001);
        rtv.ctx.arc(0, 0, 20, 1.308996938995747, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 68.75, y + -291);
        rtv.ctx.rotate(-2.0943951023931953);
        rtv.ctx.scale(4.000000000000001, -3.800000000000001);
        rtv.ctx.arc(0, 0, 20, 1.308996938995747, 2.8797932657906453, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -86.25, y + -206);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(5, -5);
        rtv.ctx.lineTo(-5, 5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.restore();

    },
    drawComputer: function() {

        rtv.ctx.save();

        let props = parser.evaluate("text_props");
        let x = props.p.x;
        let y = props.p.y;

        rtv.ctx.translate(x, y);
        rtv.ctx.rotate(props.r);
        rtv.ctx.scale(props.w, props.h);
        rtv.ctx.translate(-x, -y);

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -3.5, y + -186);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-128, -96);
        rtv.ctx.lineTo(-128, 144);
        rtv.ctx.lineTo(192, 144);
        rtv.ctx.lineTo(192, -96);
        rtv.ctx.lineTo(-128, -96);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -151.5, y + -154.5);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(20, -127.5);
        rtv.ctx.lineTo(-20, -87.5);
        rtv.ctx.lineTo(-20, 102.5);
        rtv.ctx.lineTo(20, 112.5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -186.5, y + -124.5);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(15, -77.5);
        rtv.ctx.lineTo(-15, -27.5);
        rtv.ctx.lineTo(-15, 42.5);
        rtv.ctx.lineTo(15, 62.5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -11.5, y + -22);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-40, -20);
        rtv.ctx.lineTo(-80, 20);
        rtv.ctx.lineTo(80, 20);
        rtv.ctx.lineTo(40, -20);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 53.5, y + -187);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(5, 5);
        rtv.ctx.lineTo(-5, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 98.5, y + -197);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, 5);
        rtv.ctx.lineTo(0, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 143.5, y + -187);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-5, 5);
        rtv.ctx.lineTo(5, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 118.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 118.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 98.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(2.1999999999999997, 0.8);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 28.5, y + -122);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 0.5, y + -182);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-112, -80);
        rtv.ctx.lineTo(-112, 120);
        rtv.ctx.lineTo(168, 120);
        rtv.ctx.lineTo(168, -80);
        rtv.ctx.lineTo(-112, -80);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -41.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(2.1999999999999997, 0.8);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -21.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -21.5, y + -162);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 3.5, y + -187);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-5, 5);
        rtv.ctx.lineTo(5, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -41.5, y + -197);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, 5);
        rtv.ctx.lineTo(0, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -86.5, y + -187);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(5, 5);
        rtv.ctx.lineTo(-5, -5);
        rtv.ctx.restore();
        rtv.ctx.stroke();



        rtv.ctx.restore();
    },
    drawFace: function() {
        rtv.ctx.save();

        let props = parser.evaluate("text_props");
        let x = props.p.x;
        let y = props.p.y;

        rtv.ctx.translate(x, y);
        rtv.ctx.rotate(props.r);
        rtv.ctx.scale(props.w, props.h);
        rtv.ctx.translate(-x, -y);

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -56.25, y + -53.5);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        // pupil
        rtv.ctx.save();
        rtv.ctx.beginPath();
        let angle = math.atan2(rtv.mouse.pos.y-y+53.5, rtv.mouse.pos.x-x+56.25);
        rtv.ctx.translate(x + -56.25, y + -53.5);
        rtv.ctx.rotate(angle);
        rtv.ctx.translate(8, 0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 56.25, y + -53.5);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        // pupil
        rtv.ctx.save();
        rtv.ctx.beginPath();
        angle = math.atan2(rtv.mouse.pos.y-y+53.5, rtv.mouse.pos.x-x-56.25);
        rtv.ctx.translate(x + 56.25, y + -53.5);
        rtv.ctx.rotate(angle);
        rtv.ctx.translate(8, 0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();


        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -8.4375, y + 11.1875);
        rtv.ctx.rotate(0);
        if (rtv.meter && rtv.meter.volume) {
            rtv.ctx.scale(1-rtv.meter.volume*2, 1+rtv.meter.volume*2);
        } else {
            rtv.ctx.scale(1, 1);
        }
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-25.3125, -8.4375);
        rtv.ctx.lineTo(42.1875, -8.4375);
        rtv.ctx.lineTo(8.4375, 25.3125);
        rtv.ctx.lineTo(-25.3125, -8.4375);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 0, y + -36.625);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        let np = 28.125;
        if (rtv.meter && rtv.meter.volume) {
            np -= rtv.meter.volume * 20;
        }
        rtv.ctx.moveTo(0, -28.125);
        rtv.ctx.lineTo(0, np);
        rtv.ctx.lineTo(0-15, 28.125-15);
        rtv.ctx.moveTo(0, np);
        rtv.ctx.lineTo(0+15, 28.125-15);
        rtv.ctx.restore();
        rtv.ctx.stroke();


        rtv.ctx.restore();
    },
    drawDog: function() {
        rtv.ctx.save();

        let props = parser.evaluate("text_props");
        let x = props.p.x;
        let y = props.p.y;

        rtv.ctx.translate(x, y);
        rtv.ctx.rotate(props.r);
        rtv.ctx.scale(props.w, props.h);
        rtv.ctx.translate(-x, -y);


        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -23.25, y + -117.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-48, -32);
        rtv.ctx.lineTo(72, -32);
        rtv.ctx.lineTo(72, 48);
        rtv.ctx.lineTo(-48, 48);
        rtv.ctx.lineTo(-48, -32);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + -51.25, y + -149.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1.4);
        rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.beginPath();
        rtv.ctx.translate(x + 28.75, y + -149.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1.4);
        rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.translate(x + -42.5, y + -109.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.fillStyle = "#000000";
        rtv.ctx.fillText("-", 0, 0);
        rtv.ctx.fillText(".", 22.5, 0);
        rtv.ctx.fillText("-", 45, 0);
        rtv.ctx.restore();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -16.25, y + -94.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(5, -5);
        rtv.ctx.lineTo(-5, 5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -6.25, y + -94.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-5, -5);
        rtv.ctx.lineTo(5, 5);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -3.75, y + -34.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-37.5, -35);
        rtv.ctx.lineTo(-47.5, 35);
        rtv.ctx.lineTo(52.5, 35);
        rtv.ctx.lineTo(32.5, -35);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -26.25, y + -24.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(5, -25);
        rtv.ctx.lineTo(-5, 25);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 63.75, y + -19.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(-15, 20);
        rtv.ctx.lineTo(15, -20);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + -1.25, y + -24.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, -25);
        rtv.ctx.lineTo(0, 25);
        rtv.ctx.restore();
        rtv.ctx.stroke();

        rtv.ctx.save();
        rtv.ctx.globalAlpha = 1;
        rtv.ctx.strokeStyle = "#000000";
        rtv.ctx.translate(x + 18.75, y + -24.75);
        rtv.ctx.rotate(0);
        rtv.ctx.scale(1, 1);
        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, -25);
        rtv.ctx.lineTo(0, 25);
        rtv.ctx.restore();
        rtv.ctx.stroke();




        rtv.ctx.restore();
    },
    dirField: function(f) { // draws direction field of dy/dx = f(x,y)
        for (let x = -10; x <= 10; x+=2) {
            for (let y = -10; y <= 10; y+=2) {
                const dydx = f(x+.0001, y+.0001); // to avoid asymptotes at x=0 or y=0
                if (dydx.im) {
                    continue;
                }
                let uv = [1, dydx];
                uv = math.matrix(uv)
                uv = math.multiply(uv, 1/math.norm(uv));
                draw_vect(x, y, 0, x+uv._data[0], y+uv._data[1], 0);
            }
        }
    },
    eulerMeth: function(f, x0, y0, _n, _h) { // approximate solution to diff eq from initial condition y(x0)=y0, n steps
        const n = _n > 0 ? _n : 10;
        const h = _h > 0 ? _h : .1;

        let x = x0
        let y = y0

        rtv.ctx.beginPath();

        let p = rtv.cam.graph_to_screen(x, y, 0);
        rtv.ctx.moveTo(p[0], p[1]);

        for (let i = 0; i < n; i++) {
            const dydx = f(x, y);

            if (dydx.im) {
                rtv.ctx.stroke();
                return math.matrix([x, y]);
            }

            x += h;
            y += dydx * h;

            p = rtv.cam.graph_to_screen(x, y, 0);
            rtv.ctx.lineTo(p[0], p[1]);
        }

        rtv.ctx.stroke();
        return math.matrix([x, y]);
    },
    diffEq: function(a, b, c, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = 0 numerically plotted for _n steps and _dt accuracy
        let n = 1000;
        let dt = .001;

        if (arguments.length >= 7) {
            n = _n;
        }

        if (arguments.length >= 8) {
            dt = _dt;
        }

        let y = y0;
        let x = x0;
        let yp = yp0;

        let p = rtv.cam.graph_to_screen(x, y, 0);

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(p[0], p[1]);
        for (let i = 0; i < n; i++) {
            ypp = (-b*yp - c*y)/a;
            yp += ypp * dt;
            y += yp * dt;
            x += 1 * dt;
            p = rtv.cam.graph_to_screen(x, y, 0);
            rtv.ctx.lineTo(p[0], p[1]);
        }
        rtv.ctx.stroke();
    },
    diffEqF: function(a, b, c, f, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = f(x) numerically plotted for _n steps and _dt accuracy
        let n = 1000;
        let dt = .001;

        if (arguments.length >= 8) {
            n = _n;
        }

        if (arguments.length >= 9) {
            dt = _dt;
        }

        let y = y0;
        let x = x0;
        let yp = yp0;

        let p = rtv.cam.graph_to_screen(x, y, 0);

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(p[0], p[1]);
        for (let i = 0; i < n; i++) {
            ypp = (f(x) - b*yp - c*y)/a;
            yp += ypp * dt;
            y += yp * dt;
            x += 1 * dt;
            p = rtv.cam.graph_to_screen(x, y, 0);
            rtv.ctx.lineTo(p[0], p[1]);
        }
        rtv.ctx.stroke();
    },
    diffEqTri: function(a, b, c, d, x0, y0, yp0, ypp0, _n, _dt) { // ay''' + by'' + cy' + dy = 0 numerically plotted for _n steps and _dt accuracy
        let n = 1000;
        let dt = .001;

        if (arguments.length >= 8) {
            n = _n;
        }

        if (arguments.length >= 9) {
            dt = _dt;
        }

        let y = y0;
        let x = x0;
        let yp = yp0;
        let ypp = ypp0;

        let p = rtv.cam.graph_to_screen(x, y, 0);

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(p[0], p[1]);
        for (let i = 0; i < n; i++) {
            yppp = (-b*ypp - c*yp - d*y)/a;
            ypp += yppp * dt;
            yp += ypp * dt;
            y += yp * dt;
            x += 1 * dt;
            p = rtv.cam.graph_to_screen(x, y, 0);
            rtv.ctx.lineTo(p[0], p[1]);
        }
        rtv.ctx.stroke();
    },
    factors: function (n) { // list positive factors of n
        f = [];
        for (let i = 0; i <= n/2; i++) {
            if (n / i % 1 == 0) {
                f.push(i);
            }
        }

        f.push(n);

        return math.matrix(f);
    },
    primeFactors: function (n) { // list prime factors of n

        let factors = math.factors(n);
        let d = factors._data;

        let primes = [];
        // this gonna be real inefficient! fun times...
        for (let i = 0; i < factors._size[0]; i++) {
            let num = d[i];
            let f = math.factors(num);
            if (f._size[0] == 1 || f._size[0] == 2) {
                // prime
                primes.push(num);
            }
        }

        return math.matrix(primes);
    },
    laplace: function(f, _ti, _tf, _dt) {
        let ti = 0;
        let tf = 1000;
        let dt = .01;

        if (arguments.length >= 2) {
            ti = _ti;
        }

        if (arguments.length >= 3) {
            tf = _tf;
        }

        if (arguments.length >= 4) {
            _dt = dt;
        }

        let F = function(s) {
            let sum = 0;
            for (rtv.t = ti; rtv.t <= tf; rtv.t += dt) {
                sum += math.exp(-s*rtv.t) * f(rtv.t);
            }
            return sum;
        }

        return F;
    },
    step(t) {
        if (t > 0) {
            return 1;
        }
        return 0;
    },
    window(t, a, b) {
        return math.step(t-a) - math.step(t-b);
    }
});

function report_error(e) {
    console.log(e);
    rtv.error.timer = 100;
    rtv.error.text = e;
}

// undo
var states = [];

function rgb1ToHex(a) {
    let c = [Math.round(a[0]*255),
            Math.round(a[1]*255),
            Math.round(a[2]*255)];
    return rgbToHex(c);
}

// http://www.javascriptkit.com/javatutors/requestanimationframe.shtml
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function(f){return setTimeout(f, 1000/fps)} // simulate calling code 60

// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
export function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

export function pretty_round(num) {
    return (Math.round(num*100)/100).toFixed(2);
}

function pretty_round_one(num) {
    return (Math.round(num*10)/10).toFixed(1);
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
                if (d) rtv.ctx.fillText(text, p.x, p.y);
                let s1 = draw_r(args[0], {x: p.x + CHAR.SIZE, y: p.y}, d);

                size.w = s1.w + CHAR.SIZE;
                size.h = s1.h;
            } else if (argc == 2) {
                // draw on the left and the right

                let center = false; // false -> bottom align
                let pad2 = CHAR.PAD * 2;
                if (text == "*") {
                    pad2 = 0;
                }

                let s1 = draw_r(args[0], {x: 0, y: 0}, false);
                let s2 = draw_r(args[1], {x: 0, y: 0}, false);

                size.w = s1.w + text.length * CHAR.SIZE + 2*pad2 + s2.w;
                size.h = Math.max(s1.h, s2.h);

                if (d) {
                    let opp = {x: 0, y: 0};
                    if (center) {
                        s1 = draw_r(args[0], {x: p.x, y: p.y + size.h/2 - s1.h/2}, d);
                        opp = {x: p.x + s1.w + pad2, y: p.y + size.h/2 - CHAR.SIZE};
                        s2 = draw_r(args[1], {x: p.x + s1.w + pad2 + text.length*CHAR.SIZE + pad2, y: p.y + size.h/2 - s2.h/2}, d);
                    } else {
                        // bottom align
                        s1 = draw_r(args[0], {x: p.x, y: p.y + size.h - s1.h}, d);
                        opp = {x: p.x + s1.w + pad2, y: p.y + size.h - CHAR.SIZE*2};
                        s2 = draw_r(args[1], {x: p.x + s1.w + pad2 + text.length*CHAR.SIZE + pad2, y: p.y + size.h - s2.h}, d);
                    }

                    if (text == "*") {
                        rtv.ctx.beginPath();
                        rtv.ctx.arc(opp.x + CHAR.SIZE/2, opp.y+CHAR.SIZE, 3, 0, PI2);
                        rtv.ctx.fill();
                    } else {
                        rtv.ctx.fillText(text, opp.x, opp.y);
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
                size.h = s1.h + s2.h - CHAR.SIZE;

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

                size.w = Math.max(s1.w, s2.w) + CHAR.PAD*2;
                size.h = Math.max(s1.h, s2.h)*2 + CHAR.PAD*4;

                if (d) {

                    draw_r(a, {x: p.x + size.w/2 - s1.w/2, y: p.y + size.h/2 - s1.h - CHAR.PAD*2}, d);
                    draw_r(b, {x: p.x + size.w/2 - s2.w/2, y: p.y + size.h/2 + CHAR.PAD*2}, d);

                    rtv.ctx.beginPath();
                    rtv.ctx.moveTo(p.x, p.y + size.h/2);
                    rtv.ctx.lineTo(p.x + size.w, p.y + size.h/2);
                    rtv.ctx.stroke();
                }
            }
        } else if (text == "!") {
            let s1 = draw_r(args[0], {x: p.x, y: p.y}, d);
            if (d) rtv.ctx.fillText(text, p.x + s1.w, p.y);

            size.w = s1.w + CHAR.SIZE;
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
            let cally = p.y + size.h/2 - CHAR.SIZE;

            if (d) {
                for (let i = 0; i < text.length; i ++) {
                    rtv.ctx.fillText(text[i], p.x+i*CHAR.SIZE, cally);
                }
            }

            let xo = text.length * CHAR.SIZE;

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(args[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i == N-1) {
                    if (d) rtv.ctx.fillText(")", p.x + xo, cally);
                } else {
                    if (d) rtv.ctx.fillText(",", p.x + xo, cally);
                }

                xo += CHAR.SIZE;
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
            if (d) rtv.ctx.fillText("(", p.x, p.y + s1.h/2-CHAR.SIZE);
            if (d) rtv.ctx.fillText(")", p.x + s1.w + CHAR.SIZE, p.y + s1.h/2-CHAR.SIZE);
            //ctx.restore();

            s1 = draw_r(o.content, {x: p.x + CHAR.SIZE, y: p.y}, d);

            size.w = s1.w + CHAR.SIZE*2;
            size.h = s1.h;
        } else if (o.node) {
            size = draw_r(o.node, {x: p.x, y: p.y}, d);
        } else if (o.object && o.value) {
            // assignment

            let s1 = draw_r(o.value, {x: 0, y: 0}, false);
            let text = o.object.name + " = ";

            if (d) {
                rtv.ctx.save();
                rtv.ctx.translate(p.x, p.y + s1.h/2-CHAR.SIZE);
                draw_simple(text);
                rtv.ctx.restore();

                draw_r(o.value, {x: p.x + text.length*CHAR.SIZE, y: p.y}, d);
            }

            size.w = s1.w + text.length * CHAR.SIZE;
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
            let cally = p.y + size.h/2 - CHAR.SIZE;
            let xo = 0;

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i != N-1) {
                    if (d) rtv.ctx.fillText(";", p.x + xo, cally);
                }
                xo += CHAR.SIZE;
            }

            xo -= CHAR.SIZE;

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
            let cally = p.y + size.h/2 - CHAR.SIZE;
            let xo = CHAR.SIZE; // first open bracket

            for (let i = 0; i < N; i ++) {
                let s1 = draw_r(items[i], {x: p.x + xo, y: p.y + size.h/2 - hs[i].h/2}, d);
                xo += s1.w;

                if (i != N-1) {
                    if (d) rtv.ctx.fillText(",", p.x + xo, cally);
                }
                xo += CHAR.SIZE;
            }

            rtv.ctx.save();
            rtv.ctx.scale(1, size.h/(CHAR.SIZE*2));
            if (d) rtv.ctx.fillText("[", p.x, cally);
            if (d) rtv.ctx.fillText("]", p.x + xo - CHAR.SIZE, cally);
            rtv.ctx.restore();

            size.w = xo;

        } else if (o.expr) {
            // function definition
            let s1 = draw_r(o.expr, {x: 0, y: 0}, false);

            text = o.name;
            text += "(" + o.params.join(",") + ") = ";

            if (d) {
                rtv.ctx.save();
                rtv.ctx.translate(p.x, p.y + s1.h - CHAR.SIZE*2);
                draw_simple(text);
                rtv.ctx.restore();
            }

            let xo = text.length*CHAR.SIZE;

            draw_r(o.expr, {x: p.x + xo, y: p.y}, d);

            size.w = xo + s1.w;
            size.h = s1.h;

        } else {
            if (d) {
                let N = text.length;
                for (let i = 0; i < N; i ++) {
                    rtv.ctx.fillText(text[i], p.x + i*CHAR.SIZE, p.y);
                }
            }

            size.w = text.length * CHAR.SIZE;
            size.h = CHAR.SIZE * 2;
        }
    }

    if (rtv.debug && d) rtv.ctx.strokeRect(p.x, p.y, size.w, size.h);

    return size;
}

function draw_vect(_x, _y, _z, x, y, z) {
    a = rtv.cam.graph_to_screen(_x, _y, _z);
    b = rtv.cam.graph_to_screen(x, y, z);

    a = {x: a[0], y: a[1]};
    b = {x: b[0], y: b[1]};

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(a.x, a.y);
    rtv.ctx.lineTo(b.x, b.y);
    rtv.ctx.stroke();

    // draw an arrow head
    let theta = Math.atan2(b.y - a.y, b.x - a.x);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(b.x, b.y);
    rtv.ctx.lineTo(b.x + Math.cos(theta - Math.PI*3/4) * 15, b.y + Math.sin(theta - Math.PI*3/4) * 15);
    rtv.ctx.moveTo(b.x, b.y);
    rtv.ctx.lineTo(b.x + Math.cos(theta + Math.PI*3/4) * 15, b.y + Math.sin(theta + Math.PI*3/4) * 15);
    rtv.ctx.stroke();
}

export function draw_brackets(sx, sy, width, height) {

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(sx + 7, sy);
    rtv.ctx.lineTo(sx, sy);
    rtv.ctx.lineTo(sx, sy + height);
    rtv.ctx.lineTo(sx + 7, sy + height);
    rtv.ctx.stroke();

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(sx + width - 7, sy);
    rtv.ctx.lineTo(sx + width, sy);
    rtv.ctx.lineTo(sx + width, sy + height);
    rtv.ctx.lineTo(sx + width - 7, sy + height);
    rtv.ctx.stroke();
}

export function draw_simple(text) {
    for (let i = 0; i < text.length; i++) {
        if (text[i] == "*") {
            rtv.ctx.beginPath();
            rtv.ctx.arc(i * CHAR.SIZE + CHAR.SIZE/2, 0, 3, 0, PI2);
            rtv.ctx.fill();
        } else {
            rtv.ctx.fillText(text[i], i * CHAR.SIZE, 0);
        }
    }
    return text.length * CHAR.SIZE;
}

export function draw_network(layers, pos) {
    let pad = 120;
    let radius = 20;

    loc = function(i, j, units) {
        let pad2 = 250;
        //return [pos[0] - pad2/2 - j*(pad2+80), pos[1] + pad2/2 - pad2 * units/2 + i*pad2];
        return [pos[0] - pad2 * units/2 + pad2/2 + i*pad2, -pad + pos[1] - j*pad2];
    }

    // connections
    for (let j = 0; j < layers.length-1; j++) {
        let units = layers[j];
        let units_next = layers[j+1];


        for (let i = 0; i < units; i++) {
            let p = loc(i, j, units);

            for (let k = 0; k < units_next; k++) {

                let p2 = loc(k, j+1, units_next);

                let l = new Shape([0, 0, 0, 1], [{x: p[0], y: p[1]}, {x: p2[0], y: p2[1]}]);
                rtv.objs.push(l);
            }
        }
    }

    // neurons
    for (let j = 0; j < layers.length; j++) {
        let units = layers[j];

        for (let i = 0; i < units; i++) {
            let p = loc(i, j, units);
            let c = new Circle([1,1,1,1], {x: p[0], y: p[1]});
            c.properties[rtv.frame].fill = [255,255,255,255]; // white fill
            rtv.objs.push(c);
        }
    }
}

let cache_fn = {};
export function draw_fn(fn) {

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

    rtv.ctx.save();
    rtv.ctx.textAlign = 'left';
    rtv.ctx.textBaseline = 'top';
    let size = draw_r(tree, {x: 0, y: 0}, false);
    draw_r(tree, {x: 0, y: -size.h/2}, true);
    rtv.ctx.restore();

    return size;
}

export function matrix_size(matrix) {
    if (matrix && matrix.length == 0) {
        return;
    }

    let pad = 24;

    return [matrix[0].length * (MAT_NUM_WIDTH + pad), matrix.length * GRID_SIZE];
}

export function draw_matrix(matrix, color_ij) {
    rtv.ctx.save();
    rtv.ctx.textAlign = "right";

    let pad = 24;

    let shift = 0;
    if (rtv.keys.ctrl) {
        shift = 24;
    }

    let max_width = MAT_NUM_WIDTH - 10;

    for (let i = 0; i < matrix.length; i ++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (color_ij) {
                color_ij(i, j);
            }
            rtv.ctx.fillText(matrix[i][j], j * (MAT_NUM_WIDTH + pad) + 124 + shift, i * GRID_SIZE + 20, max_width);
        }
    }

    size = matrix_size(matrix);
    draw_brackets(0, 0, size[0], size[1]);

    rtv.ctx.restore();
}

export function format_matrix(matrix) {
    if (matrix.length == 0) {
        return null;
    }

    // format for display
    let formatted = [];
    let round = pretty_round_one;

    if (rtv.keys.ctrl) {
        round = pretty_round;
    }

    if (typeof matrix[0] == "number") {
        // array
        for (let i = 0; i < matrix.length; i ++) {
            formatted.push([round(matrix[i])]);
        }
    } else {
        // matrix
        for (let i = 0; i < matrix.length; i ++) {
            let row = [];
            for (let j = 0; j < matrix[i].length; j++) {
                row.push(round(matrix[i][j]));
            }

            formatted.push(row);
        }
    }

    return formatted;
}

function get_mouse_pos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    var x, y;

    if (evt.touches) {
        for (var i = 0; i < evt.touches.length; i++) {
            if (evt.touches[i].touchType === "stylus") {
                return {
                    x: (evt.touches[i].clientX - rect.left) * SCALE_FACTOR,
                    y: (evt.touches[i].clientY - rect.top) * SCALE_FACTOR
                };
            }
        }
    }

    return {
        x: (evt.clientX - rect.left) * SCALE_FACTOR,
        y: (evt.clientY - rect.top) * SCALE_FACTOR
    };
}

function constrain_to_grid(p) {
    let gs = GRID_SIZE / 4;
    return {x: Math.floor((p.x + gs/2) / gs) * gs, y: Math.floor((p.y + gs/2) / gs) * gs};
}

export function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function between(a, b) {
    return {x: (a.x + b.x)/2, y: (a.y + b.y)/2};
}

function grad_2(c, x, y) {
    // c is compiled obj
    // depends on x and y
    let h = 0.0001;

    parser.set('x', x+h);
    let fxh = c.evaluate(parser.scope);
    parser.set('x', x);
    let fx = c.evaluate(parser.scope);

    parser.set('y', y+h);
    let fyh = c.evaluate(parser.scope);
    parser.set('y', y);
    let fy = c.evaluate(parser.scope);

    return [(fxh-fx)/h, (fyh-fy)/h];
}

export function rotation_matrix(rx, ry, rz) {
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

export function sigmoid(x, num, offset, width) {
    return num / (1.0 + Math.exp(-(x+offset)*width));
}

export function ease_in_out(x) {
    return 1.0 / (1.0 + Math.exp(-(x-.5)*10));
}

export function copy(d) {
    return JSON.parse(JSON.stringify(d));
}

function change_frames() {
    for (let i = 0; i < rtv.objs.length; i++) {
        const obj = rtv.objs[i];
        if (obj.properties[rtv.frame] && obj.properties[rtv.next_frame] == null) {
            obj.properties[rtv.next_frame] = copy(obj.properties[rtv.frame]);
            if (rtv.next_frame < rtv.frame) {
                // make that shit transparent?
                obj.properties[rtv.next_frame].c[3] = 0.0;
            }
        }
    }
}

export function rgbToHex(c) {
    return "#" + ((1 << 24) + (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2])).toString(16).slice(1);
}

export function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
     ] : null;
}

export function transform_props(key, props, step=.2) {

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

export function interpolate(a, b) {
    if (!b) {
        return a;
    }

    let interp = {};
    for (const key in a) {
        if (key == "p") {
            // interpolate position
            let ap = a[key];
            let bp = b[key];

            interp[key] = {x: (1-rtv.t_ease) * ap.x + rtv.t_ease * bp.x,
                           y: (1-rtv.t_ease) * ap.y + rtv.t_ease * bp.y};
        } else if (key == "w" || key == "h" || key == "r" || key == "a_s" || key == "a_e") {
            // interpolate width, height, or rotation
            let aw = a[key];
            let bw = b[key];
            interp[key] = (1-rtv.t_ease) * aw + rtv.t_ease * bw;
        } else if (key == "rxyz") {
            let ar = a[key];
            let br = b[key];
            interp[key] = [0, 0, 0];
            for (let i = 0; i < 3; i ++) {
                interp[key][i] = (1-rtv.t_ease) * ar[i] + rtv.t_ease * br[i];
            }
        } else if (key == "c") {
            // interpolate colors
            let ac = a[key];
            let bc = b[key];
            interp[key] = interpolate_colors(ac, bc, constrain(rtv.t_ease));
        } else if (key == "path") {
            // interpolate paths
            let ap = a[key];
            let bp = b[key];
            let N = ap.length;
            let ip = new Array(N);
            for (let i = 0; i < N; i ++) {
                let newp = {x: (1-rtv.t_ease) * ap[i].x + rtv.t_ease * bp[i].x,
                            y: (1-rtv.t_ease) * ap[i].y + rtv.t_ease * bp[i].y};
                ip[i] = newp;
            }

            interp[key] = ip;
        } else if (key == "t") {
            if (rtv.t_ease < .5) {
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

export function save_state() {
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
    if (states.length > 1) {
        states = states.splice(0, states.length-1);
        str_to_state(states[states.length-1]);
    }
}

export function guidIndex(objs, obj) {
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
    return JSON.stringify({"num_frames": rtv.num_frames, "frame": rtv.frame, "objs": rtv.objs, "cam": rtv.cam, "pen": rtv.pen});
}

function str_to_state(str) {
    let dict = JSON.parse(str);
    let arr = dict.objs;

    if (dict.num_frames) {
        rtv.num_frames = dict.num_frames;
    }

    if (dict.frame) {
        rtv.frame = dict.frame;
        rtv.frames.create_buttons();
    }

    if (dict.pen) {
        rtv.pen = new Pen();
        rtv.pen.drawings = dict.pen.drawings;
    }

    if (dict.cam && dict.cam.properties) {
        rtv.cam = new Camera();
        rtv.cam.properties = dict.cam.properties;
        rtv.cam.update_props();
    }

    rtv.objs = text_array_to_objs(arr, true);
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

export function save_local() {
    localStorage.setItem('page', state_to_string());
}

export function load_local() {
    // Grab the objects from storage
    let page = localStorage.getItem('page');
    if (page && page.length) {
        str_to_state(page);
    }
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
            new_obj.properties[rtv.frame] = o.properties[1];
            new_obj.select();
        }

        new_obj.guid = o.guid;

        new_objs.push(new_obj);
    }

    return new_objs;
}

export function insert_frame() {
    rtv.num_frames += 1;
    for (let f = rtv.num_frames; f >= rtv.frame; f--) {
        for (let i = 0; i < rtv.objs.length; i++) {
            let obj = rtv.objs[i];
            if (typeof obj.copy_properties == "function") {
                if (!obj.properties[f]) {
                    continue;
                }
                obj.copy_properties(f, f+1);
            }
        }

        if (rtv.cam.properties[f]) {
            rtv.cam.properties[f+1] = copy(rtv.cam.properties[f]);
        }
    }
    rtv.frames.create_buttons();
}

export function present() {
    rtv.tool = "select";
    rtv.presenting = true;
    document.body.style.cursor = 'none';
    document.body.scrollTop = 0; // Scroll to top in Safari
    document.documentElement.scrollTop = 0; // Scroll to top in other browsers
    document.body.style.overflow = 'hidden'; // Disable and hide scrollbar
}

function constrain_frame(f) {
    return Math.max(1, Math.min(rtv.num_frames, f));
}

export function constrain(v) {
    return Math.min(1, Math.max(0, v));
}

export function loop_frame(f) {
    if (f >= rtv.num_frames + 1) {
        return 1;
    } else if (f < 1) {
        return rtv.num_frames;
    }

    return f;
}

function draw_axes(ctx) {
    if (!rtv.cam.R) {
        return;
    }

    ctx.save();

    let csys_style = rtv.cam.style();
    let props = rtv.cam.properties[rtv.frame];

    // do a fade in and out
    if (rtv.transition.transitioning) {
        const csys_next_style = rtv.cam.properties[rtv.next_frame].style;

        if (csys_next_style != null && csys_next_style != csys_style) {
            // changing text
            let constrained = constrain(rtv.t_ease);
            ctx.globalAlpha = Math.cos(constrained * 2 * Math.PI) / 2 + .5;
            if (constrained >= .5) {
                csys_style = csys_next_style;
                if (rtv.cam.properties[rtv.next_frame]) {
                    props = rtv.cam.properties[rtv.next_frame];
                }
            }
        }
    }

    if (csys_style == "3d" || csys_style == "flat") {
        // draw gridlines
        ctx.strokeStyle = "#DDDDDD";

        if (csys_style == "3d") {
            let axis = rtv.cam.ticks[0];
            axis = math.matrix(axis);
            axis = rtv.cam.graph_to_screen_mat(axis);
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
        } else {
            let w = rtv.c.clientWidth * 2;
            let h = rtv.c.clientHeight * 2;

            let dx = GRID_SIZE * props.w;
            let dy = GRID_SIZE * props.h;

            let p = rtv.cam.graph_to_screen(0, 0, 0);

            for (let x = p[0] % dx; x < w; x += dx) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }

            for (let y = p[1] % dy; y < h; y += dy) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
        }

        ctx.textAlign = 'center';
        ctx.strokeStyle = "#000000";

        // center
        let c = rtv.cam.graph_to_screen(0, 0, 0);

        // axes
        let axes = math.matrix([[10, 0, 0],
                    [0, 10, 0],
                    [0, 0, 10],
                    [-10, 0, 0],
                    [0, -10, 0],
                    [0, 0, -10]]);

        axes = rtv.cam.graph_to_screen_mat(axes);

        let labels;
        if (rtv.cam.axes_names) {
            labels = rtv.cam.axes_names;
        } else {
            labels = ['x', 'y', 'z'];
        }

        let colors = ["#FF0000", "#00FF00", "#0000FF"];

        const N = axes.length;
        for (let i = 0; i < N; i ++) {
            ctx.fillStyle = colors[i%3];
            ctx.strokeStyle = colors[i%3];

            const x = axes[i][0];
            const y = axes[i][1];

            ctx.beginPath();
            ctx.moveTo(c[0], c[1]);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.lineWidth = 0;

        for (let i = 0; i < 3; i++) {
            const x = axes[i][0];
            const y = axes[i][1];

            ctx.beginPath();
            ctx.fillStyle = '#FFFFFF';
            ctx.arc(x, y, 16, 0, 2*Math.PI);
            ctx.fill();

            ctx.fillStyle = colors[i%3];
            ctx.strokeStyle = colors[i%3];
            ctx.fillText(labels[i], x, y);
        }
    }

    ctx.restore();
}

export function transition_with_next(next) {
    if (rtv.transition.transitioning) {
        return;
    }

    if (next > rtv.num_frames) {
        return;
    }

    if (rtv.tool == "copy frame") {
        enter_select();
        // copy properties
        for (let i = 0; i < rtv.objs.length; i ++) {
            let obj = rtv.objs[i];
            if (typeof obj.copy_properties === "function") {
                obj.copy_properties(rtv.frame, next);
            }
        }

        return;
    }

    rtv.new_line = null;
    rtv.next_frame = next;
    change_frames();
    let steps = T_STEPS;
    if (!rtv.presenting || rtv.keys.meta || rtv.keys.ctrl) {
        // make it instant when menu open
        steps = 0;
    }

    rtv.transition.run(steps, next, function(targ) {
        rtv.frame = targ;
        parser.set('frame', rtv.frame);

        let N = rtv.objs.length;
        for (let i = 0; i < N; i++) {
            let obj = rtv.objs[i];
            if (typeof obj.parse_text == 'function') {
                obj.parse_text(obj.properties[rtv.frame].t);
            }

            if (typeof obj.eval == 'function') {
                obj.eval();
            }
        }
    });
}

export function enter_select() {
    rtv.tool = "select";
    rtv.new_line = null;
}

function draw_cursor() {
    if (rtv.presenting && rtv.tool == "pen") {
        let pad = 20;

        rtv.ctx.save();

        rtv.ctx.translate(rtv.mouse.pos.x, rtv.mouse.pos.y);

        rtv.ctx.strokeStyle = rtv.pen.color;

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(0, 0);
        rtv.ctx.lineTo(pad/2, pad);
        rtv.ctx.moveTo(0, 0);
        rtv.ctx.lineTo(-pad/2, pad);

        rtv.ctx.stroke();
        rtv.ctx.restore();
    } else if (rtv.presenting && rtv.mouse.time > 0) {
        // draw a cursor

        let mx = rtv.mouse.pos.x;
        let my = rtv.mouse.pos.y;

        rtv.ctx.save();
        rtv.ctx.translate(mx, my);
        rtv.ctx.strokeStyle = DARK;
        rtv.ctx.beginPath();

        if (rtv.mouse.down) {
            rtv.mouse.time = MOUSE_DURATION;

            rtv.ctx.arc(0, 0, 10, 0, PI2, 0);

        } else {
            let pad = 20;

            if (rtv.tool == "camera") {
                rtv.ctx.moveTo(-pad, 0);
                rtv.ctx.lineTo(pad, 0);
                rtv.ctx.moveTo(0, -pad);
                rtv.ctx.lineTo(0, pad);
            } else {
                rtv.ctx.moveTo(pad, 0);
                rtv.ctx.lineTo(0, 0);
                rtv.ctx.lineTo(0, pad);
                rtv.ctx.moveTo(0, 0);
                rtv.ctx.lineTo(pad, pad);
            }
        }

        rtv.ctx.stroke();
        rtv.ctx.restore();
    }
}

window.onload = function() {

    rtv.objs = [];

    rtv.c = document.getElementById('viewport');
    rtv.ctx = rtv.c.getContext('2d');

    configureCanvas();
    window.addEventListener('resize', configureCanvas);

    // speech synth
    rtv.speech.synth = window.speechSynthesis; // speech synthesis
    window.speechSynthesis.onvoiceschanged = function() {
        rtv.speech.voices = window.speechSynthesis.getVoices();

    };

    document.getElementById("save").onclick = function(evt) {
        save(rtv.objs);
        return false;
    };

    document.getElementById("file").onchange = function(evt) {
        enter_select();
        load(evt);
    };

    document.getElementById("load_to_frame").onclick = function(evt) {
        let text = document.getElementById("selected_objects_text").value;
        let arr = JSON.parse(text);
        rtv.objs = rtv.objs.concat(text_array_to_objs(arr, false));
    };

    rtv.formula_text = document.getElementById("formula_text");
    document.getElementById("load_clear_formula_text").onclick = function(evt) {
        let t = rtv.formula_text.value;
        for (let i = 0; i < rtv.objs.length; i++) {
            let obj = rtv.objs[i];
            if (typeof obj.change_text == "function" && obj.is_selected()) {
                obj.change_text(t);
            }
        }
    };
    document.getElementById("load_insert_formula_text").onclick = function(evt) {
        let t = rtv.formula_text.value;
        for (let i = 0; i < rtv.objs.length; i++) {
            let obj = rtv.objs[i];
            if (typeof obj.replace_selected_text == "function" && obj.is_selected()) {
                obj.change_text(obj.replace_selected_text(t));
            }
        }
    };

    document.getElementById("gen_js").onclick = function(evt) {
        let js = "";

        for (let i = 0; i < rtv.selected_objs.length; i++) {
            let obj = rtv.selected_objs[i];
            if (obj.generate_javascript) {
                let s = obj.generate_javascript();
                js += s + "\n";
            }
        }

        document.getElementById("generic").value = js;
    };

    document.getElementById("gen_script").onclick = function(evt) {
        let script = document.getElementById("generic").value;
        script = script.split("\n");

        let s_clean = [];
        for (let i = 0; i < script.length; i++) {
            let s = script[i];
            if (s.length != 0) {
                s_clean.push(s);
            }
        }

        script = s_clean;

        let t = new Text("", {x: 20, y: rtv.c.clientHeight*2 - 60});
        t.properties[rtv.frame].w = .6;
        t.properties[rtv.frame].h = .6;
        rtv.objs.push(t);

        for (let i = 0; i < script.length; i++) {
            let s = script[i];
            let fr = i + 1;
            if (!t.properties[fr]) {
                t.properties[fr] = copy(t.properties[fr-1]);
            }

            t.properties[fr].t = s;
        }

        rtv.num_frames = script.length;
        rtv.frames.create_buttons();

        save_state();
    };

    document.addEventListener('paste', (event) => {
        let paste = (event.clipboardData || window.clipboardData).getData('text');
        console.log("pasting: " + paste);

        let N = rtv.objs.length;
        for (let i = 0; i < rtv.objs.length; i++) {
            let obj = rtv.objs[i];
            if (obj.type == "Text") {
                if (obj.is_selected()) {
                    obj.paste_text(paste);
                }
            }
        }

        event.preventDefault();
    });

    rtv.transition = new Transition();
    rtv.frame = 1;
    rtv.frames = new Frames(() => ({
        x: rtv.c.width - GRID_SIZE*2,
        y: GRID_SIZE/4,
    }));
    rtv.frames.on_click = function(idx) {
        transition_with_next(idx);
    };

    rtv.menu = new Menu({x: GRID_SIZE/4, y: GRID_SIZE/2});
    rtv.cam = new Camera();
    rtv.pen = new Pen();

    $(window).focus(function(){
        rtv.keys.meta = false;
        rtv.keys.ctrl = false;
    });

    window.onkeydown = function(evt) {
        let key = evt.key;

        if (key == "Escape" && rtv.presenting && rtv.tool != "camera" && rtv.tool != "pen") {
            rtv.presenting = false;
            document.body.style.cursor = '';
            document.body.style.overflow = 'scroll'; // Enable and show scrollbar
            return false;
        }

        if (key == "Escape") {
            enter_select();
        }

        if (key == "Tab") {
            rtv.keys.tab = true;
        }

        if (key == "Meta") {
            rtv.keys.meta = true;
        }

        if (key == "Shift") {
            rtv.keys.shift = true;
        }

        if (key == "Control") {
            rtv.keys.ctrl = true;
        }

        if (key == "Backspace") {
            if (rtv.keys.ctrl) {
                let N = rtv.objs.length;
                for (let i = 0; i < N; i++) {
                    let obj = rtv.objs[i];
                    if (obj.is_selected()) {
                        obj.deleted = true;
                    }
                }
            }
        }

        if (key == "z" && (rtv.keys.meta || rtv.keys.ctrl)) {
            undo();
            return;
        }

        if ((rtv.keys.meta || rtv.keys.ctrl) && key == "Enter") {
            present();
            return true;
        }

        if (document.getElementById("formula_text") == document.activeElement) {
            return true;
        }

        let captured = false;
        let N = rtv.objs.length;
        for (let i = 0; i < N; i++) {
            let obj = rtv.objs[i];

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

        if (rtv.frames.onkeydown(evt)) {
            return false;
        }

        rtv.cam.onkeydown(evt);
        rtv.pen.onkeydown(evt);

        if (key == " ") {
            return false;
        }

        if (rtv.tool == "select" && evt.srcElement == document.body) {
            const tools = {'t': 'text', 's': 'shape', 'c': 'camera', 'v': 'vector'};
            if (key in tools) {
                rtv.tool = tools[key];
            }
        }
    };

    window.onkeyup = function(evt) {
        let key = evt.key;

        if (key == "Tab") {
            rtv.keys.tab = false;
        }

        if (key == "Meta") {
            rtv.keys.meta = false;
        }

        if (key == "Shift") {
            rtv.keys.shift = false;
        }

        if (key == "Control") {
            rtv.keys.ctrl = false;
        }

        save_state();
    }

    window.onmousedown = function(evt) {
        if (evt.srcElement != rtv.c) {
            return;
        }

        rtv.mouse.down = true;
        rtv.mouse.start = get_mouse_pos(rtv.c, evt);

        try {
            math.compile('click()').evaluate(parser.scope);
        } catch(e) {

        }

        if (rtv.cam.mouse_down(evt)) {
            return;
        }

        if (rtv.pen.mouse_down(evt)) {
            return;
        }

        if (rtv.presenting) {
            return false;
        }

        let captured = false;
        for (let i = rtv.objs.length-1; i >= 0; i--) {
            let obj = rtv.objs[i];
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

        if (rtv.frames.mouse_down()) {
            return;
        }

        // didn't touch an obj, if tool is move start a rect
        let obj_selected = false;
        let N = rtv.objs.length;
        for (let i = 0; i < N; i++) {
            if (rtv.objs[i].is_selected()) {
                obj_selected = true;
            }
        }

        if (rtv.tool == "select" && obj_selected == false) {
            rtv.selecting = true;
        }
    };

    window.onmousemove = function(evt) {
        // update mouse
        rtv.mouse.pos = get_mouse_pos(rtv.c, evt);
        rtv.mouse.grid = constrain_to_grid(rtv.mouse.pos);
        rtv.mouse.graph = rtv.cam.screen_to_graph(rtv.mouse.pos);

        parser.set('_y', rtv.mouse.graph.x);
        parser.set('_z', rtv.mouse.graph.y);

        if (rtv.pen.mouse_move(evt)) {
            return;
        }

        if (rtv.mouse.down) {
            let captured = false;
            let N = rtv.objs.length;
            for (let i = N-1; i >= 0; i--) {
                let obj = rtv.objs[i];
                if (!captured && typeof obj.mouse_drag === 'function') {
                    captured = obj.mouse_drag(evt);
                }
            }

            if (!captured) {
                rtv.cam.mouse_drag(evt);
            }
        } else {
            let N = rtv.objs.length;
            for (let i = 0; i < N; i++) {
                let obj = rtv.objs[i];
                if (typeof obj.mouse_move === 'function') {
                    obj.mouse_move(evt);
                }
            }
        }

        if (rtv.presenting) {
            rtv.mouse.time = MOUSE_DURATION;
        }

        rtv.mouse.last = get_mouse_pos(rtv.c, evt);
        rtv.mouse.gridLast = constrain_to_grid(rtv.mouse.pos);
    };

    window.onmouseup = function(evt) {
        if (evt.srcElement != rtv.c) {
            return;
        }

        rtv.mouse.down = false;

        if (rtv.presenting) {
            // maybe tap some text
            let captured = false;
            let N = rtv.objs.length;
            for (let i = 0; i < N; i++) {
                let obj = rtv.objs[i];
                if (!captured && typeof obj.mouse_up === 'function') {
                    captured = obj.mouse_up(evt);
                }
            }

            return false;
        }

        if (rtv.frames.mouse_up(evt)) {
            return;
        }

        if (rtv.menu.mouse_up(evt)) {
            rtv.new_line = null;
            rtv.selecting = false;

            save_state();
            return;
        }

        if (rtv.pen.mouse_up(evt)) {
            save_state();
            return;
        }

        if (rtv.tool == "select") {
            let captured = false;
            let N = rtv.objs.length;
            for (let i = N-1; i >= 0; i--) {
                let obj = rtv.objs[i];
                if (!captured && typeof obj.mouse_up === 'function') {
                    captured = obj.mouse_up(evt);
                }
            }
        } else if (rtv.tool == "text") {
            // add a num obj at mouse pos
            let n = new Text("", rtv.mouse.grid);

            let N = rtv.objs.length;
            for (let i = 0; i < N; i++) {
                let obj = rtv.objs[i];
                if (typeof obj.is_selected == "function") {
                    obj.selected = false;
                }
            }

            n.select();
            rtv.objs.push(n);
        } else if (rtv.tool == "shape" || rtv.tool == "vector") {
            // add a num obj at mouse pos
            if (rtv.new_line) {
                // add a point
                rtv.new_line.add_point({x: rtv.mouse.grid.x, y: rtv.mouse.grid.y});
            } else {
                let l = new Shape([0, 0, 0, 1], [{x: rtv.mouse.grid.x, y: rtv.mouse.grid.y}]);

                if (rtv.tool == "vector") {
                    l.properties[rtv.frame].v = true;
                } else if (rtv.tool == "circle") {
                    l.properties[rtv.frame].circle = true;
                }

                rtv.objs.push(l);
                rtv.new_line = l
            }

            return;
        } else if (rtv.tool == "circle") {
            let new_circle = new Circle([0, 0, 0, 1], rtv.mouse.grid);
            rtv.objs.push(new_circle);
        } else if (rtv.tool == "network") {
            let n = new Network(rtv.mouse.grid);
            rtv.objs.push(n);
        }

        if (rtv.selecting) {
            rtv.selecting = false;

            let x = rtv.mouse.start.x;
            let y = rtv.mouse.start.y;
            let x2 = rtv.mouse.pos.x;
            let y2 = rtv.mouse.pos.y;

            const xx = Math.min(x, x2);
            const yy = Math.min(y, y2);
            const xx2 = Math.max(x, x2);
            const yy2 = Math.max(y, y2);

            rtv.selected_objs = [];

            for (let i = 0; i < rtv.objs.length; i++) {
                let obj = rtv.objs[i];
                if (typeof obj.in_rect === 'function') {
                    obj.in_rect(xx, yy, xx2, yy2);
                    if (obj.is_selected()) {
                        rtv.selected_objs.push(obj);
                    }
                }
            }

            let scopy = copy(rtv.selected_objs);
            for (let i = 0; i < scopy.length; i++) {
                let obj = scopy[i];
                let props = copy(obj.properties[rtv.frame]);
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

    window.ontouchstart = window.onmousedown;
    window.ontouchmove = window.onmousemove;
    window.ontouchend = window.onmouseup;

    save_state();

    var fps;
    rtv.millis = Date.now();
    var targ_millis = rtv.millis + 1; // set below

    function animate() {

        rtv.millis = Date.now();
        if (rtv.millis < targ_millis) {
            setTimeout(animate, targ_millis-rtv.millis);
            return;
        }

        targ_millis = rtv.millis + 1000/fps;

        if (rtv.presenting) {
            fps = 60;
        } else {
            fps = 30; // save power when editing
        }

        parser.set('_frame', rtv.t);
        parser.set('_millis', rtv.millis);
        let mp = rtv.cam.screen_to_graph({x: rtv.mouse.pos.x, y: rtv.mouse.pos.y});
        parser.set('_mx', mp.x);
        parser.set('_my', mp.y);

        if (rtv.meter) {
            parser.set('_vol', rtv.meter.volume);
        }

        if (rtv.presenting) {
            rtv.mouse.time -= 1;
        }

        if (!parser.get('_trace')) {
            rtv.ctx.clearRect(0, 0, rtv.c.width, rtv.c.height);
        }

        rtv.cam.update_props();

        draw_axes(rtv.ctx);

        rtv.ctx.font = FONT.ANIM;

        let N = rtv.objs.length;
        for (let i = 0; i < N; i++) {
            let obj = rtv.objs[i];
            if (typeof obj.eval == "function") {
                obj.eval();
            }
        }

        for (let i = 0; i < N; i++) {
            let obj = rtv.objs[i];
            obj.render(rtv.ctx);
        }

        for (let i = rtv.objs.length-1; i >= 0; i--) {
            let obj = rtv.objs[i];
            if (obj.deleted) {
                rtv.objs.splice(i, 1);
            }
        }

        if (rtv.selecting) {
            // draw a rect
            rtv.ctx.strokeStyle = DARK;
            rtv.ctx.strokeRect(rtv.mouse.start.x, rtv.mouse.start.y, rtv.mouse.pos.x - rtv.mouse.start.x, rtv.mouse.pos.y - rtv.mouse.start.y);
        }

        rtv.ctx.font = FONT.MENU;

        if (!rtv.presenting) {
            rtv.frames.render(rtv.ctx);
            rtv.menu.render(rtv.ctx);

            if (rtv.error.timer > 0) {
                rtv.ctx.save();
                rtv.ctx.fillStyle = "red";
                rtv.ctx.fillText(rtv.error.text, 250, 30);
                rtv.ctx.restore();
                rtv.error.timer -= 1;
            }
        }

        rtv.pen.render();

        draw_cursor();

        if (rtv.view_frame) {
            rtv.ctx.save();
            rtv.ctx.strokeStyle = "black";
            rtv.ctx.beginPath();
            let w = 1928; // +8 pixels for padding
            let h = 1088;
            rtv.ctx.rect(rtv.c.clientWidth - w/2, rtv.c.clientHeight - h/2, w, h);
            rtv.ctx.stroke();

            if (!rtv.presenting) {
                rtv.ctx.globalAlpha = .1;

                rtv.ctx.beginPath();
                rtv.ctx.moveTo(rtv.c.clientWidth - w/2, rtv.c.clientHeight);
                rtv.ctx.lineTo(rtv.c.clientWidth + w/2, rtv.c.clientHeight);
                rtv.ctx.stroke();

                rtv.ctx.beginPath();
                rtv.ctx.moveTo(rtv.c.clientWidth, rtv.c.clientHeight - h/2);
                rtv.ctx.lineTo(rtv.c.clientWidth, rtv.c.clientHeight + h/2);
                rtv.ctx.stroke();

                rtv.ctx.globalAlpha = 1;
            }

            rtv.ctx.restore();
        }

        rtv.transition.update();

        rtv.t += 1;

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}
