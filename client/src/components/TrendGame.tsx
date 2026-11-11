import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

import { toast } from "../assets/sonner";
import { initializeSocket } from "../utils/socketClient";

import { Input } from "../assets/input";
import { Button } from "../assets/button";
import { Alert, AlertTitle, AlertDescription } from "../assets/alert";
import { Card, CardContent } from "../assets/card";
import { Badge } from "../assets/badge";
import {
    CircleCheck,
    Loader2,
    PartyPopper,
    User,
    ShieldCheck,
    Sword,
    UserX,
    Activity,
    Zap,
    Target
} from "lucide-react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

type DuelMatchedPayload = { opponent_id: string; room_id: string, your_turn: boolean };
type DuelWordItem = { word: string; trend_score: string };
type DuelScore = {[player_id: string]: number;}

type DuelUpdatePayload = {
    chain?: DuelWordItem[];
    genre?: string;
    opponent_score: number;
    expected_genre?: string;
    predicted_genre: string;
    word?: string;
    player_id: string;
    status?: string;
    winner_id: string;
    loser_id: string;
    player_scores: DuelScore;
};
type DuelResultPayload = { result: "won" | "lost" | "tie" };

interface TrendAnalyzerProps {
    className?: string;
}

const TrendChainGame: React.FC<TrendAnalyzerProps> = ({ className = "" }) => {
    const [genres, setGenres] = useState<string[]>([]);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const genreCollection = collection(db, "genres");
                const genreSnapshot = await getDocs(genreCollection);
                const genreList = genreSnapshot.docs.map((doc) => doc.data().name);
                setGenres(genreList);
            } catch (error) {
                console.error("Error fetching genres:", error);
            }
        };

        fetchGenres();
    }, []);

    const playerId = useSelector((state: RootState) => state.auth.user?.uid);

    const [status, setStatus] = useState("idle");
    const [word, setWord] = useState("");
    const [genre, setGenre] = useState("general");
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [opponentSelectedGenre, setOpponentSelectedGenre] = useState<string | null>(null);
    const [genreConfirmed, setGenreConfirmed] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string>('');
    const [chain, setChain] = useState<string[]>([]);
    const [socket, setSocket] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [waitingForResponse, setWaitingForResponse] = useState(false);
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [result, setResult] = useState<string | null>(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [winner, setWinner] = useState('');

    // Animation states
    const [startButtonClicked, setStartButtonClicked] = useState(false);
    const [confirmButtonClicked, setConfirmButtonClicked] = useState(false);
    const [submitButtonClicked, setSubmitButtonClicked] = useState(false);

    const isChainBroken = status === "finished" && result !== "won";

    useEffect(() => {
        if (status !== "entered" || !playerId) return;

        let socketConnection: any;

        const setupSocket = async () => {
            socketConnection = await initializeSocket();
            if (!socketConnection) return;

            setSocket(socketConnection);
            socketConnection.emit("join_matchmaking", { player_id: playerId });

            setStatus("waiting");

            socketConnection.on("connect", () => {
                toast.success("Connected to server");
            });

            socketConnection.on("duel_matched", ({ opponent_id, room_id }: DuelMatchedPayload) => {
                const your_turn = room_id.split('_')[0] === playerId;
                console.log(opponent_id, typeof opponent_id);
                
                setOpponentId(opponent_id);
                setRoomId(room_id);
                setStatus("genre_selection");
                setIsMyTurn(!your_turn);
                toast.success("Match found! Select your genre");
            });

            socketConnection.on("opponent_genre_selected", ({ genre }: { genre: string }) => {
                setOpponentSelectedGenre(genre);
            });

            socketConnection.on("genre_finalized", ({ genre }: { genre: string }) => {
                setGenre(genre);
                setStatus("playing");
                toast.success(`Genre finalized: ${genre}`);
            });

            socketConnection.on("duel_update", (payload: DuelUpdatePayload) => {
                console.log(payload);
                console.log(opponentId);
                
                setIsSubmitting(false);
                setWaitingForResponse(false);

                if (payload.expected_genre !== payload.predicted_genre) {
                    toast.error("Genre mismatch! Expected and predicted genres do not align.");
                    return;
                }

                if (payload?.status === 'chain_broken') {
                    setWinner(payload.winner_id);
                    setResult(payload.winner_id === playerId ? "won" : "lost");
                    setStatus("finished");
                    toast(payload.winner_id === playerId ? "🎉 You won!" : "😞 You lost.");
                    return;
                }

                setIsMyTurn(payload.player_id !== playerId);
                if (payload.player_scores) {
                    setMyScore(payload.player_scores?.[playerId]);
                    setOpponentScore(payload.player_scores?.[opponentId]);
                }

                setChain(payload?.chain?.map(item => item.word) || []);
                setOpponentScore(payload.opponent_score);
            });

            socketConnection.on("duel_result", (payload: DuelResultPayload) => {
                setResult(payload.result);
                setStatus("finished");
                toast(winner === playerId ? "🎉 You won!" : winner !== playerId ? "😞 You lost." : "🤝 It's a tie!");
            });
        };

        setupSocket();
    }, [status, playerId]);

    const handleStartDuel = () => {
        setStartButtonClicked(true);
        setTimeout(() => {
            setStatus("entered");
            setStartButtonClicked(false);
        }, 200);
    };

    const handleConfirmGenre = () => {
        if (!socket || !playerId || !roomId || !selectedGenre) return;
        
        setConfirmButtonClicked(true);
        setTimeout(() => {
            socket.emit("select_genre", {
                player_id: playerId,
                room_id: roomId,
                genre: selectedGenre
            });
            setGenreConfirmed(true);
            setConfirmButtonClicked(false);
        }, 200);
    };

    const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isMyTurn) {
            toast.error("It's not your turn!");
            return;
        }
        setWord(e.target.value);
    };

    const handleSubmitWord = () => {
        if (!socket || !word || !roomId || !isMyTurn || waitingForResponse) return;
        
        setSubmitButtonClicked(true);
        setIsSubmitting(true);
        setWaitingForResponse(true);
        
        setTimeout(() => {
            socket.emit("submit_word_duel", { room_id: roomId, word });
            setWord("");
            setSubmitButtonClicked(false);
        }, 150);
    };

    return (
        <div className={`min-h-screen flex items-center justify-center px-4 ${className}`}>
            <div className="w-full max-w-md space-y-6">
                {status === "idle" && (
                    <div className="text-center space-y-4">
                        <div className="animate-bounce">
                            <Target className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Trend Chain Duel</h1>
                        <p className="text-gray-600 mb-6">Challenge opponents in real-time word battles!</p>
                        <Button 
                            className={`w-full h-12 text-lg font-semibold transition-all duration-200 transform ${
                                startButtonClicked 
                                    ? 'scale-95 bg-blue-700 shadow-inner' 
                                    : 'hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            onClick={handleStartDuel}
                        >
                            <Sword className="mr-2 h-5 w-5" /> 
                            {startButtonClicked ? 'Starting...' : 'Start Duel'}
                        </Button>
                    </div>
                )}

                {status === "waiting" && (
                    <div className="animate-fade-in">
                        <Alert className="border-blue-200 bg-blue-50">
                            <AlertTitle className="flex items-center gap-2 text-blue-800">
                                <Loader2 className="animate-spin h-5 w-5" /> 
                                <span className="animate-pulse">Searching for an opponent...</span>
                            </AlertTitle>
                            <AlertDescription className="text-blue-700">
                                Please wait while we find a worthy challenger.
                            </AlertDescription>
                        </Alert>
                        <div className="mt-4 flex justify-center">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                )}

                {status === "genre_selection" && (
                    <Card className="animate-slide-up border-2 border-purple-200 shadow-lg">
                        <CardContent className="space-y-6 py-6">
                            <div className="text-center">
                                <Zap className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                                <h2 className="text-xl font-bold text-gray-800">Choose Your Arena</h2>
                                <p className="text-sm text-gray-600 mt-1">Select a genre for the battle</p>
                            </div>
                            
                            <div className="flex gap-2 flex-wrap justify-center">
                                {genres.map((g) => (
                                    <Button
                                        key={g}
                                        variant={selectedGenre === g ? "default" : "outline"}
                                        disabled={genreConfirmed}
                                        className={`transition-all duration-200 transform ${
                                            selectedGenre === g 
                                                ? 'scale-105 bg-gradient-to-r from-purple-500 to-purple-600 shadow-md animate-pulse-slow' 
                                                : genreConfirmed 
                                                    ? 'opacity-50 cursor-not-allowed' 
                                                    : 'hover:scale-105 hover:shadow-md hover:border-purple-300'
                                        }`}
                                        onClick={() => !genreConfirmed && setSelectedGenre(g)}
                                    >
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                        {selectedGenre === g && <CircleCheck className="ml-1 h-4 w-4" />}
                                    </Button>
                                ))}
                            </div>
                            
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium">Your choice:</span>
                                            {selectedGenre ? (
                                                <Badge className="animate-fade-in bg-green-100 text-green-800 border-green-300">
                                                    {selectedGenre}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-gray-500 animate-pulse">Not selected</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserX className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium">Opponent:</span>
                                            {opponentSelectedGenre ? (
                                                <Badge variant="secondary" className="animate-fade-in bg-blue-100 text-blue-800 border-blue-300">
                                                    {opponentSelectedGenre}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-gray-500 animate-pulse">Choosing...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={handleConfirmGenre} 
                                    disabled={!selectedGenre || genreConfirmed}
                                    className={`w-full transition-all duration-200 transform ${
                                        confirmButtonClicked 
                                            ? 'scale-95 bg-green-700' 
                                            : !selectedGenre || genreConfirmed
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:scale-105 bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                                >
                                    {genreConfirmed ? (
                                        <>
                                            <CircleCheck className="mr-2 h-4 w-4" />
                                            Confirmed! Waiting for opponent...
                                        </>
                                    ) : confirmButtonClicked ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Confirming...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Choice
                                            <CircleCheck className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {status === "playing" && (
                    <Card className="animate-slide-up border-2 shadow-xl">
                        <CardContent className="space-y-4 py-4">
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                <Badge className={`flex items-center gap-2 transition-all duration-300 ${
                                    myScore > opponentScore ? 'bg-green-500 animate-pulse-slow' : 'bg-blue-500'
                                }`}>
                                    <User className="h-4 w-4" /> You: <b className="text-lg">{myScore}</b>
                                </Badge>
                                <div className="text-center">
                                    <Badge variant="outline" className="bg-white">
                                        <Target className="h-4 w-4 mr-1" />{genre}
                                    </Badge>
                                </div>
                                <Badge variant="secondary" className={`flex items-center gap-2 transition-all duration-300 ${
                                    opponentScore > myScore ? 'bg-red-500 text-white animate-pulse-slow' : ''
                                }`}>
                                    <UserX className="h-4 w-4" /> Opponent: <b className="text-lg">{opponentScore}</b>
                                </Badge>
                            </div>

                            <div className={`flex justify-center gap-2 items-center p-2 rounded-lg transition-all duration-300 ${
                                isMyTurn ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'
                            }`}>
                                <Activity className={`h-5 w-5 ${isMyTurn ? 'text-green-600 animate-pulse' : 'text-red-600'}`} />
                                <span className={`font-bold text-lg ${isMyTurn ? "text-green-700" : "text-red-600"}`}>
                                    {isMyTurn ? "🎯 Your Turn!" : "⏳ Opponent's Turn"}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    value={word}
                                    onChange={handleWordChange}
                                    placeholder={isMyTurn ? "Enter your word..." : "Wait for your turn..."}
                                    disabled={!isMyTurn || waitingForResponse}
                                    className={`transition-all duration-200 ${
                                        isMyTurn && !waitingForResponse 
                                            ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200' 
                                            : 'border-gray-300'
                                    }`}
                                />
                                <Button
                                    onClick={handleSubmitWord}
                                    disabled={!word || isSubmitting || !isMyTurn || waitingForResponse}
                                    className={`transition-all duration-200 transform ${
                                        submitButtonClicked 
                                            ? 'scale-95 bg-blue-700' 
                                            : !word || isSubmitting || !isMyTurn || waitingForResponse
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:scale-105 bg-gradient-to-r from-blue-500 to-blue-600'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        'Submit'
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-lg">
                                    <Activity className="text-blue-500 h-5 w-5" /> 
                                    Trend Chain ({chain.length} words)
                                </h3>
                                {chain.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Target className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                        <p className="text-gray-500">No words submitted yet. Be the first!</p>
                                    </div>
                                ) : (
                                    <div className={`space-y-2 max-h-[300px] overflow-y-auto p-3 bg-gray-50 rounded-lg transition-all duration-500 ${
                                        isChainBroken ? "animate-pulse opacity-60 bg-red-50" : ""
                                    }`}>
                                        {chain.map((w, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm transition-all duration-300 ${
                                                    idx === chain.length - 1 
                                                        ? "bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-300 animate-bounce transform scale-105" 
                                                        : idx % 2 === 0 
                                                            ? "bg-blue-50 border border-blue-200" 
                                                            : "bg-purple-50 border border-purple-200"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 border">
                                                        {idx + 1}
                                                    </span>
                                                    <ShieldCheck className={`w-4 h-4 ${
                                                        idx === chain.length - 1 ? 'text-green-600' : 'text-blue-600'
                                                    }`} />
                                                </div>
                                                <span className="font-medium text-gray-800">{w}</span>
                                                {idx === chain.length - 1 && (
                                                    <Badge className="ml-auto bg-green-500 text-white animate-pulse">
                                                        Latest
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {status === "finished" && result && (
                    <Card className={`animate-bounce-in border-4 ${
                        result === "won" ? 'border-green-400 bg-green-50' : 
                        result === "lost" ? 'border-red-400 bg-red-50' : 
                        'border-yellow-400 bg-yellow-50'
                    }`}>
                        <CardContent className="text-center py-8">
                            <div className="mb-4">
                                {result === "won" ? (
                                    <PartyPopper className="mx-auto h-16 w-16 text-green-500 animate-bounce" />
                                ) : result === "lost" ? (
                                    <UserX className="mx-auto h-16 w-16 text-red-500" />
                                ) : (
                                    <Target className="mx-auto h-16 w-16 text-yellow-500" />
                                )}
                            </div>
                            <Alert className={`border-0 ${
                                result === "won" ? 'bg-green-100' : 
                                result === "lost" ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                                <AlertTitle className={`text-2xl font-bold mb-2 ${
                                    result === "won" ? 'text-green-700' : 
                                    result === "lost" ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                    🎮 Game Over!
                                </AlertTitle>
                                <AlertDescription className={`text-lg ${
                                    result === "won" ? 'text-green-800' : 
                                    result === "lost" ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                    You <span className="font-bold text-2xl">{result.toUpperCase()}</span> the duel!
                                    <br />
                                    <span className="text-sm mt-2 block">
                                        Final Score: You {myScore} - {opponentScore} Opponent
                                    </span>
                                </AlertDescription>
                            </Alert>
                            <Button 
                                className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                                onClick={() => window.location.reload()}
                            >
                                Play Again
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            <style >{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes bounce-in {
                    0% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 1; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                .animate-slide-up { animation: slide-up 0.6s ease-out; }
                .animate-bounce-in { animation: bounce-in 0.8s ease-out; }
                .animate-pulse-slow { animation: pulse-slow 2s infinite; }
            `}</style>
        </div>
    );
};

export default TrendChainGame;