import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return {
        title: "Chat Not Found",
      };
    }

    return {
      title: chat.title,
    };
  } catch (error) {
    console.error('[generateMetadata] Error fetching chat:', error);
    // Return default title if there's a database error
    return {
      title: "Credence",
    };
  }
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('[DEBUG ChatPage] Loading chat with id:', id);

  const chat = await getChatById({ id });

  if (!chat) {
    console.log('[DEBUG ChatPage] Chat not found, redirecting to /');
    redirect("/");
  }

  console.log('[DEBUG ChatPage] Chat found:', chat.id, 'visibility:', chat.visibility);

  const session = await auth();
  console.log('[DEBUG ChatPage] Session:', session ? 'exists' : 'null');
  console.log('[DEBUG ChatPage] Session user:', session?.user ? session.user.id : 'null');

  // Allow unauthenticated access, but redirect to login for private chats
  if (chat.visibility === "private") {
    console.log('[DEBUG ChatPage] Chat is private, checking authorization');

    if (!session || !session.user) {
      console.log('[DEBUG ChatPage] No session, redirecting to /login');
      redirect("/login");
    }

    console.log('[DEBUG ChatPage] Comparing userId - chat.userId:', chat.userId, 'session.user.id:', session.user.id);

    if (session.user.id !== chat.userId) {
      console.log('[DEBUG ChatPage] User IDs do not match, returning 404');
      return notFound();
    }

    console.log('[DEBUG ChatPage] Authorization passed');
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
      />
      <DataStreamHandler />
    </>
  );
}
