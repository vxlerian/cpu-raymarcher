var canvas = document.getElementById("shader-canvas");
var ctx = canvas.getContext("2d");
var width = canvas.width;
var height = canvas.height;
var runButton = document.getElementById("run-shader");
var editor = document.getElementById("shader-editor");
var fpsDisplay = document.getElementById("fps");
var statusDisplay = document.getElementById("status");
// CPU shader function wrapper
var shaderFunc;
// Timing for FPS
var lastFrame = performance.now();
var frameCount = 0;
runButton.addEventListener("click", function () {
    var code = editor.value;
    try {
        shaderFunc = new Function("x", "y", "width", "height", "time", code);
        statusDisplay.textContent = "Status: Shader loaded!";
    }
    catch (e) {
        statusDisplay.textContent = "Error compiling shader";
        console.error(e);
    }
});
// Main render loop
function render(time) {
    if (!shaderFunc) {
        requestAnimationFrame(render);
        return;
    }
    var buffer = new Uint8ClampedArray(width * height * 4);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var _a = shaderFunc(x, y, width, height, time * 0.001), r = _a[0], g = _a[1], b = _a[2];
            var idx = (y * width + x) * 4;
            buffer[idx] = r;
            buffer[idx + 1] = g;
            buffer[idx + 2] = b;
            buffer[idx + 3] = 255;
        }
    }
    var imageData = new ImageData(buffer, width, height);
    ctx.putImageData(imageData, 0, 0);
    // FPS calculation
    var now = performance.now();
    frameCount++;
    if (now - lastFrame >= 1000) {
        fpsDisplay.textContent = "FPS: ".concat(frameCount);
        frameCount = 0;
        lastFrame = now;
    }
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
