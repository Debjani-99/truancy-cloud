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
              <li className="hover:text-white cursor-pointer">
                Help Guides
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="mb-3 text-sm font-semibold uppercase text-white/80">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="hover:text-white cursor-pointer">
                Privacy Policy
              </li>
              <li className="hover:text-white cursor-pointer">
                Terms & Conditions
              </li>
              <li className="hover:text-white cursor-pointer">
                Data Retention Policy
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="mb-3 text-sm font-semibold uppercase text-white/80">
              Company
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="hover:text-white cursor-pointer">About</li>
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