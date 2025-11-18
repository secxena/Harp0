export type DetectedEntityType =
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'API_KEY'
  | 'SECRET_KEY'
  | 'WALLET'
  | 'JWT'
  | 'UNKNOWN';

export interface DetectedEntity {
  type: DetectedEntityType;
  start: number;
  end: number;
  text: string;
}

export interface DetectionResult {
  entities: DetectedEntity[];
  sensitivity: number;
}

const regexRules: Record<DetectedEntityType, RegExp> = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?!\w)/g,
  PHONE: /\b(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{3,4}[ .-]?\d{4}\b/g,
  ADDRESS: /\b\d{1,5}\s+[A-Za-z0-9\s.,'-]{3,}\b/g,
  API_KEY: /\b(?:sk-|pk-)[A-Za-z0-9]{10,}\b/g,
  SECRET_KEY: /\b(?:AKIA|ASIA)[A-Z0-9]{12,}\b/g,
  WALLET: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
  JWT: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
  UNKNOWN: /.^/g, // never matches; placeholder for completeness
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Lightweight regex-based leak detector.
 * Returns detected entities and a coarse sensitivity score (0-1).
 */
export function detectLeaks(text: string): DetectionResult {
  const entities: DetectedEntity[] = [];

  Object.entries(regexRules).forEach(([type, pattern]) => {
    if (type === 'UNKNOWN') return;
    Array.from(text.matchAll(pattern)).forEach((match) => {
      entities.push({
        type: type as DetectedEntityType,
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
        text: match[0],
      });
    });
  });

  const sensitivity = clamp(entities.length / 5, 0, 1);

  return {
    entities,
    sensitivity,
  };
}

export default detectLeaks;
