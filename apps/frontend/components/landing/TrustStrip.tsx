interface Logo {
  name: string;
  url: string;
}

interface TrustStripProps {
  logos?: Logo[];
}

export default function TrustStrip({ logos }: TrustStripProps) {
  // Skip section entirely if no logos exist
  if (!logos || logos.length === 0) {
    return null;
  }

  return (
    <section className="py-12 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <p className="text-body-sm text-brand-textDim text-center mb-8">
          Trusted by operations teams
        </p>

        {/* Logo row */}
        <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
          {logos.map((logo) => (
            <img
              key={logo.name}
              src={logo.url}
              alt={logo.name}
              className="h-8 opacity-60 hover:opacity-100 transition-opacity grayscale"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
