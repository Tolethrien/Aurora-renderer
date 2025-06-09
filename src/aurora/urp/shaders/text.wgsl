@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var fontSampler: sampler;
@group(1) @binding(1) var fontsTexture: texture_2d<f32>;
@group(1) @binding(2) var<storage> chars: array<Char>;

struct VertexInput {
    @builtin(vertex_index) vi: u32,
    @location(0) center: vec2<f32>, // x,y
    @location(1) size: vec2<f32>, // w,h
    @location(2) crop: vec4<f32>, // crop [x,y,w,h]
    @location(3) textureIndex: u32,    // index of texture in array
    @location(4) color: vec4<u32>,    // rgba
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) crop: vec2<f32>,       // współrzędne jednostkowe [0..1]
    @location(3) @interpolate(flat) color: vec4<u32>,
};

struct Char {
  texOffset: vec2f,
  texExtent: vec2f,
  size: vec2f,
  offset: vec2f,
};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props : VertexInput) -> VertexOutput {
 let halfSize = props.size * 0.5;
    let localPos = quad[props.vi] * halfSize;
    let worldPos = props.center + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    let z = (props.center.y + halfSize.y - cameraBound.x) / (cameraBound.y - cameraBound.x);  
    
    let uvScale = textureQuad[props.vi] * props.crop.zw;
    let uv = props.crop.xy + uvScale;      



    var out: VertexOutput;
    out.crop = uv;
    out.color = props.color;
    out.Position = vec4<f32>(translatePosition.xy, z, 1.0);
    
    return out;

}

@fragment
fn fragmentMain(props : VertexOutput) -> @location(0) vec4f {
  // pxRange (AKA distanceRange) comes from the msdfgen tool. Don McCurdy's tool
  // uses the default which is 4.
   let color = convertColor(props.color);
  let pxRange = 4.0;
  let sz = vec2f(textureDimensions(fontsTexture, 0));
  let dx = sz.x*length(vec2f(dpdxFine(props.crop.x), dpdyFine(props.crop.x)));
  let dy = sz.y*length(vec2f(dpdxFine(props.crop.y), dpdyFine(props.crop.y)));
  let toPixels = pxRange * inverseSqrt(dx * dx + dy * dy);
  let sigDist = sampleMsdf(props.crop) - 0.5;
  let pxDist = sigDist * toPixels;

  let edgeWidth = 0.5;

  var alpha = smoothstep(-edgeWidth, edgeWidth, pxDist);

  if (alpha < 0.001) {
    discard;
  }

  alpha = pow(alpha, 0.4); // korekta gamma
  return vec4f(color.rgb, color.a * alpha);

}

fn sampleMsdf(texcoord: vec2f) -> f32 {
  let c = textureSample(fontsTexture, fontSampler, texcoord);
  return max(min(c.r, c.g), min(max(c.r, c.g), c.b));
}

fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}