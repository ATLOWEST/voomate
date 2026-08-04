/**
 * The handful of things the agent says that the model never writes.
 *
 * Everything else the agent says is generated. These are not: they have to be spoken *before*
 * the model has produced anything, or *instead* of what it produced, and going to the model
 * for them would defeat the point.
 *
 * They must be in the visitor's language. An English "one moment" dropped into a Hindi
 * conversation is the single most obvious tell that there is a machine on the other end, and
 * it happens at exactly the moment the visitor is waiting and paying attention.
 *
 * Two rules for anyone adding to these:
 *
 * - **Short.** An acknowledgement is spoken over the silence while retrieval runs. If it is
 *   longer than the wait, it is not covering the wait — it is the wait.
 * - **Not a promise.** "Let me check" is safe. "I have that right here" is a lie when the
 *   answer turns out to be ungrounded, and the visitor has already heard it by then.
 *
 * Keyed by base language, not dialect: a Hindi speaker in India and one anywhere else want the
 * same words, and maintaining twenty near-identical dialect variants invites drift.
 */

/** What the agent says to fill the gap while it looks something up. */
export type PhraseKind =
  /** Spoken the moment a question is understood, while retrieval and generation run. */
  | 'acknowledge'
  /** Spoken when the transcript came back too unclear to answer honestly. */
  | 'repair'
  /** Spoken when something broke and the turn cannot complete. */
  | 'trouble'
  /** Spoken when the visitor's language can be understood but not spoken back. */
  | 'languageFallback';

export interface PhraseSet {
  /** Several, so a visitor asking five questions does not hear the same clip five times. */
  acknowledge: readonly string[];
  repair: readonly string[];
  trouble: readonly string[];
  languageFallback: readonly string[];
}

const PHRASES: Readonly<Record<string, PhraseSet>> = {
  en: {
    acknowledge: ['Let me check.', 'One moment.', 'Let me look that up.', 'Sure, one second.'],
    repair: ["Sorry, I didn't catch that.", 'Could you say that again?'],
    trouble: ['Sorry, something went wrong on my end.'],
    languageFallback: ['I understood you, but I can only speak English right now.'],
  },
  hi: {
    acknowledge: ['एक सेकंड।', 'मैं देखता हूँ।', 'ज़रा देखने दीजिए।'],
    repair: ['माफ़ कीजिए, मैं समझ नहीं पाया।', 'क्या आप दोबारा कह सकते हैं?'],
    trouble: ['माफ़ कीजिए, कुछ गड़बड़ हो गई।'],
    languageFallback: ['मैं आपकी बात समझ गया, लेकिन अभी हिंदी में ही बोल सकता हूँ।'],
  },
  es: {
    acknowledge: ['Un momento.', 'Déjame ver.', 'Enseguida.'],
    repair: ['Perdón, no te entendí.', '¿Puedes repetirlo?'],
    trouble: ['Lo siento, algo salió mal.'],
    languageFallback: ['Te entiendo, pero por ahora solo puedo hablar en español.'],
  },
  pt: {
    acknowledge: ['Um momento.', 'Deixe-me verificar.', 'Já vejo isso.'],
    repair: ['Desculpe, não entendi.', 'Pode repetir?'],
    trouble: ['Desculpe, algo deu errado.'],
    languageFallback: ['Eu entendo você, mas por enquanto só consigo falar português.'],
  },
  fr: {
    acknowledge: ['Un instant.', 'Je vérifie.', 'Laissez-moi voir.'],
    repair: ["Pardon, je n'ai pas compris.", 'Pouvez-vous répéter ?'],
    trouble: ["Désolé, quelque chose s'est mal passé."],
    languageFallback: ['Je vous comprends, mais je ne peux parler qu’en français pour l’instant.'],
  },
  de: {
    acknowledge: ['Einen Moment.', 'Ich schaue nach.', 'Lassen Sie mich das prüfen.'],
    repair: ['Entschuldigung, das habe ich nicht verstanden.', 'Können Sie das wiederholen?'],
    trouble: ['Entschuldigung, da ist etwas schiefgelaufen.'],
    languageFallback: ['Ich verstehe Sie, kann aber im Moment nur Deutsch sprechen.'],
  },
  ar: {
    acknowledge: ['لحظة من فضلك.', 'دعني أتحقق.', 'ثانية واحدة.'],
    repair: ['عذراً، لم أفهم ذلك.', 'هل يمكنك أن تعيد ما قلت؟'],
    trouble: ['عذراً، حدث خطأ ما.'],
    languageFallback: ['أفهمك، لكنني أستطيع التحدث بالعربية فقط في الوقت الحالي.'],
  },
  zh: {
    acknowledge: ['稍等一下。', '我查一下。', '请稍候。'],
    repair: ['抱歉，我没听清。', '可以再说一遍吗？'],
    trouble: ['抱歉，出了点问题。'],
    languageFallback: ['我能听懂您，但目前只能用中文回答。'],
  },
  ja: {
    acknowledge: ['少々お待ちください。', '確認いたします。', '少しお時間をください。'],
    repair: ['すみません、聞き取れませんでした。', 'もう一度お願いできますか。'],
    trouble: ['申し訳ありません、問題が発生しました。'],
    languageFallback: ['お話は理解できますが、今は日本語でしかお答えできません。'],
  },
  it: {
    acknowledge: ['Un momento.', 'Faccio un controllo.', 'Un attimo.'],
    repair: ['Scusa, non ho capito.', 'Puoi ripetere?'],
    trouble: ['Scusa, qualcosa è andato storto.'],
    languageFallback: ['Ti capisco, ma per ora posso parlare solo in italiano.'],
  },
  ko: {
    acknowledge: ['잠시만 기다려 주세요.', '확인해 보겠습니다.'],
    repair: ['죄송해요, 잘 못 들었어요.', '다시 한 번 말씀해 주시겠어요?'],
    trouble: ['죄송합니다, 문제가 발생했습니다.'],
    languageFallback: ['말씀은 이해했지만 지금은 한국어로만 대답할 수 있어요.'],
  },
  nl: {
    acknowledge: ['Een moment.', 'Ik kijk het even na.'],
    repair: ['Sorry, dat verstond ik niet.', 'Kunt u dat herhalen?'],
    trouble: ['Sorry, er ging iets mis.'],
    languageFallback: ['Ik begrijp u, maar ik kan nu alleen Nederlands spreken.'],
  },
  pl: {
    acknowledge: ['Chwileczkę.', 'Zaraz sprawdzę.'],
    repair: ['Przepraszam, nie zrozumiałem.', 'Czy możesz powtórzyć?'],
    trouble: ['Przepraszam, coś poszło nie tak.'],
    languageFallback: ['Rozumiem Cię, ale na razie mogę mówić tylko po polsku.'],
  },
};

/** English is the fallback of last resort — never a missing phrase, never a silent gap. */
const FALLBACK = PHRASES['en']!;

const baseOf = (language: string): string => language.split('-')[0]!.toLowerCase();

/** Every phrase for a language, falling back to English when we have none. */
export const getPhrases = (language: string): PhraseSet => PHRASES[baseOf(language)] ?? FALLBACK;

/** True when we actually have this language, rather than quietly serving English. */
export const hasPhrases = (language: string): boolean => baseOf(language) in PHRASES;

/**
 * One phrase of a kind, chosen by rotation rather than at random.
 *
 * Random repeats — `Math.random()` will happily give the same acknowledgement three times in a
 * row, and a visitor who hears "let me check" three times running notices the loop. An index
 * the caller advances never does.
 */
export const getPhrase = (language: string, kind: PhraseKind, index = 0): string => {
  const options = getPhrases(language)[kind];
  return options[Math.abs(Math.trunc(index)) % options.length]!;
};

/** Languages with a hand-written phrase set. Everything else hears English. */
export const languagesWithPhrases = (): readonly string[] => Object.keys(PHRASES);
