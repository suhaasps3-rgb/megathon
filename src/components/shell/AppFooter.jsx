export default function AppFooter({ dark = false }) {
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-6 text-sm font-semibold ${dark ? 'bg-slate-900 text-slate-400' : 'text-slate-500'}`}>
      <span>PaisaPath · Powered by Vanguard</span>
      <img src="/vanguard-logo.png" alt="Vanguard" className={`h-5 w-auto ${dark ? 'rounded bg-white px-1.5 py-0.5' : ''}`} />
    </footer>
  );
}
