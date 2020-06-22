# anim

WARNING! Internal tool! Turn back while you still can!

Used to make animations + graphs for https://www.youtube.com/watch?v=ZzWaow1Rvho

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

You can define functions in text objects by just writing them.

<code>f(x) = x^(2)</code>

Then graph it:

<code>graphxy(f)</code>

(click the <code>view xy</code> button in the menu to rotate the 3D coordinate axes to see your graph)

You can interact with a variable by using a slider:

<code>slide:x</code>

Then enter presentation mode, <code> ctrl enter</code>, and drag your mouse over the variable name left and right to change it's value. 

That's about it for now! Good luck! Even now the code is begging for bug fixes and cleaning up... So much repetition of code too (not used to javascript.. ok end of my excuses). 
