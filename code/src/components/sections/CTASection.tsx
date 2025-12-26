import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Content */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-5">
            Ready to verify your next property?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Join VisionEstate and make data-driven decisions with confidence. No more guesswork.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Schedule Demo
            </Button>
          </div>

          {/* Trust Points */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span>No credit card required</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>5 free analyses</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Enterprise ready</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
