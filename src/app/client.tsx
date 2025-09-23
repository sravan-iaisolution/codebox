'use client'

import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"

export const ClientGreeting = () => {
    const trpc = useTRPC()
    const { data } = useSuspenseQuery(trpc.createAI.queryOptions({ text: "prefetch" }))
    return (
        <div>
            {JSON.stringify(data)}
        </div>
    )
}