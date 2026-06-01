import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';

interface ChatWidgetProps {
  position?: string;
  toastPosition?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = observer(({
  position = "bottom-6 right-6",
  toastPosition = "top-4 right-4"
}) => {
  const {
    authStore: { user },
    chatStore: {
      chatHistory,
      currentChatTarget,
      unreadCounts,
      onlineUsers,
      isWidgetHidden,
      totalUnread,
      replyingTo,
      toasts,
      initSocket,
      disconnect,
      sendMessage,
      toggleWidget,
      setChatTarget,
      setReplyingTo
    }
  } = useStore();

  const chatBoxRef = React.useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = React.useState<string>("");

  const chatUser = React.useMemo(() => ({
    email: user?.email || 'unknown@mail.com',
    name: user?.name || 'Anonymous',
    picture: user?.picture || "https://ui-avatars.com/api/?name=User",
  }), [user]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput, chatUser);
    setMessageInput("");
  };

  const currentHistory = chatHistory[currentChatTarget] || [];

  React.useEffect(() => {
    if (chatUser.email && chatUser.email !== 'unknown@mail.com') {
      initSocket(chatUser);
    }
  }, [chatUser.email, initSocket]);

  React.useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory, currentChatTarget, isWidgetHidden]);

  return (
    <div className={`fixed ${position} z-50 font-sans text-slate-700`}>
      {/* 1. CHAT BUBBLE BUTTON */}
      {isWidgetHidden && (
        <button
          onClick={() => toggleWidget(true)}
          className="relative w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold h-5 min-w-5 px-1 rounded-full flex items-center justify-center animate-bounce shadow-md">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* 2. CHAT PANEL INTERFACE */}
      {!isWidgetHidden && (
        <div className="w-[650px] h-[500px] bg-white border border-slate-200 shadow-2xl rounded-2xl flex overflow-hidden animate-[scaleIn_0.15s_ease-out]">
          {/* SIDEBAR LEFT */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col select-none">
            <div className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              👥 Channels & Users
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              <button
                onClick={() => setChatTarget("ALL")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all ${currentChatTarget === "ALL" ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10' : 'text-slate-600 hover:bg-slate-200/60'}`}
              >
                <span className="text-sm">🌍</span>
                <span className="flex-1 text-left truncate">Team Chat</span>
                {unreadCounts["ALL"] > 0 && currentChatTarget !== "ALL" && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${currentChatTarget === "ALL" ? 'bg-white text-teal-600' : 'bg-rose-500 text-white'}`}>
                    {unreadCounts["ALL"]}
                  </span>
                )}
              </button>

              {onlineUsers.map(u => {
                if (u.email === chatUser.email) return null;
                const isActive = currentChatTarget === u.email;
                const unread = unreadCounts[u.email] || 0;

                return (
                  <button
                    key={u.email}
                    onClick={() => setChatTarget(u.email)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all ${isActive ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10' : 'text-slate-600 hover:bg-slate-200/60'}`}
                  >
                    <img src={u.picture || "https://ui-avatars.com/api/?name=User"} className="w-5 h-5 rounded-full border border-slate-200" alt="avatar" />
                    <span className="flex-1 text-left truncate">{u.name}</span>
                    {unread > 0 && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-500 text-white rounded-full font-bold">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHAT WINDOW RIGHT */}
          <div className="flex-1 flex flex-col justify-between bg-white relative min-w-0">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800 truncate pr-2">
                {currentChatTarget === "ALL" ? "🌍 Team Chat" : `💬 Private: ${onlineUsers.find(u => u.email === currentChatTarget)?.name || "User"}`}
              </span>
              <button onClick={() => toggleWidget(false)} className="text-slate-400 hover:text-rose-500 font-bold text-lg cursor-pointer px-1.5 shrink-0">
                &times;
              </button>
            </div>

            <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30">
              {currentHistory.length === 0 ? (
                <div className="text-center text-slate-400 text-xs italic pt-8">
                  {currentChatTarget === "ALL" ? "Start a group chat..." : "Start a private conversation..."}
                </div>
              ) : (
                currentHistory.map((msg, i) => {
                  const isMyMsg = msg.user?.email === chatUser.email;
                  const isPrivate = currentChatTarget !== "ALL";

                  return (
                    <div key={i} className={`flex gap-2 max-w-[85%] ${isMyMsg ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      {!isMyMsg && (
                        <img src={msg.user?.picture || "https://ui-avatars.com/api/?name=User"} className="w-7 h-7 rounded-full border border-slate-200 shrink-0 mt-0.5" alt="avatar" />
                      )}

                      <div className="space-y-0.5 flex flex-col min-w-0">
                        {!isMyMsg && <span className="text-[10px] text-slate-400 font-bold ml-1">{msg.user?.name}</span>}

                        {msg.replyTo && (
                          <div className="bg-slate-100 border-l-2 border-slate-400 p-1.5 text-[10px] text-slate-500 rounded-t-lg break-words line-clamp-2 w-full">
                            <strong>{msg.replyTo.user.name}</strong>: {msg.replyTo.text}
                          </div>
                        )}

                        <div className={`flex items-center gap-1.5 group ${isMyMsg ? 'flex-row-reverse' : ''}`}>
                          <div className={`px-3 py-2 text-xs font-medium rounded-2xl shadow-2xs break-words max-w-sm leading-relaxed ${isMyMsg
                            ? (isPrivate ? 'bg-purple-600 text-white rounded-br-none' : 'bg-teal-600 text-white rounded-br-none')
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}>
                            {msg.text}
                          </div>

                          <button onClick={() => setReplyingTo(msg)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-teal-600 transition-opacity p-1 cursor-pointer shrink-0" title="Reply">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {replyingTo && (
              <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-600 min-w-0 gap-2">
                <span className="break-words line-clamp-1 flex-1">
                  Responding to <strong>{replyingTo.user.name}</strong>: {replyingTo.text}
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-rose-500 font-bold text-sm cursor-pointer shrink-0">&times;</button>
              </div>
            )}

            <div className="p-3 border-t border-slate-100 flex gap-2 bg-white">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:border-teal-500 shadow-2xs"
              />
              <button onClick={handleSendMessage} className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md cursor-pointer transition-colors shrink-0">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOAST NOTIFICATION CONTAINER (UPGRADED) */}
      <div
        className={`fixed ${toastPosition} z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm max-h-[75vh] overflow-hidden`}
      >
        {/* 👉 Chỉ render tối đa 4 tin nhắn mới nhất để không bao giờ tràn vỡ màn hình chiều dọc */}
        {toasts.slice(-4).map(t => (
          <div
            key={t.id}
            className="bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold px-4 py-3 rounded-xl border border-slate-800 shadow-2xl animate-[slideInRight_0.25s_ease-out] transition-all pointer-events-auto leading-normal break-words max-h-24 overflow-y-auto no-scrollbar line-clamp-3"
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
});

export default ChatWidget;
