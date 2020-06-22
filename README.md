# anim

WARNING! Internal tool! Turn back while you still can!

Anim is used to make animations and graphs for the youtube series, https://www.youtube.com/watch?v=ZzWaow1Rvho

Quick user guide (subject to change or be out of date as the code changes):

This was made to assist in creating quick animations for my youtube series on neural networks. You can add text, circles, and draw shapes. An object's properties are smoothly transitioned while presenting.

Present: <code>ctrl enter</code>

Exit present mode: <code>esc</code>

Change frames: keys <code>0</code> and up or left and right arrow keys.

Insert frame: <code>+</code> button
Remove current frame: <code>-</code> button

Add objects:
  Select the tool for the object you want to create
  Text: click to place a line of text under the mouse
  Shape or vector: click and keep clicking to draw a shape
  Press <code>esc</code> to finish
  Circle: click to place a circle under the mouse pointer

You can select objects with the select tool (which uses rectangular selection)

You can define functions in text objects by just typing them in.

<code>f(x) = x^(2)</code>

Then you can graph them:

<code>graphxy(f)</code>

(click the <code>view xy</code> button in the menu to rotate the 3D coordinate axes to see your 2D graph)

You can interact with a variable by using a slider (just type in into a text object):

<code>slide:x</code>

Then enter presentation mode, <code>ctrl enter</code>, and drag (with your mouse) the variable name left and right to change it's value.

That's about it for now! Good luck! Even now the code is begging for bug fixes and cleaning up... So much repetition of code too(not used to javascript.. okay, end of my excuses).