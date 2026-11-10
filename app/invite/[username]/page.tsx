import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { InvitePage } from "./client";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <InvitePage />
    </Suspense>
  );
}
