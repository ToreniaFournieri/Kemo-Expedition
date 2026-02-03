import { GameProvider } from './context/GameContext';
import HomeScreen from './screens/HomeScreen';

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-white">
        <HomeScreen />
      </div>
    </GameProvider>
  );
}

export default App;
