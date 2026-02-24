import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "iara_midias";
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <section className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight">iara_midias</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Projeto em branco — pronto para você começar.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Index;

