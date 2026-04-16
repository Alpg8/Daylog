import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://daylogoperasyon.com";

function resolveApiBaseUrl() {
	// Explicit override via env var (e.g. local dev)
	if (process.env.EXPO_PUBLIC_API_BASE_URL) {
		return process.env.EXPO_PUBLIC_API_BASE_URL;
	}

	// Always use production server
	return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
