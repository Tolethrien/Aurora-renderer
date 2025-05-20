@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var offscreenTexture: texture_2d<f32>;
@group(0) @binding(2) var accuTexture: texture_2d<f32>;
@group(0) @binding(3) var revoTexture: texture_2d<f32>;

struct VertexInput {
  @builtin(vertex_index) vi: u32,
};
struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(1)  coords: vec2f,
  
};
const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

@vertex
fn vertexMain(props: VertexInput) -> VertexOutput {
    var out:VertexOutput;
    out.pos = vec4<f32>(quad[props.vi],1.0,1.0);
    out.coords = textureQuad[props.vi];

    return out;
}

@fragment
fn fragmentMain(props:VertexOutput) -> @location(0) vec4f{
   let offscreen = textureSampleLevel(offscreenTexture,textureSampler,props.coords,0).rgb;
   let accu = textureSampleLevel(accuTexture,textureSampler,props.coords,0).rgb;
   let reve = textureSampleLevel(revoTexture,textureSampler,props.coords,0).r;
   let w = max(reve, 1e-5);
    let transpC = accu / w;
     let finalRGB = mix(offscreen, transpC, w);

   return vec4<f32>(finalRGB, 1.0); 
}
