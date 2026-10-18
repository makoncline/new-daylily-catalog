import type { Font } from "satori";

// Keep the language and emoji coverage provided by Next's ImageResponse.
const languageFonts: Record<string, string[]> = {
  "ja-JP": ["Noto Sans JP"],
  "ko-KR": ["Noto Sans KR"],
  "zh-CN": ["Noto Sans SC"],
  "zh-TW": ["Noto Sans TC"],
  "zh-HK": ["Noto Sans HK"],
  "th-TH": ["Noto Sans Thai"],
  "bn-IN": ["Noto Sans Bengali"],
  "ar-AR": ["Noto Sans Arabic"],
  "ta-IN": ["Noto Sans Tamil"],
  "ml-IN": ["Noto Sans Malayalam"],
  "he-IL": ["Noto Sans Hebrew"],
  "te-IN": ["Noto Sans Telugu"],
  devanagari: ["Noto Sans Devanagari"],
  kannada: ["Noto Sans Kannada"],
  symbol: ["Noto Sans Symbols", "Noto Sans Symbols 2"],
  math: ["Noto Sans Math"],
  unknown: ["Noto Sans"],
};

async function getAsset(url: string) {
  const response = await fetch(url, {
    cache: "force-cache",
    signal: AbortSignal.timeout(5_000),
    // Google Fonts must return TTF instead of WOFF2 for Satori.
    headers: { "User-Agent": "Mozilla/5.0 Version/5.0.5 Safari/533.21.1" },
  });
  if (!response.ok)
    throw new Error(`Social card asset returned ${response.status}`);
  return response;
}

export async function loadSocialCardAsset(
  code: string,
  text: string,
): Promise<string | Font[]> {
  try {
    if (code === "emoji") {
      const emoji = text.includes("\u200d")
        ? text
        : text.replaceAll("\ufe0f", "");
      const points = Array.from(emoji, (char) =>
        char.codePointAt(0)!.toString(16),
      );
      const response = await getAsset(
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${points.join("-")}.svg`,
      );
      return `data:image/svg+xml;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    }

    const families = code
      .split("|")
      .flatMap((lang) =>
        (languageFonts[lang] ?? []).map((name) => ({ name, lang })),
      );
    if (!families.length) return [];
    const params = new URLSearchParams({ text });
    for (const { name } of families) params.append("family", name);
    const css = await (
      await getAsset(`https://fonts.googleapis.com/css2?${params}`)
    ).text();
    const faces = css.matchAll(
      /font-family:\s*'([^']+)';[^}]*src:\s*url\(([^)]+)\) format\('(opentype|truetype)'\)/g,
    );
    return await Promise.all(
      Array.from(
        faces,
        async ([, name, url]): Promise<Font> => {
          const lang = families.find((family) => family.name === name)?.lang;
          return {
            name: `social_${name}_${text}`,
            data: await (await getAsset(url!)).arrayBuffer(),
            weight: 400,
            style: "normal",
            lang: lang === "unknown" ? undefined : lang,
          };
        },
      ),
    );
  } catch (error) {
    console.warn("Failed to load a social card font or emoji", error);
    return [];
  }
}
