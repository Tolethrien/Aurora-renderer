dam ci wszystkie shadery ktore sa użyte w rendrowaniu, dodasz mi odpowiednio konwersje kolorow?

shader do rysowania:

@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;

@group(1) @binding(0) var universalSampler: sampler;

@group(1) @binding(1) var userTextures: texture_2d_array<f32>;

override zSortType: u32 = 0;

override originType: u32 = 0;

struct VertexInput {

    @builtin(vertex_index) vi: u32,

    @location(0) pos: vec2<f32>, // x,y

    @location(1) size: vec2<f32>, // w,h

    @location(2) crop: vec4<f32>,    // crop

    @location(3) textureIndex: f32,    //texture index

    @location(4) color: vec4<f32>,    // rgba

    @location(5) emissive: f32,    // bloom str

};

struct VertexOutput {

    @builtin(position) position: vec4<f32>,

    @location(0) crop: vec2<f32>,

    @location(1) size: vec2<f32>,

    @location(2) centerSize: vec2<f32>,

    @location(3) @interpolate(flat) textureIndex: f32,

    @location(4) @interpolate(flat) color: vec4<f32>,

    @location(5) z: f32,

    @location(6) @interpolate(flat) emissive: f32,

};

struct FragmentOutput {

    @location(0) primary: vec4<f32>,

    @location(1) depth: vec4<f32>,

};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));

const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex

fn vertexMain(props: VertexInput) -> VertexOutput {

    let centerSize = quad[props.vi] * (props.size * 0.5);

    let fullSize = ((quad[props.vi] + vec2f(1.0)) * 0.5) * props.size;

    let localPos = select(centerSize,fullSize, originType == 1u);

    let worldPos = props.pos + localPos;

    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);



    // let visibleYMin = cameraBound.x;

    // let visibleYMax = cameraBound.y;

    // let rangeY = visibleYMax - visibleYMin;

    // var z: f32;

    // z = (worldPos.y - visibleYMin) / rangeY;

    // z = 1.0 - ((worldPos.y - visibleYMin) / rangeY);





    let quadSize = select(props.size.y * 0.5,props.size.y,originType == 1u);

    let z = (props.pos.y + quadSize - cameraBound.x) / (cameraBound.y - cameraBound.x); //z-buffer compare to sort

    let zValue = select(1.0,z,zSortType == 1u);

    let textureSize = textureDimensions(userTextures, 0);

    let textureSizeFloat = vec2<f32>(f32(textureSize.x), f32(textureSize.y));

    let normalizeCrop = vec4<f32>(props.crop.xy / textureSizeFloat, props.crop.zw / textureSizeFloat);




    var out: VertexOutput;

    out.crop = normalizeCrop.xy + textureQuad[props.vi] * normalizeCrop.zw;

    out.centerSize = centerSize;

    out.size = props.size;

    out.color = props.color;

    out.textureIndex = props.textureIndex;

    out.position = vec4<f32>(translatePosition.xy, zValue, 1.0);

    out.z = z;

    out.emissive = props.emissive;



    return out;

}

@fragment

fn fragmentMain(props: VertexOutput) -> FragmentOutput {

    var out:FragmentOutput;

    out.depth = vec4<f32>(props.z,0,0,0);

    let color = convertColor(props.color,props.emissive);

    let index = u32(props.textureIndex);

    let texture = textureSampleLevel(userTextures,universalSampler, props.crop,index,0);



    if(texture.w < 0.001){discard;};



    let finalColor = texture * color;

    out.primary = finalColor;

    return out;

}

fn convertColor(color: vec4f,emissive:f32) -> vec4f {

    let rgb = color.rgb / 255.0;

    let a = color.a /255.00;

return vec4f(rgb \* emissive ,a);

}

korekcja kolorow:

@group(0) @binding(0) var offscreenTexture: texture_2d<f32>;

@group(0) @binding(1) var lightsTexture: texture_2d<f32>;

@group(0) @binding(2) var outputTexture: texture_storage_2d<rgba16float, write>;

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

    let dims = textureDimensions(offscreenTexture);

    if (global_id.x >= u32(dims.x) || global_id.y >= u32(dims.y)) {

        return;

    }

    let tex_coords = vec2<i32>(global_id.xy);

    let offscreenPixel = textureLoad(offscreenTexture, tex_coords,0);

    let lightPixel = textureLoad(lightsTexture, tex_coords,0);

    var color = vec3<f32>(offscreenPixel.rgb * lightPixel.rgb);


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

    textureStore(outputTexture, tex_coords, vec4<f32>(color,offscreenPixel.a));

}

generowanie pointlightow na lightmapow:

@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;

@group(1) @binding(0) var universalSampler: sampler;

@group(1) @binding(1) var userTextures: texture_2d_array<f32>;

struct VertexInput {

    @builtin(vertex_index) vi: u32,

    @location(0) pos: vec2<f32>, // x,y

    @location(1) size: vec2<f32>, // w,h

    @location(3) color: vec4<f32>,    // rgba

};

struct VertexOutput {

    @builtin(position) position: vec4<f32>,

    @location(1) size: vec2<f32>,

    @location(2) centerPos: vec2<f32>,

    @location(5) @interpolate(flat) color: vec4<f32>,

};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));

@vertex

fn vertexMain(props: VertexInput) -> VertexOutput {

    let centerPos = quad[props.vi] * (props.size * 0.5);

    let localPos = centerPos;

    let worldPos = props.pos + localPos;

    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);


    var out: VertexOutput;

    out.centerPos = centerPos;

    out.size = props.size;

    out.color = props.color;

    out.position = vec4<f32>(translatePosition.xy, 0.0, 1.0);



    return out;

}

@fragment

fn fragmentMain(props: VertexOutput) -> @location(0) vec4<f32> {

    const FALLOFF_EXPONENT: f32 = 2.0;

    let color = convertColor(props.color);

    let intensity = color.a;


    let radius = props.size.x * 0.5;

    let dist_pixels = length(props.centerPos);

    let dist_norm = dist_pixels / radius;


    if (dist_norm > 1.0) {

        discard;

    }


    let attenuation = pow(max(0.0, 1.0 - dist_norm * dist_norm), FALLOFF_EXPONENT);

    let final_rgb = color.rgb * intensity * attenuation;


    return vec4<f32>(final_rgb, 0);

}

fn convertColor(color: vec4f) -> vec4f {

return color/255;

}

finalna tekstura debug z tone mappingiem:

@group(0) @binding(0) var textureSampler: sampler;

@group(0) @binding(1) var<uniform> index: u32;

@group(1) @binding(0) var offscreenTexture: texture_2d<f32>;

@group(1) @binding(1) var depthTexture: texture_2d<f32>;

@group(1) @binding(2) var lightMapTexture: texture_2d<f32>;

@group(1) @binding(3) var bloomTexture: texture_2d<f32>;

@group(1) @binding(4) var finalDraw: texture_2d<f32>;

@group(2) @binding(0) var<uniform> bloomParams: BloomParams;

override toneMapping: u32 = 1;

struct BloomParams{

    threshold:f32,

    thresholdSoftness:f32,

    bloomIntense:f32

};

struct VertexInput {

@builtin(vertex_index) vi: u32,

};

struct VertexOutput {

@builtin(position) pos: vec4f,

@location(1) coords: vec2f,

};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));

const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

const exposure = 0.8;

@vertex

fn vertexMain(props: VertexInput) -> VertexOutput {

    var out:VertexOutput;

    out.pos = vec4<f32>(quad[props.vi],1.0,1.0);

    out.coords = textureQuad[props.vi];


    return out;

}

@fragment

fn fragmentMain(props:VertexOutput) -> @location(0) vec4f{

var out: vec4<f32>;

let offscreen = textureSampleLevel(offscreenTexture,textureSampler,props.coords,0);

let lightMap = textureSampleLevel(lightMapTexture,textureSampler,props.coords,0);

let bloom = textureSampleLevel(bloomTexture,textureSampler,props.coords,0);

let finalDraw = textureSampleLevel(finalDraw,textureSampler,props.coords,0);

let finalColor = finalDraw.rgb + bloom.rgb;

var toneMapped: vec3f;

var bloomToned: vec3f;

    if(toneMapping == 0){

        toneMapped = finalColor;

        bloomToned = bloom.rgb;

    }

    else if (toneMapping == 1) {

        toneMapped = reinhard_tone_map(finalColor);

        bloomToned = reinhard_tone_map(bloom.rgb);


    } else if (toneMapping == 2) {

        toneMapped = aces_tone_map(finalColor);

        bloomToned = aces_tone_map(bloom.rgb);


    } else if (toneMapping == 3) {

        toneMapped = filmic_tone_map(finalColor);

        bloomToned = filmic_tone_map(bloom.rgb);


    }

if(index == 3) {

    let depthValue = textureSampleLevel(depthTexture,textureSampler,props.coords,0).r;

    let objectDepth = select(depthValue*10,0,depthValue == 0);

    out = vec4<f32>(objectDepth,objectDepth,objectDepth,1);

}

else if(index == 0) {out = vec4<f32>(toneMapped,offscreen.a);}

else if(index == 1) {out = offscreen;}

else if(index == 2) {out = lightMap;}

else if(index == 4) {out = vec4<f32>(bloomToned,1.0);}

return out;

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

kilka dodatkowych informacji:

tekstury sa w formiacie rgba16float

prezentowanie odbywa sie na canvas w formacie bgra8unorm

pipelineOrder: drawQuads -> drawLights -> collorCorrection -> debugPresentation
