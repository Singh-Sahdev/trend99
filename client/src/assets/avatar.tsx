import { ComponentPropsWithoutRef } from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "../utils/tailwind"

const Avatar = ({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = ({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = ({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
