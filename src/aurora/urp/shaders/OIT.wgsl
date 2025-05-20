@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) shapeType: u32,    // 0 = rect, 1 = circle
    @location(3) color: vec4<u32>,    // rgba
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vCoord: vec2<f32>,
    @location(1) vHalfSize: vec2<f32>,
    @location(2) @interpolate(flat) shapeType: u32,
    @location(3) @interpolate(flat) color: vec4<u32>,
};
const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));

struct FragmentOutput {
    @location(0) accu: vec4<f32>,
    @location(1) reve: vec4<f32>
}
@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {

    let halfSize = props.size * 0.5;
    let localPos = quad[props.vi] * halfSize;
    let worldPos = props.center + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    let z = (props.center.y + halfSize.y - cameraBound.x) / (cameraBound.y - cameraBound.x); //z-buffer compare to sort    
    
    var out: VertexOutput;
    out.vCoord = localPos;
    out.vHalfSize = halfSize;
    out.shapeType = props.shapeType;
    out.color = props.color;
    out.position = vec4<f32>(translatePosition.xy, z, 1.0);
    
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> FragmentOutput {
    let color = convertColor(props.color);
    var out: FragmentOutput;
    
 
        let weightedColor = color.rgb * color.w;
        out.accu = vec4<f32>(weightedColor,1.0);
        out.reve = vec4<f32>(color.w,1.0,1.0,1.0);

    
    return out;
    
}

fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}

