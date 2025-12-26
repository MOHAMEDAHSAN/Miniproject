import { FileCheck, Scan, Box, Brain, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: FileCheck,
    title: "Document Verification",
    description: "OCR and NER automatically extract and validate ownership documents, detecting fraud instantly.",
  },
  {
    icon: Box,
    title: "3D Area Estimation",
    description: "Create 3D models from photos to calculate precise floor area without manual measurement.",
  },
  {
    icon: Scan,
    title: "Quality Detection",
    description: "AI identifies defects like cracks and water damage with confidence scores for each issue.",
  },
  {
    icon: Brain,
    title: "Predictive Analytics",
    description: "Neural networks analyze data to predict property value, lifespan, and risk accurately.",
  },
  {
    icon: Shield,
    title: "Anti-Spoofing",
    description: "EXIF metadata verification ensures images are authentic and match the property location.",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Microservice architecture delivers fast results with independent scaling capabilities.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-secondary/30" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mt-3 mb-5">
            Intelligent verification engine
          </h2>
          <p className="text-lg text-muted-foreground">
            Six AI modules working together to transform listings into trusted insights.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card p-8 rounded-2xl border border-border hover-lift cursor-default"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-105">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
