// The big card at the top of the venue and vendor pages: a headline with the editable place, two buttons, and a
// photo from the listings on the right.
export function MarketHero({ title, photo, primaryLabel, onPrimary, onQuiz }: {
  title: React.ReactNode; photo?: string; primaryLabel: string; onPrimary: () => void; onQuiz: () => void;
}) {
  return (
    <section className="relative z-10 mt-6 grid rounded-3xl bg-[#FFF7D6] md:grid-cols-2">
      <div className="flex flex-col justify-center gap-7 px-8 py-10 md:px-12 md:py-14">
        <h1 className="font-serif text-4xl leading-tight text-[#243746] md:text-5xl">{title}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onPrimary} data-static
            className="rounded-full bg-[#243746] px-8 py-3 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFE08A] hover:text-[#243746]">{primaryLabel}</button>
          <button type="button" onClick={onQuiz} data-static
            className="rounded-full border border-[#243746] px-8 py-3 text-sm font-medium text-[#243746] transition-colors hover:bg-[#FFE08A]">Take our quiz</button>
        </div>
      </div>
      <div className="relative hidden min-h-[300px] overflow-hidden rounded-r-3xl bg-[#FFE08A]/40 md:block">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
    </section>
  );
}

// One tall photo tile with a label pill, for the "explore by style / by type" rows.
export function MarketTile({ label, photo, onClick }: { label: string; photo?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} data-static className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#FFF7D6] text-left">
      {photo && <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      <span className="absolute inset-x-0 bottom-4 flex justify-center">
        <span className="rounded-full bg-paper px-4 py-2 text-sm font-medium text-[#243746] shadow-sm">{label}</span>
      </span>
    </button>
  );
}
