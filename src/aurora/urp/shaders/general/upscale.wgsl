
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var linearSampler: sampler;

override workgroupSize: u32 = 8;

@compute @workgroup_size(workgroupSize, workgroupSize)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputSize = vec2<f32>(textureDimensions(outputTexture));
    if (global_id.x >= u32(outputSize.x) || global_id.y >= u32(outputSize.y)) {
        return;
    }

    let inputSize = vec2<f32>(textureDimensions(inputTexture));
 let uv = (vec2<f32>(global_id.xy) + vec2<f32>(0.5)) / outputSize;
    let color = textureSampleLevel(inputTexture, linearSampler, uv, 0.0);
    textureStore(outputTexture, global_id.xy, color);
}