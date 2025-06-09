@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var universalSampler: sampler;
@group(1) @binding(1) var userTextures: texture_2d_array<f32>;
struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>,    // crop
    @location(3) shapeType: u32,    // 0 = rect, 1 = circle, 2 = sprite
    @location(4) textureIndex: u32,    // textureIndex
    @location(5) color: vec4<u32>,    // rgba
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) crop: vec2<f32>,
    @location(1) vHalfSize: vec2<f32>,
    @location(2) localPos: vec2<f32>,
    @location(3) @interpolate(flat) shapeType: u32,
    @location(4) @interpolate(flat) textureIndex: u32,
    @location(5) @interpolate(flat) color: vec4<u32>,
    @location(6) z: f32,
};

struct FragmentOutput {
    @location(0) accu: vec4<f32>,
    @location(1) reve: vec4<f32>
}

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {

    let halfSize = props.size * 0.5;
    let localPos = quad[props.vi] * halfSize;
    let worldPos = props.center + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    let z = (props.center.y + halfSize.y - cameraBound.x) / (cameraBound.y - cameraBound.x); //z-buffer compare to sort    
     
    let textureSize = textureDimensions(userTextures, 0);
    let textureSizeFloat = vec2<f32>(f32(textureSize.x), f32(textureSize.y));
    let normalizeCrop = vec4<f32>(props.crop.xy / textureSizeFloat, props.crop.zw / textureSizeFloat);
 

    var out: VertexOutput;
    out.crop = normalizeCrop.xy + textureQuad[props.vi] * normalizeCrop.zw;
    out.localPos = localPos;
    out.vHalfSize = halfSize;
    out.shapeType = props.shapeType;
    out.color = props.color;
    out.textureIndex = props.textureIndex;
    out.position = vec4<f32>(translatePosition.xy, z, 1.0);
    out.z = z;
    
    return out;
}



@fragment
fn fragmentMain(props: VertexOutput) -> FragmentOutput {
    var color = convertColor(props.color);
    var weightedColor:vec3<f32>;
    var weight = max(min(1.0, max(max(color.r, color.g), color.b) * color.a), color.a) * 
                 clamp(0.03 / (1e-5 + pow(props.z / 200, 4.0)), 1e-2, 3e3);
    
    if(props.shapeType == 2){
        let texture = textureSampleLevel(userTextures,universalSampler, props.crop,props.textureIndex,0);
         if(texture.w < 0.001){discard;};
         color = texture * color;
         weightedColor = color.rgb * color.w;
    }
    else if(props.shapeType == 1){
        let unitDist = length(props.localPos / props.vHalfSize) - 1.0;
        let dist = unitDist * min(props.vHalfSize.x, props.vHalfSize.y);
        let smoothing: f32 = 0.5;
        let alpha = smoothstep(-smoothing, smoothing, -dist);
        weightedColor = color.rgb * alpha;
    }
    else{
        weightedColor = color.rgb * color.w;
    } 
 
    var out: FragmentOutput;
    out.accu = vec4<f32>(weightedColor,color.w) * weight;
    out.reve = vec4<f32>(color.w,1.0,1.0,1.0);
    
    return out;
    
}

fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}

