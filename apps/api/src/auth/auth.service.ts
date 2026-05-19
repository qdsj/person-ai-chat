import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { User } from "./entities/user.entity";
import type { AuthenticatedUser, AuthTokenPayload } from "./auth.types";

type AuthInput = {
	email: string;
	password: string;
	name?: string;
};

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly jwtService: JwtService,
	) {}

	async register(input: AuthInput) {
		const email = this.normalizeEmail(input.email);
		const existingUser = await this.userRepository.findOne({
			where: { email },
		});

		if (existingUser) {
			throw new ConflictException("该邮箱已注册，请直接登录。");
		}

		const user = await this.userRepository.save(
			this.userRepository.create({
				email,
				name: input.name?.trim() || null,
				passwordHash: this.hashPassword(input.password),
			}),
		);

		return {
			user: this.toAuthenticatedUser(user),
			token: await this.createToken(user),
		};
	}

	async login(input: AuthInput) {
		const email = this.normalizeEmail(input.email);
		const user = await this.userRepository.findOne({
			where: { email },
		});

		if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
			throw new UnauthorizedException("邮箱或密码错误。");
		}

		return {
			user: this.toAuthenticatedUser(user),
			token: await this.createToken(user),
		};
	}

	async findAuthenticatedUserById(id: number) {
		const user = await this.userRepository.findOne({
			where: { id },
		});

		if (!user) {
			return null;
		}

		return this.toAuthenticatedUser(user);
	}

	async verifyToken(token: string) {
		const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
		return this.findAuthenticatedUserById(payload.sub);
	}

	private normalizeEmail(email: string) {
		return email.trim().toLowerCase();
	}

	private async createToken(user: User) {
		return this.jwtService.signAsync({
			sub: user.id,
			email: user.email,
		} satisfies AuthTokenPayload);
	}

	private toAuthenticatedUser(user: User): AuthenticatedUser {
		return {
			id: user.id,
			email: user.email,
			name: user.name,
		};
	}

	private hashPassword(password: string) {
		const salt = randomBytes(16).toString("hex");
		const hash = scryptSync(password, salt, 64).toString("hex");
		return `${salt}:${hash}`;
	}

	private verifyPassword(password: string, storedHash: string) {
		const [salt, originalHash] = storedHash.split(":");
		if (!salt || !originalHash) {
			return false;
		}

		const hashBuffer = Buffer.from(originalHash, "hex");
		const candidateHash = scryptSync(password, salt, 64);

		if (candidateHash.length !== hashBuffer.length) {
			return false;
		}

		return timingSafeEqual(hashBuffer, candidateHash);
	}
}
