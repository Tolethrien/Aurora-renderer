@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba16float, write>;
@group(1) @binding(0) var<uniform> colorCorrection: ColorCorrection;

override workgroupSize: u32 = 8;

struct ColorCorrection {
    exposure: f32,
    saturation: f32,
    contrast: f32,
    whiteBalance: f32,
    hueShift: f32,
    brightness: f32,
    invert: f32,
    tint: vec4<f32>,
}
@compute @workgroup_size(workgroupSize,workgroupSize) // Define workgroup size (e.g., 16x16 threads per workgroup)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {

    let dims = textureDimensions(inputTexture);
    if (global_id.x >= u32(dims.x) || global_id.y >= u32(dims.y)) {
        return; 
    }
    let tex_coords = vec2<i32>(global_id.xy);
    var pixel = textureLoad(inputTexture, tex_coords,0);
    var color = vec3<f32>(pixel.rgb);
    // --- Color Correction Operations ---

    // Exposure
    color *=  exp2(colorCorrection.exposure);

    // White Balance
    let wb = colorCorrection.whiteBalance;
    color.r += wb/10;
    color.b -= wb/10;

    // Brightness
    color += colorCorrection.brightness;

    // Contrast
    let contrast_factor = (colorCorrection.contrast * 1) + 1.0;
    color = ((color - 1) * contrast_factor) + 1;

    // Saturation
    let luma = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722)); // Rec. 709 luma
    color = mix(vec3<f32>(luma), color, colorCorrection.saturation + 1.0);

    // Hue Shift 
    let angle = radians(colorCorrection.hueShift);
    let cos_angle = cos(angle);
    let sin_angle = sin(angle);
    let k = vec3<f32>(0.57735); // 1 / sqrt(3)
    let hue_rotation_matrix = mat3x3<f32>(
        vec3<f32>(cos_angle + (1.0 - cos_angle) * k.x * k.x, (1.0 - cos_angle) * k.x * k.y - sin_angle * k.z, (1.0 - cos_angle) * k.x * k.z + sin_angle * k.y),
        vec3<f32>((1.0 - cos_angle) * k.y * k.x + sin_angle * k.z, cos_angle + (1.0 - cos_angle) * k.y * k.y, (1.0 - cos_angle) * k.y * k.z - sin_angle * k.x),
        vec3<f32>((1.0 - cos_angle) * k.z * k.x - sin_angle * k.y, (1.0 - cos_angle) * k.z * k.y + sin_angle * k.x, cos_angle + (1.0 - cos_angle) * k.z * k.z)
    );
    color = color * hue_rotation_matrix;

    // Gamma correction
    //TODO when we change color ranges to linear 

    // Tint 
    color = mix(color, colorCorrection.tint.rgb, colorCorrection.tint.a);
    
    //invert
    let inverted_color = vec3<f32>(1.0, 1.0, 1.0) - color;
    color = mix(color, inverted_color, colorCorrection.invert);
    // Write the processed color to the output texture
    textureStore(outputTexture, tex_coords, vec4<f32>(color,pixel.a));
}