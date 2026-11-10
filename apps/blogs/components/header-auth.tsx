"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";

export function HeaderAuth() {
	return (
		<SignedIn>
			<UserButton afterSignOutUrl="/sign-in" />
		</SignedIn>
	);
}
