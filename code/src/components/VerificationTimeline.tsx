import { Check, Circle, Clock, AlertCircle, Camera, FileCheck, Users, BadgeCheck, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
    id: string;
    label: string;
    description?: string;
    status: "completed" | "current" | "pending" | "error";
}

interface VerificationTimelineProps {
    currentStatus: string;
    tier: "standard";
}

const stepIcons: Record<string, any> = {
    photos_uploaded: Camera,
    ai_analysis: Loader2,
    confirm: Check,
    payment: Mail,
    document_submission: FileCheck,
    admin_review: Users,
    verified: BadgeCheck,
};

function getStepsForTier(tier: string): TimelineStep[] {
    // Single unified verification flow - fee disclosed via email
    const steps: TimelineStep[] = [
        { id: "submit", label: "Property Submitted", description: "Details entered", status: "pending" },
        { id: "photos", label: "Photos Uploaded", description: "Images for AI analysis", status: "pending" },
        { id: "ai_analyzing", label: "AI Analysis", description: "Detecting area & defects", status: "pending" },
        { id: "confirm", label: "User Confirmation", description: "Review AI findings", status: "pending" },
        { id: "payment", label: "Payment", description: "Fee disclosed via email", status: "pending" },
        { id: "document_submission", label: "Document Submission", description: "Upload legal documents", status: "pending" },
        { id: "admin_review", label: "Admin Review", description: "Document verification & price validation", status: "pending" },
        { id: "verified", label: "Verified & Listed", description: "Live on marketplace", status: "pending" }
    ];

    return steps;
}

function getStepStatus(stepId: string, currentStatus: string, allSteps: TimelineStep[]): "completed" | "current" | "pending" | "error" {
    const statusMap: Record<string, string[]> = {
        "pending": [],
        "ai_analyzing": ["submit", "photos"],
        "ai_complete": ["submit", "photos", "ai_analyzing"],
        "awaiting_payment": ["submit", "photos", "ai_analyzing", "confirm"],
        "document_review": ["submit", "photos", "ai_analyzing", "confirm", "payment"],
        "pending_admin_approval": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission"],
        "admin_review": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission"],
        "inspector_assigned": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission"],
        "inspection_scheduled": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission"],
        "inspection_complete": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission", "admin_review"],
        "verified": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission", "admin_review", "verified"],
        "rejected": ["submit", "photos", "ai_analyzing", "confirm", "payment", "document_submission"],
    };

    const completedSteps = statusMap[currentStatus] || [];

    if (completedSteps.includes(stepId)) {
        return "completed";
    }

    // Find current step
    const stepIndex = allSteps.findIndex(s => s.id === stepId);
    const completedIndex = allSteps.filter(s => completedSteps.includes(s.id)).length;

    if (stepIndex === completedIndex) {
        return currentStatus === "rejected" ? "error" : "current";
    }

    return "pending";
}

export function VerificationTimeline({ currentStatus, tier }: VerificationTimelineProps) {
    const steps = getStepsForTier(tier);

    // Update step statuses based on current status
    steps.forEach(step => {
        step.status = getStepStatus(step.id, currentStatus, steps);
    });

    return (
        <div className="relative">
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const StepIcon = stepIcons[step.id] || Circle;

                return (
                    <div key={step.id} className="flex gap-4 pb-8 last:pb-0">
                        {/* Timeline Line & Dot */}
                        <div className="flex flex-col items-center">
                            {/* Dot */}
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    step.status === "completed" && "bg-emerald-500 border-emerald-500 text-white",
                                    step.status === "current" && "bg-primary border-primary text-white animate-pulse",
                                    step.status === "pending" && "bg-muted border-border text-muted-foreground",
                                    step.status === "error" && "bg-red-500 border-red-500 text-white"
                                )}
                            >
                                {step.status === "completed" ? (
                                    <Check className="h-5 w-5" />
                                ) : step.status === "current" ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : step.status === "error" ? (
                                    <AlertCircle className="h-5 w-5" />
                                ) : (
                                    <Circle className="h-4 w-4" />
                                )}
                            </div>

                            {/* Connecting Line */}
                            {!isLast && (
                                <div
                                    className={cn(
                                        "w-0.5 flex-1 min-h-[2rem] transition-colors duration-300",
                                        step.status === "completed" ? "bg-emerald-500" : "bg-border"
                                    )}
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="pt-1.5 pb-4 flex-1">
                            <h4
                                className={cn(
                                    "font-semibold transition-colors",
                                    step.status === "completed" && "text-emerald-600",
                                    step.status === "current" && "text-primary",
                                    step.status === "pending" && "text-muted-foreground",
                                    step.status === "error" && "text-red-600"
                                )}
                            >
                                {step.label}
                            </h4>
                            {step.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Compact horizontal timeline for cards
export function CompactTimeline({ currentStatus, tier }: VerificationTimelineProps) {
    const steps = getStepsForTier(tier);
    steps.forEach(step => {
        step.status = getStepStatus(step.id, currentStatus, steps);
    });

    return (
        <div className="flex items-center gap-1">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full transition-colors",
                            step.status === "completed" && "bg-emerald-500",
                            step.status === "current" && "bg-primary animate-pulse",
                            step.status === "pending" && "bg-muted",
                            step.status === "error" && "bg-red-500"
                        )}
                        title={step.label}
                    />
                    {index < steps.length - 1 && (
                        <div
                            className={cn(
                                "w-4 h-0.5",
                                step.status === "completed" ? "bg-emerald-500" : "bg-muted"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

export default VerificationTimeline;
