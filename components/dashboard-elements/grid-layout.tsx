type GridProps = {
  header: React.ReactNode;
  content?: React.ReactNode;
};

export function GridLayout({ header, content }: GridProps) {
  return (
    <div className="w-full ">
      <div className="w-full border-b border-border"></div>
      <div className="max-w-7xl border-x border-border  mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 ">
        <h2 className="text-lg">{header}</h2>
      </div>
      
      <div className="w-full border-b border-border"></div>

      <div className="max-w-7xl border-x border-border  mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 ">
        {content}
      </div>
    </div>
  );
}
