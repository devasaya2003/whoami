import { expect, it } from "vitest";
import {
	createWorkerElysiaService,
	workerElysiaOptions,
} from "./worker-elysia.service";

it("returns worker-safe elysia options", () => {
	const opts = workerElysiaOptions("demo");
	expect(opts.name).toBe("demo");
	expect(opts.aot).toBe(false);
	expect(opts.adapter).toBeTruthy();
	expect(createWorkerElysiaService().workerElysiaOptions("x").aot).toBe(false);
});
