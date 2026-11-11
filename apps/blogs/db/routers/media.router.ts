import { Elysia } from "elysia";
import { HttpError } from "../services/http-error.service";
import type { MediaService } from "../services/media.service";
import type { UserRow } from "../services/me.service";

export function createMediaRouter(deps: {
	service: MediaService;
	requireUser: () => Promise<UserRow>;
}) {
	return new Elysia({ name: "media" })
		.get("/api/media/*", async ({ params }) => {
			try {
				return await deps.service.getObject(String(params["*"]));
			} catch (error) {
				if (error instanceof HttpError) throw error;
				console.error("[media] GET failed", error);
				const message =
					error instanceof Error ? error.message : "Failed to load media";
				throw new HttpError(500, { error: message });
			}
		})
		.post("/api/admin/uploads", async ({ request }) => {
			try {
				const user = await deps.requireUser();
				const form = await request.formData();
				const file = form.get("file");
				if (!(file instanceof File)) {
					throw new HttpError(400, { error: "file is required" });
				}
				return await deps.service.upload(user, file);
			} catch (error) {
				if (error instanceof HttpError) throw error;
				console.error("[uploads] POST failed", error);
				const message =
					error instanceof Error ? error.message : "Upload failed";
				throw new HttpError(500, { error: message });
			}
		})
		.delete("/api/admin/uploads", async ({ request }) => {
			try {
				const user = await deps.requireUser();
				const body = (await request.json()) as { url?: string; key?: string };
				return await deps.service.remove(user, body);
			} catch (error) {
				if (error instanceof HttpError) throw error;
				console.error("[uploads] DELETE failed", error);
				const message =
					error instanceof Error ? error.message : "Delete failed";
				throw new HttpError(500, { error: message });
			}
		});
}
