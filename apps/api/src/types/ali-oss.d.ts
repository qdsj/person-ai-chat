declare module "ali-oss" {
	type OssOptions = {
		accessKeyId: string;
		accessKeySecret: string;
		bucket?: string;
		region?: string;
		stsToken?: string;
		secure?: boolean;
		authorizationV4?: boolean;
	};

	type StsOptions = {
		accessKeyId: string;
		accessKeySecret: string;
	};

	type StsCredentials = {
		AccessKeyId: string;
		AccessKeySecret: string;
		SecurityToken: string;
		Expiration: string;
	};

	class OSS {
		constructor(options: OssOptions);

		options: Required<Pick<OssOptions, "accessKeyId" | "accessKeySecret" | "bucket" | "region">> &
			Pick<OssOptions, "stsToken">;

		signPostObjectPolicyV4(policy: object | string, date: Date): string;

		static STS: new (options: StsOptions) => {
			assumeRole(
				roleArn: string,
				policy?: object | string,
				expirationSeconds?: number,
				session?: string,
			): Promise<{ credentials: StsCredentials }>;
		};
	}

	export = OSS;
}
