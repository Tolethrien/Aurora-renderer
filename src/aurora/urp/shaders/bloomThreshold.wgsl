@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var linearSampler: sampler; 

@compute
@workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputCoords = global_id.xy;

    let inputSize = textureDimensions(inputTexture);
    let outputSize = inputSize / 2u;

    if (outputCoords.x >= outputSize.x || outputCoords.y >= outputSize.y) {
        return;
    }

    let uv = (vec2<f32>(outputCoords) + vec2<f32>(0.5)) / vec2<f32>(outputSize);

    let sampledColor = textureSampleLevel(inputTexture, linearSampler, uv, 0.0);

    let thresholdValue = 1.0; 
    let kneeValue = 0.1;     
    
    var outputColor = vec4<f32>(0, 0, 0, 0);

    let luminance = dot(sampledColor.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

    if (luminance > thresholdValue) {
        let bloomFactor = max(0.0, luminance - thresholdValue); 
        let softFactor = bloomFactor / kneeValue; 
        let squaredFactor = softFactor * softFactor;
        let weight = squaredFactor / (1.0 + squaredFactor); 
        outputColor = sampledColor * weight;
    }
    
    textureStore(outputTexture, outputCoords, outputColor);
}