import { detectLeaks, DetectionResult } from '../leak-detector';
import {
  evaluatePolicy,
  PolicyDecision,
  RequestContext,
  defaultPolicyRules,
} from '../policy-engine';
import { redactText, RedactionResult } from './redaction';

export interface ChatRequest {
  prompt: string;
  providerName?: string;
  modelName?: string;
  stream?: boolean;
}

export interface PrivacyMetadata {
  detection: DetectionResult;
  policy: PolicyDecision;
  redaction: RedactionResult;
  providerUsed?: string;
}

// eslint-disable-next-line no-unused-vars
type ProviderInvoker = (prompt: string) => Promise<string>;

export interface ChatResponseWithMeta {
  content?: string;
  error?: string;
  metadata: PrivacyMetadata;
}

/**
 * Entry point for the privacy pipeline.
 * Wire this ahead of provider calls; delegate to the existing chat service once ready.
 */
export async function runWithPrivacyPipeline(
  request: ChatRequest,
  invokeProvider: ProviderInvoker,
): Promise<ChatResponseWithMeta> {
  const detection = detectLeaks(request.prompt);
  const policy = evaluatePolicy(detection, {
    providerName: request.providerName,
    modelName: request.modelName,
    stream: request.stream,
  } as RequestContext);

  if (policy.block) {
    return {
      error: 'Request blocked by privacy policy',
      metadata: {
        detection,
        policy,
        redaction: { redactedText: request.prompt, mapping: [] },
      },
    };
  }

  const redaction = redactText(request.prompt, detection, policy.redactions);
  const targetPrompt = redaction.redactedText;

  const content = await invokeProvider(targetPrompt);

  return {
    content,
    metadata: {
      detection,
      policy,
      redaction,
      providerUsed: request.providerName,
    },
  };
}

export {
  detectLeaks,
  evaluatePolicy,
  redactText,
  defaultPolicyRules,
  PrivacyMetadata,
};
