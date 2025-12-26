import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DiscrepancyAlertProps {
    type: "area" | "crack" | "dimension" | "condition";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    claimedValue?: string | number;
    detectedValue?: string | number;
    onDismiss?: () => void;
    onCorrect?: () => void;
}

const severityConfig = {
    low: {
        icon: Info,
        bgColor: "bg-blue-50 border-blue-200",
        textColor: "text-blue-800",
        iconColor: "text-blue-500",
    },
    medium: {
        icon: AlertCircle,
        bgColor: "bg-amber-50 border-amber-200",
        textColor: "text-amber-800",
        iconColor: "text-amber-500",
    },
    high: {
        icon: AlertTriangle,
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        iconColor: "text-red-500",
    },
};

export function DiscrepancyAlert({
    type,
    severity,
    title,
    description,
    claimedValue,
    detectedValue,
    onDismiss,
    onCorrect,
}: DiscrepancyAlertProps) {
    const [dismissed, setDismissed] = useState(false);
    const config = severityConfig[severity];
    const Icon = config.icon;

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    return (
        <Alert className={cn("relative", config.bgColor, "border")}>
            <Icon className={cn("h-5 w-5", config.iconColor)} />

            {onDismiss && (
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            <AlertTitle className={cn("font-semibold", config.textColor)}>
                {title}
            </AlertTitle>

            <AlertDescription className={cn("mt-2", config.textColor, "opacity-90")}>
                <p>{description}</p>

                {(claimedValue !== undefined || detectedValue !== undefined) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        {claimedValue !== undefined && (
                            <div className="flex items-center gap-2">
                                <span className="opacity-70">Claimed:</span>
                                <span className="font-medium">{claimedValue}</span>
                            </div>
                        )}
                        {detectedValue !== undefined && (
                            <div className="flex items-center gap-2">
                                <span className="opacity-70">AI Detected:</span>
                                <span className="font-medium">{detectedValue}</span>
                            </div>
                        )}
                    </div>
                )}

                {onCorrect && (
                    <div className="mt-4">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onCorrect}
                            className={cn(
                                "border",
                                severity === "high" ? "border-red-300 hover:bg-red-100" :
                                    severity === "medium" ? "border-amber-300 hover:bg-amber-100" :
                                        "border-blue-300 hover:bg-blue-100"
                            )}
                        >
                            Update Information
                        </Button>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}

// Summary component for multiple discrepancies
interface DiscrepancySummaryProps {
    discrepancies: {
        type: string;
        severity: "low" | "medium" | "high";
        message: string;
    }[];
}

export function DiscrepancySummary({ discrepancies }: DiscrepancySummaryProps) {
    if (!discrepancies || discrepancies.length === 0) {
        return (
            <Alert className="bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <AlertTitle className="text-emerald-800 font-semibold">
                    No Discrepancies Found
                </AlertTitle>
                <AlertDescription className="text-emerald-700 opacity-90">
                    AI analysis matches the provided information. Your property is ready for verification.
                </AlertDescription>
            </Alert>
        );
    }

    const highSeverity = discrepancies.filter(d => d.severity === "high").length;
    const mediumSeverity = discrepancies.filter(d => d.severity === "medium").length;
    const lowSeverity = discrepancies.filter(d => d.severity === "low").length;

    return (
        <div className="space-y-4">
            <Alert className={cn(
                "border",
                highSeverity > 0 ? "bg-red-50 border-red-200" :
                    mediumSeverity > 0 ? "bg-amber-50 border-amber-200" :
                        "bg-blue-50 border-blue-200"
            )}>
                <AlertTriangle className={cn(
                    "h-5 w-5",
                    highSeverity > 0 ? "text-red-500" :
                        mediumSeverity > 0 ? "text-amber-500" :
                            "text-blue-500"
                )} />
                <AlertTitle className={cn(
                    "font-semibold",
                    highSeverity > 0 ? "text-red-800" :
                        mediumSeverity > 0 ? "text-amber-800" :
                            "text-blue-800"
                )}>
                    {discrepancies.length} Discrepanc{discrepancies.length === 1 ? "y" : "ies"} Found
                </AlertTitle>
                <AlertDescription>
                    <ul className="mt-2 space-y-1">
                        {discrepancies.map((d, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className={cn(
                                    "inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                    d.severity === "high" ? "bg-red-500" :
                                        d.severity === "medium" ? "bg-amber-500" :
                                            "bg-blue-500"
                                )} />
                                <span className={cn(
                                    highSeverity > 0 ? "text-red-700" :
                                        mediumSeverity > 0 ? "text-amber-700" :
                                            "text-blue-700"
                                )}>
                                    {d.message}
                                </span>
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
}

export default DiscrepancyAlert;
