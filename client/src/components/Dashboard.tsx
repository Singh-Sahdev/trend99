import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Link } from "react-router-dom";
import { Gauge, TrendingUp, History, Sparkles, Trophy } from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

import { db, auth } from "../firebase/firebase";
import { Card } from "../assets/card";
import { Progress } from "../assets/progress";
import { Badge } from "../assets/badge";
import { toast } from "sonner";
import { Root as ScrollArea, Scrollbar as ScrollBar, Viewport as ScrollAreaViewport } from "@radix-ui/react-scroll-area"; // Correct Radix imports

// Define interfaces for your data structures to improve type safety
interface DashboardStats {
  totalAnalyses: number;
  avgTrendScore: number;
  gameScore: number;
  bestStreak: number;
}

interface ActivityLogEntry {
  id: string;
  type: string;
  content: string;
  date: any; // Firebase Timestamp
  trend_score?: number;
}

interface TrendingWord {
  id: string;
  word: string;
  score: number;
  timestamp: any; // Firebase Timestamp
}

const Dashboard = ({className}:{className:String}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    avgTrendScore: 0,
    gameScore: 0,
    bestStreak: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [trendingWords, setTrendingWords] = useState<TrendingWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false); // New state to track if data has been fetched for the current user

  useEffect(() => {
    document.title = "Dashboard - Trend99";
  }, []);

  // Use useCallback to memoize fetchDashboardData to prevent unnecessary re-creations
  const fetchDashboardData = useCallback(async (userId: string) => {
    setIsLoading(true); // Always set loading to true when starting data fetch
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      let fetchedStats: DashboardStats = {
        totalAnalyses: 0,
        avgTrendScore: 0,
        gameScore: 0,
        bestStreak: 0,
      };

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        fetchedStats.totalAnalyses = userData.totalAnalyses || 0;
        fetchedStats.gameScore = userData.gameScore || 0;
        fetchedStats.bestStreak = userData.bestStreak || 0;
      }

      const activityQuery = query(
        collection(userDocRef, "activityLog"),
        orderBy("date", "desc"),
        limit(10)
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activities: ActivityLogEntry[] = [];
      let totalTrendScore = 0;
      let analysisCount = 0;

      activitySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({ id: doc.id, ...data } as ActivityLogEntry);
        if (data.type === "analysis" && typeof data.trend_score === "number") {
          totalTrendScore += data.trend_score;
          analysisCount++;
        }
      });
      setRecentActivity(activities);

      if (analysisCount > 0) {
        fetchedStats.avgTrendScore = Math.round(totalTrendScore / analysisCount);
      } else {
        fetchedStats.avgTrendScore = 0;
      }

      setDashboardStats(fetchedStats);

      const trendingWordsQuery = query(
        collection(userDocRef, "trendingWords"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const trendingWordsSnapshot = await getDocs(trendingWordsQuery);
      const words: TrendingWord[] = [];
      const wordMap = new Map<string, TrendingWord>();

      trendingWordsSnapshot.forEach((doc) => {
        const data = doc.data() as TrendingWord;
        if (wordMap.has(data.word)) {
          const existing = wordMap.get(data.word)!;
          if (data.score > existing.score || (data.timestamp && existing.timestamp && data.timestamp.toDate() > existing.timestamp.toDate())) {
            const { id: _, ...rest } = data;
            wordMap.set(data.word, { id: doc.id, ...rest });
          }
        } else {
          const { id: _, ...rest } = data;
          wordMap.set(data.word, { id: doc.id, ...rest });
        }
      });
      setTrendingWords(Array.from(wordMap.values()).sort((a, b) => b.score - a.score || (b.timestamp && a.timestamp ? b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime() : 0)).slice(0,5));

      setDataFetched(true); // Data successfully fetched
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data.");
      setDataFetched(false); // Mark as not fetched on error, to potentially retry or show an error state
    } finally {
      setIsLoading(false); // Always turn off loading, even on error
    }
  }, []); // Dependencies for useCallback. None needed here if only userId is parameter.

  // Effect for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setDataFetched(false); // Reset dataFetched when auth state changes, to trigger a new fetch
      // If no user, and we're not currently loading data, then set loading to false.
      // This handles the initial guest view without a loading spinner.
      if (!user) {
        setIsLoading(false);
        // Also clear guest data if user logs out
        setDashboardStats({
          totalAnalyses: 0,
          avgTrendScore: 0,
          gameScore: 0,
          bestStreak: 0,
        });
        setRecentActivity([]);
        setTrendingWords([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching dashboard data
  useEffect(() => {
    // Only fetch if currentUser is known, and data hasn't been fetched yet for this user
    if (currentUser && !dataFetched) {
      fetchDashboardData(currentUser.uid);
    } else if (currentUser === null && !dataFetched && !isLoading) {
      // If user is null (logged out/guest) and we haven't fetched guest state data,
      // and not already loading, set initial guest data and mark as fetched.
      // This prevents the dataFetched from being stuck at false for guest users.
      setDashboardStats({
        totalAnalyses: 0,
        avgTrendScore: 0,
        gameScore: 0,
        bestStreak: 0,
      });
      setRecentActivity([]);
      setTrendingWords([]);
      setDataFetched(true); // Mark guest data as "fetched"
      setIsLoading(false); // Ensure loading is off for guest view
    }
  }, [currentUser, dataFetched, fetchDashboardData, isLoading]); // Added isLoading to ensure proper re-evaluation

  return (
    <div className="min-h-screen bg-background mesh-gradient pt-20 pb-16">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <div className="mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-blue rounded-xl p-2 shadow-md">
              <Gauge className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-3 text-base">
            Your personalized insights and progress.
          </p>
        </div>

        {/* Display guest message ONLY if not loading and no current user */}
        {!currentUser && !isLoading && (
          <Card className="p-6 text-center border border-border shadow-sm bg-card mb-8">
            <p className="text-lg font-semibold text-foreground">
              Welcome, Guest!
            </p>
            <p className="text-muted-foreground mt-2">
              Log in to see your personalized dashboard and save your analysis history.
            </p>
            {/* You might want to add a login button here */}
            {/* <Button asChild className="mt-4">
              <Link to="/login">Log In</Link>
            </Button> */}
          </Card>
        )}

        {/* Show loading spinner if isLoading is true */}
        {isLoading ? (
          <Card className="p-6 text-center border border-border shadow-sm bg-card mb-8">
            <p className="text-lg font-semibold text-foreground">Loading your dashboard...</p>
            <Progress value={50} className="w-full mt-4 animate-pulse" />
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 border border-border shadow-sm bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Analyses
                  </h3>
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-bold mt-4 text-foreground">
                  {dashboardStats.totalAnalyses}
                </p>
              </Card>

              <Card className="p-6 border border-border shadow-sm bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Avg. Trend Score
                  </h3>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-bold mt-4 text-foreground">
                  {dashboardStats.avgTrendScore}%
                </p>
                <Progress value={dashboardStats.avgTrendScore} className="h-2 mt-3" />
              </Card>

              <Card className="p-6 border border-border shadow-sm bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Game Score
                  </h3>
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-bold mt-4 text-foreground">
                  {dashboardStats.gameScore}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  (From Trend Chain Game)
                </p>
              </Card>

              <Card className="p-6 border border-border shadow-sm bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Best Streak
                  </h3>
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-bold mt-4 text-foreground">
                  {dashboardStats.bestStreak}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  (From Trend Chain Game)
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Card */}
              <Card className="p-6 border border-border shadow-sm bg-card lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Recent Activity
                  </h3>
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                {recentActivity.length > 0 ? (
                  // Radix UI ScrollArea needs a Viewport child
                  <ScrollArea className="h-[200px] w-full pr-4">
                    <ScrollAreaViewport className="h-full w-full rounded-[inherit]">
                      <ul className="space-y-3">
                        {recentActivity.map((activity) => (
                          <li key={activity.id} className="text-sm text-foreground">
                            <span className="font-medium">
                              {activity.type === "analysis" ? "Analyzed: " : `${activity.type}: `}
                            </span>
                            {activity.content}
                            {activity.trend_score !== undefined && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                ({activity.trend_score}% Trend)
                              </span>
                            )}
                            <span className="block text-xs text-muted-foreground mt-1">
                              {activity.date?.toDate().toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </ScrollAreaViewport>
                    <ScrollBar />
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground">
                    No recent activity. Start analyzing to see your history!
                    <Link to="/trend-analyzer" className="text-primary hover:underline ml-1">
                      Go to Trend Analyzer
                    </Link>
                  </p>
                )}
              </Card>

              {/* Top Trending Words Card */}
              <Card className="p-6 border border-border shadow-sm bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Top Trending Words
                  </h3>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                {trendingWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {trendingWords.map((word) => (
                      <Badge key={word.id} variant="secondary" className="px-3 py-1 text-sm">
                        {word.word} ({word.score}%)
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No trending words yet. Your analyses will reveal them!
                    <Link to="/trend-analyzer" className="text-primary hover:underline ml-1">
                      Analyze a sentence
                    </Link>
                  </p>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;