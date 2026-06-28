import tencentLogo from "@/assets/tencent-logo.svg";

export function PoweredByFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/50">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-6 py-4 text-xs text-muted-foreground">
        <span>Powered by</span>
        <img src={tencentLogo} alt="Tencent" className="h-4 w-auto" />
      </div>
    </footer>
  );
}
