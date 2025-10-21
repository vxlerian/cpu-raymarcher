Hello there :)

# Raymarcher

This is a test for a CPU raymarcher.

# notes for first demo version:

Arrow keys to rotate the scene. Also the euler rotation is in the wrong order, my bad

okay so things are in really rough shape in this first test LOL. This was very rushed and I just wanted to get the ball rolling.

Firstly, the fps is roughly 0.6-0.7 fps. There is no GPU acceleration because flattening our Scene object into an array will make our job a bit harder, and doing things on the GPU alone might limit some of our optimisations.

(Unless you guys want to do that? See the bottom for ways we might speed up our code later. This speeding up is not improving the algorithm and is just for the visualiser, but it may affect how we implement the algorithm.)

Secondly, here is the layout of the files in the project (although I hope they're intuitive).

test_algorithms has an abstract class Raymarcher. You can copy how sphereTracer.ts implements it. Be wary of the buffers. The image array buffers are how the raymarching is recorded. The buffers are differently sized. Eg. depth is a buffer with one value: depth, but normal is a buffer with three values: x, y, z. The normal buffer is three times longer and is indexed weirdly.

I tried to abstract as much as possible to simplify the raymarcher. The raymarcher always sets the camera to the origin looking in the negative Z axis (with right handed axes.) The raymarcher is given a Scene object which has a bunch of SDFs inside an array.

Scene, camera and primitive are responsible for transforming the objects to give the illusion the the camera is moving. Scene is responsible for converting coordinates from primitive local space to world space to view space and back. You don't need to know this unless you want to refactor something.

Shading models and algorithms have their own classes so that main.ts can just swap the algorithm for a new one whenever the user wants to switch. I haven't implemented any UI for this so you have to change it in the code to see it.


# ways we can speed it up

1. parallelism in JS is a bit funky because JS is fundamentally singlethreaded. The closest thing is Web Workers. This is pretty within our scope. It's extra work for us, but it'll multiply the speed depending on how many Web Workers across which the rendering job is split.

2. general optimisations: I haven't done these yet, but these can give us good speed-ups. Eg using Float32Array over Array<number>, reducing redundant work, and avoiding allocating memory for every pixel (and using flat arrays in their place.) These actually tank performance so I should update this in my code ASAP ;-;

3. GPU.js or WebGL or Three.js or any other GPU thing: It is doable and will give amazing, but we'd have to deal with one or more:

- forego the editable scenes where you can add, remove and edit primitive shapes. (Instead, we can use static premade scenes, or have more restricted scene editing.)

Wait, that actually doesn't sound so bad, now that I'm writing it out. We could totally do that. Dang. Also, making the switch won't need too much refactoring.

- we'd have to store our algorithms in strings, concatenate them in weird ways and compile them every time we change the SDFs in our scene. This is bad, very bad. (Like in Nathaniel's vibecoded one.)



(disclaimer: We don't actually *have* to speed it up. All the webapp needs to demonstrate is the increase in speed between algorithms and give good diagnostic data.)