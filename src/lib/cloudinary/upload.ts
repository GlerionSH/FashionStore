export type CloudinaryUploadResult = {
	secure_url: string;
	public_id: string;
};

export type CloudinaryUploadError = {
	message: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadImage(
	file: File,
	folder = 'fashionstore/products'
): Promise<CloudinaryUploadResult> {
	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`El archivo excede el límite de 5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
	}

	// Validate file type
	if (!ALLOWED_TYPES.includes(file.type)) {
		throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo jpg, png, webp.`);
	}

	// 1. Get signature from backend
	const signRes = await fetch('/api/cloudinary/sign', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ folder }),
	});

	if (!signRes.ok) {
		const err = await signRes.json().catch(() => ({}));
		throw new Error(err?.error || 'Error obteniendo firma de Cloudinary');
	}

	const { timestamp, signature, apiKey, cloudName } = await signRes.json();

	if (!timestamp || !signature || !apiKey || !cloudName) {
		throw new Error('Respuesta de firma incompleta');
	}

	// 2. Upload directly to Cloudinary
	const formData = new FormData();
	formData.append('file', file);
	formData.append('api_key', apiKey);
	formData.append('timestamp', String(timestamp));
	formData.append('signature', signature);
	formData.append('folder', folder);

	const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

	const uploadRes = await fetch(uploadUrl, {
		method: 'POST',
		body: formData,
	});

	if (!uploadRes.ok) {
		const errData = await uploadRes.json().catch(() => ({}));
		const errMsg = errData?.error?.message || 'Error subiendo imagen a Cloudinary';
		throw new Error(errMsg);
	}

	const data = await uploadRes.json();

	if (!data.secure_url || !data.public_id) {
		throw new Error('Respuesta de Cloudinary incompleta');
	}

	return {
		secure_url: data.secure_url,
		public_id: data.public_id,
	};
}

export async function uploadImages(
	files: File[],
	folder = 'fashionstore/products',
	onProgress?: (uploaded: number, total: number) => void
): Promise<CloudinaryUploadResult[]> {
	const results: CloudinaryUploadResult[] = [];
	let uploaded = 0;

	for (const file of files) {
		const result = await uploadImage(file, folder);
		results.push(result);
		uploaded++;
		onProgress?.(uploaded, files.length);
	}

	return results;
}
