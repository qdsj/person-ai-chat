import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
	env: {
		OSS_REVIEW_HOST: "https://dev.qdsj.top/aliyun/oss/person-site",
		NEXT_PUBLIC_API_BASE_URL: isDev ? "http://localhost:3001" : "",
	},
	output: "standalone",
};

export default nextConfig;
