import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-black">
      <div className="max-w-6xl mx-auto px-6 ">
        <div className="border-x border-border px-8 py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-lora text-2xl font-semibold text-white">
            Credence
          </span>
          <span className="text-white/25">·</span>
          <span className="text-xs text-white/25">
            Agentic Credit Assessment for Micro SMEs
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-white/25">
          <span>Built on Claude</span>
          <span className="text-white/10">|</span>
          <Link href="/dashboard" className="hover:text-white/60 transition-colors">
            Dashboard
          </Link>
          <Link href="/new" className="hover:text-white/60 transition-colors">
            Chat
          </Link>
        </div>

        <p className="text-xs text-white/25">
          © 2026 Credence · Design inspired by{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/60 transition-colors underline underline-offset-2"
          >
            Vercel
          </a>
        </p>
      </div>
          </div>
    </footer>
  );
}
