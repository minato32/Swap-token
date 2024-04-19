"use client";

export function Footer() {
  const sections = [
    {
      title: "Protocol",
      links: ["Governance", "Developers", "Bridge Docs"],
    },
    {
      title: "Company",
      links: ["About", "Blog", "Careers"],
    },
    {
      title: "Resources",
      links: ["Help Center", "Security Audit", "Brand Assets"],
    },
    {
      title: "Community",
      links: ["Discord", "Twitter", "GitHub"],
    },
  ];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-heading font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              CrossChain
            </span>
            <p className="mt-3 text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-[200px]">
              Swap tokens seamlessly across multiple blockchains with industry-leading security.
            </p>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-heading font-semibold text-sm text-[var(--color-text-primary)] mb-3">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <span className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            &copy; 2024 CrossChain Swap System. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
