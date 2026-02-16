export type Lang = 'es' | 'en';

export const DEFAULT_LANG: Lang = 'es';

const normalizeLangInternal = (value: string | null | undefined): Lang => {
  const v = (value || '').trim().toLowerCase();
  if (v === 'en') return 'en';
  return 'es';
};

/**
 * getLang(): helper orientado a entorno browser.
 * Lee localStorage.fs_lang y cookie fs_lang si existen.
 * En SSR devuelve 'es' por defecto; usa getLangFromCookie en el servidor.
 */
export const getLang = (): Lang => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_LANG;
  }

  try {
    const fromStorage = window.localStorage.getItem('fs_lang');
    if (fromStorage) return normalizeLangInternal(fromStorage);
  } catch {}

  try {
    const match = document.cookie.match(/(?:^|;\s*)fs_lang=([^;]+)/);
    if (match && match[1]) return normalizeLangInternal(decodeURIComponent(match[1]));
  } catch {}

  return DEFAULT_LANG;
};

/**
 * getLangFromCookie(): helper SSR.
 * Pásale Astro.cookies.get('fs_lang')?.value
 */
export const getLangFromCookie = (raw: string | null | undefined): Lang => {
  return normalizeLangInternal(raw);
};

const normText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

type ProductLike = {
  name?: string | null;
  name_es?: string | null;
  name_en?: string | null;
};

type ProductWithDescriptionLike = ProductLike & {
  description?: string | null;
  description_es?: string | null;
  description_en?: string | null;
};

export const getProductName = (product: ProductLike | null | undefined, lang: Lang): string => {
  const p = product ?? {};
  const base = normText(p.name);
  const es = normText(p.name_es);
  const en = normText(p.name_en);

  if (lang === 'en') return en || es || base || 'Product';
  return es || en || base || 'Producto';
};

export const getProductDescription = (
  product: ProductWithDescriptionLike | null | undefined,
  lang: Lang,
): string | null => {
  const p = product ?? {};
  const base = normText(p.description);
  const es = normText(p.description_es);
  const en = normText(p.description_en);

  const result = lang === 'en' ? en || es || base : es || en || base;
  return result || null;
};

type CollectionLike = {
  name_es?: string | null;
  name_en?: string | null;
  subtitle_es?: string | null;
  subtitle_en?: string | null;
};

export const getCollectionName = (collection: CollectionLike | null | undefined, lang: Lang): string => {
  const c = collection ?? {};
  const es = normText(c.name_es);
  const en = normText(c.name_en);

  if (lang === 'en') return en || es || 'Collection';
  return es || en || 'Colección';
};

export const getCollectionSubtitle = (
  collection: CollectionLike | null | undefined,
  lang: Lang,
): string | null => {
  const c = collection ?? {};
  const es = normText(c.subtitle_es);
  const en = normText(c.subtitle_en);

  const result = lang === 'en' ? en || es : es || en;
  return result || null;
};

type CategoryLike = {
  name?: string | null;
  name_es?: string | null;
  name_en?: string | null;
};

export const getCategoryName = (category: CategoryLike | null | undefined, lang: Lang): string => {
  const c = category ?? {};
  const base = normText(c.name);
  const es = normText(c.name_es);
  const en = normText(c.name_en);

  if (lang === 'en') return en || es || base || 'Category';
  return es || en || base || 'Categoría';
};
