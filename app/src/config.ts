import Constants from "expo-constants";

const LAN_DEV_HOST = "127.0.0.1";
const DEFAULT_API_PORT = "3001";

function getExpoHost(): string | null {
	const expoHostUri =
		(Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
		((Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri ?? null);

	if (!expoHostUri) return null;
	return expoHostUri.split(":")[0] ?? null;
}

function resolveApiBaseUrl() {
	if (process.env.EXPO_PUBLIC_API_BASE_URL) {
		return process.env.EXPO_PUBLIC_API_BASE_URL;
	}

	const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? DEFAULT_API_PORT;

	if (typeof window !== "undefined") {
		const host = (window as { location?: { hostname?: string } }).location?.hostname;
		if (host) {
			return `http://${host}:${apiPort}`;
		}
	}

	const expoHost = getExpoHost();
	if (expoHost) {
		return `http://${expoHost}:${apiPort}`;
	}

	return `http://${LAN_DEV_HOST}:${apiPort}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
