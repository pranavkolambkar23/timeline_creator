export default function HistoricalDateBadges({ isApproximate, datePrecision, className = "" }: {
    isApproximate?: boolean | null;
    datePrecision?: string | null;
    className?: string;
}) {
    if (!isApproximate && datePrecision !== "century") return null;

    return (
        <span className={`flex flex-wrap gap-1.5 ${className}`}>
            {isApproximate && (
                <span title="The exact historical date is uncertain." className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-500">
                    Approximate date
                </span>
            )}
            {datePrecision === "century" && (
                <span title="A more precise date is not available or is not needed." className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-sky-500">
                    Century-level date
                </span>
            )}
        </span>
    );
}
