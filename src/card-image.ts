import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CARD_SIZE = 1080;
const FONT_PATH = 'C:/Windows/Fonts/NotoSansKR-VF.ttf';

// ── 스타일별 색상 + 오버레이 ───
const STYLE_MAP: Record<string, { bgColor: string; textColor: string; colorMood: string; overlay: string }> = {
  dark:   { bgColor: '#1A1A1A', textColor: '#FFFFFF', colorMood: 'moody evening tones, dark atmospheric lighting', overlay: 'rgba(0,0,0,0.65)' },
  light:  { bgColor: '#F8F6F1', textColor: '#1A1A2E', colorMood: 'bright warm daylight, clean and airy', overlay: 'rgba(255,255,255,0.7)' },
  accent: { bgColor: '#2C4A7C', textColor: '#FFFFFF', colorMood: 'deep blue professional tones, corporate atmosphere', overlay: 'rgba(44,74,124,0.7)' },
  cta:    { bgColor: '#E1306C', textColor: '#FFFFFF', colorMood: 'warm inviting pink and coral tones, energetic', overlay: 'rgba(225,48,108,0.65)' },
};

// ══════════════════════════════════════════════════════════
// Gemini 이미지 생성
// ══════════════════════════════════════════════════════════
export async function generateCardBackground(
  topic: string,
  style: string,
  imageIdea?: string,
  cardIndex?: number
): Promise<string | null> {
  if (!GEMINI_KEY) return null;

  const styleInfo = STYLE_MAP[style] || STYLE_MAP.dark;
  const sceneDesc = imageIdea || `${topic}, commercial real estate district, urban landscape`;
  const slideNum = (cardIndex ?? 0) + 1;

  const prompt = `Create a photograph-style image for an Instagram card news.
Scene description: ${sceneDesc}
Style requirements:
- Photorealistic or high-quality illustration style
- NOT generic abstract patterns or simple geometric shapes
- Square format (1:1 ratio)
- The image should have areas suitable for white text overlay (avoid busy details in the center)
- Color mood: ${styleInfo.colorMood}
- Modern, professional feel that would look natural on a Korean real estate professional's Instagram
- No text, no watermarks, no logos in the image
- This is part ${slideNum} of a 7-part Instagram card series. Maintain visual consistency: same color palette, same photographic style, same level of detail. The series should feel cohesive when viewed together.`;

  // 시도할 이미지 생성 모델 목록 (우선순위)
  const models = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image-preview',
  ];

  for (const model of models) {
    try {
      console.log(`[Gemini] 이미지 생성 시도: ${model}, topic: ${topic}, style: ${style}`);
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          }
        },
        { timeout: 30000 }
      );

      const parts = resp.data?.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            console.log(`[Gemini] 이미지 생성 성공 (${model}), size: ${part.inlineData.data.length} bytes`);
            return part.inlineData.data; // base64
          }
        }
      }
      console.log(`[Gemini] ${model}: 응답에 이미지 없음, parts:`, parts?.map((p: any) => Object.keys(p)));
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.response?.data || err.message;
      console.error(`[Gemini] ${model} 실패:`, errMsg);
      continue; // 다음 모델 시도
    }
  }
  console.log('[Gemini] 모든 모델 실패, CSS fallback 사용');
  return null;
}

// ══════════════════════════════════════════════════════════
// 텍스트 오버레이 합성
// ══════════════════════════════════════════════════════════
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    current += char;
    if (current.length >= maxCharsPerLine) {
      // 단어 중간에서 잘리지 않도록 마지막 공백 찾기
      const lastSpace = current.lastIndexOf(' ');
      if (lastSpace > maxCharsPerLine * 0.4) {
        lines.push(current.slice(0, lastSpace).trim());
        current = current.slice(lastSpace + 1);
      } else {
        lines.push(current.trim());
        current = '';
      }
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

export async function compositeCardImage(params: {
  imageBase64: string | null;
  title: string;
  tag: string;
  slideNumber: number;
  totalSlides: number;
  style: string;
}): Promise<string> {
  const { title, tag, slideNumber, totalSlides, style } = params;
  const styleInfo = STYLE_MAP[style] || STYLE_MAP.dark;

  let baseImage: sharp.Sharp;

  if (params.imageBase64) {
    // Gemini 이미지를 배경으로 사용
    const imgBuf = Buffer.from(params.imageBase64, 'base64');
    baseImage = sharp(imgBuf).resize(CARD_SIZE, CARD_SIZE, { fit: 'cover' });
    // 스타일별 반투명 오버레이로 텍스트 가독성 보장
    const overlay = Buffer.from(
      `<svg width="${CARD_SIZE}" height="${CARD_SIZE}"><rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${styleInfo.overlay}"/></svg>`
    );
    baseImage = baseImage.composite([{ input: overlay, blend: 'over' }]);
  } else {
    // Fallback: 단색 배경
    baseImage = sharp({
      create: { width: CARD_SIZE, height: CARD_SIZE, channels: 4, background: styleInfo.bgColor }
    });
  }

  // SVG 텍스트 오버레이
  const textColor = styleInfo.textColor;
  const titleLines = wrapText(title, 16);
  const lineHeight = 52;
  const totalTextHeight = titleLines.length * lineHeight;
  const startY = (CARD_SIZE - totalTextHeight) / 2 + 20;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${CARD_SIZE / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const shadowColor = style === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.7)';

  const svgOverlay = `
<svg width="${CARD_SIZE}" height="${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ts" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${shadowColor}"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="${shadowColor}"/>
    </filter>
  </defs>
  <style>
    @font-face { font-family: 'NotoSansKR'; src: url('file:///${FONT_PATH.replace(/\\/g, '/')}'); }
    .tag { font-family: 'NotoSansKR', 'Malgun Gothic', sans-serif; font-size: 26px; fill: ${textColor}; opacity: 0.5; filter: url(#ts); }
    .wm  { font-family: 'NotoSansKR', 'Malgun Gothic', sans-serif; font-size: 26px; font-weight: 700; fill: ${textColor}; opacity: 0.5; filter: url(#ts); }
    .title { font-family: 'NotoSansKR', 'Malgun Gothic', sans-serif; font-size: 46px; font-weight: 700; fill: ${textColor}; filter: url(#ts); }
    .num { font-family: 'NotoSansKR', 'Malgun Gothic', sans-serif; font-size: 26px; fill: ${textColor}; opacity: 0.5; filter: url(#ts); }
  </style>
  <text x="44" y="60" class="tag">${escapeXml(tag)}</text>
  <text x="${CARD_SIZE - 44}" y="60" text-anchor="end" class="wm">BSN</text>
  <text y="${startY}" text-anchor="middle" class="title">${titleTspans}</text>
  <text x="${CARD_SIZE / 2}" y="${CARD_SIZE - 40}" text-anchor="middle" class="num">${slideNumber} / ${totalSlides}</text>
</svg>`;

  const svgBuf = Buffer.from(svgOverlay);
  const result = await baseImage
    .composite([{ input: svgBuf, blend: 'over' }])
    .png()
    .toBuffer();

  return result.toString('base64');
}

// ══════════════════════════════════════════════════════════
// 단일 카드 생성 (배경 + 합성)
// ══════════════════════════════════════════════════════════
export async function generateSingleCard(params: {
  cardIndex: number;
  topic: string;
  tag: string;
  title: string;
  style: string;
  imageIdea?: string;
  totalSlides?: number;
}): Promise<string> {
  const { cardIndex, topic, tag, title, style, imageIdea, totalSlides = 7 } = params;

  // 1) Gemini 배경 이미지 생성 시도 (imageIdea 활용)
  const bgBase64 = await generateCardBackground(topic, style, imageIdea, cardIndex);

  // 2) 배경 이미지 + 오버레이만 반환 (텍스트 합성 없음 — 프론트엔드 CSS에서 표시)
  const finalBase64 = await compositeBackgroundOnly({
    imageBase64: bgBase64,
    style
  });

  return finalBase64;
}

// 배경 이미지 + 오버레이만 (텍스트 없이)
async function compositeBackgroundOnly(params: {
  imageBase64: string | null;
  style: string;
}): Promise<string> {
  const styleInfo = STYLE_MAP[params.style] || STYLE_MAP.dark;

  let baseImage: sharp.Sharp;

  if (params.imageBase64) {
    const imgBuf = Buffer.from(params.imageBase64, 'base64');
    baseImage = sharp(imgBuf).resize(CARD_SIZE, CARD_SIZE, { fit: 'cover' });
    // 스타일별 오버레이
    const overlay = Buffer.from(
      `<svg width="${CARD_SIZE}" height="${CARD_SIZE}"><rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${styleInfo.overlay}"/></svg>`
    );
    baseImage = baseImage.composite([{ input: overlay, blend: 'over' }]);
  } else {
    // Fallback: 단색 배경
    baseImage = sharp({
      create: { width: CARD_SIZE, height: CARD_SIZE, channels: 4, background: styleInfo.bgColor }
    });
  }

  const result = await baseImage.png().toBuffer();
  return result.toString('base64');
}
