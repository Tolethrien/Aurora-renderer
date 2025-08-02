override workgroupSize: u32 = 8;

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;

const weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
const offsets = array<i32, 5>(0, 1, 2, 3, 4);

@compute @workgroup_size(workgroupSize, workgroupSize)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputSize = textureDimensions(outputTexture);
  

    let texelSize = vec2<f32>(1.0 / f32(outputSize.x), 1.0 / f32(outputSize.y));
    var result = textureLoad(inputTexture, global_id.xy, 0) * weights[0];

    for (var i = 1u; i < 5u; i = i + 1u) {
        let offset = f32(offsets[i]);
        let weight = weights[i];

        result += textureLoad(inputTexture, global_id.xy - vec2<u32>(u32(offset), 0u),0) * weight;
        result += textureLoad(inputTexture, global_id.xy + vec2<u32>(u32(offset), 0u),0) * weight;
    }

    textureStore(outputTexture, global_id.xy, result);
}

