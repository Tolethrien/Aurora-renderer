@group(0) @binding(0) var lowerResBlurTexture: texture_2d<f32>;
@group(0) @binding(1) var currentLevelTexture: texture_2d<f32>;
@group(0) @binding(2) var outputTexture: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var linearSampler: sampler;

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputSize = vec2<f32>(textureDimensions(outputTexture));
    let uintSize = vec2<u32>(outputSize); 
    if (global_id.x >= uintSize.x || global_id.y >= uintSize.y) {
        return;
    }

    let uv = (vec2<f32>(global_id.xy) + vec2<f32>(0.5)) / outputSize;

    let upscaledBlurColor = textureSampleLevel(lowerResBlurTexture, linearSampler, uv, 0.0);
    let currentLevelColor = textureSampleLevel(currentLevelTexture, linearSampler, uv, 0.0);
    let blendedColor = (upscaledBlurColor * 0.7) +  currentLevelColor;
    textureStore(outputTexture, global_id.xy, blendedColor);
}
