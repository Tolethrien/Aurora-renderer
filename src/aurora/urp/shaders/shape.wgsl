@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) shapeType: u32,    // 0 = rect, 1 = circle
};

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) vCoord: vec2<f32>,
    @location(1) vHalfSize: vec2<f32>,
    @location(2) @interpolate(flat) vShapeType: u32,
};

@vertex
fn vertexMain(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let quad: array<vec2<f32>, 4> = array<vec2<f32>,4>(
        vec2<f32>(-1.0, 1.0),
        vec2<f32>( 1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0)
        
    );

    let halfSize = in.size * 0.5;
    let localPos = quad[in.vi] * halfSize;
    let worldPos = in.center + localPos;

    out.Position   = camera * vec4<f32>(worldPos, 0.0, 1.0);

    out.vCoord = localPos;
    out.vHalfSize = halfSize;
    out.vShapeType = in.shapeType;
    return out;
}



@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    var dist: f32;
    var alpha: f32;
 
    if (in.vShapeType == 0u) {
        let d = abs(in.vCoord) - in.vHalfSize;
        dist = length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
        alpha = 1.0;
    } else {
        let unitDist = length(in.vCoord / in.vHalfSize) - 1.0;
        dist = unitDist * min(in.vHalfSize.x, in.vHalfSize.y);
        let smoothing: f32 = 0.5;
        alpha = smoothstep(-smoothing, smoothing, -dist);
    }
    return vec4<f32>(1.0, 1.0, 1.0, alpha);
}

