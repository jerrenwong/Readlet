import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { FriendProfilePage } from "./client";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <FriendProfilePage />
    </Suspense>
  );
}
