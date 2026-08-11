import { listLanguages, RECOMMENDED_MAX_CANDIDATE_LANGUAGES } from '@voomate/i18n';
import { PageBody } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

/**
 * Voice & Languages.
 *
 * This screen renders the real registry from @voomate/i18n rather than a hardcoded list, so
 * the dashboard cannot drift from what the pipeline can actually speak. If a language has no
 * Polly voice, it shows up here as text-only — with the reason — instead of being silently
 * offered and then failing at runtime. See docs/languages.md.
 */
export default function VoicePage() {
  const languages = listLanguages();
  const launch = languages.filter((language) => language.tier === 'launch');
  const textOnly = languages.filter((language) => language.support === 'text-only');

  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Spoken languages"
          description={`Pick the languages visitors actually use. Automatic detection gets less accurate as the candidate list grows — ${String(RECOMMENDED_MAX_CANDIDATE_LANGUAGES)} or fewer is the sweet spot, and a wide list forces wrong-language transcripts rather than no answer.`}
        />
        <PanelBody className="p-0">
          <ul className="divide-y divide-[var(--border-default)]">
            {launch.map((language) => (
              <li key={language.code} className="flex items-center gap-4 px-6 py-3">
                <input
                  type="checkbox"
                  id={`lang-${language.code}`}
                  defaultChecked={language.code === 'en-US'}
                  className="accent-accent-600 size-4"
                />
                <label htmlFor={`lang-${language.code}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="text-[13.5px] font-medium">{language.name}</span>
                  <span className="ml-2 text-[13px] text-muted" dir={language.rtl ? 'rtl' : 'ltr'}>
                    {language.nativeName}
                  </span>
                  {language.note !== undefined && (
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-secondary">
                      {language.note}
                    </span>
                  )}
                </label>
                <div className="flex shrink-0 items-center gap-2">
                  {/* The tier is a real quality difference the merchant can hear. Naming it
                      here sets expectations before they record a demo, not after. */}
                  <Badge tone={language.support === 'voice-premium' ? 'accent' : 'neutral'}>
                    {language.support === 'voice-premium' ? 'Generative' : 'Neural'}
                  </Badge>
                  <code className="text-[11.5px] text-muted">{language.code}</code>
                </div>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Text-only languages"
          description="Amazon Polly has no voice for these, so the agent will answer in text and say so rather than replying in the wrong language. Enable them if your visitors type in these languages."
        />
        <PanelBody>
          <div className="flex flex-wrap gap-2">
            {textOnly.map((language) => (
              <span
                key={language.code}
                className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-[12.5px]"
                dir={language.rtl ? 'rtl' : 'ltr'}
              >
                {language.nativeName}
              </span>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </PageBody>
  );
}
