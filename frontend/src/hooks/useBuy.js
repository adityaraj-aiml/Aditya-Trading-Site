import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export function useBuy() {
  const { user, refresh } = useAuth();
  const { openAuth } = useModal();
  const [loadingId, setLoadingId] = useState(null);

  const startCheckout = async (packageId) => {
    setLoadingId(packageId);

    if (!window.Razorpay) {
      toast.error("Payments couldn't load. Check your connection and try again.");
      setLoadingId(null);
      return;
    }

    let order;
    try {
      const { data } = await api.post("/payments/checkout", { package_id: packageId });
      order = data;
    } catch (err) {
      toast.error("Could not start checkout. Please try again.");
      setLoadingId(null);
      return;
    }

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "Techin By Raj",
      description: order.name,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: "#E2FF4A" },
      handler: async (response) => {
        try {
          await api.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          await refresh();
          toast.success("Payment successful — you're unlocked!");
          window.location.href = `/payment/success?order_id=${response.razorpay_order_id}`;
        } catch (err) {
          window.location.href = `/payment/success?order_id=${response.razorpay_order_id}`;
        } finally {
          setLoadingId(null);
        }
      },
      modal: {
        ondismiss: () => setLoadingId(null),
      },
    });

    rzp.on("payment.failed", () => {
      toast.error("Payment failed. You were not charged — please try again.");
      setLoadingId(null);
    });

    rzp.open();
  };

  const buy = (packageId) => {
    if (!user || user === false) {
      toast.message("Create an account to continue to checkout.");
      openAuth("register", () => startCheckout(packageId));
      return;
    }
    startCheckout(packageId);
  };

  return { buy, loadingId };
}
