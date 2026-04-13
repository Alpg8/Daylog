const LAN_DEV_HOST = "192.168.68.114";

function resolveApiBaseUrl() {
	if (process.env.EXPO_PUBLIC_API_BASE_URL) {
		return process.env.EXPO_PUBLIC_API_BASE_URL;
	}

	if (typeof window !== "undefined") {
		const host = window.location.hostname;
		return `http://${host}:3000`;
	}

	return `http://${LAN_DEV_HOST}:3000`;
}

export const API_BASE_URL = resolveApiBaseUrl();
