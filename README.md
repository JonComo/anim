# anim

WARNING! Internal tool! Turn back while you still can!

Used to make animations + graphs for https://www.youtube.com/watch?v=ZzWaow1Rvho

![Hello there](graph.gif?raw=true "Graphing Example")

Quick user guide (subject to change or be out of date as the code changes):

This was made to assist in creating quick animations for my youtube series on neural networks. You can add text, circles, and draw shapes. Object's properties are smoothly transitioned during presentation. 


Present: ctrl+p

Exit present mode: escape key

Change frames: keys [0-9] and left and right arrow key

Insert frame: + button
Remove current frame: - button

Add objects:
  Select the tool for the object you want.
  Text - click to place a line of text under the mouse
  Shape or vector - click and keep clicking to draw a shape. Escape when finished
  Circle - click to place a circle under the mouse

Select objects with the select tool ( has rectangular selection ).

Graph a function by typing

graph: x

In a text object.

You can define functions in text objects by just writing them.

f(x) = x^(2)

Then graph it:

graph: f(x)

you can draw the tangent like so:

tangent: f(x)

You can write expressions that are evaluated each frame by writing:

expr: x = 2

A counter:

  define x in a text object:
  x = 1

  Then in another write:
  expr: x = x + 1
  
You can interact with a variable by using a slider:

slide: x

Then enter presentation mode, ctrl + p, and drag your mouse over the variable name left and right to change it's value. 

That's about it for now! Good luck! Even now the code is begging for bug fixes and cleaning up... So much repetition of code too (not used to javascript.. ok end of my excuses). 
