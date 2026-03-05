import { XCircle } from "lucide-react";
import { motion } from "motion/react";

interface PaymentFailureProps {
  onContinue: () => void;
}

export function PaymentFailure({ onContinue }: PaymentFailureProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      data-ocid="payment.error_state"
    >
      <motion.div
        className="max-w-sm w-full text-center space-y-8"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Icon */}
        <motion.div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.22 0.10 25), oklch(0.15 0.06 25))",
            boxShadow: "0 0 40px oklch(0.45 0.18 25 / 0.20)",
          }}
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.5,
            type: "spring",
            stiffness: 220,
            damping: 18,
          }}
        >
          <XCircle className="w-9 h-9 text-destructive" />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-destructive mb-3">
            Pago cancelado
          </p>
          <h1 className="font-display text-3xl font-light text-foreground mb-3">
            El pago no se completó
          </h1>
          <p className="text-text-dim font-sans text-sm leading-relaxed">
            Tu pedido no ha sido procesado. Puedes intentarlo de nuevo desde el
            carrito sin perder los artículos seleccionados.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest rounded-sm transition-all border"
          style={{
            background: "transparent",
            color: "oklch(0.78 0.14 75)",
            border: "1px solid oklch(0.78 0.14 75 / 0.4)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          data-ocid="payment.secondary_button"
        >
          Volver a la galería
        </motion.button>
      </motion.div>
    </main>
  );
}
