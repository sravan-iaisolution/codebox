import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";
import { set } from "date-fns";
import { MessageLoading } from "./message-loading";

interface Props {
    projectId: string;
    activeFragment?:any;
    setActiveFragment?:(fragmentId:any)=>void
};

const MessageContainer=({projectId,activeFragment,setActiveFragment}:Props)=>{
const trpc = useTRPC();
const bottomRef=useRef<HTMLDivElement>(null)
const { data: messages } = useSuspenseQuery(trpc.messages.getMany.queryOptions({
  projectId: projectId,
},{refetchInterval: 3000}));

const lastAssistantMessageIdRef=useRef<string|null>(null)


useEffect(() => {
  const lastAssistantMessage = messages.findLast(
    (message) => message.role === "ASSISTANT" && !!message.fragment
  );


  if (lastAssistantMessage?.fragment&&lastAssistantMessage.id!==activeFragment?.id) {
 setActiveFragment?.(lastAssistantMessage?.fragment)
 lastAssistantMessageIdRef.current=lastAssistantMessage.id
  }
}, [messages,setActiveFragment]);

const lastMessage = messages[messages.length - 1];
const isLastMessageFromUser = lastMessage?.role === "USER";

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages.length]);


return (
<div className="flex flex-col flex-1 min-h-0">
  <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="pt-2 pr-1">
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          content={message.content}
          role={message.role}
          fragment={message.fragment}
          createdAt={message.createdAt}
        isActiveFragment={activeFragment?.id===message?.fragment?.id}
onFragmentClick={() => setActiveFragment?.(message.fragment)}
type={message.type}
        />
      ))}
      
    </div>
   {isLastMessageFromUser &&<MessageLoading/>}
     <div ref={bottomRef}></div>
  </div>
 
   <div className="relative p-3 pt-1">
    <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background/70 pointer-events-none" />

<MessageForm projectId={projectId}/>
    </div>
</div>

);

}

export default MessageContainer