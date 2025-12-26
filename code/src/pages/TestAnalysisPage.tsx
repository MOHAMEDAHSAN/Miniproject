import { useState, useCallback, Suspense, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Upload, Loader2, Ruler, ShieldCheck, 
  Search, Maximize2, MoveVertical, X
} from "lucide-react";
import { toast } from "sonner";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Grid, ContactShadows } from "@react-three/drei";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Unit = 'm' | 'cm' | 'in' | 'ft';

const Room3D = ({ dims }: { dims: any }) => (
  <Canvas camera={{ position: [7, 7, 7], fov: 45 }}>
    <ambientLight intensity={0.6} />
    <pointLight position={[10, 10, 10]} />
    <Suspense fallback={null}>
      <group position={[0, dims.height / 2, 0]}>
        <Box args={[dims.width, dims.height, dims.length]}>
          <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.6} />
        </Box>
        <Box args={[dims.width, 0.05, dims.length]} position={[0, -dims.height / 2, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={20} blur={2} />
      <Grid infiniteGrid fadeDistance={40} sectionSize={1} />
    </Suspense>
    <OrbitControls makeDefault />
  </Canvas>
);

const TestAnalysisPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [unit, setUnit] = useState<Unit>('m');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} images added to session`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': []} });

  const handleStartAnalysis = async () => {
    if (files.length === 0) return toast.error("Upload at least one perspective");
    setIsAnalyzing(true);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    try {
      const response = await fetch("http://127.0.0.1:8000/reconstruct-room", { method: "POST", body: formData });
      const data = await response.json();
      const fileData = files.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
      setResults({ ...data, filePreviews: fileData });
      toast.success("Spatial & Feature Analysis Complete");
    } catch (e) {
      toast.error("Connection Failed");
    } finally { setIsAnalyzing(false); }
  };

  const convert = (m: number) => {
    if (unit === 'cm') return m * 100;
    if (unit === 'in') return m * 39.37;
    if (unit === 'ft') return m * 3.28;
    return m;
  };

  const formattedResults = useMemo(() => {
    if (!results) return null;
    const { width, height, length, area } = results.spatial_data;
    const areaUnit = unit === 'm' ? 'm²' : `${unit}²`;
    const convArea = unit === 'm' ? area : (convert(width) * convert(length)).toFixed(2);
    return {
      w: `${convert(width).toFixed(2)} ${unit}`,
      h: `${convert(height).toFixed(2)} ${unit}`,
      l: `${convert(length).toFixed(2)} ${unit}`,
      area: `${convArea} ${areaUnit}`
    };
  }, [results, unit]);

  // Helper to render bounding boxes on top of an image
  const BoundingBoxes = ({ imgData }: { imgData: any }) => (
    <div className="absolute inset-0 pointer-events-none">
      {imgData?.detections?.map((det: any, i: number) => {
        // Fix: Skip detections that don't have a bounding box (e.g. Room Type)
        if (!det.bbox) return null;
        
        const [x, y, w, h] = det.bbox;
        const [imgH, imgW] = imgData.img_size;
        let boxStyle = "border-blue-500 bg-blue-500/10";
        if (det.isCalibration) boxStyle = "border-yellow-400 bg-yellow-400/30";
        if (det.isCrack) boxStyle = "border-red-500 bg-red-500/20";

        return (
          <div key={i} className={`absolute border-2 rounded-sm ${boxStyle}`}
            style={{
              left: `${(x / imgW) * 100}%`,
              top: `${(y / imgH) * 100}%`,
              width: `${(w / imgW) * 100}%`,
              height: `${(h / imgH) * 100}%`
            }}>
            <span className="absolute -top-4 left-0 text-[8px] font-bold bg-white/90 px-1 text-slate-900 uppercase shadow-sm">
              {det.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-grow pt-28 pb-12 container mx-auto px-4">
        
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">VisionEstate <span className="text-blue-600">Spatial Engine (Test Page)</span></h1>
          <div {...getRootProps()} className={`mt-10 p-12 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer bg-white hover:border-blue-400 shadow-sm ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-4 text-slate-400" size={40} />
            <p className="font-bold text-slate-700">Drop room perspectives here</p>
          </div>
          {files.length > 0 && (
            <Button onClick={handleStartAnalysis} disabled={isAnalyzing} size="lg" className="mt-8 rounded-full px-12 h-14 bg-slate-900 shadow-xl">
              {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
              {isAnalyzing ? "Processing Vision Layers..." : `Analyze ${files.length} Images`}
            </Button>
          )}
        </div>

        {results && formattedResults && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-5 duration-700">
            
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                <Search className="text-blue-600" size={24} /> Feature Analysis Gallery
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {results.filePreviews.map((preview: any, idx: number) => {
                  const imgData = results.analysis_results[idx];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImageIndex(idx)}
                      className="bg-white rounded-[2rem] overflow-hidden border shadow-lg cursor-pointer hover:ring-4 hover:ring-blue-400/20 transition-all group"
                    >
                      <div className="relative aspect-video bg-slate-100 flex justify-center items-center overflow-hidden">
                        <img src={preview.url} className="block h-full w-full object-cover transition-transform group-hover:scale-105" alt="Perspective" />
                        <BoundingBoxes imgData={imgData} />
                        <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 size={16} className="text-slate-900" />
                        </div>
                      </div>
                      <div className="p-4 border-t flex justify-between items-center">
                         <span className="text-[10px] text-slate-400 font-mono font-bold">{preview.name}</span>
                         {imgData?.detections?.some((d: any) => d.isCalibration) && (
                           <ShieldCheck size={18} className="text-green-500" />
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Modal for Full Image View */}
            <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
              <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden bg-slate-900 border-none">
                {selectedImageIndex !== null && (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <button 
                      onClick={() => setSelectedImageIndex(null)}
                      className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
                    >
                      <X size={24} />
                    </button>
                    <div className="relative max-h-full max-w-full">
                      <img 
                        src={results.filePreviews[selectedImageIndex].url} 
                        className="max-h-[85vh] w-auto object-contain rounded-lg"
                        alt="Full View" 
                      />
                      <BoundingBoxes imgData={results.analysis_results[selectedImageIndex]} />
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="bg-slate-900 rounded-[3rem] h-[600px] overflow-hidden border-[12px] border-white shadow-2xl relative">
                  <Room3D dims={results.spatial_data} />
                </div>
              </div>
              <div className="space-y-6">
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${results.is_calibrated ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <ShieldCheck size={20} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{results.is_calibrated ? 'A4 Calibrated' : 'Estimated Mode'}</p>
                    <p className="text-[10px] opacity-80">{results.is_calibrated ? 'High accuracy via physical reference.' : 'Standard averages used.'}</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold flex items-center gap-2">Measurements</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                      {['m', 'cm', 'in', 'ft'].map((u) => (
                        <button key={u} onClick={() => setUnit(u as Unit)} className={`px-2 py-1 text-[9px] font-bold rounded uppercase ${unit === u ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>{u}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      [Ruler, "Width", formattedResults.w],
                      [MoveVertical, "Height", formattedResults.h],
                      [Maximize2, "Length", formattedResults.l]
                    ].map(([Icon, label, val]: any) => (
                      <div key={label} className="flex justify-between p-4 bg-slate-50 rounded-2xl border text-sm items-center">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-slate-400" />
                          <span className="text-slate-500 font-medium">{label}</span>
                        </div>
                        <span className="font-bold text-slate-900">{val}</span>
                      </div>
                    ))}
                    <div className="mt-8 p-8 bg-blue-600 text-white rounded-[2rem] text-center shadow-lg">
                      <p className="text-[10px] opacity-80 uppercase font-black mb-2">Total Floor Area</p>
                      <p className="text-4xl font-bold tracking-tight">{formattedResults.area}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TestAnalysisPage;