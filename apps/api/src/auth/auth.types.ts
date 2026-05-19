export type AuthTokenPayload = {
	sub: number;
	email: string;
};

export type AuthenticatedUser = {
	id: number;
	email: string;
	name: string | null;
};
