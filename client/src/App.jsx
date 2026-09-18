import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import nexchatLogo from "./assets/nexchat-logo.png"

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
  // =========================
  // CHAT LOCK
  // =========================
  const [chatLockHasPin, setChatLockHasPin] = useState(false)
  const [lockedChatIds, setLockedChatIds] = useState([])
  const [sessionUnlockedChatIds, setSessionUnlockedChatIds] = useState([])
  const [showChatLockModal, setShowChatLockModal] = useState(false)
  const [chatLockMode, setChatLockMode] = useState("")
  const [chatLockPin, setChatLockPin] = useState("")
  const [chatLockConfirmPin, setChatLockConfirmPin] = useState("")
  const [chatLockTarget, setChatLockTarget] = useState(null)
  const [chatLockError, setChatLockError] = useState("")
  const [chatLockLoading, setChatLockLoading] = useState(false)
  const [showChatLockPin, setShowChatLockPin] = useState(false)
  const [chatLockForgotOtp, setChatLockForgotOtp] = useState("")
  const [chatLockNewPin, setChatLockNewPin] = useState("")
  const [chatLockConfirmNewPin, setChatLockConfirmNewPin] = useState("")
  const [showContactDetails, setShowContactDetails] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [secretMessageMode, setSecretMessageMode] = useState(() => localStorage.getItem("nexchat_secret_mode") === "true")
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendLookupId, setFriendLookupId] = useState("")
  const [friendSearchResult, setFriendSearchResult] = useState(null)
  const [friendSearchStatus, setFriendSearchStatus] = useState("")
  const [friendRequests, setFriendRequests] = useState([])
  const [friendActionLoading, setFriendActionLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileAbout, setProfileAbout] = useState("")
  const [profileFile, setProfileFile] = useState(null)
  const [profilePreview, setProfilePreview] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const profileFileInputRef = useRef(null)
  const [revealedSecretMessages, setRevealedSecretMessages] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  // WhatsApp-style delete UI state
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [selectedMessageIds, setSelectedMessageIds] = useState([])
  const [multiSelectMode, setMultiSelectMode] = useState(false)
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
  // FORGOT PASSWORD
  // =========================
  const [authView, setAuthView] = useState("main")
  const [resetEmail, setResetEmail] = useState("")
  const [resetOtp, setResetOtp] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const [resetConfirmPassword, setResetConfirmPassword] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)

  // =========================
  // WEBRTC CALL STATE
  // =========================
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callHistory, setCallHistory] = useState([])
  const callLogIdRef = useRef(null)
  const callDurationRef = useRef(0)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pendingIceCandidatesRef = useRef([])
  const callTargetRef = useRef(null)
  const callTypeRef = useRef(null)
  const callTimerRef = useRef(null)
  const ringtoneAudioContextRef = useRef(null)
  const ringtoneIntervalRef = useRef(null)
  const ringtoneOscillatorsRef = useRef([])
  const ringbackAudioContextRef = useRef(null)
  const ringbackIntervalRef = useRef(null)
  const ringbackOscillatorsRef = useRef([])

  const getProfileImageUrl = (value) => {
    if (!value) return ""
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    return `http://localhost:5000${value}`
  }

  const refreshUsers = async () => {
    const token = sessionStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch("http://localhost:5000/api/users/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to fetch users")
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log("Users fetch error:", error.message)
    }
  }

  const refreshCurrentUser = async () => {
    const token = sessionStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to fetch profile")

      const nextUser = {
        id: data._id,
        name: data.name,
        email: data.email,
        about: data.about || "",
        profileImage: data.profileImage || "",
        nexchatId: data.nexchatId || "",
        friends: data.friends || [],
        friendRequestsReceived: data.friendRequestsReceived || [],
        friendRequestsSent: data.friendRequestsSent || [],
        blockedUsers: data.blockedUsers || [],
      }

      setLoggedInUser(nextUser)
      sessionStorage.setItem("user", JSON.stringify(nextUser))
    } catch (error) {
      console.log("Current user fetch error:", error.message)
    }
  }

  const refreshChatLockStatus = async () => {
    const token = sessionStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch(
        "http://localhost:5000/api/users/chat-lock/status",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to load Chat Lock")
      }

      setChatLockHasPin(Boolean(data.hasPin))
      setLockedChatIds(Array.isArray(data.lockedChats) ? data.lockedChats : [])
    } catch (error) {
      console.log("Chat Lock status error:", error.message)
    }
  }

  const closeChatLockModal = () => {
    setShowChatLockModal(false)
    setChatLockMode("")
    setChatLockPin("")
    setChatLockConfirmPin("")
    setChatLockTarget(null)
    setChatLockError("")
    setChatLockLoading(false)
    setShowChatLockPin(false)
    setChatLockForgotOtp("")
    setChatLockNewPin("")
    setChatLockConfirmNewPin("")
  }

  const fetchAndOpenConversation = async (user) => {
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
        text: msg.text || "",
        isSecret: msg.isSecret || false,
        attachment: msg.attachment || null,
        sender: msg.sender === loggedInUser.id ? "me" : "other",
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
              text: msg.forwardedFrom.text || "",
              isSecret: msg.forwardedFrom.isSecret || false,
              attachment: msg.forwardedFrom.attachment || null,
            }
          : null,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo._id,
              text: msg.replyTo.text || "",
              isSecret: msg.replyTo.isSecret || false,
              attachment: msg.replyTo.attachment || null,
              sender: msg.replyTo.sender === loggedInUser.id ? "me" : "other",
              deletedForEveryone: msg.replyTo.deletedForEveryone || false,
            }
          : null,
      }))

      setShowContactDetails(false)
      setSelectedChat({
        id: user._id,
        name: user.name,
        email: "",
        nexchatId: user.nexchatId || "",
        about: user.about || "",
        profileImage: user.profileImage || "",
        friends: [],
        blockedUsers: [],
        color: "bg-blue-500",
        messages: formattedMessages,
      })

      // When this conversation is opened later, mark every unread
      // incoming message as read and notify the sender with the exact message ID.
      const unreadIncomingMessages = safeMessages.filter(
        (msg) =>
          msg.sender === user._id &&
          msg.receiver === loggedInUser.id &&
          msg.status !== "read"
      )

      if (unreadIncomingMessages.length > 0) {
        const token = sessionStorage.getItem("token")

        await Promise.all(
          unreadIncomingMessages.map(async (msg) => {
            try {
              const statusResponse = await fetch(
                `http://localhost:5000/api/messages/${msg._id}/status`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    status: "read",
                  }),
                }
              )

              if (statusResponse.ok) {
                socket.emit("messages_read", {
                  reader: loggedInUser.id,
                  sender: user._id,
                  messageId: msg._id,
                })
              }
            } catch (error) {
              console.log("Open-chat read status error:", error)
            }
          })
        )

        setSelectedChat((prevChat) => {
          if (!prevChat || prevChat.id !== user._id) return prevChat

          const readIds = new Set(
            unreadIncomingMessages.map((msg) => String(msg._id))
          )

          return {
            ...prevChat,
            messages: prevChat.messages.map((msg) =>
              readIds.has(String(msg.id))
                ? { ...msg, status: "read" }
                : msg
            ),
          }
        })
      }
    } catch (error) {
      console.log("Chat history error:", error)
    }
  }

  const openConversation = async (user) => {
    const isLocked = lockedChatIds.includes(user._id)
    const unlockedThisSession = sessionUnlockedChatIds.includes(user._id)

    if (isLocked && !unlockedThisSession) {
      setChatLockTarget(user)
      setChatLockMode("open")
      setChatLockPin("")
      setChatLockConfirmPin("")
      setChatLockError("")
      setShowChatLockModal(true)
      return
    }

    await fetchAndOpenConversation(user)
  }

  const handleChatLockButton = async () => {
    if (!selectedChat) return

    const isLocked = lockedChatIds.includes(selectedChat.id)

    setChatLockTarget({
      _id: selectedChat.id,
      name: selectedChat.name,
      nexchatId: selectedChat.nexchatId || "",
      about: selectedChat.about || "",
      profileImage: selectedChat.profileImage || "",
    })
    setChatLockPin("")
    setChatLockConfirmPin("")
    setChatLockError("")

    if (isLocked) {
      setChatLockMode("remove")
      setShowChatLockModal(true)
      return
    }

    if (!chatLockHasPin) {
      setChatLockMode("setup")
      setShowChatLockModal(true)
      return
    }

    try {
      setChatLockLoading(true)

      const response = await fetch(
        `http://localhost:5000/api/users/chat-lock/${selectedChat.id}/lock`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to lock chat")
      }

      setLockedChatIds(Array.isArray(data.lockedChats) ? data.lockedChats : [])
      setSessionUnlockedChatIds((prev) =>
        prev.filter((id) => id !== selectedChat.id)
      )
      setShowContactDetails(false)
      setSelectedChat(null)
    } catch (error) {
      alert(error.message)
    } finally {
      setChatLockLoading(false)
    }
  }

  const startForgotChatLockPin = async () => {
    if (chatLockLoading) return

    const accountEmail = loggedInUser?.email?.trim()

    if (!accountEmail) {
      setChatLockError("Account email is unavailable")
      return
    }

    try {
      setChatLockLoading(true)
      setChatLockError("")

      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: accountEmail,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP")
      }

      setChatLockForgotOtp("")
      setChatLockMode("forgotOtp")
    } catch (error) {
      setChatLockError(error.message || "Unable to send OTP")
    } finally {
      setChatLockLoading(false)
    }
  }

  const verifyForgotChatLockOtp = async () => {
    if (chatLockLoading) return

    if (!/^\d{6}$/.test(chatLockForgotOtp)) {
      setChatLockError("Enter the 6-digit OTP")
      return
    }

    const accountEmail = loggedInUser?.email?.trim()

    if (!accountEmail) {
      setChatLockError("Account email is unavailable")
      return
    }

    try {
      setChatLockLoading(true)
      setChatLockError("")

      const response = await fetch(
        "http://localhost:5000/api/auth/verify-reset-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: accountEmail,
            otp: chatLockForgotOtp,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to verify OTP")
      }

      setChatLockNewPin("")
      setChatLockConfirmNewPin("")
      setChatLockMode("forgotNewPin")
    } catch (error) {
      setChatLockError(error.message || "Unable to verify OTP")
    } finally {
      setChatLockLoading(false)
    }
  }

  const resetForgotChatLockPin = async () => {
    if (chatLockLoading) return

    if (!/^\d{4}$/.test(chatLockNewPin)) {
      setChatLockError("New PIN must be exactly 4 digits")
      return
    }

    if (chatLockNewPin !== chatLockConfirmNewPin) {
      setChatLockError("PINs do not match")
      return
    }

    try {
      setChatLockLoading(true)
      setChatLockError("")

      const response = await fetch(
        "http://localhost:5000/api/users/chat-lock/reset-pin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            newPin: chatLockNewPin,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset Chat Lock PIN")
      }

      setChatLockHasPin(true)

      const target = chatLockTarget
      setSessionUnlockedChatIds((prev) =>
        target && !prev.includes(target._id)
          ? [...prev, target._id]
          : prev
      )

      closeChatLockModal()

      if (target && lockedChatIds.includes(target._id)) {
        await fetchAndOpenConversation(target)
      }
    } catch (error) {
      setChatLockError(error.message || "Unable to reset Chat Lock PIN")
    } finally {
      setChatLockLoading(false)
    }
  }

  const submitChatLock = async () => {
    if (chatLockLoading || !chatLockTarget) return

    if (!/^\d{4}$/.test(chatLockPin)) {
      setChatLockError("Enter a 4-digit PIN")
      return
    }

    if (chatLockMode === "setup" && chatLockPin !== chatLockConfirmPin) {
      setChatLockError("PINs do not match")
      return
    }

    try {
      setChatLockLoading(true)
      setChatLockError("")

      if (chatLockMode === "setup") {
        const pinResponse = await fetch(
          "http://localhost:5000/api/users/chat-lock/set-pin",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
            body: JSON.stringify({ pin: chatLockPin }),
          }
        )

        const pinData = await pinResponse.json()

        if (!pinResponse.ok) {
          throw new Error(pinData.message || "Unable to create PIN")
        }

        const lockResponse = await fetch(
          `http://localhost:5000/api/users/chat-lock/${chatLockTarget._id}/lock`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        )

        const lockData = await lockResponse.json()

        if (!lockResponse.ok) {
          throw new Error(lockData.message || "Unable to lock chat")
        }

        setChatLockHasPin(true)
        setLockedChatIds(
          Array.isArray(lockData.lockedChats) ? lockData.lockedChats : []
        )
        setSessionUnlockedChatIds((prev) =>
          prev.filter((id) => id !== chatLockTarget._id)
        )
        setShowContactDetails(false)
        setSelectedChat(null)
        closeChatLockModal()
        return
      }

      if (chatLockMode === "open") {
        const response = await fetch(
          "http://localhost:5000/api/users/chat-lock/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
            body: JSON.stringify({ pin: chatLockPin }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Incorrect PIN")
        }

        const target = chatLockTarget
        setSessionUnlockedChatIds((prev) =>
          prev.includes(target._id) ? prev : [...prev, target._id]
        )
        closeChatLockModal()
        await fetchAndOpenConversation(target)
        return
      }

      if (chatLockMode === "remove") {
        const response = await fetch(
          `http://localhost:5000/api/users/chat-lock/${chatLockTarget._id}/unlock`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
            body: JSON.stringify({ pin: chatLockPin }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Unable to remove Chat Lock")
        }

        setLockedChatIds(Array.isArray(data.lockedChats) ? data.lockedChats : [])
        setSessionUnlockedChatIds((prev) =>
          prev.filter((id) => id !== chatLockTarget._id)
        )
        closeChatLockModal()
      }
    } catch (error) {
      setChatLockError(error.message)
    } finally {
      setChatLockLoading(false)
    }
  }

  const openProfileEditor = () => {
    setProfileName(loggedInUser?.name || "")
    setProfileAbout(loggedInUser?.about || "")
    setProfileFile(null)
    setProfilePreview("")
    setShowProfileModal(true)
  }

  const handleProfileFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile image must be 5 MB or less")
      return
    }
    if (profilePreview) URL.revokeObjectURL(profilePreview)
    setProfileFile(file)
    setProfilePreview(URL.createObjectURL(file))
  }

  const saveProfile = async () => {
    if (!profileName.trim() || isSavingProfile) return
    try {
      setIsSavingProfile(true)
      const formData = new FormData()
      formData.append("name", profileName.trim())
      formData.append("about", profileAbout.trim())
      if (profileFile) formData.append("profileImage", profileFile)

      const response = await fetch("http://localhost:5000/api/users/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to update profile")

      const nextUser = {
        ...loggedInUser,
        name: data.user.name,
        about: data.user.about || "",
        profileImage: data.user.profileImage || "",
      }
      setLoggedInUser(nextUser)
      sessionStorage.setItem("user", JSON.stringify(nextUser))
      setShowProfileModal(false)
      await refreshUsers()
    } catch (error) {
      alert(error.message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const refreshFriendRequests = async () => {
    const token = sessionStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch("http://localhost:5000/api/users/friend-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to load friend requests")
      setFriendRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log("Friend request fetch error:", error.message)
    }
  }

  const searchFriendByNexChatId = async () => {
    const lookup = friendLookupId.trim().replace(/^@+/, "")
    if (!lookup || friendActionLoading) return

    try {
      setFriendActionLoading(true)
      setFriendSearchResult(null)
      setFriendSearchStatus("Searching...")
      const response = await fetch(`http://localhost:5000/api/users/search/${encodeURIComponent(lookup)}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "User not found")
      setFriendSearchResult({ ...data.user, requestStatus: data.requestStatus || "none" })
      setFriendSearchStatus("")
    } catch (error) {
      setFriendSearchStatus(error.message)
    } finally {
      setFriendActionLoading(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    if (!userId || friendActionLoading) return
    try {
      setFriendActionLoading(true)
      const response = await fetch(`http://localhost:5000/api/users/friend-request/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to send friend request")
      setFriendSearchResult((prev) => prev && prev._id === userId ? { ...prev, requestStatus: data.status || "sent" } : prev)
      setFriendSearchStatus(data.message || "Friend request sent")
      socket.emit("friend_request_sent", {
        to: userId,
        from: loggedInUser?.id,
        fromName: loggedInUser?.name || "NexChat user",
      })
      await refreshCurrentUser()
    } catch (error) {
      setFriendSearchStatus(error.message)
      alert(error.message)
    } finally {
      setFriendActionLoading(false)
    }
  }

  const respondToFriendRequest = async (userId, action) => {
    if (!userId || friendActionLoading) return
    try {
      setFriendActionLoading(true)
      const response = await fetch(`http://localhost:5000/api/users/friend-request/${userId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to update friend request")
      socket.emit("friend_request_response", {
        to: userId,
        from: loggedInUser?.id,
        action,
      })
      await Promise.all([refreshFriendRequests(), refreshCurrentUser(), refreshUsers()])
      setFriendSearchStatus(data.message || "Friend request updated")
    } catch (error) {
      alert(error.message)
    } finally {
      setFriendActionLoading(false)
    }
  }

  const toggleFriend = async (userId) => {
    const isFriend = loggedInUser?.friends?.includes(userId)

    if (!isFriend) {
      await sendFriendRequest(userId)
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/friends/${userId}/remove`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to remove friend")
      const nextUser = {
        ...loggedInUser,
        friends: data.currentUser.friends || [],
        friendRequestsReceived: data.currentUser.friendRequestsReceived || [],
        friendRequestsSent: data.currentUser.friendRequestsSent || [],
      }
      setLoggedInUser(nextUser)
      sessionStorage.setItem("user", JSON.stringify(nextUser))
      await refreshUsers()
    } catch (error) {
      alert(error.message)
    }
  }

  const toggleBlock = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to update block")
      const nextUser = {
        ...loggedInUser,
        friends: data.currentUser.friends || [],
        friendRequestsReceived: data.currentUser.friendRequestsReceived || [],
        friendRequestsSent: data.currentUser.friendRequestsSent || [],
        blockedUsers: data.currentUser.blockedUsers || [],
      }
      setLoggedInUser(nextUser)
      sessionStorage.setItem("user", JSON.stringify(nextUser))
      await refreshUsers()
    } catch (error) {
      alert(error.message)
    }
  }

  // =========================
  // USERS
  // =========================
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  })
}, [selectedChat?.messages])

useEffect(() => {
  const savedToken = sessionStorage.getItem("token")
  const savedUser = sessionStorage.getItem("user")

  if (savedToken && savedUser) {
    const user = JSON.parse(savedUser)

    setLoggedInUser(user)
    setIsLoggedIn(true)

    socket.emit("user_online", user.id)
  }
}, [])

  useEffect(() => {
    if (!isLoggedIn) return
    refreshUsers()
    refreshCurrentUser()
    refreshFriendRequests()
    refreshChatLockStatus()
  }, [isLoggedIn])

  // =========================
  // REAL-TIME FRIEND REQUESTS
  // =========================
  useEffect(() => {
    if (!isLoggedIn || !loggedInUser?.id) return

    const handleFriendRequestReceived = async (data) => {
      if (data?.to && data.to !== loggedInUser.id) return

      await refreshFriendRequests()
      await refreshCurrentUser()
    }

    const handleFriendRequestResponse = async (data) => {
      if (data?.to && data.to !== loggedInUser.id) return

      await Promise.all([refreshFriendRequests(), refreshCurrentUser(), refreshUsers()])

      if (data?.action === "accept") {
        setFriendSearchStatus("Friend request accepted")
      } else if (data?.action === "decline") {
        setFriendSearchStatus("Friend request declined")
      }
    }

    socket.on("friend_request_received", handleFriendRequestReceived)
    socket.on("friend_request_response", handleFriendRequestResponse)

    return () => {
      socket.off("friend_request_received", handleFriendRequestReceived)
      socket.off("friend_request_response", handleFriendRequestResponse)
    }
  }, [isLoggedIn, loggedInUser?.id])

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
                attachment: null,
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
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
      msg.id === data.messageId
        ? { ...msg, status: "read" }
        : msg
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
          text: data.text || "",
          isSecret: data.isSecret || false,
          attachment: data.attachment || null,
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
                text: data.forwardedFrom.text || "",
                isSecret: data.forwardedFrom.isSecret || false,
                attachment: data.forwardedFrom.attachment || null,
              }
            : null,
          replyTo: data.replyTo
            ? {
                id: data.replyTo.id,
                text: data.replyTo.text || "",
                isSecret: data.replyTo.isSecret || false,
                attachment: data.replyTo.attachment || null,
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
          messageId: data.messageId,
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

  // =========================
  // WEBRTC VOICE / VIDEO CALLS
  // =========================
  const stopTone = (contextRef, intervalRef, oscillatorsRef) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    oscillatorsRef.current.forEach((oscillator) => {
      try {
        oscillator.stop()
      } catch (error) {
        // Oscillator may already be stopped.
      }
    })
    oscillatorsRef.current = []

    // Keep the AudioContext alive after the first user interaction so
    // future incoming-call sounds are not blocked by browser autoplay rules.
  }

  const playToneBurst = (contextRef, oscillatorsRef, frequencies, duration = 0.7) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = new AudioContextClass()
    }

    const context = contextRef.current
    context.resume().catch(() => {})

    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    gain.connect(context.destination)

    frequencies.forEach((frequency) => {
      const oscillator = context.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      oscillator.start()
      oscillator.stop(context.currentTime + duration + 0.05)
      oscillatorsRef.current.push(oscillator)

      oscillator.onended = () => {
        oscillatorsRef.current = oscillatorsRef.current.filter((item) => item !== oscillator)
      }
    })
  }

  const ensureCallAudioContexts = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!ringtoneAudioContextRef.current || ringtoneAudioContextRef.current.state === "closed") {
      ringtoneAudioContextRef.current = new AudioContextClass()
    }

    if (!ringbackAudioContextRef.current || ringbackAudioContextRef.current.state === "closed") {
      ringbackAudioContextRef.current = new AudioContextClass()
    }

    ringtoneAudioContextRef.current.resume().catch(() => {})
    ringbackAudioContextRef.current.resume().catch(() => {})
  }

  const playIncomingRingPattern = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!ringtoneAudioContextRef.current || ringtoneAudioContextRef.current.state === "closed") {
      ringtoneAudioContextRef.current = new AudioContextClass()
    }

    const context = ringtoneAudioContextRef.current
    context.resume().catch(() => {})

    // Two separate notes make a much clearer phone-style "ring-ring" pattern.
    const scheduleNote = (frequency, delay, duration = 0.34, volume = 0.22) => {
      const startTime = context.currentTime + delay
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(frequency, startTime)

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration + 0.03)
      ringtoneOscillatorsRef.current.push(oscillator)

      oscillator.onended = () => {
        ringtoneOscillatorsRef.current = ringtoneOscillatorsRef.current.filter(
          (item) => item !== oscillator
        )
      }
    }

    scheduleNote(740, 0)
    scheduleNote(880, 0.43)
    scheduleNote(740, 0.92)
    scheduleNote(880, 1.35)
  }

  const startIncomingRingtone = () => {
    stopTone(ringtoneAudioContextRef, ringtoneIntervalRef, ringtoneOscillatorsRef)
    playIncomingRingPattern()
    ringtoneIntervalRef.current = setInterval(playIncomingRingPattern, 3000)
  }

  const stopIncomingRingtone = () => {
    stopTone(ringtoneAudioContextRef, ringtoneIntervalRef, ringtoneOscillatorsRef)
  }

  const startRingbackTone = () => {
    stopTone(ringbackAudioContextRef, ringbackIntervalRef, ringbackOscillatorsRef)
    playToneBurst(ringbackAudioContextRef, ringbackOscillatorsRef, [425], 0.9)
    ringbackIntervalRef.current = setInterval(() => {
      playToneBurst(ringbackAudioContextRef, ringbackOscillatorsRef, [425], 0.9)
    }, 2600)
  }

  const stopRingbackTone = () => {
    stopTone(ringbackAudioContextRef, ringbackIntervalRef, ringbackOscillatorsRef)
  }

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    setCallDuration(0)
  }

  const startCallTimer = () => {
    if (callTimerRef.current) return
    setCallDuration(0)
    callDurationRef.current = 0
    callTimerRef.current = setInterval(() => {
      callDurationRef.current += 1
      setCallDuration((seconds) => seconds + 1)
    }, 1000)
  }

  const formatCallDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const twoDigits = (value) => String(value).padStart(2, "0")

    return hours > 0
      ? `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
      : `${twoDigits(minutes)}:${twoDigits(seconds)}`
  }

  const getCallMediaConstraints = (withVideo) => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: withVideo
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        }
      : false,
  })

  const attachStreamsToMedia = () => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current
      }
      remoteAudioRef.current.muted = false
      remoteAudioRef.current.volume = 1
      remoteAudioRef.current.play().catch((error) => {
        console.log("Remote audio play error:", error)
      })
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }
      remoteVideoRef.current.play().catch((error) => {
        console.log("Remote video play error:", error)
      })
    }

    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      localVideoRef.current.play().catch(() => {})
    }
  }

  const cleanupCall = () => {
    stopIncomingRingtone()
    stopRingbackTone()
    stopCallTimer()

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop())
      remoteStreamRef.current = null
    }

    pendingIceCandidatesRef.current = []
    callTargetRef.current = null
    callTypeRef.current = null
    setIncomingCall(null)
    setActiveCall(null)
    setIsMuted(false)
    setIsCameraOff(false)
  }

  const createPeerConnection = (targetId, callType) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    })

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON
          ? event.candidate.toJSON()
          : event.candidate

        socket.emit("ice_candidate", {
          to: targetId,
          from: loggedInUser?.id,
          candidate,
        })
      }
    }

    peerConnection.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
      }

      const incomingStream = event.streams?.[0]
      if (incomingStream) {
        incomingStream.getTracks().forEach((track) => {
          const alreadyAdded = remoteStreamRef.current
            .getTracks()
            .some((existingTrack) => existingTrack.id === track.id)
          if (!alreadyAdded) remoteStreamRef.current.addTrack(track)
        })
      } else if (event.track) {
        const alreadyAdded = remoteStreamRef.current
          .getTracks()
          .some((existingTrack) => existingTrack.id === event.track.id)
        if (!alreadyAdded) remoteStreamRef.current.addTrack(event.track)
      }

      setTimeout(attachStreamsToMedia, 0)
    }

    const markCallConnected = () => {
      stopIncomingRingtone()
      stopRingbackTone()
      startCallTimer()
      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev))
      setTimeout(attachStreamsToMedia, 0)
    }

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        markCallConnected()
      }

      if (["failed", "closed"].includes(peerConnection.connectionState)) {
        cleanupCall()
      }
    }

    peerConnection.oniceconnectionstatechange = () => {
      if (["connected", "completed"].includes(peerConnection.iceConnectionState)) {
        markCallConnected()
      }

      if (peerConnection.iceConnectionState === "failed") {
        console.log("ICE connection failed")
      }
    }

    peerConnectionRef.current = peerConnection
    callTargetRef.current = targetId
    callTypeRef.current = callType

    return peerConnection
  }

  const addPendingIceCandidates = async () => {
    const peerConnection = peerConnectionRef.current
    if (!peerConnection?.remoteDescription) return

    const candidates = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []

    for (const candidate of candidates) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.log("ICE candidate error:", error)
      }
    }
  }

  const refreshCallHistory = async (userId = selectedChat?.id) => {
    if (!userId) return
    try {
      const response = await fetch(`http://localhost:5000/api/calls/with/${userId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      const data = await response.json()
      if (response.ok) setCallHistory(Array.isArray(data) ? data : [])
    } catch (error) { console.log("Call history error:", error) }
  }

  const updateCallLog = async (status, duration = callDurationRef.current) => {
    if (!callLogIdRef.current) return
    const id = callLogIdRef.current
    try {
      await fetch(`http://localhost:5000/api/calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        body: JSON.stringify({ status, duration }),
      })
      refreshCallHistory()
    } catch (error) { console.log("Call log update error:", error) }
    if (["ended", "rejected", "missed"].includes(status)) callLogIdRef.current = null
  }

  useEffect(() => {
    if (selectedChat?.id) refreshCallHistory(selectedChat.id)
    else setCallHistory([])
  }, [selectedChat?.id])

  const startCall = async (callType) => {
    if (!selectedChat || !loggedInUser || activeCall || incomingCall) return

    if (!loggedInUser.friends?.includes(selectedChat.id)) {
      alert("Friend request must be accepted before calling.")
      return
    }

    if (loggedInUser.blockedUsers?.includes(selectedChat.id)) {
      alert("Unblock this user before starting a call.")
      return
    }

    if (!onlineUsers.includes(selectedChat.id)) {
      alert(`${selectedChat.name} is offline right now.`)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getCallMediaConstraints(callType === "video")
      )

      localStreamRef.current = stream

      const callLogResponse = await fetch("http://localhost:5000/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        body: JSON.stringify({ receiver: selectedChat.id, type: callType }),
      })
      const callLogData = await callLogResponse.json()
      if (callLogResponse.ok) callLogIdRef.current = callLogData._id

      const peerConnection = createPeerConnection(selectedChat.id, callType)
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      setActiveCall({
        userId: selectedChat.id,
        name: selectedChat.name,
        type: callType,
        status: "calling",
      })

      socket.emit("call_user", {
        to: selectedChat.id,
        from: loggedInUser.id,
        fromName: loggedInUser.name,
        callType,
        offer: peerConnection.localDescription?.toJSON
          ? peerConnection.localDescription.toJSON()
          : peerConnection.localDescription,
        callLogId: callLogIdRef.current,
      })

      startRingbackTone()
      setTimeout(attachStreamsToMedia, 0)
    } catch (error) {
      console.log("Start call error:", error)
      alert("Microphone/camera permission is required for calls.")
      cleanupCall()
    }
  }

  const acceptCall = async () => {
    if (!incomingCall || !loggedInUser) return

    const call = incomingCall

    try {
      stopIncomingRingtone()

      const stream = await navigator.mediaDevices.getUserMedia(
        getCallMediaConstraints(call.callType === "video")
      )

      localStreamRef.current = stream
      const peerConnection = createPeerConnection(call.from, call.callType)
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))

      await peerConnection.setRemoteDescription(new RTCSessionDescription(call.offer))
      await addPendingIceCandidates()

      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      setIncomingCall(null)
      setActiveCall({
        userId: call.from,
        name: call.fromName || "NexChat user",
        type: call.callType,
        status: "connected",
      })

      callLogIdRef.current = call.callLogId || callLogIdRef.current
      startCallTimer()
      updateCallLog("connected", 0)

      socket.emit("answer_call", {
        to: call.from,
        from: loggedInUser.id,
        answer: peerConnection.localDescription?.toJSON
          ? peerConnection.localDescription.toJSON()
          : peerConnection.localDescription,
        callLogId: call.callLogId || callLogIdRef.current,
      })

      setTimeout(attachStreamsToMedia, 0)
    } catch (error) {
      console.log("Accept call error:", error)
      socket.emit("reject_call", {
        to: call.from,
        from: loggedInUser.id,
      })
      cleanupCall()
    }
  }

  const rejectCall = () => {
    if (!incomingCall || !loggedInUser) return

    stopIncomingRingtone()

    socket.emit("reject_call", {
      to: incomingCall.from,
      from: loggedInUser.id,
    })

    setIncomingCall(null)
  }

  const endCall = () => {
    const targetId = callTargetRef.current || activeCall?.userId || incomingCall?.from

    if (targetId && loggedInUser) {
      socket.emit("end_call", {
        to: targetId,
        from: loggedInUser.id,
      })
    }

    updateCallLog(activeCall?.status === "connected" ? "ended" : "missed")
    cleanupCall()
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return

    const audioTracks = localStreamRef.current.getAudioTracks()
    const nextMuted = !isMuted
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
  }

  const toggleCamera = () => {
    if (!localStreamRef.current || activeCall?.type !== "video") return

    const videoTracks = localStreamRef.current.getVideoTracks()
    const nextCameraOff = !isCameraOff
    videoTracks.forEach((track) => {
      track.enabled = !nextCameraOff
    })
    setIsCameraOff(nextCameraOff)
  }

  useEffect(() => {
    attachStreamsToMedia()
  }, [activeCall])

  useEffect(() => {
    const unlockCallAudio = () => ensureCallAudioContexts()

    document.addEventListener("pointerdown", unlockCallAudio, { passive: true })
    document.addEventListener("keydown", unlockCallAudio)

    return () => {
      document.removeEventListener("pointerdown", unlockCallAudio)
      document.removeEventListener("keydown", unlockCallAudio)
      stopIncomingRingtone()
      stopRingbackTone()
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
      ringtoneAudioContextRef.current?.close().catch(() => {})
      ringbackAudioContextRef.current?.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleIncomingCall = (data) => {
      if (!loggedInUser?.friends?.includes(data.from)) {
        socket.emit("reject_call", {
          to: data.from,
          from: loggedInUser?.id,
        })
        return
      }

      if (loggedInUser?.blockedUsers?.includes(data.from)) {
        socket.emit("reject_call", {
          to: data.from,
          from: loggedInUser?.id,
        })
        return
      }

      if (activeCall || incomingCall) {
        socket.emit("reject_call", {
          to: data.from,
          from: loggedInUser?.id,
        })
        return
      }

      callLogIdRef.current = data.callLogId || null
      setIncomingCall(data)
      startIncomingRingtone()
    }

    const handleCallAnswered = async (data) => {
      try {
        const peerConnection = peerConnectionRef.current
        if (!peerConnection) return

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        await addPendingIceCandidates()
        if (data.callLogId) callLogIdRef.current = data.callLogId
        stopRingbackTone()
        startCallTimer()
        setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev))
        updateCallLog("connected", 0)
        setTimeout(attachStreamsToMedia, 0)
      } catch (error) {
        console.log("Call answer error:", error)
      }
    }

    const handleIceCandidate = async (data) => {
      const peerConnection = peerConnectionRef.current

      if (!peerConnection || !peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current.push(data.candidate)
        return
      }

      if (!data.candidate) return

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.log("ICE candidate error:", error)
      }
    }

    const handleCallEnded = () => { updateCallLog(activeCall?.status === "connected" ? "ended" : "missed"); cleanupCall() }
    const handleCallRejected = () => {
      alert("Call was declined.")
      updateCallLog("rejected", 0)
      cleanupCall()
    }
    const handleCallUnavailable = () => {
      alert("User is not available for a call right now.")
      updateCallLog("missed", 0)
      cleanupCall()
    }

    socket.on("incoming_call", handleIncomingCall)
    socket.on("call_answered", handleCallAnswered)
    socket.on("ice_candidate", handleIceCandidate)
    socket.on("call_ended", handleCallEnded)
    socket.on("call_rejected", handleCallRejected)
    socket.on("call_unavailable", handleCallUnavailable)

    return () => {
      socket.off("incoming_call", handleIncomingCall)
      socket.off("call_answered", handleCallAnswered)
      socket.off("ice_candidate", handleIceCandidate)
      socket.off("call_ended", handleCallEnded)
      socket.off("call_rejected", handleCallRejected)
      socket.off("call_unavailable", handleCallUnavailable)
    }
  }, [loggedInUser, activeCall, incomingCall])

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
        sessionStorage.setItem("token", data.token)
        sessionStorage.setItem("user", JSON.stringify(data.user))
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
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword = async () => {
    if (!resetEmail.trim() || resetLoading) {
      if (!resetEmail.trim()) setResetMessage("Please enter your email")
      return
    }

    try {
      setResetLoading(true)
      setResetMessage("")

      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to send reset code")

      setResetMessage(data.message || "Reset code sent")
      setAuthView("verifyOtp")
    } catch (error) {
      setResetMessage(error.message || "Server is not running")
    } finally {
      setResetLoading(false)
    }
  }

  const handleVerifyResetOtp = async () => {
    if (!resetOtp.trim() || resetLoading) {
      if (!resetOtp.trim()) setResetMessage("Please enter the verification code")
      return
    }

    try {
      setResetLoading(true)
      setResetMessage("")

      const response = await fetch("http://localhost:5000/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to verify code")

      setResetMessage("Code verified. Create a new password.")
      setAuthView("resetPassword")
    } catch (error) {
      setResetMessage(error.message || "Unable to verify code")
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPassword || !resetConfirmPassword || resetLoading) {
      if (!resetPassword || !resetConfirmPassword) setResetMessage("Please fill both password fields")
      return
    }

    if (resetPassword.length < 8) {
      setResetMessage("Password must be at least 8 characters")
      return
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetMessage("Passwords do not match")
      return
    }

    try {
      setResetLoading(true)
      setResetMessage("")

      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          newPassword: resetPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to reset password")

      setAuthView("main")
      setIsSignup(false)
      setEmail(resetEmail.trim())
      setPassword("")
      setResetOtp("")
      setResetPassword("")
      setResetConfirmPassword("")
      setResetMessage("")
      setMessage("Password reset successfully. Login with your new password.")
    } catch (error) {
      setResetMessage(error.message || "Unable to reset password")
    } finally {
      setResetLoading(false)
    }
  }

  // =========================
  // IMAGE / FILE SHARING
  // =========================
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-zip-compressed",
  ]
  const ALLOWED_FILE_EXTENSIONS = [
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx",
    ".txt", ".csv", ".xls", ".xlsx", ".ppt", ".pptx", ".zip",
  ]

  const getAttachmentUrl = (attachment) => {
    if (!attachment?.url) return ""
    return attachment.url.startsWith("http")
      ? attachment.url
      : `http://localhost:5000${attachment.url}`
  }

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return "0 KB"
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const clearSelectedFile = () => {
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview)
    }
    setSelectedFile(null)
    setSelectedFilePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`
    const supportedByType = ALLOWED_FILE_TYPES.includes(file.type)
    const supportedByExtension = ALLOWED_FILE_EXTENSIONS.includes(fileExtension)

    if (!supportedByType && !supportedByExtension) {
      alert("This file type is not supported. Use image, PDF, DOC/DOCX, TXT, CSV, Excel, PowerPoint or ZIP files.")
      event.target.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 10 MB.")
      event.target.value = ""
      return
    }

    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview)
    }

    setSelectedFile(file)
    setSelectedFilePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "")
  }

  const getSecretMask = (messageId = "secret") => {
    const chars = "@#$%&*!?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let seed = 0
    for (let i = 0; i < String(messageId).length; i += 1) {
      seed = (seed * 31 + String(messageId).charCodeAt(i)) >>> 0
    }
    let result = ""
    for (let i = 0; i < 12; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      result += chars[seed % chars.length]
    }
    return result
  }

  const revealSecretMessage = (messageId) => {
    setRevealedSecretMessages((prev) =>
      prev.includes(messageId) ? prev : [...prev, messageId]
    )
    window.setTimeout(() => {
      setRevealedSecretMessages((prev) => prev.filter((id) => id !== messageId))
    }, 8000)
  }

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat || isUploading || loggedInUser?.blockedUsers?.includes(selectedChat.id)) {
      return
    }

    if (!loggedInUser?.friends?.includes(selectedChat.id)) {
      alert("Friend request must be accepted before messaging.")
      return
    }

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append("receiver", selectedChat.id)
      formData.append("text", newMessage.trim())
      formData.append("isSecret", secretMessageMode && !selectedFile ? "true" : "false")
      if (replyingTo?.id) {
        formData.append("replyTo", replyingTo.id)
      }
      if (selectedFile) {
        formData.append("file", selectedFile)
      }

      const response = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        const attachment = data.attachment || null
        const newMsg = {
          id: data._id,
          text: data.text || "",
          isSecret: data.isSecret || false,
          attachment,
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
                text: data.replyTo.text || "",
                isSecret: data.replyTo.isSecret || false,
                attachment: data.replyTo.attachment || null,
                sender:
                  String(data.replyTo.sender) === loggedInUser.id ? "me" : "other",
                deletedForEveryone:
                  data.replyTo.deletedForEveryone || false,
              }
            : replyingTo,
        }

        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: [...prevChat.messages, newMsg],
          }
        })

        socket.emit("send_message", {
          messageId: data._id,
          sender: loggedInUser.id,
          receiver: selectedChat.id,
          text: data.text || "",
          isSecret: data.isSecret || false,
          attachment,
          createdAt: data.createdAt,
          status: data.status,
          edited: data.edited || false,
          reactions: [],
          forwardedFrom: data.forwardedFrom
            ? {
                id: data.forwardedFrom._id,
                text: data.forwardedFrom.text || "",
                isSecret: data.forwardedFrom.isSecret || false,
                attachment: data.forwardedFrom.attachment || null,
              }
            : null,
          replyTo: data.replyTo
            ? {
                id: data.replyTo._id,
                text: data.replyTo.text || "",
                isSecret: data.replyTo.isSecret || false,
                attachment: data.replyTo.attachment || null,
                senderId: String(data.replyTo.sender),
                deletedForEveryone:
                  data.replyTo.deletedForEveryone || false,
              }
            : replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text || "",
                attachment: replyingTo.attachment || null,
                senderId:
                  replyingTo.sender === "me"
                    ? loggedInUser.id
                    : selectedChat.id,
                deletedForEveryone:
                  replyingTo.deletedForEveryone || false,
              }
            : null,
        })

        socket.emit("stop_typing", {
          sender: loggedInUser.id,
          receiver: selectedChat.id,
        })

        setNewMessage("")
        setReplyingTo(null)
        clearSelectedFile()
      } else {
        alert(data.message || "Unable to send message")
      }
    } catch (error) {
      console.log("Server error:", error)
      alert("Unable to send file/message. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // =========================
  // REACTION / COPY / FORWARD / EDIT
  // =========================
  const handleCopyMessage = async () => {
    if (!selectedMessage || selectedMessage.deletedForEveryone) return

    const contentToCopy = selectedMessage.text?.trim()
      ? selectedMessage.text
      : getAttachmentUrl(selectedMessage.attachment)

    if (!contentToCopy) return

    try {
      await navigator.clipboard.writeText(contentToCopy)
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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

        socket.emit("message_reaction", {
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
    if (!selectedMessage || selectedMessage.sender !== "me" || !selectedMessage.text?.trim()) return
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
          text: forwarded.text || "",
          isSecret: forwarded.isSecret || false,
          attachment: forwarded.attachment || null,
          createdAt: forwarded.createdAt,
          status: forwarded.status,
          forwardedFrom: forwarded.forwardedFrom
            ? {
                id: forwarded.forwardedFrom._id,
                text: forwarded.forwardedFrom.text || "",
                isSecret: forwarded.forwardedFrom.isSecret || false,
                attachment: forwarded.forwardedFrom.attachment || null,
              }
            : {
                id: selectedMessage.id,
                text: selectedMessage.text || "",
                isSecret: selectedMessage.isSecret || false,
                attachment: selectedMessage.attachment || null,
              },
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
    setSelectedMessageIds([])
    setMultiSelectMode(false)
    setShowDeleteMenu(false)
    setShowDeletePopup(false)
    setShowReactionPicker(false)
  }

  const startMultiSelect = () => {
    if (!selectedMessage) return
    setSelectedMessageIds([selectedMessage.id])
    setMultiSelectMode(true)
    setShowDeleteMenu(false)
  }

  const toggleMessageSelection = (msg) => {
    setSelectedMessageIds((prev) => prev.includes(msg.id) ? prev.filter((id) => id !== msg.id) : [...prev, msg.id])
  }

  const handleBulkDeleteForMe = async () => {
    if (!selectedMessageIds.length) return
    const token = sessionStorage.getItem("token")
    const results = await Promise.all(selectedMessageIds.map((id) => fetch(`http://localhost:5000/api/messages/${id}/delete-for-me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: loggedInUser.id }) })))
    const deletedIds = selectedMessageIds.filter((_, index) => results[index].ok)
    setSelectedChat((prev) => prev ? { ...prev, messages: prev.messages.filter((msg) => !deletedIds.includes(msg.id)) } : prev)
    clearDeleteSelection()
  }

  const handleBulkDeleteForEveryone = async () => {
    if (!selectedMessageIds.length || !selectedChat || !loggedInUser) return

    const selectedMessages = selectedChat.messages.filter((msg) =>
      selectedMessageIds.includes(msg.id)
    )

    // Delete for everyone is only valid when every selected message
    // was sent by the logged-in user and has not already been deleted.
    const canDeleteAllForEveryone =
      selectedMessages.length === selectedMessageIds.length &&
      selectedMessages.every(
        (msg) => msg.sender === "me" && !msg.deletedForEveryone
      )

    if (!canDeleteAllForEveryone) {
      alert("Delete for everyone is available only when all selected messages were sent by you.")
      return
    }

    try {
      const token = sessionStorage.getItem("token")

      const results = await Promise.all(
        selectedMessageIds.map(async (id) => {
          const response = await fetch(
            `http://localhost:5000/api/messages/${id}/delete-for-everyone`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          )

          let data = {}
          try {
            data = await response.json()
          } catch {
            data = {}
          }

          return { id, ok: response.ok, data }
        })
      )

      const deletedIds = results
        .filter((result) => result.ok)
        .map((result) => result.id)

      if (deletedIds.length) {
        setSelectedChat((prevChat) => {
          if (!prevChat) return prevChat

          return {
            ...prevChat,
            messages: prevChat.messages.map((msg) => {
              const updatedReply = deletedIds.includes(msg.replyTo?.id)
                ? {
                    ...msg.replyTo,
                    text: "This message was deleted",
                    deletedForEveryone: true,
                    attachment: null,
                  }
                : msg.replyTo

              if (deletedIds.includes(msg.id)) {
                return {
                  ...msg,
                  text: "This message was deleted",
                  isSecret: false,
                  deletedForEveryone: true,
                  attachment: null,
                  reactions: [],
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

        deletedIds.forEach((messageId) => {
          socket.emit("message_deleted_for_everyone", {
            messageId,
            sender: loggedInUser.id,
            receiver: selectedChat.id,
          })
        })
      }

      const failed = results.find((result) => !result.ok)
      clearDeleteSelection()

      if (failed) {
        alert(failed.data?.message || "Some selected messages could not be deleted for everyone.")
      }
    } catch (error) {
      console.log("Bulk delete for everyone error:", error)
      alert("Unable to delete selected messages for everyone.")
    }
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
                  attachment: null,
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
  // CHAT TIMELINE (MESSAGES + CALL EVENTS)
  // =========================
  const getChatTimeline = () => {
    const messageEntries = (selectedChat?.messages || []).map((msg) => ({
      kind: "message",
      id: `message-${msg.id}`,
      createdAt: msg.createdAt || 0,
      data: msg,
    }))

    const callEntries = (callHistory || []).map((call) => ({
      kind: "call",
      id: `call-${call._id}`,
      createdAt: call.createdAt || 0,
      data: call,
    }))

    return [...messageEntries, ...callEntries].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      return aTime - bTime
    })
  }

  const getCallPartyId = (party) => {
    if (!party) return ""
    if (typeof party === "object") return String(party._id || party.id || "")
    return String(party)
  }

  const getCallEventText = (call) => {
    const outgoing = getCallPartyId(call.caller) === String(loggedInUser?.id || "")
    const callType = call.type === "video" ? "video" : "voice"

    if (call.status === "missed") return `Missed ${callType} call`
    if (call.status === "rejected") return `${outgoing ? "Outgoing" : "Incoming"} ${callType} call • declined`
    if (call.status === "ended") {
      const duration = Number(call.duration || 0)
      return `${outgoing ? "Outgoing" : "Incoming"} ${callType} call${duration > 0 ? ` • ${formatCallDuration(duration)}` : ""}`
    }
    if (call.status === "connected") return `${outgoing ? "Outgoing" : "Incoming"} ${callType} call • connected`
    return `${outgoing ? "Outgoing" : "Incoming"} ${callType} call`
  }

  // =========================
  // LOGGED IN DASHBOARD
  // =========================
  if (isLoggedIn) {
    return (
      <div className="h-screen bg-[#f1f5f9] p-0 overflow-hidden text-[#172033]">
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {showChatLockModal && (
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#ffffff] border border-[#64748b] shadow-[0_25px_90px_rgba(0,0,0,.7)] overflow-hidden">
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#2563eb]/15 border border-[#2563eb]/30 flex items-center justify-center text-2xl">
                  🔒
                </div>

                <h2 className="mt-4 text-lg font-bold text-[#172033]">
                  {chatLockMode === "setup"
                    ? "Create Chat Lock PIN"
                    : chatLockMode === "remove"
                    ? "Turn Off Chat Lock"
                    : chatLockMode === "forgotOtp"
                    ? "Verify Email"
                    : chatLockMode === "forgotNewPin"
                    ? "Create New PIN"
                    : "Locked Chat"}
                </h2>

                <p className="mt-1 text-xs text-[#64748b]">
                  {chatLockMode === "setup"
                    ? `Create a 4-digit PIN to lock ${chatLockTarget?.name || "this chat"}.`
                    : chatLockMode === "remove"
                    ? "Enter your PIN to permanently remove the lock from this chat."
                    : chatLockMode === "forgotOtp"
                    ? "Enter the 6-digit OTP sent to your registered email."
                    : chatLockMode === "forgotNewPin"
                    ? "Create and confirm your new 4-digit Chat Lock PIN."
                    : `Enter your PIN to open ${chatLockTarget?.name || "this chat"}.`}
                </p>
              </div>

              <div className="px-6 pb-6">
                {chatLockMode === "forgotOtp" ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={chatLockForgotOtp}
                    onChange={(e) => {
                      setChatLockForgotOtp(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                      setChatLockError("")
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && verifyForgotChatLockOtp()
                    }
                    placeholder="6-digit OTP"
                    className="w-full h-12 rounded-xl border border-[#64748b] bg-[#ffffff] px-4 text-center tracking-[0.35em] text-lg text-[#172033] outline-none focus:border-[#2563eb]"
                  />
                ) : chatLockMode === "forgotNewPin" ? (
                  <>
                    <div className="relative">
                      <input
                        type={showChatLockPin ? "text" : "password"}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={chatLockNewPin}
                        onChange={(e) => {
                          setChatLockNewPin(
                            e.target.value.replace(/\D/g, "").slice(0, 4)
                          )
                          setChatLockError("")
                        }}
                        placeholder="New 4-digit PIN"
                        className="w-full h-12 rounded-xl border border-[#64748b] bg-[#ffffff] px-4 pr-12 text-center tracking-[0.45em] text-lg text-[#172033] outline-none focus:border-[#2563eb]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChatLockPin((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                        aria-label={showChatLockPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showChatLockPin ? "🙈" : "👁️"}
                      </button>
                    </div>

                    <div className="relative mt-3">
                      <input
                        type={showChatLockPin ? "text" : "password"}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={chatLockConfirmNewPin}
                        onChange={(e) => {
                          setChatLockConfirmNewPin(
                            e.target.value.replace(/\D/g, "").slice(0, 4)
                          )
                          setChatLockError("")
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && resetForgotChatLockPin()
                        }
                        placeholder="Confirm New PIN"
                        className="w-full h-12 rounded-xl border border-[#64748b] bg-[#ffffff] px-4 pr-12 text-center tracking-[0.45em] text-lg text-[#172033] outline-none focus:border-[#2563eb]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChatLockPin((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                        aria-label={showChatLockPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showChatLockPin ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        type={showChatLockPin ? "text" : "password"}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={chatLockPin}
                        onChange={(e) => {
                          setChatLockPin(
                            e.target.value.replace(/\D/g, "").slice(0, 4)
                          )
                          setChatLockError("")
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && submitChatLock()
                        }
                        placeholder="4-digit PIN"
                        className="w-full h-12 rounded-xl border border-[#64748b] bg-[#ffffff] px-4 pr-12 text-center tracking-[0.45em] text-lg text-[#172033] outline-none focus:border-[#2563eb]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChatLockPin((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                        aria-label={showChatLockPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showChatLockPin ? "🙈" : "👁️"}
                      </button>
                    </div>

                    {chatLockMode === "setup" && (
                      <div className="relative mt-3">
                        <input
                          type={showChatLockPin ? "text" : "password"}
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={4}
                          value={chatLockConfirmPin}
                          onChange={(e) => {
                            setChatLockConfirmPin(
                              e.target.value.replace(/\D/g, "").slice(0, 4)
                            )
                            setChatLockError("")
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && submitChatLock()
                          }
                          placeholder="Confirm PIN"
                          className="w-full h-12 rounded-xl border border-[#64748b] bg-[#ffffff] px-4 pr-12 text-center tracking-[0.45em] text-lg text-[#172033] outline-none focus:border-[#2563eb]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowChatLockPin((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                          aria-label={showChatLockPin ? "Hide PIN" : "Show PIN"}
                        >
                          {showChatLockPin ? "🙈" : "👁️"}
                        </button>
                      </div>
                    )}

                    {(chatLockMode === "open" || chatLockMode === "remove") && (
                      <div className="text-right mt-3">
                        <button
                          type="button"
                          onClick={startForgotChatLockPin}
                          disabled={chatLockLoading}
                          className="text-xs font-semibold text-[#2563eb] hover:underline disabled:opacity-60"
                        >
                          Forgot PIN?
                        </button>
                      </div>
                    )}
                  </>
                )}

                {chatLockError && (
                  <p className="mt-3 text-xs text-center text-red-400">
                    {chatLockError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    type="button"
                    onClick={closeChatLockModal}
                    disabled={chatLockLoading}
                    className="h-11 rounded-xl border border-[#64748b] text-sm font-semibold text-[#aeb8c7] hover:bg-[#f1f5f9] disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      chatLockMode === "forgotOtp"
                        ? verifyForgotChatLockOtp
                        : chatLockMode === "forgotNewPin"
                        ? resetForgotChatLockPin
                        : submitChatLock
                    }
                    disabled={chatLockLoading}
                    className="h-11 rounded-xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#7b6cff] disabled:opacity-60"
                  >
                    {chatLockLoading
                      ? "Please wait..."
                      : chatLockMode === "setup"
                      ? "Create & Lock"
                      : chatLockMode === "remove"
                      ? "Turn Off"
                      : chatLockMode === "forgotOtp"
                      ? "Verify OTP"
                      : chatLockMode === "forgotNewPin"
                      ? "Save New PIN"
                      : "Unlock"}
                  </button>
                </div>

                {chatLockMode === "forgotOtp" && (
                  <button
                    type="button"
                    onClick={startForgotChatLockPin}
                    disabled={chatLockLoading}
                    className="w-full mt-4 text-xs font-semibold text-[#2563eb] hover:underline disabled:opacity-60"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showAddFriendModal && (
          <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-[#ffffff] border border-[#64748b] shadow-[0_25px_90px_rgba(0,0,0,.65)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#172033]">Add Friend</h2>
                  <p className="text-xs text-[#74839a] mt-1">Search only by exact NexChat ID. Other registered users stay private.</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddFriendModal(false)
                    setFriendSearchResult(null)
                    setFriendSearchStatus("")
                  }}
                  className="w-9 h-9 rounded-xl text-[#8491a5] hover:bg-[#151d29] hover:text-white"
                >✕</button>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-[#dbe3ee] bg-[#f8fafc] p-4 mb-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b] mb-1">Your NexChat ID</p>
                  <p className="font-mono text-sm font-semibold text-[#2563eb]">@{loggedInUser?.nexchatId || "loading"}</p>
                  <p className="text-[11px] text-[#64748b] mt-1">Share this ID only with people you want to connect with.</p>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2563eb] font-bold">@</span>
                    <input
                      value={friendLookupId}
                      onChange={(e) => {
                        setFriendLookupId(e.target.value)
                        setFriendSearchStatus("")
                        setFriendSearchResult(null)
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") searchFriendByNexChatId() }}
                      placeholder="nx_ab12cd34"
                      className="w-full h-12 rounded-2xl bg-[#ffffff] border border-[#dbe3ee] pl-9 pr-4 text-sm text-[#edf2f8] outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <button
                    onClick={searchFriendByNexChatId}
                    disabled={friendActionLoading || !friendLookupId.trim()}
                    className="px-5 h-12 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold disabled:opacity-40"
                  >Search</button>
                </div>

                {friendSearchStatus && (
                  <p className="text-xs text-[#64748b] mt-3">{friendSearchStatus}</p>
                )}

                {friendSearchResult && (
                  <div className="mt-4 rounded-2xl border border-[#dbe3ee] bg-[#f8fafc] p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#2563eb] overflow-hidden flex items-center justify-center font-bold text-white shrink-0">
                      {friendSearchResult.profileImage ? (
                        <img src={getProfileImageUrl(friendSearchResult.profileImage)} alt={friendSearchResult.name} className="w-full h-full object-cover" />
                      ) : friendSearchResult.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1f2937] truncate">{friendSearchResult.name}</p>
                      <p className="text-xs font-mono text-[#78879c] truncate">@{friendSearchResult.nexchatId}</p>
                    </div>
                    {friendSearchResult.requestStatus === "friends" ? (
                      <span className="text-xs px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">Friends</span>
                    ) : friendSearchResult.requestStatus === "sent" ? (
                      <span className="text-xs px-3 py-2 rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/25 text-[#2563eb]">Request sent</span>
                    ) : friendSearchResult.requestStatus === "received" ? (
                      <span className="text-xs px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">Check requests</span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(friendSearchResult._id)}
                        disabled={friendActionLoading}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-semibold disabled:opacity-40"
                      >Send Request</button>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#dce4ef]">Friend Requests</h3>
                    <span className="text-[11px] text-[#68778d]">{friendRequests.length} pending</span>
                  </div>

                  {friendRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#64748b] p-4 text-center text-xs text-[#64748b]">No pending friend requests.</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {friendRequests.map((request) => (
                        <div key={request._id} className="rounded-2xl border border-[#dbe3ee] bg-[#f8fafc] p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#2563eb] overflow-hidden flex items-center justify-center font-bold text-white shrink-0">
                            {request.profileImage ? (
                              <img src={getProfileImageUrl(request.profileImage)} alt={request.name} className="w-full h-full object-cover" />
                            ) : request.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1f2937] truncate">{request.name}</p>
                            <p className="text-[11px] font-mono text-[#64748b] truncate">@{request.nexchatId}</p>
                          </div>
                          <button onClick={() => respondToFriendRequest(request._id, "decline")} className="px-3 py-2 rounded-xl border border-[#64748b] text-xs text-[#64748b] hover:text-white">Decline</button>
                          <button onClick={() => respondToFriendRequest(request._id, "accept")} className="px-3 py-2 rounded-xl bg-[#2563eb] text-xs font-semibold text-white">Accept</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
        <div className="fixed inset-0 z-[80] bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-[#eceaf5] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#302f40]">Settings</h2>
                <p className="text-xs text-[#9694a6] mt-1">NexChat privacy settings</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-9 h-9 rounded-xl hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <button
              type="button"
              onClick={() => { setShowSettings(false); openProfileEditor() }}
              className="w-full mb-3 flex items-center justify-between gap-4 rounded-2xl border border-[#eceaf5] bg-white p-4 text-left hover:bg-[#faf9ff] transition"
            >
              <div>
                <p className="text-sm font-bold text-[#302f40]">Edit Profile</p>
                <p className="text-xs text-[#8f8c9e] mt-1">Photo, display name and about.</p>
              </div>
              <span className="text-[#2563eb] text-lg">›</span>
            </button>


            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#eceaf5] bg-[#faf9ff] p-4">
              <div>
                <p className="text-sm font-bold text-[#302f40]">Secret Message Mode</p>
                <p className="text-xs text-[#8f8c9e] mt-1">Text messages appear disguised until tapped.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !secretMessageMode
                  setSecretMessageMode(next)
                  localStorage.setItem("nexchat_secret_mode", String(next))
                }}
                className={`relative w-12 h-7 rounded-full transition ${secretMessageMode ? "bg-[#2563eb]" : "bg-gray-300"}`}
                aria-pressed={secretMessageMode}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${secretMessageMode ? "left-6" : "left-1"}`} />
              </button>
            </div>
            <p className="text-[11px] text-[#aaa7b6] mt-3">Secret mode applies to text-only messages. Images and files stay normal.</p>
          </div>
        </div>
        )}
        {showProfileModal && (
          <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#eceaf5] p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#302f40]">Edit Profile</h2>
                  <p className="text-xs text-[#9694a6] mt-1">Keep your NexChat profile up to date.</p>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="w-9 h-9 rounded-xl hover:bg-gray-100 text-gray-500">✕</button>
              </div>

              <div className="flex flex-col items-center mb-5">
                <button type="button" onClick={() => profileFileInputRef.current?.click()} className="relative w-24 h-24 rounded-3xl overflow-hidden bg-[#2563eb] text-white flex items-center justify-center text-3xl font-bold shadow-md">
                  {(profilePreview || loggedInUser?.profileImage) ? (
                    <img src={profilePreview || getProfileImageUrl(loggedInUser.profileImage)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (loggedInUser?.name || "N").charAt(0).toUpperCase()}
                  <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-[#2563eb] flex items-center justify-center text-sm shadow">✎</span>
                </button>
                <input ref={profileFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfileFileChange} />
              </div>

              <label className="block text-xs font-semibold text-[#77758a] mb-1.5">Display name</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={50} className="w-full h-11 rounded-2xl border border-[#dbe3ee] bg-white px-4 text-sm text-[#172033] placeholder:text-[#94a3b8] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100" />

              <label className="block text-xs font-semibold text-[#77758a] mb-1.5 mt-4">About</label>
              <textarea value={profileAbout} onChange={(e) => setProfileAbout(e.target.value)} maxLength={160} rows={3} placeholder="Hey there! I am using NexChat." className="w-full rounded-2xl border border-[#dbe3ee] bg-white px-4 py-3 text-sm text-[#172033] placeholder:text-[#94a3b8] outline-none resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100" />

              <button onClick={saveProfile} disabled={isSavingProfile || !profileName.trim()} className="w-full mt-5 h-11 rounded-2xl bg-[#2563eb] text-white shadow-[0_0_22px_rgba(102,92,255,.18)] font-semibold disabled:opacity-50">
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {incomingCall && !activeCall && (
          <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-7 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#2563eb] text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                {(incomingCall.fromName || "N").charAt(0).toUpperCase()}
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#172033]">{incomingCall.fromName || "NexChat user"}</h3>
              <p className="mt-1 text-sm text-[#8c899a]">
                Incoming {incomingCall.callType === "video" ? "video" : "voice"} call...
              </p>
              <div className="mt-7 flex items-center justify-center gap-8">
                <button onClick={rejectCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl shadow-lg" title="Reject call">✕</button>
                <button onClick={acceptCall} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl shadow-lg" title="Accept call">☎</button>
              </div>
            </div>
          </div>
        )}

        {activeCall && (
          <div className="fixed inset-0 z-[290] bg-[#171622]/95 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-3xl h-[min(700px,90vh)] bg-[#22212e] rounded-[30px] overflow-hidden shadow-2xl relative flex flex-col">
              <div className="px-6 py-5 text-center text-white">
                <h3 className="text-xl font-bold">{activeCall.name}</h3>
                <p className="text-sm text-white/60 mt-1">
                  {activeCall.status === "calling"
                    ? "Calling..."
                    : `${activeCall.type === "video" ? "Video call" : "Voice call"} • ${formatCallDuration(callDuration)}`}
                </p>
              </div>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {activeCall.type === "video" ? (
                  <>
                    <video ref={remoteVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
                    <video ref={localVideoRef} autoPlay muted playsInline className="absolute right-5 bottom-5 w-40 sm:w-52 aspect-video object-cover rounded-2xl border-2 border-white/20 bg-black shadow-xl" />
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto rounded-full bg-[#2563eb] text-white flex items-center justify-center text-5xl font-bold shadow-2xl">
                      {activeCall.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-white/70 mt-5">
                      {activeCall.status === "calling" ? "Ringing..." : `Connected • ${formatCallDuration(callDuration)}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-6 flex items-center justify-center gap-4 bg-black/20">
                <button onClick={toggleMute} className={`w-13 h-13 px-4 py-3 rounded-full text-white ${isMuted ? "bg-red-500" : "bg-white/15 hover:bg-white/25"}`} title={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? "🔇" : "🎙️"}
                </button>
                {activeCall.type === "video" && (
                  <button onClick={toggleCamera} className={`w-13 h-13 px-4 py-3 rounded-full text-white ${isCameraOff ? "bg-red-500" : "bg-white/15 hover:bg-white/25"}`} title={isCameraOff ? "Turn camera on" : "Turn camera off"}>
                    {isCameraOff ? "📷" : "🎥"}
                  </button>
                )}
                <button onClick={endCall} className="w-16 h-13 px-5 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl shadow-lg" title="End call">✕</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .cyber-grid { background: #f8fafc; }
          .nex-scanline { display: none; }
          .ops-shell { background: #eef4fb; }
          .ops-panel { background: #ffffff; }
          .ops-cut { clip-path: none; }
          .ops-corner { position: relative; }
          .ops-corner:before, .ops-corner:after { display: none; }
          .ops-noise { background: #eef6ff; }
          .ops-message-me { background: #2563eb; border: 1px solid #1d4ed8; box-shadow: 0 3px 10px rgba(37,99,235,.16); }
          .ops-message-them { background: #ffffff; border: 1px solid #d7e2ef; box-shadow: 0 2px 7px rgba(15,23,42,.07); }
          .ops-dock { background: #f8fbff; box-shadow: 0 -1px 0 #d9e4f0, 0 -4px 16px rgba(15,23,42,.03); }
          .ops-status { font-variant-numeric: tabular-nums; letter-spacing: .08em; }
        `}</style>
        <div className="h-full w-full ops-shell overflow-hidden flex relative">
          {/* SIDEBAR */}
          <aside className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-[326px] lg:w-[350px] ops-panel border-r border-[#e2e8f0] flex-col shrink-0 backdrop-blur-xl`}>
            {/* BRAND */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center min-w-0 gap-3">
                  <img src={nexchatLogo} alt="NexChat" className="w-[132px] sm:w-[145px] h-auto object-contain object-left" />
                  <span className="hidden lg:inline-flex items-center gap-1.5 text-[9px] tracking-[0.22em] text-[#64748b] border-l border-[#263244] pl-3"><span className="w-1.5 h-1.5 rounded-full bg-[#35e3ad] shadow-[0_0_10px_rgba(53,227,173,.7)]" />SECURE COMMS</span>
                </div>

                <button
                  type="button"
                  className="w-10 h-10 rounded-xl border border-[#eeeeF5] text-[#77758a] hover:bg-[#f7f5ff] hover:text-[#2563eb] transition flex items-center justify-center"
                  title="Notifications"
                >
                  <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 ops-cut ops-corner border border-[#dbe3ee] bg-[#ffffff] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-[#64748b] tracking-[0.24em] uppercase">Private Network / 01</p>
                    <h2 className="mt-1 text-[17px] font-bold tracking-tight text-[#172033]">Active channels</h2>
                  </div>
                  <div className="text-right ops-status">
                    <p className="text-[9px] text-[#42deb0]">● LINK LIVE</p>
                    <p className="mt-1 text-[8px] text-[#556276]">E2E SESSION</p>
                  </div>
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  placeholder="Search conversations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl pl-11 pr-4 text-sm text-[#172033] placeholder:text-[#94a3b8] outline-none focus:bg-[#f1f5f9] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition"
                />
              </div>

              {/* FILTERS */}
              <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
                <button className="px-4 py-2 rounded-full bg-[#2563eb] text-white shadow-[0_0_22px_rgba(102,92,255,.18)] text-xs font-semibold shadow-sm">All</button>
                <button className="px-4 py-2 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[#8390a3] text-xs font-semibold hover:bg-[#f1efff] transition">Unread</button>

              </div>
            </div>

            <div className="px-5 pt-1 pb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Messages</h2>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  {users.length} conversation{users.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddFriendModal(true)
                  setFriendLookupId("")
                  setFriendSearchResult(null)
                  setFriendSearchStatus("")
                  refreshFriendRequests()
                  refreshCurrentUser()
                }}
                className="h-9 px-3 rounded-xl bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#7a6cff] transition shadow-[0_0_20px_rgba(109,93,252,.18)]"
              >
                <span className="flex items-center gap-2">
                  + Add Friend
                  {friendRequests.length > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-white text-[#2563eb] text-[10px] font-bold flex items-center justify-center">{friendRequests.length}</span>
                  )}
                </span>
              </button>
            </div>

            {/* CHAT LIST */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {users.length === 0 && (
                <div className="mx-2 mt-3 rounded-2xl border border-dashed border-[#64748b] bg-[#f8fafc]/70 px-5 py-8 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] flex items-center justify-center mx-auto mb-3 text-xl">+</div>
                  <p className="text-sm font-semibold text-[#172033]">No conversations yet</p>
                  <p className="text-xs text-[#64748b] mt-1">Add a friend using their exact NexChat ID.</p>
                  <button
                    onClick={() => { setShowAddFriendModal(true); refreshFriendRequests(); refreshCurrentUser() }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-semibold"
                  >Add Friend</button>
                </div>
              )}
              {users
                .filter((user) => user._id !== loggedInUser.id)
                .filter((user) => {
                  const q = searchQuery.trim().toLowerCase()
                  if (!q) return true
                  return user.name?.toLowerCase().includes(q) || user.nexchatId?.toLowerCase().includes(q)
                })
                .map((user) => (
                  <div
                    key={user._id}
                    onClick={() => openConversation(user)}
                    className={`group ops-corner flex items-center gap-3 px-3 py-3.5 rounded-lg cursor-pointer mb-2 border transition-all ${
                      selectedChat?.id === user._id
                        ? "bg-[#e8f2ff] border-[#7db4ff] shadow-[inset_3px_0_0_#2563eb]"
                        : "bg-white border-transparent hover:border-[#dbe3ee] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 bg-[#2563eb] text-white rounded-[16px] flex items-center justify-center font-bold text-base shadow-sm overflow-hidden">
                        {user.profileImage ? (
                          <img src={getProfileImageUrl(user.profileImage)} alt={user.name} className="w-full h-full object-cover" />
                        ) : user.name.charAt(0).toUpperCase()}
                      </div>
                      {onlineUsers.includes(user._id) && (
                        <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 bg-[#45c486] border-[3px] border-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-[#1f2937] truncate">{user.name}</p>
                        {unreadCounts[user._id] > 0 && (
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-[#2563eb] rounded-full">
                            {unreadCounts[user._id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748b] truncate mt-1">
                        {onlineUsers.includes(user._id) ? "Online now" : `@${user.nexchatId || "nexchat"}`}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {/* CURRENT USER */}
            <div className="p-3 border-t border-[#e2e8f0] bg-[#ffffff]">
              <div className="flex items-center gap-3 p-2 rounded-2xl">
                <button type="button" onClick={openProfileEditor} className="w-11 h-11 rounded-[15px] bg-gradient-to-br from-[#1d4ed8] to-[#60a5fa] text-white flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {loggedInUser.profileImage ? (
                    <img src={getProfileImageUrl(loggedInUser.profileImage)} alt={loggedInUser.name} className="w-full h-full object-cover" />
                  ) : loggedInUser.name.charAt(0).toUpperCase()}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1f2937] truncate">{loggedInUser.name}</p>
                  <p className="text-[10px] font-mono text-[#64748b] truncate">@{loggedInUser.nexchatId || "loading"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="w-9 h-9 rounded-xl text-[#8c899a] hover:bg-white hover:text-[#2563eb] transition flex items-center justify-center"
                  title="Settings"
                >
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.36.28.58.7.6 1.16V12c-.02.46-.24.88-.6 1.16A1.7 1.7 0 0 0 19.4 15Z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    clearDeleteSelection()
                    setReplyingTo(null)
                    setIsLoggedIn(false)
                    setLoggedInUser(null)
                    setSelectedChat(null)
                    setShowContactDetails(false)
                    setSessionUnlockedChatIds([])
                    setLockedChatIds([])
                    setChatLockHasPin(false)
                    closeChatLockModal()
                    sessionStorage.removeItem("token")
                    sessionStorage.removeItem("user")
                  }}
                  className="w-9 h-9 rounded-xl text-[#9d9aaa] hover:bg-[#fff1f3] hover:text-[#ef5b70] transition flex items-center justify-center"
                  title="Logout"
                >
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* CHAT AREA */}
          <main className={`${selectedChat ? "flex" : "hidden md:flex"} flex-1 flex-col relative min-w-0 bg-[#f8fafc]`}>
            {selectedChat ? (
              <>
                {/* CHAT HEADER */}
                <div className="h-[92px] bg-[#ffffff]/95 backdrop-blur-xl border-b border-[#e2e8f0] flex items-center justify-between px-5 sm:px-6 shrink-0">
                  <div className="flex items-center min-w-0">
                    <button
                      onClick={() => {
                        clearDeleteSelection()
                        setReplyingTo(null)
                        setShowContactDetails(false)
                        setSelectedChat(null)
                      }}
                      className="w-10 h-10 mr-2 rounded-xl text-[#77758a] hover:text-[#2563eb] hover:bg-[#f5f3ff] transition flex items-center justify-center"
                      title="Back"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowContactDetails((prev) => !prev)}
                      className="flex items-center min-w-0 text-left rounded-2xl px-1 py-1 hover:bg-[#f1f5f9] transition"
                      title="Contact details"
                    >
                      <div className="relative w-11 h-11 bg-[#2563eb] text-white rounded-[15px] flex items-center justify-center font-bold mr-3 shrink-0 overflow-hidden">
                        {selectedChat.profileImage ? (
                          <img src={getProfileImageUrl(selectedChat.profileImage)} alt={selectedChat.name} className="w-full h-full object-cover" />
                        ) : selectedChat.name.charAt(0).toUpperCase()}
                        {onlineUsers.includes(selectedChat.id) && (
                          <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 bg-[#45c486] border-[3px] border-white rounded-full" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-[15px] text-[#172033] truncate">{selectedChat.name}</h2>
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md border border-[#dbe3ee] bg-[#f8fafc] text-[9px] tracking-[0.18em] text-[#64748b]">CHANNEL // VERIFIED</span>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${
                            isTyping
                              ? "text-[#2563eb] font-medium"
                              : onlineUsers.includes(selectedChat.id)
                              ? "text-[#3de2b0]"
                              : "text-[#64748b]"
                          }`}
                        >
                          {isTyping
                            ? "typing..."
                            : onlineUsers.includes(selectedChat.id)
                            ? "Online"
                            : "Offline"}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleFriend(selectedChat.id)}
                      className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${loggedInUser.friends?.includes(selectedChat.id) ? "text-white bg-[#2563eb]" : "text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9]"}`}
                      title={loggedInUser.friends?.includes(selectedChat.id) ? "Remove friend" : "Add friend"}
                    >
                      <span className="text-lg">{loggedInUser.friends?.includes(selectedChat.id) ? "★" : "☆"}</span>
                    </button>
                    <button onClick={() => startCall("voice")} className="w-10 h-10 rounded-xl text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] transition flex items-center justify-center" title="Voice call">
                      <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/></svg>
                    </button>
                    <button onClick={() => startCall("video")} className="w-10 h-10 rounded-xl text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] transition flex items-center justify-center" title="Video call">
                      <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactDetails((prev) => !prev)}
                      className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${showContactDetails ? "text-white bg-[#2563eb]" : "text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9]"}`}
                      title={showContactDetails ? "Close contact details" : "Contact details"}
                    >
                      <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5" />
                        <path d="M12 8h.01" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* MESSAGES */}
                <div
                  className="flex-1 cyber-grid ops-noise bg-[#eef6ff] px-5 sm:px-7 py-6 overflow-y-auto"
                  onClick={() => {
                    if (showDeleteMenu) {
                      setShowDeleteMenu(false)
                    }
                  }}
                >
                  <div className="flex flex-col gap-4">
                    {getChatTimeline().map((entry) => {
                      if (entry.kind === "call") {
                        const call = entry.data
                        const isBad = ["missed", "rejected"].includes(call.status)
                        return (
                          <div key={entry.id} className="flex justify-center py-1">
                            <div className={`max-w-[88%] sm:max-w-md rounded-2xl border px-4 py-2.5 flex items-center gap-3 shadow-sm ${
                              isBad
                                ? "bg-red-500/5 border-red-500/20 text-red-300"
                                : "bg-[#f8fafc]/95 border-[#283446] text-[#d8e0eb]"
                            }`}>
                              <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                                isBad ? "bg-red-500/10 text-red-400" : "bg-[#2563eb]/15 text-[#a79fff]"
                              }`}>
                                {call.type === "video" ? "▣" : "☎"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold">{getCallEventText(call)}</p>
                                <p className="text-[10px] mt-0.5 text-[#7e8999]">
                                  {call.createdAt
                                    ? new Date(call.createdAt).toLocaleString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "short",
                                      })
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      const msg = entry.data
                      const isSelected = multiSelectMode && selectedMessageIds.includes(msg.id)

                      return (
                      <div
                        key={entry.id}
                        onClick={() => { if (multiSelectMode) toggleMessageSelection(msg) }}
                        className={`relative flex items-center gap-2 rounded-2xl transition-all ${
                          msg.sender === "me" ? "justify-end" : "justify-start"
                        } ${multiSelectMode ? "cursor-pointer px-2 py-1" : ""} ${
                          isSelected ? "bg-[#2563eb]/15 ring-1 ring-inset ring-[#7d70ff]/45" : ""
                        }`}
                      >
                        {multiSelectMode && (
                          <div
                            className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                              isSelected
                                ? "bg-[#2563eb] border-[#a69fff] text-white shadow-[0_0_14px_rgba(109,93,252,0.45)]"
                                : "bg-[#f8fafc] border-[#566173] text-transparent"
                            }`}
                            aria-label={isSelected ? "Selected" : "Not selected"}
                          >
                            ✓
                          </div>
                        )}
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
                              ? "ops-message-me text-white rounded-br-[4px]"
                              : "ops-message-them text-[#1f2937] rounded-bl-[4px]"
                          } ${
                            (multiSelectMode ? selectedMessageIds.includes(msg.id) : selectedMessage?.id === msg.id)
                              ? "ring-2 ring-[#8b7fff] ring-offset-2 ring-offset-[#f8fafc] shadow-[0_0_18px_rgba(109,93,252,0.28)]"
                              : ""
                          }`}
                        >
                          {msg.forwardedFrom && !msg.deletedForEveryone && (
                            <p className={`text-[11px] mb-1 italic ${
                              msg.sender === "me" ? "text-[#dbeafe]" : "text-[#64748b]"
                            }`}>
                              ↪ Forwarded
                            </p>
                          )}

                          {msg.replyTo && (
                            <div
                              className={`mb-2 rounded-lg border-l-4 px-3 py-2 text-xs ${
                                msg.sender === "me"
                                  ? "bg-white/45 border-[#7f72ef] text-[#504b75]"
                                  : "bg-white/70 border-[#2563eb] text-gray-600"
                              }`}
                            >
                              <p className="font-semibold mb-0.5">
                                {msg.replyTo.sender === "me" ? "You" : selectedChat.name}
                              </p>
                              <p className="truncate max-w-[220px]">
                                {msg.replyTo.deletedForEveryone
                                  ? "This message was deleted"
                                  : msg.replyTo.isSecret
                                  ? getSecretMask(msg.replyTo.id)
                                  : msg.replyTo.text || msg.replyTo.attachment?.originalName || "Attachment"}
                              </p>
                            </div>
                          )}

                          {!msg.deletedForEveryone && msg.attachment && (
                            (
                            msg.attachment.kind === "image" ||
                            msg.attachment.fileType === "image" ||
                            msg.attachment.mimeType?.startsWith("image/")
                          ) ? (
                              <a
                                href={getAttachmentUrl(msg.attachment)}
                                target="_blank"
                                rel="noreferrer"
                                className="block mb-2"
                                title={msg.attachment.originalName}
                              >
                                <img
                                  src={getAttachmentUrl(msg.attachment)}
                                  alt={msg.attachment.originalName || "Shared image"}
                                  className="max-h-72 w-auto max-w-full rounded-xl object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={getAttachmentUrl(msg.attachment)}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className={`mb-2 flex items-center gap-3 rounded-xl p-3 border ${
                                  msg.sender === "me"
                                    ? "bg-white/45 border-[#c8c0ff] text-[#2f3150]"
                                    : "bg-white border-gray-200 text-gray-700"
                                }`}
                              >
                                <span className="text-2xl">📎</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold truncate">
                                    {msg.attachment.originalName}
                                  </span>
                                  <span className={`block text-[11px] mt-0.5 ${
                                    msg.sender === "me" ? "text-[#dbeafe]" : "text-[#64748b]"
                                  }`}>
                                    {formatFileSize(msg.attachment.size)} • Open / Download
                                  </span>
                                </span>
                              </a>
                            )
                          )}

                          {(msg.text || msg.deletedForEveryone) && (
                            <p
                              onClick={() => {
                                if (msg.isSecret && !msg.deletedForEveryone) {
                                  revealSecretMessage(msg.id)
                                }
                              }}
                              title={msg.isSecret && !msg.deletedForEveryone ? "Tap to reveal" : ""}
                              className={
                                msg.deletedForEveryone
                                  ? "italic opacity-80"
                                  : msg.isSecret
                                  ? "cursor-pointer select-none font-mono tracking-wide"
                                  : ""
                              }
                            >
                              {msg.isSecret && !msg.deletedForEveryone
                                ? revealedSecretMessages.includes(msg.id)
                                  ? msg.text
                                  : getSecretMask(msg.id)
                                : msg.text}
                            </p>
                          )}

                          <p
                            className={`text-[10px] mt-1 text-right ${
                              msg.sender === "me"
                                ? "text-[#dbeafe]"
                                : "text-[#64748b]"
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
                                    ? "text-[#7dd3fc] font-bold"
                                    : "text-[#dbeafe]"
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
                                      ? "bg-white/60 border-[#c7c0ff] text-[#514a78]"
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
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* SELECTED MESSAGE BOTTOM BAR */}
                {(selectedMessage || multiSelectMode) && !showDeletePopup && !showDeleteMenu && (
                  <div className="h-14 bg-[#f8fafc] border-t border-[#64748b] flex items-center justify-between px-5 shadow-[0_-8px_24px_rgba(0,0,0,0.22)]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={clearDeleteSelection}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg text-[#64748b] hover:bg-[#141d2a] hover:text-white"
                        title="Cancel selection"
                      >
                        ✕
                      </button>

                      <span className="px-3 py-1.5 rounded-full bg-[#2563eb]/15 border border-[#2563eb]/35 text-sm font-semibold text-[#c8c2ff]">
                        {multiSelectMode ? selectedMessageIds.length : 1} message{multiSelectMode && selectedMessageIds.length !== 1 ? "s" : ""} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {multiSelectMode ? (
                        <>
                          {selectedMessageIds.length > 0 &&
                            selectedChat.messages
                              .filter((msg) => selectedMessageIds.includes(msg.id))
                              .every((msg) => msg.sender === "me" && !msg.deletedForEveryone) && (
                              <button
                                onClick={handleBulkDeleteForEveryone}
                                className="px-4 h-10 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-600 hover:bg-blue-500/20"
                                title="Delete selected messages for everyone"
                              >
                                🗑 Delete for everyone
                              </button>
                            )}
                          <button
                            onClick={handleBulkDeleteForMe}
                            disabled={!selectedMessageIds.length}
                            className="px-4 h-10 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 hover:bg-red-500/20 disabled:opacity-40"
                            title="Delete selected messages for me"
                          >
                            🗑 Delete for me
                          </button>
                        </>
                      ) : !selectedMessage.deletedForEveryone && (
                        <>
                          <button onClick={handleReply} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Reply">↩️</button>
                          <button onClick={handleCopyMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Copy">📋</button>
                          <button onClick={openForwardMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Forward">➡️</button>
                          <button onClick={() => setShowReactionPicker(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="React">😊</button>
                          {selectedMessage.sender === "me" && selectedMessage.text?.trim() && (
                            <button onClick={openEditMessage} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Edit">✏️</button>
                          )}
                        </>
                      )}

                      {!multiSelectMode && <button onClick={() => setShowDeletePopup(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100" title="Delete">🗑️</button>}
                    </div>
                  </div>
                )}

                {/* MESSAGE INPUT */}
                {!selectedMessage && !multiSelectMode && (
                  <div className="ops-dock backdrop-blur-xl border-t border-[#e2e8f0]">
                    {loggedInUser.blockedUsers?.includes(selectedChat.id) && (
                      <div className="mx-4 mb-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 text-center">
                        You blocked this user. Unblock them to send new messages.
                      </div>
                    )}

                    {!loggedInUser.friends?.includes(selectedChat.id) && !loggedInUser.blockedUsers?.includes(selectedChat.id) && (
                      <div className="mx-4 mb-2 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/25 px-4 py-3 text-sm text-[#beb8ff] text-center">
                        Add this contact as a friend and wait for acceptance before messaging or calling.
                      </div>
                    )}

                    {replyingTo && (
                      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-gray-100 border-l-4 border-blue-500 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-600">
                            {replyingTo.sender === "me" ? "You" : selectedChat.name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {replyingTo.isSecret
                              ? getSecretMask(replyingTo.id)
                              : replyingTo.text || replyingTo.attachment?.originalName || "Attachment"}
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

                    {selectedFile && (
                      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-[#f7f7fb] border border-[#e8e6f2] px-3 py-2">
                        {selectedFilePreview ? (
                          <img
                            src={selectedFilePreview}
                            alt="Selected"
                            className="w-14 h-14 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center text-2xl">📎</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500"
                          title="Remove attachment"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="h-16 flex items-center px-4 gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.zip"
                      onChange={handleFileSelect}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-11 h-11 shrink-0 rounded-xl border border-[#cbd8e8] bg-[#eaf2fb] text-[#334155] hover:bg-[#dcecff] hover:text-[#1d4ed8] flex items-center justify-center text-xl transition"
                      title="Attach image or file"
                    >
                      📎
                    </button>

                    <input
                      type="text"
                      placeholder="Transmit a message..."
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
                      className="flex-1 h-12 border border-[#b9c9dc] rounded-xl px-4 outline-none bg-[#f8fbff] text-[#172033] placeholder:text-[#64748b] focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition"
                    />

                    <button
                      onClick={handleSendMessage}
                      disabled={isUploading || (!newMessage.trim() && !selectedFile)}
                      className="h-12 min-w-12 ops-cut rounded-xl bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 hover:bg-[#1d4ed8] hover:shadow-[0_6px_18px_rgba(37,99,235,.22)] transition"
                    >
                      {isUploading ? "..." : "➤"}
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
                        {selectedMessage.sender === "me" && selectedMessage.text?.trim() && (
                          <button onClick={openEditMessage} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>✏️</span><span>Edit</span></button>
                        )}
                      </>
                    )}

                    <button onClick={startMultiSelect} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"><span>☑</span><span>Select messages</span></button>

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
                            <div><p className="font-medium">{user.name}</p><p className="text-xs text-gray-500">@{user.nexchatId || "nexchat"}</p></div>
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
          </main>

          {/* CONTACT DETAILS PANEL - opens only when requested */}
          {selectedChat && showContactDetails && (
            <aside className="fixed inset-y-0 right-0 z-[75] flex w-full sm:w-[360px] xl:static xl:z-auto xl:w-[320px] ops-panel border-l border-[#e2e8f0] flex-col shrink-0 overflow-y-auto shadow-2xl xl:shadow-none">
              <>
                <div className="h-14 px-4 flex items-center justify-between border-b border-[#e2e8f0] bg-[#ffffff]/95 backdrop-blur shrink-0">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#64748b]">Channel identity</p>
                  <button
                    type="button"
                    onClick={() => setShowContactDetails(false)}
                    className="w-9 h-9 rounded-xl text-[#7f8798] hover:bg-[#f4f2ff] hover:text-[#2563eb] transition flex items-center justify-center"
                    title="Close details"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-5 pt-7 pb-5 text-center border-b border-[#e2e8f0]">
                  <div className="relative w-20 h-20 mx-auto rounded-full bg-[#2563eb] text-white flex items-center justify-center text-2xl font-bold overflow-hidden shadow-sm">
                    {selectedChat.profileImage ? <img src={getProfileImageUrl(selectedChat.profileImage)} alt={selectedChat.name} className="w-full h-full object-cover" /> : selectedChat.name.charAt(0).toUpperCase()}
                    {onlineUsers.includes(selectedChat.id) && <span className="absolute right-0 bottom-1 w-4 h-4 bg-[#22c55e] rounded-full border-[3px] border-white" />}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-[#172033]">{selectedChat.name}</h3>
                  <p className={`text-xs mt-1 ${onlineUsers.includes(selectedChat.id) ? "text-[#20a866]" : "text-[#64748b]"}`}>{onlineUsers.includes(selectedChat.id) ? "● Online" : "Offline"}</p>
                  <p className="mt-3 text-xs leading-5 text-[#52647a] px-3">{selectedChat.about || "Hey there! I am using NexChat."}</p>

                  <div className="grid grid-cols-4 gap-2 mt-5">
                    <button onClick={() => startCall("voice")} className="h-14 rounded-xl border border-[#dbe3ee] bg-[#ffffff] text-[#475569] hover:bg-[#f1f5f9] flex flex-col items-center justify-center gap-1 text-[10px]"><span className="text-lg">☎</span>Audio</button>
                    <button onClick={() => startCall("video")} className="h-14 rounded-xl border border-[#dbe3ee] bg-[#ffffff] text-[#475569] hover:bg-[#f1f5f9] flex flex-col items-center justify-center gap-1 text-[10px]"><span className="text-lg">▣</span>Video</button>
                    <button className="h-14 rounded-xl border border-[#dbe3ee] bg-[#ffffff] text-[#475569] hover:bg-[#f1f5f9] flex flex-col items-center justify-center gap-1 text-[10px]"><span className="text-lg">⌕</span>Search</button>
                    <button onClick={() => toggleBlock(selectedChat.id)} className="h-14 rounded-xl border border-[#dbe3ee] bg-[#ffffff] text-[#475569] hover:bg-[#19131a] flex flex-col items-center justify-center gap-1 text-[10px]"><span className="text-lg">•••</span>More</button>
                  </div>
                </div>

                <div className="p-5 border-b border-[#e2e8f0]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-[#172033]">Media, Links and Docs</h4>
                    <span className="text-xs font-semibold text-[#1d4ed8]">Recent</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedChat.messages.filter((msg) => msg.attachment).slice(-4).map((msg) => {
                      const isImage = msg.attachment?.kind === "image" || msg.attachment?.fileType === "image" || msg.attachment?.mimeType?.startsWith("image/")
                      return (
                        <a key={msg.id} href={getAttachmentUrl(msg.attachment)} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-[#e6e9f2] bg-[#f4f5f9] flex items-center justify-center text-xs text-[#6f778a]">
                          {isImage ? <img src={getAttachmentUrl(msg.attachment)} alt="Shared" className="w-full h-full object-cover" /> : <span className="px-1 text-center">{msg.attachment?.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</span>}
                        </a>
                      )
                    })}
                    {selectedChat.messages.filter((msg) => msg.attachment).length === 0 && <div className="col-span-4 text-xs text-[#64748b] py-3">No shared media yet</div>}
                  </div>
                </div>

                <div className="p-3 border-b border-[#e2e8f0]">
                  <button onClick={() => toggleFriend(selectedChat.id)} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f3f7fc] text-sm text-[#475569]"><span>☆ Starred / Friend</span><span>›</span></button>
                  <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f3f7fc] text-sm text-[#475569]"><span>🔕 Mute Notifications</span><span className="text-[#52647a]">Off</span></button>
                  <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f3f7fc] text-sm text-[#475569]"><span>◷ Disappearing Messages</span><span className="text-[#52647a]">Off</span></button>
                  <button
                    type="button"
                    onClick={handleChatLockButton}
                    disabled={chatLockLoading}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f3f7fc] text-sm text-[#475569] disabled:opacity-60"
                  >
                    <span>🔒 Chat Lock</span>
                    <span className={lockedChatIds.includes(selectedChat.id) ? "text-[#2563eb]" : "text-[#64748b]"}>
                      {lockedChatIds.includes(selectedChat.id) ? "On" : "Off"}
                    </span>
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-[#172033]">Call History</h4>
                    <button onClick={() => refreshCallHistory()} className="text-[11px] text-[#2563eb] hover:text-[#b5afff]">Refresh</button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {callHistory.length === 0 ? (
                      <div className="rounded-xl bg-[#f5f9ff] border border-[#dbe5f0] px-3 py-4 text-xs text-[#52647a]">No calls with this contact yet.</div>
                    ) : callHistory.map((call) => {
                      const outgoing = String(call.caller) === loggedInUser.id
                      const bad = ["missed", "rejected"].includes(call.status)
                      return (
                        <div key={call._id} className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-3 py-3 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bad ? "bg-red-500/10 text-red-400" : "bg-[#2563eb]/10 text-[#2563eb]"}`}>{call.type === "video" ? "▣" : "☎"}</div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold ${bad ? "text-red-500" : "text-[#172033]"}`}>{outgoing ? "Outgoing" : "Incoming"} {call.type} call</p>
                            <p className="text-[10px] text-[#727d8e] mt-0.5">{new Date(call.createdAt).toLocaleString()} • {call.status}{call.duration ? ` • ${formatCallDuration(call.duration)}` : ""}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            </aside>
          )}
        </div>
      </div>
    )
  }

  // =========================
  // LOGIN / SIGNUP
  // =========================
  if (authView === "forgot") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">NexChat</h1>
          <p className="text-center text-gray-500 mb-6">Forgot your password?</p>

          <input
            type="email"
            placeholder="Enter your registered email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
            className="w-full border p-3 rounded-lg mb-4"
          />

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="w-full bg-blue-600 disabled:opacity-60 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            {resetLoading ? "Sending..." : "Send OTP"}
          </button>

          {resetMessage && <p className="text-center mt-4 text-blue-600 text-sm">{resetMessage}</p>}

          <button
            type="button"
            onClick={() => {
              setAuthView("main")
              setResetMessage("")
            }}
            className="w-full text-center mt-5 text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  if (authView === "verifyOtp") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">NexChat</h1>
          <p className="text-center text-gray-500 mb-2">Verify reset code</p>
          <p className="text-center text-xs text-gray-400 mb-6">Enter the 6-digit code sent to your email.</p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit OTP"
            value={resetOtp}
            onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyResetOtp()}
            className="w-full border p-3 rounded-lg mb-4 text-center tracking-[0.35em] text-lg"
          />

          <button
            type="button"
            onClick={handleVerifyResetOtp}
            disabled={resetLoading}
            className="w-full bg-blue-600 disabled:opacity-60 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            {resetLoading ? "Verifying..." : "Verify OTP"}
          </button>

          {resetMessage && <p className="text-center mt-4 text-blue-600 text-sm">{resetMessage}</p>}

          <div className="flex justify-between mt-5 text-sm">
            <button type="button" onClick={() => { setAuthView("forgot"); setResetMessage("") }} className="text-blue-600 hover:underline">
              Change email
            </button>
            <button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-blue-600 hover:underline disabled:opacity-60">
              Resend OTP
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (authView === "resetPassword") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">NexChat</h1>
          <p className="text-center text-gray-500 mb-6">Create a new password</p>

          <div className="relative mb-4">
            <input
              type={showResetPassword ? "text" : "password"}
              placeholder="New Password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full border p-3 pr-12 rounded-lg"
            />
            <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-3 text-gray-500">
              {showResetPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type={showResetConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              className="w-full border p-3 pr-12 rounded-lg"
            />
            <button type="button" onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)} className="absolute right-3 top-3 text-gray-500">
              {showResetConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetLoading}
            className="w-full bg-blue-600 disabled:opacity-60 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            {resetLoading ? "Resetting..." : "Reset Password"}
          </button>

          {resetMessage && <p className="text-center mt-4 text-blue-600 text-sm">{resetMessage}</p>}
        </div>
      </div>
    )
  }

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

        <div className="relative mb-2">
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

        {!isSignup && (
          <div className="text-right mb-4">
            <button
              type="button"
              onClick={() => {
                setResetEmail(email)
                setResetOtp("")
                setResetPassword("")
                setResetConfirmPassword("")
                setResetMessage("")
                setAuthView("forgot")
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

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
