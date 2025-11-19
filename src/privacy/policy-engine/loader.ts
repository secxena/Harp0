import Debug from 'debug';
import { PolicyRules, defaultPolicyRules } from './index';

const debug = Debug('5ire:privacy:policy-loader');

let cachedRules: PolicyRules | null = null;

const getPolicyLoader = () => {
  const { electron } = window as any;
  return electron?.privacy?.getPolicy;
};

/**
 * Load policy rules from the main process (YAML/JSON), falling back to defaults.
 */
export async function loadPolicyRules(): Promise<PolicyRules> {
  if (cachedRules) {
    return cachedRules;
  }

  const load = getPolicyLoader();
  if (typeof load === 'function') {
    try {
      const rules = await load();
      if (rules && typeof rules === 'object') {
        cachedRules = { ...defaultPolicyRules, ...rules };
        return cachedRules;
      }
    } catch (err) {
      // Best-effort; fall back to defaults
      debug('Failed to load privacy policy config', err);
    }
  }

  cachedRules = defaultPolicyRules;
  return cachedRules;
}

export function resetPolicyCache() {
  cachedRules = null;
}
