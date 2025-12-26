import { Button } from "@/components/ui/button";
import { ArrowRight, Check, MapPin, Search, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="min-h-[90vh] flex items-center bg-warm">
      <div className="container-main w-full py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Content */}
          <div className="order-2 lg:order-1 space-y-6 md:space-y-8">
            {/* Small tagline */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="w-4 h-4 text-accent" />
              <span>Verified real estate marketplace</span>
            </div>

            {/* Main heading - editorial style */}
            <h1 className="text-foreground leading-tight">
              Find your next
              <br />
              <span className="text-primary">home</span>, verified
            </h1>

            {/* Description - conversational */}
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              We verify every property before it's listed. No surprises, no false claims.
              Just honest listings you can trust.
            </p>

            {/* Trust points */}
            <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                <span>AI-verified dimensions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                <span>Condition assessed</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                <span>Authentic photos</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/marketplace" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto btn-black text-base h-12">
                  <Search className="w-4 h-4 mr-2" />
                  Browse properties
                </Button>
              </Link>
              <Link to="/list-property" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-12 text-base border-2">
                  List your property
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Simple stats */}
            <div className="flex gap-8 pt-4 text-sm">
              <div>
                <div className="text-2xl font-semibold text-foreground">100%</div>
                <div className="text-muted-foreground">Verified</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">0</div>
                <div className="text-muted-foreground">False listings</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">24h</div>
                <div className="text-muted-foreground">Avg. verification</div>
              </div>
            </div>
          </div>

          {/* Right: Image Grid */}
          <div className="order-1 lg:order-2">
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              {/* Main large image */}
              <div className="col-span-12 sm:col-span-8 row-span-2">
                <div className="relative rounded-lg overflow-hidden shadow-warm aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5]">
                  <img
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85"
                    alt="Modern home interior"
                    className="img-cover"
                    loading="eager"
                  />
                  {/* Simple overlay card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-md p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">Modern Villa</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          Bandra, Mumbai
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">₹2.5 Cr</div>
                        <span className="badge-verified text-[10px]">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Small images - hidden on very small screens */}
              <div className="hidden sm:block col-span-4">
                <div className="rounded-lg overflow-hidden shadow-warm aspect-square">
                  <img
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"
                    alt="Living room"
                    className="img-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="hidden sm:block col-span-4">
                <div className="rounded-lg overflow-hidden shadow-warm aspect-square">
                  <img
                    src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80"
                    alt="Kitchen"
                    className="img-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
