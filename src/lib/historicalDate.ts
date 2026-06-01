export type HistoricalDatePrecision = "exact" | "month" | "year" | "century";

export type ParsedHistoricalDate = {
    input: string;
    displayDate: string;
    historicalYear: number;
    historicalMonth: number | null;
    historicalDay: number | null;
    datePrecision: HistoricalDatePrecision;
    isApproximate: boolean;
    legacyDate: Date | null;
};

type StoredHistoricalDate = {
    date?: string | Date | null;
    displayDate?: string | null;
    historicalYear?: number | null;
    historicalMonth?: number | null;
    historicalDay?: number | null;
    datePrecision?: string | null;
    isApproximate?: boolean | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isValidCalendarDate(year: number, month: number, day: number) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year >= 0 && year < 100) date.setUTCFullYear(year);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function createLegacyDate(year: number, month = 1, day = 1) {
    if (year < 1 || year > 9999 || !isValidCalendarDate(year, month, day)) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year < 100) date.setUTCFullYear(year);
    return date;
}

function eraYear(year: number, era?: string) {
    return era?.toUpperCase() === "BCE" ? -year : year;
}

export function parseHistoricalDate(value: unknown): ParsedHistoricalDate | null {
    const input = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!input) return null;

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (iso) {
        const year = Number(iso[1]);
        const month = Number(iso[2]);
        const day = Number(iso[3]);
        if (!isValidCalendarDate(year, month, day)) return null;
        return {
            input,
            displayDate: `${day} ${MONTHS[month - 1]} ${year}`,
            historicalYear: year,
            historicalMonth: month,
            historicalDay: day,
            datePrecision: "exact",
            isApproximate: false,
            legacyDate: createLegacyDate(year, month, day),
        };
    }

    const numericExact = /^(c\.?|circa)?\s*(\d{1,2})-(\d{1,2})-(\d+)\s*(BCE|CE)?$/i.exec(input);
    if (numericExact) {
        const approximate = Boolean(numericExact[1]);
        const day = Number(numericExact[2]);
        const month = Number(numericExact[3]);
        const year = eraYear(Number(numericExact[4]), numericExact[5]);
        if (!isValidCalendarDate(year, month, day)) return null;
        return {
            input,
            displayDate: `${approximate ? "c. " : ""}${day} ${MONTHS[month - 1]} ${Math.abs(year)}${year < 0 ? " BCE" : ""}`,
            historicalYear: year,
            historicalMonth: month,
            historicalDay: day,
            datePrecision: "exact",
            isApproximate: approximate,
            legacyDate: createLegacyDate(year, month, day),
        };
    }

    const exact = /^(c\.?|circa)?\s*(\d{1,2})[ -]([A-Za-z]{3,9})[ ,]+(\d+)\s*(BCE|CE)?$/i.exec(input);
    if (exact) {
        const approximate = Boolean(exact[1]);
        const month = MONTHS.findIndex((name) => exact[3].toLowerCase().startsWith(name.toLowerCase())) + 1;
        const day = Number(exact[2]);
        const year = eraYear(Number(exact[4]), exact[5]);
        if (!month || !isValidCalendarDate(year, month, day)) return null;
        return {
            input,
            displayDate: `${approximate ? "c. " : ""}${day} ${MONTHS[month - 1]} ${Math.abs(year)}${year < 0 ? " BCE" : ""}`,
            historicalYear: year,
            historicalMonth: month,
            historicalDay: day,
            datePrecision: "exact",
            isApproximate: approximate,
            legacyDate: createLegacyDate(year, month, day),
        };
    }

    const monthYear = /^(c\.?|circa)?\s*(?:(\d{1,2})|([A-Za-z]{3,9}))[- ](\d+)\s*(BCE|CE)?$/i.exec(input);
    if (monthYear) {
        const month = monthYear[2]
            ? Number(monthYear[2])
            : MONTHS.findIndex((name) => monthYear[3].toLowerCase().startsWith(name.toLowerCase())) + 1;
        const year = eraYear(Number(monthYear[4]), monthYear[5]);
        const approximate = Boolean(monthYear[1]);
        if (month < 1 || month > 12 || !year) return null;
        return {
            input,
            displayDate: `${approximate ? "c. " : ""}${MONTHS[month - 1]} ${Math.abs(year)}${year < 0 ? " BCE" : ""}`,
            historicalYear: year,
            historicalMonth: month,
            historicalDay: null,
            datePrecision: "month",
            isApproximate: approximate,
            legacyDate: createLegacyDate(year, month),
        };
    }

    const century = /^(c\.?|circa)?\s*(\d+)(?:st|nd|rd|th)\s+century\s*(BCE|CE)$/i.exec(input);
    if (century) {
        const approximate = Boolean(century[1]);
        const number = Number(century[2]);
        if (!number) return null;
        const isBce = century[3].toUpperCase() === "BCE";
        return {
            input,
            displayDate: `${approximate ? "c. " : ""}${number}${ordinalSuffix(number)} century${isBce ? " BCE" : ""}`,
            historicalYear: isBce ? -(number * 100) : ((number - 1) * 100) + 1,
            historicalMonth: null,
            historicalDay: null,
            datePrecision: "century",
            isApproximate: approximate,
            legacyDate: null,
        };
    }

    const yearOnly = /^(c\.?|circa)?\s*(\d+)\s*(BCE|CE)?$/i.exec(input);
    if (yearOnly) {
        const approximate = Boolean(yearOnly[1]);
        const year = eraYear(Number(yearOnly[2]), yearOnly[3]);
        if (!year) return null;
        return {
            input,
            displayDate: `${approximate ? "c. " : ""}${Math.abs(year)}${year < 0 ? " BCE" : ""}`,
            historicalYear: year,
            historicalMonth: null,
            historicalDay: null,
            datePrecision: "year",
            isApproximate: approximate,
            legacyDate: createLegacyDate(year),
        };
    }

    return null;
}

function ordinalSuffix(number: number) {
    const mod100 = number % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    if (number % 10 === 1) return "st";
    if (number % 10 === 2) return "nd";
    if (number % 10 === 3) return "rd";
    return "th";
}

export function isValidHistoricalDate(value: unknown) {
    return parseHistoricalDate(value) !== null;
}

export function parseImportedHistoricalDate(value: unknown) {
    if (typeof value === "number") {
        if (Number.isInteger(value) && value >= 1 && value <= 9999) {
            return parseHistoricalDate(String(value));
        }
        const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
        return Number.isNaN(excelDate.getTime())
            ? null
            : parseHistoricalDate(excelDate.toISOString().split("T")[0]);
    }
    return parseHistoricalDate(value);
}

export function historicalDateInput(event: StoredHistoricalDate) {
    if (event.displayDate) return event.displayDate;
    if (!event.date) return "";
    const date = new Date(event.date);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

export function historicalDisplayDate(event: StoredHistoricalDate) {
    if (event.displayDate) return event.displayDate;
    if (!event.date) return "Unknown date";
    const date = new Date(event.date);
    return Number.isNaN(date.getTime())
        ? "Unknown date"
        : date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function historicalSortValue(event: StoredHistoricalDate) {
    if (typeof event.historicalYear === "number") {
        return event.historicalYear * 10000 + (event.historicalMonth ?? 0) * 100 + (event.historicalDay ?? 0);
    }
    if (!event.date) return Number.MAX_SAFE_INTEGER;
    const date = new Date(event.date);
    if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
    return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export function compareHistoricalDates(a: StoredHistoricalDate, b: StoredHistoricalDate) {
    return historicalSortValue(a) - historicalSortValue(b);
}

export function historicalEventData(value: unknown) {
    const parsed = parseHistoricalDate(value);
    if (!parsed) return null;
    return {
        date: parsed.legacyDate,
        displayDate: parsed.displayDate,
        historicalYear: parsed.historicalYear,
        historicalMonth: parsed.historicalMonth,
        historicalDay: parsed.historicalDay,
        datePrecision: parsed.datePrecision,
        isApproximate: parsed.isApproximate,
    };
}
