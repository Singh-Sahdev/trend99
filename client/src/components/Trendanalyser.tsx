import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Code2, Copy, CheckCircle, Clock, Sparkles } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

import { db, auth } from "../firebase/firebase";
import { Card } from "../assets/card";
import { Label } from "../assets/label";
import { Textarea } from "../assets/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../assets/select";
import { Button } from "../assets/button";
import { Progress } from "../assets/progress";
import { toast } from "sonner";

// Define FormData types for better type safety
interface FormData {
  sentence: string;
  genre: string;
  emotion: string;
  sentiment: string;
}

type FormDataKey = keyof FormData;

const TrendAnalyzer = ({ className, ...props }: { className?: string }) => {
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [emotionOptions, setEmotionOptions] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    sentence: "",
    genre: "",
    emotion: "",
    sentiment: "",
  });

  const [results, setResults] = useState({
    genre: "",
    sentiment: "",
    emotion: "",
    keywords: [] as string[],
    trend_score: 0,
    enhancedSentence: "",
  });

  useEffect(() => {
    document.title = "Trend Analyzer - Trend99";
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // setSidebarOpen(false); // If used, ensure it's imported and part of global state
  }, [location]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const genreSnapshot = await getDocs(
          query(collection(db, "genres"), orderBy("name"))
        );
        const emotionSnapshot = await getDocs(
          query(collection(db, "emotions"), orderBy("name"))
        );

        const genres = genreSnapshot.docs.map((doc) => doc.data().name as string);
        const emotions = emotionSnapshot.docs.map(
          (doc) => doc.data().name as string
        );

        setGenreOptions(genres);
        setEmotionOptions(emotions);
      } catch (error) {
        console.error("Error fetching genre/emotion options:", error);
        toast.error("Failed to load genre/emotion options.");
      }
    };

    fetchOptions();
  }, []);

  // NEW useEffect for triggering Firestore save after results are fully processed and displayed
  useEffect(() => {
    console.log(
      "Save Effect Triggered. showResults:",
      showResults,
      "isLoading:",
      isLoading,
      "currentUser:",
      !!currentUser
    );
    console.log("Current results state inside useEffect:", results);

    if (showResults && !isLoading && currentUser) {
      console.log("Conditions met for saving analysis to Firestore.");
      saveAnalysisToFirestore(results);
    } else if (showResults && !isLoading && !currentUser) {
      toast.info("Analysis complete! Log in to save your progress.");
    }
  }, [showResults, isLoading, currentUser, results]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (
    name: Exclude<FormDataKey, "sentence">,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSelectedFields(prev => new Set([...prev, name]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompletedSteps([]);
    setIsButtonPressed(true);
    setIsAnalysisComplete(false);
    console.log("Form submission started");
    setIsLoading(true);
    setShowResults(false);

    // Reset results and formData to initial state to prepare for new analysis
    setResults({
      genre: "",
      sentiment: "",
      emotion: "",
      keywords: [] as string[],
      trend_score: 0,
      enhancedSentence: "",
    });
    
    setFormData((prev) => ({
      ...prev,
      genre: "",
      emotion: "",
      sentiment: "",
    }));

    const payload = {
      sentence: formData.sentence,
      genre: formData.genre || "",
      sentiment: formData.sentiment || "",
      emotion: formData.emotion || "",
    };

    try {
      const response = await fetch("/stream-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("Stream complete");
            setIsLoading(false);
            setShowResults(true);
            setIsAnalysisComplete(true);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          let eventEnd = buffer.indexOf("\n\n");
          while (eventEnd !== -1) {
            const eventData = buffer.substring(0, eventEnd);
            buffer = buffer.substring(eventEnd + 2);

            const dataMatch = eventData.match(/^data: (.+)$/m);
            if (dataMatch) {
              try {
                const parsedData = JSON.parse(dataMatch[1]);
                console.log("Parsed SSE Data:", parsedData);
                processEventData(parsedData);
              } catch (err) {
                console.error("Error parsing SSE data:", err);
                toast.error("Error processing stream data.");
              }
            } else {
              console.warn(
                "SSE event data format mismatch or incomplete:",
                eventData
              );
            }
            eventEnd = buffer.indexOf("\n\n");
          }
        }
      };

      processStream().catch((err) => {
        console.error("Stream processing error:", err);
        setIsLoading(false);
        setIsButtonPressed(false);
        toast.error("Error processing stream data.");
      });
    } catch (err) {
      console.error("Fetch error:", err);
      setIsLoading(false);
      setIsButtonPressed(false);
      toast.error("Connection error occurred.");
    }
  };

  const saveAnalysisToFirestore = async (currentResults: typeof results) => {
    console.log(
      "Attempting to save to Firestore. Data being saved:",
      currentResults
    );
    if (!currentUser || !currentUser.uid) {
      console.log("No logged-in user found. Skipping Firestore data storage.");
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const currentAnalysisTrendScore = currentResults.trend_score || 0;

    try {
      await setDoc(
        userDocRef,
        {
          totalAnalyses: increment(1),
          lastAnalysisScore: currentAnalysisTrendScore,
          lastAnalysisDate: serverTimestamp(),
          lastAnalysisSentence: formData.sentence,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("User main doc updated.");

      await addDoc(collection(userDocRef, "activityLog"), {
        type: "analysis",
        content: `Analyzed "${formData.sentence.substring(0, 50)}${
          formData.sentence.length > 50 ? "..." : ""
        }"`,
        date: serverTimestamp(),
        trend_score: currentAnalysisTrendScore,
        keywords: currentResults.keywords || [],
        genre: currentResults.genre,
        sentiment: currentResults.sentiment,
        emotion: currentResults.emotion,
      });
      console.log("Activity log added.");

      if (
        currentResults.keywords &&
        Array.isArray(currentResults.keywords) &&
        currentResults.keywords.length > 0
      ) {
        const batch = writeBatch(db);
        currentResults.keywords.forEach((keyword) => {
          const newTrendingWordRef = doc(
            collection(userDocRef, "trendingWords")
          );
          batch.set(newTrendingWordRef, {
            word: keyword,
            score: currentAnalysisTrendScore,
            timestamp: serverTimestamp(),
          });
        });
        await batch.commit();
        console.log("Trending words batch committed.");
      }
      toast.success("Analysis saved to your dashboard!");
    } catch (firestoreError) {
      console.error("Error writing analysis data to Firestore:", firestoreError);
      toast.error("Failed to save analysis data.");
    }
  };

  const processEventData = (data: any) => {
    const step = data.step;
    const value = data.value;

    console.log(`Processing step: ${step}, Value:`, value);

    setResults((prevResults) => {
      let updatedResults = { ...prevResults };

      if (step === "genre" || step === "sentiment" || step === "emotion") {
        updatedResults = { ...updatedResults, [step]: value };
        setFormData((prevForm) => ({ ...prevForm, [step]: value }));
      } else if (step === "keywords") {
        updatedResults = { ...updatedResults, keywords: value };
      } else if (step === "trend_score") {
        updatedResults = { ...updatedResults, trend_score: value };
      } else if (step === "results") {
        updatedResults = {
          ...updatedResults,
          enhancedSentence: value.regenerated_sentence || "",
        };
      }

      console.log(`Updated results for ${step}:`, updatedResults);
      return updatedResults;
    });

    setCompletedSteps((prev) => {
      const newCompletedSteps = [...new Set([...prev, step])];
      console.log("Updated completed steps:", newCompletedSteps);
      return newCompletedSteps;
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(results.enhancedSentence);
    toast.success("Copied to clipboard!");
  };

  const resetForm = () => {
    setFormData({
      sentence: "",
      genre: "",
      emotion: "",
      sentiment: "",
    });
    setSelectedFields(new Set());
    setIsAnalysisComplete(false);
    setIsButtonPressed(false);
    setShowResults(false);
    setCompletedSteps([]);
  };

  return (
    <div className={`min-h-screen bg-background mesh-gradient ${className}`}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
        
        .animate-pulse-subtle {
          animation: pulse 2s infinite;
        }
        
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .button-pressed {
          transform: scale(0.98);
          transition: transform 0.1s ease-in-out;
        }
        
        .select-glow {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
          transition: box-shadow 0.2s ease-in-out;
        }
        
        .select-disabled {
          opacity: 0.6;
          pointer-events: none;
          background-color: #f3f4f6;
        }
        
        .step-complete {
          transform: scale(1.1);
          transition: transform 0.3s ease-out;
        }
      `}</style>
      
      <div className="flex justify-center">
        <main className="flex-1 p-4 lg:p-8 pt-20 pb-16 max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-4">
              <div className="bg-gradient-blue rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow duration-300 animate-pulse-subtle">
                <Code2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Trend Analyzer
              </h1>
            </div>
            <p className="text-muted-foreground mt-3 text-base">
              Enhance your sentences to match the latest trends and boost engagement.
            </p>
          </div>

          {/* Input Form */}
          <Card className="p-6 shadow-lg border border-border bg-card hover:shadow-xl transition-shadow duration-300 animate-slide-in">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sentence" className="flex items-center gap-2">
                  Enter a sentence
                  {formData.sentence && (
                    <CheckCircle className="w-4 h-4 text-green-500 animate-fade-in" />
                  )}
                </Label>
                <Textarea
                  id="sentence"
                  name="sentence"
                  placeholder="Type your sentence here..."
                  value={formData.sentence}
                  onChange={handleInputChange}
                  disabled={isAnalysisComplete}
                  className={`min-h-[100px] resize-none transition-all duration-300
                             border border-input bg-input text-foreground
                             ring-offset-background placeholder:text-muted-foreground
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                             hover:border-ring/50
                             ${isAnalysisComplete ? 'select-disabled' : ''}
                             ${formData.sentence ? 'border-green-500/50 bg-green-50/10' : ''}
                             disabled:cursor-not-allowed disabled:opacity-50`}
                  required
                />
              </div>

              {/* Select Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {[
    {
      name: "genre" as const,
      label: "Genre",
      options: genreOptions,
    },
    {
      name: "emotion" as const,
      label: "Emotion",
      options: emotionOptions,
    },
    {
      name: "sentiment" as const,
      label: "Sentiment",
      options: ["positive", "neutral", "negative"],
    },
  ].map(({ name, label, options }) => (
    <div
      className="space-y-2 animate-slide-in"
      key={name}
      style={{
        animationDelay: `${["genre", "emotion", "sentiment"].indexOf(name) * 0.1}s`,
      }}
    >
      <Label htmlFor={name} className="flex items-center gap-2">
        {label}
        {selectedFields.has(name) && (
          <CheckCircle className="w-4 h-4 text-green-500 animate-fade-in" />
        )}
        {completedSteps.includes(name) && !selectedFields.has(name) && (
          <Sparkles className="w-4 h-4 text-blue-500 animate-fade-in" />
        )}
      </Label>
      <Select
        value={formData[name] || ""}
        onValueChange={(value) => handleSelectChange(name, value)}
        disabled={isAnalysisComplete}
      >
        <SelectTrigger
          className={`w-full transition-all duration-300
                      border border-input bg-input text-foreground
                      ring-offset-background placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                      hover:border-ring/50
                      ${selectedFields.has(name) ? 'select-glow border-green-500/50 bg-green-50/10' : ''}
                      ${isAnalysisComplete ? 'select-disabled' : ''}
                      ${completedSteps.includes(name) && formData[name] ? 'border-blue-500/50 bg-blue-50/10' : ''}
                      disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent
          side="bottom"
          align="start"
          className="bg-popover border border-border text-popover-foreground shadow-md z-50"
        >
          {options.map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ))}
</div>


              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading || isAnalysisComplete}
                  className={`flex-1 transition-all duration-300
                             bg-primary text-primary-foreground
                             hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02]
                             active:scale-[0.98]
                             shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                             ${isButtonPressed ? 'button-pressed' : ''}
                             ${isLoading ? 'animate-pulse-subtle' : ''}
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Analyzing...
                    </div>
                  ) : isAnalysisComplete ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Analysis Complete
                    </div>
                  ) : (
                    "Analyze Trend"
                  )}
                </Button>
                
                {isAnalysisComplete && (
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="px-6 animate-fade-in hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-[1.02]"
                  >
                    New Analysis
                  </Button>
                )}
              </div>

              {isLoading && (
                <div className="text-sm text-muted-foreground mt-2 space-y-3 animate-fade-in">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    Analyzing your sentence... Streaming results live:
                  </p>
                  <ul className="space-y-2 ml-2">
                    {[
                      { key: "genre", label: "Genre Analysis" },
                      { key: "sentiment", label: "Sentiment Detection" },
                      { key: "emotion", label: "Emotion Recognition" },
                      { key: "keywords", label: "Keyword Extraction" },
                      { key: "trend_score", label: "Trend Score Calculation" },
                      { key: "results", label: "Enhanced Sentence Generation" },
                    ].map(({ key, label }) => (
                      <li
                        key={key}
                        className={`flex items-center gap-2 transition-all duration-500 ${
                          completedSteps.includes(key)
                            ? "text-green-600 font-medium step-complete"
                            : "text-gray-400"
                        }`}
                      >
                        {completedSteps.includes(key) ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        )}
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </Card>

          {/* Results Display */}
          {showResults && (
            <Card className="mt-10 p-6 border border-border shadow-lg animate-fade-in hover:shadow-xl transition-shadow duration-300">
              <div className="space-y-6">
                <div className="animate-slide-in">
                  <h3 className="text-lg font-semibold mb-1 text-foreground flex items-center gap-2">
                    Original Sentence
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </h3>
                  <p className="p-3 bg-muted rounded-md text-sm text-foreground border border-border hover:border-ring/50 transition-colors duration-300">
                    {formData.sentence}
                  </p>
                </div>

                {results.genre && (
                  <div className="animate-slide-in" style={{animationDelay: '0.1s'}}>
                    <h3 className="text-lg font-semibold mb-1 text-foreground">Genre</h3>
                    <p className="p-3 bg-muted rounded-md text-sm text-foreground border border-border hover:border-ring/50 transition-colors duration-300">
                      {results.genre}
                    </p>
                  </div>
                )}
                
                {results.sentiment && (
                  <div className="animate-slide-in" style={{animationDelay: '0.2s'}}>
                    <h3 className="text-lg font-semibold mb-1 text-foreground">
                      Sentiment
                    </h3>
                    <p className="p-3 bg-muted rounded-md text-sm text-foreground border border-border hover:border-ring/50 transition-colors duration-300">
                      {results.sentiment}
                    </p>
                  </div>
                )}
                
                {results.emotion && (
                  <div className="animate-slide-in" style={{animationDelay: '0.3s'}}>
                    <h3 className="text-lg font-semibold mb-1 text-foreground">Emotion</h3>
                    <p className="p-3 bg-muted rounded-md text-sm text-foreground border border-border hover:border-ring/50 transition-colors duration-300">
                      {results.emotion}
                    </p>
                  </div>
                )}

                {results.keywords && results.keywords.length > 0 && (
                  <div className="animate-slide-in" style={{animationDelay: '0.4s'}}>
                    <h3 className="text-lg font-semibold mb-1 text-foreground">Keywords</h3>
                    <div className="p-3 bg-muted rounded-md text-sm text-foreground flex flex-wrap gap-2 border border-border">
                      {results.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors duration-200 animate-fade-in"
                          style={{animationDelay: `${index * 0.1}s`}}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="animate-slide-in" style={{animationDelay: '0.5s'}}>
                  <h3 className="text-lg font-semibold mb-1 text-foreground">
                    Trend Score
                  </h3>
                  <div className="flex items-center gap-4">
                    <Progress value={results.trend_score} className="flex-1" />
                    <span className="text-sm font-medium text-foreground bg-primary/10 px-2 py-1 rounded-full">
                      {results.trend_score}%
                    </span>
                  </div>
                </div>

                <div className="animate-slide-in" style={{animationDelay: '0.6s'}}>
                  <h3 className="text-lg font-semibold mb-1 text-foreground">
                    Enhanced Sentences
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md border border-border group hover:border-ring/50 transition-colors duration-300">
                    <p className="text-sm text-foreground flex-1 pr-3">
                      {results.enhancedSentence}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="shrink-0 flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300
                                 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-110
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default TrendAnalyzer;