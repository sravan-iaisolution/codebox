'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  SunMoonIcon,
  EditIcon,
} from 'lucide-react';

import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  projectId: string;
}

export const ProjectHeader = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const { data: project } = useSuspenseQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full border-b p-2 sm:p-3">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="group flex items-center gap-2 pl-2 hover:bg-transparent hover:opacity-80 focus-visible:ring-0"
            >
              <Image src="/logo.svg" alt="Vibe" width={18} height={18} />
              <span className="truncate text-sm font-medium sm:max-w-[16rem]">
                {project.name}
              </span>
              <ChevronDownIcon className="size-4 transition-transform group-aria-expanded:rotate-180" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2">
                <ChevronLeftIcon className="size-4" />
                <span>Go to Dashboard</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href={`/projects/${projectId}/edit`}
                className="flex items-center gap-2"
              >
                <EditIcon className="size-4" />
                <span>Edit Project</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <SunMoonIcon className="size-4" />
                <span>Appearance</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={theme ?? 'system'}
                    onValueChange={(v) => setTheme(v)}
                  >
                    <DropdownMenuRadioItem value="light">
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default ProjectHeader;
