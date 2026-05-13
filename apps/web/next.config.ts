import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	env: {
		OSS_REVIEW_HOST: "https://dev.qdsj.top/aliyun/oss/person-site",
		NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
	},
};

export default nextConfig;
