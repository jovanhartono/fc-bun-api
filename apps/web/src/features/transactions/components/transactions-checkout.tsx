import { ShoppingCartIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { TransactionDraftValues } from "@/features/transactions/cart/cart";
import { useCart } from "@/features/transactions/cart/useCart";
import { CheckoutCartStep } from "@/features/transactions/components/checkout-cart-step";
import {
	CheckoutFooter,
	type CheckoutStep,
} from "@/features/transactions/components/checkout-footer";
import { CheckoutPaymentStep } from "@/features/transactions/components/checkout-payment-step";
import { isValidPhoneNumber } from "@/lib/phone-number";

// Two-step POS checkout: Cart → Payment. Body scrolls; the total + primary
// action live in a pinned footer so they stay reachable on the iPad sheet. Step
// is local state and resets to "cart" each time the sheet remounts on open.
export const TransactionsCheckout = () => {
	const { resetCart, count } = useCart();
	const [step, setStep] = useState<CheckoutStep>("cart");
	const [customerName = "", customerPhone = "", selectedCampaignIds = []] =
		useWatch<
			TransactionDraftValues,
			["customerName", "customerPhone", "selectedCampaignIds"]
		>({ name: ["customerName", "customerPhone", "selectedCampaignIds"] });

	// Same gate as the footer's Continue button — the step tabs are a second way
	// to reach Payment, so they must enforce it too, or a cashier could jump
	// ahead with an empty customer and hit a Create Order that fails validation
	// silently (the errors live on the Cart step they skipped).
	const isCustomerReady =
		customerName.trim().length > 0 && isValidPhoneNumber(customerPhone);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="grid gap-5 p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 text-sm font-medium">
							<ShoppingCartIcon className="size-4" />
							Cart Summary
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9"
							onClick={resetCart}
							disabled={
								count === 0 &&
								!customerName &&
								!customerPhone &&
								selectedCampaignIds.length === 0
							}
							icon={<TrashIcon className="size-4" />}
						>
							Reset
						</Button>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<Button
							type="button"
							variant={step === "cart" ? "default" : "outline"}
							className="h-11"
							onClick={() => setStep("cart")}
						>
							1 · Cart
						</Button>
						<Button
							type="button"
							variant={step === "payment" ? "default" : "outline"}
							className="h-11"
							onClick={() => setStep("payment")}
							disabled={count === 0 || !isCustomerReady}
						>
							2 · Payment
						</Button>
					</div>

					{step === "cart" ? <CheckoutCartStep /> : <CheckoutPaymentStep />}
				</div>
			</div>

			<CheckoutFooter step={step} onContinue={() => setStep("payment")} />
		</div>
	);
};
