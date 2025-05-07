struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
  @location(0) instancePos: vec2<f32>, // przesunięcie instancji
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragColor: vec4<f32>,
};
const quad = array(vec2f(-0.25,-0.25), vec2f(0.25,-0.25), vec2f(-0.25, 0.25), vec2f(0.25, 0.25));

@vertex
fn vertexMain(props:VertexInput) -> VertexOutput {
  

  let localPos = quad[props.vertexIndex];
  let worldPos = localPos + props.instancePos;

  var out: VertexOutput;
  out.position = vec4<f32>(worldPos, 0.0, 1.0);
  out.fragColor = vec4<f32>(1.0, 1.0, 0.0, 1.0); // żółty
  return out;
}
@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.fragColor;
}