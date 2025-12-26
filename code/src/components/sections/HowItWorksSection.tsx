import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: 1,
    title: "Submit Property Details",
    description: "Enter your property information and upload photos",
  },
  {
    number: 2,
    title: "AI Analysis",
    description: "Our AI verifies area estimation and detects structural issues",
  },
  {
    number: 3,
    title: "Pay ₹1,000",
    description: "Complete the verification fee payment",
  },
  {
    number: 4,
    title: "Admin Approval",
    description: "Our team reviews and approves your listing",
  },
  {
    number: 5,
    title: "Go Live",
    description: "Your verified property appears on the marketplace",
  },
];

const features = [
  "AI photo analysis",
  "Area estimation",
  "Crack detection",
  "Document verification",
  "Admin review",
  "Verified badge",
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="section-spacing bg-warm">
      <div className="container-main">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-sm font-medium text-primary uppercase tracking-wide">
            How It Works
          </span>
          <h2 className="text-foreground mt-3 mb-4">
            Get verified in 5 simple steps
          </h2>
          <p className="text-muted-foreground">
            One plan, complete verification, trusted listings.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4 items-start p-4 rounded-lg bg-card border">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Single Plan */}
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-lg border-2 border-foreground bg-card text-center">
            <div className="text-sm font-medium text-foreground mb-2">Complete Verification</div>
            <div className="text-4xl font-bold text-foreground mb-4">₹1,000</div>
            <p className="text-sm text-muted-foreground mb-6">One-time payment for full verification</p>

            <ul className="space-y-2 mb-6 text-left">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link to="/list-property">
              <Button className="w-full btn-black">
                List Your Property
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
