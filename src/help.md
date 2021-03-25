## HELP:

### KEYBOARD SHORTCUTS

- <kbd>cmd</kbd> / <kbd>ctrl</kbd> + <kbd>z</kbd> to undo last change.
- <kbd>←</kbd> and <kbd>→</kbd> for previous and next frame.
- <kbd>cmd</kbd> / <kbd>ctrl</kbd> + return to enter presentation mode.
- <kbd>esc</kbd> to escape any tool or presentation mode.
- <kbd>t</kbd> for text tool.
- <kbd>p</kbd> for pen.
- <kbd>s</kbd> for shape tool.
- <kbd>c</kbd> for camera.
- <kbd>v</kbd> for vector tool.
- <kbd>ctrl</kbd> + backspace to delete any selected objects.
- <kbd>ctrl</kbd> + <kbd>i</kbd>, <kbd>l</kbd>, <kbd>k</kbd> or <kbd>j</kbd> to scale selected object.
- <kbd>ctrl</kbd> + <kbd>u</kbd> or <kbd>o</kbd> to rotate selected object.
- <kbd>cmd</kbd> / <kbd>ctrl</kbd> + <kbd>b</kbd>, <kbd>m</kbd>, <kbd>r</kbd> or <kbd>e</kbd> to start, pause, resume and save a recording, respectively.

### THINGS TO DO WITH TEXT BOXES

- `x = 5` to assign a value to a variable
- `e:x = x + 0.1` to repeatedly update x every frame
- `f(x) = sin(x)` to define a function
- `e:expression` to run expression each frame
- `slide:var_name` then present, and you can slide the box to change the variable value
- `e:graph(function_name)` to graph function\_name(x)

### ANIMATION BASICS

1.  Create a text, circle or drawing.
2.  Change frames with the <kbd>←</kbd> and <kbd>→</kbd> arrow keys.
3.  Change the text or object's properties on the new frame.
4.  Enter presentation mode by hitting <kbd>cmd</kbd> / <kbd>ctrl</kbd> + <kbd>return</kbd>.
5.  <kbd>←</kbd> and <kbd>→</kbd> arrow keys will show animated transition.
6.  Exit presentation mode by pressing <kbd>esc</kbd>.

### CONTROL CAMERA

- Tap camera or hit <kbd>c</kbd> to edit camera.
- Click and drag to pan.
- <kbd>cmd</kbd> / <kbd>ctrl</kbd> click and drag to rotate.
- The camera will transition smoothly frame to frame.

### RECORDING (MP4)

- To start recording, click on <kbd>Start</kbd> recording</kbd> or press <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>b</kbd>.
- To pause, click on <kbd>Pause</kbd> recording</kbd> or press <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>m</kbd>.
- To resume, click on <kbd>Resume</kbd> recording</kbd> or press <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>r</kbd>.
- To stop recording and save, click on <kbd>Stop</kbd> recording</kbd> or press <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>e</kbd>.

### FILES

- Tapping save local will overwrite a local file in browser's cache.
- Tapping load local clears your work and load the cached file.
- To save: enter a file name and hit save file.
- To load: hit load file and select your saved file.
- As you edit if you make a mistake you can undo by hitting <kbd>cmd</kbd> / <kbd>ctrl</kbd> + <kbd>z</kbd>.

### MORE FUNCTIONS

- `L = range(a, b, c)` to create array of values from `a` to `b` incrementing by `c`.
- `e:view(L, [x, y, z])` print matrix elements at position \[x,y,z\].
- `e:surface(func)` to graph `y = func(x, z)` as a grid of points.
- `e:scatter(A)` `A` is n by 3 matrix of points to be scatter plotted.
- `A = randn([a, b, c, ...])` to create matrix of random normal values.
- `A[1, 2]` to index into matrix `A` with 1 based indexing, not zero! :-(.

### SPECIAL VALUES

- `_x` mouse x position, `_y` mouse y position.
- `_frame` current frame (counts up indefinitely).
- `_t` frame transition from 0 to 1, `_tt` eased transition.
