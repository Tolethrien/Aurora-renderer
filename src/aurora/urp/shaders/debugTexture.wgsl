@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var<uniform> index: u32;
@group(1) @binding(0) var offscreen: texture_2d<f32>;
@group(1) @binding(1) var depth: texture_2d<f32>;
@group(1) @binding(2) var lightMap: texture_2d<f32>;
@group(1) @binding(3) var bloomTexture: texture_2d<f32>;

struct VertexInput {
  @builtin(vertex_index) vi: u32,
};
struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(1)  coords: vec2f,
  
};

const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

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
  let offscreen = textureSampleLevel(offscreen,textureSampler,props.coords,0);
  let lightMap = textureSampleLevel(lightMap,textureSampler,props.coords,0);
  let bloom = textureSampleLevel(bloomTexture,textureSampler,props.coords,0);
  let f = (offscreen.rgb + bloom.rgb) * lightMap.rgb;
  let toneMapped = f / (f + vec3<f32>(1.0));
  let bloomToned = bloom.rgb / (bloom.rgb + vec3<f32>(1.0));
  if(index == 3) {
    let depthValue = textureSampleLevel(depth,textureSampler,props.coords,0).r;
    let objectDepth = select(depthValue*10,0,depthValue == 0);
    out = vec4<f32>(objectDepth,objectDepth,objectDepth,1);
  }
  else if(index == 0) {out = vec4<f32>(toneMapped,offscreen.a);}
  else if(index == 1) {out = offscreen;}
  else if(index == 2) {out = lightMap;}
  else if(index == 4) {out = vec4<f32>(bloomToned,1.0);}
   return out;
}
// //========================



// //=====================

// @group(0) @binding(0) var textureSampler: sampler;
// @group(0) @binding(1) var<uniform> index: u32;
// @group(1) @binding(0) var offscreen: texture_2d<f32>; // Bazowy kolor sceny (może zawierać wartości HDR)
// @group(1) @binding(1) var depth: texture_2d<f32>;
// @group(1) @binding(2) var lightMap: texture_2d<f32>; // Mapa oświetlenia (może zawierać wartości HDR)
// @group(1) @binding(3) var bloomTexture: texture_2d<f32>; // Tekstura z już przetworzonym (rozmytym) bloomem

// // Nowa tekstura do przechowywania wydzielonych emiterów do przetworzenia przez bloom
// // Ta tekstura będzie renderowana w osobnym passie, zanim zostanie użyta jako bloomTexture.
// @group(1) @binding(4) var emitterThresholdTexture: texture_2d<f32>; 


// struct VertexInput {
//   @builtin(vertex_index) vi: u32,
// };
// struct VertexOutput {
//   @builtin(position) pos: vec4f,
//   @location(1) coords: vec2f,
// };

// const quad = array(vec2f(-1,-1), vec2f(1,-1), vec2f(-1, 1), vec2f(1, 1));
// const textureQuad = array(vec2f(0,1), vec2f(1,1), vec2f(0,0), vec2f(1,0));

// @vertex
// fn vertexMain(props: VertexInput) -> VertexOutput {
//   var out: VertexOutput;
//   out.pos = vec4<f32>(quad[props.vi], 1.0, 1.0);
//   out.coords = textureQuad[props.vi];
//   return out;
// }

// // Funkcja ACES Filmic Tone Mapping
// fn acesFilmicToneMapping(color: vec3f) -> vec3f {
//   const a = 2.51;
//   const b = 0.03;
//   const c = 2.43;
//   const d = 0.59;
//   const e = 0.14;

//   let numerator = color * (a * color + vec3f(b));
//   let denominator = color * (c * color + vec3f(d)) + vec3f(e);
//   return numerator / denominator;
// }

// // Funkcja Gamma Correction
// fn applyGammaCorrection(color: vec3f) -> vec3f {
//   return pow(color, vec3f(1.0 / 2.2));
// }

// // ---- NOWA FUNKCJA DO WYDZIELANIA EMITERÓW ----
// // Ta funkcja będzie używana w oddzielnym passie renderowania,
// // aby wypełnić `emitterThresholdTexture`.
// fn extractEmissivePixels(color: vec3f, threshold: f32, softKnee: f32) -> vec3f {
//   // Oblicz jasność (luminancję) koloru. Standardowy wzór luminancji percepcji.
//   let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722)); // ITU-R BT.709 coefficients

//   // Jeśli `softKnee` > 0, tworzymy płynne przejście wokół progu
//   // w przeciwnym razie jest to twardy próg.
//   let knee = threshold * softKnee; // Punkt, w którym zaczyna się "miękkie kolano"
  
//   if (luminance < threshold) {
//     // Poniżej progu, zwróć czarny
//     return vec3f(0.0, 0.0, 0.0);
//   } else if (luminance < threshold + knee) {
//     // W strefie "miękkiego kolana", płynne przejście
//     let t = (luminance - threshold) / knee;
//     // Używamy funkcji kwadratowej dla miękkiego przejścia
//     // Możesz użyć smoothstep, jeśli wolisz bardziej złożone przejścia
//     let curve = t * t * (3.0 - 2.0 * t); // Smoothstep curve
//     return color * curve;
//   } else {
//     // Powyżej progu + kolano, zwróć pełny kolor (czyli ten, który "prześwietla")
//     return color;
//   }
// }

// @fragment
// fn fragmentMain(props: VertexOutput) -> @location(0) vec4f {
//   var finalColor: vec4f;

//   let offscreenColor = textureSampleLevel(offscreen, textureSampler, props.coords, 0);
//   let lightMapColor = textureSampleLevel(lightMap, textureSampler, props.coords, 0);
//   // Pobieramy już rozmyty bloom z bloomTexture (wynik poprzedniego passu)
//   let bloomResult = textureSampleLevel(bloomTexture, textureSampler, props.coords, 0);

//   if (index == 3) {
//     // Widok mapy głębi
//     let depthValue = textureSampleLevel(depth, textureSampler, props.coords, 0).r;
//     let objectDepth = select(depthValue * 10.0, 0.0, depthValue == 0.0);
//     finalColor = vec4f(objectDepth, objectDepth, objectDepth, 1.0);
//   } else if (index == 0) {
//     // Główny widok sceny z Tone Mappingiem i Gamma Correction
//     // combinedHDR zawiera wszystko, co ma być poddane Tone Mappingowi
//     let combinedHDR = (offscreenColor.rgb * lightMapColor.rgb) + bloomResult.rgb;
    
//     // Zastosowanie Tone Mappingu
//     let tonemappedColor = acesFilmicToneMapping(combinedHDR);
    
//     // Zastosowanie Gamma Correction
//     let gammaCorrectedColor = applyGammaCorrection(tonemappedColor);
    
//     finalColor = vec4f(gammaCorrectedColor, offscreenColor.a);
//   } else if (index == 1) {
//     // Widok tylko offscreen (po TM i Gamma)
//     let tonemappedColor = acesFilmicToneMapping(offscreenColor.rgb);
//     let gammaCorrectedColor = applyGammaCorrection(tonemappedColor);
//     finalColor = vec4f(gammaCorrectedColor, offscreenColor.a);
//   } else if (index == 2) {
//     // Widok tylko lightMap (po TM i Gamma)
//     let tonemappedColor = acesFilmicToneMapping(lightMapColor.rgb);
//     let gammaCorrectedColor = applyGammaCorrection(tonemappedColor);
//     finalColor = vec4f(gammaCorrectedColor, lightMapColor.a);
//   } else if (index == 4) {
//     // Nowy przypadek: Pass do ekstrakcji emiterów dla Bloomu
//     // Tutaj będziesz renderować do `emitterThresholdTexture`
//     // Na przykład, jeśli `index == 4` to pass do generowania `emitterThresholdTexture`
//     // to zamiast pobierać z `emitterThresholdTexture`, musimy na nią renderować.
//     // Zwykle to jest oddzielny shader, ale dla uproszczenia pokażemy to tutaj.

//     // Załóżmy, że `offscreenColor.rgb * lightMapColor.rgb` to scena HDR, z której chcemy wyciągnąć emitery
//     let sceneHDRForEmitting = offscreenColor.rgb * lightMapColor.rgb;
    
//     // Użyj progu (np. 1.0 dla "czystej bieli") i miękkiego kolana
//     // Te wartości powinny być uniformami, które możesz dostosować.
//     let bloomThreshold = 1.0; 
//     let bloomSoftKnee = 0.5; // 0.0 dla twardego progu, większe wartości dla płynnego przejścia

//     finalColor = vec4f(extractEmissivePixels(sceneHDRForEmitting, bloomThreshold, bloomSoftKnee), 1.0);
//   } else {
//     finalColor = vec4f(0.0, 0.0, 0.0, 1.0); // Domyślny czarny w przypadku nieznanego indexu
//   }
    
//   return finalColor;
// }