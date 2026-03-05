import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface PaymentSuccessProps {
  onContinue: () => void;
}

export function PaymentSuccess({ onContinue }: PaymentSuccessProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      data-ocid="payment.success_state"
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
              "linear-gradient(135deg, oklch(0.20 0.08 145), oklch(0.14 0.05 145))",
            boxShadow: "0 0 40px oklch(0.55 0.15 145 / 0.25)",
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
          <CheckCircle2
            className="w-9 h-9"
            style={{ color: "oklch(0.72 0.16 145)" }}
          />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p
            className="font-mono text-xs uppercase tracking-[0.3em] mb-3"
            style={{ color: "oklch(0.72 0.16 145)" }}
          >
            Pago completado
          </p>
          <h1 className="font-display text-3xl font-light text-foreground mb-3">
            ¡Gracias por tu compra!
          </h1>
          <p className="text-text-dim font-sans text-sm leading-relaxed">
            Tu pedido ha sido procesado correctamente. Recibirás un correo de
            confirmación con los detalles de tu compra.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest rounded-sm transition-all"
          style={{
            background: "oklch(0.78 0.14 75)",
            color: "oklch(0.10 0.004 285)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          data-ocid="payment.primary_button"
        >
          Volver a la galería
        </motion.button>
      </motion.div>
    </main>
  );
}
