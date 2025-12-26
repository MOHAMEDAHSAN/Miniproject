import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

interface ConsentCheckboxProps {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    required?: boolean;
    error?: string;
}

export function ConsentCheckbox({
    id,
    label,
    description,
    checked,
    onChange,
    required = false,
    error,
}: ConsentCheckboxProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={onChange}
                    className="mt-0.5"
                />
                <div className="flex-1">
                    <Label
                        htmlFor={id}
                        className={cn(
                            "text-sm font-medium cursor-pointer",
                            !checked && required && "text-muted-foreground"
                        )}
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-1.5 text-red-500 text-xs pl-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

// Terms and Conditions consent
export function TermsConsent({
    checked,
    onChange,
    error,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
}) {
    return (
        <ConsentCheckbox
            id="terms-consent"
            label="I agree to the Terms of Service and Privacy Policy"
            description="By submitting this property, you confirm that you have the legal right to list this property and all information provided is accurate to the best of your knowledge."
            checked={checked}
            onChange={onChange}
            required
            error={error}
        />
    );
}

// Data accuracy consent
export function DataAccuracyConsent({
    checked,
    onChange,
    error,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
}) {
    return (
        <ConsentCheckbox
            id="data-accuracy-consent"
            label="I confirm the property information is accurate"
            description="I understand that providing false information may result in listing rejection and potential legal consequences. VisionEstate uses AI to verify property details."
            checked={checked}
            onChange={onChange}
            required
            error={error}
        />
    );
}

// AI Analysis consent
export function AIAnalysisConsent({
    checked,
    onChange,
    error,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
}) {
    return (
        <ConsentCheckbox
            id="ai-analysis-consent"
            label="I consent to AI analysis of my property photos"
            description="VisionEstate will analyze uploaded photos using computer vision to estimate area, detect structural issues, and verify property condition. This helps ensure listing accuracy."
            checked={checked}
            onChange={onChange}
            required
            error={error}
        />
    );
}

// Inspection consent (for Premium tier)
export function InspectionConsent({
    checked,
    onChange,
    error,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
}) {
    return (
        <ConsentCheckbox
            id="inspection-consent"
            label="I authorize a physical property inspection"
            description="A verified VisionEstate inspector will visit the property to confirm details. The inspection typically takes 30-45 minutes and requires property access."
            checked={checked}
            onChange={onChange}
            required
            error={error}
        />
    );
}

// Payment consent
export function PaymentConsent({
    amount,
    checked,
    onChange,
    error,
    label,
}: {
    amount: number;
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
    label?: string;
}) {
    return (
        <ConsentCheckbox
            id="payment-consent"
            label={label || `I agree to pay ₹${amount} verification fee`}
            description="This is a one-time, non-refundable fee for property verification services. Payment is processed securely through our payment partners."
            checked={checked}
            onChange={onChange}
            required
            error={error}
        />
    );
}

export default ConsentCheckbox;
