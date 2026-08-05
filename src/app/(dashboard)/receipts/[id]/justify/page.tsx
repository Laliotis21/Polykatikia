"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Legacy justify-mismatch route. Amount override retired —
 * redirect to OCR review (confirm / re-upload only).
 */
export default function MismatchJustifyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/receipts/${id}/review`);
  }, [id, router]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <LoadingState label="Ανακατεύθυνση στον έλεγχο OCR…" />
    </div>
  );
}
