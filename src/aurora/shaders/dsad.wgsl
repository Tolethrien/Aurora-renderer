// Struktury wspólne dla wszystkich shaderów
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texCoord: vec2<f32>,
};

// Uniform do kontrolowania parametrów bloom
struct BloomParams {
    threshold: f32,
    intensity: f32,
    softThreshold: f32,
    mipLevel: f32,
}

// Funkcja pomocnicza do obliczania wag Gaussa
fn gaussianWeight(x: f32, sigma: f32) -> f32 {
    let sigma2 = sigma * sigma;
    return (1.0 / sqrt(2.0 * 3.14159 * sigma2)) * exp(-(x * x) / (2.0 * sigma2));
}

// -----------------
// 1. Shader do ekstrakcji jasnych obszarów (threshold)
// -----------------
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var<uniform> params: BloomParams;

@vertex
fn vertexMain(@location(0) position: vec2<f32>, @location(1) texCoord: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(position, 0.0, 1.0);
    output.texCoord = texCoord;
    return output;
}

@fragment
fn thresholdMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(inputTexture, textureSampler, input.texCoord);
    
    // Obliczanie jasności piksela
    let luminance = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    
    // Zastosowanie miękkiego progu
    let softThreshold = params.softThreshold;
    let knee = params.threshold * softThreshold;
    let soft = smoothstep(params.threshold - knee, params.threshold + knee, luminance);
    
    // Wyciągnięcie tylko jasnych obszarów
    var result = color.rgb * soft;
    
    return vec4<f32>(result, 1.0);
}

// -----------------
// 2. Shader do rozmycia poziomego
// -----------------
@group(0) @binding(0) var blurInputTexture: texture_2d<f32>;
@group(0) @binding(1) var blurSampler: sampler;
@group(0) @binding(2) var<uniform> blurScale: vec2<f32>; // (1/width, 0) dla poziomego

@fragment
fn blurHorizontalMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(blurInputTexture));
    let pixelSize = 1.0 / texSize;
    
    // Parametry rozmycia
    let sigma = 3.0;
    let radius = 8; // Promień rozmycia (liczba próbek w jedną stronę)
    
    var color = vec3<f32>(0.0, 0.0, 0.0);
    var totalWeight = 0.0;
    
    // Pętla próbkowania - pobieramy próbki w linii poziomej
    for (var i = -radius; i <= radius; i++) {
        let offset = vec2<f32>(f32(i) * pixelSize.x * blurScale.x, 0.0);
        let weight = gaussianWeight(f32(i), sigma);
        color += textureSample(blurInputTexture, blurSampler, input.texCoord + offset).rgb * weight;
        totalWeight += weight;
    }
    
    color /= totalWeight;
    return vec4<f32>(color, 1.0);
}

// -----------------
// 3. Shader do rozmycia pionowego
// -----------------
@fragment
fn blurVerticalMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(blurInputTexture));
    let pixelSize = 1.0 / texSize;
    
    // Parametry rozmycia
    let sigma = 3.0;
    let radius = 8; // Promień rozmycia (liczba próbek w jedną stronę)
    
    var color = vec3<f32>(0.0, 0.0, 0.0);
    var totalWeight = 0.0;
    
    // Pętla próbkowania - pobieramy próbki w linii pionowej
    for (var i = -radius; i <= radius; i++) {
        let offset = vec2<f32>(0.0, f32(i) * pixelSize.y * blurScale.y);
        let weight = gaussianWeight(f32(i), sigma);
        color += textureSample(blurInputTexture, blurSampler, input.texCoord + offset).rgb * weight;
        totalWeight += weight;
    }
    
    color /= totalWeight;
    return vec4<f32>(color, 1.0);
}

// -----------------
// 4. Shader do upsample (powiększania tekstury)
// -----------------
@group(0) @binding(0) var upsampleInput: texture_2d<f32>;
@group(0) @binding(1) var upsampleSampler: sampler;
@group(0) @binding(2) var<uniform> upsampleFilter: f32; // Siła filtrowania

@fragment
fn upsampleMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(upsampleInput));
    let pixelSize = 1.0 / texSize;
    
    // Używamy 9-punktowego filtra do lepszego upsamplingu
    // Wagi dla filtru:
    // 1   2   1
    // 2   4   2
    // 1   2   1
    
    var color = vec3<f32>(0.0, 0.0, 0.0);
    let center = textureSample(upsampleInput, upsampleSampler, input.texCoord).rgb * 4.0;
    
    let offsets = array<vec2<f32>, 8>(
        vec2<f32>(-pixelSize.x, -pixelSize.y),
        vec2<f32>(0.0, -pixelSize.y),
        vec2<f32>(pixelSize.x, -pixelSize.y),
        vec2<f32>(-pixelSize.x, 0.0),
        vec2<f32>(pixelSize.x, 0.0),
        vec2<f32>(-pixelSize.x, pixelSize.y),
        vec2<f32>(0.0, pixelSize.y),
        vec2<f32>(pixelSize.x, pixelSize.y)
    );
    
    let weights = array<f32, 8>(
        1.0, 2.0, 1.0,
        2.0,      2.0,
        1.0, 2.0, 1.0
    );
    
    for (var i = 0; i < 8; i++) {
        color += textureSample(upsampleInput, upsampleSampler, input.texCoord + offsets[i] * upsampleFilter).rgb * weights[i];
    }
    
    // Normalizuj
    color = (color + center) / 16.0;
    
    return vec4<f32>(color, 1.0);
}

// -----------------
// 5. Shader do kompozycji finalnej (łączenie bloom z oryginalnym obrazem)
// -----------------
@group(0) @binding(0) var originalTexture: texture_2d<f32>;
@group(0) @binding(1) var bloomTexture: texture_2d<f32>;
@group(0) @binding(2) var compositeSampler: sampler;
@group(0) @binding(3) var<uniform> bloomParams: BloomParams;

@fragment
fn compositeMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let originalColor = textureSample(originalTexture, compositeSampler, input.texCoord);
    let bloomColor = textureSample(bloomTexture, compositeSampler, input.texCoord);
    
    // Łączymy oryginalny obraz z efektem bloom
    let result = originalColor.rgb + bloomColor.rgb * bloomParams.intensity;
    
    return vec4<f32>(result, originalColor.a);
}

// -----------------
// 6. Funkcja pomocnicza do implementacji w kodzie głównym
// -----------------
// Pseudokod do zrealizowania pełnego efektu bloom w aplikacji:
/*
function renderBloomEffect() {
    // 1. Ekstrakcja jasnych obszarów
    renderToTexture(thresholdShader, sourceTexture, brightPassTexture);
    
    // 2. Piramidowe rozmycie - downsample i blur
    let mipTextures = [];
    let currentTexture = brightPassTexture;
    
    // Zaczynamy od zmniejszania i rozmywania
    for (let i = 0; i < MIP_LEVELS; i++) {
        // Zmniejsz teksturę o połowę
        let downsampledTexture = downscale(currentTexture, 0.5);
        
        // Rozmycie poziome
        let horizontalBlurTexture = renderToTexture(blurHorizontalShader, downsampledTexture);
        
        // Rozmycie pionowe
        let blurredTexture = renderToTexture(blurVerticalShader, horizontalBlurTexture);
        
        // Zapisz do tablicy mipów
        mipTextures[i] = blurredTexture;
        
        // Przygotuj do następnej iteracji
        currentTexture = blurredTexture;
    }
    
    // 3. Upsample i łączenie
    let bloomResult = mipTextures[MIP_LEVELS - 1];
    
    // Idziemy w górę piramidy
    for (let i = MIP_LEVELS - 2; i >= 0; i--) {
        // Powiększ teksturę
        let upsampledTexture = renderToTexture(upsampleShader, bloomResult);
        
        // Łączymy z następnym poziomem mipmapy
        bloomResult = blend(upsampledTexture, mipTextures[i]);
    }
    
    // 4. Kompozycja finalna
    renderToScreen(compositeShader, sourceTexture, bloomResult);
}
*/