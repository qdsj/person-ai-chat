import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OSS = require("ali-oss");

type SignatureHelpers = {
	getCredential: (date: string, region: string, accessKeyId: string) => string;
};

type RegionHelpers = {
	getStandardRegion: (region: string) => string;
};

type PolicyHelpers = {
	policy2Str: (policy: object | string) => string;
};

type OssClientWithV4 = OSS & {
	options: {
		accessKeyId: string;
		accessKeySecret: string;
		bucket: string;
		region: string;
		stsToken?: string;
	};
	signPostObjectPolicyV4: (policy: object | string, date: Date) => string;
};

type StsCredentials = {
	AccessKeyId: string;
	AccessKeySecret: string;
	SecurityToken: string;
	Expiration: string;
};

type StsResult = {
	credentials: StsCredentials;
};

type StsClient = {
	assumeRole: (
		roleArn: string,
		policy?: object | string,
		expirationSeconds?: number,
		session?: string,
	) => Promise<StsResult>;
};

export type OssPostSignature = {
	host: string;
	dir: string;
	expire: number;
	policy: string;
	signature: string;
	x_oss_credential: string;
	x_oss_date: string;
	x_oss_signature_version: "OSS4-HMAC-SHA256";
	security_token: string;
};

const { getCredential } = require("ali-oss/lib/common/signUtils") as SignatureHelpers;
const { getStandardRegion } = require("ali-oss/lib/common/utils/getStandardRegion") as RegionHelpers;
const { policy2Str } = require("ali-oss/lib/common/utils/policy2Str") as PolicyHelpers;

@Injectable()
export class OssService {
	constructor(private readonly configService: ConfigService) {}

	async getTempSignature(): Promise<OssPostSignature> {
		const bucket = this.getRequiredConfig("BUCKET_NAME");
		const region = this.normalizeOssRegion(this.configService.get<string>("OSS_REGION") || "oss-cn-shanghai");
		const uploadDir = this.normalizeDir(this.configService.get<string>("OSS_UPLOAD_DIR") || "uploads/");
		const expireSeconds = Number(this.configService.get<string>("OSS_POST_EXPIRE_SECONDS") || 600);
		const stsDurationSeconds = Number(this.configService.get<string>("OSS_STS_DURATION_SECONDS") || 3600);
		const credentials = await this.assumeUploadRole(bucket, uploadDir, stsDurationSeconds);

		const client = new OSS({
			bucket,
			region,
			accessKeyId: credentials.AccessKeyId,
			accessKeySecret: credentials.AccessKeySecret,
			stsToken: credentials.SecurityToken,
			secure: true,
			authorizationV4: true,
		}) as OssClientWithV4;

		const signedAt = new Date();
		const expiresAt = new Date(signedAt.getTime() + expireSeconds * 1000);
		const xOssDate = this.formatDateToUTC(signedAt);
		const credential = getCredential(
			xOssDate.slice(0, 8),
			getStandardRegion(client.options.region),
			client.options.accessKeyId,
		);
		const policy = {
			expiration: expiresAt.toISOString(),
			conditions: [
				{ bucket },
				["starts-with", "$key", uploadDir],
				["content-length-range", 0, Number(this.configService.get<string>("OSS_MAX_FILE_SIZE") || 104857600)],
				{ "x-oss-credential": credential },
				{ "x-oss-signature-version": "OSS4-HMAC-SHA256" },
				{ "x-oss-date": xOssDate },
				{ "x-oss-security-token": credentials.SecurityToken },
			],
		};
		const policyBase64 = Buffer.from(policy2Str(policy), "utf8").toString("base64");

		return {
			host: `https://${bucket}.${region}.aliyuncs.com`,
			dir: uploadDir,
			expire: Math.floor(expiresAt.getTime() / 1000),
			policy: policyBase64,
			signature: client.signPostObjectPolicyV4(policy, signedAt),
			x_oss_credential: credential,
			x_oss_date: xOssDate,
			x_oss_signature_version: "OSS4-HMAC-SHA256",
			security_token: credentials.SecurityToken,
		};
	}

	GenerateSignature() {
		return this.getTempSignature();
	}

	private async assumeUploadRole(bucket: string, uploadDir: string, durationSeconds: number): Promise<StsCredentials> {
		const roleArn = this.getRequiredConfig("OSS_STS_ROLE_ARN");
		const stsClient = new OSS.STS({
			accessKeyId: this.getRequiredConfig("OSS_ACCESS_KEY"),
			accessKeySecret: this.getRequiredConfig("OSS_ACCESS_KEY_SECRET"),
		}) as StsClient;
		const policy = {
			Version: "1",
			Statement: [
				{
					Effect: "Allow",
					Action: ["oss:PutObject"],
					Resource: [`acs:oss:*:*:${bucket}/${uploadDir}*`],
				},
			],
		};
		const result = await stsClient.assumeRole(roleArn, policy, durationSeconds, "person-ai-chat-upload");

		return result.credentials;
	}

	private getRequiredConfig(key: string) {
		const value = this.configService.get<string>(key);

		if (!value) {
			throw new InternalServerErrorException(`${key} 未配置。`);
		}

		return value;
	}

	private normalizeDir(dir: string) {
		const trimmedDir = dir.trim().replace(/^\/+/, "");
		return trimmedDir.endsWith("/") ? trimmedDir : `${trimmedDir}/`;
	}

	private normalizeOssRegion(region: string) {
		const normalized = region.trim();

		if (normalized.startsWith("oss-")) {
			return normalized;
		}

		if (normalized.startsWith("cn-") || normalized.includes("-")) {
			return `oss-${normalized}`;
		}

		return `oss-cn-${normalized}`;
	}

	private formatDateToUTC(date: Date) {
		const padTo2Digits = (num: number) => num.toString().padStart(2, "0");

		return (
			date.getUTCFullYear() +
			padTo2Digits(date.getUTCMonth() + 1) +
			padTo2Digits(date.getUTCDate()) +
			"T" +
			padTo2Digits(date.getUTCHours()) +
			padTo2Digits(date.getUTCMinutes()) +
			padTo2Digits(date.getUTCSeconds()) +
			"Z"
		);
	}
}
