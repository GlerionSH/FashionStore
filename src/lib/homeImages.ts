import { resolveHomeImage } from './brand';

export type HomeImageConfig = {
	src: string | null;
	alt: string;
	fallbackColor: string;
	fallbackGradient?: string;
};

export type CategoryBlockConfig = {
	href: string;
	image: HomeImageConfig;
	subtitle: string;
	title: string;
};

export const getHeroImage = (): HomeImageConfig => ({
	src: resolveHomeImage('PUBLIC_HOME_HERO_URL', '/imagen-fondo.png'),
	alt: 'Hero',
	fallbackColor: '#e5e7eb',
	fallbackGradient: 'linear-gradient(135deg, #f5f5f5 0%, #e5e7eb 100%)',
});

export const getCategoryImages = (flashOffersEnabled: boolean): CategoryBlockConfig[] => {
	const categories: CategoryBlockConfig[] = [
		{
			href: '/productos',
			image: {
				src: resolveHomeImage('PUBLIC_HOME_CAT_NEWIN_URL', '/fondo-1.png'),
				alt: 'New In',
				fallbackColor: '#e5e7eb',
			},
			subtitle: 'Categoria',
			title: 'New In',
		},
		{
			href: '/productos',
			image: {
				src: resolveHomeImage('PUBLIC_HOME_CAT_BASICS_URL', '/fondo-2.png'),
				alt: 'Basics',
				fallbackColor: '#d1d5db',
			},
			subtitle: 'Categoria',
			title: 'Basics',
		},
	];

	if (flashOffersEnabled) {
		categories.push({
			href: '/productos?flash=1',
			image: {
				src: resolveHomeImage('PUBLIC_HOME_CAT_FLASH_URL', '/cat-flash.jpg'),
				alt: 'Ofertas Flash',
				fallbackColor: '#111',
			},
			subtitle: 'Promocion',
			title: 'Ofertas Flash',
		});
	} else {
		categories.push({
			href: '/productos',
			image: {
				src: resolveHomeImage('PUBLIC_HOME_CAT_COLLECTION_URL', '/cat-collection.jpg'),
				alt: 'Coleccion',
				fallbackColor: '#9ca3af',
			},
			subtitle: 'Categoria',
			title: 'Coleccion',
		});
	}

	return categories;
};
