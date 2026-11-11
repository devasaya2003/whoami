import { expect, it } from "vitest";
import { createHttpErrorService, HttpError } from "./http-error.service";

const errors = createHttpErrorService();

it("throws typed http errors", () => {
	expect(() => errors.badRequest("bad")).toThrow(HttpError);
	expect(() => errors.unauthorized()).toThrow(HttpError);
	expect(() => errors.forbidden("no")).toThrow(HttpError);
	expect(() => errors.notFound("gone")).toThrow(HttpError);
	expect(() => errors.internal("boom")).toThrow(HttpError);
	try {
		errors.badRequest("x");
	} catch (error) {
		expect(error).toMatchObject({ status: 400, body: { error: "x" } });
	}
});
