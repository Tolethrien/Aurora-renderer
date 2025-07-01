@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var universalSampler: sampler;
@group(1) @binding(1) var userTextures: texture_2d_array<f32>;


struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) pos: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) intensity: u32,  
    @location(3) color: vec4<u32>,    // rgba
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(1) size: vec2<f32>,
    @location(2) centerPos: vec2<f32>,
    @location(3) @interpolate(flat) intensity: u32,
    @location(5) @interpolate(flat) color: vec4<u32>,

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
    out.intensity = props.intensity;
    out.position = vec4<f32>(translatePosition.xy, 0.0, 1.0);
    
    return out;
}




@fragment
fn fragmentMain(props: VertexOutput) -> @location(0) vec4<f32> {
    var INNER_RADIUS_PCT: f32 = 1.0; // wiekszy procent, aby rdzeń był bardziej zdefiniowany
    var CORE_INTENSITY_FACTOR: f32 = 1.0; // Jak bardzo rdzeń jest jaśniejszy niż bazowa intensywność
    var ALPHA_MULTIPLIER: f32 = 1.0; // Zwiększa ogólną przezroczystość, by rdzeń był bardziej widoczny
    let color = convertColor(props.color);
    let baseIntensity = f32(props.intensity) / 255.0;

    let normPos = props.centerPos / (props.size * 0.5);
    let dist = length(normPos);

    if (dist > 1.0) {discard;}

    let outer_glow_intensity = smoothstep(1.0, 0.0, dist);
    let core_intensity = smoothstep(INNER_RADIUS_PCT, 0.0, dist);
    let final_intensity = max(outer_glow_intensity, core_intensity * CORE_INTENSITY_FACTOR);

    let final_rgb = color.rgb * baseIntensity * final_intensity;
    let final_alpha = clamp(final_intensity * ALPHA_MULTIPLIER, 0.0, 1.0);

    return vec4<f32>(final_rgb, final_alpha);
}

fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}

