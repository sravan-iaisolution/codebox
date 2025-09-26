'use client'

import { useTRPC } from "@/trpc/client"
// import { useSuspenseQuery } from "@tanstack/react-query"

export const ClientGreeting = () => {
    const trpc = useTRPC()
    return (
        <div>
            hi
        </div>
    )
}