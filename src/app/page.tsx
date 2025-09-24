'use client'

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";


export default function Home() {
  const trpc = useTRPC()
  const invoke = useMutation(trpc.invoke.mutationOptions({}))
  return (
    <div>
      <Button disabled={invoke.isPending} onClick={() => invoke.mutate({ text: 'hellloo world' })}>Invoke bg job</Button>
    </div>
  );
}