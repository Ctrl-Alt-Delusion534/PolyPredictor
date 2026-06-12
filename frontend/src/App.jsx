import React, { useState, useEffect } from "react";
import {
  Search,
  Wallet2,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Bookmark,
  Clock,
  Users,
  Globe,
  Plus,
  Trophy,
  Copy,
  UserPlus,
  X,
  ArrowUpDown,
} from "lucide-react";

const BASE_URL = "http://localhost:8000/api";

const apiRequest = async (endpoint, method = "GET", body = null) => {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Network routing exception.");
  }
  return response.json();
};

export default function App() {
  const [markets, setMarkets] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeTab, setActiveTab] = useState("MARKETS");
  const [sortBy, setSortBy] = useState("PROFIT");

  const [userId, setUserId] = useState(
    localStorage.getItem("nexus_user_id") || "",
  );
  const [userBalance, setUserBalance] = useState(0);
  const [username, setUsername] = useState("");

  const [isLogin, setIsLogin] = useState(true);
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [authStatus, setAuthStatus] = useState({
    loading: false,
    success: null,
    error: null,
  });

  const [predictionSide, setPredictionSide] = useState("YES");
  const [amountSpent, setAmountSpent] = useState("");
  const [tradeStatus, setTradeStatus] = useState({
    loading: false,
    success: null,
    error: null,
  });

  const [newMarketTitle, setNewMarketTitle] = useState("");
  const [newMarketDesc, setNewMarketDesc] = useState("");
  const [marketVisibility, setMarketVisibility] = useState("PUBLIC");
  const [targetGroupName, setTargetGroupName] = useState("");
  const [creationStatus, setCreationStatus] = useState({
    loading: false,
    success: null,
    error: null,
  });

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null);

  const fetchPlatformData = async () => {
    if (!userId || userId === "undefined") {
      handleLogout();
      return;
    }
    setLoading(true);

    try {
      const marketRes = await apiRequest("/markets");
      setMarkets(marketRes.markets || marketRes || []);
    } catch (error) {
      console.error("Markets Sync Failed:", error.message);
    }

    try {
      const profileRes = await apiRequest(`/users/profile/${userId}`);
      const userData = profileRes?.user || profileRes;
      if (userData && (userData.username || userData.balance !== undefined)) {
        setUserBalance(parseFloat(userData.balance) || 0);
        setUsername(userData.username || "Trader");
      }
    } catch (error) {
      console.error("Profile Sync Failed:", error.message);
    }

    try {
      let leaderboardRes;
      try {
        leaderboardRes = await apiRequest("/leaderboard");
      } catch {
        leaderboardRes = await apiRequest("/users/leaderboard");
      }
      setLeaderboard(leaderboardRes.rankings || leaderboardRes || []);
    } catch (error) {
      console.error("Leaderboard Sync Failed:", error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (userId && userId !== "undefined") {
      fetchPlatformData();
    }
  }, [userId]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthStatus({ loading: true, success: null, error: null });
    const endpoint = isLogin ? "/users/login" : "/users/register";
    const payload = isLogin
      ? { email: regEmail, password: regPassword }
      : { username: regUsername, email: regEmail, password: regPassword };

    try {
      const response = await apiRequest(endpoint, "POST", payload);
      const targetUserId =
        response.user?.id ||
        response.user?._id ||
        response.id ||
        response._id ||
        (response.user && typeof response.user === "string"
          ? response.user
          : null);

      if (targetUserId && targetUserId !== "undefined") {
        localStorage.setItem("nexus_user_id", targetUserId);
        setUserId(targetUserId);
        setAuthStatus({
          loading: false,
          success: "Identity verified.",
          error: null,
        });
      } else {
        throw new Error(
          "Missing identification key from server response object.",
        );
      }
    } catch (error) {
      setAuthStatus({ loading: false, success: null, error: error.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nexus_user_id");
    setUserId("");
    setUserBalance(0);
    setUsername("");
    setMarkets([]);
    setLeaderboard([]);
    setAuthStatus({ loading: false, success: null, error: null });
  };

  const handleCreateMarket = async (e) => {
    e.preventDefault();
    if (!newMarketTitle || !newMarketDesc) return;
    setCreationStatus({ loading: true, success: null, error: null });

    try {
      const payload = {
        title: newMarketTitle,
        description: newMarketDesc,
        initialPriceOfYes: 0.5,
        initialFunding: 1000,
        userId: userId,
        visibility: marketVisibility,
        groupName: marketVisibility === "GROUP" ? targetGroupName : "",
      };

      await apiRequest("/markets/create", "POST", payload);

      setNewMarketTitle("");
      setNewMarketDesc("");
      setTargetGroupName("");

      setCreationStatus({
        loading: false,
        success: "Market initialized successfully.",
        error: null,
      });
      fetchPlatformData();
      setActiveTab("MARKETS");

      setTimeout(() => {
        setCreationStatus({ loading: false, success: null, error: null });
      }, 3000);
    } catch (error) {
      setCreationStatus({
        loading: false,
        success: null,
        error: error.message,
      });
    }
  };

  const handleOpenTradeDesk = (market, side) => {
    setSelectedMarket(market);
    setPredictionSide(side);
    setAmountSpent("");
    setTradeStatus({ loading: false, success: null, error: null });
  };

  const executeTradeOrder = async (e) => {
    e.preventDefault();
    if (
      !amountSpent ||
      parseFloat(amountSpent) <= 0 ||
      !userId ||
      !selectedMarket
    )
      return;
    setTradeStatus({ loading: true, success: null, error: null });

    try {
      const response = await apiRequest("/markets/bets/place", "POST", {
        marketId: selectedMarket._id,
        userId: userId,
        prediction: predictionSide,
        amountSpent: parseFloat(amountSpent),
      });

      setTradeStatus({
        loading: false,
        success: "Order executed completely.",
        error: null,
      });

      const finalBalance =
        response.executedOrder?.updatedWalletBalance || userBalance;
      setUserBalance(parseFloat(finalBalance));
      fetchPlatformData();

      setTimeout(() => {
        setSelectedMarket(null);
        setTradeStatus({ loading: false, success: null, error: null });
      }, 1500);
    } catch (error) {
      setTradeStatus({
        loading: false,
        success: null,
        error: error.message || "Transaction processing pipeline failure.",
      });
    }
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    setActiveTab("MARKETS");
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?inviteGroup=${encodeURIComponent(targetGroupName || "Nexus")}`;
    navigator.clipboard.writeText(inviteUrl);
    setInviteStatus("Link copied to clipboard!");
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const submitDirectInvite = (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteStatus(`Invitation pinned directly to handle: ${inviteUsername}`);
    setInviteUsername("");
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const getProbability = (market) => {
    const totalShares = (market.yesShares || 0) + (market.noShares || 0);
    if (totalShares === 0) return { yes: 50, no: 50 };
    const yesProb = (((market.noShares || 0) / totalShares) * 100).toFixed(0);
    return { yes: parseInt(yesProb), no: 100 - parseInt(yesProb) };
  };

  const categories = [
    "ALL",
    ...new Set(
      markets.map((m) => (m.category || "GENERAL").trim().toUpperCase()),
    ),
  ];
  const filteredMarkets =
    activeCategory === "ALL"
      ? markets
      : markets.filter(
          (m) =>
            (m.category || "GENERAL").trim().toUpperCase() === activeCategory,
        );

  const getSortedLeaderboard = () => {
    return [...leaderboard].sort((a, b) => {
      let valA, valB;
      if (sortBy === "PROFIT") {
        valA =
          a.profitGained !== undefined
            ? a.profitGained
            : (a.balance || 1000) - 1000;
        valB =
          b.profitGained !== undefined
            ? b.profitGained
            : (b.balance || 1000) - 1000;
      } else if (sortBy === "MARGIN") {
        valA = a.balance || 0;
        valB = b.balance || 0;
      } else {
        valA = a.successfulBets || 0;
        valB = b.successfulBets || 0;
      }

      if (valB === valA) {
        const fallbackA =
          a.profitGained !== undefined
            ? a.profitGained
            : (a.balance || 1000) - 1000;
        const fallbackB =
          b.profitGained !== undefined
            ? b.profitGained
            : (b.balance || 1000) - 1000;
        return fallbackB - fallbackA;
      }
      return valB - valA;
    });
  };

  const currentUserRecord =
    leaderboard.find((user) => user._id === userId) || {};
  const successfulBets = currentUserRecord.successfulBets || 0;
  const totalProfit = parseFloat((userBalance - 1000).toFixed(2));
  const roi = parseFloat(((userBalance - 1000) / 1000) * 100).toFixed(1);

  const performanceScore = Math.round(
    Math.max(
      700,
      Math.min(1450, 900 + Math.max(0, totalProfit) * 4 + successfulBets * 14),
    ),
  );

  const levelInfo = (() => {
    if (performanceScore < 940) {
      return {
        rank: "Novice",
        label: "Rising Trader",
        accent: "bg-[#334155] text-[#94a3b8]",
      };
    }
    if (performanceScore < 1020) {
      return {
        rank: "Bronze",
        label: "Momentum Builder",
        accent: "bg-[#1f2937] text-[#c7d2fe]",
      };
    }
    if (performanceScore < 1100) {
      return {
        rank: "Silver",
        label: "Strategist",
        accent: "bg-[#111827] text-[#93c5fd]",
      };
    }
    if (performanceScore < 1180) {
      return {
        rank: "Gold",
        label: "Alpha Operator",
        accent: "bg-[#312e81] text-[#e9d5ff]",
      };
    }
    if (performanceScore < 1260) {
      return {
        rank: "Platinum",
        label: "Market Artisan",
        accent: "bg-[#0f172a] text-[#a5b4fc]",
      };
    }
    return {
      rank: "Legend",
      label: "Trade Maestro",
      accent: "bg-[#0f172a] text-[#f9a8d4]",
    };
  })();

  const trendSeed = Math.min(
    1,
    Math.max(
      0.2,
      0.45 + Math.max(0, totalProfit) / 800 + successfulBets * 0.02,
    ),
  );
  const trendData = Array.from({ length: 7 }, (_, index) => {
    const factor = 0.35 + index * 0.06;
    return Math.min(1, Math.max(0.18, trendSeed * factor + index * 0.02));
  });

  const heatmapData = (() => {
    const days = 14;
    const wins = successfulBets;
    const lossesEstimate = Math.max(0, Math.round(Math.abs(totalProfit) / 50));
    const base = Array.from({ length: days }, () => ({ w: 0, l: 0 }));

    for (let i = 0; i < wins; i++) {
      const idx = Math.floor((i * 7) % days);
      base[idx].w += 1;
    }
    for (let i = 0; i < lossesEstimate; i++) {
      const idx = Math.floor((i * 5 + 3) % days);
      base[idx].l += 1;
    }
    return base.map((d, i) => ({
      day: i,
      wins: d.w,
      losses: d.l,
    }));
  })();

  const profitText =
    totalProfit === 0
      ? "Break-even"
      : totalProfit > 0
        ? `+₹${totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : `-₹${Math.abs(totalProfit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const summaryItems = [
    {
      title: "Opening capital",
      value: "₹1,000.00",
      label: "Seed funding",
    },
    {
      title: "Current equity",
      value: `₹${userBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      label: "Available balance",
    },
    {
      title: "Net profit",
      value: profitText,
      label: "Since account creation",
    },
    {
      title: "Win count",
      value: successfulBets,
      label: "Closed trades",
    },
  ];

  const checkbookItems = [
    {
      description: "Initial deposit",
      amount: "+₹1,000",
      status: "Settled",
    },
    {
      description: "Live equity update",
      amount: `${userBalance >= 1000 ? "+" : ""}₹${(userBalance - 1000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      status: "Current",
    },
    {
      description: "Success streak",
      amount: `${successfulBets} wins`,
      status: "Ongoing",
    },
  ];

  const VeraLogo = () => (
    <svg
      className="h-9 w-auto select-none overflow-visible"
      viewBox="0 0 150 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0, 10)">
        <rect x="4" y="0" width="5" height="15" rx="1.5" fill="#079cff" />
        <rect x="12" y="10" width="5" height="15" rx="1.5" fill="#3b82f6" />
        <rect x="20" y="20" width="5" height="15" rx="1.5" fill="#2563eb" />
        <rect x="28" y="20" width="5" height="20" rx="1.5" fill="#1d4ed8" />
        <rect x="36" y="10" width="5" height="25" rx="1.5" fill="#1e40af" />
        <rect x="44" y="-5" width="5" height="35" rx="1.5" fill="#1e3a8a" />
      </g>
      <text
        x="60"
        y="40"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="24"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="-0.5px"
      >
        VERA
      </text>
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-[#f3f4f6] font-sans antialiased tracking-normal selection:bg-[#079cff]/20 selection:text-[#079cff]">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {(creationStatus.success || creationStatus.error) && (
        <div className="fixed top-6 right-6 z-[100] max-w-sm w-full bg-[#0e1629]/95 border border-[#1e2e4f] backdrop-blur-xl rounded-xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mt-0.5 shrink-0">
            {creationStatus.success ? (
              <div className="p-1.5 bg-[#00b074]/10 rounded-lg border border-[#00b074]/20 text-[#00b074]">
                <CheckCircle2 size={16} />
              </div>
            ) : (
              <div className="p-1.5 bg-[#ff0026]/10 rounded-lg border border-[#ff0026]/20 text-[#ff0026]">
                <AlertTriangle size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider leading-none">
              {creationStatus.success
                ? "System Execution Success"
                : "Pipeline Exception"}
            </h4>
            <p className="text-xs text-gray-400 font-normal tracking-tight mt-1 leading-normal">
              {creationStatus.success || creationStatus.error}
            </p>
          </div>
          <button
            onClick={() =>
              setCreationStatus({ loading: false, success: null, error: null })
            }
            className="text-gray-500 hover:text-white transition-colors p-0.5 hover:bg-[#1c2844] rounded-md shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!userId || userId === "undefined" ? (
        <div className="flex-1 min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#070b14] to-[#03050a]">
          <div className="w-full max-w-sm bg-[#0e1424] border border-[#1e2942] rounded-xl p-8 shadow-xl relative">
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="mb-2">
                <VeraLogo />
              </div>
              <p className="text-xs text-gray-400 font-normal tracking-tight">
                Access high-performance derivative consensus clearing.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                    Trader Handle
                  </label>
                  <input
                    type="text"
                    required={!isLogin}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g., SahilSingh"
                    className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none placeholder-gray-600 transition-colors font-normal"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none placeholder-gray-600 transition-colors font-normal"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none placeholder-gray-600 transition-colors font-normal"
                />
              </div>

              {authStatus.error && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-xs font-medium">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{authStatus.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authStatus.loading}
                className="w-full py-2.5 bg-[#079cff] hover:bg-[#0086e6] text-white font-semibold rounded-lg text-sm tracking-tight transition-colors flex items-center justify-center gap-1.5 mt-6 shadow-sm"
              >
                {authStatus.loading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <span>
                      {isLogin
                        ? "Sign in to terminal"
                        : "Create institutional account"}
                    </span>{" "}
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>

              <div className="text-center mt-5 border-t border-[#1e2942]/60 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setAuthStatus({
                      loading: false,
                      success: null,
                      error: null,
                    });
                  }}
                  className="text-xs text-gray-400 hover:text-[#079cff] transition-colors font-normal tracking-tight"
                >
                  {isLogin
                    ? "New to the platform? Create an account"
                    : "Have an account? Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <nav className="border-b border-[#1e2942]/70 bg-[#070b14]/90 backdrop-blur-md px-6 md:px-16 py-3 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center space-x-6 md:space-x-10">
              <div
                className="cursor-pointer"
                onClick={() => setActiveTab("MARKETS")}
              >
                <VeraLogo />
              </div>

              <div className="flex items-center space-x-0.5 bg-[#0e1424] border border-[#1e2942]/80 p-0.5 rounded-lg">
                <button
                  onClick={() => setActiveTab("MARKETS")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "MARKETS" ? "bg-[#1e2d54] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Markets
                </button>
                <button
                  onClick={() => setActiveTab("CREATE")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "CREATE" ? "bg-[#1e2d54] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Deploy Pool
                </button>
                <button
                  onClick={() => setActiveTab("LEADERBOARD")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "LEADERBOARD" ? "bg-[#1e2d54] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="flex items-center space-x-2.5 bg-[#0e1424] border border-[#1e2942]/80 px-3 py-1.5 rounded-lg">
                <Wallet2 size={14} className="text-[#079cff]" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-bold tracking-tight uppercase leading-none">
                    Available Balance
                  </span>
                  <span className="font-bold text-xs md:text-sm tracking-tight mt-0.5 text-white">
                    ₹
                    {userBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-[#ff0026] border border-[#1e2942]/80 rounded-lg transition-colors bg-transparent"
              >
                <LogOut size={14} />
              </button>

              <button
                onClick={fetchPlatformData}
                className="p-2 bg-[#0e1424] border border-[#1e2942]/80 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw
                  size={13}
                  className={loading ? "animate-spin text-[#079cff]" : ""}
                />
              </button>
            </div>
          </nav>

          <div className="bg-[#070b14] border-b border-[#1e2942]/50 px-6 md:px-16 py-2 overflow-x-auto flex items-center justify-between">
            <div className="flex items-center space-x-1.5 scrollbar-none">
              <SlidersHorizontal
                size={12}
                className="text-gray-500 mr-1.5 shrink-0"
              />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-colors shrink-0 ${activeCategory === cat ? "bg-[#079cff]/10 border border-[#079cff]/30 text-[#079cff]" : "text-gray-400 border border-transparent hover:text-white hover:bg-[#0e1424]"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 hidden sm:flex font-medium items-center gap-1.5 tracking-tight">
              <Clock size={13} /> Engine Clock:{" "}
              <span className="text-gray-300 font-semibold">
                Continuous T+0 Clearing
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 relative overflow-hidden px-6 md:px-16 py-6 gap-6">
            <main
              className={`flex-1 transition-all duration-300 overflow-y-auto ${selectedMarket ? "pr-[380px]" : ""}`}
            >
              {activeTab === "MARKETS" && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2 uppercase">
                      <Layers size={14} className="text-[#079cff]" /> Live
                      Exchange Positions{" "}
                      {activeCategory !== "ALL" && (
                        <span className="text-xs font-normal text-gray-400 lowercase">
                          / in {activeCategory}
                        </span>
                      )}
                    </h1>
                  </div>

                  {markets.length === 0 ? (
                    <div className="border border-dashed border-[#1e2942] rounded-xl p-16 text-center text-gray-500 bg-[#0e1424]/20">
                      <HelpCircle
                        size={20}
                        className="mx-auto text-gray-600 mb-2"
                      />
                      <p className="text-xs tracking-tight">
                        No active indices fetched from database pipeline layers.
                      </p>
                    </div>
                  ) : filteredMarkets.length === 0 ? (
                    <div className="border border-dashed border-[#1e2942] rounded-xl p-16 text-center text-gray-500 bg-[#0e1424]/20">
                      <HelpCircle
                        size={20}
                        className="mx-auto text-gray-600 mb-2"
                      />
                      <p className="text-xs tracking-tight">
                        No active indices found under the "{activeCategory}"
                        category.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {filteredMarkets.map((market) => {
                        const probs = getProbability(market);
                        return (
                          <div
                            key={market._id}
                            className="bg-[#0e1424] border border-[#1e2942]/80 rounded-xl p-4.5 hover:border-[#28395c] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1.5">
                                  <span className="text-[9px] uppercase font-bold tracking-tight text-[#079cff] bg-[#079cff]/10 border border-[#079cff]/20 px-1.5 py-0.5 rounded">
                                    {(market.category || "GENERAL")
                                      .trim()
                                      .toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1 tracking-tight">
                                    {market.visibility === "GROUP" ? (
                                      <Users
                                        size={12}
                                        className="text-[#ff770f]"
                                      />
                                    ) : (
                                      <Globe
                                        size={12}
                                        className="text-[#079cff]"
                                      />
                                    )}
                                    {market.visibility === "GROUP"
                                      ? "Private Group"
                                      : "Public Market"}
                                  </span>
                                  {market.groupName && (
                                    <span className="text-xs text-[#ff770f] font-semibold px-1.5 py-0.5 bg-[#ff770f]/5 rounded border border-[#ff770f]/10 tracking-tight">
                                      {market.groupName}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-sm md:text-base text-white tracking-tight leading-snug">
                                  {market.title}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 font-normal tracking-tight">
                                  {market.description}
                                </p>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  onClick={() =>
                                    handleOpenTradeDesk(market, "YES")
                                  }
                                  className="w-20 bg-[#00b074]/5 hover:bg-[#00b074] border border-[#00b074]/20 text-[#00b074] hover:text-white py-1.5 rounded-lg flex flex-col items-center justify-center transition-all font-bold"
                                >
                                  <span className="text-[8px] tracking-tight opacity-75 leading-none">
                                    YES
                                  </span>
                                  <span className="text-sm font-bold mt-0.5 leading-none">
                                    {probs.yes}%
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleOpenTradeDesk(market, "NO")
                                  }
                                  className="w-20 bg-[#ff0026]/5 hover:bg-[#ff0026] border border-[#ff0026]/20 text-[#ff0026] hover:text-white py-1.5 rounded-lg flex flex-col items-center justify-center transition-all font-bold"
                                >
                                  <span className="text-[8px] tracking-tight opacity-75 leading-none">
                                    NO
                                  </span>
                                  <span className="text-sm font-bold mt-0.5 leading-none">
                                    {probs.no}%
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="mt-3.5 pt-3 border-t border-[#1e2942]/40 flex items-center justify-between text-[11px] text-gray-500 tracking-tight">
                              <div className="flex items-center gap-3 w-full max-w-xs">
                                <div className="w-full bg-[#1e2942] h-1 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-[#079cff] h-full"
                                    style={{ width: `${probs.yes}%` }}
                                  />
                                </div>
                                <span className="shrink-0 font-medium text-gray-400">
                                  {probs.yes}% consensus
                                </span>
                              </div>
                              <span className="font-semibold text-gray-400">
                                Pool Volume: ₹
                                {(market.totalVolumeSpent || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "CREATE" && (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="bg-[#0e1424] border border-[#1e2942]/80 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-5 border-b border-[#1e2942]/40 pb-2.5">
                      <Plus size={16} className="text-[#079cff]" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                        Initialize Pool Contract
                      </h2>
                    </div>

                    <form onSubmit={handleCreateMarket} className="space-y-4">
                      <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#070b14] border border-[#1e2942]/80 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setMarketVisibility("PUBLIC")}
                          className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 tracking-tight transition-colors uppercase ${marketVisibility === "PUBLIC" ? "bg-[#1e2d54] text-white" : "text-gray-400 hover:text-white"}`}
                        >
                          <Globe size={13} /> Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarketVisibility("GROUP")}
                          className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 tracking-tight transition-colors uppercase ${marketVisibility === "GROUP" ? "bg-[#ff770f] text-white" : "text-gray-400 hover:text-white"}`}
                        >
                          <Users size={13} /> Private Group
                        </button>
                      </div>

                      {marketVisibility === "GROUP" && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                            Group Identifier Context
                          </label>
                          <input
                            type="text"
                            required
                            value={targetGroupName}
                            onChange={(e) => setTargetGroupName(e.target.value)}
                            placeholder="e.g., General Council"
                            className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#ff770f] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none placeholder-gray-600 font-normal transition-colors"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                          Market Question Target
                        </label>
                        <input
                          type="text"
                          required
                          value={newMarketTitle}
                          onChange={(e) => setNewMarketTitle(e.target.value)}
                          placeholder="e.g., Will the Nifty index touch 26k before Friday?"
                          className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none placeholder-gray-600 font-normal transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                          Baseline Settlement Parameters
                        </label>
                        <textarea
                          required
                          value={newMarketDesc}
                          onChange={(e) => setNewMarketDesc(e.target.value)}
                          placeholder="State explicit objective tracking details required to resolve contracts."
                          rows="3"
                          className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none placeholder-gray-600 font-normal resize-none transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={creationStatus.loading}
                        className="w-full py-2 bg-[#079cff] hover:bg-[#0086e6] text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-4"
                      >
                        {creationStatus.loading ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <span>Deploy pool contract</span>
                        )}
                      </button>
                    </form>
                  </div>

                  {marketVisibility === "GROUP" && targetGroupName && (
                    <div className="bg-[#0e1424] border border-[#1e2942]/80 rounded-xl p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center gap-2 border-b border-[#1e2942]/40 pb-2">
                        <UserPlus size={15} className="text-[#ff770f]" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Invite Traders to Context
                        </h3>
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Encrypted Access Link
                          </label>
                          <button
                            type="button"
                            onClick={copyInviteLink}
                            className="w-full py-2 bg-[#070b14] border border-[#1e2942] hover:border-[#ff770f] text-gray-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Copy size={13} /> Copy Contest URL
                          </button>
                        </div>

                        <div className="border-t border-[#1e2942]/40 pt-2.5">
                          <form
                            onSubmit={submitDirectInvite}
                            className="space-y-1.5"
                          >
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                              Direct Handle Referral
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inviteUsername}
                                onChange={(e) =>
                                  setInviteUsername(e.target.value)
                                }
                                placeholder="Trader handle username"
                                className="flex-1 bg-[#070b14] border border-[#1e2942] focus:border-[#ff770f] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none font-normal"
                              />
                              <button
                                type="submit"
                                className="bg-[#ff770f] text-white px-3 rounded-lg font-bold text-xs uppercase tracking-tight transition-colors"
                              >
                                Send
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>

                      {inviteStatus && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-[#ff770f] text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>{inviteStatus}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "LEADERBOARD" && (
                <div className="max-w-3xl mx-auto bg-[#0e1424] border border-[#1e2942]/80 rounded-xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-[#1e2942]/40 bg-[#070b14]/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Trophy size={16} className="text-[#ff770f]" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                        Trading Standings Platform
                      </h2>
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight bg-[#070b14] border border-[#1e2942] px-2.5 py-1 rounded-md">
                      Achievers
                    </span>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="p-12 text-center text-xs text-gray-500 tracking-tight font-normal">
                      No matching rankings calculated for current clearing
                      sessions.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left tracking-tight">
                        <thead>
                          <tr className="border-b border-[#1e2942]/40 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#070b14]/50 select-none">
                            <th className="py-3 px-4 w-16 text-center">Rank</th>
                            <th className="py-3 px-3">Trader Handle</th>
                            <th
                              className="py-3 px-3 text-right cursor-pointer hover:bg-[#16223b] transition-colors"
                              onClick={() => setSortBy("MARGIN")}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Available Margin{" "}
                                <ArrowUpDown
                                  size={11}
                                  className={
                                    sortBy === "MARGIN"
                                      ? "text-[#079cff]"
                                      : "text-gray-500"
                                  }
                                />
                              </div>
                            </th>
                            <th
                              className="py-3 px-3 text-right cursor-pointer hover:bg-[#16223b] transition-colors"
                              onClick={() => setSortBy("BETS")}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Successful Bets{" "}
                                <ArrowUpDown
                                  size={11}
                                  className={
                                    sortBy === "BETS"
                                      ? "text-[#079cff]"
                                      : "text-gray-500"
                                  }
                                />
                              </div>
                            </th>
                            <th
                              className="py-3 px-5 text-right cursor-pointer hover:bg-[#16223b] transition-colors"
                              onClick={() => setSortBy("PROFIT")}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Net Profit{" "}
                                <ArrowUpDown
                                  size={11}
                                  className={
                                    sortBy === "PROFIT"
                                      ? "text-[#079cff]"
                                      : "text-gray-500"
                                  }
                                />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2942]/30">
                          {getSortedLeaderboard().map((user, idx) => {
                            const calculatedProfit =
                              user.profitGained !== undefined
                                ? user.profitGained
                                : (user.balance || 1000) - 1000;

                            const isFirst = idx === 0;
                            const isSecond = idx === 1;
                            const isThird = idx === 2;

                            let positionStyle = "hover:bg-[#121b30]/40";
                            if (isFirst)
                              positionStyle =
                                "bg-[#ff770f]/5 hover:bg-[#ff770f]/10 shadow-[inset_3px_0_0_0_#ff770f]";
                            if (isSecond)
                              positionStyle =
                                "bg-[#079cff]/5 hover:bg-[#079cff]/10 shadow-[inset_3px_0_0_0_#079cff]";
                            if (isThird)
                              positionStyle =
                                "bg-[#8f5bff]/5 hover:bg-[#8f5bff]/10 shadow-[inset_3px_0_0_0_#8f5bff]";

                            return (
                              <tr
                                key={user._id || idx}
                                className={`transition-colors font-normal ${positionStyle}`}
                              >
                                <td className="py-3 px-5 text-center">
                                  {isFirst ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#ff770f]/10 text-[#ff770f] font-bold text-xs border border-[#ff770f]/20">
                                      1
                                    </span>
                                  ) : isSecond ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#079cff]/10 text-[#079cff] font-bold text-xs border border-[#079cff]/20">
                                      2
                                    </span>
                                  ) : isThird ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#8f5bff]/10 text-[#8f5bff] font-bold text-xs border border-[#8f5bff]/20">
                                      3
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-gray-500">
                                      #{idx + 1}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-semibold ${isFirst ? "text-[#ff770f]" : isSecond ? "text-[#079cff]" : isThird ? "text-[#8f5bff]" : "text-gray-200"}`}
                                    >
                                      {user.username}
                                    </span>
                                    {user._id === userId && (
                                      <span className="text-[8px] uppercase font-bold tracking-tight px-1.5 py-0.5 bg-[#1e2942] border border-[#2b3a5c] text-white rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right text-xs font-medium text-gray-400">
                                  ₹
                                  {(user.balance || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-3 px-3 text-right text-xs font-semibold text-gray-300">
                                  {user.successfulBets || 0}
                                </td>
                                <td className="py-3 px-5 text-right">
                                  <span
                                    className={`text-sm font-bold tracking-tight ${calculatedProfit >= 0 ? "text-[#00b074]" : "text-[#ff0026]"}`}
                                  >
                                    {calculatedProfit >= 0 ? "+" : ""}₹
                                    {calculatedProfit.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </main>

            <aside className="flex flex-col w-full lg:w-80 space-y-4 shrink-0 border-t border-[#1e2942]/40 lg:border-t-0 lg:border-l pl-0 lg:pl-6 pt-6 lg:pt-0 font-sans">
              <div className="bg-[#0c121f] border border-[#1d2b46]/70 rounded-3xl p-5 shadow-[0_28px_70px_rgba(0,0,0,0.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-gray-400 font-bold">
                      Performance Ledger
                    </p>
                    <h3 className="mt-3 text-white font-bold text-lg tracking-tight">
                      Trading run overview
                    </h3>
                  </div>
                  {levelInfo.rank === "Novice" ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg,#ffd27a,#ff8a65)",
                          boxShadow:
                            "0 10px 30px rgba(255,138,101,0.22), inset 0 -6px 12px rgba(0,0,0,0.14)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="text-white text-sm font-extrabold">
                          N
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white">
                          Novice
                        </div>
                        <div className="text-[11px] text-gray-300">
                          Rising Trader
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.24em] ${levelInfo.accent}`}
                    >
                      {levelInfo.rank}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="bg-[#061020] rounded-3xl border border-[#16203a]/70 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-gray-400 font-bold">
                          Trader Rating
                        </p>
                        <p className="mt-2 text-3xl font-bold text-white">
                          {performanceScore}
                        </p>
                      </div>
                      <div
                        className={`rounded-3xl px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] ${levelInfo.accent}`}
                      >
                        {levelInfo.label}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="relative h-28 mb-3">
                        <div className="absolute inset-0 flex items-end gap-2 px-1">
                          {trendData.map((height, index) => {
                            const pct = Math.round(height * 100);
                            const isHigh = height > 0.75;
                            const glow = isHigh
                              ? "0 6px 18px rgba(0,176,116,0.28)"
                              : "0 6px 18px rgba(7,156,255,0.16)";
                            const bg = isHigh
                              ? "linear-gradient(180deg,#00e092,#00b074)"
                              : "linear-gradient(180deg,#60a5fa,#079cff)";
                            return (
                              <div
                                key={index}
                                className="flex-1 h-full flex items-end"
                              >
                                <div
                                  title={`${pct}%`}
                                  style={{
                                    height: `${pct}%`,
                                    background: bg,
                                    boxShadow: glow,
                                    borderRadius: "999px 999px 6px 6px",
                                  }}
                                  className="w-full"
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#0b1220]" />
                      </div>
                      <p className="mt-1 text-xs text-gray-400 tracking-tight">
                        Live run graph for your profit and success trajectory.
                      </p>

                      <div className="mt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-[0.18em] font-bold mb-2">
                          14-day heatmap
                        </p>
                        <div className="grid grid-cols-7 gap-2">
                          {heatmapData.map((d, idx) => {
                            const { wins, losses } = d;
                            let bgColor = "rgba(9,11,16,0.18)";
                            let textColor = "#94a3b8";
                            if (wins > 0 && losses === 0) {
                              const a = Math.min(0.95, 0.25 + wins * 0.18);
                              bgColor = `rgba(0,186,116,${a})`;
                              textColor = "#02140a";
                            } else if (losses > 0 && wins === 0) {
                              const a = Math.min(0.95, 0.2 + losses * 0.18);
                              bgColor = `rgba(255,2,38,${a})`;
                              textColor = "#2a0306";
                            } else if (wins > 0 && losses > 0) {
                              const a = Math.min(
                                0.95,
                                0.25 + (wins + losses) * 0.12,
                              );
                              bgColor = `rgba(147,51,234,${a})`;
                              textColor = "#0f0711";
                            }

                            return (
                              <div
                                key={idx}
                                className="rounded-2xl aspect-square flex items-center justify-center text-center text-[11px] font-semibold border border-[#1e2930]/25"
                                style={{
                                  background: bgColor,
                                  color: textColor,
                                }}
                                title={`Day ${idx + 1}: ${wins} wins, ${losses} losses`}
                              >
                                {wins === 0 && losses === 0
                                  ? "—"
                                  : `${wins}w${losses ? ` / ${losses}l` : ""}`}
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-gray-400">
                          Green = wins only, Red = losses only, Purple = mixed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {summaryItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#07101b] border border-[#1d2d4e]/60 rounded-3xl p-4 min-h-[128px] flex flex-col justify-between"
                      >
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-gray-400 font-bold">
                            {item.title}
                          </p>
                          <p className="mt-3 text-lg font-extrabold text-white">
                            {item.value}
                          </p>
                        </div>
                        <div className="mt-4 rounded-full bg-[#0f1725] border border-[#1b2640] py-2 px-3 text-center text-[11px] text-gray-400 font-semibold">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#070b14] rounded-3xl border border-[#1e292f]/70 p-4 font-sans">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500 font-bold">
                        Checkbook Summary
                      </p>
                      <span className="text-[10px] text-[#79c0ff] uppercase tracking-[0.24em] font-bold">
                        Live
                      </span>
                    </div>
                    <div className="space-y-3">
                      {checkbookItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-[#081123] border border-[#172241]/60 rounded-3xl px-3 py-3 flex flex-col items-center text-center gap-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.status}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-white">
                            {item.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <aside
              className={`fixed right-0 top-[116px] bottom-0 w-[380px] bg-[#0e1424] border-l border-[#1e2942] p-5 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto flex flex-col justify-between tracking-tight ${selectedMarket ? "translate-x-0" : "translate-x-full"}`}
            >
              {selectedMarket && (
                <div className="flex flex-col h-full justify-between space-y-6">
                  <div className="space-y-4.5">
                    <div className="flex items-center justify-between border-b border-[#1e2942]/40 pb-2">
                      <h2 className="font-bold text-xs text-gray-400 tracking-wider uppercase">
                        Ticket Dispatch
                      </h2>
                      <button
                        onClick={() => setSelectedMarket(null)}
                        className="text-gray-400 hover:text-white text-xs bg-[#070b14] border border-[#1e2942] px-2.5 py-0.5 rounded-md transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                    <h3 className="font-bold text-sm text-white tracking-tight leading-snug">
                      {selectedMarket.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-1.5 bg-[#070b14] p-0.5 rounded-lg border border-[#1e2942]">
                      <button
                        type="button"
                        onClick={() => setPredictionSide("YES")}
                        className={`py-1.5 text-xs font-bold rounded-md uppercase tracking-tight transition-all ${predictionSide === "YES" ? "bg-[#00b074] text-white" : "text-gray-400 hover:text-white"}`}
                      >
                        Buy YES
                      </button>
                      <button
                        type="button"
                        onClick={() => setPredictionSide("NO")}
                        className={`py-1.5 text-xs font-bold rounded-md uppercase tracking-tight transition-all ${predictionSide === "NO" ? "bg-[#ff0026] text-white" : "text-gray-400 hover:text-white"}`}
                      >
                        Buy NO
                      </button>
                    </div>

                    <form onSubmit={executeTradeOrder} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 tracking-tight mb-1">
                          Contract Transaction Volume (INR)
                        </label>
                        <div className="relative rounded-lg">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm font-semibold">
                              ₹
                            </span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            disabled={tradeStatus.loading}
                            value={amountSpent}
                            onChange={(e) => setAmountSpent(e.target.value)}
                            placeholder="0.00"
                            className="block w-full bg-[#070b14] border border-[#1e2942] focus:border-[#079cff]/50 rounded-lg px-3 py-2 pl-7 text-white font-bold text-base focus:outline-none"
                          />
                        </div>
                      </div>

                      {tradeStatus.error && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            backgroundColor: "#FDF2F2",
                            border: "1px solid #FBD5D5",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            animation: "fadeIn 0.2s ease-in-out",
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            style={{ marginTop: "2px", flexShrink: 0 }}
                          >
                            <path
                              d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                              fill="#F87171"
                            />
                            <path
                              d="M10 6V11M10 14H10.01"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                color: "#9B1C1C",
                                fontSize: "14px",
                                fontWeight: "600",
                                lineHeight: "20px",
                              }}
                            >
                              Trade Execution Blocked
                            </span>
                            <span
                              style={{
                                color: "#B91C1C",
                                fontSize: "13px",
                                fontWeight: "400",
                                lineHeight: "18px",
                              }}
                            >
                              {tradeStatus.error}
                            </span>
                          </div>
                        </div>
                      )}

                      {tradeStatus.success && (
                        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-[#079cff] text-xs font-medium">
                          <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                          <span>{tradeStatus.success}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={tradeStatus.loading || !amountSpent}
                        className={`w-full py-2.5 rounded-lg font-bold tracking-tight text-xs uppercase flex items-center justify-center gap-1.5 transition-colors ${tradeStatus.loading ? "bg-[#1e2d54] text-gray-500 cursor-wait" : predictionSide === "YES" ? "bg-[#00b074] hover:bg-[#009662] text-white" : "bg-[#ff0026] hover:bg-[#d6001e] text-white"}`}
                      >
                        {tradeStatus.loading ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <>
                            <span>Transmit Transaction</span>{" "}
                            <ArrowUpRight size={13} />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="border-t border-[#1e2942]/40 pt-3 space-y-1.5 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Index Implied Probability</span>
                      <span className="text-white font-bold">
                        {predictionSide === "YES"
                          ? getProbability(selectedMarket).yes
                          : getProbability(selectedMarket).no}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Routing Core Pipeline</span>
                      <span className="text-[#079cff] font-semibold flex items-center gap-1">
                        <ShieldCheck size={12} /> Realtime AMM Sync
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
