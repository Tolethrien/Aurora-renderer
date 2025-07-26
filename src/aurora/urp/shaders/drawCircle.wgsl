@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var universalSampler: sampler;
@group(1) @binding(1) var userTextures: texture_2d_array<f32>;
@group(2) @binding(0) var<uniform> batcherOption: vec2<u32>;


struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) pos: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>,    // crop
    @location(3) textureIndex: f32,    //texture index
    @location(4) color: vec4<f32>,    // rgba
    @location(5) emissive: f32,    // bool
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) crop: vec2<f32>,
    @location(1) size: vec2<f32>,
    @location(2) centerSize: vec2<f32>,
    @location(3) @interpolate(flat) textureIndex: f32,
    @location(4) @interpolate(flat) color: vec4<f32>,
    @location(5) z: f32,
    @location(6) @interpolate(flat) emissive: f32,

};
struct FragmentOutput {
    @location(0) primary: vec4<f32>,
    @location(1) depth: vec4<f32>,
};


const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    let centerSize = quad[props.vi] * (props.size * 0.5);
    let fullSize = ((quad[props.vi] + vec2f(1.0)) * 0.5) * props.size;
    let drawOrigin = batcherOption.x;
    let localPos = select(centerSize,fullSize, drawOrigin == 1u);
    let worldPos = props.pos + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    
    
    let useSort = batcherOption.y; 
    let quadSize = select(props.size.y * 0.5,props.size.y,drawOrigin == 1u);
    let z = (props.pos.y + quadSize - cameraBound.x) / (cameraBound.y - cameraBound.x); //z-buffer compare to sort    
    let zValue = select(1.0,z,useSort == 1u); 
    let textureSize = textureDimensions(userTextures, 0);
    let textureSizeFloat = vec2<f32>(f32(textureSize.x), f32(textureSize.y));
    let normalizeCrop = vec4<f32>(props.crop.xy / textureSizeFloat, props.crop.zw / textureSizeFloat);
 

    var out: VertexOutput;
    out.crop = normalizeCrop.xy + textureQuad[props.vi] * normalizeCrop.zw;
    out.centerSize = centerSize;
    out.size = props.size;
    out.color = props.color;
    out.textureIndex = props.textureIndex;
    out.position = vec4<f32>(translatePosition.xy, zValue, 1.0);
    out.z = z;
    out.emissive = props.emissive;
    
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> FragmentOutput {
    var out:FragmentOutput;
    out.depth = vec4<f32>(props.z,0,0,0);
    let color = convertColor(props.color,props.emissive);
    let index = u32(props.textureIndex);

    let texture = textureSampleLevel(userTextures,universalSampler, props.crop,index,0);
    
    let drawOrigin = batcherOption.x;
    let halfSize = props.size * 0.5;
    let size = select(props.size * 0.5,props.size * 0.5,drawOrigin == 1u);
    let unitDist = length(props.centerSize / halfSize) - 1.0;
    let dist = unitDist * min(halfSize.x, halfSize.y);
    let smoothing: f32 = 0.5;
    let alpha = smoothstep(-smoothing, smoothing, -dist);
    
    if(alpha < 0.001 ){discard;};
    
    let finalColor = texture * color;
    out.primary = finalColor;
    return out;
}

fn convertColor(color: vec4f,emissive:f32) -> vec4f {
    let rgb = color.rgb / 255.0;
    let a = color.a /255.00;
  return vec4f(rgb * emissive ,a);
}

