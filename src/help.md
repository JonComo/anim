## HELP:

### KEYBOARD SHORTCUTS

- cmd / ctrl + z to undo last change.
- ← and → for previous and next frame.
- cmd / ctrl + return to enter presentation mode.
- esc to escape any tool or presentation mode.
- t for text tool.
- p for pen.
- s for shape tool.
- c for camera.
- v for vector tool.
- ctrl + backspace to delete any selected objects.
- ctrl + i, l, k or j to scale selected object.
- ctrl + u or o to rotate selected object.
- cmd / ctrl + b, m, r or e to start, pause, resume and save a recording, respectively.

### THINGS TO DO WITH TEXT BOXES

- `x = 5` to assign a value to a variable
- `e:x = x + 0.1` to repeatedly update x every frame
- `f(x) = sin(x)` to define a function
- `e:expression` to run expression each frame
- `slide:var_name` then present, and you can slide the box to change the variable value
- `e:graph(function_name)` to graph function\_name(x)

### ANIMATION BASICS

1.  Create a text, circle or drawing.
2.  Change frames with the ← and → arrow keys.
3.  Change the text or object's properties on the new frame.
4.  Enter presentation mode by hitting ctrl / cmd + return.
5.  ← and → arrow keys will show animated transition.
6.  Exit presentation mode by pressing esc.

### CONTROL CAMERA

- Tap camera or hit c to edit camera.
- Click and drag to pan.
- cmd / ctrl click and drag to rotate.
- The camera will transition smoothly frame to frame.

### RECORDING (MP4)

- To start recording, click on Start recording or press ctrl + shift + b.
- To pause, click on Pause recording or press ctrl + shift + m.
- To resume, click on Resume recording or press ctrl + shift + r.
- To stop recording and save, click on Stop recording or press ctrl + shift + e.

### FILES

- Tapping save local will overwrite a local file in browser's cache.
- Tapping load local clears your work and load the cached file.
- To save: enter a file name and hit save file.
- To load: hit load file and select your saved file.
- As you edit if you make a mistake you can undo by hitting cmd / ctrl + z.

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
