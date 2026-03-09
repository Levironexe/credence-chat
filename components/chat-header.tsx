"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { LayoutDashboardIcon, House } from "lucide-react";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="fixed top-0 w-full flex items-center gap-2 bg-background/50 px-2 py-1.5 md:px-2 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-2">
<SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />

          <span className="md:sr-only">New Chat</span>
        </Button>
      )}
            {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className="order-1 md:order-2"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}
      </div>
      


      <Button
        className="order-0 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
        onClick={() => {
          router.push("/dashboard");
          router.refresh();
        }}
        variant="outline"
      >
        <LayoutDashboardIcon className="h-16 w-16" />

        <span className="leading-none ">Dashboard</span>
      </Button>      
      <Button
        className="order-0 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        variant="outline"
      >
        <House className="h-16 w-16" />
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
