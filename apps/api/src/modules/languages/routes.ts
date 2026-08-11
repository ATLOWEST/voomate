/**
 * Language capability endpoints.
 *
 * Backed entirely by the static registry in `@voomate/i18n`, so these work with no database
 * and no AWS connection. The dashboard's language picker consumes them directly rather than
 * shipping its own copy of the matrix — one source of truth, and it's the one that was
 * verified against AWS docs.
 */
import { LANGUAGE_REGISTRY, resolveVoice, validateLanguageSet } from '@voomate/i18n';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const listQuerySchema = z.object({
  tier: z.enum(['launch', 'extra', 'text-only']).optional(),
  /** Exclude languages we cannot speak — the default view for a voice agent. */
  speakableOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const validateBodySchema = z.object({
  languages: z.array(z.string()).min(1),
});

export const languageRoutes: FastifyPluginAsync = async (app) => {
  /** The full capability matrix, for the dashboard's language picker. */
  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);

    const languages = LANGUAGE_REGISTRY.filter((lang) => {
      if (query.tier !== undefined && lang.tier !== query.tier) return false;
      if (query.speakableOnly && lang.support === 'text-only') return false;
      return true;
    }).map((lang) => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      support: lang.support,
      tier: lang.tier,
      rtl: lang.rtl ?? false,
      note: lang.note,
      // Surfaced so the merchant sees the quality tier before publishing, not after a
      // customer complains. See docs/languages.md — "never silently degrade".
      voices: lang.voices.map((voice) => ({
        id: voice.id,
        gender: voice.gender,
        bestTier: voice.tiers[0],
        bilingual: voice.bilingualWith !== undefined,
      })),
    }));

    return { languages };
  });

  /**
   * Validate a candidate set before the merchant saves it.
   *
   * Returns warnings as well as errors, so the dashboard can explain *why* — for example
   * that en-US and en-IN cannot coexist in one voice session, which is surprising until
   * someone tells you.
   */
  app.post('/validate', async (request) => {
    const { languages } = validateBodySchema.parse(request.body);
    const result = validateLanguageSet(languages);

    const resolved = languages.map((code) => {
      const voice = resolveVoice(code);
      return {
        code,
        speakable: voice !== undefined,
        voiceId: voice?.voiceId,
        engine: voice?.engine,
        degraded: voice?.degraded ?? false,
        bilingual: voice?.bilingual ?? false,
      };
    });

    return { ...result, resolved };
  });
};
