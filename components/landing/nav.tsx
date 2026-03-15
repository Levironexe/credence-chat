"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50  ${
        scrolled
          ? "bg-black/80 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto ">
      <div className="px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/landing" className="flex items-center gap-2">
          <span className="font-lora text-lg font-semibold text-white tracking-tight">
            Credence
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6">
          {["Features", "How it works", "Compare"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/new"
          className="text-sm px-4 py-1.5 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors duration-200"
        >
          Get Started
        </Link>
      </div>
      </div>
    </header>
  );
}
