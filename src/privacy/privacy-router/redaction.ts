import { DetectionResult, DetectedEntityType } from '../leak-detector';

export interface RedactionMappingEntry {
  placeholder: string;
  original: string;
  type: DetectedEntityType;
  start: number;
  end: number;
}

export interface RedactionResult {
  redactedText: string;
  mapping: RedactionMappingEntry[];
}

/**
 * Produce a redacted string and placeholder mapping for sensitive entities.
 * Placeholders look like [SECRET_1], [EMAIL_2], etc.
 */
export function redactText(
  original: string,
  detection: DetectionResult,
  redactTypes: DetectedEntityType[],
): RedactionResult {
  if (!original) {
    return { redactedText: original, mapping: [] };
  }

  const sorted = [...detection.entities].sort((a, b) => a.start - b.start);
  const mapping: RedactionMappingEntry[] = [];
  let offset = 0;
  let redactedText = original;
  const counters: Record<DetectedEntityType, number> = {} as Record<
    DetectedEntityType,
    number
  >;

  sorted.forEach((entity) => {
    if (!redactTypes.includes(entity.type)) {
      return;
    }
    counters[entity.type] = (counters[entity.type] || 0) + 1;
    const placeholder = `[${entity.type}_${counters[entity.type]}]`;
    const start = entity.start + offset;
    const end = entity.end + offset;

    redactedText =
      redactedText.slice(0, start) + placeholder + redactedText.slice(end);
    offset += placeholder.length - (entity.end - entity.start);

    mapping.push({
      placeholder,
      original: entity.text,
      type: entity.type,
      start,
      end: start + placeholder.length,
    });
  });

  return { redactedText, mapping };
}
