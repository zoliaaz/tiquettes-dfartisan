// DF artisan : version simple de « sanitize-filename » (caractères interdits dans un nom de fichier retirés)
export default function sanitizeFilename(nom, options = {}) {
	const r = options.replacement ?? "";
	return String(nom)
		.replace(/[/?<>\\:*|"\u0000-\u001f\u0080-\u009f]/g, r)
		.replace(/^\.+$/, r)
		.replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, r)
		.replace(/[. ]+$/, r)
		.slice(0, 255);
}
