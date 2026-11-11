import { HttpError } from "../schema/http-error";

export { HttpError };

/** Thin factory so rule 2 has a service module paired with HttpError. */
export function createHttpErrorService() {
	return {
		badRequest(message: string): never {
			throw new HttpError(400, { error: message });
		},
		unauthorized(message = "Unauthorized"): never {
			throw new HttpError(401, { error: message });
		},
		forbidden(message: string): never {
			throw new HttpError(403, { error: message });
		},
		notFound(message: string): never {
			throw new HttpError(404, { error: message });
		},
		internal(message: string): never {
			throw new HttpError(500, { error: message });
		},
	};
}

export type HttpErrorService = ReturnType<typeof createHttpErrorService>;
