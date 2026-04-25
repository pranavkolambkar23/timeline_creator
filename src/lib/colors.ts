export const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
        history: "bg-amber-100 text-amber-700 border-amber-200",
        technology: "bg-blue-100 text-blue-700 border-blue-200",
        science: "bg-emerald-100 text-emerald-700 border-emerald-200",
        art: "bg-rose-100 text-rose-700 border-rose-200",
        sports: "bg-orange-100 text-orange-700 border-orange-200",
        general: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return map[category.toLowerCase()] || map.general;
};
