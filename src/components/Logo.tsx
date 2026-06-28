import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-10 w-10 shrink-0"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" className="fill-primary" />
        <path
          d="M10 28V12h4.2l5.8 9.2V12H24v16h-4.2l-5.8-9.2V28H10z"
          className="fill-primary-foreground"
        />
        <circle cx="30" cy="14" r="3" className="fill-accent" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg font-medium text-foreground">Pathway Advisory</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          DIY Academy
        </span>
      </div>
    </Link>
  );
}
