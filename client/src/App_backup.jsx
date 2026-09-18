import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

function App() {
  const [isSignup, setIsSignup] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [users, setUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [newMessage, setNewMessage] = useState("")

  // WhatsApp-style delete UI state
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [deleteMenuPosition, setDeleteMenuPosition] = useState({ x: 0, y: 0 })

  // WhatsApp-style reply state
  const [replyingTo, setReplyingTo] = useState(null)

  // Message action states
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editText, setEditText] = useState("")
  const [forwardTargetId, setForwardTargetId] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setCconfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showCconfirmPassword, setShowCconfirmPassword] = useState(false)

  // =========================
  // USERS
  // =========================
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  })
}, [selectedChat?.messages])

useEffect(() => {
  const savedToken = localStorage.getItem("token")
  const savedUser = localStorage.getItem("user")

  if (savedToken && savedUser) {
    const user = JSON.parse(savedUser)

    setLoggedInUser(user)
    setIsLoggedIn(true)

    socket.emit("user_online", user.id)
  }
}, [])

  useEffect(() => {
    if (!isLoggedIn) return

    const token = localStorage.getItem("token")

    if (!token) {
      setUsers([])
      return
    }

    fetch("http://localhost:5000/api/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Unable to fetch users")
        }

        return data
      })
      .then((data) => {
        console.log("Real users:", data)
        setUsers(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        console.log("Users fetch error:", error.message)
        setUsers([])
      })
  }, [isLoggedIn])

  // =========================
  // DELETE FOR EVERYONE SOCKET
  // =========================
  useEffect(() => {
    const handleMessageDeletedForEveryone = (data) => {
      setSelectedChat((prevChat) => {
        if (!prevChat) return prevChat

        return {
          ...prevChat,
          messages: prevChat.messages.map((msg) => {
            const updatedReply =
              msg.replyTo?.id === data.messageId
                ? {
                    ...msg.replyTo,
                    text: "This message was deleted",
                    deletedForEveryone: true,
                  }
                : msg.replyTo

            if (msg.id === data.messageId) {
              return {
                ...msg,
                text: "This message was deleted",
                deletedForEveryone: true,
                replyTo: updatedReply,
              }
            }

            return {
              ...msg,
              replyTo: updatedReply,
            }
          }),
        }
      })
    }

    socket.on(
      "message_deleted_for_everyone",
      handleMessageDeletedForEveryone
    )

    return () => {
      socket.off(
        "message_deleted_for_everyone",
        handleMessageDeletedForEveryone
      )
    }
  }, [])

  // =========================
  // EDIT / REACTION SOCKETS
  // =========================
  useEffect(() => {
    const handleMessageEdited = (data) => {
      setSelectedChat((prevChat) => {
        if (!prevChat) return prevChat

        return {
          ...prevChat,
          messages: prevChat.messages.map((msg) => {
            const updatedReply =
              msg.replyTo?.id === data.messageId
                ? { ...msg.replyTo, text: data.text }
                : msg.replyTo

            if (msg.id === data.messageId) {
              return {
                ...msg,
                text: data.text,
                edited: true,
                editedAt: data.editedAt || new Date().toISOString(),
                replyTo: updatedReply,
              }
            }

            return { ...msg, replyTo: updatedReply }
          }),
        }
      })
    }

    const handleReactionUpdated = (data) => {
      setSelectedChat((prevChat) => {
        if (!prevChat) return prevChat

        return {
          ...prevChat,
          messages: prevChat.messages.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, reactions: data.reactions || [] }
              : msg
          ),
        }
      })
    }

    socket.on("message_edited", handleMessageEdited)
    socket.on("message_reaction_updated", handleReactionUpdated)

    return () => {
      socket.off("message_edited", handleMessageEdited)
      socket.off("message_reaction_updated", handleReactionUpdated)
    }
  }, [])

  // =========================
  // MESSAGE DELIVERED
  // =========================
  useEffect(() => {
    const handleDelivered = async (data) => {
      try {
        await fetch(
          `http://localhost:5000/api/messages/${data.messageId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              status: "delivered",
            }),
          }
        )
      } catch (error) {
        console.log("Delivered status update error:", error)
      }

      setSelectedChat((prevChat) => {
        if (!prevChat) return prevChat

        return {
          ...prevChat,
          messages: prevChat.messages.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, status: "delivered" }
              : msg
          ),
        }
      })
    }

    socket.on("message_delivered", handleDelivered)

    return () => {
      socket.off("message_delivered", handleDelivered)
    }
  }, [])

  // =========================
  // MESSAGE READ
  // =========================
  useEffect(() => {
    const handleMessagesRead = async (data) => {
      try {
        const chat = selectedChat

        if (chat) {
          const myUnreadMessages = chat.messages.filter(
            (msg) => msg.sender === "me" && msg.status !== "read"
          )

          await Promise.all(
            myUnreadMessages.map((msg) =>
              fetch(
                `http://localhost:5000/api/messages/${msg.id}/status`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    status: "read",
                  }),
                }
              )
            )
          )
        }
      } catch (error) {
        console.log("Read status update error:", error)
      }

      setSelectedChat((prevChat) => {
        if (!prevChat || prevChat.id !== data.reader) {
          return prevChat
        }

        return {
          ...prevChat,
          messages: prevChat.messages.map((msg) =>
            msg.sender === "me" ? { ...msg, status: "read" } : msg
          ),
        }
      })
    }

    socket.on("messages_read", handleMessagesRead)

    return () => {
      socket.off("messages_read", handleMessagesRead)
    }
  }, [selectedChat])

  // =========================
  // TYPING
  // =========================
  useEffect(() => {
    const handleTyping = (data) => {
      if (
        selectedChat &&
        data.sender === selectedChat.id &&
        data.receiver === loggedInUser?.id
      ) {
        setIsTyping(true)
      }
    }

    const handleStopTyping = (data) => {
      if (
        selectedChat &&
        data.sender === selectedChat.id &&
        data.receiver === loggedInUser?.id
      ) {
        setIsTyping(false)
      }
    }

    socket.on("typing", handleTyping)
    socket.on("stop_typing", handleStopTyping)

    return () => {
      socket.off("typing", handleTyping)
      socket.off("stop_typing", handleStopTyping)
    }
  }, [selectedChat, loggedInUser])

  // =========================
  // ONLINE USERS
  // =========================
  useEffect(() => {
    const handleOnlineUsers = (onlineUserIds) => {
      setOnlineUsers(onlineUserIds)
    }

    socket.on("online_users", handleOnlineUsers)

    return () => {
      socket.off("online_users", handleOnlineUsers)
    }
  }, [])

  // =========================
  // RECEIVE MESSAGE
  // =========================
  useEffect(() => {
    const handleReceiveMessage = (data) => {
      if (data.receiver !== loggedInUser?.id) {
        return
      }

      if (selectedChat && data.sender === selectedChat.id) {
        const receivedMsg = {
          id: data.messageId,
          text: data.text,
          sender: "other",
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || "delivered",
          deletedForEveryone: false,
          edited: data.edited || false,
          editedAt: data.editedAt || null,
          reactions: (data.reactions || []).map((reaction) => ({
            userId: reaction.user?._id || reaction.user,
            emoji: reaction.emoji,
          })),
          forwardedFrom: data.forwardedFrom
            ? {
                id: data.forwardedFrom._id,
                text: data.forwardedFrom.text,
              }
            : null,
          replyTo: data.replyTo
            ? {
                id: data.replyTo.id,
                text: data.replyTo.text,
                sender:
                  data.replyTo.senderId === loggedInUser.id ? "me" : "other",
                deletedForEveryone:
                  data.replyTo.deletedForEveryone || false,
              }
            : null,
        }

        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: [...prevChat.messages, receivedMsg],
          }
        })

        socket.emit("messages_read", {
          reader: loggedInUser.id,
          sender: data.sender,
        })
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.sender]: (prev[data.sender] || 0) + 1,
        }))
      }
    }

    socket.on("receive_message", handleReceiveMessage)

    return () => {
      socket.off("receive_message", handleReceiveMessage)
    }
  }, [selectedChat, loggedInUser])

  // Close the small right-click menu when user clicks elsewhere
  useEffect(() => {
    if (!showDeleteMenu) return

    const closeMenu = () => setShowDeleteMenu(false)
    document.addEventListener("click", closeMenu)

    return () => {
      document.removeEventListener("click", closeMenu)
    }
  }, [showDeleteMenu])

  // =========================
  // SIGNUP
  // =========================
  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setMessage("Please fill all fields")
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setMessage("Account created successfully!")
        setName("")
        setEmail("")
        setPassword("")
        setCconfirmPassword("")
      } else {
        setMessage(data.message)
      }
    } catch (error) {
      setMessage("Server is not running")
    }
  }

  // =========================
  // LOGIN
  // =========================
  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please enter email and password")
      return
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setLoggedInUser(data.user)
        setIsLoggedIn(true)
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        socket.emit("user_online", data.user.id)
        setEmail("")
        setPassword("")
        setMessage("")
      } else {
        setMessage(data.message)
      }
    } catch (error) {
      setMessage("Server is not running")
    }
  }

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) {
      return
    }

    try {
      const response = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          sender: loggedInUser.id,
          receiver: selectedChat.id,
          text: newMessage,
          replyTo: replyingTo?.id || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const newMsg = {
          id: data._id,
          text: data.text,
          sender: "me",
          createdAt: data.createdAt,
          status: data.status,
          deletedForEveryone: false,
          edited: data.edited || false,
          editedAt: data.editedAt || null,
          reactions: data.reactions || [],
          forwardedFrom: data.forwardedFrom || null,
          replyTo: data.replyTo
            ? {
                id: data.replyTo._id,
                text: data.replyTo.text,
                sender:
                  data.replyTo.sender === loggedInUser.id ? "me" : "other",
                deletedForEveryone:
                  data.replyTo.deletedForEveryone || false,
              }
            : replyingTo,
        }

        socket.emit("send_message", {
          messageId: data._id,
          sender: loggedInUser.id,
          receiver: selectedChat.id,
          text: data.text,
          createdAt: data.createdAt,
          status: data.status,
          edited: data.edited || false,
          reactions: [],
          forwardedFrom: data.forwardedFrom
            ? { id: data.forwardedFrom._id, text: data.forwardedFrom.text }
            : null,
          replyTo: data.replyTo
            ? {
                id: data.replyTo._id,
                text: data.replyTo.text,
                senderId: String(data.replyTo.sender),
                deletedForEveryone:
                  data.replyTo.deletedForEveryone || false,
              }
            : replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text,
                senderId:
                  replyingTo.sender === "me"
                    ? loggedInUser.id
                    : selectedChat.id,
                deletedForEveryone:
                  replyingTo.deletedForEveryone || false,
              }
            : null,
        })

        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: [...prevChat.messages, newMsg],
          }
        })

        socket.emit("stop_typing", {
          sender: loggedInUser.id,
          receiver: selectedChat.id,
        })

        setNewMessage("")
        setReplyingTo(null)
      } else {
        console.log("Message send error:", data.message)
      }
    } catch (error) {
      console.log("Server error:", error)
    }
  }

  // =========================
  // REACTION / COPY / FORWARD / EDIT
  // =========================
  const handleCopyMessage = async () => {
    if (!selectedMessage || selectedMessage.deletedForEveryone) return

    try {
      await navigator.clipboard.writeText(selectedMessage.text)
      clearDeleteSelection()
    } catch (error) {
      console.log("Copy message error:", error)
    }
  }

  const handleReaction = async (emoji) => {
    if (!selectedMessage || !selectedChat) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${selectedMessage.id}/reaction`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ emoji }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        const reactions = (data.updatedMessage.reactions || []).map((reaction) => ({
          userId: reaction.user?._id || reaction.user,
          emoji: reaction.emoji,
        }))

        setSelectedChat((prevChat) => ({
          ...prevChat,
          messages: prevChat.messages.map((msg) =>
            msg.id === selectedMessage.id ? { ...msg, reactions } : msg
          ),
        }))

        socket.emit("reaction_message", {
          messageId: selectedMessage.id,
          receiver: selectedMessage.sender === "me" ? selectedChat.id : selectedChat.id,
          reactions,
        })

        setShowReactionPicker(false)
        clearDeleteSelection()
      }
    } catch (error) {
      console.log("Reaction error:", error)
    }
  }

  const openEditMessage = () => {
    if (!selectedMessage || selectedMessage.sender !== "me") return
    setEditText(selectedMessage.text)
    setShowDeleteMenu(false)
    setShowEditModal(true)
  }

  const handleEditMessage = async () => {
    if (!selectedMessage || !editText.trim() || !selectedChat) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${selectedMessage.id}/edit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ text: editText.trim() }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setSelectedChat((prevChat) => ({
          ...prevChat,
          messages: prevChat.messages.map((msg) => {
            const updatedReply =
              msg.replyTo?.id === selectedMessage.id
                ? { ...msg.replyTo, text: data.editedMessage.text }
                : msg.replyTo

            return msg.id === selectedMessage.id
              ? {
                  ...msg,
                  text: data.editedMessage.text,
                  edited: true,
                  editedAt: data.editedMessage.editedAt,
                  replyTo: updatedReply,
                }
              : { ...msg, replyTo: updatedReply }
          }),
        }))

        socket.emit("edit_message", {
          messageId: selectedMessage.id,
          receiver: selectedChat.id,
          text: data.editedMessage.text,
          editedAt: data.editedMessage.editedAt,
        })

        setShowEditModal(false)
        setEditText("")
        clearDeleteSelection()
      }
    } catch (error) {
      console.log("Edit message error:", error)
    }
  }

  const openForwardMessage = () => {
    if (!selectedMessage || selectedMessage.deletedForEveryone) return
    setForwardTargetId("")
    setShowDeleteMenu(false)
    setShowForwardModal(true)
  }

  const handleForwardMessage = async () => {
    if (!selectedMessage || !forwardTargetId) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${selectedMessage.id}/forward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ receiver: forwardTargetId }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        const forwarded = data.forwardedMessage

        socket.emit("send_message", {
          messageId: forwarded._id,
          sender: loggedInUser.id,
          receiver: forwardTargetId,
          text: forwarded.text,
          createdAt: forwarded.createdAt,
          status: forwarded.status,
          forwardedFrom: forwarded.forwardedFrom
            ? {
                id: forwarded.forwardedFrom._id,
                text: forwarded.forwardedFrom.text,
              }
            : { id: selectedMessage.id, text: selectedMessage.text },
          replyTo: null,
        })

        setShowForwardModal(false)
        setForwardTargetId("")
        clearDeleteSelection()
      }
    } catch (error) {
      console.log("Forward message error:", error)
    }
  }

  // =========================
  // WHATSAPP-STYLE REPLY
  // =========================
  const handleReply = () => {
    if (!selectedMessage || selectedMessage.deletedForEveryone) return

    setReplyingTo(selectedMessage)
    clearDeleteSelection()
  }

  // =========================
  // WHATSAPP-STYLE DELETE
  // =========================
  const clearDeleteSelection = () => {
    setSelectedMessage(null)
    setShowDeleteMenu(false)
    setShowDeletePopup(false)
    setShowReactionPicker(false)
  }

  const handleDeleteForMe = async () => {
    if (!selectedMessage || !loggedInUser) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${selectedMessage.id}/delete-for-me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            userId: loggedInUser.id,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: prevChat.messages.filter(
              (msg) => msg.id !== selectedMessage.id
            ),
          }
        })

        clearDeleteSelection()
      } else {
        console.log("Delete for me error:", data.message)
      }
    } catch (error) {
      console.log("Delete for me error:", error)
    }
  }

  const handleDeleteForEveryone = async () => {
    if (!selectedMessage || !loggedInUser || !selectedChat) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${selectedMessage.id}/delete-for-everyone`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            userId: loggedInUser.id,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: prevChat.messages.map((msg) => {
              const updatedReply =
                msg.replyTo?.id === selectedMessage.id
                  ? {
                      ...msg.replyTo,
                      text: "This message was deleted",
                      deletedForEveryone: true,
                    }
                  : msg.replyTo

              if (msg.id === selectedMessage.id) {
                return {
                  ...msg,
                  text: "This message was deleted",
                  deletedForEveryone: true,
                  replyTo: updatedReply,
                }
              }

              return {
                ...msg,
                replyTo: updatedReply,
              }
            }),
          }
        })

        socket.emit("delete_for_everyone", {
          messageId: selectedMessage.id,
          sender: loggedInUser.id,
          receiver: selectedChat.id,
        })

        clearDeleteSelection()
      } else {
        console.log("Delete for everyone error:", data.message)
      }
    } catch (error) {
      console.log("Delete for everyone error:", error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  // =========================
  // LOGGED IN DASHBOARD
  // =========================
  if (isLoggedIn) {
    return (
      <div className="h-screen bg-gray-100 flex flex-col">
        {/* HEADER */}
        <div className="h-16 bg-white border-b flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold text-blue-600">💬 NexChat</h1>

          <div className="flex items-center gap-5">
            <span className="text-xl cursor-pointer">🔔</span>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                {loggedInUser.name.charAt(0).toUpperCase()}
              </div>

              <span className="font-medium">{loggedInUser.name}</span>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR */}
          <div className="w-80 bg-white border-r flex flex-col">
            {/* SEARCH */}
            <div className="p-4">
              <input
                type="text"
                placeholder="🔍 Search users..."
                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="px-4">
              <h2 className="font-semibold text-gray-700 mb-3">Users</h2>
              <p className="text-sm text-gray-500 mb-3">
                {users.length} registered users
              </p>
            </div>

            {/* CHAT LIST */}
            <div className="flex-1 overflow-y-auto">
              {users
                .filter((user) => user._id !== loggedInUser.id)
                .map((user) => (
                  <div
                    key={user._id}
                    onClick={async () => {
                      clearDeleteSelection()
                      setReplyingTo(null)

                      setUnreadCounts((prev) => ({
                        ...prev,
                        [user._id]: 0,
                      }))

                      try {
                        const response = await fetch(
                          `http://localhost:5000/api/messages/${loggedInUser.id}/${user._id}`,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                            },
                          }
                        )

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.message || "Unable to load chat")
                        }

                        const safeMessages = Array.isArray(data) ? data : []

                        const formattedMessages = safeMessages.map((msg) => ({
                          id: msg._id,
                          text: msg.text,
                          sender:
                            msg.sender === loggedInUser.id ? "me" : "other",
                          createdAt: msg.createdAt,
                          status: msg.status,
                          deletedForEveryone: msg.deletedForEveryone || false,
                          edited: msg.edited || false,
                          editedAt: msg.editedAt || null,
                          reactions: (msg.reactions || []).map((reaction) => ({
                            userId: reaction.user?._id || reaction.user,
                            emoji: reaction.emoji,
                          })),
                          forwardedFrom: msg.forwardedFrom
                            ? {
                                id: msg.forwardedFrom._id,
                                text: msg.forwardedFrom.text,
                              }
                            : null,
                          replyTo: msg.replyTo
                            ? {
                                id: msg.replyTo._id,
                                text: msg.replyTo.text,
                                sender:
                                  msg.replyTo.sender === loggedInUser.id
                                    ? "me"
                                    : "other",
                                deletedForEveryone:
                                  msg.replyTo.deletedForEveryone || false,
                              }
                            : null,
                        }))

                        setSelectedChat({
                          id: user._id,
                          name: user.name,
                          email: user.email,
                          color: "bg-blue-500",
                          messages: formattedMessages,
                        })

                        socket.emit("messages_read", {
                          reader: loggedInUser.id,
                          sender: user._id,
                        })
                      } catch (error) {
                        console.log("Chat history error:", error)
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                      selectedChat?.id === user._id
                        ? "bg-blue-50"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-11 h-11 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>

                      {unreadCounts[user._id] > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs text-white bg-blue-600 rounded-full mt-1">
                          {unreadCounts[user._id]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* BOTTOM */}
            <div className="border-t">
              <button className="w-full text-left px-5 py-4 hover:bg-gray-100">
                ⚙️ Settings
              </button>

              <button
                onClick={() => {
                  clearDeleteSelection()
                  setReplyingTo(null)
                  setIsLoggedIn(false)
                  setLoggedInUser(null)
                  setSelectedChat(null)
                  localStorage.removeItem("token")
                  localStorage.removeItem("user")
                }}
                className="w-full text-left px-5 py-4 text-red-500 hover:bg-red-50"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 flex flex-col relative">
            {selectedChat ? (
              <>
                {/* CHAT HEADER */}
                <div className="h-16 bg-white border-b flex items-center px-5">
                  <button
                    onClick={() => {
                      clearDeleteSelection()
                      setReplyingTo(null)
                      setSelectedChat(null)
                    }}
                    className="text-2xl mr-4 hover:text-blue-600"
                  >
                    ←
                  </button>

                  <div
                    className={`w-10 h-10 ${selectedChat.color} text-white rounded-full flex items-center justify-center font-bold mr-3`}
                  >
                    {selectedChat.name.charAt(0)}
                  </div>

                  <div>
                    <h2 className="font-semibold">{selectedChat.name}</h2>

                    <p
                      className={`text-sm ${
                        isTyping
                          ? "text-blue-500"
                          : onlineUsers.includes(selectedChat.id)
                          ? "text-green-500"
                          : "text-gray-500"
                      }`}
                    >
                      {isTyping
                        ? `${selectedChat.name} is typing...`
                        : onlineUsers.includes(selectedChat.id)
                        ? "🟢 Online"
                        : "⚫ Offline"}
                    </p>
                  </div>
                </div>

                {/* MESSAGES */}
                <div
                  className="flex-1 bg-gray-50 p-6 overflow-y-auto"
                  onClick={() => {
                    if (showDeleteMenu) {
                      setShowDeleteMenu(false)
                    }
                  }}
                >
                  <div className="flex flex-col gap-4">
                    {selectedChat.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender === "me" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          onContextMenu={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedMessage(msg)
                            setDeleteMenuPosition({
                              x: Math.min(e.clientX, window.innerWidth - 180),
                              y: Math.min(e.clientY, window.innerHeight - 100),
                            })
                            setShowDeleteMenu(true)
                            setShowDeletePopup(false)
                          }}
                          className={`relative max-w-xs px-4 py-3 rounded-2xl transition ${
                            msg.sender === "me"
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white text-gray-800 shadow-sm rounded-bl-none"
                          } ${
                            selectedMessage?.id === msg.id
                              ? "ring-2 ring-blue-400 ring-offset-2"
                              : ""
                          }`}
                        >
                          {msg.forwardedFrom && !msg.deletedForEveryone && (
                            <p className={`text-[11px] mb-1 italic ${
                              msg.sender === "me" ? "text-blue-100" : "text-gray-500"
                            }`}>
                              ↪ Forwarded
                            </p>
                          )}

                          {msg.replyTo && (
                            <div
                              className={`mb-2 rounded-lg border-l-4 px-3 py-2 text-xs ${
                                msg.sender === "me"
                                  ? "bg-blue-500/60 border-blue-200 text-blue-50"
                                  : "bg-gray-100 border-blue-500 text-gray-600"
                              }`}
                            >
                              <p className="font-semibold mb-0.5">
                                {msg.replyTo.sender === "me" ? "You" : selectedChat.name}
                              </p>
                              <p className="truncate max-w-[220px]">
                                {msg.replyTo.deletedForEveryone
                                  ? "This message was deleted"
                                  : msg.replyTo.text}
                              </p>
                            </div>
                          )}

                          <p
                            className={
                              msg.deletedForEveryone
                                ? "italic opacity-80"
                                : ""
                            }
                          >
                            {msg.text}
                          </p>

                          <p
                            className={`text-[10px] mt-1 text-right ${
                              msg.sender === "me"
                                ? "text-blue-100"
                                : "text-gray-400"
                            }`}
                          >
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}

                            {msg.edited && !msg.deletedForEveryone && (
                              <span className="ml-1 opacity-80">edited</span>
                            )}

                            {msg.sender === "me" && (
                              <span
                                className={`ml-1 ${
                                  msg.status === "read"
                                    ? "text-cyan-300"
                                    : "text-blue-100"
                                }`}
                              >
                                {msg.status === "sent" ? "✓" : "✓✓"}
                              </span>
                            )}
                          </p>

                          {(msg.reactions || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(
                                (msg.reactions || []).reduce((acc, reaction) => {
                                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
                                  return acc
                                }, {})
                              ).map(([emoji, count]) => (
                                <span
                                  key={emoji}
                                  className={`text-xs px-2 py-0.5 rounded-full border ${
                                    msg.sender === "me"
                                      ? "bg-blue-500 border-blue-300 text-white"
                                      : "bg-gray-100 border-gray-200 text-gray-700"
                                  }`}
                                >
                                  {emoji} {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* SELECTED MESSAGE BOTTOM BAR */}
                {selectedMessage && !showDeletePopup && !showDeleteMenu && (
                  <div className="h-14 bg-white border-t flex items-center justify-between px-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={clearDeleteSelection}
                        className="text-xl text-gray-600 hover:text-gray-900"
                        title="Cancel selection"
                      >
                        ✕
                      </button>

                      <span className="text-sm font-medium text-gray-700">
                        1 message selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!selectedMessage.deletedForEveryone && (
                        <>
                          <button onClick={handleReply} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Reply">↩️</button>
                          <button onClick={handleCopyMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Copy">📋</button>
                          <button onClick={openForwardMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Forward">➡️</button>
                          <button onClick={() => setShowReactionPicker(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="React">😊</button>
                          {selectedMessage.sender === "me" && (
                            <button onClick={openEditMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Edit">✏️</button>
                          )}
                        </>
                      )}

                      <button onClick={() => setShowDeletePopup(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Delete">🗑️</button>
                    </div>
                  </div>
                )}

                {/* MESSAGE INPUT */}
                {!selectedMessage && (
                  <div className="bg-white border-t">
                    {replyingTo && (
                      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-gray-100 border-l-4 border-blue-500 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-600">
                            {replyingTo.sender === "me" ? "You" : selectedChat.name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {replyingTo.text}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="text-gray-500 hover:text-gray-800 text-lg"
                          title="Cancel reply"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="h-16 flex items-center px-4 gap-3">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)

                        socket.emit("typing", {
                          sender: loggedInUser.id,
                          receiver: selectedChat.id,
                        })

                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current)
                        }

                        typingTimeoutRef.current = setTimeout(() => {
                          socket.emit("stop_typing", {
                            sender: loggedInUser.id,
                            receiver: selectedChat.id,
                          })
                        }, 1000)
                      }}
                      onBlur={() => {
                        socket.emit("stop_typing", {
                          sender: loggedInUser.id,
                          receiver: selectedChat.id,
                        })
                      }}
                      onKeyDown={handleKeyDown}
                      className="flex-1 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      onClick={handleSendMessage}
                      className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700"
                    >
                      ➤ Send
                    </button>
                    </div>
                  </div>
                )}

                {/* RIGHT CLICK MENU */}
                {selectedMessage && showDeleteMenu && (
                  <div
                    className="fixed z-[100] w-44 bg-white rounded-lg shadow-2xl border py-2 overflow-hidden"
                    style={{
                      left: deleteMenuPosition.x,
                      top: deleteMenuPosition.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!selectedMessage.deletedForEveryone && (
                      <button
                        onClick={handleReply}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
                      >
                        <span>↩️</span>
                        <span>Reply</span>
                      </button>
                    )}

                    {!selectedMessage.deletedForEveryone && (
                      <>
                        <button onClick={() => { setShowDeleteMenu(false); setShowReactionPicker(true) }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>😊</span><span>React</span></button>
                        <button onClick={handleCopyMessage} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>📋</span><span>Copy</span></button>
                        <button onClick={openForwardMessage} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>➡️</span><span>Forward</span></button>
                        {selectedMessage.sender === "me" && (
                          <button onClick={openEditMessage} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>✏️</span><span>Edit</span></button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => {
                        setShowDeleteMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  </div>
                )}

                {/* REACTION PICKER */}
                {selectedMessage && showReactionPicker && (
                  <div className="fixed inset-0 z-[180] bg-black/20 flex items-center justify-center px-4" onClick={() => setShowReactionPicker(false)}>
                    <div className="bg-white rounded-full shadow-2xl border px-4 py-3 flex gap-3" onClick={(e) => e.stopPropagation()}>
                      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                        <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition">{emoji}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDIT MODAL */}
                {selectedMessage && showEditModal && (
                  <div className="fixed inset-0 z-[190] bg-black/35 flex items-center justify-center px-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
                      <h3 className="text-lg font-semibold mb-3">Edit message</h3>
                      <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleEditMessage() }} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                      <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => { setShowEditModal(false); setEditText(""); clearDeleteSelection() }} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button onClick={handleEditMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* FORWARD MODAL */}
                {selectedMessage && showForwardModal && (
                  <div className="fixed inset-0 z-[190] bg-black/35 flex items-center justify-center px-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                      <div className="p-5 border-b"><h3 className="text-lg font-semibold">Forward message</h3></div>
                      <div className="max-h-80 overflow-y-auto">
                        {users.filter((user) => user._id !== loggedInUser.id).map((user) => (
                          <label key={user._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="forwardTarget" value={user._id} checked={forwardTargetId === user._id} onChange={() => setForwardTargetId(user._id)} />
                            <div className="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">{user.name.charAt(0).toUpperCase()}</div>
                            <div><p className="font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                          </label>
                        ))}
                      </div>
                      <div className="p-4 border-t flex justify-end gap-3">
                        <button onClick={() => { setShowForwardModal(false); setForwardTargetId(""); clearDeleteSelection() }} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button disabled={!forwardTargetId} onClick={handleForwardMessage} className="px-4 py-2 bg-blue-600 disabled:bg-blue-300 text-white rounded-lg">Forward</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DELETE POPUP */}
                {selectedMessage && showDeletePopup && (
                  <div className="fixed inset-0 z-[200] bg-black/35 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-6 pt-6 pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Delete message?
                        </h3>
                      </div>

                      <div className="flex flex-col">
                        {selectedMessage.sender === "me" &&
                          !selectedMessage.deletedForEveryone && (
                            <button
                              onClick={handleDeleteForEveryone}
                              className="px-6 py-3 text-right text-blue-600 font-medium hover:bg-gray-50"
                            >
                              Delete for everyone
                            </button>
                          )}

                        <button
                          onClick={handleDeleteForMe}
                          className="px-6 py-3 text-right text-blue-600 font-medium hover:bg-gray-50"
                        >
                          Delete for me
                        </button>

                        <button
                          onClick={() => setShowDeletePopup(false)}
                          className="px-6 py-3 mb-2 text-right text-blue-600 font-medium hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* WELCOME SCREEN */
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>

                  <h2 className="text-2xl font-bold text-gray-700 mb-2">
                    Welcome to NexChat 👋
                  </h2>

                  <p className="text-gray-500">
                    Select a conversation to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // LOGIN / SIGNUP
  // =========================
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          NexChat
        </h1>

        <p className="text-center text-gray-500 mb-6">
          {isSignup ? "Create your account" : "Welcome back"}
        </p>

        {isSignup && (
          <input
            type="text"
            placeholder="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
          />
        )}

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={isSignup ? "Create Password" : "Enter Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 pr-12 rounded-lg"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-500"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {isSignup && (
          <div className="relative mb-4">
            <input
              type={showCconfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setCconfirmPassword(e.target.value)}
              className="w-full border p-3 pr-12 rounded-lg"
            />

            <button
              type="button"
              onClick={() =>
                setShowCconfirmPassword(!showCconfirmPassword)
              }
              className="absolute right-3 top-3 text-gray-500"
            >
              {showCconfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
        )}

        <button
          onClick={isSignup ? handleSignup : handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          {isSignup ? "Create Account" : "Login"}
        </button>

        {message && (
          <p className="text-center mt-4 text-blue-600">{message}</p>
        )}

        <p className="text-center mt-5 text-gray-600">
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage("")
              setPassword("")
              setCconfirmPassword("")
            }}
            className="text-blue-600 ml-1 hover:underline"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  )
}

export default App
