'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { PROJECT_TEMPLATES } from "@/lib/constants";

// ✅ Validation schema
const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Message is required" })
    .max(10000, { message: "Message is is too long" }),
});

export const ProjectForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ✅ React Hook Form setup
  // form setup
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { value: "" },
  mode: "onChange",         // <- important
});


  const [isFocused, setIsFocused] = useState(false);

  // ✅ TRPC mutation for project creation
  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        form.reset();
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        router.push(`projects/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({
      value: values.value,
    });
  };

  const onSelect=async(value:string)=>{
     form.setValue('value',value,{
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
     })
  }

  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all ",
          isFocused && "shadow-xs"
        )}
      >
       <FormField
  control={form.control}
  name="value"
  render={({ field }) => (
    <TextareaAutosize
      // keep RHF registration intact
      name={field.name}
      ref={field.ref}

      // fully controlled value
      value={field.value ?? ""}

      // let RHF handle the event (don't convert to string yourself)
      onChange={field.onChange}

      // keep RHF blur + your focus UI
      onBlur={(e) => {
        field.onBlur();    // notify RHF
        setIsFocused(false);
      }}
      onFocus={() => setIsFocused(true)}

      minRows={2}
      maxRows={8}
      className="pt-4 resize-none border-none w-full outline-none bg-transparent"
      placeholder="What would you like to build?"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          form.handleSubmit(onSubmit)();
        }
      }}
    />
  )}
/>



        <div className="flex items-center justify-between mt-2">
          {/* ⌘+Enter helper */}
          <div className="text-[10px] text-muted-foreground font-mono">
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span>&#8984;</span>Enter
            </kbd>
            &nbsp;to submit
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className={cn(
              "size-8 rounded-full",
              isButtonDisabled && "bg-muted-foreground border"
            )}
            disabled={isButtonDisabled}
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon />
            )}
          </Button>
        </div>
        
      </form>
      <div className="flex-wrap mt-4 justify-center gap-2 hidden md:flex max-w-3xl">
  {PROJECT_TEMPLATES.map((template) => (
    <Button
      key={template.title}
      variant="outline"
      size="sm"
      className=" bg-white dark:bg-sidebar"
      onClick={() => onSelect(template.prompt)}
    >
      {template.emoji} {template.title}
    </Button>
  ))}
</div>
    </Form>
  );
};
