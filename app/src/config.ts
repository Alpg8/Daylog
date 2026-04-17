import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://daylogoperasyon.com";

function resolveApiBaseUrl() {
	// Dev override: only accept localhost/127.0.0.1 to avoid accidentally using wrong domain
	const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
	if (envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
		return envUrl;
	}

	// Always use production server
	return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
