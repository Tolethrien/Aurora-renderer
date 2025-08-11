@group(0) @binding(0) var universalSampler: sampler;
@group(0) @binding(1) var userTextures: texture_2d_array<f32>;


struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) pos: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>,    // crop
    @location(3) textureIndex: f32,    //texture index
    @location(4) layer: f32,    // layer
    @location(5) round: f32,    // roundness
    @location(6) color: vec4<f32>,    // rgba
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) crop: vec2<f32>,
    @location(1) @interpolate(flat) textureIndex: f32,
    @location(2) @interpolate(flat) color: vec4<f32>,
    @location(3) @interpolate(flat) round: f32, 
    @location(4) size: vec2<f32>, 
    @location(5) centerSize: vec2<f32>,

};




const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
     let offset = vec2<f32>(props.size.x * 0.5, -props.size.y * 0.5);
    let center = quad[props.vi] * (props.size * 0.5);
    let worldPos = props.pos + center + offset;
    
    let textureSize = textureDimensions(userTextures, 0);
    let textureSizeFloat = vec2<f32>(f32(textureSize.x), f32(textureSize.y));
    let normalizeCrop = vec4<f32>(props.crop.xy / textureSizeFloat, props.crop.zw / textureSizeFloat);
 

    var out: VertexOutput;
    out.crop = normalizeCrop.xy + textureQuad[props.vi] * normalizeCrop.zw;
    out.color = props.color;
    out.textureIndex = props.textureIndex;
    out.position = vec4<f32>(worldPos, props.layer, 1.0);
    out.round = props.round;
    out.size = props.size;
    out.centerSize = center;
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> @location(0) vec4<f32> {
    let index = u32(props.textureIndex);
    let texture = textureSampleLevel(userTextures, universalSampler, props.crop, index, 0);
    if (texture.a < 0.001) {
        discard;
    };
    
    let half_size = props.size * 0.5;
    let round_clamped = clamp(props.round, 0.0, 1.0);
    let radii = half_size * round_clamped;
    let sdf = sdRoundBox(props.centerSize, half_size, radii);
    let antialias_width = fwidth(sdf);
    let sharp_aa = antialias_width * 0.5; 
    let alpha = smoothstep(sharp_aa, -sharp_aa, sdf);

    if (alpha < 0.001) {
        discard;
    }
    
    let color = props.color / 255.0;
    let final_rgb = texture.rgb * color.rgb;
    
    return vec4<f32>(final_rgb, texture.a * color.a *  alpha);
}
fn sdRoundBox(p: vec2<f32>, s: vec2<f32>, r: vec2<f32>) -> f32 {
    if (r.x <= 0.001 && r.y <= 0.001) {
        let d = abs(p) - s;
        return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
    }
        let q = abs(p) - s + r;
    
    let q_corner_normalized = max(q, vec2<f32>(0.0)) / r;
    let corner_dist = (length(q_corner_normalized) - 1.0) * min(r.x, r.y);
    let edge_dist = min(max(q.x, q.y), 0.0);
    
    return corner_dist + edge_dist;
}



