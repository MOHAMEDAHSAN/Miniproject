import { HelmetProvider, Helmet } from "react-helmet-async";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import CTASection from "@/components/sections/CTASection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>VisionEstate - AI-Powered Real Estate Analyzer</title>
        <meta 
          name="description" 
          content="VisionEstate uses deep learning and computer vision to verify property ownership, estimate accurate floor areas, and detect hidden defects. Eliminate the trust gap in real estate." 
        />
        <meta name="keywords" content="real estate AI, property verification, computer vision, document verification, 3D area estimation, property quality analysis" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default Index;
