import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Field,
  Input,
  Textarea,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetPolicyCache } from 'privacy/policy-engine/loader';
import useToast from 'hooks/useToast';
import { detectorMetadata } from 'privacy/leak-detector';

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
interface PrivacyConfigDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

const listToText = (items?: string[]) => (items || []).join('\n');

const textToList = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function PrivacyConfigDrawer({
  open,
  setOpen,
}: PrivacyConfigDrawerProps) {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultProviders, setDefaultProviders] = useState('');
  const [localProviders, setLocalProviders] = useState('');
  const [customLiterals, setCustomLiterals] = useState('');
  const [sensitivityHigh, setSensitivityHigh] = useState<string>('0.7');
  const [rawPolicy, setRawPolicy] = useState<any>({});
  const [disabledEntities, setDisabledEntities] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadPolicy = async () => {
      setLoading(true);
      try {
        const policy = await window.electron.privacy.getPolicy();
        const rules = policy || {};
        setRawPolicy(rules);
        setDefaultProviders(listToText(rules.defaultProviders));
        setLocalProviders(listToText(rules.localProviders));
        setCustomLiterals(
          listToText(rules.custom_literals || rules.customLiterals),
        );
        setDisabledEntities(rules.disabled_entities || []);
        setSensitivityHigh(
          String(
            rules?.sensitivity_thresholds?.high ??
              rules?.sensitivity_thresholds?.high ??
              0.7,
          ),
        );
      } catch (error: any) {
        notifyError(error?.message || 'Failed to load privacy settings');
      } finally {
        setLoading(false);
      }
    };
    loadPolicy();
  }, [notifyError, open]);

  const canSave = useMemo(() => !saving && !loading, [saving, loading]);

  const handleToggleEntity = (type: string, checked: boolean) => {
    setDisabledEntities((prev) => {
      if (checked) {
        return [...new Set([...prev, type])];
      }
      return prev.filter((item) => item !== type);
    });
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const thresholds = {
        ...(rawPolicy?.sensitivity_thresholds || {}),
        high: Number.parseFloat(sensitivityHigh) || 0.7,
      };
      const nextPolicy = {
        ...rawPolicy,
        defaultProviders: textToList(defaultProviders),
        localProviders: textToList(localProviders),
        custom_literals: textToList(customLiterals),
        sensitivity_thresholds: thresholds,
        disabled_entities: disabledEntities,
      };
      await window.electron.privacy.setPolicy(nextPolicy);
      resetPolicyCache();
      notifySuccess(t('Privacy.SettingsSaved', 'Privacy settings saved'));
      setOpen(false);
    } catch (error: any) {
      notifyError(error?.message || 'Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      position="end"
      open={open}
      onOpenChange={(_, { open: drawerOpen }) => setOpen(drawerOpen)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setOpen(false)}
            />
          }
        >
          {t('Privacy.Settings', 'Privacy Settings')}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className="mt-2.5 flex flex-col gap-3 relative">
        <Divider>{t('Privacy.Routing', 'Routing policy')}</Divider>
        <Field
          label={t('Privacy.DefaultProviders', 'Default providers')}
          hint={t(
            'Privacy.DefaultProvidersHint',
            'One per line; external providers allowed when prompt is not sensitive.',
          )}
        >
          <Textarea
            rows={4}
            value={defaultProviders}
            onChange={(_, data) => setDefaultProviders(data.value)}
          />
        </Field>
        <Field
          label={t('Privacy.LocalProviders', 'Local only providers')}
          hint={t(
            'Privacy.LocalProvidersHint',
            'Requests routed here when sensitive content is detected.',
          )}
        >
          <Textarea
            rows={3}
            value={localProviders}
            onChange={(_, data) => setLocalProviders(data.value)}
          />
        </Field>
        <Field
          label={t('Privacy.SensitivityThreshold', 'High-sensitivity cutoff')}
          hint={t(
            'Privacy.SensitivityThresholdHint',
            'Prompts scoring above this value use only local providers.',
          )}
        >
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={sensitivityHigh}
            onChange={(_, data) => setSensitivityHigh(data.value)}
          />
        </Field>
        <Divider>{t('Privacy.Detectors', 'Leak detectors')}</Divider>
        <Field
          label={t(
            'Privacy.DisableDetectors',
            'Disable specific detectors (checked = disabled)',
          )}
        >
          <div className="grid gap-2 max-h-60 overflow-auto pr-2">
            {detectorMetadata.map((meta) => (
              <Checkbox
                key={meta.type}
                label={`${meta.type} – ${meta.description}`}
                checked={disabledEntities.includes(meta.type)}
                onChange={(_, data) =>
                  handleToggleEntity(meta.type, !!data.checked)
                }
              />
            ))}
          </div>
        </Field>
        <Divider>
          {t('Privacy.CustomRedactions', 'Custom literals to redact')}
        </Divider>
        <Field
          label={t(
            'Privacy.CustomLiteralLabel',
            'Always redact these strings (one per line)',
          )}
        >
          <Textarea
            rows={6}
            value={customLiterals}
            onChange={(_, data) => setCustomLiterals(data.value)}
            placeholder={t(
              'Privacy.CustomLiteralPlaceholder',
              'api.secret\nserver-123',
            )}
          />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button appearance="subtle" onClick={() => setOpen(false)}>
            {t('Common.Cancel')}
          </Button>
          <Button
            appearance="primary"
            onClick={onSave}
            disabled={!canSave}
            loading={saving}
          >
            {t('Common.Save')}
          </Button>
        </div>
      </DrawerBody>
    </Drawer>
  );
}
