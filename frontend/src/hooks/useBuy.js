import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export function useBuy() {
  const { user } = useAuth();
  const { openAuth } = useModal();
  const [loadingId, setLoadingId] = useState(null);

  const startCheckout = async (packageId) => {
    setLoadingId(packageId);
    try {
      const { data } = await api.post("/payments/checkout", {
        package_id: packageId,
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error("Could not start checkout. Please try again.");
      setLoadingId(null);
    }
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
