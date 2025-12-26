import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Camera, FileCheck, Users, Sparkles, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TierSelectorProps {
    selectedTier: "standard";
    onSelect: (tier: "standard") => void;
}

// Single unified verification plan - Fee disclosed via email
const verificationPlan = {
    id: "standard" as const,
    name: "Property Verification",
    price: 0, // Actual fee disclosed via email
    priceLabel: "Fee via Email",
    description: "Complete AI-powered verification for trusted listings",
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-200 hover:border-emerald-400",
    bgColor: "bg-emerald-50",
    features: [
        { text: "AI area estimation", included: true },
        { text: "Room type detection", included: true },
        { text: "Crack detection", included: true },
        { text: "Document verification", included: true },
        { text: "Admin review & approval", included: true },
        { text: "Verified badge on listing", included: true },
    ],
};

export function TierSelector({ selectedTier, onSelect }: TierSelectorProps) {
    const tier = verificationPlan;
    const TierIcon = tier.icon;

    return (
        <div className="space-y-6">
            {/* Single Verification Plan Card */}
            <Card
                className={cn(
                    "relative cursor-pointer transition-all duration-300 overflow-hidden",
                    tier.borderColor,
                    "ring-2 ring-primary shadow-lg"
                )}
            >
                {/* Selection Indicator */}
                <div className="absolute top-4 left-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                </div>

                <CardHeader className="pb-4 pt-8">
                    {/* Icon */}
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                        `bg-gradient-to-br ${tier.color}`
                    )}>
                        <TierIcon className="h-7 w-7 text-white" />
                    </div>

                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription className="text-sm">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="pb-6">
                    {/* Price Notice */}
                    <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-lg font-semibold text-amber-800">Verification Fee</span>
                        <p className="text-amber-700 text-sm mt-1">Amount will be disclosed and sent to your registered email after review.</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                        {tier.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                </div>
                                <span className="text-foreground">{feature.text}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Selected Button */}
                    <Button
                        className={cn(
                            "w-full mt-6 transition-all",
                            `bg-gradient-to-r ${tier.color} text-white hover:opacity-90`
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(tier.id);
                        }}
                    >
                        Selected
                    </Button>
                </CardContent>
            </Card>

            {/* Email Notice */}
            <div className="text-center text-sm text-muted-foreground mt-4">
                <Mail className="h-4 w-4 inline mr-1" />
                You will receive an email with the verification fee after our team reviews your property details.
            </div>
        </div>
    );
}

// Feature highlights for verification process
export function TierFeatureHighlights() {
    const highlights = [
        { icon: Camera, title: "AI Photo Analysis", desc: "Detect cracks & estimate area from photos" },
        { icon: FileCheck, title: "Document Verification", desc: "Verify property documents" },
        { icon: Users, title: "Admin Review", desc: "Manual review by our team" },
        { icon: Sparkles, title: "Verified Badge", desc: "Get verified listing badge" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {highlights.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
            ))}
        </div>
    );
}

export default TierSelector;
