// downsample.wgsl
// Ten shader zmniejsza teksturę wejściową, używając filtrowania liniowego.

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;
// Sampler jest niezbędny do interpolacji kolorów (filtrowania)
@group(0) @binding(2) var linearSampler: sampler;

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputSize = vec2<f32>(textureDimensions(outputTexture));
    if (global_id.x >= u32(outputSize.x) || global_id.y >= u32(outputSize.y)) {
        return;
    }

    // Oblicz współrzędne UV do próbkowania tekstury wejściowej.
    // Dodanie 0.5 zapewnia próbkowanie ze środka piksela, co daje lepsze wyniki.
    let uv = (vec2<f32>(global_id.xy) + vec2<f32>(0.5)) / outputSize;

    // Próbkuj teksturę wejściową z użyciem samplera liniowego.
    // textureSampleLevel pobiera interpolowaną wartość koloru w podanych współrzędnych UV.
    let color = textureSampleLevel(inputTexture, linearSampler, uv, 0.0);

    // Zapisz wynik w teksturze wyjściowej.
    textureStore(outputTexture, global_id.xy, color);
}