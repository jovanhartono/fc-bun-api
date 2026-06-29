import type { ComplaintResolution, ComplaintStatus } from "@/lib/api";
import type { BadgeVariant } from "@/lib/status";

const statusLabels: Record<ComplaintStatus, string> = {
	open: "Open",
	closed: "Closed",
};

export const formatComplaintStatus = (status: ComplaintStatus) =>
	statusLabels[status];

export const getComplaintStatusBadgeVariant = (
	status: ComplaintStatus,
): BadgeVariant => (status === "open" ? "warning" : "secondary");

const resolutionLabels: Record<ComplaintResolution, string> = {
	rework: "Rework",
	refund: "Refund",
	rejected: "Rejected",
};

export const formatComplaintResolution = (resolution: ComplaintResolution) =>
	resolutionLabels[resolution];

export const getComplaintResolutionBadgeVariant = (
	resolution: ComplaintResolution,
): BadgeVariant => {
	if (resolution === "refund") {
		return "danger";
	}
	if (resolution === "rejected") {
		return "outline";
	}
	return "success";
};

export const COMPLAINT_RESOLUTIONS = [
	"rework",
	"refund",
	"rejected",
] as const satisfies readonly ComplaintResolution[];
