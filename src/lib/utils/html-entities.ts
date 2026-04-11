const htmlNamedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  middot: "·",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  AElig: "Æ",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  Ntilde: "Ñ",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  Oslash: "Ø",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  Yacute: "Ý",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  yuml: "ÿ",
  szlig: "ß",
} as const;

const htmlEntityPattern = /&(#x[0-9a-fA-F]+|#\d+|[0-9A-Za-z]+);/g;

function decodeNumericHtmlEntity(entity: string) {
  const isHex = entity.startsWith("#x") || entity.startsWith("#X");
  const rawCodePoint = isHex ? entity.slice(2) : entity.slice(1);
  const parsed = Number.parseInt(rawCodePoint, isHex ? 16 : 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  try {
    return String.fromCodePoint(parsed);
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const decoded = value
    .replace(htmlEntityPattern, (match, entity: string) => {
      if (entity.startsWith("#")) {
        return decodeNumericHtmlEntity(entity) ?? match;
      }

      return htmlNamedEntities[entity] ?? match;
    })
    .replace(/\u00a0/g, " ")
    .trim();

  return decoded.length > 0 ? decoded : null;
}
