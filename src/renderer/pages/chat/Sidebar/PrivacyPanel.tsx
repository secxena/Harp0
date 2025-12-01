import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, ProgressBar } from '@fluentui/react-components';
import useChatStore from 'stores/useChatStore';
import type { IChatMessage } from 'intellichat/types';

interface PrivacyPanelProps {
  chatId: string;
}

const HIGH_THRESHOLD = 0.7;

export default function PrivacyPanel({ chatId }: PrivacyPanelProps) {
  const { t } = useTranslation();
  const messages = useChatStore((state) => state.messages);

  const privacyMessages = useMemo(() => {
    return (messages || []).filter(
      (message: IChatMessage) => message.chatId === chatId && message.privacy,
    );
  }, [messages, chatId]);

  const stats = useMemo(() => {
    const summary = {
      total: privacyMessages.length,
      highSensitivity: 0,
      redactions: 0,
      localRouted: 0,
      entityCounts: {} as Record<string, number>,
    };
    privacyMessages.forEach((msg) => {
      const { privacy } = msg;
      if (!privacy) return;
      if ((privacy.detection?.sensitivity || 0) >= HIGH_THRESHOLD) {
        summary.highSensitivity += 1;
      }
      if (!privacy.policy.allowedProviders?.length) {
        summary.localRouted += 1;
      }
      summary.redactions += privacy.redaction?.mapping?.length || 0;
      (privacy.detection?.entities || []).forEach((entity) => {
        summary.entityCounts[entity.type] =
          (summary.entityCounts[entity.type] || 0) + 1;
      });
    });
    return summary;
  }, [privacyMessages]);

  const latest = useMemo(() => {
    return privacyMessages.slice(-5).reverse();
  }, [privacyMessages]);

  if (!privacyMessages.length) {
    return (
      <div className="text-xs text-gray-500 px-2">
        {t(
          'Privacy.NoData',
          'No privacy events yet. Send a message to see detections.',
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pr-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
          <div className="font-semibold text-sm">
            {t('Privacy.TotalMessages', 'Total messages')}
          </div>
          <div className="text-lg">{stats.total}</div>
        </div>
        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
          <div className="font-semibold text-sm">
            {t('Privacy.HighSensitivity', 'High sensitivity')}
          </div>
          <div className="text-lg">{stats.highSensitivity}</div>
        </div>
        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
          <div className="font-semibold text-sm">
            {t('Privacy.LocalRouted', 'Local routed')}
          </div>
          <div className="text-lg">{stats.localRouted}</div>
        </div>
        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
          <div className="font-semibold text-sm">
            {t('Privacy.Redactions', 'Redactions applied')}
          </div>
          <div className="text-lg">{stats.redactions}</div>
        </div>
      </div>

      <Field
        label={t('Privacy.TopEntities', 'Top detected entities')}
        className="text-xs"
      >
        <div className="flex flex-col gap-1">
          {Object.entries(stats.entityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-xs">
                  <span>{type}</span>
                  <span>{count}</span>
                </div>
                <ProgressBar
                  thickness="medium"
                  max={stats.total || 1}
                  value={count}
                />
              </div>
            ))}
          {Object.keys(stats.entityCounts).length === 0 && (
            <div className="text-gray-500">
              {t('Privacy.NoEntities', 'No entities detected yet.')}
            </div>
          )}
        </div>
      </Field>

      <Field label={t('Privacy.RecentEvents', 'Recent events')}>
        <div className="flex flex-col gap-2 text-xs max-h-64 overflow-auto pr-1">
          {latest.map((msg) => (
            <div
              key={msg.id}
              className="rounded border border-gray-200 dark:border-gray-700 p-2"
            >
              <div className="flex justify-between text-[11px] font-semibold">
                <span>
                  {t('Privacy.Sensitivity', 'Sensitivity')}:{' '}
                  {Math.round((msg.privacy?.detection?.sensitivity || 0) * 100)}
                  %
                </span>
                <span>{msg.privacy?.providerUsed || '—'}</span>
              </div>
              <div className="mt-1">
                <strong>{t('Privacy.Entities', 'Entities')}:</strong>{' '}
                {(msg.privacy?.detection?.entities || [])
                  .map((entity) => entity.type)
                  .join(', ') || t('Privacy.None', 'None')}
              </div>
            </div>
          ))}
        </div>
      </Field>
    </div>
  );
}
