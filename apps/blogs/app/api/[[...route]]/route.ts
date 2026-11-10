import { handle } from "../../../lib/server";

const methods = {
	GET: handle,
	POST: handle,
	PUT: handle,
	PATCH: handle,
	DELETE: handle,
	OPTIONS: handle,
};

export const GET = methods.GET;
export const POST = methods.POST;
export const PUT = methods.PUT;
export const PATCH = methods.PATCH;
export const DELETE = methods.DELETE;
export const OPTIONS = methods.OPTIONS;
