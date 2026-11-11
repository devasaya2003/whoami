"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

function TooltipProvider({ ...props }: TooltipPrimitive.Provider.Props) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />;
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	sideOffset = 6,
	side = "top",
	align = "center",
	children,
	...props
}: TooltipPrimitive.Popup.Props & {
	sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
	side?: TooltipPrimitive.Positioner.Props["side"];
	align?: TooltipPrimitive.Positioner.Props["align"];
}) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				className="z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"z-50 w-fit max-w-xs rounded-md bg-foreground px-2.5 py-1 text-background text-xs shadow-md",
						"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
						"data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
						className,
					)}
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
