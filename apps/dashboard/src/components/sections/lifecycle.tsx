import EnterpriseAIPipeline from '@/components/ui/ai-agent-pipeline';

export function LifecycleSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="section-title max-w-2xl mx-auto">
            One system. Six stages.
            <br />
            Zero gaps.
          </h2>
          <p className="section-subtitle max-w-md mx-auto mt-4">
            Voomate crawls your catalog, deploys in minutes, handles queries, executes actions,
            audits quality, and surfaces insights — automatically.
          </p>
        </div>
        <EnterpriseAIPipeline />
      </div>
    </section>
  );
}
