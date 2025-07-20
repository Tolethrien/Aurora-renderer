@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var<uniform> index: u32;
@group(1) @binding(0) var offscreen: texture_2d<f32>;
@group(1) @binding(1) var depth: texture_2d<f32>;
@group(1) @binding(2) var lightMap: texture_2d<f32>;
@group(1) @binding(3) var bloomTexture: texture_2d<f32>;

struct VertexInput {
  @builtin(vertex_index) vi: u32,
};
struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(1)  coords: vec2f,
  
};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

const USE_ACES_TONEMAP: bool = true; 

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    var out:VertexOutput;
    out.pos = vec4<f32>(quad[props.vi],1.0,1.0);
    out.coords = textureQuad[props.vi];

    return out;
}

// Reinhard-podobny Tone Mapping
fn reinhard_tone_map(x: vec3f) -> vec3f {
    return x / (x + vec3<f32>(1.0));
}

// Simplified ACES Film Look Tone Mapping
fn aces_tone_map(x: vec3f) -> vec3f {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
}

@fragment
fn fragmentMain(props:VertexOutput) -> @location(0) vec4f{
  var out: vec4<f32>;
  let offscreen = textureSampleLevel(offscreen,textureSampler,props.coords,0);
  let lightMap = textureSampleLevel(lightMap,textureSampler,props.coords,0);
  let bloom = textureSampleLevel(bloomTexture,textureSampler,props.coords,0);
  
  // Zastosuj mapę światła i bloom do koloru z offscreen
  let finalColor = (offscreen.rgb + bloom.rgb) * lightMap.rgb;
  
  var toneMapped: vec3f;
  var bloomToned: vec3f;

    if (USE_ACES_TONEMAP) {
        // Zastosuj ACES tone mapping
        toneMapped = aces_tone_map(finalColor);
        bloomToned = aces_tone_map(bloom.rgb);
    } else {
        // Zastosuj Reinhard-podobny tone mapping
        toneMapped = reinhard_tone_map(finalColor);
        bloomToned = reinhard_tone_map(bloom.rgb);
    }

  if(index == 3) {
    let depthValue = textureSampleLevel(depth,textureSampler,props.coords,0).r;
    let objectDepth = select(depthValue*10,0,depthValue == 0);
    out = vec4<f32>(objectDepth,objectDepth,objectDepth,1);
  }
  else if(index == 0) {out = vec4<f32>(toneMapped,offscreen.a);} // Tone mapped output
  else if(index == 1) {out = offscreen;}
  else if(index == 2) {out = lightMap;}
  else if(index == 4) {out = vec4<f32>(bloomToned,1.0);} // Tone mapped bloom
   return out;
}