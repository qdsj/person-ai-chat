export function getCookieValue(cookieHeader: string | undefined, name: string) {
	if (!cookieHeader) {
		return null;
	}

	const parts = cookieHeader.split(";").map((part) => part.trim());
	const target = `${name}=`;

	for (const part of parts) {
		if (part.startsWith(target)) {
			return decodeURIComponent(part.slice(target.length));
		}
	}

	return null;
}
