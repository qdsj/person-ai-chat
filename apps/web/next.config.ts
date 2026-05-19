import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
	env: {
		OSS_REVIEW_HOST: "https://dev.qdsj.top/aliyun/oss/person-site",
		BASE_URL: isDev ? "/api" : "/api/api",
	},
	output: "standalone",
	async rewrites() {
		if (process.env.NODE_ENV !== "development") {
			return [];
		}

		return [
			{
				source: "/api/:path*",
				destination: "http://localhost:3001/api/:path*",
			},
		];
	},
};

export default nextConfig;
