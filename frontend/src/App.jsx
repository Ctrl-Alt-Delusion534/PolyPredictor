import React, { useState, useEffect } from "react";
import { apiRequest } from "./utils/api";
import {
  TrendingUp,
  Search,
  Wallet2,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  SlidersHorizontal,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Globe,
  Coins,
} from "lucide-react";

export default function App() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");

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

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/markets");
      setMarkets(data.markets || data);
    } catch (error) {
      console.error("Failed to load markets feed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!userId) return;
    try {
      const response = await apiRequest(`/users/profile/${userId}`);
      const profileData = response?.user ? response.user : response;

      if (profileData && typeof profileData.balance !== "undefined") {
        setUserBalance(parseFloat(profileData.balance));
        setUsername(profileData.username || "Trader");
      }
    } catch (error) {
      console.error("Failed to synchronize user balance from database.", error);
    }
  };

  useEffect(() => {
    fetchMarkets();
    if (userId) {
      fetchUserProfile();
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
      const targetUserId = response.user?.id || response.user?._id;

      if (targetUserId) {
        localStorage.setItem("nexus_user_id", targetUserId);
        setUserId(targetUserId);
        setAuthStatus({
          loading: false,
          success: "Identity verified successfully!",
          error: null,
        });
      } else {
        throw new Error("User ID missing from response payload.");
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
    setAuthStatus({ loading: false, success: null, error: null });
  };

  const handleOpenTradeDesk = (market, side) => {
    setSelectedMarket(market);
    setPredictionSide(side);
    setAmountSpent("");
    setTradeStatus({ loading: false, success: null, error: null });
  };

  const executeTradeOrder = async (e) => {
    e.preventDefault();
    if (!amountSpent || parseFloat(amountSpent) <= 0 || !userId) return;

    setTradeStatus({ loading: true, success: null, error: null });

    try {
      const response = await apiRequest("/bets/place", "POST", {
        marketId: selectedMarket._id,
        userId: userId,
        prediction: predictionSide,
        amountSpent: parseFloat(amountSpent),
      });

      setTradeStatus({
        loading: false,
        success: `Order filled instantly. Contracts allocated to your vault.`,
        error: null,
      });

      const finalBalance =
        response.executedOrder?.updatedWalletBalance || response.executedOrder;
      setUserBalance(parseFloat(finalBalance));
      fetchMarkets();

      setTimeout(() => setSelectedMarket(null), 1800);
    } catch (error) {
      setTradeStatus({
        loading: false,
        success: null,
        error: error.message || "Execution failure: Pool depth insufficient.",
      });
    }
  };

  const getProbability = (market) => {
    const totalShares = market.yesShares + market.noShares;
    if (totalShares === 0) return { yes: 50, no: 50 };
    const yesProb = ((market.noShares / totalShares) * 100).toFixed(0);
    return { yes: parseInt(yesProb), no: 100 - parseInt(yesProb) };
  };

  const categories = [
    "ALL",
    ...new Set(markets.map((m) => m.category || "GENERAL")),
  ];
  const filteredMarkets =
    activeCategory === "ALL"
      ? markets
      : markets.filter((m) => (m.category || "GENERAL") === activeCategory);

  return (
    <div className="min-h-screen bg-[#04080f] text-[#e4e7ec] font-sans flex flex-col antialiased selection:bg-[#00e676]/10 selection:text-[#00e676]">
      {/* Premium Sticky Navigation Bar */}
      <nav className="border-b border-[#111927] bg-[#04080f]/80 backdrop-blur-xl px-6 md:px-16 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-12">
          {/* Vera Rebranded High-Intent Logo */}
          <div className="flex items-center space-x-2.5 group cursor-pointer">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[#00e676]/20 blur-md rounded-full scale-75 group-hover:scale-110 transition-transform duration-300" />
              <div className="bg-gradient-to-tr from-[#00b0ff] to-[#00e676] text-[#04080f] rounded-xl p-2 relative shadow-lg">
                <Activity size={18} strokeWidth={3} className="animate-pulse" />
              </div>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              vera{" "}
              <span className="text-[#00e676] text-[10px] font-bold px-1.5 py-0.5 bg-[#00e676]/10 rounded border border-[#00e676]/20 tracking-widest uppercase">
                PRO
              </span>
            </span>
          </div>

          {userId && (
            <div className="hidden md:flex items-center bg-[#0d1527] border border-[#16223f] rounded-xl px-4 py-2 w-80 shadow-inner transition-all duration-200 focus-within:border-[#00e676]/40 focus-within:bg-[#070d1a]">
              <Search size={14} className="text-gray-400 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Search events, tokens or contracts..."
                className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-full"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {userId && (
            <div className="flex items-center space-x-3 bg-[#0d1527] border border-[#16223f] px-4 py-2 rounded-xl">
              <Wallet2 size={14} className="text-[#00e676]" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                  Vault Principal
                </span>
                <span className="font-semibold text-white text-sm tracking-wide">
                  ₹
                  {userBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}

          {userId && (
            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-rose-400 border border-[#16223f] hover:border-rose-950 rounded-xl transition bg-transparent hover:bg-rose-950/10"
              title="Disconnect Session"
            >
              <LogOut size={15} />
            </button>
          )}

          <button
            onClick={() => {
              fetchMarkets();
              fetchUserProfile();
            }}
            className="p-2.5 bg-[#0d1527] hover:bg-[#16223f] border border-[#16223f] text-gray-400 hover:text-white rounded-xl transition"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin text-[#00e676]" : ""}
            />
          </button>
        </div>
      </nav>

      {/* Segmented Control Categorization */}
      <div className="bg-[#04080f] border-b border-[#111927] px-6 md:px-16 py-3 overflow-x-auto flex items-center space-x-2 scrollbar-none">
        <SlidersHorizontal size={12} className="text-gray-500 mr-2 shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 shrink-0 ${activeCategory === cat ? "bg-[#00e676]/10 border border-[#00e676]/30 text-[#00e676]" : "text-gray-400 border border-transparent hover:text-white hover:bg-[#0d1527]"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Content Layout Block */}
      <div className="flex flex-1 relative overflow-hidden">
        {!userId ? (
          /* High-Contrast Clean Authentication Card Grid */
          <div className="flex-1 flex items-center justify-center p-8 bg-[#04080f]">
            <div className="w-full max-w-md bg-[#0d1527] border border-[#16223f] rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="mx-auto w-11 h-11 bg-gradient-to-tr from-[#00b0ff] to-[#00e676] rounded-xl flex items-center justify-center text-[#04080f] mb-4 shadow-lg shadow-[#00e676]/5">
                  <Coins size={20} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isLogin ? "Sign in to Vera" : "Register Trading Desk"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Access continuous clearing and automated market depth options.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Trader Handle
                    </label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="SahilSingh"
                      className="block w-full bg-[#04080f] border border-[#16223f] focus:border-[#00e676]/50 rounded-xl px-4 py-2.5 text-white text-sm transition-all focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="block w-full bg-[#04080f] border border-[#16223f] focus:border-[#00e676]/50 rounded-xl px-4 py-2.5 text-white text-sm transition-all focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Security Passphrase
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full bg-[#04080f] border border-[#16223f] focus:border-[#00e676]/50 rounded-xl px-4 py-2.5 text-white text-sm transition-all focus:outline-none"
                  />
                </div>

                {authStatus.error && (
                  <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs font-medium">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{authStatus.error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authStatus.loading}
                  className="w-full py-3 bg-[#00e676] hover:bg-[#00c853] active:scale-[0.99] text-[#04080f] font-bold rounded-xl text-xs tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 mt-4 shadow-md"
                >
                  {authStatus.loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>
                        {isLogin
                          ? "Authenticate Account"
                          : "Initialize Liquidity Allocation"}
                      </span>{" "}
                      <ArrowUpRight size={14} strokeWidth={2.5} />
                    </>
                  )}
                </button>

                <div className="text-center mt-5 border-t border-[#111927] pt-4">
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
                    className="text-xs text-gray-400 hover:text-[#00e676] transition duration-150"
                  >
                    {isLogin
                      ? "New to the exchange? Create an account"
                      : "Existing account verification? Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Clean Market Columns Dashboard */}
            <main
              className={`flex-1 p-6 md:p-12 overflow-y-auto transition-all duration-300 ${selectedMarket ? "mr-[380px]" : ""}`}
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between border-b border-[#111927] pb-4 mb-8">
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#00e676]" /> Live
                      Contract Matrix
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Implied probability indexes cleared dynamically via
                      autonomous balance weights.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-20 bg-[#0d1527] border border-[#16223f] rounded-2xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredMarkets.length === 0 ? (
                  <div className="border border-dashed border-[#16223f] rounded-2xl p-16 text-center text-gray-500 bg-[#0d1527]/10">
                    <HelpCircle
                      size={24}
                      className="mx-auto text-gray-600 mb-3"
                    />
                    <p className="text-xs">
                      No contract lines found for this segment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMarkets.map((market) => {
                      const probs = getProbability(market);
                      return (
                        <div
                          key={market._id}
                          className="bg-[#0d1527] border border-[#16223f] rounded-xl p-5 hover:border-[#22335c] hover:bg-[#0f192e] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2.5 mb-1.5">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[#00b0ff] bg-[#00b0ff]/10 border border-[#00b0ff]/20 px-2 py-0.5 rounded">
                                {market.category || "GENERAL"}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                Pool Depth: ₹
                                {market.totalVolumeSpent?.toLocaleString(
                                  "en-IN",
                                  { maximumFractionDigits: 0 },
                                )}
                              </span>
                            </div>
                            <h3 className="font-semibold text-sm md:text-base text-white tracking-tight leading-snug">
                              {market.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {market.description}
                            </p>
                          </div>

                          {/* Groww Styled Direct Probability Bid Buttons */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenTradeDesk(market, "YES")}
                              className="w-20 bg-[#00e676]/5 hover:bg-[#00e676] border border-[#00e676]/10 hover:border-[#00e676] text-[#00e676] hover:text-[#04080f] py-2 px-3 rounded-xl flex flex-col items-center justify-center transition-all duration-150 font-bold"
                            >
                              <span className="text-[8px] tracking-wider uppercase opacity-60">
                                YES
                              </span>
                              <span className="text-sm mt-0.5">
                                {probs.yes}%
                              </span>
                            </button>
                            <button
                              onClick={() => handleOpenTradeDesk(market, "NO")}
                              className="w-20 bg-rose-500/5 hover:bg-rose-500 border border-rose-500/10 hover:border-rose-500 text-rose-400 hover:text-white py-2 px-3 rounded-xl flex flex-col items-center justify-center transition-all duration-150 font-bold"
                            >
                              <span className="text-[8px] tracking-wider uppercase opacity-60">
                                NO
                              </span>
                              <span className="text-sm mt-0.5">
                                {probs.no}%
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            {/* Micro-Border Institutional Order Desk Sidebar */}
            <aside
              className={`fixed right-0 top-[116px] bottom-0 w-[380px] bg-[#0d1527] border-l border-[#16223f] p-6 transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto flex flex-col justify-between ${selectedMarket ? "translate-x-0" : "translate-x-full"}`}
            >
              {selectedMarket && (
                <div className="flex flex-col h-full justify-between space-y-6">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[#111927] pb-3">
                      <h2 className="font-bold text-xs text-gray-400 tracking-wider uppercase">
                        Order Assignment
                      </h2>
                      <button
                        onClick={() => setSelectedMarket(null)}
                        className="text-gray-400 hover:text-white text-xs bg-[#04080f] border border-[#16223f] px-2.5 py-1 rounded-lg transition"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm md:text-base text-white tracking-tight leading-snug">
                        {selectedMarket.title}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-[#04080f] p-1 rounded-xl border border-[#16223f]">
                      <button
                        type="button"
                        onClick={() => setPredictionSide("YES")}
                        className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-150 ${predictionSide === "YES" ? "bg-[#00e676] text-[#04080f]" : "text-gray-400 hover:text-white"}`}
                      >
                        Buy YES
                      </button>
                      <button
                        type="button"
                        onClick={() => setPredictionSide("NO")}
                        className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-150 ${predictionSide === "NO" ? "bg-rose-500 text-white" : "text-gray-400 hover:text-white"}`}
                      >
                        Buy NO
                      </button>
                    </div>

                    <form onSubmit={executeTradeOrder} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Transaction Volume (INR)
                        </label>
                        <div className="relative rounded-xl">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                            className="block w-full bg-[#04080f] border border-[#16223f] focus:border-[#00e676]/40 rounded-xl px-4 py-3 pl-8 text-white font-bold text-base focus:outline-none"
                          />
                        </div>
                      </div>

                      {tradeStatus.success && (
                        <div className="flex items-start gap-2.5 bg-[#00e676]/10 border border-[#00e676]/20 p-3 rounded-xl text-[#00e676] text-xs font-medium">
                          <CheckCircle size={14} className="shrink-0 mt-0.5" />
                          <span>{tradeStatus.success}</span>
                        </div>
                      )}

                      {tradeStatus.error && (
                        <div className="flex items-start gap-2.5 bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs font-medium">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>{tradeStatus.error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={tradeStatus.loading || !amountSpent}
                        className={`w-full py-3.5 rounded-xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 transition-all duration-150 ${tradeStatus.loading ? "bg-[#16223f] text-gray-500 cursor-wait" : predictionSide === "YES" ? "bg-[#00e676] hover:bg-[#00c853] text-[#04080f]" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
                      >
                        {tradeStatus.loading ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <>
                            <span>Transmit Market Order</span>{" "}
                            <ArrowUpRight size={14} strokeWidth={2.5} />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="border-t border-[#111927] pt-4 text-xs text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Implied Index Probability</span>
                      <span className="text-white font-bold">
                        {predictionSide === "YES"
                          ? getProbability(selectedMarket).yes
                          : getProbability(selectedMarket).no}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Routing Settlement</span>
                      <span className="text-[#00e676] font-semibold flex items-center gap-1">
                        <ShieldCheck size={12} /> Realtime AMM Sync
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
