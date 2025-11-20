import { DetectionResult, DetectedEntityType } from '../leak-detector';

export interface PolicyDecision {
  allowedProviders: string[];
  redactions: DetectedEntityType[];
  block: boolean;
}

export interface RequestContext {
  providerName?: string;
  modelName?: string;
  stream?: boolean;
}

export interface PolicyRules {
  entities?: Partial<Record<DetectedEntityType, 'local_only' | 'redact'>>;
  sensitivity_thresholds?: {
    high?: number;
  };
  localProviders?: string[];
  defaultProviders?: string[];
  custom_literals?: string[];
}

const defaultRules: PolicyRules = {
  entities: {
    SECRET_KEY: 'local_only',
    API_KEY: 'local_only',
    ACCESS_TOKEN: 'local_only',
    PRIVATE_KEY: 'local_only',
    CREDIT_CARD: 'local_only',
    SSN: 'local_only',
    MNEMONIC: 'local_only',
    WALLET: 'redact',
    JWT: 'redact',
    EMAIL: 'redact',
    PHONE: 'redact',
    PASSWORD: 'redact',
    CUSTOM_LITERAL: 'redact',
  },
  sensitivity_thresholds: {
    high: 0.7,
  },
  localProviders: ['Ollama', 'LMStudio', '5ire'],
  defaultProviders: [],
  custom_literals: [],
};

/**
 * Evaluate a detection result against policy rules to pick providers and redactions.
 * This is a starter implementation; swap in real config loading later.
 */
export function evaluatePolicy(
  detection: DetectionResult,
  requestContext: RequestContext,
  rules: PolicyRules = defaultRules,
): PolicyDecision {
  const decision: PolicyDecision = {
    allowedProviders: [],
    redactions: [],
    block: false,
  };

  const high = rules.sensitivity_thresholds?.high ?? 0.7;
  const localPreferred = rules.localProviders ?? [];
  const defaults = rules.defaultProviders ?? [];

  const sensitiveEntity = detection.entities.find((e) => {
    const policy = rules.entities?.[e.type];
    return policy === 'local_only';
  });

  // Block if deeply sensitive entities are found for remote providers.
  if (sensitiveEntity) {
    decision.allowedProviders.push(...localPreferred);
  } else {
    decision.allowedProviders.push(
      ...(detection.sensitivity >= high ? localPreferred : defaults),
    );
  }

  // Redact entities that require it
  detection.entities.forEach((entity) => {
    const policy = rules.entities?.[entity.type];
    if (policy === 'redact') {
      decision.redactions.push(entity.type);
    }
  });

  // If nothing is allowed, block the call
  if (decision.allowedProviders.length === 0) {
    decision.block = true;
  }

  // Honor requestContext if it specifies a provider outside allowed set
  if (
    requestContext.providerName &&
    decision.allowedProviders.length > 0 &&
    !decision.allowedProviders.includes(requestContext.providerName)
  ) {
    decision.block = true;
  }

  return decision;
}

export const defaultPolicyRules = defaultRules;
