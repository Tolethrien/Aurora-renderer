@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;
@group(0) @binding(1) var<uniform> cameraBound: vec2<f32>;
@group(1) @binding(0) var fontSampler: sampler;
@group(1) @binding(1) var fontsTexture: texture_2d<f32>;
@group(1) @binding(2) var<storage> chars: array<Char>;

// struct VertexInput {
//     @builtin(vertex_index) vi: u32,
//     @location(0) center: vec2<f32>, // x,y
//     @location(1) size: vec2<f32>, // w,h
//     @location(2) crop: vec4<f32>, // crop [x,y,w,h]
//     @location(3) textureIndex: u32,    // index of texture in array
//     @location(4) color: vec4<u32>,    // rgba
// }
struct VertexInput {
    @builtin(vertex_index) vi: u32, // zostaw do indeksowania, jeśli chcesz debugować
    @location(0) center: vec2<f32>,
    @location(1) size: vec2<f32>,
    @location(2) crop: vec4<f32>,
    @location(3) textureIndex: u32,
    @location(4) color: vec4<u32>,
    @location(5) quadVertexIndex: u32, // nowy atrybut!
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) crop: vec2<f32>,       // współrzędne jednostkowe [0..1]
    @location(3) @interpolate(flat) color: vec4<u32>,
};

struct Char {
  texOffset: vec2f,
  texExtent: vec2f,
  size: vec2f,
  offset: vec2f,
};
const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,0), vec2f(1,0), vec2f(0,1), vec2f(1, 1));

@vertex
fn vertexMain(props : VertexInput) -> VertexOutput {
 let halfSize = props.size * 0.5;
    let localPos = quad[props.vi] * halfSize;
    let worldPos = props.center + localPos;
    let translatePosition = camera * vec4<f32>(worldPos.x, worldPos.y, 0.0, 1.0);
    let z = (props.center.y + halfSize.y - cameraBound.x) / (cameraBound.y - cameraBound.x);  
    
    let uvScale = textureQuad[props.vi] * props.crop.zw;
    let uv = props.crop.xy + uvScale;      



    var out: VertexOutput;
    out.crop = uv;
    out.color = props.color;
    out.Position = vec4<f32>(translatePosition.xy, z, 1.0);
    
    return out;

}
@fragment
fn fragmentMain(props : VertexOutput) -> @location(0) vec4f {
  // pxRange (AKA distanceRange) comes from the msdfgen tool. Don McCurdy's tool
  // uses the default which is 4.
   let color = convertColor(props.color);
  let pxRange = 4.0;
  let sz = vec2f(textureDimensions(fontsTexture, 0));
  let dx = sz.x*length(vec2f(dpdxFine(props.crop.x), dpdyFine(props.crop.x)));
  let dy = sz.y*length(vec2f(dpdxFine(props.crop.y), dpdyFine(props.crop.y)));
  let toPixels = pxRange * inverseSqrt(dx * dx + dy * dy);
  let sigDist = sampleMsdf(props.crop) - 0.5;
  let pxDist = sigDist * toPixels;

  let edgeWidth = 0.5;

  let alpha = smoothstep(-edgeWidth, edgeWidth, pxDist);

  if (alpha < 0.001) {
    discard;
  }
  return vec4f(color.rgb, alpha);

}
// @fragment
// fn fragmentMain(props : VertexOutput) -> @location(0) vec4f {
//     // Parametry MSDF (pxRange = maksymalna odległość w texelach od krawędzi, jaką generuje msdfgen)
//     let pxRange = 4.0;
//     let sz = vec2f(textureDimensions(fontsTexture, 0));

//     // Obliczamy skalowanie UV do pikseli: ile pikseli w teksturze odpowiada jednemu kroku UV
//     let dx = sz.x * length(vec2f(dpdxFine(props.crop.x), dpdyFine(props.crop.x)));
//     let dy = sz.y * length(vec2f(dpdxFine(props.crop.y), dpdyFine(props.crop.y)));
//     let toPixels = pxRange * inverseSqrt(dx * dx + dy * dy);

//     // Pobieramy dystans od krawędzi (wartość signed distance)
//     let sigDist = sampleMsdf(props.crop) - 0.5;
//     let pxDist = sigDist * toPixels;

//     // ---- TUTAJ DODAJEMY EFFECT GLOW ----
//     // Parametry poświaty:
//     // glowWidth: odległość (w pikselach) poza krawędź samej litery, w której ma wystąpić poświata
//     // glowEdge: gradient przejścia (im większa wartość, tym ostrzejsze przejście między pełną a zerową poświatą)
//     // glowColor: kolor samej poświaty
//     let glowWidth: f32 = 8.0;      // np. 8 pikseli poza krawędź
//     let glowEdge: f32 = 4.0;       // szerokość przejścia dla wygładzenia
//     let glowColor: vec3f = vec3f(1.0, 0.8, 0.2); // złotaśn żółta poświata (możesz zmienić)

//     // Obliczamy intensywność poświaty:
//     // Poświata ma maksimum przy pxDist = 0 (czyli tuż przy krawędzi), a maleje do 0 przy pxDist >= glowWidth
//     let glowAlpha = smoothstep(glowWidth + glowEdge, glowWidth - glowEdge, pxDist);
//     // Jeżeli pxDist < 0, smoothstep zwróci 1.0, czyli pełna poświata przy samym konturze.
//     // Dla pewnego zakresu (od glowWidth-glowEdge do glowWidth+glowEdge) powstaje miękkie przejście do 0.

//     // ---- STANDARDOWY ALPHA TEXTURA (litera) ----
//     let edgeWidth: f32 = 0.5;  // szerokość wygładzenia dla litery
//     let alpha: f32 = smoothstep(-edgeWidth, edgeWidth, pxDist);
//     if (alpha < 0.001 && glowAlpha < 0.001) {
//         // Nie rysujemy nic, jeżeli jesteśmy ani wewnątrz litery, ani w obszarze poświaty
//         discard;
//     }

//     // Kolor litery:
//     let baseColor = convertColor(props.color).rgb;

//     // Łączymy poświatę i litery:
//     // Jeżeli jesteśmy wewnątrz litery (alpha > 0), to kolor = baseColor, natomiast wokół litery
//     // zblendujemy baseColor i glowColor w zależności od glowAlpha.
//     var outColor: vec3f;
//     var outAlpha: f32;

//     if (alpha > 0.001) {
//         // Wewnątrz litery – pełny kolor znaku, ignore glow pod spodem
//         outColor = baseColor;
//         outAlpha = alpha;
//     } else {
//         // Jesteśmy tylko w obszarze poświaty
//         outColor = glowColor;
//         outAlpha = glowAlpha * 0.7; // mnożymy przez 0.7, aby poświata była delikatniejsza
//     }

//     return vec4f(outColor, outAlpha);
// }



fn sampleMsdf(texcoord: vec2f) -> f32 {
  let c = textureSample(fontsTexture, fontSampler, texcoord);
  return max(min(c.r, c.g), min(max(c.r, c.g), c.b));
}
fn convertColor(color: vec4u) -> vec4f {
  return vec4f(color)/255;
}