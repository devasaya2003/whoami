import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HttpError } from "../services/http-error.service";
import type { MediaService } from "../services/media.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

const uploadForm = z.object({
	file: z.custom<File>((value) => value instanceof File).optional(),
});

const deleteBody = z.object({
	url: z.string().optional(),
	key: z.string().optional(),
});

export function createMediaRouter(deps: {
	service: MediaService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerHono("media")
		.get("/api/media/*", async (c) => {
			try {
				const key = c.req.path.replace(/^\/api\/media\//, "");
				const res = await deps.service.getObject(key);
				return new Response(res.body, {
					status: res.status,
					headers: res.headers,
				});
			} catch (error) {
				if (error instanceof HttpError) throw error;
				console.error("[media] GET failed", error);
				const message =
					error instanceof Error ? error.message : "Failed to load media";
				throw new HttpError(500, { error: message });
			}
		})
		.post(
			"/api/admin/uploads",
			zValidator("form", uploadForm),
			async (c) => {
				try {
					const user = await deps.requireUser();
					const file = c.req.valid("form").file;
					if (!(file instanceof File)) {
						throw new HttpError(400, { error: "file is required" });
					}
					return c.json(await deps.service.upload(user, file));
				} catch (error) {
					if (error instanceof HttpError) throw error;
					console.error("[uploads] POST failed", error);
					const message =
						error instanceof Error ? error.message : "Upload failed";
					throw new HttpError(500, { error: message });
				}
			},
		)
		.delete(
			"/api/admin/uploads",
			zValidator("json", deleteBody),
			async (c) => {
				try {
					const user = await deps.requireUser();
					return c.json(await deps.service.remove(user, c.req.valid("json")));
				} catch (error) {
					if (error instanceof HttpError) throw error;
					console.error("[uploads] DELETE failed", error);
					const message =
						error instanceof Error ? error.message : "Delete failed";
					throw new HttpError(500, { error: message });
				}
			},
		);
}
