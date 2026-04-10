export default function CheckoutPage() {
  return (
    <main className="page-shell py-10">
      <section className="card mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-4xl font-black text-brand-900">Checkout em breve</h1>
        <p className="mt-3 text-brand-900/80">
          A tela de pagamento foi pausada temporariamente para focar em upload, IA e estudo com repeticao espacada.
        </p>
        <p className="mt-2 text-brand-900/80">
          Quando o fluxo principal estiver validado, reativamos Stripe e os planos Basico/Premium.
        </p>
        <div className="mt-6 inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
          Status: planejamento
        </div>
      </section>
    </main>
  );
}
