@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;
// @group(0) @binding(2) var<uniform> uniforms: ThresholdUniforms;

// struct ThresholdUniforms {
//     threshold: f32,
// };

@compute
@workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let coords = global_id.xy;
    var outputColor = vec4<f32>(0, 0, 0, 0);
    let treshTemp = 1.0;
    let inputSize = textureDimensions(inputTexture);
    if (coords.x >= inputSize.x || coords.y >= inputSize.y) {
        return;
    }
    let color = textureLoad(inputTexture, coords,0);
    // Używamy ITU-R BT.709 dla luminancji
    let luminance = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    if (luminance > treshTemp) {
        outputColor = color;
    }
    
    textureStore(outputTexture, coords, outputColor);

}