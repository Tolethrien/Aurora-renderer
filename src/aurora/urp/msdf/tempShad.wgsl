// ================================================================
//  Text MSDF Shader (wgsl)
//  –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//  Assumes:
//    • @group(0) @binding(0): uniform mat4x4<f32> camera
//    • @group(1) @binding(0): sampler       fontSampler
//    • @group(1) @binding(1): texture_2d<f32> fontTexture
//    • @group(1) @binding(2): var<storage, read> array<Char> chars
//
//  Vertex Buffers (instanced):
//    • Buffer 0 (location 0 + 1):
//        @location(0) center : vec2<f32>   // character center in world
//        @location(1) size   : f32         // global font scale (fontSize)
//    • Buffer 1 (location 2 + 3 + 4):
//        @location(2) textureIndex : u32   // not used here, but could choose atlas
//        @location(3) charCode     : u32   // Unicode code of glyph
//        @location(4) color        : vec4<u32> // RGBA (0…255)
//
//  Index Buffer: [0,1,2, 1,2,3] (6 indices per instance).
// ================================================================

// ----------------------------------------------------------------
//  Storage‐Buffer Layout for each glyph (8 floats = 32 bytes per Char):
//    struct Char {
//      texOffset : vec2<f32>; // (c.x/scaleW, c.y/scaleH)
//      texExtent : vec2<f32>; // (c.width/scaleW, c.height/scaleH)
//      size      : vec2<f32>; // (c.width, c.height) in pixels
//      offset    : vec2<f32>; // (c.xoffset, –c.yoffset) in pixels
//    };
// ----------------------------------------------------------------
struct Char {
    texOffset : vec2<f32>;
    texExtent : vec2<f32>;
    size      : vec2<f32>;
    offset    : vec2<f32>;
};

@group(0) @binding(0) var<uniform> camera : mat4x4<f32>;
@group(1) @binding(0) var fontSampler  : sampler;
@group(1) @binding(1) var fontTexture  : texture_2d<f32>;
@group(1) @binding(2) var<storage, read> chars : array<Char>;

// ----------------------------------------------------------------
//  Vertex‐Input:  one “instance” per glyph.  Each instance will
//  generate 4‐vertex quad (via indexed draw of 6 indices).
// ----------------------------------------------------------------
struct VertexInput {
    @builtin(vertex_index)      vi         : u32;        // 0..5 (six indices per quad)
    @builtin(instance_index)    ii         : u32;        // glyph‐instance index
    @location(0)                center     : vec2<f32>;  // glyph center in world
    @location(1)                size       : f32;        // font scale (fontSize)
    @location(2)                textureIdx : u32;        // atlas index (not used here)
    @location(3)                charCode   : u32;        // Unicode code for glyph
    @location(4)                color      : vec4<u32>;  // RGBA (0…255)
};

// ----------------------------------------------------------------
//  Vertex‐Output ➞ fragment: carrying position, texcoord, and color
// ----------------------------------------------------------------
struct VertexOutput {
    @builtin(position)          Position   : vec4<f32>;
    @location(0)                vTexCoord  : vec2<f32>;
    @location(1)                vColor     : vec4<u32>;
};

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;

    // 1) Lookup the Char‐record from storage via charCode:
    let ch : Char = chars[input.charCode];

    // 2) Determine which of the four quad‐corners we are drawing.
    //    We have 6 “draw calls” (indexed), so `vi` runs 0..5.
    //    We use a small index‐array to map `vi`→ cornerID (0..3).
    //    ┌──────────────┐      ┌────────────┐
    //    │ indices[0]=0 │      │ corners[0] │ → (–0.5, –0.5)
    //    │ indices[1]=1 │  →   │ corners[1] │ → (+0.5, –0.5)
    //    │ indices[2]=2 │      │ corners[2] │ → (–0.5, +0.5)
    //    │ indices[3]=1 │      │ corners[3] │ → (+0.5, +0.5)
    //    │ indices[4]=2 │
    //    │ indices[5]=3 │
    //    └──────────────┘      └────────────┘
    let indices = array<u32, 6>(0u, 1u, 2u, 1u, 2u, 3u);
    let cornerID : u32 = indices[input.vi];  // 0..3

    // 3) Define local “corner‐positions” in [–0.5, +0.5] × [–0.5, +0.5]:
    let corners = array<vec2<f32>, 4>(
        vec2<f32>(-0.5, -0.5),  // bottom‐left
        vec2<f32>( 0.5, -0.5),  // bottom‐right
        vec2<f32>(-0.5,  0.5),  // top‐left
        vec2<f32>( 0.5,  0.5)   // top‐right
    );
    let localPos : vec2<f32> = corners[cornerID];

    // 4) Compute glyph size and offset in “world‐units”:
    //    • scaledSize = (ch.size) * (input.size)
    //      ↳ ch.size = (glyph pixel width, glyph pixel height)
    //      ↳ input.size = scalar “fontSize” (world units per pixel)
    let scaledSize   : vec2<f32> = ch.size * input.size;
    let scaledOffset : vec2<f32> = ch.offset * input.size;

    // 5) Compute world‐space position for this particular vertex:
    //    • The “center” (input.center) is the baseline location for the glyph.
    //    • We shift by scaledOffset to account for xoffset, yoffset.
    //    • Then add localPos * scaledSize to reach each corner from the glyph origin.
    let worldPos2D : vec2<f32> = input.center
                                + scaledOffset
                                + localPos * scaledSize;

    // 6) Transform to clip‐space:
    output.Position = camera * vec4<f32>(worldPos2D.xy, 0.0, 1.0);

    // 7) Compute the final texture‐coordinates (UV) for this corner:
    //    • localPos ∈ [–0.5, +0.5]²
    //    • uvCorner = (localPos + 0.5) ∈ [0,1]²
    //    • then: texCoord = ch.texOffset + uvCorner * ch.texExtent.
    let uvCorner : vec2<f32> = localPos + vec2<f32>(0.5, 0.5);
    output.vTexCoord = ch.texOffset + uvCorner * ch.texExtent;

    // 8) Pass RGBA color along (still in u32); we'll convert to f32 in the fragment:
    output.vColor = input.color;

    return output;
}

// ----------------------------------------------------------------
//  Fragment Shader: MSDF sampling + simple alpha‐blend
// ----------------------------------------------------------------
@fragment
fn fragmentMain(inFrag : VertexOutput) -> @location(0) vec4<f32> {
    // 1) Reconstruct the glyph color as normalized float4 from u32:
    let c : vec4<u32> = inFrag.vColor;
    //    divide by 255.0 to get [0,1]:
    let textColor : vec4<f32> = vec4<f32>(
        f32(c.x) / 255.0,
        f32(c.y) / 255.0,
        f32(c.z) / 255.0,
        f32(c.w) / 255.0
    );

    // 2) Compute derivatives at this fragment for correct MSDF filtering:
    //    – dpdxFine, dpdyFine fetch screen‐space derivatives.
    let dx : f32 = f32(textureDimensions(fontTexture, 0).x)
                 * length(vec2<f32>(
                     dpdxFine(inFrag.vTexCoord.x),
                     dpdyFine(inFrag.vTexCoord.x)
                   ));
    let dy : f32 = f32(textureDimensions(fontTexture, 0).y)
                 * length(vec2<f32>(
                     dpdxFine(inFrag.vTexCoord.y),
                     dpdyFine(inFrag.vTexCoord.y)
                   ));
    //    The “pxRange” used by many MSDF tools is often 4.0:
    let pxRange : f32 = 4.0;

    //    Convert signed‐distance value (from msdf) to pixel‐units:
    let toPixels : f32 = pxRange * inverseSqrt(dx * dx + dy * dy);

    // 3) Sample the MSDF texture at vTexCoord:
    //    – sampleMsdf(uv) returns a signed‐distance in [–0.5,+0.5] range:
    let sigDist : f32 = sampleMsdf(inFrag.vTexCoord) - 0.5;

    //    Convert to pixel distance:
    let pxDist : f32 = sigDist * toPixels;

    // 4) Smoothstep around edge (edgeWidth ~0.5 feels good):
    let edgeWidth : f32 = 0.5;
    let alpha : f32 = smoothstep(-edgeWidth, edgeWidth, pxDist);

    // 5) Discard fully transparent fragments (tiny threshold):
    if (alpha < 0.001) {
        discard;
    }

    // 6) Output final color with MSDF alpha‐modulation:
    return vec4<f32>(
        textColor.rgb,
        textColor.a * alpha
    );
}

// ----------------------------------------------------------------
//  Helper: extract signed distance from MSDF‐encoded texels.
//    Many tools pack three channels (R, G, B) such that the
//    signed‐distance field is encoded across them. The usual
//    pattern is: max( min(r,g), min(max(r,g), b) ).
// ----------------------------------------------------------------
fn sampleMsdf(uv : vec2<f32>) -> f32 {
    let c : vec4<f32> = textureSample(fontTexture, fontSampler, uv);
    // Reconstruct a “signed distance” from the three channels:
    let sd : f32 = max( min(c.r, c.g),
                       min(max(c.r, c.g), c.b) );
    return sd;
}
