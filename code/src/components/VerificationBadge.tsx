import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
    tier: "standard";
    status: "pending" | "verified" | "rejected" | "in_progress";
    size?: "sm" | "md" | "lg";
    showTier?: boolean;
}

// Single unified tier configuration
const tierConfig = {
    standard: {
        label: "Verified",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ShieldCheck,
    },
};

const statusConfig = {
    pending: {
        label: "Pending",
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: Clock,
    },
    verified: {
        label: "Verified",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
    },
    rejected: {
        label: "Rejected",
        color: "bg-red-50 text-red-700 border-red-200",
        icon: ShieldX,
    },
    in_progress: {
        label: "In Progress",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Clock,
    },
};

const sizeConfig = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
};

export function VerificationBadge({
    tier,
    status,
    size = "md",
    showTier = true
}: VerificationBadgeProps) {
    const tierInfo = tierConfig[tier] || tierConfig.standard;
    const statusInfo = statusConfig[status];
    const StatusIcon = statusInfo.icon;

    return (
        <div className="flex items-center gap-1.5">
            {showTier && (
                <Badge
                    variant="outline"
                    className={cn(
                        "font-medium border",
                        tierInfo.color,
                        sizeConfig[size]
                    )}
                >
                    <tierInfo.icon className={cn(
                        "mr-1",
                        size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                    {tierInfo.label}
                </Badge>
            )}
            <Badge
                variant="outline"
                className={cn(
                    "font-medium border",
                    statusInfo.color,
                    sizeConfig[size]
                )}
            >
                <StatusIcon className={cn(
                    "mr-1",
                    size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
                {statusInfo.label}
            </Badge>
        </div>
    );
}

export function VerifiedBadge({ tier = "standard", size = "md" }: { tier?: "standard"; size?: "sm" | "md" | "lg" }) {
    return (
        <Badge
            className={cn(
                "font-semibold border-0 shadow-sm",
                "bg-emerald-500 text-white",
                sizeConfig[size]
            )}
        >
            <CheckCircle2 className={cn(
                "mr-1",
                size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            VisionEstate Verified
        </Badge>
    );
}

export default VerificationBadge;
