export function escapeCsv(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return "";
	}
	const str = String(value);
	if (/[",\n]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function csvFilename(
	scope: string,
	from: string,
	to: string,
	storeId: number | null | undefined,
): string {
	const store = storeId ? `store-${storeId}` : "all-stores";
	if (from === to) {
		return `fresclean-${scope}-${from}-${store}.csv`;
	}
	return `fresclean-${scope}-${from}_to_${to}-${store}.csv`;
}
