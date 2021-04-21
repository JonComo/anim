# anim

WARNING! Internal tool! Turn back while you still can! On that note, anim has started to become actively managed! Feel free to submit issues and they just may be addressed :-)

Anim is used to make animations and graphs for the youtube series, https://www.youtube.com/watch?v=ZzWaow1Rvho

## Quick user guide (subject to change or be out of date as the code changes):

This was made to assist in creating quick animations for my youtube series on neural networks. You can add text, circles, and draw shapes. An object's properties are smoothly transitioned while presenting.

### Setup

(If you are planning to modify `anim`, see the [development setup guide](#setup-guide-development)!)

`anim` is available both as [source code](https://github.com/JonComo/anim) and as a bundled `index.html`, `main.*.js` and a few extra files (including licenses and source maps). If you are not planning to modify `anim`, you should proceed with the second option. This section describes how to do so.

To run `anim`, you can visit the [GitHub Pages site](https://joncomo.github.io/anim/) which hosts the compiled code. However, the code is available for download at https://github.com/JonComo/anim/releases (instructions are available under [Downloading](#downloading)). This enables you to open an `index.html` file in your favorite browser and use `anim` there, with the added benefit of `anim` working while you don't have a valid internet connection. Keep in mind that a local copy of `anim` might become outdated.

### Downloading

1. Visit https://github.com/JonComo/anim/releases and pick a release (if you have no preference, go with the latest).
![Releases](https://user-images.githubusercontent.com/49883288/115542188-06da3c80-a26e-11eb-8413-33e61262d387.png)

2. Choose an archive format. Click on it to download. You'll need to be able to unarchive it once it's downloaded, so make sure your computer has the necessary software installed that correspond to the format you pick.
![Archive Download](https://user-images.githubusercontent.com/49883288/115542797-a4357080-a26e-11eb-982e-5fcb387859b9.png)

3. Navigate to where the archive was downloaded onto your system. If you are on Windows and have downloaded the `.zip` archive, right-click it and select <kbd>Extract All</kbd>, and then follow the on-screen instructions. On macOS, it should be sufficient to double-click the archive. Finally, if you're running Linux, you can execute `tar -xzvf <archive>.tar.gz` or `unzip <archive>.zip` to unarchive the download. If you prefer the GUI, you might have an archive manager installed that will unarchive the download for you.

4. Navigate into the `<archive>` directory (it doesn't have a file extension!) and open `index.html` in your favorite browser. If all went well, you should now have a local copy of (compiled) `anim`.

6. Since the archive has been extracted, you can delete it. If you'd like to download another version of `anim`, follow the previous steps again. If you are not planning to use a local version of `anim` anymore, you can delete the extracted directory that contains it.

### Frequently Used Features

(A more elaborate help section can be found by scrolling down on `anim`!)

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

## Setup Guide (Development)

This section explains the process of setting up your own environment for developing `anim`.

### Prerequisites

Before starting, you must have Node.js (https://nodejs.org/) and NPM (https://npmjs.com) installed on your system. Make sure you have Git (https://git-scm.com/) installed if you're planning to submit your modifications (or just want to keep track of your changes)!

### Obtaining the code

First things first, you must download `anim`'s code. Here are some options:

- Clone this repository

  If you're planning to play around with `anim`'s code, but aren't really interested in contributing, go with this option. First, clone this repository using the command `git clone https://github.com/JonComo/anim`. Using this option will also let you update your local version of this repository whenever you feel like it. Just run `git pull` in the repository directory!

  - Use the GitHub CLI!

    If you have the [GitHub CLI](https://cli.github.com/) installed, then you can just clone this repository by executing `gh repo clone JonComo/anim`.

- Fork this repository.

  If you're going to submit code changes to this repository, then you should create a fork of it. To do so, navigate to this repository's URL (https://github.com/JonComo/anim) and press the <kbd>Fork</kbd> button in the top-right corner of the GitHub UI. Then, clone it using `git clone https://github.com/<your username here>/anim` or whatever software you please!

  - Fork with the GitHub CLI

    To fork this repo and then clone the fork with the [GitHub CLI](https://cli.github.com/), run `gh repo fork --clone JonComo/anim`.

- Download https://github.com/JonComo/anim/archive/master.zip and unzip it.

- Use your software of choice!

  I think you know what to do.

### Install stuff

Once you have this repository's contents on your system, you must install some packages with NPM. These include ones like `webpack` and friends, `jquery` and more! To install them, run
```
npm install
```

Now, you should be all set to start modifying the code.

### Starting it up

`anim` uses the [Webpack bundler](https://webpack.js.org/): a program which squashes all of a project's code into a few files. You've already installed it in the previous step when running `npm install`. Now, all you need to do is run `npm start` to start the Webpack development server (Webpack dev server for short). Now, open your browser to https://localhost:9000/ and wait for a page to load. The Webpack dev server automatically bundles `anim` every time you change the code. Try editing the code and wait for the browser page to reload. Wow! Your changes are reflected in the browser. When you feel like you want to share your new and improved code with others, head on down to the next section.

### Compile it!

Once you're satisfied with your changes, you can bundle everything up. Just run `npm run build` and look in the `dist/` directory. You should see a new file named `main.js`. This file is Webpack's compiled version of your code. Opening up `dist/index.html` in your browser should open up `anim` accompanied by your changes. Hooray!

That's about it for now! Good luck! Even now the code is begging for bug fixes and cleaning up... So much repetition of code too(not used to javascript.. okay, end of my excuses).
