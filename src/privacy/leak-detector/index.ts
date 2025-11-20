export type DetectedEntityType =
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'IP_ADDRESS'
  | 'CREDIT_CARD'
  | 'SSN'
  | 'API_KEY'
  | 'SECRET_KEY'
  | 'ACCESS_TOKEN'
  | 'PRIVATE_KEY'
  | 'MNEMONIC'
  | 'WALLET'
  | 'JWT'
  | 'PASSWORD'
  | 'CUSTOM_LITERAL'
  | 'UNKNOWN';

export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface DetectedEntity {
  type: DetectedEntityType;
  start: number;
  end: number;
  text: string;
  severity: SensitivityLevel;
  confidence: number;
  description?: string;
}

export interface DetectionResult {
  entities: DetectedEntity[];
  sensitivity: number;
}

interface DetectorRule {
  type: DetectedEntityType;
  description: string;
  severity: SensitivityLevel;
  weight: number;
  pattern?: RegExp;
  patterns?: RegExp[];
  validate?: (value: string) => boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
}

const HIGH_CONFIDENCE = 0.9;
const MEDIUM_CONFIDENCE = 0.65;
const LOW_CONFIDENCE = 0.35;

const detectors: DetectorRule[] = [
  {
    type: 'EMAIL',
    description: 'Email address',
    severity: 'low',
    weight: 0.2,
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?!\w)/g,
  },
  {
    type: 'ADDRESS',
    description: 'Street address',
    severity: 'medium',
    weight: 0.3,
    pattern: /\b\d{1,5}\s+[A-Za-z0-9\s.,'-]{3,}\b/g,
  },
  {
    type: 'IP_ADDRESS',
    description: 'IPv4 address',
    severity: 'medium',
    weight: 0.3,
    pattern:
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
  {
    type: 'CREDIT_CARD',
    description: 'Credit card number',
    severity: 'high',
    weight: 0.9,
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: (value: string) => luhnCheck(value),
  },
  {
    type: 'SSN',
    description: 'US Social Security Number',
    severity: 'high',
    weight: 0.8,
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  },
  {
    type: 'API_KEY',
    description: 'API key (sk- or pk- prefixed)',
    severity: 'high',
    weight: 0.9,
    pattern: /\b(?:sk-|pk-)[A-Za-z0-9]{16,}\b/g,
  },
  {
    type: 'SECRET_KEY',
    description: 'AWS-style secret key',
    severity: 'high',
    weight: 1,
    pattern: /\b(?:AKIA|ASIA|ABIA)[A-Z0-9]{12,}\b/g,
  },
  {
    type: 'ACCESS_TOKEN',
    description: 'Bearer/JWT token',
    severity: 'high',
    weight: 0.8,
    patterns: [
      /\bya29\.[0-9A-Za-z_-]+\b/g, // Google OAuth
      /\bghp_[A-Za-z0-9]{36}\b/g, // GitHub PAT
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g, // JWT
    ],
  },
  {
    type: 'PRIVATE_KEY',
    description: 'Private key block',
    severity: 'high',
    weight: 1,
    pattern:
      /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]+?-----END(?: [A-Z]+)? PRIVATE KEY-----/g,
  },
  {
    type: 'MNEMONIC',
    description: 'Seed phrase / mnemonic words',
    severity: 'high',
    weight: 0.9,
    pattern: /\b([a-z]+(?:\s+)){11,23}[a-z]+\b/gi,
    validate: (match: string) => match.trim().split(/\s+/).length >= 12,
  },
  {
    type: 'WALLET',
    description: 'Bitcoin/Ethereum wallet',
    severity: 'high',
    weight: 0.8,
    patterns: [
      /\b0x[a-fA-F0-9]{40}\b/g, // Ethereum
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, // Bitcoin legacy
    ],
  },
  {
    type: 'PASSWORD',
    description: 'Suspicious password assignment',
    severity: 'medium',
    weight: 0.4,
    pattern: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{6,}["']?/gi,
  },
  {
    type: 'PHONE',
    description: 'Phone number',
    severity: 'low',
    weight: 0.15,
    pattern:
      /\b(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{3,4}[ .-]?\d{4}\b/g,
  },
];

const sortedDetectors = [...detectors].sort((a, b) => b.weight - a.weight);
const MAX_WEIGHT = sortedDetectors.reduce((sum, rule) => sum + rule.weight, 0);

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function confidenceForSeverity(severity: SensitivityLevel): number {
  if (severity === 'high') {
    return HIGH_CONFIDENCE;
  }
  if (severity === 'medium') {
    return MEDIUM_CONFIDENCE;
  }
  return LOW_CONFIDENCE;
}

function luhnCheck(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(digits[i], 10);
    if (Number.isNaN(digit)) {
      return false;
    }
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Enhanced regex-based leak detector with weighted scoring.
 */
function hasOverlap(
  ranges: { start: number; end: number }[],
  start: number,
  end: number,
) {
  return ranges.some(
    (range) => Math.max(range.start, start) < Math.min(range.end, end),
  );
}

export function detectLeaks(text: string): DetectionResult {
  const entities: DetectedEntity[] = [];
  let totalWeight = 0;
  const occupiedRanges: { start: number; end: number }[] = [];

  sortedDetectors.forEach((rule) => {
    const patterns = rule.patterns || (rule.pattern ? [rule.pattern] : []);
    patterns.forEach((pattern) => {
      Array.from(text.matchAll(pattern)).forEach((match) => {
        const value = match[0];
        if (rule.validate && !rule.validate(value)) {
          return;
        }
        const start = match.index ?? 0;
        const end = start + value.length;
        if (hasOverlap(occupiedRanges, start, end)) {
          return;
        }
        entities.push({
          type: rule.type,
          start,
          end,
          text: value,
          severity: rule.severity,
          confidence: confidenceForSeverity(rule.severity),
          description: rule.description,
        });
        totalWeight += rule.weight;
        occupiedRanges.push({ start, end });
      });
    });
  });

  const sensitivity = clamp(totalWeight / MAX_WEIGHT, 0, 1);

  return {
    entities,
    sensitivity,
  };
}

export default detectLeaks;
