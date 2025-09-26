'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";


export default function Home() {
  const trpc = useTRPC()
  const router = useRouter()
  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onError: (e) => {
      toast.success(e.message)
    },
    onSuccess: (data) => {
      router.push(`projects/${data.id}`)
    }
  }))
  const [value, setValue] = useState('')
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 jusify-center">
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
        <Button disabled={createProject.isPending} onClick={() => createProject.mutate({ value: value })}>Invoke bg job</Button>
      </div>
    </div>
  );
}