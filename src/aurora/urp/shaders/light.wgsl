@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var universalSampler: sampler;
@group(1) @binding(1) var userTextures: texture_2d_array<f32>;


struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) pos: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(3) color: vec4<f32>,    // rgba
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(1) size: vec2<f32>,
    @location(2) centerPos: vec2<f32>,
    @location(5) @interpolate(flat) color: vec4<f32>,

};


const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));


@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    let centerPos = quad[props.vi] * (props.size * 0.5);
    let localPos = centerPos;
    let worldPos = props.pos + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0); 

    var out: VertexOutput;
    out.centerPos = centerPos;
    out.size = props.size;
    out.color = props.color;
    out.position = vec4<f32>(translatePosition.xy, 0.0, 1.0);
    
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> @location(0) vec4<f32> {
    const FALLOFF_EXPONENT: f32 = 2.0;
    let color = convertColor(props.color);
    let intensity = color.a;

    let radius = props.size.x * 0.5;
    let dist_pixels = length(props.centerPos);
    let dist_norm = dist_pixels / radius;

    if (dist_norm > 1.0) {
        discard;
    }

    let attenuation = pow(max(0.0, 1.0 - dist_norm * dist_norm), FALLOFF_EXPONENT);
    let final_rgb = color.rgb * intensity * attenuation;

    return vec4<f32>(final_rgb, 0);
}

fn convertColor(color: vec4f) -> vec4f {
  return color/255;
}

