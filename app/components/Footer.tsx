import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-10 bg-black/60 backdrop-blur-md text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-12 text-center md:grid-cols-3">

          <div className="flex flex-col items-center">
            <h3 className="mb-3 text-sm font-semibold uppercase text-white/80">
              Resources
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link
                  href="/docs/Resource-Guide.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer hover:text-white hover:underline"
                >
                  Resource Guide
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="mb-3 text-sm font-semibold uppercase text-white/80">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link
                href="/docs/privacy-policy.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer hover:text-white hover:underline"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                href="/docs/terms.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer hover:text-white hover:underline"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li className="hover:text-white cursor-pointer hover:underline">
                Data Retention Policy
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="mb-3 text-sm font-semibold uppercase text-white/80">
              Company
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link
                href="/docs/about.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer hover:text-white hover:underline"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-10 border-t border-white/10 pt-4 text-center text-xs text-white/60">
          &copy; {new Date().getFullYear()} Truancy Cloud • Internal use only
        </div>

      </div>
    </footer>
  );
}