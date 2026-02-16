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
		if (fromStorage) {
			return normalizeLangInternal(fromStorage);
		}
	} catch {}

	try {
		const match = document.cookie.match(/(?:^|;\s*)fs_lang=([^;]+)/);
		if (match && match[1]) {
			return normalizeLangInternal(decodeURIComponent(match[1]));
		}
	} catch {}

	return DEFAULT_LANG;
};

/**
 * getLangFromCookie(): helper SSR.
 * Acepta el valor bruto de la cookie fs_lang y lo normaliza a 'es' | 'en'.
 */
export const getLangFromCookie = (raw: string | null | undefined): Lang => {
	return normalizeLangInternal(raw ?? null);
};

// Tipos auxiliares para productos

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

/**
 * getProductName(): devuelve el nombre del producto en el idioma actual,
 * con fallback razonable entre name_es, name_en y name plano.
 */
export const getProductName = (product: ProductLike | null | undefined, lang: Lang): string => {
	if (!product) return '';
	const { name, name_es, name_en } = product;

	if (lang === 'en') {
		return (
			name_en?.trim() ||
			name_es?.trim() ||
			name?.trim() ||
			''
		);
	}

	// es
	return (
		name_es?.trim() ||
		name_en?.trim() ||
		name?.trim() ||
		''
	);
};

/**
 * getProductDescription(): devuelve la descripción del producto en el idioma actual,
 * con fallback entre description_es, description_en y description.
 */
export const getProductDescription = (
	product: ProductWithDescriptionLike | null | undefined,
	lang: Lang,
): string | null => {
	if (!product) return null;
	const { description, description_es, description_en } = product;

	if (lang === 'en') {
		return (
			description_en?.trim() ||
			description_es?.trim() ||
			description?.trim() ||
			null
		);
	}

	// es
	return (
		description_es?.trim() ||
		description_en?.trim() ||
		description?.trim() ||
		null
	);
};

// Tipos auxiliares para colecciones

type CollectionLike = {
	name_es?: string | null;
	name_en?: string | null;
	subtitle_es?: string | null;
	subtitle_en?: string | null;
};

/**
 * getCollectionName(): devuelve el nombre de la colección en el idioma actual.
 */
export const getCollectionName = (
	collection: CollectionLike | null | undefined,
	lang: Lang,
): string => {
	if (!collection) {
		return lang === 'en' ? 'Collection' : 'Colección';
	}

	const { name_es, name_en } = collection;

	if (lang === 'en') {
		return name_en?.trim() || name_es?.trim() || 'Collection';
	}

	// es
	return name_es?.trim() || name_en?.trim() || 'Colección';
};

/**
 * getCollectionSubtitle(): devuelve el subtítulo de la colección en el idioma actual, o null.
 */
export const getCollectionSubtitle = (
	collection: CollectionLike | null | undefined,
	lang: Lang,
): string | null => {
	if (!collection) return null;
	const { subtitle_es, subtitle_en } = collection;

	if (lang === 'en') {
		return subtitle_en?.trim() || subtitle_es?.trim() || null;
	}

	// es
	return subtitle_es?.trim() || subtitle_en?.trim() || null;
};

// Tipos auxiliares para categorías

type CategoryLike = {
	name?: string | null;
	name_es?: string | null;
	name_en?: string | null;
};

/**
 * getCategoryName(): devuelve el nombre de la categoría en el idioma actual,
 * con fallback a name si los campos i18n no existen aún.
 */
export const getCategoryName = (
	category: CategoryLike | null | undefined,
	lang: Lang,
): string => {
	const c = (category ?? {}) as CategoryLike;
	const n = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const base = n(c.name);
	const es = n(c.name_es);
	const en = n(c.name_en);

	if (lang === 'en') return en || es || base || 'Category';
	return es || en || base || 'Categoría';
};
