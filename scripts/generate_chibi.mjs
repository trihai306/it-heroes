/**
 * Generate Chibi Director 2D Image via Gemini API
 * Uses gemini-2.0-flash-exp-image-generation model
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = "AIzaSyCRQwOm5KWAxtwR7u0Ez4j1g23V8RMmDPI";
const OUTPUT_DIR = path.join(__dirname, '..', 'apps', 'renderer', 'public', 'models');

// Models that support image generation
const MODELS = [
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp-image-generation",
];

const PROMPT = `Generate an image of a cute chibi 3D clay figurine character:
- Male office director/boss
- Extremely big oversized round head (head is 2x bigger than body)
- Very small stubby body
- Dark navy blue business suit with red tie
- Round black-framed glasses
- Short neat dark brown hair
- Big adorable round shiny eyes with white highlight sparkles
- Gentle happy smile, rosy pink cheeks
- Standing front-facing pose
- Clay figurine vinyl collectible toy aesthetic
- Soft studio lighting on clean solid white background
- Full body centered, single character only
- No text, no watermarks`;

async function tryModel(modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    console.log(`\n🔄 Trying model: ${modelName}...`);

    const body = {
        contents: [{
            parts: [{ text: PROMPT }]
        }],
        generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
        }
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.log(`   ❌ ${res.status}: ${JSON.parse(errText).error?.message?.substring(0, 100) || errText.substring(0, 100)}`);
        return null;
    }

    const data = await res.json();
    const candidates = data.candidates || [];

    for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData) {
                const imgBuffer = Buffer.from(part.inlineData.data, 'base64');
                const mimeType = part.inlineData.mimeType || 'image/png';
                const ext = mimeType.includes('png') ? 'png' : 'jpg';
                const outputPath = path.join(OUTPUT_DIR, `chibi_director_2d.${ext}`);

                fs.mkdirSync(OUTPUT_DIR, { recursive: true });
                fs.writeFileSync(outputPath, imgBuffer);

                console.log(`   ✅ Image saved! ${outputPath}`);
                console.log(`   📦 Size: ${(imgBuffer.length / 1024).toFixed(1)} KB | Type: ${mimeType}`);
                return outputPath;
            }
            if (part.text) {
                console.log(`   📝 Text: ${part.text.substring(0, 150)}`);
            }
        }
    }

    // Check for prompt feedback / blocked
    if (data.promptFeedback?.blockReason) {
        console.log(`   ⚠️ Blocked: ${data.promptFeedback.blockReason}`);
    }

    console.log("   ⚠️ No image in response");
    return null;
}

async function main() {
    console.log("🎨 Generating Chibi Director 2D Image via Gemini API\n");
    console.log("═".repeat(50));

    for (const model of MODELS) {
        const result = await tryModel(model);
        if (result) {
            console.log(`\n🎉 Success! Image ready at: ${result}`);
            return result;
        }
    }

    console.log("\n❌ All models failed. Try again later or check API key quotas.");
    return null;
}

await main();
