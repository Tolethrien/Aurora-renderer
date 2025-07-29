@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var<uniform> index: u32;
@group(1) @binding(0) var offscreenTexture: texture_2d<f32>;
@group(1) @binding(1) var depthTexture: texture_2d<f32>;
@group(1) @binding(2) var lightMapTexture: texture_2d<f32>;
@group(1) @binding(3) var bloomTexture: texture_2d<f32>;
@group(2) @binding(0) var<uniform> bloomParams: BloomParams;


override toneMapping: u32 = 1;


struct BloomParams{
    threshold:f32,
    thresholdSoftness:f32,
    bloomIntense:f32
};
struct VertexInput {
  @builtin(vertex_index) vi: u32,
};
struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(1)  coords: vec2f,
  
};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));
const exposure = 0.8;


@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    var out:VertexOutput;
    out.pos = vec4<f32>(quad[props.vi],1.0,1.0);
    out.coords = textureQuad[props.vi];

    return out;
}



@fragment
fn fragmentMain(props:VertexOutput) -> @location(0) vec4f{
  var out: vec4<f32>;
  let offscreen = textureSampleLevel(offscreenTexture,textureSampler,props.coords,0);
  let lightMap = textureSampleLevel(lightMapTexture,textureSampler,props.coords,0);
  let bloom = textureSampleLevel(bloomTexture,textureSampler,props.coords,0);
  let finalColor = (offscreen.rgb * lightMap.rgb) + bloom.rgb;
  
  var toneMapped: vec3f;
  var bloomToned: vec3f;
    if(toneMapping == 0){
        toneMapped = finalColor;
        bloomToned = bloom.rgb;
    }
    else if (toneMapping == 1) {
        toneMapped = reinhard_tone_map(finalColor);
        bloomToned = reinhard_tone_map(bloom.rgb);

    } else if (toneMapping == 2) {
        toneMapped = aces_tone_map(finalColor);
        bloomToned = aces_tone_map(bloom.rgb);

    } else if (toneMapping == 3) {
        toneMapped = filmic_tone_map(finalColor);
        bloomToned = filmic_tone_map(bloom.rgb);

    }
  if(index == 3) {
    let depthValue = textureSampleLevel(depthTexture,textureSampler,props.coords,0).r;
    let objectDepth = select(depthValue*10,0,depthValue == 0);
    out = vec4<f32>(objectDepth,objectDepth,objectDepth,1);
  }
  else if(index == 0) {out = vec4<f32>(toneMapped,offscreen.a);}
  else if(index == 1) {out = offscreen;}
  else if(index == 2) {out = lightMap;}
  else if(index == 4) {out = vec4<f32>(bloomToned,1.0);}
   return out;
}

fn reinhard_tone_map(x: vec3f) -> vec3f {
    return x / (x + vec3<f32>(1.0));
}

fn aces_tone_map(x: vec3f) -> vec3f {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
}

fn filmic_tone_map(x: vec3f) -> vec3f {
    let val = max(vec3<f32>(0.0), x - 0.004);
    let result = (val * (6.2 * x + 0.5)) / (val * (6.2 * x + 1.7) + 0.06);
    return result;
}