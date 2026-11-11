import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../utils/tailwind";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & { ref?: React.Ref<any> }) => {
  const { className, ...rest } = props;
  return (
    <ToastPrimitives.Viewport
      {...rest}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
    />
  );
};

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants> & { ref?: React.Ref<any> }) => {
  const { className, variant, ...rest } = props;
  return (
    <ToastPrimitives.Root
      {...rest}
      className={cn(toastVariants({ variant }), className)}
    />
  );
};

const ToastAction = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action> & { ref?: React.Ref<any> }) => {
  const { className, ...rest } = props;
  return (
    <ToastPrimitives.Action
      {...rest}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className
      )}
    />
  );
};

const ToastClose = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close> & { ref?: React.Ref<any> }) => {
  const { className, ...rest } = props;
  return (
    <ToastPrimitives.Close
      {...rest}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
        className
      )}
      toast-close=""
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  );
};

const ToastTitle = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title> & { ref?: React.Ref<any> }) => {
  const { className, ...rest } = props;
  return (
    <ToastPrimitives.Title
      {...rest}
      className={cn("text-sm font-semibold", className)}
    />
  );
};

const ToastDescription = (props: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description> & { ref?: React.Ref<any> }) => {
  const { className, ...rest } = props;
  return (
    <ToastPrimitives.Description
      {...rest}
      className={cn("text-sm opacity-90", className)}
    />
  );
};

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
