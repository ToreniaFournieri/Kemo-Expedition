import { GameProvider } from './GameContext';
import { HomeScreen } from './HomeScreen';

function App() {
  return (
    <GameProvider>
      <HomeScreen />
    </GameProvider>
  );
}

export default App;
