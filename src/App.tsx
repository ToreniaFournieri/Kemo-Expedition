import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';

export default function App() {
  const { state, actions, bags } = useGameState();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto">
        <HomeScreen state={state} actions={actions} bags={bags} />
      </div>
    </div>
  );
}
