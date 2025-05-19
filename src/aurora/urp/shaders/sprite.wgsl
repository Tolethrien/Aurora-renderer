@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var universalSampler: sampler;
@group(1) @binding(1) var userTextures: texture_2d_array<f32>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>, // crop [x,y,w,h]
    @location(3) textureIndex: u32,    // index of texture in array
    @location(4) color: vec4<u32>,    // rgba
};

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) crop: vec2<f32>,       // współrzędne jednostkowe [0..1]
    @location(2) @interpolate(flat) color: vec4<u32>,
    @location(3) @interpolate(flat) textureIndex: u32,
};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    var out: VertexOutput;

    let halfSize = props.size * 0.5;
    let worldPos = props.center + quad[props.vi] * halfSize;
    let z = ((props.center.y + halfSize.y) - cameraBound.x) / (cameraBound.y - cameraBound.x); //z-buffer compare to sort
    let translatePosition = camera * vec4<f32>(worldPos, 0.0, 1.0);
    
    let textureSize = textureDimensions(userTextures, 0);
    let textureSizeFloat = vec2<f32>(f32(textureSize.x), f32(textureSize.y));
    let normalizeCrop = vec4<f32>(props.crop.xy / textureSizeFloat, props.crop.zw / textureSizeFloat);
    
    out.Position = vec4<f32>(translatePosition.xy, z, 1.0);
    out.crop = normalizeCrop.xy + textureQuad[props.vi] * normalizeCrop.zw;
    out.textureIndex = props.textureIndex;
    out.color = props.color;
    
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> @location(0) vec4<f32> {
    let texture = textureSampleLevel(userTextures,universalSampler, props.crop,props.textureIndex,0);
    if(texture.w < 0.01){discard;};
    let color = convertColor(props.color);
    if(props.textureIndex == 0){return color;};
    let finalColor = texture * color;
    
    return finalColor;
}

fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}
