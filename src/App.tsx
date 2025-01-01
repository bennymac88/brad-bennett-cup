import { useState, useEffect } from "react";
import { kv } from './vercel-kv-config';

interface HistoryEntry {
    id: number;
    timestamp: string;
    contributor: string;
    player: string;
    points: number;
    gameType: string;
    paid: boolean;
}

interface Player {
    id: number;
    name: string;
    points: number;
    probability?: number;
    decimalOdds?: number;
}

interface GameData {
    players: Player[];
    history: HistoryEntry[];
}

// Default players configuration
const DEFAULT_PLAYERS: Player[] = [
    { id: 1, name: "Al T/Cuts 🏆", points: 0 },
    { id: 2, name: "Mitzi/Bondy", points: 0 },
    { id: 3, name: "Woody/Foulsh", points: 0 },
    { id: 4, name: "Pitovich/Berts", points: 0 },
    { id: 5, name: "Xav/Tubs", points: 0 },
    { id: 6, name: "Macca/Tarch", points: 0 },
    { id: 7, name: "Bennet/Shark", points: 0 },
    { id: 8, name: "Iddles/Niz", points: 0 }
];

// Payment Confirmation Component (keep the previous implementation)
const PaymentConfirmation = ({ show, onClose, details }: any) => {
    if (!show || !details) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Confirmation Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ×
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Point Addition Details:</h3>
                        <p>Contributor: {details.contributor}</p>
                        <p>Player: {details.player}</p>
                        <p>Points: {details.points}</p>
                        <p>Game: {details.gameType}</p>
                        <p>Time: {details.timestamp}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// Odds Calculator Component
const OddsCalculator = ({ title }: { title: string }) => {
    const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [pointsToAdd, setPointsToAdd] = useState('');
    const [contributorName, setContributorName] = useState('');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationDetails, setConfirmationDetails] = useState<HistoryEntry | null>(null);

    // Fetch game data on component mount
    useEffect(() => {
        const fetchGameData = async () => {
            try {
                // Create a unique key for each game type
                const gameKey = `brad-bennett-${title.replace(/\s+/g, '-').toLowerCase()}`;

                // Try to retrieve existing data
                const existingData = await kv.get(gameKey) as GameData | null;

                if (existingData) {
                    setPlayers(existingData.players);
                    setHistory(existingData.history);
                }
            } catch (error) {
                console.error('Error fetching game data:', error);
            }
        };

        fetchGameData();
    }, [title]);

    const updateGameData = async (newPlayers: Player[], newHistory: HistoryEntry[]) => {
        try {
            const gameKey = `brad-bennett-${title.replace(/\s+/g, '-').toLowerCase()}`;

            // Update both local state and Vercel KV
            await kv.set(gameKey, JSON.stringify({
                players: newPlayers,
                history: newHistory
            }));

            setPlayers(newPlayers);
            setHistory(newHistory);
        } catch (error) {
            console.error('Error updating game data:', error);
        }
    };

    const handleButtonClick = async () => {
        if (!selectedPlayer || !pointsToAdd || !contributorName) {
            return;
        }

        const points = parseInt(pointsToAdd);
        if (isNaN(points) || points <= 0) {
            return;
        }

        // Update players
        const selectedPlayerObj = players.find(p => p.id === parseInt(selectedPlayer));
        if (!selectedPlayerObj) return;

        const newPlayers = players.map(player => {
            if (player.id === parseInt(selectedPlayer)) {
                return { ...player, points: player.points + points };
            }
            return player;
        });

        // Recalculate probabilities
        const totalPoints = newPlayers.reduce((sum, player) => sum + player.points, 0);
        const playersWithOdds = newPlayers.map(player => {
            let probability = totalPoints === 0 ? (1 / newPlayers.length) : player.points / totalPoints;
            probability = Math.max(probability, 0.001); // Minimum 0.1% probability
            return {
                ...player,
                probability,
                decimalOdds: 1 / probability
            };
        });

        // Create history entry
        const historyEntry: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            contributor: contributorName,
            player: selectedPlayerObj.name,
            points: points,
            gameType: title,
            paid: false
        };

        // Update game data
        await updateGameData(playersWithOdds, [historyEntry, ...history]);

        // Show confirmation
        setConfirmationDetails(historyEntry);
        setShowConfirmation(true);

        // Reset form
        setSelectedPlayer('');
        setPointsToAdd('');
        setContributorName('');
    };

    const togglePaymentStatus = async (entryId: number) => {
        const updatedHistory = history.map(entry =>
            entry.id === entryId
                ? { ...entry, paid: !entry.paid }
                : entry
        );

        // Update game data
        await updateGameData(players, updatedHistory);
    };

    // Calculate total points and odds
    const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
    const playersWithOdds = players.map(player => {
        let probability = totalPoints === 0 ? (1 / players.length) : player.points / totalPoints;
        probability = Math.max(probability, 0.001); // Minimum 0.1% probability
        return {
            ...player,
            probability
        };
    });

    return (
        <div className="space-y-4">
            <PaymentConfirmation
                show={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                details={confirmationDetails}
            />

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <div className="mb-4 space-y-2">
                    <input
                        type="text"
                        value={contributorName}
                        onChange={(e) => setContributorName(e.target.value)}
                        placeholder="Enter your name"
                        className="block w-full p-2 border rounded"
                    />

                    <select
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                        className="block w-full p-2 border rounded"
                    >
                        <option value="">Select Player</option>
                        {players.map(player => (
                            <option key={player.id} value={player.id}>
                                {player.name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        min="1"
                        placeholder="Enter points"
                        className="block w-full p-2 border rounded"
                    />

                    <button
                        onClick={handleButtonClick}
                        className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
                        type="button"
                        disabled={!selectedPlayer || !pointsToAdd || !contributorName}
                    >
                        Add Points
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-2">Player</th>
                                <th className="text-right p-2">Points</th>
                                <th className="text-right p-2">Probability</th>
                                <th className="text-right p-2">Decimal Odds</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playersWithOdds.map(player => (
                                <tr key={player.id}>
                                    <td className="p-2">{player.name}</td>
                                    <td className="text-right p-2">{player.points}</td>
                                    <td className="text-right p-2">
                                        {((player.probability || 0) * 100).toFixed(1)}%
                                    </td>
                                    <td className="text-right p-2">
                                        {(1 / (player.probability || 0.001)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    Total Points: {totalPoints}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Point Addition History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="text-left p-2">Time</th>
                                <th className="text-left p-2">Contributor</th>
                                <th className="text-left p-2">Player</th>
                                <th className="text-right p-2">Points</th>
                                <th className="text-center p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(entry => (
                                <tr key={entry.id} className={entry.paid ? 'bg-green-50' : 'bg-red-50'}>
                                    <td className="p-2">{entry.timestamp}</td>
                                    <td className="p-2">{entry.contributor}</td>
                                    <td className="p-2">{entry.player}</td>
                                    <td className="text-right p-2">{entry.points}</td>
                                    <td className="text-center p-2">
                                        <button
                                            onClick={() => togglePaymentStatus(entry.id)}
                                            className={`px-3 py-1 rounded-full text-sm ${entry.paid
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {entry.paid ? 'Paid' : 'Pending'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Brad Bennett Cup 2024/25</h1>
                    <p className="text-gray-600">3rd of January 2024 - 1:00pm</p>
                </div>

                <div className="space-y-8">
                    <OddsCalculator title="Brad Bennett Cup Winner" />
                    <OddsCalculator title="Brad Bennett Cup Wooden Spoon" />
                </div>
            </div>
        </div>
    );
};

export default App;