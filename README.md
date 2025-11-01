# Raymarcher

This is a test for a CPU raymarcher.

# notes for current demo version:

Use the arrow keys to move the camera.
Use the UI menus to select the scene preset and shading model.
There is some diagnostic data on the right side.

So far, only CPU raymarchers with threading has been implemented. In the future, we will implement GPU raymarchers, CRUD for objects and more details diagnostic data including comparing different algorithms. For now, algorithms can be compared by using the SDF evaluations and iterations heatmaps.

Note: The red to green heatmaps loop around when the evaluations and iterations exceed a certain point. (Because there can be very high evaluations or iterations, we use modulo % to loop them around). Be aware in case you see any artifacts.