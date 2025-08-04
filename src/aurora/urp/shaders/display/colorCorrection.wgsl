@group(0) @binding(0) var offscreenTexture: texture_2d<f32>;
@group(0) @binding(1) var lightsTexture: texture_2d<f32>;
@group(0) @binding(2) var bloomTexture: texture_2d<f32>;
@group(0) @binding(3) var outputTexture: texture_storage_2d<rgba16float, write>;
@group(1) @binding(0) var<uniform> colorCorrection: ColorCorrection;
@group(2) @binding(0) var<uniform> bloomParams: BloomParams;


override workgroupSize: u32 = 8;
override toneMapping: u32 = 2;

struct BloomParams{
    threshold:f32,
    thresholdSoftness:f32,
    bloomIntense:f32
};

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
@compute @workgroup_size(workgroupSize,workgroupSize) 
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {

    let dims = textureDimensions(offscreenTexture);
    if (global_id.x >= u32(dims.x) || global_id.y >= u32(dims.y)) {
        return; 
    }
    let tex_coords = vec2<i32>(global_id.xy);
    let offscreenPixel = textureLoad(offscreenTexture, tex_coords,0);
    let lightPixel = textureLoad(lightsTexture, tex_coords,0);
     let bloomPixel = textureLoad(bloomTexture, tex_coords,0); 
    var color = vec3<f32>((offscreenPixel.rgb * lightPixel.rgb) + bloomPixel.rgb * bloomParams.bloomIntense);
    
    


    // Exposure
    color *=  exp2(colorCorrection.exposure);

    // White Balance
    let wb = colorCorrection.whiteBalance;
    color.r += wb/10;
    color.b -= wb/10;

 

    //toneMap
    if (toneMapping == 1) {
        color = reinhard_tone_map(color);
    } else if (toneMapping == 2) { 
        color = aces_tone_map(color);
    } else if (toneMapping == 3) { 
        color = filmic_tone_map(color);
    }
    
    // Contrast
    let contrast_factor = (colorCorrection.contrast * 0.5) + 1.0;
    color = ((color - 0.5) * contrast_factor) + 0.5;
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


   // Brightness
    if (colorCorrection.brightness >= 0.0) {
        color *= (1.0 + colorCorrection.brightness);
    } else {
        color = mix(color, vec3<f32>(0.0), abs(colorCorrection.brightness));
    }

    // Tint 
    color = mix(color, colorCorrection.tint.rgb, colorCorrection.tint.a);
    
    //invert
    let inverted_color = vec3<f32>(1.0, 1.0, 1.0) - color;
    color = mix(color, inverted_color, colorCorrection.invert);
    
    // Write the processed color to the output texture
    textureStore(outputTexture, tex_coords, vec4<f32>(color,offscreenPixel.a));
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
