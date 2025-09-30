import { useState } from "react";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";

// import { Fragment } from "@generated/prisma";
import { Button } from "@/components/ui/button";
import { se } from "date-fns/locale";

interface Props {
  data: any;
};

export function FragmentWeb({ data }: Props) {
    const[fragmentKey,setFragmentKey]=useState(0)
    const [copied,setCopied]=useState(false)

    const onRefresh=()=>{
        setFragmentKey((prev)=>prev+1)
    }

    const handleCopy=()=>{
      if(!data?.sandboxUrl)return
      navigator.clipboard.writeText(data.sandboxUrl)
      setCopied(true)
        setTimeout(() => {  setCopied(false) }, 2000);
    }

  return (
        <div className="flex flex-col w-full h-full">
  <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
    <Button size="sm" variant="outline" onClick={onRefresh}>
      <RefreshCcwIcon />
    </Button>
    <Button
      size="sm"
      variant="outline"
      disabled={!data?.sandboxUrl||copied}
      onClick={handleCopy}
     className="flex justify-start text-start"
    >
      <span className="truncate">
        {data.sandboxUrl}
      </span>
    </Button>
      <Button
      size="sm"
      variant="outline"
      disabled={!data?.sandboxUrl||copied}
      onClick={() => {
        if(!data?.sandboxUrl)return
          window.open(data.sandboxUrl, "_blank");
        
      }}
     className="flex justify-start text-start"
    >
      <ExternalLinkIcon/>
    </Button>
</div>
<iframe key={fragmentKey} className="h-full w-full" sandbox="allow-forms allow-scripts allow-same-origin" loading='lazy' src={data.sandboxUrl}/>
    </div>
  );
};
