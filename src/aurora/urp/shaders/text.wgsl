@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) char: u32 //char
    @location(2) color: vec4<u32>,    // rgba
    @location(3) fontSize: u32,    //
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) vCoord: vec2<f32>,
    @location(1) vHalfSize: vec2<f32>,
    @location(2) @interpolate(flat) vShapeType: u32,
    @location(3) @interpolate(flat) color: vec4<u32>,
};