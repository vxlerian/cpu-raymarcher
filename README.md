# Raymarcher Visualiser
By Group 11, COMP3821 25T3!

> Note that the most stable version of the project is hosted publically, and can be found [here](https://vxlerian.github.io/cpu-raymarcher/).

# About
This project was created for COMP3821 (Extended Algorithm Design and Analysis), being a Major Project under the Creative/Experimental category. At its simplest, the project revolved around creating a visualiser to display output renders of various raymarching algorithms, as well as performing comparisons of performance metrics.


# Features
## Visualiser
The main aspect of this project is a dynamic raymarcher, able to render 3D scenes. The main difference between this raymarcher and a static raymarcher is that scenes are rendered in real-time, allowing for further interaction/measurement with scene performance. Furthermore, the raymarcher takes a variety of parameters, explained below.

### Algorithms
In accordance with the project goal, multiple raymarcher algorithms are implemented into the visualiser. While they achieve the same goal (dynamic rendering), they do so in differing ways - explained in further detail within the project's associated report. The currently supported algorithms are:

* Fixed Step Iteration
* Adaptive Step Iteration
* Sphere Tracing

### Optimisations
Added as an additional layer to the algorithms, optimisations can also be applied to the raymarchers; making use of divide-and-conquer style logic to heavily reduce the amount of computation required to render a scene. This (alongside experimental insights) are also discussed further in the project report. The currently supported optimisations are:

* Octree Acceleration
* Bounded Volume Hierachy (BVH) Acceleration

### Scenes
In order to compare raymarching algorithms and optimisations, they must be tested on a range of scenes. Formally, a scene is a collection of primitive objects (such as spheres, cubes, etc.), composed in varying manners. The composition of a scene can heavily impact the number of computations required to render a scene, as well as impacting the efficiency of optimisations. The currently implemented scenes are:

* Sphere
* Grid of Spheres
* Dense Grid of Spheres
* Atom 
* Random Spheres
* Torus
* Cube
* Cube and Sphere
* Pyramid of Boxes

### Shaders
Applied on top of the rendered scene, shaders are used to apply depth/colouration to each scene. As well as enhancing the 'creative' aspect of the project, certain added shaders (marked with a $\star$) provide further diagnostic information, representing the number of operations required to render that pixel. The currently implemented shaders are:

* Normal
* Phong
* $\star$ Signed Distance Function (SDF) Heatmap
* $\star$ Iteration Heatmap

> Note: The red to green heatmaps loop around when the evaluations and iterations exceed a certain point. (Because there can be very high evaluations or iterations, we use modulo % to loop them around). Be aware in case you see any artifacts.

## Diagonistic Information
In addition to the rendered scene, the visualiser also provides diagonistic information regarding the computation required to the create the scene. The currently displayed metrics are:

* Frame Length - *the total time in milliseconds (ms) to render a single frame*
* Average SDF Calls - *the mean number of signed distance function (SDF) evaluations per pixel.*
* Maximum SDF Calls - *the highest number of signed distance function (SDF) evaluations of any pixel.*
* Minimum SDF Calls - *the lowest number of signed distance function (SDF) evaluations of any pixel.*
* Average Iterations - *the number of raymarching steps for any pixel.*

# Pages/Usage

## Playground
* Use the arrow keys to move the camera.
* Use the UI menus to select the scene preset and shading model.
* Use the checkboxes to enable optimisations. 
* There is some diagnostic data on the right side.

## Analytics
* Camera movement is disabled on this page; the scene will automatically rotate.
* Use the UI menus to select the scene preset, shading models and the metric you wish to observe.
* The right graph will dynamically update with each rotation, with the ability to also enable optimisations (resulting in direct changes to the graph).

# Future Plans
So far, only CPU raymarchers with threading has been implemented. In the future, we wish to implement:

* GPU raymarchers, 
* CRUD for objects, and
* More details diagnostic data including comparing different algorithms. 

For now, algorithms can be compared by using the SDF evaluations and iterations heatmaps.

