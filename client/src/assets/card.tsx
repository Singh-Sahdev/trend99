import { cn } from "../utils/tailwind";
import { HTMLAttributes, HtmlHTMLAttributes } from "react";

// Types
interface CardProps extends HTMLAttributes<HTMLDivElement> {}
interface CardDesProps extends HtmlHTMLAttributes<HTMLParagraphElement> {}
interface CardParaProps extends HtmlHTMLAttributes<HTMLHeadingElement>{}

// Card
export const Card = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn("bg-card text-card-foreground rounded-lg", className)} {...props} />
  );
};
Card.displayName = "Card";

// CardHeader
export const CardHeader = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  );
};
CardHeader.displayName = "CardHeader";

// CardDescription
export const CardDescription = ({ className, ...props }: CardDesProps) => {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
};
CardDescription.displayName = "CardDescription";

// CardContent
export const CardContent = ({ className,  ...props }: CardProps) => {
  return (
    <div className={cn("p-6 pt-0", className)} {...props} />
  );
};
CardContent.displayName = "CardContent";

// CardFooter
export const CardFooter = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  );
};
CardFooter.displayName = "CardFooter";


export const CardTitle = ({ className, ...props } : CardParaProps) => {
  return(
    <h1 className={cn( "text-2xl font-semibold leading-none tracking-tight" , className)}
    {...props}
    />
  )
};

CardTitle.displayName = "CardTitle"
