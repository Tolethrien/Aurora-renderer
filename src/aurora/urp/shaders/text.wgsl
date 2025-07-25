@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var fontSampler: sampler;
@group(1) @binding(1) var fontsTexture: texture_2d_array<f32>;
@group(2) @binding(0) var<uniform> batcherOption: vec2<u32>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) pos: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>, // crop [x,y,w,h]
    @location(3) textureIndex: u32,    // index of texture in array
    @location(4) paading: u32,   
    @location(5) color: vec4<u32>,    // rgba
    @location(6) emissive: u32,    // bool


    
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) crop: vec2<f32>,       // współrzędne jednostkowe [0..1]
    @location(1) @interpolate(flat) textureIndex: u32,
    @location(2) @interpolate(flat) color: vec4<u32>,
    @location(3) z: f32,
    @location(4) @interpolate(flat) emissive: u32,


};
struct FragmentOutput {
    @location(0) primary: vec4<f32>,
    @location(1) depth: vec4<f32>,
};


const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props : VertexInput) -> VertexOutput {
    let halfSize = props.size * 0.5;
    let localPos = quad[props.vi] * halfSize;
    let worldPos = props.pos + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    
    let useSort = batcherOption.y; 
    let z = (props.pos.y + halfSize.y - cameraBound.x) / (cameraBound.y - cameraBound.x);  
    let zValue = select(1.0,z,useSort == 1u); 
    
    let uvScale = textureQuad[props.vi] * props.crop.zw;
    let uv = props.crop.xy + uvScale;      



    var out: VertexOutput;
    out.crop = uv;
    out.color = props.color;
    out.textureIndex = props.textureIndex;
    out.Position = vec4<f32>(translatePosition.xy, zValue, 1.0);
    out.z = z;
    out.emissive = props.emissive;

    
    return out;

}

@fragment
fn fragmentMain(props : VertexOutput) -> FragmentOutput {
  // pxRange (AKA distanceRange) comes from the msdfgen tool. Don McCurdy's tool
  // uses the default which is 4.
  let color = convertColor(props.color,props.emissive);
  var out:FragmentOutput;
  out.depth = vec4<f32>(props.z,0,0,0);
  
  let pxRange = 4.0;
  let sz = vec2f(textureDimensions(fontsTexture, 0));
  let dx = sz.x*length(vec2f(dpdxFine(props.crop.x), dpdyFine(props.crop.x)));
  let dy = sz.y*length(vec2f(dpdxFine(props.crop.y), dpdyFine(props.crop.y)));
  let toPixels = pxRange * inverseSqrt(dx * dx + dy * dy);
  let sigDist = sampleMsdf(props.crop,props.textureIndex) - 0.5;
  let pxDist = sigDist * toPixels;

  let edgeWidth = 0.5;

  var alpha = smoothstep(-edgeWidth, edgeWidth, pxDist);

  if (alpha < 0.001) {
    discard;
  }

  alpha = pow(alpha, 0.4); // korekta gamma
  let finalColor = vec4f(color.rgb, color.a * alpha);
  out.primary = finalColor;
  return out;

}


fn sampleMsdf(texcoord: vec2f,index:u32) -> f32 {
  let c = textureSample(fontsTexture, fontSampler, texcoord,index);
  return max(min(c.r, c.g), min(max(c.r, c.g), c.b));
}

fn convertColor(color: vec4u,emissive:u32) -> vec4f {
    let rgb = vec3f(color.rgb) / 255.0;
    let a = f32(color.a) /255;
  return vec4f(rgb * f32(emissive) ,a);
}