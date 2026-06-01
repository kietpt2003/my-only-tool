// 👉 Thêm runInAction vào danh sách import từ 'mobx'
import { action, makeAutoObservable, runInAction } from 'mobx';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.CHAT_SOCKET;

export interface ChatUser {
  email: string;
  name: string;
  picture?: string;
}

export interface Message {
  id?: string;
  user: ChatUser;
  text: string;
  replyTo?: Message | null;
  toEmail?: string;
}

export interface ToastItem {
  id: string;
  message: string;
}

export class ChatStore {
  socket: Socket | null = null;
  isWidgetHidden: boolean = true;
  currentChatTarget: string = "ALL";
  onlineUsers: ChatUser[] = [];
  replyingTo: Message | null = null;
  toasts: ToastItem[] = [];

  chatHistory: Record<string, Message[]> = { ALL: [] };
  unreadCounts: Record<string, number> = { ALL: 0 };

  constructor() {
    makeAutoObservable(this, {
      addToast: action.bound,
      saveToStorage: action.bound,
      initSocket: action.bound,
      disconnect: action.bound,
      toggleWidget: action.bound,
      setChatTarget: action.bound,
      setReplyingTo: action.bound,
      sendMessage: action.bound,
    });

    if (typeof window !== 'undefined') {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries.length > 0 && navEntries[0].type === "reload") {
        sessionStorage.removeItem("chatAppHistory");
        sessionStorage.removeItem("chatUnreadCounts");
      } else {
        const savedHistory = sessionStorage.getItem("chatAppHistory");
        const savedUnread = sessionStorage.getItem("chatUnreadCounts");
        if (savedHistory) this.chatHistory = JSON.parse(savedHistory);
        if (savedUnread) this.unreadCounts = JSON.parse(savedUnread);
      }
    }
  }

  saveToStorage() {
    sessionStorage.setItem("chatAppHistory", JSON.stringify(this.chatHistory));
    sessionStorage.setItem("chatUnreadCounts", JSON.stringify(this.unreadCounts));
  }

  initSocket(user: ChatUser) {
    if (this.socket || !user?.email) return;

    this.socket = io(SERVER_URL);

    this.socket.on("connect", () => {
      this.socket?.emit("user_joined", user);
    });

    // 👉 Bọc runInAction cho callback update_online_users
    this.socket.on("update_online_users", (usersArray: ChatUser[]) => {
      runInAction(() => {
        this.onlineUsers = usersArray;
      });
    });

    this.socket.on("announce_new_user", (u: ChatUser) => {
      if (u && u.email !== user.email) {
        this.addToast(`${u.name} is online. You can chat with each other.`);
      }
    });

    // 👉 Bọc runInAction cho callback receive_message
    this.socket.on("receive_message", (data: Message) => {
      runInAction(() => {
        if (!this.chatHistory.ALL) this.chatHistory.ALL = [];
        this.chatHistory.ALL.push(data);

        if (this.isWidgetHidden || this.currentChatTarget !== "ALL") {
          this.unreadCounts.ALL = (this.unreadCounts.ALL || 0) + 1;
          this.addToast(`Group message from ${data.user.name}: ${data.text}`);
        }
        this.saveToStorage();
      });
    });

    // 👉 Bọc runInAction cho callback receive_private_message
    this.socket.on("receive_private_message", (data: Message) => {
      runInAction(() => {
        const isMeSender = data.user.email === user.email;
        const partner = isMeSender ? data.toEmail! : data.user.email;

        if (!this.chatHistory[partner]) this.chatHistory[partner] = [];
        this.chatHistory[partner].push(data);

        if (this.isWidgetHidden || this.currentChatTarget !== partner) {
          this.unreadCounts[partner] = (this.unreadCounts[partner] || 0) + 1;
          this.addToast(`${data.user.name} sent you a private message: ${data.text}`);
        }
        this.saveToStorage();
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  toggleWidget(isOpen: boolean) {
    this.isWidgetHidden = !isOpen;
    if (isOpen) {
      this.unreadCounts[this.currentChatTarget] = 0;
      this.saveToStorage();
    }
  }

  setChatTarget(email: string) {
    this.currentChatTarget = email;
    this.unreadCounts[email] = 0;
    this.saveToStorage();
  }

  setReplyingTo(msg: Message | null) {
    this.replyingTo = msg;
  }

  addToast(message: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.push({ id, message });

    // 👉 Tương tự sự kiện mạng, setTimeout cũng là bất đồng bộ nên bắt buộc phải bọc runInAction
    setTimeout(() => {
      runInAction(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      });
    }, 4000);
  }

  sendMessage(text: string, user: ChatUser) {
    if (!text.trim() || !this.socket) return;

    const payload: Message = {
      user,
      text: text.trim(),
      replyTo: this.replyingTo,
    };

    if (this.currentChatTarget === "ALL") {
      this.socket.emit("send_message", payload);
    } else {
      payload.toEmail = this.currentChatTarget;
      this.socket.emit("send_private_message", payload);
    }
    this.replyingTo = null;
  }

  get totalUnread() {
    return Object.values(this.unreadCounts).reduce((a, b) => a + b, 0);
  }
}
