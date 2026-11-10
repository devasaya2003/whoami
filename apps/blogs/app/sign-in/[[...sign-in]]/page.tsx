import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<main className="flex min-h-[70dvh] items-center justify-center p-6">
			<SignIn />
		</main>
	);
}
