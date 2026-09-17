import { de } from './locales/de';
import { en } from './locales/en';
import type { Locale } from './locale';

type TranslationShape<Value> = Value extends (...args: infer Arguments) => infer Result
  ? (...args: Arguments) => TranslationShape<Result>
  : Value extends string
    ? string
    : { [Key in keyof Value]: TranslationShape<Value[Key]> };

export type Translations = TranslationShape<typeof de>;

export const translations: Record<Locale, Translations> = { de, en };
