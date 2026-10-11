export default function AppFooter({ dark = false }) {
  return (
    <footer className={`px-4 py-6 text-center text-sm font-semibold ${dark ? 'bg-slate-900 text-slate-400' : 'text-slate-500'}`}>
      PaisaPath · Powered by Vanguard
    </footer>
  );
}
